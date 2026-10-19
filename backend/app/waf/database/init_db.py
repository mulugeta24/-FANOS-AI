import hashlib
import json
import logging
import secrets
from sqlalchemy import inspect, select, text
from app.core.config import get_settings
from app.db.base import AsyncSessionLocal, engine
from app.waf.models import Base, Domain, Organization, User, WAFRuleModel, WAFSettingModel
from app.waf.rules.default_rules import DEFAULT_RULES
from app.waf.security.password import hash_password

logger = logging.getLogger("fanos_waf.init_db")


async def init_db() -> None:
    """Creates database tables and loads initial seed data."""
    settings = get_settings()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Safe non-destructive column migrations for PostgreSQL
        try:
            bool_default = "FALSE"
            datetime_type = "TIMESTAMP WITH TIME ZONE"

            def get_cols(sync_conn, table_name: str) -> list[str]:
                insp = inspect(sync_conn)
                if table_name in insp.get_table_names():
                    return [c["name"] for c in insp.get_columns(table_name)]
                return []

            cols = await conn.run_sync(lambda sync_conn: get_cols(sync_conn, "security_events"))
            if cols:
                if "domain_id" not in cols:
                    await conn.execute(text("ALTER TABLE security_events ADD COLUMN domain_id VARCHAR(36)"))
                if "hostname" not in cols:
                    await conn.execute(text("ALTER TABLE security_events ADD COLUMN hostname VARCHAR(255)"))
                if "tenant_id" not in cols:
                    await conn.execute(text("ALTER TABLE security_events ADD COLUMN tenant_id VARCHAR(36)"))
                if "http_status" not in cols:
                    await conn.execute(text("ALTER TABLE security_events ADD COLUMN http_status INTEGER DEFAULT 200"))
                if "origin_status" not in cols:
                    await conn.execute(text("ALTER TABLE security_events ADD COLUMN origin_status INTEGER"))
                if "action" not in cols:
                    await conn.execute(text("ALTER TABLE security_events ADD COLUMN action VARCHAR(32) DEFAULT 'ALLOW'"))
                if "is_test" not in cols:
                    await conn.execute(text(f"ALTER TABLE security_events ADD COLUMN is_test BOOLEAN DEFAULT {bool_default}"))

            user_cols = await conn.run_sync(lambda sync_conn: get_cols(sync_conn, "users"))
            if user_cols and "tenant_id" not in user_cols:
                await conn.execute(text("ALTER TABLE users ADD COLUMN tenant_id VARCHAR(36)"))

            dom_cols = await conn.run_sync(lambda sync_conn: get_cols(sync_conn, "domains"))
            if dom_cols:
                if "target_type" not in dom_cols:
                    await conn.execute(text("ALTER TABLE domains ADD COLUMN target_type VARCHAR(32) DEFAULT 'production'"))
                if "tls_status" not in dom_cols:
                    await conn.execute(text("ALTER TABLE domains ADD COLUMN tls_status VARCHAR(32) DEFAULT 'pending'"))
                if "proxy_status" not in dom_cols:
                    await conn.execute(text("ALTER TABLE domains ADD COLUMN proxy_status VARCHAR(32) DEFAULT 'pending'"))
                if "health_status" not in dom_cols:
                    await conn.execute(text("ALTER TABLE domains ADD COLUMN health_status VARCHAR(32) DEFAULT 'unknown'"))
                if "last_health_check_at" not in dom_cols:
                    await conn.execute(text(f"ALTER TABLE domains ADD COLUMN last_health_check_at {datetime_type}"))
                if "traffic_verified" not in dom_cols:
                    await conn.execute(text(f"ALTER TABLE domains ADD COLUMN traffic_verified BOOLEAN DEFAULT {bool_default}"))
                if "last_traffic_test_at" not in dom_cols:
                    await conn.execute(text(f"ALTER TABLE domains ADD COLUMN last_traffic_test_at {datetime_type}"))
                if "protection_status" not in dom_cols:
                    await conn.execute(text("ALTER TABLE domains ADD COLUMN protection_status VARCHAR(32) DEFAULT 'DOMAIN_REGISTERED'"))
        except Exception as e:
            logger.warning("Column migration check encountered notice: %s", e)


    async with AsyncSessionLocal() as session:
        # 1. Seed Default Organization
        org_res = await session.execute(
            select(Organization).where(Organization.slug == "default")
        )
        default_org = org_res.scalar_one_or_none()
        if not default_org:
            default_org = Organization(
                name="Default Organization",
                slug="default",
            )
            session.add(default_org)
            logger.info("Created default organization: Default Organization")

        # 2. Seed Admin User
        admin_res = await session.execute(
            select(User).where(User.username == settings.ADMIN_USERNAME)
        )
        admin = admin_res.scalar_one_or_none()
        pwd_hash = hash_password(settings.ADMIN_PASSWORD)
        if not admin:
            admin_user = User(
                username=settings.ADMIN_USERNAME,
                email="admin@fanos.ai",
                full_name="Administrator",
                hashed_pwd=pwd_hash,
                hashed_password=pwd_hash,
                role="admin",
                tenant_id="org-default",
                is_active=True,
            )
            session.add(admin_user)
            logger.info("Created default admin user: %s", settings.ADMIN_USERNAME)
        else:
            if not admin.tenant_id:
                admin.tenant_id = "org-default"
            if not admin.hashed_password:
                admin.hashed_password = pwd_hash

        # 3. Seed Default Local Development Domains
        dev_domains = [
            ("localhost", settings.UPSTREAM_TARGET_URL, "development"),
            ("127.0.0.1", settings.UPSTREAM_TARGET_URL, "development"),
        ]
        for d_name, orig_url, env in dev_domains:
            dom_res = await session.execute(
                select(Domain).where(Domain.domain_name == d_name)
            )
            if not dom_res.scalar_one_or_none():
                raw_token = f"fanos-verify-{secrets.token_hex(16)}"
                token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
                dev_dom = Domain(
                    tenant_id="org-default",
                    domain_name=d_name,
                    subdomains_json=json.dumps([]),
                    origin_url=orig_url,
                    environment=env,
                    enforcement_mode=settings.WAF_MODE,
                    verification_status="verified",
                    verification_token=raw_token,
                    verification_token_hash=token_hash,
                    is_active=True,
                )
                session.add(dev_dom)
                logger.info("Seeded default verified domain: %s -> %s", d_name, orig_url)

        # 4. Seed Default Rules
        for rule in DEFAULT_RULES:
            rule_res = await session.execute(
                select(WAFRuleModel).where(WAFRuleModel.id == rule.id)
            )
            existing = rule_res.scalar_one_or_none()
            if not existing:
                model = WAFRuleModel(
                    id=rule.id,
                    name=rule.name,
                    category=rule.category,
                    severity=rule.severity.value,
                    action=rule.action.value,
                    description=rule.description,
                    enabled=rule.enabled,
                    is_custom=rule.is_custom,
                    pattern=rule.pattern,
                    target_locations_json=json.dumps(rule.target_locations),
                    tags_json=json.dumps(rule.tags),
                )
                session.add(model)
            else:
                existing.name = rule.name
                existing.category = rule.category
                existing.severity = rule.severity.value
                existing.action = rule.action.value
                existing.description = rule.description
                existing.target_locations_json = json.dumps(rule.target_locations)
                existing.tags_json = json.dumps(rule.tags)

        # 5. Seed Default Settings
        default_settings = [
            ("waf_mode", settings.WAF_MODE, "Operating mode: monitor or block"),
            ("block_threshold", str(settings.BLOCK_THRESHOLD), "Risk score threshold to block (0-100)"),
            ("monitor_threshold", str(settings.MONITOR_THRESHOLD), "Risk score threshold to monitor (0-100)"),
            ("max_body_size_bytes", str(settings.MAX_REQUEST_BODY_SIZE_BYTES), "Max allowed request body in bytes"),
            ("max_uri_length", str(settings.MAX_URI_LENGTH), "Max allowed URI length in characters"),
        ]
        for key, val, desc in default_settings:
            s_res = await session.execute(
                select(WAFSettingModel).where(WAFSettingModel.key == key)
            )
            if not s_res.scalar_one_or_none():
                session.add(WAFSettingModel(key=key, value=val, description=desc))

        await session.commit()
        logger.info("Database initialized successfully.")
