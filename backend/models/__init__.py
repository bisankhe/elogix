"""
FILE: backend/models/__init__.py
Exports all SQLAlchemy models so they are registered with db.create_all().
Import this in app.py before calling db.create_all().
"""
# Org Setup
from .org_models import (
    Base, GroupCompany, Company, CompanyLegalDocument,
    Branch, BusinessUnit, Department, Section, Unit,
    Team, CostCenter, WorkLocation,
)
# Structure & Hierarchy
from .structure_models import (
    EmploymentCategory, EMPLOYMENT_CATEGORY_SEEDS,
    JobFamily, GradeLevel, Designation,
    ReportingRelationship, OrgChartNode, Position,
)
# Recruitment & Hiring Module
from .recruitment_models import (
    JobRequisition, Vacancy, JobPosting, Candidate, Application,
    ResumeScreeningResult, Interview, InterviewPanelMember, InterviewScorecard,
    Offer, BackgroundCheck, HiringApproval,
)
# Employee & Policy Acknowledgements
from .employee_models import (
    Employee, PolicyAcknowledgement, PolicyAuditLog,
)
# Shift / Holiday / Weekend
from .shift_holiday_models import (
    ShiftType, HolidayCalendar, WeekendPolicy,
)
# Workforce / Outsource
from .workforce_config_models import (
    EmploymentTypeConfig, OutsourceVendor, SLAContract,
    SLAKPIResult, VendorEmployee, VendorInvoice,
    VendorAttendance, VendorPerformanceCard,
)

__all__ = [
    "GroupCompany", "Company", "CompanyLegalDocument",
    "Branch", "BusinessUnit", "Department",
    "Section", "Unit", "Team", "CostCenter", "WorkLocation",
    "EmploymentCategory", "JobFamily", "GradeLevel",
    "Designation", "ReportingRelationship", "OrgChartNode", "Position",
    "EmploymentTypeConfig", "OutsourceVendor", "SLAContract",
    "SLAKPIResult", "VendorEmployee", "VendorInvoice",
    "VendorAttendance", "VendorPerformanceCard",
    "ShiftType", "HolidayCalendar", "WeekendPolicy",
    "Employee", "PolicyAcknowledgement", "PolicyAuditLog",
    "JobRequisition", "Vacancy", "JobPosting", "Candidate", "Application",
    "ResumeScreeningResult", "Interview", "InterviewPanelMember", "InterviewScorecard",
    "Offer", "BackgroundCheck", "HiringApproval",
]

from .ai_models import AIChatSession, AIChatMessage, AIUsageLog, AIKnowledgeBase
