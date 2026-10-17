"""
Enterprise Web Security Assessment PDF Report Generator
Generates executive-ready security assessment reports using ReportLab.
"""
import io
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)

# Palette
DARK_NAVY = colors.HexColor('#0B1120')
ELECTRIC_CYAN = colors.HexColor('#06B6D4')
SLATE_GRAY = colors.HexColor('#64748B')
LIGHT_BG = colors.HexColor('#F8FAFC')
BORDER_COLOR = colors.HexColor('#E2E8F0')

SEVERITY_COLORS = {
    'Critical': colors.HexColor('#DC2626'),
    'High': colors.HexColor('#EA580C'),
    'Medium': colors.HexColor('#D97706'),
    'Low': colors.HexColor('#2563EB'),
    'Informational': colors.HexColor('#059669')
}

def generate_pdf_report(job: dict, assets: list, technologies: list, urls: list, findings: list) -> io.BytesIO:
    """
    Builds a professional PDF assessment report.
    Returns a BytesIO stream ready for download.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom Typography
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=DARK_NAVY,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=ELECTRIC_CYAN,
        spaceAfter=15
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=DARK_NAVY,
        spaceBefore=14,
        spaceAfter=8
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    bold_label = ParagraphStyle(
        'BoldLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=14,
        textColor=DARK_NAVY
    )

    story = []

    # 1. Header & Title Banner
    story.append(Paragraph("Enterprise Web Security Assessment", title_style))
    story.append(Paragraph("Fanos CyberSec Assessment & Vulnerability Analysis Engine", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=ELECTRIC_CYAN, spaceAfter=15))

    # 2. Executive Summary & Scan Metadata Table
    story.append(Paragraph("Executive Summary & Scan Metadata", section_heading))
    
    target_url = job.get('target_url', 'Unknown')
    target_domain = job.get('target_domain', 'Unknown')
    start_time = job.get('start_time', 'N/A')
    duration = f"{job.get('duration_seconds', 0)} seconds"
    authorized_by = job.get('authorized_by', 'Security Team')
    status = job.get('status', 'Completed').upper()

    stats = job.get('stats', {})
    crit_count = stats.get('critical', 0)
    high_count = stats.get('high', 0)
    med_count = stats.get('medium', 0)
    low_count = stats.get('low', 0)
    info_count = stats.get('informational', 0)
    total_findings = len(findings)

    meta_data = [
        [Paragraph("Target URL:", bold_label), Paragraph(target_url, body_style),
         Paragraph("Target Domain:", bold_label), Paragraph(target_domain, body_style)],
        [Paragraph("Scan Status:", bold_label), Paragraph(status, body_style),
         Paragraph("Execution Duration:", bold_label), Paragraph(duration, body_style)],
        [Paragraph("Authorized Operator:", bold_label), Paragraph(authorized_by, body_style),
         Paragraph("Timestamp (UTC):", bold_label), Paragraph(str(start_time), body_style)],
    ]

    t_meta = Table(meta_data, colWidths=[110, 160, 110, 150])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 15))

    # 3. Findings Severity Breakdown
    story.append(Paragraph("Vulnerability Severity Breakdown", section_heading))
    sev_table_data = [
        [
            Paragraph("<b>Severity</b>", bold_label),
            Paragraph("<b>Count</b>", bold_label),
            Paragraph("<b>Risk Description</b>", bold_label)
        ],
        [
            Paragraph("<font color='#DC2626'><b>Critical</b></font>", bold_label),
            str(crit_count),
            "Immediate exploitability resulting in compromise or exposed sensitive credentials."
        ],
        [
            Paragraph("<font color='#EA580C'><b>High</b></font>", bold_label),
            str(high_count),
            "Significant risk of unauthorized access, sensitive data exposure, or weak TLS."
        ],
        [
            Paragraph("<font color='#D97706'><b>Medium</b></font>", bold_label),
            str(med_count),
            "Configuration gaps such as missing Content-Security-Policy or missing cookie flags."
        ],
        [
            Paragraph("<font color='#2563EB'><b>Low</b></font>", bold_label),
            str(low_count),
            "Minor information disclosure like server banners or missing hardening headers."
        ],
        [
            Paragraph("<font color='#059669'><b>Informational</b></font>", bold_label),
            str(info_count),
            "Architectural notes, discovered frameworks, robots.txt, or passive observations."
        ],
    ]
    t_sev = Table(sev_table_data, colWidths=[100, 60, 370])
    t_sev.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_sev)
    story.append(Spacer(1, 15))

    # 4. Discovered Assets & Infrastructure
    story.append(Paragraph("Discovered Assets & Infrastructure", section_heading))
    asset_summary = f"Total Assets Mapped: {len(assets)} | Crawled Endpoints: {len(urls)} | Technologies Identified: {len(technologies)}"
    story.append(Paragraph(asset_summary, body_style))

    if assets:
        asset_rows = [[Paragraph("<b>Asset Type</b>", bold_label), Paragraph("<b>Observed Value</b>", bold_label)]]
        for a in assets[:8]: # Show top 8 assets
            asset_rows.append([
                Paragraph(a.get('asset_type', '').capitalize(), body_style),
                Paragraph(a.get('asset_value', '')[:60], body_style)
            ])
        t_assets = Table(asset_rows, colWidths=[150, 380])
        t_assets.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
            ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t_assets)
        story.append(Spacer(1, 15))

    # 5. Technology Stack
    if technologies:
        story.append(Paragraph("Detected Technologies", section_heading))
        tech_rows = [[Paragraph("<b>Category</b>", bold_label), Paragraph("<b>Component / Name</b>", bold_label), Paragraph("<b>Confidence</b>", bold_label)]]
        for tech in technologies:
            ver_text = f" ({tech.get('version')})" if tech.get('version') else ""
            tech_rows.append([
                Paragraph(tech.get('category', 'General'), body_style),
                Paragraph(f"{tech.get('name', 'Unknown')}{ver_text}", body_style),
                Paragraph(tech.get('confidence', 'High'), body_style)
            ])
        t_tech = Table(tech_rows, colWidths=[150, 260, 120])
        t_tech.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
            ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t_tech)
        story.append(Spacer(1, 15))

    # 6. Detailed Security Findings
    story.append(Paragraph(f"Detailed Security Findings ({total_findings})", section_heading))
    
    def safe_xml(s: str) -> str:
        if not s:
            return ""
        return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")

    if not findings:
        story.append(Paragraph("No vulnerabilities or security gaps were identified during this assessment.", body_style))
    else:
        for idx, f in enumerate(findings, 1):
            sev = f.get('severity', 'Informational')
            badge_color = SEVERITY_COLORS.get(sev, colors.gray).hexval()
            
            finding_block = []
            f_title = f"<b>#{idx}. {safe_xml(f.get('title', 'Finding'))}</b> [<font color='{badge_color}'>{sev.upper()}</font>]"
            finding_block.append(Paragraph(f_title, ParagraphStyle('FTitle', parent=bold_label, fontSize=11, spaceAfter=4)))
            
            # Metadata
            meta_line = f"<b>Affected Asset:</b> {safe_xml(f.get('affected_asset', 'N/A'))} | <b>Category:</b> {safe_xml(f.get('category', 'General'))} | <b>Confidence:</b> {safe_xml(f.get('confidence', 'Medium'))}"
            finding_block.append(Paragraph(meta_line, body_style))
            
            # Evidence
            evid_data = f.get('evidence', {})
            evid_str = str(evid_data) if isinstance(evid_data, dict) else str(evid_data)
            finding_block.append(Paragraph("<b>Observed Evidence:</b>", bold_label))
            finding_block.append(Paragraph(f"<font color='#0284C7'>{safe_xml(evid_str[:600])}</font>", body_style))
            
            # Analysis
            finding_block.append(Paragraph("<b>Technical Analysis:</b>", bold_label))
            finding_block.append(Paragraph(safe_xml(f.get('description', 'No description available.')), body_style))
            
            # Impact
            finding_block.append(Paragraph("<b>Security Impact:</b>", bold_label))
            finding_block.append(Paragraph(safe_xml(f.get('impact', 'No impact details available.')), body_style))
            
            # Remediation
            finding_block.append(Paragraph("<b>Remediation Recommendation:</b>", bold_label))
            finding_block.append(Paragraph(f"<font color='#059669'>{safe_xml(f.get('remediation', 'Follow industry hardening best practices.'))}</font>", body_style))
            
            finding_block.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceBefore=8, spaceAfter=12))
            story.append(KeepTogether(finding_block))

    # 7. Scan Limitations & Disclaimer
    story.append(Spacer(1, 10))
    story.append(Paragraph("Assessment Scope & Limitations Disclaimer", section_heading))
    disclaimer_text = (
        "This security assessment was executed strictly against explicitly authorized scope boundaries. "
        "Dynamic web assessment provides a non-exhaustive snapshot of externally visible services, HTTP headers, "
        "TLS configuration, and discoverable endpoints. Passive detection does not guarantee the absence of deeper logic "
        "flaws or zero-day vulnerabilities in unauthenticated/unreachable components. Routine remediation and continuous "
        "monitoring are strongly recommended."
    )
    story.append(Paragraph(disclaimer_text, ParagraphStyle('Disc', parent=body_style, fontSize=8, leading=11, textColor=SLATE_GRAY)))

    doc.build(story)
    buffer.seek(0)
    return buffer
