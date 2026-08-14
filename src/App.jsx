// ============================================================
// FILE: src/App.jsx  - eLogix HRMS Root Component
// All 80 routes registered, no duplicate imports
// ============================================================

import { useState, useCallback, createContext, useContext } from 'react'
import { PERSONAS }   from './data/personas.js'
import { ROLE_TO_PERSONA, ROLE_TO_DEFAULT_PAGE, getTenantContext } from './data/rolePersonaMap.js'
import { CURRENCIES } from './data/currencies.js'
import { translate, getDir, LANGUAGES } from './i18n/index.js'
import { PermissionsProvider } from './hooks/usePermissions.jsx'

// Layout
import Sidebar    from './components/layout/Sidebar.jsx'
import Topbar     from './components/layout/Topbar.jsx'
import Breadcrumb from './components/layout/Breadcrumb.jsx'

// Modals
import LanguageCurrencyModal from './components/modals/LanguageCurrencyModal.jsx'
import NotificationPanel     from './components/modals/NotificationPanel.jsx'
import AIAssistantModal      from './components/modals/AIAssistantModal.jsx'
import HRCopilot             from './components/shared/HRCopilot.jsx'
import QuickDock             from './components/layout/QuickDock.jsx'

// 7 Persona Dashboards
import SuperAdminDashboard  from './components/dashboard/SuperAdminDashboard.jsx'
import ExecutiveDashboard   from './components/dashboard/ExecutiveDashboard.jsx'
import HRManagerDashboard   from './components/dashboard/HRManagerDashboard.jsx'
// Role-based persona dashboards (12 new -- Finance, IT Admin,
// Recruitment Officer, Procurement, Admin Workspace, Sales,
// Customer Service, Legal, Operations, L&D, HR Officer, Marketing)
import FinanceDashboard              from './components/dashboard/FinanceDashboard.jsx'
import ITAdministratorDashboard      from './components/dashboard/ITAdministratorDashboard.jsx'
import RecruitmentOfficerDashboard   from './components/dashboard/RecruitmentOfficerDashboard.jsx'
import ProcurementDashboard          from './components/dashboard/ProcurementDashboard.jsx'
import AdminWorkspaceDashboard       from './components/dashboard/AdminWorkspaceDashboard.jsx'
import SalesDashboard                from './components/dashboard/SalesDashboard.jsx'
import CustomerServiceDashboard      from './components/dashboard/CustomerServiceDashboard.jsx'
import LegalDashboard                from './components/dashboard/LegalDashboard.jsx'
import OperationsDashboard           from './components/dashboard/OperationsDashboard.jsx'
import LearningDevelopmentDashboard  from './components/dashboard/LearningDevelopmentDashboard.jsx'
import HROfficerDashboard            from './components/dashboard/HROfficerDashboard.jsx'
import MarketingDashboard            from './components/dashboard/MarketingDashboard.jsx'
import DepartmentDashboard  from './components/dashboard/DepartmentDashboard.jsx'
import BranchDashboard      from './components/dashboard/BranchDashboard.jsx'
import EmployeeDashboard    from './components/dashboard/EmployeeDashboard.jsx'
import RecruitmentDashboard from './components/dashboard/RecruitmentDashboard.jsx'

// Snapshots & Analytics
import AttendanceSnapshot   from './components/dashboard/snapshots/AttendanceSnapshot.jsx'
import LeaveSnapshot        from './components/dashboard/snapshots/LeaveSnapshot.jsx'
import PayrollSnapshot      from './components/dashboard/snapshots/PayrollSnapshot.jsx'
import RecruitmentSnapshot  from './components/dashboard/snapshots/RecruitmentSnapshot.jsx'
import PerformanceSnapshot  from './components/dashboard/snapshots/PerformanceSnapshot.jsx'
import EngagementSnapshot   from './components/dashboard/snapshots/EngagementSnapshot.jsx'
import AIInsightsPage       from './components/dashboard/snapshots/AIInsightsPage.jsx'
import NotificationsPage    from './components/dashboard/snapshots/NotificationsPage.jsx'
// ── AI Assistant Module Pages ──────────────────────────────────
import AIHRAnalyticsPage         from './components/dashboard/snapshots/AIHRAnalyticsPage.jsx'
import AIPolicyAssistantPage     from './components/dashboard/snapshots/AIPolicyAssistantPage.jsx'
import AIAttendanceInsightsPage  from './components/dashboard/snapshots/AIAttendanceInsightsPage.jsx'
import AIAttritionPredictionPage from './components/dashboard/snapshots/AIAttritionPredictionPage.jsx'
import PredictiveAnalyticsPage   from './components/dashboard/snapshots/PredictiveAnalyticsPage.jsx'
import AIPerformanceInsightsPage from './components/dashboard/snapshots/AIPerformanceInsightsPage.jsx'
import SmartNotificationsPage    from './components/dashboard/snapshots/SmartNotificationsPage.jsx'
import AIReportGeneratorPage     from './components/dashboard/snapshots/AIReportGeneratorPage.jsx'
// ── Dashboard Widget Pages (previously missing routes) ─────────
import HeadcountAnalysisPage     from './components/dashboard/snapshots/HeadcountAnalysisPage.jsx'
import DeptEmployeeComparisonPage from './components/dashboard/snapshots/DeptEmployeeComparisonPage.jsx'
import EmpSatisfactionPage       from './components/dashboard/snapshots/EmpSatisfactionPage.jsx'
import WorklifeBalancePage       from './components/dashboard/snapshots/WorklifeBalancePage.jsx'
import OnboardingMonthPage       from './components/dashboard/snapshots/OnboardingMonthPage.jsx'
import CalendarEventsPage        from './components/dashboard/snapshots/CalendarEventsPage.jsx'
import UpcomingEventsPage        from './components/dashboard/snapshots/UpcomingEventsPage.jsx'
import BirthdayAnniversaryPage   from './components/dashboard/snapshots/BirthdayAnniversaryPage.jsx'
import TenureChartPage           from './components/dashboard/snapshots/TenureChartPage.jsx'
import AgeGroupPage              from './components/dashboard/snapshots/AgeGroupPage.jsx'
import BloodGroupPage            from './components/dashboard/snapshots/BloodGroupPage.jsx'
import ContractExpiryPage        from './components/dashboard/snapshots/ContractExpiryPage.jsx'
import RosterDetailsPage         from './components/dashboard/snapshots/RosterDetailsPage.jsx'
import QuickActionsPage          from './components/dashboard/snapshots/QuickActionsPage.jsx'
// ── ESS & Operational Pages (previously missing routes) ────────
import MyDailyActivityPage       from './components/dashboard/snapshots/MyDailyActivityPage.jsx'
import MyDressCodePage           from './components/dashboard/snapshots/MyDressCodePage.jsx'
import MyFieldVisitPage          from './components/dashboard/snapshots/MyFieldVisitPage.jsx'
import PersonalInformationPage   from './components/dashboard/snapshots/PersonalInformationPage.jsx'
import TeamDailyActivityPage     from './components/dashboard/snapshots/TeamDailyActivityPage.jsx'
import TeamPerformanceMSSPage    from './components/dashboard/snapshots/TeamPerformanceMSSPage.jsx'
import OvertimeRequestPage       from './components/dashboard/snapshots/OvertimeRequestPage.jsx'
import OvertimeAcceptancePage    from './components/dashboard/snapshots/OvertimeAcceptancePage.jsx'
import OvertimeForwardPage       from './components/dashboard/snapshots/OvertimeForwardPage.jsx'
import PerfTalentPage            from './components/dashboard/snapshots/PerfTalentPage.jsx'
import EmpExperiencePage         from './components/dashboard/snapshots/EmpExperiencePage.jsx'
import EmpLifecyclePage          from './components/dashboard/snapshots/EmpLifecyclePage.jsx'
import OrgMgmtPage               from './components/dashboard/snapshots/OrgMgmtPage.jsx'
import WorkforceOpsPage          from './components/dashboard/snapshots/WorkforceOpsPage.jsx'
import FinanceAssetsPage         from './components/dashboard/snapshots/FinanceAssetsPage.jsx'
import FieldVisitExpensesPage    from './components/dashboard/snapshots/FieldVisitExpensesPage.jsx'
import CashAdvanceBillsPage      from './components/dashboard/snapshots/CashAdvanceBillsPage.jsx'
import StoredTasksPage           from './components/dashboard/snapshots/StoredTasksPage.jsx'
import EmploymentContractPage    from './components/dashboard/snapshots/EmploymentContractPage.jsx'
import ExitAssetReturnPage       from './components/dashboard/snapshots/ExitAssetReturnPage.jsx'
import HRPoliciesPage       from './components/dashboard/snapshots/HRPoliciesPage.jsx'
import DraftHRPolicyPage    from './components/dashboard/snapshots/DraftHRPolicyPage.jsx'
import PublishHRPolicyPage  from './components/dashboard/snapshots/PublishHRPolicyPage.jsx'
import HRPolicyLibraryPage  from './components/dashboard/snapshots/HRPolicyLibraryPage.jsx'
import ImplementHRPolicyPage from './components/dashboard/snapshots/ImplementHRPolicyPage.jsx'
import HRPolicyReadersPage  from './components/dashboard/snapshots/HRPolicyReadersPage.jsx'

// Org Setup
import GroupCompanyPage     from './components/dashboard/snapshots/GroupCompanyPage.jsx'
import CompanyProfilePage   from './components/dashboard/snapshots/CompanyProfilePage.jsx'
import CompanySetupPage     from './components/dashboard/snapshots/CompanySetupPage.jsx'
import BranchLocationPage   from './components/dashboard/snapshots/BranchLocationPage.jsx'
import BusinessUnitPage     from './components/dashboard/snapshots/BusinessUnitPage.jsx'

// Dept & Team
import DeptSetupPage        from './components/dashboard/snapshots/DeptSetupPage.jsx'
import DeptTeamSetupPage    from './components/dashboard/snapshots/DeptTeamSetupPage.jsx'
import SectionUnitPage      from './components/dashboard/snapshots/SectionUnitPage.jsx'
import TeamSetupPage        from './components/dashboard/snapshots/TeamSetupPage.jsx'
import CostCenterPage       from './components/dashboard/snapshots/CostCenterPage.jsx'
import WorkLocationPage     from './components/dashboard/snapshots/WorkLocationPage.jsx'

// Structure & Hierarchy
import EmploymentCategoryPage  from './components/dashboard/snapshots/EmploymentCategoryPage.jsx'
import GradeLevelPage          from './components/dashboard/snapshots/GradeLevelPage.jsx'
import DesignationSetupPage    from './components/dashboard/snapshots/DesignationSetupPage.jsx'
import ReportingHierarchyPage  from './components/dashboard/snapshots/ReportingHierarchyPage.jsx'
import OrgChartPage            from './components/dashboard/snapshots/OrgChartPage.jsx'
import ProcessFlowPage         from './components/dashboard/snapshots/ProcessFlowPage.jsx'
import PositionManagementPage  from './components/dashboard/snapshots/PositionManagementPage.jsx'

// Employment Type & Outsource (legacy module)
import EmploymentTypePage      from './components/dashboard/snapshots/EmploymentTypePage.jsx'
import OutsourceSLAPage        from './components/dashboard/snapshots/OutsourceSLAPage.jsx'
import OutsourceEmployeesPage  from './components/dashboard/snapshots/OutsourceEmployeesPage.jsx'
import OutsourceBillingPage    from './components/dashboard/snapshots/OutsourceBillingPage.jsx'
import OutsourceAttendancePage from './components/dashboard/snapshots/OutsourceAttendancePage.jsx'
import OutsourcePerformancePage from './components/dashboard/snapshots/OutsourcePerformancePage.jsx'

// Workforce Configuration
import VendorOutsourceMappingPage from './components/dashboard/snapshots/VendorOutsourceMappingPage.jsx'
import ShiftSetupPage             from './components/dashboard/snapshots/ShiftSetupPage.jsx'
import HolidayCalendarPage        from './components/dashboard/snapshots/HolidayCalendarPage.jsx'
import WeekendPolicyPage          from './components/dashboard/snapshots/WeekendPolicyPage.jsx'

// Vendor / Outsource Management
import RecruitmentAgencyPage from './components/dashboard/snapshots/RecruitmentAgencyPage.jsx'
import VendorBGVPage         from './components/dashboard/snapshots/VendorBGVPage.jsx'
import VendorListingPage     from './components/dashboard/snapshots/VendorListingPage.jsx'
import VendorAgreementPage   from './components/dashboard/snapshots/VendorAgreementPage.jsx'
import VendorSLAPage         from './components/dashboard/snapshots/VendorSLAPage.jsx'
import VendorBillingPage     from './components/dashboard/snapshots/VendorBillingPage.jsx'
import VendorInvoicePage     from './components/dashboard/snapshots/VendorInvoicePage.jsx'
import VendorPerformancePage from './components/dashboard/snapshots/VendorPerformancePage.jsx'
import VendorClearancePage   from './components/dashboard/snapshots/VendorClearancePage.jsx'
import VendorReportsPage     from './components/dashboard/snapshots/VendorReportsPage.jsx'

// Vendor / Outsource Employee Management
import VendorEmployeesPage     from './components/dashboard/snapshots/VendorEmployeesPage.jsx'
import VendorAssetsPage        from './components/dashboard/snapshots/VendorAssetsPage.jsx'
import VendorLeaveRequestsPage from './components/dashboard/snapshots/VendorLeaveRequestsPage.jsx'
import VendorCashAdvancePage   from './components/dashboard/snapshots/VendorCashAdvancePage.jsx'
import VendorAttendancePage    from './components/dashboard/snapshots/VendorAttendancePage.jsx'

// Workforce Operations > Payroll & Compensation > Payroll Setup (10 pages)
import PayrollSetupPage               from './components/dashboard/snapshots/PayrollSetupPage.jsx'
import SalaryStructurePage            from './components/dashboard/snapshots/SalaryStructurePage.jsx'
import OvertimePayrollPage            from './components/dashboard/snapshots/OvertimePayrollPage.jsx'
import InsourcePayrollPage            from './components/dashboard/snapshots/InsourcePayrollPage.jsx'
import OutsourcePayrollPage           from './components/dashboard/snapshots/OutsourcePayrollPage.jsx'
import VendorBillingPayrollPage       from './components/dashboard/snapshots/VendorBillingPayrollPage.jsx'
import TaxSetupPage                   from './components/dashboard/snapshots/TaxSetupPage.jsx'
import AllowancePage                  from './components/dashboard/snapshots/AllowancePage.jsx'
import DeductionPage                  from './components/dashboard/snapshots/DeductionPage.jsx'
import ComplianceSetupPage            from './components/dashboard/snapshots/ComplianceSetupPage.jsx'
// Performance & Talent Management > Goal & Performance > Goal Management > OKR (1 page)
import OKRManagementPage              from './components/dashboard/snapshots/OKRManagementPage.jsx'
// Performance & Talent Management > Talent Development > Career Development (4 pages)
import CareerPathingPage              from './components/dashboard/snapshots/CareerPathingPage.jsx'
import EmployeeDevelopmentPlanPage    from './components/dashboard/snapshots/EmployeeDevelopmentPlanPage.jsx'
import TrainingPortfolioPage          from './components/dashboard/snapshots/TrainingPortfolioPage.jsx'
import LeadershipDevelopmentPage      from './components/dashboard/snapshots/LeadershipDevelopmentPage.jsx'
// Performance & Talent Management > Talent Development > Succession Planning (5 pages)
import SuccessorIdentificationPage    from './components/dashboard/snapshots/SuccessorIdentificationPage.jsx'
// Employee Experience & Culture > Employee Engagement (9 pages)
import EngagementDashboardPage        from './components/dashboard/snapshots/EngagementDashboardPage.jsx'
import AnnouncementBoardPage          from './components/dashboard/snapshots/AnnouncementBoardPage.jsx'
import EmployeeEngagementPage         from './components/dashboard/snapshots/EmployeeEngagementPage.jsx'
import EmployeeSocialFeedPage       from './components/dashboard/snapshots/EmployeeSocialFeedPage.jsx'
import EmployeeSurveyPage             from './components/dashboard/snapshots/EmployeeSurveyPage.jsx'
import EmployeeFeedbackPage           from './components/dashboard/snapshots/EmployeeFeedbackPage.jsx'
import SuggestionBoxPage              from './components/dashboard/snapshots/SuggestionBoxPage.jsx'
import EmployeeEventsPage             from './components/dashboard/snapshots/EmployeeEventsPage.jsx'
import AppreciationProgramPage        from './components/dashboard/snapshots/AppreciationProgramPage.jsx'
import InternalCommunicationPage      from './components/dashboard/snapshots/InternalCommunicationPage.jsx'
// Employee Experience & Culture > Employee Relations (5 pages)
import GrievanceManagementPage        from './components/dashboard/snapshots/GrievanceManagementPage.jsx'
import ComplaintManagementPage        from './components/dashboard/snapshots/ComplaintManagementPage.jsx'
import ConflictResolutionPage         from './components/dashboard/snapshots/ConflictResolutionPage.jsx'
import DisciplinaryManagementPage     from './components/dashboard/snapshots/DisciplinaryManagementPage.jsx'
import WarningLetterPage              from './components/dashboard/snapshots/WarningLetterPage.jsx'
// Employee Experience & Culture > Diversity, Equity & Inclusion (5 pages)
import DiversityDashboardPage         from './components/dashboard/snapshots/DiversityDashboardPage.jsx'
import GenderAnalyticsPage            from './components/dashboard/snapshots/GenderAnalyticsPage.jsx'
import InclusionProgramPage           from './components/dashboard/snapshots/InclusionProgramPage.jsx'
import DEITrainingPage                from './components/dashboard/snapshots/DEITrainingPage.jsx'
import AccessibilitySupportPage       from './components/dashboard/snapshots/AccessibilitySupportPage.jsx'
// HR Services & Support > HR Helpdesk (4 pages)
import HRTicketingSystemPage          from './components/dashboard/snapshots/HRTicketingSystemPage.jsx'
import EmployeeQueriesPage            from './components/dashboard/snapshots/EmployeeQueriesPage.jsx'
import HRConsultationPage             from './components/dashboard/snapshots/HRConsultationPage.jsx'
import CaseTrackingPage               from './components/dashboard/snapshots/CaseTrackingPage.jsx'
// HR Services & Support > Employee Self Service (ESS) -- 3 new pages
// (My Profile + Profile Update reuse the EXISTING PersonalInformationPage import below)
import MyDocumentsPage                from './components/dashboard/snapshots/MyDocumentsPage.jsx'
import MyDigitalSignaturePage         from './components/dashboard/snapshots/MyDigitalSignaturePage.jsx'
import MyInternalTrainingCertificatesPage from './components/dashboard/snapshots/MyInternalTrainingCertificatesPage.jsx'
// HR Services & Support > Employee Self Service (ESS) -- 7 new pages
// (Leave Request reuses the EXISTING LeaveRequestPage import elsewhere in this file)
import ThingsToDoPage                 from './components/dashboard/snapshots/ThingsToDoPage.jsx'
import MyAttendancePage               from './components/dashboard/snapshots/MyAttendancePage.jsx'
import AttendanceRequestPage          from './components/dashboard/snapshots/AttendanceRequestPage.jsx'
import MyLeavePage                    from './components/dashboard/snapshots/MyLeavePage.jsx'
import MyResignationPage              from './components/dashboard/snapshots/MyResignationPage.jsx'
import LetterRequestEssPage           from './components/dashboard/snapshots/LetterRequestPage.jsx'
import CashAdvancePage                from './components/dashboard/snapshots/CashAdvancePage.jsx'
// HR Services & Support > Employee Self Service (ESS) -- 6 new + 6 reused pages
// (HR Policies, Organization Chart, SSF/CIT/TAX reuse EXISTING imports elsewhere in this file)
import CodeOfConductPage              from './components/dashboard/snapshots/CodeOfConductPage.jsx'
import SOPForDepartmentPage           from './components/dashboard/snapshots/SOPForDepartmentPage.jsx'
import OrganogramDepartmentPage       from './components/dashboard/snapshots/OrganogramDepartmentPage.jsx'
import MyPayrollPage                  from './components/dashboard/snapshots/MyPayrollPage.jsx'
import MyLoanStatusPage               from './components/dashboard/snapshots/MyLoanStatusPage.jsx'
import PayslipDownloadEssPage         from './components/dashboard/snapshots/PayslipDownloadPage.jsx'
// HR Services & Support > Employee Self Service (ESS) -- 10 new pages
import MyGoalsKPIPage                 from './components/dashboard/snapshots/MyGoalsKPIPage.jsx'
import MyTrainingPage                 from './components/dashboard/snapshots/MyTrainingPage.jsx'
import MyRequestsPage                 from './components/dashboard/snapshots/MyRequestsPage.jsx'
import MyActivityTodayPage            from './components/dashboard/snapshots/MyActivityTodayPage.jsx'
import MyActivityThisWeekPage         from './components/dashboard/snapshots/MyActivityThisWeekPage.jsx'
import MyActivityThisMonthPage        from './components/dashboard/snapshots/MyActivityThisMonthPage.jsx'
import MyActivityThisQuarterPage      from './components/dashboard/snapshots/MyActivityThisQuarterPage.jsx'
import MyActivityThisYearPage         from './components/dashboard/snapshots/MyActivityThisYearPage.jsx'
import MyFeedbackPage                 from './components/dashboard/snapshots/MyFeedbackPage.jsx'
import HelpdeskTicketPage             from './components/dashboard/snapshots/HelpdeskTicketPage.jsx'
// HR Services & Support > Manager Self Service (MSS) -- 11 new pages
import TeamDashboardPage              from './components/dashboard/snapshots/TeamDashboardPage.jsx'
import TeamAttendancePage             from './components/dashboard/snapshots/TeamAttendancePage.jsx'
import ApprovalCenterPage             from './components/dashboard/snapshots/ApprovalCenterPage.jsx'
import PerformanceReviewMSSPage       from './components/dashboard/snapshots/PerformanceReviewMSSPage.jsx'
import TeamActivityTodayPage          from './components/dashboard/snapshots/TeamActivityTodayPage.jsx'
import TeamActivityThisWeekPage       from './components/dashboard/snapshots/TeamActivityThisWeekPage.jsx'
import TeamActivityThisMonthPage      from './components/dashboard/snapshots/TeamActivityThisMonthPage.jsx'
import TeamActivityThisQuarterPage    from './components/dashboard/snapshots/TeamActivityThisQuarterPage.jsx'
import TeamActivityThisYearPage       from './components/dashboard/snapshots/TeamActivityThisYearPage.jsx'
import ForwardCashAdvanceRequestPage  from './components/dashboard/snapshots/ForwardCashAdvanceRequestPage.jsx'
import MinutesOfMeetingPage           from './components/dashboard/snapshots/MinutesOfMeetingPage.jsx'
// Finance, Assets & Administration > HR Budgeting (8 pages)
import AnnualHRBudgetPage             from './components/dashboard/snapshots/AnnualHRBudgetPage.jsx'
import DepartmentBudgetPage           from './components/dashboard/snapshots/DepartmentBudgetPage.jsx'
import RecruitmentBudgetPage          from './components/dashboard/snapshots/RecruitmentBudgetPage.jsx'
import TrainingBudgetPage             from './components/dashboard/snapshots/TrainingBudgetPage.jsx'
import EngagementBudgetPage           from './components/dashboard/snapshots/EngagementBudgetPage.jsx'
import PayrollBudgetPage              from './components/dashboard/snapshots/PayrollBudgetPage.jsx'
import BudgetForecastingPage          from './components/dashboard/snapshots/BudgetForecastingPage.jsx'
import BudgetVarianceAnalysisPage     from './components/dashboard/snapshots/BudgetVarianceAnalysisPage.jsx'
// Finance, Assets & Administration > Asset & Inventory (9 pages)
import AssetManagementPage            from './components/dashboard/snapshots/AssetManagementPage.jsx'
import ITInventoryPage                from './components/dashboard/snapshots/ITInventoryPage.jsx'
import FurnitureInventoryPage         from './components/dashboard/snapshots/FurnitureInventoryPage.jsx'
import StationeryInventoryPage        from './components/dashboard/snapshots/StationeryInventoryPage.jsx'
import AssetAllocationFinPage         from './components/dashboard/snapshots/AssetAllocationFinPage.jsx'
import AssetReturnFinPage             from './components/dashboard/snapshots/AssetReturnFinPage.jsx'
import QRBarcodeTrackingPage          from './components/dashboard/snapshots/QRBarcodeTrackingPage.jsx'
import WarrantyTrackingPage           from './components/dashboard/snapshots/WarrantyTrackingPage.jsx'
import VendorManagementAssetPage      from './components/dashboard/snapshots/VendorManagementAssetPage.jsx'
// Finance, Assets & Administration > Administrative Operations (11 pages, 1 reused)
// (Minutes of Meeting reuses the EXISTING MinutesOfMeetingPage import elsewhere in this file)
import VisitorManagementPage          from './components/dashboard/snapshots/VisitorManagementPage.jsx'
import MeetingRoomBookingPage         from './components/dashboard/snapshots/MeetingRoomBookingPage.jsx'
import TravelManagementPage           from './components/dashboard/snapshots/TravelManagementPage.jsx'
import TransportManagementPage        from './components/dashboard/snapshots/TransportManagementPage.jsx'
import CafeteriaManagementPage        from './components/dashboard/snapshots/CafeteriaManagementPage.jsx'
import AdminHelpdeskPage              from './components/dashboard/snapshots/AdminHelpdeskPage.jsx'
import FacilityManagementPage         from './components/dashboard/snapshots/FacilityManagementPage.jsx'
import GatePassManagementPage         from './components/dashboard/snapshots/GatePassManagementPage.jsx'
import IDCardManagementPage           from './components/dashboard/snapshots/IDCardManagementPage.jsx'
import EventManagementPage            from './components/dashboard/snapshots/EventManagementPage.jsx'
// Finance, Assets & Administration > Finance & Claims (6 pages, 1 reused)
// (Travel Request reuses the EXISTING TravelManagementPage import elsewhere in this file)
import ExpenseClaimsPage              from './components/dashboard/snapshots/ExpenseClaimsPage.jsx'
import ReimbursementPage              from './components/dashboard/snapshots/ReimbursementPage.jsx'
import PettyCashClaimPage             from './components/dashboard/snapshots/PettyCashClaimPage.jsx'
import MobileFuelClaimPage            from './components/dashboard/snapshots/MobileFuelClaimPage.jsx'
import ApprovalWorkflowPage           from './components/dashboard/snapshots/ApprovalWorkflowPage.jsx'
// Compliance & Risk Management > Compliance Management (6 pages -- already
// built in a prior session but never wired into routing until now)
import LaborCompliancePage            from './components/dashboard/snapshots/LaborCompliancePage.jsx'
import StatutoryCompliancePage        from './components/dashboard/snapshots/StatutoryCompliancePage.jsx'
import PolicyCompliancePage           from './components/dashboard/snapshots/PolicyCompliancePage.jsx'
import AuditManagementPage            from './components/dashboard/snapshots/AuditManagementPage.jsx'
import AnnualLabourAuditPage          from './components/dashboard/snapshots/AnnualLabourAuditPage.jsx'
import LicenseManagementPage          from './components/dashboard/snapshots/LicenseManagementPage.jsx'
// Compliance & Risk Management > Risk Management (6 pages)
import KRIDashboardPage               from './components/dashboard/snapshots/KRIDashboardPage.jsx'
import ComplianceRiskPage             from './components/dashboard/snapshots/ComplianceRiskPage.jsx'
import PayrollRiskPage                from './components/dashboard/snapshots/PayrollRiskPage.jsx'
import AttritionRiskPage              from './components/dashboard/snapshots/AttritionRiskPage.jsx'
import SecurityRiskPage               from './components/dashboard/snapshots/SecurityRiskPage.jsx'
import RiskAlertsPage                 from './components/dashboard/snapshots/RiskAlertsPage.jsx'
// Compliance & Risk Management > Legal Management (3 pages)
import LegalCaseTrackingPage          from './components/dashboard/snapshots/LegalCaseTrackingPage.jsx'
import ContractCompliancePage         from './components/dashboard/snapshots/ContractCompliancePage.jsx'
import EthicsGovernancePage            from './components/dashboard/snapshots/EthicsGovernancePage.jsx'
// Reports, Analytics & BI > Standard Reports (9 pages -- 4 reused,
// 1 newly wired from an orphaned import, 4 genuinely new)
import HRAnalyticsStandardPage        from './components/dashboard/snapshots/HRAnalyticsStandardPage.jsx'
import WorkforceSummaryPage           from './components/dashboard/snapshots/WorkforceSummaryPage.jsx'
import DepartmentReportsPage          from './components/dashboard/snapshots/DepartmentReportsPage.jsx'
import TrainingReportsStandardPage    from './components/dashboard/snapshots/TrainingReportsStandardPage.jsx'
// Reports, Analytics & BI > HR Analytics (4 pages -- already built
// in a prior session but never wired into routing until now)
import AttritionAnalysisPage          from './components/dashboard/snapshots/AttritionAnalysisPage.jsx'
import ProductivityAnalysisPage       from './components/dashboard/snapshots/ProductivityAnalysisPage.jsx'
import CostAnalysisPage               from './components/dashboard/snapshots/CostAnalysisPage.jsx'
// Reports, Analytics & BI > HR Analytics (2 more pages)
import VendorWiseHeadcountPage        from './components/dashboard/snapshots/VendorWiseHeadcountPage.jsx'
import OutsourceAttendanceReportPage  from './components/dashboard/snapshots/OutsourceAttendanceReportPage.jsx'
// Reports, Analytics & BI > HR Analytics (2 more pages)
import VendorBillingReportPage         from './components/dashboard/snapshots/VendorBillingReportPage.jsx'
import InsourceOutsourceCostReportPage from './components/dashboard/snapshots/InsourceOutsourceCostReportPage.jsx'
// Reports, Analytics & BI > HR Analytics (final 3 pages -- Annual HR
// Audit reuses the EXISTING AnnualLabourAuditPage import elsewhere in this file)
import ComplianceReportsPage           from './components/dashboard/snapshots/ComplianceReportsPage.jsx'
import WorkforceAnalyticsPage          from './components/dashboard/snapshots/WorkforceAnalyticsPage.jsx'
// Reports, Analytics & BI > Advanced Analytics (5 pages -- Predictive
// Analytics and AI Insights both reuse the EXISTING AIInsightsPage import)
import BIDashboardPage                 from './components/dashboard/snapshots/BIDashboardPage.jsx'
import CustomReportBuilderPage         from './components/dashboard/snapshots/CustomReportBuilderPage.jsx'
import ExportCenterPage                from './components/dashboard/snapshots/ExportCenterPage.jsx'
// System Administration > User & Access (4 pages)
import UserManagementPage              from './components/dashboard/snapshots/UserManagementPage.jsx'
import PermissionManagementPage from './components/dashboard/snapshots/PermissionManagementPage.jsx'
import RolePermissionPage              from './components/dashboard/snapshots/RolePermissionPage.jsx'
import PermissionMatrixPage            from './components/dashboard/snapshots/PermissionMatrixPage.jsx'
import AccessControlPage               from './components/dashboard/snapshots/AccessControlPage.jsx'
import MenuManagementPage              from './components/dashboard/snapshots/MenuManagementPage.jsx'
// System Administration > Workflow & Automation (7 pages -- 4
// already built in a prior session but never wired into routing
// until now, 3 genuinely new)
import WorkflowBuilderPage             from './components/dashboard/snapshots/WorkflowBuilderPage.jsx'
import AutoReminderSetupPage           from './components/dashboard/snapshots/AutoReminderSetupPage.jsx'
import ApprovalMatrixPage              from './components/dashboard/snapshots/ApprovalMatrixPage.jsx'
import MultiLevelApprovalPage          from './components/dashboard/snapshots/MultiLevelApprovalPage.jsx'
import NotificationEnginePage          from './components/dashboard/snapshots/NotificationEnginePage.jsx'
import EscalationRulesPage             from './components/dashboard/snapshots/EscalationRulesPage.jsx'
import AutomationRulesPage             from './components/dashboard/snapshots/AutomationRulesPage.jsx'
// System Administration > Integration & API (3 pages -- Biometric
// Integration reuses the EXISTING BiometricIntegrationPage import,
// which was itself never routed despite being fully built)
import APIThirdPartyIntegrationPage    from './components/dashboard/snapshots/APIThirdPartyIntegrationPage.jsx'
import IntegrationHubPage               from './components/dashboard/snapshots/IntegrationHubPage.jsx'
import EmailSMSIntegrationPage         from './components/dashboard/snapshots/EmailSMSIntegrationPage.jsx'
// System Administration > Integration & API > Mobile App
// Configuration (6 pages -- Mobile Attendance, Geo-Fencing, and
// Field Visit Tracking all reuse EXISTING imports elsewhere in this
// file; the 'mobile-configuration' parent entry was a genuine dead
// end -- a real sidebar leaf with no backing page at all -- now fixed)
import MobileAppConfigOverviewPage     from './components/dashboard/snapshots/MobileAppConfigOverviewPage.jsx'
import DataMigrationPage               from './components/dashboard/snapshots/DataMigrationPage.jsx'
// System Administration > System Settings (8 pages)
import DashboardCustomizationPage     from './components/dashboard/snapshots/DashboardCustomizationPage.jsx'
import CustomFormBuilderPage          from './components/dashboard/snapshots/CustomFormBuilderPage.jsx'
import ReportBuilderPage              from './components/dashboard/snapshots/ReportBuilderPage.jsx'
import SecuritySettingsPage           from './components/dashboard/snapshots/SecuritySettingsPage.jsx'
import AuditLogsPage                  from './components/dashboard/snapshots/AuditLogsPage.jsx'
import DeviceIntegrationPage          from './components/dashboard/snapshots/DeviceIntegrationPage.jsx'
import BackupRestorePage              from './components/dashboard/snapshots/BackupRestorePage.jsx'
import SystemSettingPage              from './components/dashboard/snapshots/SystemSettingPage.jsx'
import GPSTrackingPage                 from './components/dashboard/snapshots/GPSTrackingPage.jsx'
import RouteMonitoringPage             from './components/dashboard/snapshots/RouteMonitoringPage.jsx'
import FieldTaskManagementPage         from './components/dashboard/snapshots/FieldTaskManagementPage.jsx'
// Employee Experience & Culture > Wellness & Support (5 pages)
import WellnessProgramPage            from './components/dashboard/snapshots/WellnessProgramPage.jsx'
import MentalHealthSupportPage        from './components/dashboard/snapshots/MentalHealthSupportPage.jsx'
import InsuranceManagementPage        from './components/dashboard/snapshots/InsuranceManagementPage.jsx'
import EmergencySupportPage           from './components/dashboard/snapshots/EmergencySupportPage.jsx'
import EmployeeAssistanceProgramPage  from './components/dashboard/snapshots/EmployeeAssistanceProgramPage.jsx'
import TalentMappingPage              from './components/dashboard/snapshots/TalentMappingPage.jsx'
import HiPoEmployeesPage              from './components/dashboard/snapshots/HiPoEmployeesPage.jsx'
import ReadinessAssessmentPage        from './components/dashboard/snapshots/ReadinessAssessmentPage.jsx'
import LeadershipPipelinePage         from './components/dashboard/snapshots/LeadershipPipelinePage.jsx'
// Performance & Talent Management > Talent Development > Learning & Development > Participation List + Training Reports (2 pages)
import TrainingParticipationListPage  from './components/dashboard/snapshots/TrainingParticipationListPage.jsx'
import TrainingReportsLDPage          from './components/dashboard/snapshots/TrainingReportsLDPage.jsx'
// Performance & Talent Management > Talent Development > Learning & Development > Feedback + Effectiveness + ROI + Assessment (4 pages)
import TrainingFeedbackPage           from './components/dashboard/snapshots/TrainingFeedbackPage.jsx'
import EffectivenessOfTrainingPage    from './components/dashboard/snapshots/EffectivenessOfTrainingPage.jsx'
import TrainingROIPage                from './components/dashboard/snapshots/TrainingROIPage.jsx'
import AssessmentQuizPage             from './components/dashboard/snapshots/AssessmentQuizPage.jsx'
// Performance & Talent Management > Talent Development > Learning & Development > Generate Certificate + Certification Tracking (2 pages)
import GenerateCertificatePage        from './components/dashboard/snapshots/GenerateCertificatePage.jsx'
import CertificationTrackingPage      from './components/dashboard/snapshots/CertificationTrackingPage.jsx'
// Performance & Talent Management > Talent Development > Learning & Development > Skill Gap Matrix + Analysis + Training Request (3 pages)
import SkillGapMatrixPage             from './components/dashboard/snapshots/SkillGapMatrixPage.jsx'
import SkillGapAnalysisPage           from './components/dashboard/snapshots/SkillGapAnalysisPage.jsx'
import TrainingRequestPage            from './components/dashboard/snapshots/TrainingRequestPage.jsx'
// Performance & Talent Management > Talent Development > Learning & Development > Learning Portal + E-Learning Management (2 pages)
import LearningPortalPage             from './components/dashboard/snapshots/LearningPortalPage.jsx'
import ELearningManagementPage        from './components/dashboard/snapshots/ELearningManagementPage.jsx'
// Performance & Talent Management > Talent Development > Learning & Development > Course Management (1 page, full LMS)
import CourseManagementPage           from './components/dashboard/snapshots/CourseManagementPage.jsx'
// Performance & Talent Management > Talent Development > Learning & Development > Calendars (4 pages)
import AnnualTrainingCalendarPage     from './components/dashboard/snapshots/AnnualTrainingCalendarPage.jsx'
import MonthlyTrainingCalendarPage    from './components/dashboard/snapshots/MonthlyTrainingCalendarPage.jsx'
import WeeklyTrainingCalendarPage     from './components/dashboard/snapshots/WeeklyTrainingCalendarPage.jsx'
import DailyTrainingCalendarPage      from './components/dashboard/snapshots/DailyTrainingCalendarPage.jsx'
// Performance & Talent Management > Talent Development > Learning & Development (2 pages)
import TrainingNeedsIdentificationPage from './components/dashboard/snapshots/TrainingNeedsIdentificationPage.jsx'
import TrainingNeedsAnalysisPage      from './components/dashboard/snapshots/TrainingNeedsAnalysisPage.jsx'
// Performance & Talent Management > Goal & Performance > Performance Analytics (3 pages)
import PerformanceDashboardPage       from './components/dashboard/snapshots/PerformanceDashboardPage.jsx'
import GoalAchievementPage            from './components/dashboard/snapshots/GoalAchievementPage.jsx'
import ProductivityAnalyticsPage      from './components/dashboard/snapshots/ProductivityAnalyticsPage.jsx'
// Performance & Talent Management > Goal & Performance > Performance Analytics > KPI (6 pages)
import KPITransformationBeforePage    from './components/dashboard/snapshots/KPITransformationBeforePage.jsx'
import KPITransformationAfterPage     from './components/dashboard/snapshots/KPITransformationAfterPage.jsx'
import SpeedometerRecruitmentPage     from './components/dashboard/snapshots/SpeedometerRecruitmentPage.jsx'
import SpeedometerCompliancePage      from './components/dashboard/snapshots/SpeedometerCompliancePage.jsx'
import SpeedometerAttendancePage      from './components/dashboard/snapshots/SpeedometerAttendancePage.jsx'
import SpeedometerDocumentationPage   from './components/dashboard/snapshots/SpeedometerDocumentationPage.jsx'
// Performance & Talent Management > Goal & Performance > Rewards & Recognition (6 pages)
import RewardsRecognitionProgramPage  from './components/dashboard/snapshots/RewardsRecognitionProgramPage.jsx'
import RecognitionProgramPage         from './components/dashboard/snapshots/RecognitionProgramPage.jsx'
import PromotionRecommendationPage    from './components/dashboard/snapshots/PromotionRecommendationPage.jsx'
import IncentiveRecommendationPage    from './components/dashboard/snapshots/IncentiveRecommendationPage.jsx'
import TrainingRecommendationPage     from './components/dashboard/snapshots/TrainingRecommendationPage.jsx'
import TerminationRecommendationPage  from './components/dashboard/snapshots/TerminationRecommendationPage.jsx'
// Performance & Talent Management > Goal & Performance > Performance Evaluation (7 pages)
import PerformanceAppraisalPage       from './components/dashboard/snapshots/PerformanceAppraisalPage.jsx'
import ContinuousFeedbackPage         from './components/dashboard/snapshots/ContinuousFeedbackPage.jsx'
import Feedback360Page                from './components/dashboard/snapshots/Feedback360Page.jsx'
import BehaviourEvaluationPage        from './components/dashboard/snapshots/BehaviourEvaluationPage.jsx'
import PerformanceReviewPage          from './components/dashboard/snapshots/PerformanceReviewPage.jsx'
import PerformanceReportsPage         from './components/dashboard/snapshots/PerformanceReportsPage.jsx'
import PIPPage                        from './components/dashboard/snapshots/PIPPage.jsx'
// Performance & Talent Management > Goal & Performance > Goal Management > Goal Tracking (1 page)
import GoalTrackingPage               from './components/dashboard/snapshots/GoalTrackingPage.jsx'
// Performance & Talent Management > Goal & Performance > Goal Management > Goal Assignment (1 page)
import GoalAssignmentPage             from './components/dashboard/snapshots/GoalAssignmentPage.jsx'
// Performance & Talent Management > Goal & Performance > Goal Management > 360 PMS (1 page)
import PMS360Page                     from './components/dashboard/snapshots/PMS360Page.jsx'
// Performance & Talent Management > Goal & Performance > Goal Management > KPI (1 page)
import KPIManagementPage              from './components/dashboard/snapshots/KPIManagementPage.jsx'
// Performance & Talent Management > Goal & Performance > Goal Management (1 page)
import KRAManagementPage              from './components/dashboard/snapshots/KRAManagementPage.jsx'
// Performance & Talent Management > Work & Performance > Workload Analysis (2 pages)
import WorkloadAnalysisEmployeewisePage   from './components/dashboard/snapshots/WorkloadAnalysisEmployeewisePage.jsx'
import WorkloadAnalysisDepartmentwisePage from './components/dashboard/snapshots/WorkloadAnalysisDepartmentwisePage.jsx'
// Workforce Operations > Payroll & Compensation > Payroll Analytics (2 pages)
import PayrollReportsPage             from './components/dashboard/snapshots/PayrollReportsPage.jsx'
import CompensationAnalyticsPage      from './components/dashboard/snapshots/CompensationAnalyticsPage.jsx'
// Workforce Operations > Payroll & Compensation > Information (3 pages)
import SSFInformationPage             from './components/dashboard/snapshots/SSFInformationPage.jsx'
import CITInformationPage             from './components/dashboard/snapshots/CITInformationPage.jsx'
import TaxInformationPage             from './components/dashboard/snapshots/TaxInformationPage.jsx'
// Workforce Operations > Payroll & Compensation > Payroll Finalization (4 pages)
import PayrollApprovalPage            from './components/dashboard/snapshots/PayrollApprovalPage.jsx'
import PayslipGenerationPage          from './components/dashboard/snapshots/PayslipGenerationPage.jsx'
import BankTransferFilePage           from './components/dashboard/snapshots/BankTransferFilePage.jsx'
import FinalSettlementPage            from './components/dashboard/snapshots/FinalSettlementPage.jsx'
// Workforce Operations > Payroll & Compensation > Payroll Processing (8 pages)
import AutomatedPayrollPage           from './components/dashboard/snapshots/AutomatedPayrollPage.jsx'
import OvertimeCalculationPage        from './components/dashboard/snapshots/OvertimeCalculationPage.jsx'
import BonusProcessingPage            from './components/dashboard/snapshots/BonusProcessingPage.jsx'
import IncentiveProcessingPage        from './components/dashboard/snapshots/IncentiveProcessingPage.jsx'
import LoanManagementPage             from './components/dashboard/snapshots/LoanManagementPage.jsx'
import AdvanceSalaryPage              from './components/dashboard/snapshots/AdvanceSalaryPage.jsx'
import TaxCompliancePage              from './components/dashboard/snapshots/TaxCompliancePage.jsx'
import VendorBillingPayrollProcPage   from './components/dashboard/snapshots/VendorBillingPayrollProcPage.jsx'
// Workforce Operations > Leave Management > Leave Reports (3 pages)
import LeaveAttendanceSyncPage        from './components/dashboard/snapshots/LeaveAttendanceSyncPage.jsx'
import LeaveAnalyticsPage             from './components/dashboard/snapshots/LeaveAnalyticsPage.jsx'
import LeaveReportsPage               from './components/dashboard/snapshots/LeaveReportsPage.jsx'
// Workforce Operations > Leave Management > Leave Settlement (2 pages)
import LeaveEncashmentPage            from './components/dashboard/snapshots/LeaveEncashmentPage.jsx'
import CompensatoryLeavePage          from './components/dashboard/snapshots/CompensatoryLeavePage.jsx'
// Workforce Operations > Leave Management > Leave Operations (7 pages)
import LeaveRequestPage               from './components/dashboard/snapshots/LeaveRequestPage.jsx'
import LeaveBalancePage               from './components/dashboard/snapshots/LeaveBalancePage.jsx'
import LeaveApprovalPage              from './components/dashboard/snapshots/LeaveApprovalPage.jsx'
import LeaveCalendarPage              from './components/dashboard/snapshots/LeaveCalendarPage.jsx'
import HolidayManagementPage          from './components/dashboard/snapshots/HolidayManagementPage.jsx'
import HalfDayLeavePage               from './components/dashboard/snapshots/HalfDayLeavePage.jsx'
import LeaveAdjustmentPage            from './components/dashboard/snapshots/LeaveAdjustmentPage.jsx'
// Workforce Operations > Leave Management > Leave Setup (4 pages)
import LeaveSetupPage                 from './components/dashboard/snapshots/LeaveSetupPage.jsx'
import LeavePolicyPage                from './components/dashboard/snapshots/LeavePolicyPage.jsx'
import LeaveTypePage                  from './components/dashboard/snapshots/LeaveTypePage.jsx'
import LeaveBalanceRulePage           from './components/dashboard/snapshots/LeaveBalanceRulePage.jsx'
// Workforce Operations > Attendance Management > Attendance Processing (5 pages)
import AttendanceProcessingPage          from './components/dashboard/snapshots/AttendanceProcessingPage.jsx'
import AttendanceApprovalPage            from './components/dashboard/snapshots/AttendanceApprovalPage.jsx'
import PayrollAttendanceGenerationPage   from './components/dashboard/snapshots/PayrollAttendanceGenerationPage.jsx'
import AttendanceAnalyticsPage           from './components/dashboard/snapshots/AttendanceAnalyticsPage.jsx'
import AttendanceReportsPage             from './components/dashboard/snapshots/AttendanceReportsPage.jsx'
// Workforce Operations > Attendance Management > Overtime & Monitoring (5 pages)
import OvertimeMonitoringPage         from './components/dashboard/snapshots/OvertimeMonitoringPage.jsx'
import OvertimeManagementPage         from './components/dashboard/snapshots/OvertimeManagementPage.jsx'
import LateEarlyTrackingPage          from './components/dashboard/snapshots/LateEarlyTrackingPage.jsx'
import RealTimeMonitoringPage         from './components/dashboard/snapshots/RealTimeMonitoringPage.jsx'
import MobileAttendanceTrackingPage   from './components/dashboard/snapshots/MobileAttendanceTrackingPage.jsx'
// Workforce Operations > Daily Attendance > Field Visit Tracking TA & DA (1 page)
import FieldVisitTrackingPage         from './components/dashboard/snapshots/FieldVisitTrackingPage.jsx'
// Workforce Operations > Daily Attendance > Work From Home Tracking (1 page)
import WFHTrackingPage                from './components/dashboard/snapshots/WFHTrackingPage.jsx'
// Workforce Operations > Daily Attendance > Attendance Regularization (1 page)
import AttendanceRegularizationPage   from './components/dashboard/snapshots/AttendanceRegularizationPage.jsx'
// Workforce Operations > Daily Attendance > Insource/Outsource (2 pages)
import InsourceAttendancePage         from './components/dashboard/snapshots/InsourceAttendancePage.jsx'
import DailyOutsourceAttendancePage   from './components/dashboard/snapshots/DailyOutsourceAttendancePage.jsx'
// Workforce Operations > Daily Attendance > Missed Punch Request (1 page)
import MissedPunchRequestPage       from './components/dashboard/snapshots/MissedPunchRequestPage.jsx'
// Workforce Operations > Daily Attendance (5 pages)
import LiveAttendancePage           from './components/dashboard/snapshots/LiveAttendancePage.jsx'
import EmployeeMovementPage         from './components/dashboard/snapshots/EmployeeMovementPage.jsx'
import BiometricAttendancePage      from './components/dashboard/snapshots/BiometricAttendancePage.jsx'
import GeoAttendancePage            from './components/dashboard/snapshots/GeoAttendancePage.jsx'
import WebCheckInOutPage            from './components/dashboard/snapshots/WebCheckInOutPage.jsx'
// Workforce Operations > Letters (5 pages)
import SSFLettersPage                  from './components/dashboard/snapshots/SSFLettersPage.jsx'
import CITLettersPage                  from './components/dashboard/snapshots/CITLettersPage.jsx'
import LabourDepartmentLettersPage     from './components/dashboard/snapshots/LabourDepartmentLettersPage.jsx'
import TaxDepartmentLettersPage        from './components/dashboard/snapshots/TaxDepartmentLettersPage.jsx'
import OtherGovEntitiesLettersPage     from './components/dashboard/snapshots/OtherGovEntitiesLettersPage.jsx'
import OtherGovernmentEntitiesLettersPage from './components/dashboard/snapshots/OtherGovernmentEntitiesLettersPage.jsx'
// Workforce Operations > Attendance Setup (8 pages)
import AttendancePolicyPage         from './components/dashboard/snapshots/AttendancePolicyPage.jsx'
import ShiftManagementPage          from './components/dashboard/snapshots/ShiftManagementPage.jsx'
import BreakManagementPage          from './components/dashboard/snapshots/BreakManagementPage.jsx'
import RosterManagementPage         from './components/dashboard/snapshots/RosterManagementPage.jsx'
import BiometricIntegrationPage     from './components/dashboard/snapshots/BiometricIntegrationPage.jsx'
import GPSAttendancePage            from './components/dashboard/snapshots/GPSAttendancePage.jsx'
import GeoFencingPage               from './components/dashboard/snapshots/GeoFencingPage.jsx'
import TaskLocationAssignmentPage   from './components/dashboard/snapshots/TaskLocationAssignmentPage.jsx'
import DailyAttendanceLogPage       from './components/dashboard/snapshots/DailyAttendanceLogPage.jsx'
import OvertimeLogPage               from './components/dashboard/snapshots/OvertimeLogPage.jsx'
import NightDutyAllowancePage         from './components/dashboard/snapshots/NightDutyAllowancePage.jsx'
import DutyRosterPage               from './components/dashboard/snapshots/DutyRosterPage.jsx'
import AbsentPresentReportPage       from './components/dashboard/snapshots/AbsentPresentReportPage.jsx'
import MonthlyAttendancePage         from './components/dashboard/snapshots/MonthlyAttendancePage.jsx'
import FinalSalarySheetPage          from './components/dashboard/snapshots/FinalSalarySheetPage.jsx'
import TaxCalculatorPage             from './components/dashboard/snapshots/TaxCalculatorPage.jsx'
// Offboarding > Exit Analytics (2 pages)
import AttritionDashboardPage      from './components/dashboard/snapshots/AttritionDashboardPage.jsx'
import ExitAnalysisPage            from './components/dashboard/snapshots/ExitAnalysisPage.jsx'
// Offboarding > Settlement & Documents (3 pages)
import FullFinalSettlementPage     from './components/dashboard/snapshots/FullFinalSettlementPage.jsx'
import ExperienceLetterPage        from './components/dashboard/snapshots/ExperienceLetterPage.jsx'
import RelievingLetterPage         from './components/dashboard/snapshots/RelievingLetterPage.jsx'
// Offboarding > Exit Management (5 pages)
import ResignationManagementPage   from './components/dashboard/snapshots/ResignationManagementPage.jsx'
import ExitClearancePage           from './components/dashboard/snapshots/ExitClearancePage.jsx'
import AssetReturnPage             from './components/dashboard/snapshots/AssetReturnPage.jsx'
import ExitInterviewPage           from './components/dashboard/snapshots/ExitInterviewPage.jsx'
import KnowledgeTransferPage       from './components/dashboard/snapshots/KnowledgeTransferPage.jsx'
// Employee Records > Employee Movement (6 pages)
import PromotionHistoryPage        from './components/dashboard/snapshots/PromotionHistoryPage.jsx'
import DemotionHistoryPage         from './components/dashboard/snapshots/DemotionHistoryPage.jsx'
import ConfirmationManagementPage  from './components/dashboard/snapshots/ConfirmationManagementPage.jsx'
import TransferHistoryPage         from './components/dashboard/snapshots/TransferHistoryPage.jsx'
import DisciplinaryRecordsPage     from './components/dashboard/snapshots/DisciplinaryRecordsPage.jsx'
import EmployeeTimelinePage        from './components/dashboard/snapshots/EmployeeTimelinePage.jsx'
// Employee Records > Employee Documents (4 pages)
import DocumentManagementPage      from './components/dashboard/snapshots/DocumentManagementPage.jsx'
import ContractManagementPage      from './components/dashboard/snapshots/ContractManagementPage.jsx'
import DigitalEmployeeFilePage     from './components/dashboard/snapshots/DigitalEmployeeFilePage.jsx'
import AIHRLettersPage             from './components/dashboard/snapshots/AIHRLettersPage.jsx'
import AIBusinessIntelligencePage   from './components/dashboard/snapshots/AIBusinessIntelligencePage.jsx'
// Employee Records > Employee Database (7 pages)
import EmployeeDirectoryPage       from './components/dashboard/snapshots/EmployeeDirectoryPage.jsx'
import EmployeeProfilePage         from './components/dashboard/snapshots/EmployeeProfilePage.jsx'
import FamilyDetailsPage           from './components/dashboard/snapshots/FamilyDetailsPage.jsx'
import EmergencyContactPage        from './components/dashboard/snapshots/EmergencyContactPage.jsx'
import EmployeeAssetsPage          from './components/dashboard/snapshots/EmployeeAssetsPage.jsx'
import EmploymentHistoryPage       from './components/dashboard/snapshots/EmploymentHistoryPage.jsx'
// Onboarding > Probation Management (5 pages)
import SevenDayReviewPage           from './components/dashboard/snapshots/SevenDayReviewPage.jsx'
import ThirtyDayReviewPage          from './components/dashboard/snapshots/ThirtyDayReviewPage.jsx'
import SixtyDayReviewPage           from './components/dashboard/snapshots/SixtyDayReviewPage.jsx'
import NinetyDayReviewPage          from './components/dashboard/snapshots/NinetyDayReviewPage.jsx'
import ConfirmationTerminationPage  from './components/dashboard/snapshots/ConfirmationTerminationPage.jsx'
// Onboarding > Employee Joining (9 pages)
import DigitalSignatureCreationPage from './components/dashboard/snapshots/DigitalSignatureCreationPage.jsx'
import OrientationProgramPage       from './components/dashboard/snapshots/OrientationProgramPage.jsx'
import AccountCreationPage          from './components/dashboard/snapshots/AccountCreationPage.jsx'
import NonDisclosureAgreementPage   from './components/dashboard/snapshots/NonDisclosureAgreementPage.jsx'
import AssetAllocationPage          from './components/dashboard/snapshots/AssetAllocationPage.jsx'
import BuddyAssignmentPage          from './components/dashboard/snapshots/BuddyAssignmentPage.jsx'
import WelcomeCommunicationPage     from './components/dashboard/snapshots/WelcomeCommunicationPage.jsx'
import DepartmentIntroductionPage   from './components/dashboard/snapshots/DepartmentIntroductionPage.jsx'
// Onboarding > Employee Joining (Employee Enrollment)
import EmployeeEnrollmentPage   from './components/dashboard/snapshots/EmployeeEnrollmentPage.jsx'
// Onboarding > Preboarding (5 pages)
import OfferAcceptancePage      from './components/dashboard/snapshots/OfferAcceptancePage.jsx'
import BiometricCapturePage     from './components/dashboard/snapshots/BiometricCapturePage.jsx'
import DocumentCollectionPage   from './components/dashboard/snapshots/DocumentCollectionPage.jsx'
import DigitalFormsEsignPage    from './components/dashboard/snapshots/DigitalFormsEsignPage.jsx'
import JoiningChecklistPage     from './components/dashboard/snapshots/JoiningChecklistPage.jsx'
// Employer Branding (8 pages)
import EVPManagementPage         from './components/dashboard/snapshots/EVPManagementPage.jsx'
import CareerPageBuilderPage     from './components/dashboard/snapshots/CareerPageBuilderPage.jsx'
import RecruitmentCampaignPage   from './components/dashboard/snapshots/RecruitmentCampaignPage.jsx'
import CampusHiringPage          from './components/dashboard/snapshots/CampusHiringPage.jsx'
import SocialMediaBrandingPage   from './components/dashboard/snapshots/SocialMediaBrandingPage.jsx'
import EmployeeTestimonialPage   from './components/dashboard/snapshots/EmployeeTestimonialPage.jsx'
import CultureShowcasePage       from './components/dashboard/snapshots/CultureShowcasePage.jsx'
import HiringEventBrandingPage   from './components/dashboard/snapshots/HiringEventBrandingPage.jsx'
// Recruitment Management - Extended (9 more pages)
import ResumeScreeningPage       from './components/dashboard/snapshots/ResumeScreeningPage.jsx'
import InterviewSchedulingPage   from './components/dashboard/snapshots/InterviewSchedulingPage.jsx'
import PanelNotificationPage     from './components/dashboard/snapshots/PanelNotificationPage.jsx'
import InterviewManagementPage   from './components/dashboard/snapshots/InterviewManagementPage.jsx'
import OfferManagementPage       from './components/dashboard/snapshots/OfferManagementPage.jsx'
import TalentPoolPage            from './components/dashboard/snapshots/TalentPoolPage.jsx'
import BackgroundVerificationPage from './components/dashboard/snapshots/BackgroundVerificationPage.jsx'
import HiringApprovalPage        from './components/dashboard/snapshots/HiringApprovalPage.jsx'
import RecruitmentAnalyticsPage  from './components/dashboard/snapshots/RecruitmentAnalyticsPage.jsx'
// Recruitment Management (7 pages)
import RecruitmentDashboardPage from './components/dashboard/snapshots/RecruitmentDashboardPage.jsx'
import ManpowerRequisitionPage  from './components/dashboard/snapshots/ManpowerRequisitionPage.jsx'
import VacancyManagementPage    from './components/dashboard/snapshots/VacancyManagementPage.jsx'
import JobPostingPage           from './components/dashboard/snapshots/JobPostingPage.jsx'
import CareerPortalPage         from './components/dashboard/snapshots/CareerPortalPage.jsx'
import ATSDashboardPage         from './components/dashboard/snapshots/ATSDashboardPage.jsx'
// New World-Class ATS — 12 pages
import ATSCommandCenterPage     from './components/dashboard/snapshots/ATSCommandCenterPage.jsx'
import ATSJobManagerPage        from './components/dashboard/snapshots/ATSJobManagerPage.jsx'
import ATSCandidatePipelinePage from './components/dashboard/snapshots/ATSCandidatePipelinePage.jsx'
import ATSResumeParserPage      from './components/dashboard/snapshots/ATSResumeParserPage.jsx'
import ATSWrittenTestPage from './components/dashboard/snapshots/ATSWrittenTestPage.jsx'
import ATSAssessmentPage        from './components/dashboard/snapshots/ATSAssessmentPage.jsx'
import ATSVideoInterviewPage    from './components/dashboard/snapshots/ATSVideoInterviewPage.jsx'
import ATSInterviewPanelPage    from './components/dashboard/snapshots/ATSInterviewPanelPage.jsx'
import ATSOfferManagementPage   from './components/dashboard/snapshots/ATSOfferManagementPage.jsx'
import ATSTalentPoolPage        from './components/dashboard/snapshots/ATSTalentPoolPage.jsx'
import ATSClientPortalPage      from './components/dashboard/snapshots/ATSClientPortalPage.jsx'
import ATSAnalyticsPage         from './components/dashboard/snapshots/ATSAnalyticsPage.jsx'
import ATSOnboardingPage        from './components/dashboard/snapshots/ATSOnboardingPage.jsx'
import ATSOCRParserPage         from './components/dashboard/snapshots/ATSOCRParserPage.jsx'
import ATSAutoShortlistPage     from './components/dashboard/snapshots/ATSAutoShortlistPage.jsx'
import ATSAPIIntegrationsPage   from './components/dashboard/snapshots/ATSAPIIntegrationsPage.jsx'
import ATSEvaluationSuitePage   from './components/dashboard/snapshots/ATSEvaluationSuitePage.jsx'
import ATSCareerPortalPage      from './components/dashboard/snapshots/ATSCareerPortalPage.jsx'
import ATSJobRequisitionPage    from './components/dashboard/snapshots/ATSJobRequisitionPage.jsx'
import ATSAnalyticsDashPage     from './components/dashboard/snapshots/ATSAnalyticsDashPage.jsx'
import ATSReferralPage          from './components/dashboard/snapshots/ATSReferralPage.jsx'
import ATSCandidateSearchPage   from './components/dashboard/snapshots/ATSCandidateSearchPage.jsx'
import ATSPreJoiningPage        from './components/dashboard/snapshots/ATSPreJoiningPage.jsx'
import ATSCommunicationPage     from './components/dashboard/snapshots/ATSCommunicationPage.jsx'
import ATSMultiPostPage         from './components/dashboard/snapshots/ATSMultiPostPage.jsx'
import ATSExecutiveDashPage     from './components/dashboard/snapshots/ATSExecutiveDashPage.jsx'
import ATSAIToolsPage           from './components/dashboard/snapshots/ATSAIToolsPage.jsx'
import ATSHRChatPage            from './components/dashboard/snapshots/ATSHRChatPage.jsx'
import ATSRBACPage              from './components/dashboard/snapshots/ATSRBACPage.jsx'
import ATSRecruiterDashPage     from './components/dashboard/snapshots/ATSRecruiterDashPage.jsx'
import HRISBulkCVSubmitPage from './components/dashboard/snapshots/HRISBulkCVSubmitPage.jsx'
import CandidateDatabasePage    from './components/dashboard/snapshots/CandidateDatabasePage.jsx'
import CreateJobDescriptionPage from './components/dashboard/snapshots/CreateJobDescriptionPage.jsx'
import JDLibraryPage            from './components/dashboard/snapshots/JDLibraryPage.jsx'
// Workforce Planning (13 pages)
import StaffQuotaDarbadiPage  from './components/dashboard/snapshots/StaffQuotaDarbadiPage.jsx'
import CurrentStatusPage      from './components/dashboard/snapshots/CurrentStatusPage.jsx'
import LocationDeptPage       from './components/dashboard/snapshots/LocationDeptPage.jsx'
import AnnualManpowerPage     from './components/dashboard/snapshots/AnnualManpowerPage.jsx'
import QuarterlyReviewPage    from './components/dashboard/snapshots/QuarterlyReviewPage.jsx'
import MonthlyReviewPage      from './components/dashboard/snapshots/MonthlyReviewPage.jsx'
import HeadcountPlanPage      from './components/dashboard/snapshots/HeadcountPlanPage.jsx'
import VacancyPlanPage        from './components/dashboard/snapshots/VacancyPlanPage.jsx'
import ReplacementPlanPage    from './components/dashboard/snapshots/ReplacementPlanPage.jsx'
import ExpansionPlanPage      from './components/dashboard/snapshots/ExpansionPlanPage.jsx'
import ContractStaffPlanPage  from './components/dashboard/snapshots/ContractStaffPlanPage.jsx'
import ProductivityPlanPage   from './components/dashboard/snapshots/ProductivityPlanPage.jsx'
import ResourceAllocationPage from './components/dashboard/snapshots/ResourceAllocationPage.jsx'
import EmployeeJoiningPage from './components/dashboard/snapshots/EmployeeJoiningPage.jsx'
import WebCheckinPage from './components/dashboard/snapshots/WebCheckinPage.jsx'
import WorkFromHomePage from './components/dashboard/snapshots/WorkFromHomePage.jsx'
import MissedPunchPage from './components/dashboard/snapshots/MissedPunchPage.jsx'
import NoLogInReportPage from './components/dashboard/snapshots/NoLogInReportPage.jsx'
import LateReportingPage from './components/dashboard/snapshots/LateReportingPage.jsx'
import EarlyDeparturePage from './components/dashboard/snapshots/EarlyDeparturePage.jsx'

export const AppContext = createContext(null)
export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <App />')
  return ctx
}

// ── Route Map ─────────────────────────────────────────────────
const ROUTES = {
  'super-admin-dashboard':  SuperAdminDashboard,
  'executive-dashboard':    ExecutiveDashboard,
  'hr-dashboard':           HRManagerDashboard,
  // Role-based persona dashboards
  'finance-dashboard':                 FinanceDashboard,
  'it-admin-dashboard':                    ITAdministratorDashboard,
  'recruitment-officer-dashboard':             RecruitmentOfficerDashboard,
  'procurement-dashboard':                         ProcurementDashboard,
  'admin-workspace-dashboard':                         AdminWorkspaceDashboard,
  'sales-dashboard':                                       SalesDashboard,
  'customer-service-dashboard':                                CustomerServiceDashboard,
  'legal-dashboard':                                               LegalDashboard,
  'operations-dashboard':                                              OperationsDashboard,
  'learning-development-dashboard':                                        LearningDevelopmentDashboard,
  'hr-officer-dashboard':                                                      HROfficerDashboard,
  'marketing-dashboard':                                                           MarketingDashboard,
  'department-dashboard':   DepartmentDashboard,
  'branch-dashboard':       BranchDashboard,
  'employee-dashboard':     EmployeeDashboard,
  'recruitment-dashboard':  RecruitmentDashboard,
  'attendance-snapshot':    AttendanceSnapshot,
  'leave-snapshot':         LeaveSnapshot,
  'payroll-snapshot':       PayrollSnapshot,
  'recruitment-snapshot':   RecruitmentSnapshot,
  'bulk-cv-submit':              HRISBulkCVSubmitPage,
  'performance-snapshot':   PerformanceSnapshot,
  'engagement-snapshot':    EngagementSnapshot,
  'ai-insights':            AIInsightsPage,
  'ai-insights-page':       AIInsightsPage,
  'attrition-snapshot':     AIInsightsPage,
  'notifications':          NotificationsPage,
  // HR Policy Library - mandatory read & sign
  'hr-policies':                HRPoliciesPage,
  'my-policies':                HRPoliciesPage,
  'policy-acknowledgment':      HRPoliciesPage,
  'draft-hr-policy':            DraftHRPolicyPage,
  'publish-hr-policy':          PublishHRPolicyPage,
  'hr-policy-library':          HRPolicyLibraryPage,
  'implement-hr-policy':        ImplementHRPolicyPage,
  'policy-readers':             HRPolicyReadersPage,
  'policy-compliance-report':   HRPoliciesPage,
  'ai-business-intelligence':       AIBusinessIntelligencePage,
  'ai-hr-chatbot':                  ATSHRChatPage,
  // ── AI Assistant Module ──────────────────────────────────────
  'ai-hr-analytics':                    AIHRAnalyticsPage,
  'ai-policy-assistant':                AIPolicyAssistantPage,
  'ai-attendance-insights':             AIAttendanceInsightsPage,
  'ai-attrition-prediction':            AIAttritionPredictionPage,
  'predictive-analytics':               PredictiveAnalyticsPage,
  'ai-performance-insights':            AIPerformanceInsightsPage,
  'smart-notifications':                SmartNotificationsPage,
  'ai-report-generator':                AIReportGeneratorPage,
  // ── Dashboard Widgets (previously missing) ──────────────────
  'headcount-analysis':                 HeadcountAnalysisPage,
  'dept-employee-comparison':           DeptEmployeeComparisonPage,
  'emp-satisfaction':                   EmpSatisfactionPage,
  'worklife-balance':                   WorklifeBalancePage,
  'onboarding-month':                   OnboardingMonthPage,
  'calendar-events':                    CalendarEventsPage,
  'upcoming-events':                    UpcomingEventsPage,
  'birthday-anniversary':               BirthdayAnniversaryPage,
  'tenure-chart':                       TenureChartPage,
  'age-group':                          AgeGroupPage,
  'blood-group':                        BloodGroupPage,
  'contract-expiry':                    ContractExpiryPage,
  'roster-details':                     RosterDetailsPage,
  'quick-actions':                      QuickActionsPage,
  // ── ESS & Operational (previously missing) ──────────────────
  'my-daily-activity':                  MyDailyActivityPage,
  'my-dress-code':                      MyDressCodePage,
  'my-field-visit':                     MyFieldVisitPage,
  'personal-information':               PersonalInformationPage,
  'team-daily-activity':                TeamDailyActivityPage,
  'team-performance-mss':               TeamPerformanceMSSPage,
  'overtime-request':                   OvertimeRequestPage,
  'overtime-acceptance':                OvertimeAcceptancePage,
  'overtime-forward':                   OvertimeForwardPage,
  'perf-talent':                        PerfTalentPage,
  'emp-experience':                     EmpExperiencePage,
  'emp-lifecycle':                      EmpLifecyclePage,
  'org-mgmt':                           OrgMgmtPage,
  'workforce-ops':                      WorkforceOpsPage,
  'finance-assets':                     FinanceAssetsPage,
  'field-visit-expenses':               FieldVisitExpensesPage,
  'cash-advance-bills':                 CashAdvanceBillsPage,
  'geo-fencing':                        GeoFencingPage,
  'contract-management':                ContractManagementPage,
  'employment-contract':                EmploymentContractPage,
  'exit-asset-return':                  ExitAssetReturnPage,
  'recruitment-analytics':              RecruitmentAnalyticsPage,
  'stored-daily-tasks':                 StoredTasksPage,
  'stored-weekly-tasks':                StoredTasksPage,
  'stored-monthly-tasks':               StoredTasksPage,
  'stored-annual-tasks':                StoredTasksPage,
  // Org Management - Department & Team Setup (6 separate pages)
  'business-unit-setup':        BusinessUnitPage,     // Page 1
  'department-setup':           DeptSetupPage,        // Page 2
  'section-unit':               SectionUnitPage,      // Page 3
  'team-setup':                 TeamSetupPage,        // Page 4
  'cost-center':                CostCenterPage,       // Page 5
  'work-location':              WorkLocationPage,     // Page 6
  'dept-team-setup':            DeptSetupPage,
  // Structure & Hierarchy
  'employment-category':        EmploymentCategoryPage,
  // Structure & Hierarchy - Designation, Grade, Reporting, Position
  'designation-setup':          DesignationSetupPage,   // Page 1
  'grade-level':                GradeLevelPage,         // Page 2
  'reporting-hierarchy':        ReportingHierarchyPage, // Page 3
  'position-management':        PositionManagementPage,
  'org-chart':                  OrgChartPage,
  'organization-chart':         OrgChartPage,
  'process-flow':               ProcessFlowPage,
  'process-flow-chart':         ProcessFlowPage,
  // Employment Type - 6 pages
  'employment-type':            EmploymentTypePage,
  'outsource-sla-contract':     OutsourceSLAPage,
  'outsource-employees':        OutsourceEmployeesPage,
  'outsource-billing':          OutsourceBillingPage,
  'outsource-attendance':       OutsourceAttendancePage,
  'outsource-performance':      OutsourcePerformancePage,
  // Workforce Configuration
  'vendor-outsource-mapping':   VendorOutsourceMappingPage,
  // Workforce Operations > Payroll & Compensation > Payroll Setup
  'payroll-setup':                  PayrollSetupPage,
  'salary-structure':               SalaryStructurePage,
  'overtime-payroll':               OvertimePayrollPage,
  'insource-payroll':               InsourcePayrollPage,
  'outsource-payroll':              OutsourcePayrollPage,
  'vendor-billing-payroll':         VendorBillingPayrollPage,
  'tax-setup':                      TaxSetupPage,
  'allowance':                      AllowancePage,
  'deduction':                      DeductionPage,
  'allowance-setup':                AllowancePage,
  'deduction-setup':                DeductionPage,
  'compliance-setup':               ComplianceSetupPage,
  // Performance & Talent Management > Goal & Performance > Goal Management > OKR
  'okr-management':                 OKRManagementPage,
  // Performance & Talent Management > Talent Development > Career Development
  'career-pathing':                   CareerPathingPage,
  'employee-dev-plan':                  EmployeeDevelopmentPlanPage,
  'training-portfolio':                   TrainingPortfolioPage,
  'leadership-development':                 LeadershipDevelopmentPage,
  // Performance & Talent Management > Talent Development > Succession Planning
  'successor-identification':         SuccessorIdentificationPage,
  // Employee Experience & Culture > Employee Engagement
  'engagement-dashboard':              EngagementDashboardPage,
  'announcement-board':                  AnnouncementBoardPage,
  'employee-engagement':                   EmployeeEngagementPage,
  'employee-social-feed':                      EmployeeSocialFeedPage,
  'employee-survey':                         EmployeeSurveyPage,
  'employee-feedback':                          EmployeeFeedbackPage,
  'suggestion-box':                                SuggestionBoxPage,
  'employee-events':                                  EmployeeEventsPage,
  'appreciation-program':                                AppreciationProgramPage,
  'internal-communication':                                  InternalCommunicationPage,
  // Employee Experience & Culture > Employee Relations
  'grievance-management':              GrievanceManagementPage,
  'complaint-management':                ComplaintManagementPage,
  'conflict-resolution':                   ConflictResolutionPage,
  'disciplinary-management':                 DisciplinaryManagementPage,
  'warning-letter':                            WarningLetterPage,
  // Employee Experience & Culture > Diversity, Equity & Inclusion
  'diversity-dashboard':               DiversityDashboardPage,
  'gender-analytics':                    GenderAnalyticsPage,
  'inclusion-program':                     InclusionProgramPage,
  'dei-training':                            DEITrainingPage,
  'accessibility-support':                     AccessibilitySupportPage,
  // HR Services & Support > HR Helpdesk
  'hr-ticketing':                      HRTicketingSystemPage,
  'employee-queries':                    EmployeeQueriesPage,
  'hr-consultation':                       HRConsultationPage,
  'case-tracking':                           CaseTrackingPage,
  // HR Services & Support > Employee Self Service (ESS)
  'my-profile':                        PersonalInformationPage,  // reuses the existing ESS-ready page
  'profile-update':                      PersonalInformationPage,  // same page; tabbed view covers both
  'my-documents':                          MyDocumentsPage,
  'my-digital-signature':                    MyDigitalSignaturePage,
  'my-training-certificates':                   MyInternalTrainingCertificatesPage,
  // HR Services & Support > Employee Self Service (ESS) -- 8 pages
  'things-to-do':                      ThingsToDoPage,
  'my-attendance-ess':                   MyAttendancePage,
  'attendance-request':                    AttendanceRequestPage,
  'my-leave-ess':                            MyLeavePage,
  'leave-request-ess':                          LeaveRequestPage,  // reuses the existing wizard-style page
  'my-resignation':                                MyResignationPage,
  'letter-request':                                  LetterRequestEssPage,
  'cash-advance':                                        CashAdvancePage,
  // HR Services & Support > Employee Self Service (ESS) -- 12 pages (6 new, 6 reused)
  'code-of-conduct':                   CodeOfConductPage,
  'sop-department':                      SOPForDepartmentPage,
  'org-chart-ess':                          OrgChartPage,  // reuses the existing company-wide org chart
  'organogram-department':                     OrganogramDepartmentPage,
  'process-flow-department':                      ProcessFlowPage,  // reuses the existing persona-aware flow chart
  'my-payroll-ess':                                   MyPayrollPage,
  'my-loan-status':                                      MyLoanStatusPage,
  'payslip-download':                                       PayslipDownloadEssPage,
  'my-ssf':                                                    SSFInformationPage,  // reuses the existing SSF ledger page
  'my-cit':                                                       CITInformationPage,  // reuses the existing CIT ledger page
  'my-tax':                                                          TaxInformationPage,  // reuses the existing tax breakdown page
  // HR Services & Support > Employee Self Service (ESS) -- 10 pages
  'my-goals-kpi':                      MyGoalsKPIPage,
  'my-training-ess':                     MyTrainingPage,
  'my-requests':                            MyRequestsPage,
  'my-activity-today':                        MyActivityTodayPage,
  'my-activity-week':                            MyActivityThisWeekPage,
  'my-activity-month':                               MyActivityThisMonthPage,
  'my-activity-quarter':                                 MyActivityThisQuarterPage,
  'my-activity-year':                                        MyActivityThisYearPage,
  'my-feedback-ess':                                              MyFeedbackPage,
  'helpdesk-ticket':                                                  HelpdeskTicketPage,
  // HR Services & Support > Manager Self Service (MSS) -- 11 pages
  'team-dashboard-mss':                TeamDashboardPage,
  'team-attendance':                      TeamAttendancePage,
  'approval-center':                         ApprovalCenterPage,
  'performance-review-mss':                     PerformanceReviewMSSPage,
  'team-activity-today':                            TeamActivityTodayPage,
  'team-activity-week':                                  TeamActivityThisWeekPage,
  'team-activity-month':                                      TeamActivityThisMonthPage,
  'team-activity-quarter':                                          TeamActivityThisQuarterPage,
  'team-activity-year':                                                  TeamActivityThisYearPage,
  'forward-cash-advance':                                                      ForwardCashAdvanceRequestPage,
  'minutes-of-meeting':                                                              MinutesOfMeetingPage,
  'minutes-of-meeting-ess':                                                                MinutesOfMeetingPage,
  // Finance, Assets & Administration > HR Budgeting
  'annual-hr-budget':                  AnnualHRBudgetPage,
  'department-budget':                   DepartmentBudgetPage,
  'recruitment-budget':                     RecruitmentBudgetPage,
  'training-budget':                           TrainingBudgetPage,
  'engagement-budget':                             EngagementBudgetPage,
  'payroll-budget':                                    PayrollBudgetPage,
  'budget-forecasting':                                     BudgetForecastingPage,
  'budget-variance-analysis':                                    BudgetVarianceAnalysisPage,
  // Finance, Assets & Administration > Asset & Inventory
  'asset-management':                  AssetManagementPage,
  'it-inventory':                         ITInventoryPage,
  'furniture-inventory':                     FurnitureInventoryPage,
  'stationery-inventory':                        StationeryInventoryPage,
  'asset-allocation-fin':                            AssetAllocationFinPage,
  'asset-return':                                        AssetReturnFinPage,
  'qr-barcode-tracking':                                     QRBarcodeTrackingPage,
  'warranty-tracking':                                            WarrantyTrackingPage,
  'vendor-management-asset':                                           VendorManagementAssetPage,
  // Finance, Assets & Administration > Administrative Operations
  'visitor-management':                VisitorManagementPage,
  'meeting-room-booking':                 MeetingRoomBookingPage,
  'minutes-of-meeting-admin':                 MinutesOfMeetingPage,  // reuses the existing AI voice+text page
  'travel-management':                           TravelManagementPage,
  'transport-management':                            TransportManagementPage,
  'cafeteria-management':                                CafeteriaManagementPage,
  'helpdesk-admin':                                          AdminHelpdeskPage,
  'facility-management':                                         FacilityManagementPage,
  'gate-pass':                                                       GatePassManagementPage,
  'id-card-management':                                                  IDCardManagementPage,
  'event-management':                                                        EventManagementPage,
  // Finance, Assets & Administration > Finance & Claims
  'expense-claims':                    ExpenseClaimsPage,
  'travel-request':                       TravelManagementPage,  // reuses the existing travel wizard
  'reimbursement':                           ReimbursementPage,
  'petty-cash':                                  PettyCashClaimPage,
  'mobile-fuel-claim':                                MobileFuelClaimPage,
  'approval-workflow-fin':                                ApprovalWorkflowPage,
  // Compliance & Risk Management > Compliance Management
  'labor-compliance':                  LaborCompliancePage,
  'statutory-compliance':                 StatutoryCompliancePage,
  'policy-compliance':                       PolicyCompliancePage,
  'hr-audit-management':                         AuditManagementPage,
  'annual-labour-audit':                             AnnualLabourAuditPage,
  'license-management':                                  LicenseManagementPage,
  // Compliance & Risk Management > Risk Management
  'kri-dashboard':                     KRIDashboardPage,
  'compliance-risk':                      ComplianceRiskPage,
  'payroll-risk':                            PayrollRiskPage,
  'attrition-risk':                              AttritionRiskPage,
  'security-risk':                                   SecurityRiskPage,
  'risk-alerts':                                          RiskAlertsPage,
  // Compliance & Risk Management > Legal Management
  'legal-case-tracking':               LegalCaseTrackingPage,
  'contract-compliance':                  ContractCompliancePage,
  'ethics-governance':                       EthicsGovernancePage,
  // Reports, Analytics & BI > Standard Reports
  'hr-analytics-page':                 HRAnalyticsStandardPage,
  'workforce-summary':                    WorkforceSummaryPage,
  'department-reports':                      DepartmentReportsPage,
  'attendance-reports-page':                     AttendanceReportsPage,  // reuses the existing report builder
  'training-reports-page':                           TrainingReportsStandardPage,
  'payroll-reports-std':                                 PayrollReportsPage,  // reuses the existing 8-tab hub
  'recruitment-reports':                                     RecruitmentAnalyticsPage,  // newly wired, was orphaned
  'performance-reports-page':                                    PerformanceReportsPage,  // reuses the existing analytics page
  'leave-reports-page':                                              LeaveReportsPage,  // reuses the existing report builder
  // Reports, Analytics & BI > HR Analytics
  'headcount-analysis-page':           HeadcountAnalysisPage,
  'attrition-analysis':                   AttritionAnalysisPage,
  'productivity-analysis':                   ProductivityAnalysisPage,
  'cost-analysis':                               CostAnalysisPage,
  'vendor-headcount':                 VendorWiseHeadcountPage,
  'outsource-attendance-rpt':            OutsourceAttendanceReportPage,
  'vendor-billing-report':            VendorBillingReportPage,
  'insource-outsource-cost':             InsourceOutsourceCostReportPage,
  'compliance-reports':               ComplianceReportsPage,
  'workforce-analytics':                 WorkforceAnalyticsPage,
  'annual-hr-audit':                         AnnualLabourAuditPage,  // reuses the existing Section 80 audit page
  // Reports, Analytics & BI > Advanced Analytics
  'predictive-analytics-page':         AIInsightsPage,  // reuses the existing ML/forecasting hub (attrition, salary, seasonal, AI models tabs)
  // 'ai-insights-page' already routes to AIInsightsPage (see line 553) -- no change needed
  'bi-dashboard':                         BIDashboardPage,
  'custom-report-builder':                   CustomReportBuilderPage,
  'export-center':                               ExportCenterPage,
  // System Administration > User & Access
  'user-management':                  UserManagementPage,
  'permission-management':              PermissionManagementPage,
  'role-permission':                     RolePermissionPage,
  'permission-matrix':                       PermissionMatrixPage,
  'access-control':                         AccessControlPage,
  'menu-management':                            MenuManagementPage,
  // System Administration > Workflow & Automation
  'workflow-builder':                  WorkflowBuilderPage,
  'auto-reminder-setup':                  AutoReminderSetupPage,
  'approval-matrix':                         ApprovalMatrixPage,
  'multi-level-approval':                        MultiLevelApprovalPage,
  'notification-engine':                             NotificationEnginePage,
  'escalation-rules':                                    EscalationRulesPage,
  'automation-rules':                                        AutomationRulesPage,
  // System Administration > Integration & API
  'api-integration':                  APIThirdPartyIntegrationPage,
  'integration-hub':                      IntegrationHubPage,
  'email-sms-integration':                EmailSMSIntegrationPage,
  // System Administration > Integration & API > Mobile App Configuration
  'mobile-configuration':              MobileAppConfigOverviewPage,
  'mobile-attendance':                    MobileAttendanceTrackingPage,  // reuses the existing ESS check-in screen
  'gps-tracking-config':                      GPSTrackingPage,
  'geo-fencing-mobile-config':                     GeoFencingPage,  // reuses the existing virtual-perimeter page, now finally routed
  'field-visit-tracking-cfg':                          FieldVisitTrackingPage,  // reuses the existing TA/DA workflow
  'route-monitoring':                                      RouteMonitoringPage,
  'field-task-management':                                     FieldTaskManagementPage,
  'data-migration':                    DataMigrationPage,
  // System Administration > System Settings
  'dashboard-customization':           DashboardCustomizationPage,
  'custom-form-builder':                  CustomFormBuilderPage,
  'report-builder':                           ReportBuilderPage,
  'security-settings':                            SecuritySettingsPage,
  'audit-logs':                                       AuditLogsPage,
  'device-integration':                                   DeviceIntegrationPage,
  'backup-restore':                                           BackupRestorePage,
  'system-setting':                                               SystemSettingPage,
  'biometric-setup':                          BiometricIntegrationPage,  // shared with Attendance Setup's own key below
  'biometric-integration':                        BiometricIntegrationPage,  // was imported but never routed until now
  // Employee Experience & Culture > Wellness & Support
  'wellness-program':                  WellnessProgramPage,
  'mental-health-support':               MentalHealthSupportPage,
  'insurance-management':                  InsuranceManagementPage,
  'emergency-support':                       EmergencySupportPage,
  'employee-assistance':                       EmployeeAssistanceProgramPage,
  'talent-mapping':                     TalentMappingPage,
  'hipo-employees':                       HiPoEmployeesPage,
  'readiness-assessment':                  ReadinessAssessmentPage,
  'leadership-pipeline':                     LeadershipPipelinePage,
  // Performance & Talent Management > Talent Development > Learning & Development > Participation List + Training Reports
  'training-participation':           TrainingParticipationListPage,
  'training-reports':                  TrainingReportsLDPage,
  // Performance & Talent Management > Talent Development > Learning & Development > Feedback + Effectiveness + ROI + Assessment
  'training-feedback':                TrainingFeedbackPage,
  'training-effectiveness':            EffectivenessOfTrainingPage,
  'training-roi':                       TrainingROIPage,
  'assessment-quiz':                     AssessmentQuizPage,
  // Performance & Talent Management > Talent Development > Learning & Development > Generate Certificate + Certification Tracking
  'generate-certificate':              GenerateCertificatePage,
  'certification-tracking':             CertificationTrackingPage,
  // Performance & Talent Management > Talent Development > Learning & Development > Skill Gap Matrix + Analysis + Training Request
  'skill-gap-matrix':                 SkillGapMatrixPage,
  'skill-gap-analysis':                SkillGapAnalysisPage,
  'training-request':                   TrainingRequestPage,
  // Performance & Talent Management > Talent Development > Learning & Development > Learning Portal + E-Learning Management
  'learning-portal':                  LearningPortalPage,
  'elearning-management':              ELearningManagementPage,
  // Performance & Talent Management > Talent Development > Learning & Development > Course Management
  'course-management':                CourseManagementPage,
  // Performance & Talent Management > Talent Development > Learning & Development > Calendars
  'annual-training-calendar':         AnnualTrainingCalendarPage,
  'monthly-training-calendar':         MonthlyTrainingCalendarPage,
  'weekly-training-calendar':           WeeklyTrainingCalendarPage,
  'daily-training-calendar':             DailyTrainingCalendarPage,
  // Performance & Talent Management > Talent Development > Learning & Development
  'training-needs-identification':    TrainingNeedsIdentificationPage,
  'training-needs-analysis':            TrainingNeedsAnalysisPage,
  // Performance & Talent Management > Goal & Performance > Performance Analytics
  'performance-dashboard':            PerformanceDashboardPage,
  'goal-achievement':                  GoalAchievementPage,
  'productivity-analytics':             ProductivityAnalyticsPage,
  // Performance & Talent Management > Goal & Performance > Performance Analytics > KPI
  'kpi-transformation-before':        KPITransformationBeforePage,
  'kpi-transformation-after':          KPITransformationAfterPage,
  'speedometer-recruitment':            SpeedometerRecruitmentPage,
  'speedometer-compliance':              SpeedometerCompliancePage,
  'speedometer-attendance':               SpeedometerAttendancePage,
  'speedometer-documentation':              SpeedometerDocumentationPage,
  // Performance & Talent Management > Goal & Performance > Rewards & Recognition
  'reward-program':                  RewardsRecognitionProgramPage,
  'recognition-program':              RecognitionProgramPage,
  'promotion-recommendation':          PromotionRecommendationPage,
  'incentive-recommendation':           IncentiveRecommendationPage,
  'training-recommendation':            TrainingRecommendationPage,
  'termination-recommendation':          TerminationRecommendationPage,
  // Performance & Talent Management > Goal & Performance > Performance Evaluation
  'performance-appraisal':           PerformanceAppraisalPage,
  'continuous-feedback':              ContinuousFeedbackPage,
  '360-feedback':                     Feedback360Page,
  'behaviour-evaluation':             BehaviourEvaluationPage,
  'performance-review':               PerformanceReviewPage,
  'performance-reports':              PerformanceReportsPage,
  'pip-management':                   PIPPage,
  // Performance & Talent Management > Goal & Performance > Goal Management > Goal Tracking
  'goal-tracking':                   GoalTrackingPage,
  // Performance & Talent Management > Goal & Performance > Goal Management > Goal Assignment
  'goal-assignment':                 GoalAssignmentPage,
  // Performance & Talent Management > Goal & Performance > Goal Management > 360 PMS
  '360-pms':                         PMS360Page,
  // Performance & Talent Management > Goal & Performance > Goal Management > KPI
  'kpi-management':                 KPIManagementPage,
  // Performance & Talent Management > Goal & Performance > Goal Management
  'kra-management':                 KRAManagementPage,
  // Performance & Talent Management > Work & Performance > Workload Analysis
  'workload-employeewise':          WorkloadAnalysisEmployeewisePage,
  'workload-departmentwise':        WorkloadAnalysisDepartmentwisePage,
  // Workforce Operations > Payroll & Compensation > Payroll Analytics
  'payroll-reports':                PayrollReportsPage,
  'compensation-analytics':         CompensationAnalyticsPage,
  // Workforce Operations > Payroll & Compensation > Information
  'ssf-information':                SSFInformationPage,
  'cit-information':                CITInformationPage,
  'tax-information':                TaxInformationPage,
  // Workforce Operations > Payroll & Compensation > Payroll Finalization
  'payroll-approval':               PayrollApprovalPage,
  'payslip-generation':             PayslipGenerationPage,
  'bank-transfer-file':             BankTransferFilePage,
  'final-settlement':               FinalSettlementPage,
  // Workforce Operations > Payroll & Compensation > Payroll Processing
  'automated-payroll':              AutomatedPayrollPage,
  'overtime-calculation':           OvertimeCalculationPage,
  'bonus-processing':               BonusProcessingPage,
  'incentive-processing':           IncentiveProcessingPage,
  'loan-management':                LoanManagementPage,
  'advance-salary':                 AdvanceSalaryPage,
  'tax-compliance':                 TaxCompliancePage,
  'vendor-billing-payroll-proc':    VendorBillingPayrollProcPage,
  // Workforce Operations > Leave Management > Leave Reports
  'leave-attendance-sync':          LeaveAttendanceSyncPage,
  'leave-analytics':                LeaveAnalyticsPage,
  'leave-reports':                  LeaveReportsPage,
  // Workforce Operations > Leave Management > Leave Settlement
  'leave-encashment':               LeaveEncashmentPage,
  'compensatory-leave':             CompensatoryLeavePage,
  // Workforce Operations > Leave Management > Leave Operations
  'leave-request':                  LeaveRequestPage,
  'leave-balance':                  LeaveBalancePage,
  'leave-approval':                 LeaveApprovalPage,
  'leave-calendar':                 LeaveCalendarPage,
  'holiday-management':             HolidayManagementPage,
  'half-day-leave':                 HalfDayLeavePage,
  'leave-adjustment':               LeaveAdjustmentPage,
  // Workforce Operations > Leave Management > Leave Setup
  'leave-setup':                    LeaveSetupPage,
  'leave-policy':                   LeavePolicyPage,
  'leave-type':                     LeaveTypePage,
  'leave-balance-rule':             LeaveBalanceRulePage,
  // Workforce Operations > Attendance Management > Attendance Processing
  'attendance-processing':          AttendanceProcessingPage,
  'attendance-approval':            AttendanceApprovalPage,
  'payroll-attendance-gen':         PayrollAttendanceGenerationPage,
  'attendance-analytics':           AttendanceAnalyticsPage,
  'attendance-reports':             AttendanceReportsPage,
  // Workforce Operations > Attendance Management > Overtime & Monitoring
  'overtime-monitoring-dashboard':  OvertimeMonitoringPage,
  'overtime-management':            OvertimeManagementPage,
  'web-checkin':                   WebCheckinPage,
  'work-from-home':                WorkFromHomePage,
    // REMOVED DUPLICATE: 'missed-punch':                  MissedPunchPage,
  'no-log-in-report':              NoLogInReportPage,
  'late-reporting':                LateReportingPage,
  'early-departure':               EarlyDeparturePage,
  'late-early-tracking':            LateEarlyTrackingPage,
  'real-time-monitoring':           RealTimeMonitoringPage,
  'mobile-attendance-tracking':     MobileAttendanceTrackingPage,
  // Workforce Operations > Daily Attendance > Field Visit Tracking TA & DA
  'field-visit-tracking':           FieldVisitTrackingPage,
  // Workforce Operations > Daily Attendance > Work From Home Tracking
  'wfh-tracking':                   WFHTrackingPage,
  // Workforce Operations > Daily Attendance > Attendance Regularization
  'attendance-regularization':     AttendanceRegularizationPage,
  // Workforce Operations > Daily Attendance > Insource/Outsource
  'insource-attendance':           InsourceAttendancePage,
  'daily-outsource-attendance':    DailyOutsourceAttendancePage,
  // Workforce Operations > Daily Attendance > Missed Punch Request
  'missed-punch':                MissedPunchRequestPage,
  // Workforce Operations > Payroll & Compensation > Payroll Setup (10 pages)
// Performance & Talent Management > Goal & Performance > Goal Management > OKR (1 page)
// Performance & Talent Management > Talent Development > Career Development (4 pages)
// Performance & Talent Management > Talent Development > Learning & Development > Participation List + Training Reports (2 pages)
// Performance & Talent Management > Talent Development > Learning & Development > Feedback + Effectiveness + ROI + Assessment (4 pages)
// Performance & Talent Management > Talent Development > Learning & Development > Generate Certificate + Certification Tracking (2 pages)
// Performance & Talent Management > Talent Development > Learning & Development > Skill Gap Matrix + Analysis + Training Request (3 pages)
// Performance & Talent Management > Talent Development > Learning & Development > Learning Portal + E-Learning Management (2 pages)
// Performance & Talent Management > Talent Development > Learning & Development > Course Management (1 page, full LMS)
// Performance & Talent Management > Talent Development > Learning & Development > Calendars (4 pages)
// Performance & Talent Management > Talent Development > Learning & Development (2 pages)
// Performance & Talent Management > Goal & Performance > Performance Analytics (3 pages)
// Performance & Talent Management > Goal & Performance > Performance Analytics > KPI (6 pages)
// Performance & Talent Management > Goal & Performance > Rewards & Recognition (6 pages)
// Performance & Talent Management > Goal & Performance > Performance Evaluation (7 pages)
// Performance & Talent Management > Goal & Performance > Goal Management > Goal Tracking (1 page)
// Performance & Talent Management > Goal & Performance > Goal Management > Goal Assignment (1 page)
// Performance & Talent Management > Goal & Performance > Goal Management > 360 PMS (1 page)
// Performance & Talent Management > Goal & Performance > Goal Management > KPI (1 page)
// Performance & Talent Management > Goal & Performance > Goal Management (1 page)
// Performance & Talent Management > Work & Performance > Workload Analysis (2 pages)
// Workforce Operations > Payroll & Compensation > Payroll Analytics (2 pages)
// Workforce Operations > Payroll & Compensation > Information (3 pages)
// Workforce Operations > Payroll & Compensation > Payroll Finalization (4 pages)
// Workforce Operations > Payroll & Compensation > Payroll Processing (8 pages)
// Workforce Operations > Leave Management > Leave Reports (3 pages)
// Workforce Operations > Leave Management > Leave Settlement (2 pages)
// Workforce Operations > Leave Management > Leave Operations (7 pages)
// Workforce Operations > Leave Management > Leave Setup (4 pages)
// Workforce Operations > Attendance Management > Attendance Processing (5 pages)
// Workforce Operations > Attendance Management > Overtime & Monitoring (5 pages)
// Workforce Operations > Daily Attendance > Field Visit Tracking TA & DA (1 page)
// Workforce Operations > Daily Attendance > Work From Home Tracking (1 page)
// Workforce Operations > Daily Attendance > Attendance Regularization (1 page)
// Workforce Operations > Daily Attendance > Insource/Outsource (2 pages)
// Workforce Operations > Daily Attendance > Missed Punch Request (1 page)
// Workforce Operations > Daily Attendance (5 pages)
// Workforce Operations > Letters (5 pages)
// Workforce Operations > Attendance Setup (8 pages)
// Offboarding > Exit Analytics (2 pages)
// Offboarding > Settlement & Documents (3 pages)
// Offboarding > Exit Management (5 pages)
// Employee Records > Employee Movement (6 pages)
// Employee Records > Employee Documents (4 pages)
// Employee Records > Employee Database (7 pages)
// Onboarding > Probation Management (5 pages)
// Onboarding > Employee Joining (9 pages)
// Onboarding > Employee Joining (Employee Enrollment)
// Onboarding > Preboarding (5 pages)
// Employer Branding (8 pages)
// Recruitment Management - Extended (9 more pages)
// Recruitment Management (7 pages)
// Workforce Planning (13 pages)
// Vendor / Outsource Management
  'vendor-profile':             RecruitmentAgencyPage,
  // Workforce Planning
  'quota-darbadi':              StaffQuotaDarbadiPage,
  'current-status-ex-filled':   CurrentStatusPage,
  'location-dept-wide':         LocationDeptPage,
  'annual-manpower-plan':       AnnualManpowerPage,
  'quarterly-workforce-review': QuarterlyReviewPage,
  'monthly-workforce-review':   MonthlyReviewPage,
  'headcount-planning':         HeadcountPlanPage,
  'vacancy-planning':           VacancyPlanPage,
  'replacement-planning':       ReplacementPlanPage,
  'expansion-planning':         ExpansionPlanPage,
  'contract-staff-planning':    ContractStaffPlanPage,
  'outsource-staff-planning':     ContractStaffPlanPage,
  'productivity-planning':      ProductivityPlanPage,
  'resource-allocation':        ResourceAllocationPage,
  'vendor-billing':             VendorBillingPage,
  'vendor-invoice':             VendorInvoicePage,
  'vendor-performance':         VendorPerformancePage,
  'vendor-clearance':           VendorClearancePage,
  'vendor-reports':             VendorReportsPage,
  'vendor-employees':           VendorEmployeesPage,
  'vendor-inventory-assets':    VendorAssetsPage,
  'vendor-leave-requests':      VendorLeaveRequestsPage,
  'vendor-cash-advance':        VendorCashAdvancePage,
  'vendor-attendance':          VendorAttendancePage,
  'vendor-bg-verification':     VendorBGVPage,
  'vendor-listing':             VendorListingPage,
  'vendor-agreement':           VendorAgreementPage,
  'sla-contract':               VendorSLAPage,
  'shift-setup':                ShiftSetupPage,
  'holiday-calendar':           HolidayCalendarPage,
  'weekend-policy':             WeekendPolicyPage,
  // Organization Setup
  'company-profile':            CompanyProfilePage,   // Page 1 - Company list
  'company-setup':              CompanySetupPage,     // Page 2 - Setup wizard
  'group-company':              GroupCompanyPage,     // Page 3 - Group companies
  'branch-location-setup':      BranchLocationPage,   // Page 4 - Branches
  // Employee Lifecycle Management -- 89 pages confirmed built and
  // imported in a prior session but never wired into routing
  'account-creation':              AccountCreationPage,
  'ai-hr-letters':                 AIHRLettersPage,
  'ai-resume-screening':           ResumeScreeningPage,
  'approve-resignation':           ResignationManagementPage,
  'asset-allocation-onboard':      AssetAllocationPage,
  'ats-dashboard':                 ATSDashboardPage,
  // New World-Class ATS routes
  'ats-command-center':            ATSCommandCenterPage,
  'ats-job-manager':               ATSJobManagerPage,
  'ats-candidate-pipeline':        ATSCandidatePipelinePage,
  'ats-resume-parser':             ATSResumeParserPage,
  'ats-written-test':           ATSWrittenTestPage,
  'ats-assessment':                ATSAssessmentPage,
  'ats-video-interview':           ATSVideoInterviewPage,
  'ats-interview-panel':           ATSInterviewPanelPage,
  'ats-offer-management':          ATSOfferManagementPage,
  'ats-talent-pool':               ATSTalentPoolPage,
  'ats-client-portal':             ATSClientPortalPage,
  'ats-analytics':                 ATSAnalyticsPage,
  'ats-onboarding':                ATSOnboardingPage,
  'ats-ocr-parser':              ATSOCRParserPage,
  'ats-auto-shortlist':          ATSAutoShortlistPage,
  'ats-api-integrations':        ATSAPIIntegrationsPage,
  'ats-evaluation-suite':        ATSEvaluationSuitePage,
  'ats-career-portal':           ATSCareerPortalPage,
  'ats-job-requisition':         ATSJobRequisitionPage,
  'ats-analytics-dash':          ATSAnalyticsDashPage,
  'ats-referral':                ATSReferralPage,
  'ats-candidate-search':        ATSCandidateSearchPage,
  'ats-pre-joining':             ATSPreJoiningPage,
  'ats-communication':           ATSCommunicationPage,
  'ats-multipost':               ATSMultiPostPage,
  'ats-executive':               ATSExecutiveDashPage,
  'ats-ai-tools':                ATSAIToolsPage,
  'ats-hr-chat':                 ATSHRChatPage,
  'ats-rbac':                   ATSRBACPage,
  'ats-recruiter-dash':         ATSRecruiterDashPage,
  'create-job-description':        CreateJobDescriptionPage,
  'jd-library':                    JDLibraryPage,
  'attendance-policy':             AttendancePolicyPage,
  'attrition-dashboard':           AttritionDashboardPage,
  'background-verification':       BackgroundVerificationPage,
  'biometric-attendance':          BiometricAttendancePage,
  'biometric-capture':             BiometricCapturePage,
  'break-management':              BreakManagementPage,
  'buddy-assignment':              BuddyAssignmentPage,
  'campus-hiring':                 CampusHiringPage,
  'candidate-database':            CandidateDatabasePage,
  'career-page':                   CareerPageBuilderPage,
  'career-portal':                 CareerPortalPage,
  'cit-letters':                   CITLettersPage,
  'confirmation-management':       ConfirmationManagementPage,
  'contract-management-emp':       ContractManagementPage,
  'culture-showcase':              CultureShowcasePage,
  'demotion-history':              DemotionHistoryPage,
  'department-introduction':       DepartmentIntroductionPage,
  'digital-employee-file':         DigitalEmployeeFilePage,
  'digital-forms-esign':           DigitalFormsEsignPage,
  'digital-signature':             DigitalSignatureCreationPage,
  'disciplinary-records':          DisciplinaryRecordsPage,
  'document-collection':           DocumentCollectionPage,
  'document-management':           DocumentManagementPage,
  'emergency-contact':             EmergencyContactPage,
  'employee-assets':               EmployeeAssetsPage,
  'employee-directory':            EmployeeDirectoryPage,
  'employee-enrollment':           EmployeeEnrollmentPage,
  'employee-joining':              EmployeeProfilePage,
  'employee-movement':             EmployeeMovementPage,
  'employee-profile':              EmployeeProfilePage,
  'employee-testimonial':          EmployeeTestimonialPage,
  'employee-timeline':             EmployeeTimelinePage,
  'employer-branding-evp':         EVPManagementPage,
  'employment-history':            EmploymentHistoryPage,
  'evp-management':                EVPManagementPage,
  'exit-analysis':                 ExitAnalysisPage,
  'exit-clearance':                ExitClearancePage,
  'exit-interview':                ExitInterviewPage,
  'experience-letter':             ExperienceLetterPage,
  'family-details':                FamilyDetailsPage,
  'full-final-settlement':         FullFinalSettlementPage,
  'geo-attendance':                GeoAttendancePage,
  'gps-attendance':                GPSAttendancePage,
  'hiring-approval-workflow':      HiringApprovalPage,
  'hiring-event-branding':         HiringEventBrandingPage,
  'interview-management':          InterviewManagementPage,
  'interview-scheduling':          InterviewSchedulingPage,
  'job-posting':                   JobPostingPage,
  'joining-checklist':             JoiningChecklistPage,
  'knowledge-transfer':            KnowledgeTransferPage,
  'labour-department-letters':     LabourDepartmentLettersPage,
  'live-attendance':               LiveAttendancePage,
  'manpower-requisition':          ManpowerRequisitionPage,
  'non-disclosure':                NonDisclosureAgreementPage,
  'offer-acceptance':              OfferAcceptancePage,
  'offer-management':              OfferManagementPage,
  'orientation-program':           OrientationProgramPage,
  'other-government-entities-letters': OtherGovEntitiesLettersPage,
  'panel-notification':            PanelNotificationPage,
  'probation-30-days':             ThirtyDayReviewPage,
  'probation-60-days':             SixtyDayReviewPage,
  'probation-7-days':              SevenDayReviewPage,
  'probation-90-days':             NinetyDayReviewPage,
  'probation-confirmation':        ConfirmationTerminationPage,
  'promotion-history':             PromotionHistoryPage,
  'recruitment-campaign':          RecruitmentCampaignPage,
  'recruitment-mgmt-dash':         RecruitmentDashboardPage,
  'relieving-letter':              RelievingLetterPage,
  'resignation-management':        ResignationManagementPage,
  'resume-screening':              ResumeScreeningPage,
  'roster-management':             RosterManagementPage,
  'shift-management':              ShiftManagementPage,
  'social-media-branding':         SocialMediaBrandingPage,
  'ssf-letters':                   SSFLettersPage,
  'talent-pool':                   TalentPoolPage,
  'task-location-assignment':      TaskLocationAssignmentPage,
  'daily-attendance-log':          DailyAttendanceLogPage,
  'overtime-log':                  OvertimeLogPage,
    // REMOVED DUPLICATE: 'night-duty-allowance':          NightDutyAllowancePage,
  'duty-roster':                   DutyRosterPage,
  'absent-present-report':         AbsentPresentReportPage,
  'leave-balance-report':          LeaveBalancePage,
  'monthly-attendance':            MonthlyAttendancePage,
  'final-salary-sheet':            FinalSalarySheetPage,
  'tax-calculator':                TaxCalculatorPage,
  'night-duty-allowance':           NightDutyAllowancePage,
  'tax-department-letters':        TaxDepartmentLettersPage,
  'transfer-history':              TransferHistoryPage,
  'vacancy-management':            VacancyManagementPage,
  'web-check-in':                  WebCheckInOutPage,
  'welcome-communication':         WelcomeCommunicationPage,
}

// ── Placeholder for unbuilt modules ──────────────────────────
function GenericPage({ sub }) {
  const label = (sub || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <div style={{ textAlign: 'center', padding: '70px 24px' }}>
      <div style={{ fontSize: 60, marginBottom: 16 }}>🚧</div>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginBottom: 10 }}>{label}</h2>
      <p style={{ color: '#64748b', fontSize: 13, maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.6 }}>
        This module is part of the full production build. Connect your Node.js + PostgreSQL backend to activate.
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {['RBAC Enabled', 'Multi-tenant Ready', 'Nepal Labour Act 2017', 'AI Powered'].map(t => (
          <span key={t} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 600 }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Content Router ────────────────────────────────────────────
// Keyed fade+lift transition on every navigation - gives the SPA a
// premium, "settling into place" feel instead of an abrupt content swap.
function ContentRouter({ sub }) {
  const Comp = ROUTES[sub]
  return (
    <div key={sub} className="page-transition">
      {Comp ? <Comp /> : <GenericPage sub={sub} />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
export default function App({ initialPage, onLogout }) {
  // Auto-detect persona from JWT role on mount
  const [persona, setPersonaState] = useState(() => {
    const ctx = getTenantContext()
    if (ctx.isAuthenticated && ctx.role) return ROLE_TO_PERSONA[ctx.role] || 'employee'
    return 'super-admin'
  })
  const [sub, setSub] = useState(() => {
    const ctx = getTenantContext()
    if (ctx.isAuthenticated && ctx.role) return ROLE_TO_DEFAULT_PAGE[ctx.role] || 'employee-dashboard'
    return 'super-admin-dashboard'
  })
  const [sidebarOpen,   setSidebarOpen]   = useState(true)
  const [language,      setLanguage]      = useState('en')
  const [currency,      setCurrencyCode]  = useState('NPR')
  const [darkMode,      setDarkMode]      = useState(false)
  const [expanded,      setExpanded]      = useState({ dashboard: true, 'sys-admin': true })
  const [showLangModal, setShowLangModal] = useState(false)
  const [showNotif,     setShowNotif]     = useState(false)
  const [showAI,        setShowAI]        = useState(false)

  const currentPersona = PERSONAS.find(p => p.id === persona) || PERSONAS[0]
  const cc             = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]
  const dir            = getDir(language)
  const t = useCallback((key) => translate(language, key), [language])

  const switchPersona = useCallback((id) => {
    const p = PERSONAS.find(x => x.id === id)
    setPersonaState(id)
    setSub(p?.defaultSub || `${id}-dashboard`)
    setExpanded(prev => ({
      ...prev,
      dashboard: true,
      // System Administration (Permission Matrix, User Management,
      // etc.) only auto-opens for the two personas who actually
      // configure it -- everyone else can still reach it via search,
      // but it doesn't clutter their sidebar by default.
      ...(id === 'super-admin' || id === 'it-admin' ? { 'sys-admin': true } : {}),
    }))
  }, [])

  const navTo          = useCallback((id) => setSub(id), [])

  // Profile & Settings panel state
  const [showProfile,  setShowProfile]  = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Logout: clears ALL auth data so next open shows login page
  const handleLogout = useCallback(() => {
    ;['elogix_token','elogix_refresh_token','elogix_user','elogix_company',
      'elogix_permissions','elogix_tenant','elogix_admin_token',
      'elogix_admin_user','elogix_admin_key','elogix_remember',
    ].forEach(k => localStorage.removeItem(k))
    sessionStorage.clear()
    onLogout?.()
  }, [onLogout])
  const toggleExpanded = useCallback((id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] })), [])

  // Apply initialPage from router when provided
  useState(() => {
    if (initialPage) {
      setSub(initialPage)
      const ctx = getTenantContext()
      if (ctx.role) setPersonaState(ROLE_TO_PERSONA[ctx.role] || 'super-admin')
    }
  })

  const ctx = {
    persona, switchPersona, currentPersona,
    sub, navTo,
    sidebarOpen, setSidebarOpen,
    expanded, toggleExpanded,
    language, setLanguage, t, dir,
    currency, setCurrency: setCurrencyCode, cc,
    darkMode, setDarkMode,
    showLangModal, setShowLangModal,
    showNotif, setShowNotif,
    showAI, setShowAI,
  }

  return (
    <AppContext.Provider value={ctx}>
      <PermissionsProvider>
      <div dir={dir} style={{
        display: 'flex', height: '100vh', overflow: 'hidden',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        background: darkMode ? '#0a0f1e' : '#f0f4f8',
      }}>
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} />

        {/* Right side */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0 }}>

          {/* Topbar */}
          <Topbar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onLangClick={() => setShowLangModal(true)}
            onNotifClick={() => setShowNotif(v => !v)}
            onAIClick={() => setShowAI(true)}
            onLogout={handleLogout}
            onProfile={() => setShowProfile(true)}
            onSettings={() => setShowSettings(true)}
          />

          {/* Breadcrumb */}
          <Breadcrumb />

          {/* Confidentiality Bar */}
          <div style={{
            background: '#fffbeb', borderBottom: '1px solid #fcd34d',
            padding: '5px 20px', display: 'flex', alignItems: 'center',
            gap: 8, flexShrink: 0,
          }}>
            <span>🔒</span>
            <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>
              Confidential - Encrypted . RBAC . Nepal Privacy Act 2018
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#b45309' }}>
              {currentPersona?.icon} {t(currentPersona?.labelKey) || currentPersona?.label}
            </span>
          </div>

          {/* Page content */}
          <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            <ContentRouter sub={sub} />

          {/* ── My Profile Modal ── */}
          {showProfile && (() => {
            const user = (() => { try { return JSON.parse(sessionStorage.getItem('elogix_user') || localStorage.getItem('elogix_user')||'{}') } catch{ return {} } })()
            const co   = (() => { try { return JSON.parse(sessionStorage.getItem('elogix_company') || localStorage.getItem('elogix_company')||'{}') } catch{ return {} } })()
            return (
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:9999,
                display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
                onClick={()=>setShowProfile(false)}>
                <div style={{background:'#fff',borderRadius:18,width:460,maxWidth:'96vw',
                  boxShadow:'0 24px 80px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
                  <div style={{background:'linear-gradient(135deg,#0c4a6e,#0369a1,#38bdf8)',
                    padding:'22px 24px',borderRadius:'18px 18px 0 0',color:'#fff',textAlign:'center'}}>
                    <div style={{width:64,height:64,borderRadius:'50%',
                      background:'rgba(255,255,255,.15)',border:'3px solid rgba(255,255,255,.3)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:28,margin:'0 auto 12px',fontWeight:900}}>
                      {(user.full_name||'U').charAt(0).toUpperCase()}
                    </div>
                    <div style={{fontSize:18,fontWeight:900}}>{user.full_name||'User'}</div>
                    <div style={{fontSize:11,opacity:.75,marginTop:3}}>
                      {(user.role||'').replace(/_/g,' ').replace(/\w/g,c=>c.toUpperCase())} · {co.name||''}
                    </div>
                  </div>
                  <div style={{padding:'20px 24px'}}>
                    {[
                      ['📧','Email',       user.email||'—'],
                      ['🆔','Employee ID', user.emp_id||'—'],
                      ['🏢','Company',     co.name||'—'],
                      ['📋','Plan',        (co.plan||'').toUpperCase()||'—'],
                      ['🔐','Role',        (user.role||'').replace(/_/g,' ')],
                      ['🌐','Portal',      co.slug ? `${co.slug}.elogix.com.np` : '—'],
                    ].map(([ic,lb,v])=>(
                      <div key={lb} style={{display:'flex',alignItems:'center',gap:12,
                        padding:'10px 0',borderBottom:'1px solid #f1f5f9',fontSize:13}}>
                        <span style={{fontSize:18,width:26,textAlign:'center'}}>{ic}</span>
                        <span style={{color:'#64748b',minWidth:100,fontSize:12}}>{lb}</span>
                        <span style={{fontWeight:600,color:'#0f172a'}}>{v}</span>
                      </div>
                    ))}
                    <button onClick={()=>setShowProfile(false)}
                      style={{width:'100%',marginTop:16,padding:'11px',borderRadius:10,
                        border:'none',background:'linear-gradient(135deg,#0c4a6e,#0369a1)',
                        color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ── Settings Modal ── */}
          {showSettings && (
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:9999,
              display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
              onClick={()=>setShowSettings(false)}>
              <div style={{background:'#fff',borderRadius:18,width:460,maxWidth:'96vw',
                boxShadow:'0 24px 80px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
                <div style={{background:'linear-gradient(135deg,#312e81,#4338ca)',
                  padding:'18px 24px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
                  <div style={{fontSize:17,fontWeight:900}}>⚙️ Settings</div>
                  <div style={{fontSize:11,opacity:.7,marginTop:2}}>eLogix HRMS preferences</div>
                </div>
                <div style={{padding:'20px 24px'}}>
                  {[
                    {label:'Email Notifications', desc:'Receive alerts via email',         key:'notif_email',  def:true  },
                    {label:'SMS Notifications',   desc:'Receive alerts via SMS/Viber',     key:'notif_sms',    def:false },
                    {label:'Dark Mode',           desc:'Use dark theme across dashboards', key:'dark_mode',    def:false },
                    {label:'Auto-logout on close',desc:'Clear session when browser closes',key:'auto_logout',  def:true  },
                    {label:'Compact Sidebar',     desc:'Smaller sidebar for more space',   key:'compact',      def:false },
                  ].map(s=>{
                    const stored = localStorage.getItem(`elogix_setting_${s.key}`)
                    const checked = stored !== null ? stored==='true' : s.def
                    return (
                      <div key={s.key} style={{display:'flex',justifyContent:'space-between',
                        alignItems:'center',padding:'12px 0',borderBottom:'1px solid #f1f5f9'}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:'#0f172a'}}>{s.label}</div>
                          <div style={{fontSize:11,color:'#64748b',marginTop:1}}>{s.desc}</div>
                        </div>
                        <input type="checkbox" defaultChecked={checked}
                          onChange={e=>localStorage.setItem(`elogix_setting_${s.key}`,e.target.checked)}
                          style={{width:18,height:18,cursor:'pointer',accentColor:'#0369a1'}}/>
                      </div>
                    )
                  })}
                  <div style={{display:'flex',gap:10,marginTop:16}}>
                    <button onClick={()=>setShowSettings(false)}
                      style={{flex:1,padding:'11px',borderRadius:10,border:'none',
                        background:'linear-gradient(135deg,#312e81,#4338ca)',
                        color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                      Save Settings
                    </button>
                    <button onClick={()=>setShowSettings(false)}
                      style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',
                        background:'#fff',color:'#64748b',fontSize:13,cursor:'pointer'}}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          </main>
        </div>

        {/* Modals */}
        {showLangModal && <LanguageCurrencyModal onClose={() => setShowLangModal(false)} />}
        {showNotif     && <NotificationPanel     onClose={() => setShowNotif(false)} />}
        {showAI        && <AIAssistantModal       onClose={() => setShowAI(false)} />}

        {/* HR Co-Pilot — persistent right-side panel, always mounted */}
        <HRCopilot />
      </div>
      </PermissionsProvider>
    </AppContext.Provider>
  )
}
