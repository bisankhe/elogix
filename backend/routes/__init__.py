"""
FILE: backend/routes/__init__.py
All Flask blueprints — registered in app.py via ALL_BLUEPRINTS list.
"""
from .auth_routes                  import auth_bp
from .company_setup_routes         import company_bp
from .org_setup_routes             import org_setup_bp
from .org_structure_routes         import org_bp as org_structure_bp
from .org_routes                   import org_bp
from .business_unit_routes         import bu_bp
from .dept_team_routes             import dept_bp
from .structure_routes             import struct_bp
from .employment_category_routes   import ec_bp
from .vendor_routes                import vendor_bp
from .sla_invoice_routes           import sla_bp
from .workforce_routes             import wf_bp
from .hr_policy_routes             import policy_bp
from .excel_voice_routes           import tools_bp
from .workforce_config_routes       import wfc_bp
from .vendor_employee_routes         import ve_bp
from .vendor_finance_routes          import vf_bp
from .workforce_planning_routes      import wfp_bp
from .recruitment_routes             import recruit_bp
from .employer_branding_routes        import branding_bp
from .preboarding_routes              import preboard_bp
from .employee_enrollment_routes      import enrollment_bp
from .employee_joining_routes         import joining_bp
from .probation_management_routes     import probation_bp
from .employee_database_routes        import empdb_bp
from .employee_documents_routes       import empdocs_bp
from .employee_movement_routes        import movement_bp
from .exit_management_routes          import exit_bp
from .settlement_documents_routes     import settlement_bp
from .exit_analytics_routes           import exit_analytics_bp
from .attendance_setup_routes         import attsetup_bp
from .government_letters_routes       import govt_letters_bp
from .daily_attendance_routes         import daily_att_bp
from .missed_punch_request_routes     import missed_punch_bp
from .insource_outsource_attendance_routes import io_att_bp
from .attendance_regularization_routes import regularization_bp
from .wfh_tracking_routes import wfh_bp
from .field_visit_tracking_routes import field_visit_bp
from .overtime_monitoring_routes import overtime_bp
from .attendance_processing_routes import att_processing_bp
from .leave_setup_routes import leave_setup_bp
from .leave_operations_routes import leave_ops_bp
from .leave_settlement_routes import leave_settlement_bp
from .leave_reports_routes import leave_reports_bp
from .payroll_setup_routes import payroll_setup_bp
from .payroll_processing_routes import payroll_proc_bp
from .payroll_finalization_routes import payroll_final_bp
from .payroll_information_routes import payroll_info_bp
from .payroll_analytics_routes import payroll_analytics_bp
from .workload_analysis_routes import workload_bp
from .kra_management_routes import kra_bp
from .kpi_management_routes import kpi_bp
from .okr_management_routes import okr_bp
from .pms_360_routes import pms360_bp
from .goal_assignment_routes import goal_assign_bp
from .goal_tracking_routes import goal_track_bp
from .performance_evaluation_routes import perf_eval_bp
from .rewards_recognition_routes import rewards_bp
from .performance_analytics_kpi_routes import perf_kpi_bp
from .performance_analytics_dashboard_routes import perf_dash_bp
from .training_needs_routes import training_needs_bp
from .training_calendar_routes import training_cal_bp
from .course_management_lms_routes import lms_bp
from .learning_portal_elearning_routes import learning_portal_bp
from .skill_gap_training_request_routes import skill_gap_bp
from .certificate_generation_tracking_routes import cert_bp
from .training_feedback_roi_assessment_routes import training_measure_bp
from .training_participation_reports_routes import participation_bp
from .career_development_routes import career_dev_bp
from .succession_planning_routes import succession_bp
from .employee_engagement_routes import engagement_bp
from .employee_social_feed_routes import feed_bp
from .employee_relations_routes import relations_bp
from .wellness_support_routes import wellness_bp
from .dei_routes import dei_bp
from .hr_helpdesk_routes import helpdesk_bp
from .ess_self_service_routes import ess_bp
from .ess_attendance_leave_resignation_routes import ess2_bp
from .ess_policies_payroll_routes import ess3_bp
from .ess_activity_goals_helpdesk_routes import ess4_bp
from .mss_team_management_routes import mss_bp
from .hr_budgeting_routes import budgeting_bp
from .asset_inventory_routes import asset_bp
from .administrative_operations_routes import adminops_bp
from .finance_claims_routes import finance_bp
from .compliance_management_routes import compliance_bp
from .risk_management_routes import risk_bp
from .legal_management_routes import legal_bp
from .standard_reports_routes import reports_bp
from .hr_analytics_routes import hr_analytics_bp
from .vendor_hr_analytics_routes import vendor_hr_bp
from .vendor_billing_analytics_routes import vendor_billing_bp
from .hr_analytics_governance_routes import hr_gov_bp
from .advanced_analytics_routes import adv_analytics_bp
from .user_access_routes import user_access_bp
from .permission_matrix_routes import perm_matrix_bp
from .workflow_automation_routes import workflow_bp
from .integration_api_routes import integration_bp
from .integration_hub_routes import hub_bp
from .mobile_app_config_routes import mobile_bp
from .data_migration_routes import data_migration_bp
from .system_settings_routes import sys_settings_bp
from .ai_proxy_routes import ai_proxy_bp
from .ai_business_intelligence_routes import ai_bi_bp

ALL_BLUEPRINTS = [
    auth_bp,          # /api/v1/auth
    company_bp,       # /api/v1/company
    org_setup_bp,     # /api/v1/org-setup
    org_structure_bp, # /api/v1/org (legacy structure)
    org_bp,           # /api/v1/org (group/company/dept)
    bu_bp,            # /api/v1/business-units
    dept_bp,          # /api/v1/dept
    struct_bp,        # /api/v1/structure
    ec_bp,            # /api/v1/employment-categories
    vendor_bp,        # /api/v1/vendors
    sla_bp,           # /api/v1/sla
    wf_bp,            # /api/v1/workforce
    policy_bp,        # /api/v1/hr-policies
    tools_bp,         # /api/v1/tools
    wfc_bp,           # /api/v1/wfconfig
    ve_bp,            # /api/v1/ve
    vf_bp,            # /api/v1/vf
    wfp_bp,           # /api/v1/wfp
    recruit_bp,       # /api/v1/recruit
    branding_bp,      # /api/v1/branding
    preboard_bp,      # /api/v1/preboard
    enrollment_bp,    # /api/v1/enrollment
    joining_bp,       # /api/v1/joining
    probation_bp,     # /api/v1/probation
    empdb_bp,         # /api/v1/employee-db
    empdocs_bp,       # /api/v1/employee-docs
    movement_bp,      # /api/v1/movement
    exit_bp,          # /api/v1/exit
    settlement_bp,    # /api/v1/settlement
    exit_analytics_bp, # /api/v1/exit-analytics
    attsetup_bp,      # /api/v1/attendance-setup
    govt_letters_bp,  # /api/v1/govt-letters
    daily_att_bp,     # /api/v1/daily-attendance
    missed_punch_bp,  # /api/v1/missed-punch
    io_att_bp,        # /api/v1/insource-outsource-attendance
    regularization_bp, # /api/v1/attendance-regularization
    wfh_bp,           # /api/v1/wfh-tracking
    field_visit_bp,   # /api/v1/field-visit
    overtime_bp,      # /api/v1/overtime-monitoring
    att_processing_bp, # /api/v1/attendance-processing
    leave_setup_bp,   # /api/v1/leave-setup
    leave_ops_bp,     # /api/v1/leave-operations
    leave_settlement_bp, # /api/v1/leave-settlement
    leave_reports_bp,    # /api/v1/leave-reports
    payroll_setup_bp,    # /api/v1/payroll-setup
    payroll_proc_bp,     # /api/v1/payroll-processing
    payroll_final_bp,    # /api/v1/payroll-finalization
    payroll_info_bp,     # /api/v1/payroll-information
    payroll_analytics_bp, # /api/v1/payroll-analytics
    workload_bp,         # /api/v1/workload-analysis
    kra_bp,              # /api/v1/kra-management
    kpi_bp,              # /api/v1/kpi-management
    okr_bp,              # /api/v1/okr-management
    pms360_bp,           # /api/v1/pms-360
    goal_assign_bp,      # /api/v1/goal-assignment
    goal_track_bp,       # /api/v1/goal-tracking
    perf_eval_bp,        # /api/v1/performance-evaluation
    rewards_bp,          # /api/v1/rewards-recognition
    perf_kpi_bp,         # /api/v1/performance-analytics-kpi
    perf_dash_bp,        # /api/v1/performance-analytics-dashboard
    training_needs_bp,   # /api/v1/training-needs
    training_cal_bp,     # /api/v1/training-calendar
    lms_bp,              # /api/v1/lms
    learning_portal_bp,  # /api/v1/learning-portal
    skill_gap_bp,        # /api/v1/skill-gap
    cert_bp,             # /api/v1/certificates
    training_measure_bp, # /api/v1/training-measurement
    participation_bp,    # /api/v1/training-participation
    career_dev_bp,       # /api/v1/career-development
    succession_bp,       # /api/v1/succession-planning
    engagement_bp,       # /api/v1/engagement
    feed_bp,              # /api/v1/social-feed
    relations_bp,        # /api/v1/employee-relations
    wellness_bp,         # /api/v1/wellness-support
    dei_bp,              # /api/v1/dei
    helpdesk_bp,         # /api/v1/hr-helpdesk
    ess_bp,              # /api/v1/ess
    ess2_bp,             # /api/v1/ess2
    ess3_bp,             # /api/v1/ess3
    ess4_bp,             # /api/v1/ess4
    mss_bp,              # /api/v1/mss
    budgeting_bp,        # /api/v1/hr-budgeting
    asset_bp,            # /api/v1/asset-inventory
    adminops_bp,         # /api/v1/admin-ops
    finance_bp,          # /api/v1/finance-claims
    compliance_bp,       # /api/v1/compliance
    risk_bp,             # /api/v1/risk-management
    legal_bp,            # /api/v1/legal
    reports_bp,          # /api/v1/standard-reports
    hr_analytics_bp,     # /api/v1/hr-analytics
    vendor_hr_bp,        # /api/v1/vendor-hr-analytics
    vendor_billing_bp,   # /api/v1/vendor-billing-analytics
    hr_gov_bp,           # /api/v1/hr-analytics-governance
    adv_analytics_bp,    # /api/v1/advanced-analytics
    user_access_bp,      # /api/v1/user-access
    perm_matrix_bp,      # /api/v1/permissions
    workflow_bp,         # /api/v1/workflow-automation
    integration_bp,      # /api/v1/integration
    hub_bp,               # /api/v1/integration-hub
    mobile_bp,           # /api/v1/mobile-app-config
    data_migration_bp,   # /api/v1/data-migration
    sys_settings_bp,     # /api/v1/system-settings
    ai_proxy_bp,
    ai_chat_bp,          # /api/v1/ai-proxy (no auth)
    ai_bi_bp,              # /api/v1/ai-bi
]
