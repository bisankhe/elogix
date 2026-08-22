# FILE: backend/app.py
# eLogix HRMS — Main Flask Application
# Registers ALL route blueprints, middleware, CORS, error handlers
# eLogix Technologies · www.elogix.com.np

import os
import logging
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger('elogix')


def create_app(config_name=None):
    """Application factory."""
    app = Flask(__name__, static_folder='../dist', static_url_path='')

    # ── Config ────────────────────────────────────────────────────────
    app.config.update(
        SECRET_KEY          = os.getenv('SECRET_KEY', 'elogix-dev-secret-change-in-prod'),
        SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://elogix:password@localhost/elogix_prod'),
        SQLALCHEMY_TRACK_MODIFICATIONS = False,
        SQLALCHEMY_ENGINE_OPTIONS = {
            'pool_size'    : 10,
            'pool_recycle' : 300,
            'pool_pre_ping': True,
        },
        MAX_CONTENT_LENGTH  = 50 * 1024 * 1024,   # 50 MB upload limit
        JSON_SORT_KEYS      = False,
        PROPAGATE_EXCEPTIONS= True,
    )

    # ── CORS ──────────────────────────────────────────────────────────
    allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,https://elogix.com.np').split(',')
    CORS(app,
         origins     = allowed_origins,
         supports_credentials = True,
         methods      = ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
         allow_headers= ['Content-Type','Authorization','X-Tenant-Slug','X-Request-ID'],
    )

    # ── Database ──────────────────────────────────────────────────────
    from config.database import db, migrate
    db.init_app(app)
    migrate.init_app(app, db)

    # ── Middleware ────────────────────────────────────────────────────
    from middleware.tenant    import TenantMiddleware
    from middleware.auth      import jwt_required_middleware
    from middleware.rate_limit import setup_rate_limiter
    from middleware.security  import setup_security_headers

    TenantMiddleware(app)
    setup_rate_limiter(app)
    setup_security_headers(app)

    # ── Register ALL blueprints ───────────────────────────────────────
    _register_blueprints(app)

    # ── Static file serving (React SPA) ──────────────────────────────
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_spa(path):
        """Serve React SPA for all non-API routes."""
        dist_dir = os.path.join(app.root_path, '..', 'dist')
        # If the file exists in dist, serve it directly (JS, CSS, images)
        target = os.path.join(dist_dir, path)
        if path and os.path.exists(target) and os.path.isfile(target):
            return send_from_directory(dist_dir, path)
        # Otherwise serve index.html (client-side routing)
        return send_from_directory(dist_dir, 'index.html')

    # ── Health check ──────────────────────────────────────────────────
    @app.route('/api/health')
    def health():
        return jsonify({
            'status'     : 'ok',
            'service'    : 'eLogix HRMS API',
            'version'    : '3.0.0',
            'environment': os.getenv('ENVIRONMENT', 'production'),
        })

    # ── Error handlers ────────────────────────────────────────────────
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'error': 'Bad Request', 'message': str(e)}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({'error': 'Unauthorized', 'message': 'Valid token required'}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({'error': 'Forbidden', 'message': 'Insufficient permissions'}), 403

    @app.errorhandler(404)
    def not_found(e):
        # For API routes return JSON; for everything else serve SPA
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Not Found'}), 404
        dist_dir = os.path.join(app.root_path, '..', 'dist')
        return send_from_directory(dist_dir, 'index.html')

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({'error': 'File Too Large', 'message': 'Maximum 50MB allowed'}), 413

    @app.errorhandler(429)
    def rate_limited(e):
        return jsonify({'error': 'Too Many Requests', 'message': 'Rate limit exceeded'}), 429

    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f'Internal error: {e}', exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500

    logger.info('✅ eLogix HRMS application created successfully')
    return app


def _register_blueprints(app):
    """Register every blueprint. Grouped by domain."""

    # ── Auth & User ───────────────────────────────────────────────────
    from routes.auth_routes             import auth_bp
    from routes.user_access_routes      import user_access_bp
    from routes.rbac_routes             import rbac_bp
    from routes.permission_matrix_routes import permission_matrix_bp
    from routes.company_users_routes    import company_users_bp

    # ── SaaS / eLogix Admin ───────────────────────────────────────────
    from saas.elogix_admin_routes       import elogix_admin_bp
    from saas.admin_routes              import saas_admin_bp

    # ── Organisation Setup ────────────────────────────────────────────
    from routes.company_setup_routes    import company_setup_bp
    from routes.org_setup_routes        import org_setup_bp
    from routes.org_structure_routes    import org_structure_bp
    from routes.org_routes              import org_bp
    from routes.dept_team_routes        import dept_team_bp
    from routes.structure_routes        import structure_bp
    from routes.business_unit_routes    import business_unit_bp
    from routes.employment_category_routes import employment_category_bp
    from routes.workforce_config_routes import workforce_config_bp

    # ── Employee Lifecycle ────────────────────────────────────────────
    from routes.employee_database_routes    import employee_bp
    from routes.employee_joining_routes     import joining_bp
    from routes.employee_enrollment_routes  import enrollment_bp
    from routes.employee_movement_routes    import movement_bp
    from routes.employee_documents_routes   import employee_docs_bp
    from routes.preboarding_routes          import preboarding_bp
    from routes.probation_management_routes import probation_bp
    from routes.exit_management_routes      import exit_bp
    from routes.exit_analytics_routes       import exit_analytics_bp
    from routes.settlement_documents_routes import settlement_bp

    # ── Recruitment / ATS ─────────────────────────────────────────────
    from routes.recruitment_routes          import recruitment_bp
    from routes.ats_routes                  import ats_bp
    from routes.workforce_planning_routes   import workforce_planning_bp
    from routes.employer_branding_routes    import employer_branding_bp

    # ── Workforce Operations ──────────────────────────────────────────
    from routes.attendance_setup_routes         import attendance_setup_bp
    from routes.daily_attendance_routes         import daily_attendance_bp
    from routes.attendance_regularization_routes import attendance_reg_bp
    from routes.attendance_processing_routes    import attendance_proc_bp
    from routes.attendance_reports_routes       import attendance_reports_bp
    from routes.missed_punch_request_routes     import missed_punch_bp
    from routes.overtime_monitoring_routes      import overtime_bp
    from routes.leave_setup_routes              import leave_setup_bp
    from routes.leave_operations_routes         import leave_ops_bp
    from routes.leave_settlement_routes         import leave_settlement_bp
    from routes.leave_reports_routes            import leave_reports_bp
    from routes.payroll_setup_routes            import payroll_setup_bp
    from routes.payroll_processing_routes       import payroll_proc_bp
    from routes.payroll_finalization_routes     import payroll_fin_bp
    from routes.payroll_information_routes      import payroll_info_bp
    from routes.payroll_analytics_routes        import payroll_analytics_bp
    from routes.salary_tax_routes               import salary_tax_bp
    from routes.wfh_tracking_routes             import wfh_bp
    from routes.field_visit_tracking_routes     import field_visit_bp
    from routes.insource_outsource_attendance_routes import insource_bp

    # ── Performance & Talent ──────────────────────────────────────────
    from routes.performance_evaluation_routes       import perf_eval_bp
    from routes.performance_analytics_dashboard_routes import perf_analytics_bp
    from routes.performance_analytics_kpi_routes    import kpi_analytics_bp
    from routes.goal_assignment_routes              import goal_assign_bp
    from routes.goal_tracking_routes                import goal_track_bp
    from routes.kpi_management_routes               import kpi_bp
    from routes.kra_management_routes               import kra_bp
    from routes.okr_management_routes               import okr_bp
    from routes.pms_360_routes                      import pms360_bp
    from routes.rewards_recognition_routes          import rewards_bp
    from routes.succession_planning_routes          import succession_bp
    from routes.career_development_routes           import career_bp
    from routes.skill_gap_training_request_routes   import skill_gap_bp
    from routes.training_calendar_routes            import training_cal_bp
    from routes.training_needs_routes               import training_needs_bp
    from routes.course_management_lms_routes        import lms_bp
    from routes.learning_portal_elearning_routes    import learning_bp
    from routes.training_feedback_roi_assessment_routes import training_roi_bp
    from routes.training_participation_reports_routes   import training_reports_bp
    from routes.certificate_generation_tracking_routes  import cert_bp

    # ── Employee Experience & Culture ─────────────────────────────────
    from routes.employee_engagement_routes  import engagement_bp
    from routes.employee_relations_routes   import relations_bp
    from routes.employee_social_feed_routes import social_feed_bp
    from routes.wellness_support_routes     import wellness_bp
    from routes.dei_routes                  import dei_bp

    # ── HR Services & Support ─────────────────────────────────────────
    from routes.hr_helpdesk_routes              import helpdesk_bp
    from routes.ess_self_service_routes         import ess_bp
    from routes.ess_attendance_leave_resignation_routes import ess_att_bp
    from routes.ess_policies_payroll_routes     import ess_pay_bp
    from routes.ess_activity_goals_helpdesk_routes import ess_act_bp
    from routes.mss_team_management_routes      import mss_bp

    # ── Finance, Assets & Admin ───────────────────────────────────────
    from routes.hr_budgeting_routes         import hr_budget_bp
    from routes.asset_inventory_routes      import asset_bp
    from routes.administrative_operations_routes import admin_ops_bp
    from routes.finance_claims_routes       import finance_bp

    # ── Compliance & Risk ─────────────────────────────────────────────
    from routes.hr_policy_routes            import hr_policy_bp
    from routes.compliance_management_routes import compliance_bp
    from routes.risk_management_routes      import risk_bp
    from routes.legal_management_routes     import legal_bp

    # ── Reports & Analytics ───────────────────────────────────────────
    from routes.standard_reports_routes         import std_reports_bp
    from routes.hr_analytics_routes             import hr_analytics_bp
    from routes.hr_analytics_governance_routes  import hr_gov_bp
    from routes.advanced_analytics_routes       import adv_analytics_bp
    from routes.workload_analysis_routes        import workload_bp

    # ── AI ────────────────────────────────────────────────────────────
    from routes.ai_chat_routes              import ai_chat_bp
    from routes.ai_proxy_routes             import ai_proxy_bp
    from routes.ai_business_intelligence_routes import ai_bi_bp
    from routes.advanced_analytics_routes   import adv_analytics_bp

    # ── System Admin ──────────────────────────────────────────────────
    from routes.system_settings_routes      import system_settings_bp
    from routes.workflow_automation_routes  import workflow_bp
    from routes.integration_api_routes      import integration_bp
    from routes.integration_hub_routes      import integration_hub_bp
    from routes.mobile_app_config_routes    import mobile_bp
    from routes.data_migration_routes       import data_migration_bp

    # ── Vendor / Outsource ────────────────────────────────────────────
    from routes.vendor_routes               import vendor_bp
    from routes.vendor_employee_routes      import vendor_emp_bp
    from routes.vendor_billing_analytics_routes import vendor_billing_bp
    from routes.vendor_hr_analytics_routes  import vendor_hr_bp
    from routes.vendor_finance_routes       import vendor_fin_bp
    from routes.sla_invoice_routes          import sla_bp

    # ── Billing ───────────────────────────────────────────────────────
    from routes.billing_routes              import billing_bp

    # ── Letters / Documents ───────────────────────────────────────────
    from routes.government_letters_routes   import govt_letters_bp
    from routes.excel_voice_routes          import excel_voice_bp

    # ── Workforce ─────────────────────────────────────────────────────
    from routes.workforce_routes            import workforce_bp

    ALL_BLUEPRINTS = [
        # Auth
        (auth_bp,               '/api/v1/auth'),
        (user_access_bp,        '/api/v1/users'),
        (rbac_bp,               '/api/v1/rbac'),
        (permission_matrix_bp,  '/api/v1/permissions'),
        (company_users_bp,      '/api/v1/company-users'),
        # SaaS
        (elogix_admin_bp,       '/api/elogix-admin/v1'),
        (saas_admin_bp,         '/api/saas/v1'),
        # Org
        (company_setup_bp,      '/api/v1/company'),
        (org_setup_bp,          '/api/v1/org-setup'),
        (org_structure_bp,      '/api/v1/org-structure'),
        (org_bp,                '/api/v1/org'),
        (dept_team_bp,          '/api/v1/departments'),
        (structure_bp,          '/api/v1/structure'),
        (business_unit_bp,      '/api/v1/business-units'),
        (employment_category_bp,'/api/v1/employment-categories'),
        (workforce_config_bp,   '/api/v1/workforce-config'),
        # Employee
        (employee_bp,           '/api/v1/employees'),
        (joining_bp,            '/api/v1/joining'),
        (enrollment_bp,         '/api/v1/enrollment'),
        (movement_bp,           '/api/v1/movement'),
        (employee_docs_bp,      '/api/v1/employee-docs'),
        (preboarding_bp,        '/api/v1/preboarding'),
        (probation_bp,          '/api/v1/probation'),
        (exit_bp,               '/api/v1/exit'),
        (exit_analytics_bp,     '/api/v1/exit-analytics'),
        (settlement_bp,         '/api/v1/settlement'),
        # Recruitment
        (recruitment_bp,        '/api/v1/recruitment'),
        (ats_bp,                '/api/v1/ats'),
        (workforce_planning_bp, '/api/v1/workforce-planning'),
        (employer_branding_bp,  '/api/v1/employer-branding'),
        # Attendance
        (attendance_setup_bp,   '/api/v1/attendance-setup'),
        (daily_attendance_bp,   '/api/v1/attendance'),
        (attendance_reg_bp,     '/api/v1/attendance-regularization'),
        (attendance_proc_bp,    '/api/v1/attendance-processing'),
        (attendance_reports_bp, '/api/v1/attendance-reports'),
        (missed_punch_bp,       '/api/v1/missed-punch'),
        (overtime_bp,           '/api/v1/overtime'),
        (wfh_bp,                '/api/v1/wfh'),
        (field_visit_bp,        '/api/v1/field-visit'),
        (insource_bp,           '/api/v1/insource-attendance'),
        # Leave
        (leave_setup_bp,        '/api/v1/leave-setup'),
        (leave_ops_bp,          '/api/v1/leave'),
        (leave_settlement_bp,   '/api/v1/leave-settlement'),
        (leave_reports_bp,      '/api/v1/leave-reports'),
        # Payroll
        (payroll_setup_bp,      '/api/v1/payroll-setup'),
        (payroll_proc_bp,       '/api/v1/payroll'),
        (payroll_fin_bp,        '/api/v1/payroll-finalization'),
        (payroll_info_bp,       '/api/v1/payroll-info'),
        (payroll_analytics_bp,  '/api/v1/payroll-analytics'),
        (salary_tax_bp,         '/api/v1/salary-tax'),
        # Performance
        (perf_eval_bp,          '/api/v1/performance'),
        (perf_analytics_bp,     '/api/v1/performance-analytics'),
        (kpi_analytics_bp,      '/api/v1/kpi-analytics'),
        (goal_assign_bp,        '/api/v1/goals'),
        (goal_track_bp,         '/api/v1/goal-tracking'),
        (kpi_bp,                '/api/v1/kpi'),
        (kra_bp,                '/api/v1/kra'),
        (okr_bp,                '/api/v1/okr'),
        (pms360_bp,             '/api/v1/pms360'),
        (rewards_bp,            '/api/v1/rewards'),
        (succession_bp,         '/api/v1/succession'),
        (career_bp,             '/api/v1/career'),
        # Training
        (skill_gap_bp,          '/api/v1/skill-gap'),
        (training_cal_bp,       '/api/v1/training-calendar'),
        (training_needs_bp,     '/api/v1/training-needs'),
        (lms_bp,                '/api/v1/lms'),
        (learning_bp,           '/api/v1/learning'),
        (training_roi_bp,       '/api/v1/training-roi'),
        (training_reports_bp,   '/api/v1/training-reports'),
        (cert_bp,               '/api/v1/certificates'),
        # Experience
        (engagement_bp,         '/api/v1/engagement'),
        (relations_bp,          '/api/v1/relations'),
        (social_feed_bp,        '/api/v1/social-feed'),
        (wellness_bp,           '/api/v1/wellness'),
        (dei_bp,                '/api/v1/dei'),
        # HR Services
        (helpdesk_bp,           '/api/v1/helpdesk'),
        (ess_bp,                '/api/v1/ess'),
        (ess_att_bp,            '/api/v1/ess/attendance'),
        (ess_pay_bp,            '/api/v1/ess/payroll'),
        (ess_act_bp,            '/api/v1/ess/activity'),
        (mss_bp,                '/api/v1/mss'),
        # Finance
        (hr_budget_bp,          '/api/v1/hr-budget'),
        (asset_bp,              '/api/v1/assets'),
        (admin_ops_bp,          '/api/v1/admin-ops'),
        (finance_bp,            '/api/v1/finance'),
        # Compliance
        (hr_policy_bp,          '/api/v1/hr-policies'),
        (compliance_bp,         '/api/v1/compliance'),
        (risk_bp,               '/api/v1/risk'),
        (legal_bp,              '/api/v1/legal'),
        # Reports
        (std_reports_bp,        '/api/v1/reports'),
        (hr_analytics_bp,       '/api/v1/hr-analytics'),
        (hr_gov_bp,             '/api/v1/hr-governance'),
        (adv_analytics_bp,      '/api/v1/advanced-analytics'),
        (workload_bp,           '/api/v1/workload'),
        # AI
        (ai_chat_bp,            '/api/v1/ai/chat'),
        (ai_proxy_bp,           '/api/v1/ai'),
        (ai_bi_bp,              '/api/v1/ai/bi'),
        # System
        (system_settings_bp,    '/api/v1/system'),
        (workflow_bp,           '/api/v1/workflows'),
        (integration_bp,        '/api/v1/integrations'),
        (integration_hub_bp,    '/api/v1/integration-hub'),
        (mobile_bp,             '/api/v1/mobile-config'),
        (data_migration_bp,     '/api/v1/data-migration'),
        # Vendor
        (vendor_bp,             '/api/v1/vendors'),
        (vendor_emp_bp,         '/api/v1/vendor-employees'),
        (vendor_billing_bp,     '/api/v1/vendor-billing'),
        (vendor_hr_bp,          '/api/v1/vendor-hr'),
        (vendor_fin_bp,         '/api/v1/vendor-finance'),
        (sla_bp,                '/api/v1/sla'),
        # Billing
        (billing_bp,            '/api/v1/billing'),
        # Letters
        (govt_letters_bp,       '/api/v1/letters'),
        (excel_voice_bp,        '/api/v1/excel-voice'),
        # Workforce
        (workforce_bp,          '/api/v1/workforce'),
    ]

    for blueprint, prefix in ALL_BLUEPRINTS:
        try:
            app.register_blueprint(blueprint, url_prefix=prefix)
        except Exception as e:
            logger.error(f'Failed to register blueprint {blueprint.name}: {e}')

    logger.info(f'✅ Registered {len(ALL_BLUEPRINTS)} blueprints')


# ── Entry point ───────────────────────────────────────────────────────
app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('ENVIRONMENT', 'production') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
