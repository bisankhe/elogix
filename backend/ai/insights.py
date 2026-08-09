"""
FILE: backend/ai/insights.py
AI Service Layer — Claude API integration for HR intelligence
Used by: org_routes.py, workforce_routes.py
"""

import anthropic
import json
import re
from datetime import datetime
from functools import lru_cache


client = anthropic.Anthropic()   # reads ANTHROPIC_API_KEY from env
MODEL  = "claude-sonnet-4-6"
MAX_TOKENS = 1024


def _call_claude(system_prompt: str, user_prompt: str, expect_json=True) -> dict | str:
    """Core Claude API call with JSON parsing"""
    try:
        msg = client.messages.create(
            model=MODEL, max_tokens=MAX_TOKENS,
            system=system_prompt,
            messages=[{"role":"user","content":user_prompt}]
        )
        text = msg.content[0].text.strip()
        if expect_json:
            cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE)
            return json.loads(cleaned)
        return text
    except Exception as e:
        return {"error": str(e), "fallback": True}


def generate_ai_insights(context: dict) -> dict:
    """
    Generic AI insight generation for org structure analytics.
    Called by: ai_workforce_summary, company AI compliance check
    """
    system = (
        "You are an expert HR analytics AI for NepHR Pro HRIS software. "
        "You specialize in Nepal Labour Act 2074 compliance and organizational design. "
        "Return concise, actionable JSON insights only. No markdown, no preamble."
    )
    user = f"""
Analyze this HR data and return a JSON object with keys:
- "key_insights": [list of 3-5 short bullet point observations]
- "risks": [list of identified risks with severity: low/medium/high/critical]
- "recommendations": [list of 3-5 actionable recommendations]
- "nepal_law_flags": [any Labour Act 2074 compliance concerns]
- "ai_confidence": number 0-100

HR Data Context:
{json.dumps(context, indent=2)}
"""
    return _call_claude(system, user, expect_json=True)


def generate_jd(context: dict) -> dict:
    """
    AI Job Description Generator for DesignationSetupPage.
    Called by: /designations/<id>/generate-jd endpoint
    """
    system = (
        "You are an HR expert specializing in creating Nepal Labour Act 2074-compliant "
        "job descriptions for HRIS software. Create professional, concise JDs in English. "
        "Include Nepal-specific compliance notes. Return JSON only, no markdown."
    )
    user = f"""
Create a comprehensive job description for this role. Return JSON with keys:
- "summary": one paragraph role overview (2-3 sentences)
- "responsibilities": list of 5-7 key responsibilities
- "qualifications": list of required qualifications and experience
- "competencies": list of 4-6 core competencies
- "nepal_law_note": note about Labour Act 2074 classification (managerial or general)
- "full_text": complete formatted JD as a string

Role Context:
{json.dumps(context, indent=2)}
"""
    return _call_claude(system, user, expect_json=True)


def analyze_attrition_risk(context: dict) -> dict:
    """
    AI attrition/flight risk analysis for positions in ReportingHierarchyPage.
    Called by: /positions/<id>/ai-risk endpoint
    """
    system = (
        "You are an expert predictive HR analytics AI. Analyze position and role data "
        "to estimate attrition/flight risk. Consider: role level, span of control, "
        "succession planning gaps, and organizational factors. "
        "Return JSON only. Score 0-100 (0=no risk, 100=critical)."
    )
    user = f"""
Analyze attrition risk for this position. Return JSON with:
- "score": number 0-100
- "level": "low" | "medium" | "high" | "critical"
- "factors": list of 3-5 risk factors identified
- "mitigation_actions": list of 3-4 recommended retention actions
- "succession_urgency": "immediate" | "within_6_months" | "within_1_year" | "not_urgent"

Position Data:
{json.dumps(context, indent=2)}
"""
    return _call_claude(system, user, expect_json=True)


def validate_invoice_ai(context: dict) -> dict:
    """
    AI invoice validation — cross-checks billing vs attendance vs timesheets.
    Called by: /vendor-invoices/<id>/ai-validate endpoint
    """
    system = (
        "You are an AI financial compliance auditor for vendor invoice validation. "
        "Cross-check billed amounts against attendance and timesheet records. "
        "Flag discrepancies and fraud risks. Follow Nepal Labour Act 2074 billing rules. "
        "TDS rate on services is 1.5%. Return JSON only."
    )
    user = f"""
Validate this vendor invoice against attendance data. Return JSON with:
- "is_valid": boolean
- "has_discrepancy": boolean
- "expected_amount": calculated expected NPR amount
- "discrepancy_amount": difference if any
- "discrepancy_reason": explanation if discrepancy found
- "fraud_risk_score": number 0-100
- "fraud_indicators": list of specific issues found
- "summary": 2-sentence validation summary
- "recommendation": "approve" | "dispute" | "request_clarification"

Invoice Data:
{json.dumps(context, indent=2)}
"""
    return _call_claude(system, user, expect_json=True)


def detect_ghost_workers(attendance_records: list) -> dict:
    """
    AI ghost worker detection from attendance patterns.
    Called by: /vendor-attendance/ai-ghost-scan endpoint
    """
    system = (
        "You are an AI fraud detection system specialized in workforce attendance. "
        "Detect ghost worker patterns: systematic absences, non-biometric attendance, "
        "unusual patterns that suggest workers are on payroll but not working. "
        "Return JSON only."
    )
    # Aggregate for AI (don't send all records to save tokens)
    summary = {
        "total_records": len(attendance_records),
        "biometric_pct": round(sum(1 for r in attendance_records if r.get("biometric_verified"))/len(attendance_records)*100, 1) if attendance_records else 0,
        "avg_late_pct": round(sum(1 for r in attendance_records if r.get("late_minutes",0)>15)/len(attendance_records)*100, 1) if attendance_records else 0,
    }
    user = f"""
Scan these attendance patterns for ghost worker risk. Return JSON with:
- "overall_risk": "low" | "medium" | "high" | "critical"
- "ghost_worker_probability_pct": number 0-100
- "high_risk_workers": list of {{vendor_emp_id, risk_score, patterns: [list of issues]}}
- "patterns_detected": list of suspicious pattern descriptions
- "recommended_actions": list of verification steps

Attendance Summary:
{json.dumps(summary, indent=2)}
"""
    return _call_claude(system, user, expect_json=True)


def score_vendor_performance(kpi_data: dict) -> dict:
    """
    AI vendor performance scoring for monthly scorecards.
    Called by: /vendor-performance/generate-scorecards endpoint
    """
    system = (
        "You are an expert vendor management AI scoring vendors against SLA KPIs. "
        "Provide weighted scoring, trend analysis, and recommendations. "
        "Consider Nepal Labour Act 2074 compliance as highest weight factor. "
        "Return JSON only."
    )
    user = f"""
Score this vendor's monthly performance and return JSON with:
- "overall_score": number 0-100 (weighted average)
- "risk_level": "low" | "medium" | "high" | "critical"
- "trend": "improving" | "stable" | "declining"
- "summary": 2-sentence performance summary
- "recommendation": "renew" | "warn" | "performance_review" | "terminate"
- "kpi_analysis": brief analysis of each KPI
- "nepal_compliance_flag": true/false if Labour Act 2074 issues detected

KPI Data:
{json.dumps(kpi_data, indent=2)}
"""
    return _call_claude(system, user, expect_json=True)


def generate_org_restructure_recommendations(org_data: dict) -> dict:
    """
    AI org restructure recommendations for ReportingHierarchyPage.
    Called by: /companies/<id>/ai-insights/org-restructure
    """
    system = (
        "You are an organizational design expert AI. Analyze org structure data "
        "and provide evidence-based restructuring recommendations. "
        "Consider: span of control (optimal 5-8), succession gaps, "
        "attrition risk clusters, and Nepal Labour Act 2074 requirements. "
        "Return JSON only."
    )
    user = f"""
Analyze this org structure and return JSON with:
- "span_of_control_issues": list of managers with overloaded/underloaded spans
- "succession_gaps": list of critical positions without succession plans
- "attrition_clusters": groups of high-risk positions
- "restructure_recommendations": list of 4-6 specific, actionable recommendations
- "priority_actions": list of top 3 immediate actions with urgency
- "estimated_org_health_score": number 0-100

Org Data:
{json.dumps(org_data, indent=2)}
"""
    return _call_claude(system, user, expect_json=True)
