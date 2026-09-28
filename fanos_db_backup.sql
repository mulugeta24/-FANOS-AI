--
-- PostgreSQL database dump
--

\restrict UrwmHzLxMargGQFo6Bwdsu00vnoYpBt070koMjsU8yUGOQoIuB2oZFjipb1TIPh

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: security_events; Type: TABLE; Schema: public; Owner: fanos
--

CREATE TABLE public.security_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    severity character varying(20) NOT NULL,
    attack_type character varying(100),
    source_ip character varying(45),
    target character varying(255),
    ai_confidence double precision,
    risk_score integer,
    status character varying(20),
    raw_payload text,
    sensor_source character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.security_events OWNER TO fanos;

--
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: fanos
--

COPY public.security_events (id, severity, attack_type, source_ip, target, ai_confidence, risk_score, status, raw_payload, sensor_source, created_at, updated_at) FROM stdin;
f21f2514-6625-43d6-b795-74e40ecc9653	CRITICAL	SQL Injection	203.0.113.42	example.com/search	85.5	95	BLOCKED	{"rule_id": "942100", "msg": "SQL Injection Attack Detected"}	waf	2026-09-20 12:28:20.007518+00	2026-09-20 12:33:20.007518+00
3eb25c17-bb0c-4c6a-ba17-942ba9c2b754	HIGH	XSS	192.0.2.15	example.com/login	80.2	85	BLOCKED	{"rule_id": "941100", "msg": "XSS Attack Detected"}	waf	2026-09-20 12:23:20.007518+00	2026-09-20 12:33:20.007518+00
23263582-6c3d-48cf-9974-d3abefad02dd	HIGH	Command Injection	198.51.100.23	example.com/admin.php	82.7	88	BLOCKED	{"rule_id": "933150", "msg": "PHP Injection Attack"}	waf	2026-09-20 12:18:20.007518+00	2026-09-20 12:33:20.007518+00
ea4c07ab-9f8e-452d-8eb8-71af098a522a	CRITICAL	Path Traversal	203.0.113.87	example.com/etc/passwd	90.1	92	BLOCKED	{"rule_id": "930110", "msg": "Path Traversal Attack"}	waf	2026-09-20 12:13:20.007518+00	2026-09-20 12:33:20.007518+00
cd604c3f-3726-4bd3-b3cf-6a7fe7cd36b2	CRITICAL	SQL Injection	198.51.100.91	example.com/search	88.3	93	BLOCKED	{"rule_id": "9500001", "msg": "FANOS Custom SQL Injection"}	waf	2026-09-20 12:08:20.007518+00	2026-09-20 12:33:20.007518+00
5b684b42-3f7c-4fd3-ac0c-eb4f3d7d51df	HIGH	XSS	192.0.2.44	example.com/search	81.5	86	BLOCKED	{"rule_id": "941110", "msg": "XSS Filter - Script Tag"}	waf	2026-09-20 12:03:20.007518+00	2026-09-20 12:33:20.007518+00
b5ed4040-66b5-44ef-b623-fdcf989dc223	MEDIUM	Protocol Violation	203.0.113.100	example.com/api/users	65	60	MONITORED	{"rule_id": "920100", "msg": "Invalid HTTP Request"}	waf	2026-09-20 11:58:20.007518+00	2026-09-20 12:33:20.007518+00
49504e78-6160-4745-8c90-95783f20c68f	CRITICAL	Command Injection	198.51.100.200	example.com/upload	89.8	94	BLOCKED	{"rule_id": "933140", "msg": "Remote Command Execution"}	waf	2026-09-20 11:53:20.007518+00	2026-09-20 12:33:20.007518+00
4048dcb8-97bf-4f25-8e8d-15567232a4df	HIGH	SQL Injection	192.0.2.99	example.com/api/data	83.2	87	BLOCKED	{"rule_id": "942190", "msg": "UNION SELECT injection"}	waf	2026-09-20 11:48:20.007518+00	2026-09-20 12:33:20.007518+00
6357b4db-60ec-417c-8b1b-5cd9c6dc78b5	MEDIUM	Rate Limiting	198.51.100.150	example.com/api/login	70	65	MONITORED	{"rule_id": "920430", "msg": "Content-Length Anomaly"}	waf	2026-09-20 11:43:20.007518+00	2026-09-20 12:33:20.007518+00
\.


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: fanos
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict UrwmHzLxMargGQFo6Bwdsu00vnoYpBt070koMjsU8yUGOQoIuB2oZFjipb1TIPh

