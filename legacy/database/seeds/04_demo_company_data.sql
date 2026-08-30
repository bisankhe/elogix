-- ============================================================
-- FILE: database/seeds/04_demo_company_data.sql
-- eLogix HRMS — Complete Demo Dataset
-- Creates: 1 Group, 1 Company, 2 Branches, 3 BUs, 8 Departments,
--          3 Sections, 4 Teams, 5 Cost Centers, 2 Work Locations,
--          9 Grade Levels, 6 Designations, 10 Positions,
--          2 Outsource Vendors, 2 SLA Contracts, 5 Vendor Employees
-- Run AFTER running complete_schema.sql
-- ============================================================

BEGIN;

-- IDs (consistent UUIDs for FK references)
\set grp_id     '''aaaaaaaa-0001-0001-0001-000000000001'''
\set co_id      '''bbbbbbbb-0002-0002-0002-000000000002'''
\set br_ktm     '''cccccccc-0003-0003-0003-000000000003'''
\set br_pkr     '''cccccccc-0003-0003-0003-000000000004'''
\set bu_tech    '''dddddddd-0004-0004-0004-000000000004'''
\set bu_ops     '''dddddddd-0004-0004-0004-000000000005'''
\set bu_corp    '''dddddddd-0004-0004-0004-000000000006'''
\set dept_it    '''eeeeeeee-0005-0005-0005-000000000005'''
\set dept_hr    '''eeeeeeee-0005-0005-0005-000000000006'''
\set dept_fin   '''eeeeeeee-0005-0005-0005-000000000007'''
\set dept_mkt   '''eeeeeeee-0005-0005-0005-000000000008'''
\set dept_sec   '''eeeeeeee-0005-0005-0005-000000000009'''
\set cc_it      '''ffffffff-0006-0006-0006-000000000006'''
\set cc_hr      '''ffffffff-0006-0006-0006-000000000007'''
\set cc_admin   '''ffffffff-0006-0006-0006-000000000008'''
\set wl_hq      '''gggggggg-0007-0007-0007-000000000007'''
\set wl_pkr     '''gggggggg-0007-0007-0007-000000000008'''
\set gl_l1      '''hhhhhhhh-0008-0008-0008-000000000001'''
\set gl_l2      '''hhhhhhhh-0008-0008-0008-000000000002'''
\set gl_l3      '''hhhhhhhh-0008-0008-0008-000000000003'''
\set gl_m1      '''hhhhhhhh-0008-0008-0008-000000000004'''
\set gl_m2      '''hhhhhhhh-0008-0008-0008-000000000005'''
\set gl_e1      '''hhhhhhhh-0008-0008-0008-000000000006'''
\set des_se     '''iiiiiiii-0009-0009-0009-000000000001'''
\set des_sse    '''iiiiiiii-0009-0009-0009-000000000002'''
\set des_hrm    '''iiiiiiii-0009-0009-0009-000000000003'''
\set vnd_sg     '''jjjjjjjj-0010-0010-0010-000000000001'''
\set vnd_cp     '''jjjjjjjj-0010-0010-0010-000000000002'''
\set sla_sg     '''kkkkkkkk-0011-0011-0011-000000000001'''
\set sla_cp     '''kkkkkkkk-0011-0011-0011-000000000002'''

-- ── 1. Group Company ──────────────────────────────────────────
INSERT INTO group_companies
  (id, name, name_nepali, short_name, registration_no, pan_no, established_year,
   headquarters_country, group_type, status)
VALUES
  (:grp_id, 'eLogix Technologies Group',
   'नेपएचआर टेक्नोलोजीज ग्रुप',
   'NHG', 'GC-2074-001', '123456789', 2074,
   'Nepal', 'holding', 'active')
ON CONFLICT (id) DO NOTHING;

-- ── 2. Company ────────────────────────────────────────────────
INSERT INTO companies
  (id, group_id, name, name_nepali, short_name, registration_type,
   registration_no, pan_no, vat_registered, vat_no,
   industry, established_year, fiscal_year_type,
   province, district, municipality, ward_no,
   phone, email, hr_contact_email,
   labour_office_zone, ssf_employer_no, pf_employer_no,
   collective_bargaining_active, min_wage_applicable,
   setup_completed, status)
VALUES
  (:co_id, :grp_id,
   'eLogix Technologies Pvt. Ltd.',
   'नेपएचआर टेक्नोलोजीज प्रा.लि.',
   'eLogix Tech', 'private_limited',
   'OCR-2074-12345', '987654321', TRUE, 'VAT-2074-987',
   'Information Technology', 2074, 'BS',
   'Bagmati Province', 'Kathmandu', 'Kathmandu Metropolitan City', '4',
   '+977-01-4123456', 'info@elogix.com', 'hr@elogix.com',
   'Bagmati Zone', 'SSF-2074-009876', 'PF-2074-001234',
   FALSE, 15000,
   TRUE, 'active')
ON CONFLICT (id) DO NOTHING;

-- ── 3. Branches ───────────────────────────────────────────────
INSERT INTO branches
  (id, company_id, code, name, branch_type, is_headquarters,
   province, district, municipality, ward_no,
   phone, email, capacity, employee_count,
   labour_office_zone, status)
VALUES
  (:br_ktm, :co_id, 'KTM-HQ', 'Kathmandu Headquarters',
   'headquarters', TRUE,
   'Bagmati Province', 'Kathmandu', 'Kathmandu Metropolitan City', '4',
   '+977-01-4123456', 'ktm@elogix.com', 150, 87,
   'Kathmandu Labour Office, Ekantakuna', 'active'),
  (:br_pkr, :co_id, 'PKR-BR', 'Pokhara Branch Office',
   'branch', FALSE,
   'Gandaki Province', 'Kaski', 'Pokhara Metropolitan City', '11',
   '+977-61-456789', 'pkr@elogix.com', 50, 18,
   'Pokhara Labour Office', 'active')
ON CONFLICT (id) DO NOTHING;

-- ── 4. Business Units ─────────────────────────────────────────
INSERT INTO business_units
  (id, company_id, code, name, bu_type, is_profit_center,
   headcount_target, headcount_actual, status)
VALUES
  (:bu_tech, :co_id, 'BU-TECH', 'Technology Division', 'division', TRUE, 60, 45, 'active'),
  (:bu_ops,  :co_id, 'BU-OPS',  'Operations Division', 'division', FALSE, 30, 25, 'active'),
  (:bu_corp, :co_id, 'BU-CORP', 'Corporate Services',  'division', FALSE, 25, 17, 'active')
ON CONFLICT (id) DO NOTHING;

-- ── 5. Cost Centers ───────────────────────────────────────────
INSERT INTO cost_centers
  (id, company_id, code, name, cc_type, fiscal_year,
   budget_annual, actuals_ytd, currency, status)
VALUES
  (:cc_it,    :co_id, 'CC-IT-001',   'IT Department Cost Center', 'cost_center', '2081-82', 12000000, 7800000, 'NPR', 'active'),
  (:cc_hr,    :co_id, 'CC-HR-001',   'HR Department Cost Center', 'cost_center', '2081-82', 4500000,  2100000, 'NPR', 'active'),
  (:cc_admin, :co_id, 'CC-ADMIN-001','Admin & Corporate Center',  'cost_center', '2081-82', 3000000,  1650000, 'NPR', 'active')
ON CONFLICT (id) DO NOTHING;

-- ── 6. Departments ────────────────────────────────────────────
INSERT INTO departments
  (id, company_id, business_unit_id, branch_id, cost_center_id,
   code, name, name_nepali, function_type, ulrich_model,
   headcount_target, headcount_actual, annual_budget,
   is_core_function, status)
VALUES
  (:dept_it,  :co_id, :bu_tech, :br_ktm, :cc_it,
   'IT',   'Information Technology', 'सूचना प्रविधि',
   'core', 'center_of_excellence', 25, 18, 12000000, TRUE, 'active'),
  (:dept_hr,  :co_id, :bu_corp, :br_ktm, :cc_hr,
   'HR',   'Human Resources',        'मानव संसाधन',
   'support', 'strategic_hrbp',     10, 7,  4500000, FALSE, 'active'),
  (:dept_fin, :co_id, :bu_corp, :br_ktm, :cc_admin,
   'FIN',  'Finance & Accounts',     'वित्त तथा लेखा',
   'support', 'shared_services',    8,  6,  2000000, FALSE, 'active'),
  (:dept_mkt, :co_id, :bu_tech, :br_ktm, :cc_it,
   'MKT',  'Marketing & Sales',      'विपणन तथा बिक्री',
   'core', 'line_management',        12, 9,  3000000, TRUE, 'active'),
  (:dept_sec, :co_id, :bu_ops,  :br_ktm, :cc_admin,
   'SEC',  'Security',               'सुरक्षा',
   'support', 'line_management',    5,  0,   500000, FALSE, 'active')
ON CONFLICT (id) DO NOTHING;

-- ── 7. Work Locations ─────────────────────────────────────────
INSERT INTO work_locations
  (id, company_id, branch_id, code, name, location_type,
   floor, max_capacity, current_occupancy,
   has_canteen, has_first_aid, has_fire_exit,
   biometric_enabled, status)
VALUES
  (:wl_hq,  :co_id, :br_ktm, 'KTM-HQ-F1', 'KTM HQ - Ground & First Floor',
   'office', '1-3', 100, 72,
   TRUE, TRUE, TRUE, TRUE, 'active'),
  (:wl_pkr, :co_id, :br_pkr, 'PKR-BR-F1', 'Pokhara Branch - Main Floor',
   'office', '1-2', 60, 18,
   FALSE, TRUE, TRUE, TRUE, 'active')
ON CONFLICT (id) DO NOTHING;

-- ── 8. Employment Categories (seed per company) ───────────────
SELECT fn_seed_company_emp_categories(:co_id);

-- ── 9. Grade Levels ───────────────────────────────────────────
INSERT INTO grade_levels
  (id, company_id, code, name, level_order, category,
   salary_min, salary_mid, salary_max, currency,
   pf_pct_employer, ssf_pct_employer, gratuity_pct,
   annual_bonus_months, ai_competitiveness, is_active)
VALUES
  (:gl_l1, :co_id,'L1','Level 1 - Junior',     6,'staff',      15000,  20000,  25000,'NPR',10,3.33,8.33,1,'at_market',TRUE),
  (:gl_l2, :co_id,'L2','Level 2 - Associate',  5,'staff',      25000,  33000,  40000,'NPR',10,3.33,8.33,1,'at_market',TRUE),
  (:gl_l3, :co_id,'L3','Level 3 - Senior',     4,'staff',      40000,  55000,  70000,'NPR',10,3.33,8.33,1,'at_market',TRUE),
  (:gl_m1, :co_id,'M1','Manager Level 1',      3,'management', 70000,  90000, 110000,'NPR',10,3.33,8.33,1.5,'above_market',TRUE),
  (:gl_m2, :co_id,'M2','Senior Manager',       2,'management',110000, 150000, 190000,'NPR',10,3.33,8.33,2,'above_market',TRUE),
  (:gl_e1, :co_id,'E1','Director/Executive',   1,'executive',  200000, 300000, 400000,'NPR',10,3.33,8.33,3,'above_market',TRUE)
ON CONFLICT (id) DO NOTHING;

-- ── 10. Designations ──────────────────────────────────────────
INSERT INTO designations
  (id, company_id, grade_level_id,
   code, name, name_nepali, category, is_managerial,
   approved_positions, filled_positions, jd_experience_years, is_active)
VALUES
  (:des_se,  :co_id, :gl_l3, 'SE',  'Software Engineer',   'सफ्टवेयर इञ्जिनियर', 'staff',      FALSE, 8, 6, 2, TRUE),
  (:des_sse, :co_id, :gl_m1, 'SSE', 'Senior Sw Engineer',  'वरिष्ठ इञ्जिनियर',   'supervisory',FALSE, 4, 3, 5, TRUE),
  (:des_hrm, :co_id, :gl_m1, 'HRM', 'HR Manager',          'मानव संसाधन प्रबन्धक','management', TRUE,  2, 1, 5, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ── 11. Positions ─────────────────────────────────────────────
INSERT INTO positions
  (company_id, designation_id, grade_level_id, department_id,
   position_code, position_title, status,
   headcount_type, fte, is_critical, effective_from)
VALUES
  (:co_id,:des_se, :gl_l3,:dept_it,'POS-IT-001','Software Engineer (BE)',    'filled', 'permanent',1.0,FALSE,'2074-01-01'),
  (:co_id,:des_se, :gl_l3,:dept_it,'POS-IT-002','Software Engineer (FE)',    'filled', 'permanent',1.0,FALSE,'2074-01-01'),
  (:co_id,:des_se, :gl_l3,:dept_it,'POS-IT-003','Software Engineer (QA)',    'filled', 'permanent',1.0,FALSE,'2074-01-01'),
  (:co_id,:des_se, :gl_l3,:dept_it,'POS-IT-004','Software Engineer (DevOps)','vacant', 'permanent',1.0,TRUE, '2074-07-01'),
  (:co_id,:des_sse,:gl_m1,:dept_it,'POS-IT-005','Senior Engineer (Backend)', 'filled', 'permanent',1.0,TRUE, '2074-01-01'),
  (:co_id,:des_sse,:gl_m1,:dept_it,'POS-IT-006','Engineering Manager',       'filled', 'permanent',1.0,TRUE, '2074-01-01'),
  (:co_id,:des_sse,:gl_m1,:dept_it,'POS-IT-007','Senior Engineer (Mobile)',  'vacant', 'permanent',1.0,FALSE,'2075-01-01'),
  (:co_id,:des_hrm,:gl_m1,:dept_hr,'POS-HR-001','HR Manager',                'filled', 'permanent',1.0,TRUE, '2074-01-01'),
  (:co_id,:des_hrm,:gl_m1,:dept_hr,'POS-HR-002','Asst HR Manager',           'vacant', 'permanent',1.0,FALSE,'2075-04-01'),
  (:co_id,:des_se, :gl_l3,:dept_mkt,'POS-MKT-001','Digital Marketing Exec',  'filled', 'permanent',1.0,FALSE,'2074-07-01')
ON CONFLICT (position_code) DO NOTHING;

-- ── 12. Teams ─────────────────────────────────────────────────
INSERT INTO teams
  (company_id, department_id, code, name, team_type, member_count, status)
VALUES
  (:co_id,:dept_it, 'FE-TEAM','Frontend Team',    'functional', 6, 'active'),
  (:co_id,:dept_it, 'BE-TEAM','Backend Team',     'functional', 7, 'active'),
  (:co_id,:dept_it, 'QA-TEAM','QA & DevOps Team', 'functional', 5, 'active'),
  (:co_id,:dept_hr, 'HR-TEAM','HR Core Team',     'functional', 7, 'active')
ON CONFLICT DO NOTHING;

-- ── 13. Outsource Vendors ─────────────────────────────────────
INSERT INTO outsource_vendors
  (id, company_id, vendor_code, vendor_name, vendor_name_nepali,
   service_category, moless_license_no, moless_license_expiry,
   is_licensed_agency, contact_person, contact_email, contact_phone,
   overall_performance_score, overall_risk_level,
   total_workers_deployed, status)
VALUES
  (:vnd_sg, :co_id, 'SG-001', 'ShieldGuard Nepal Pvt. Ltd.',
   'शिल्डगार्ड नेपाल प्रा.लि.',
   'Security Services', 'LS-MoLESS-2024-0012', '2026-12-31',
   TRUE, 'Ramesh Thapa', 'info@shieldguard.com.np', '+977-9801234567',
   91, 'low', 12, 'active'),
  (:vnd_cp, :co_id, 'CP-001', 'CleanPro Services Nepal',
   'क्लिनप्रो सर्भिसेज नेपाल',
   'Housekeeping & Sanitation', 'LS-MoLESS-2024-0034', '2026-06-30',
   TRUE, 'Sita Sharma', 'info@cleanpro.com.np', '+977-9807654321',
   84, 'low', 6, 'active')
ON CONFLICT (id) DO NOTHING;

-- ── 14. SLA Contracts ─────────────────────────────────────────
INSERT INTO sla_contracts
  (id, company_id, vendor_id, contract_number, service_type,
   contract_type, start_date, end_date, renewal_alert_days,
   monthly_billing_rate_npr, rate_per_worker_per_day,
   max_workers_allowed, current_workers_deployed,
   ensures_min_wage, ensures_ssf_payment, ensures_insurance,
   non_core_work_only, main_employer_co_liable, status)
VALUES
  (:sla_sg, :co_id, :vnd_sg, 'SLA-2024-001', 'Security Services',
   'Service Agreement', '2024-01-01', '2026-12-31', 90,
   225000, 6923, 15, 12,
   TRUE, TRUE, TRUE, TRUE, TRUE, 'active'),
  (:sla_cp, :co_id, :vnd_cp, 'SLA-2024-002', 'Housekeeping & Sanitation',
   'Service Agreement', '2024-07-01', '2026-06-30', 90,
   72000, 4000, 8, 6,
   TRUE, TRUE, TRUE, TRUE, TRUE, 'active')
ON CONFLICT (id) DO NOTHING;

-- ── 15. Vendor Employees ──────────────────────────────────────
INSERT INTO vendor_employees
  (company_id, vendor_id, contract_id, vendor_emp_id, name, name_nepali,
   role, service_category, assigned_location, shift_type,
   monthly_wage_npr, id_verified, bg_verified, insurance_active,
   ssf_paid_current_month, min_wage_compliant, status)
VALUES
  (:co_id,:vnd_sg,:sla_sg,'VE-SG-001','Ramesh Shrestha','रमेश श्रेष्ठ',
   'Security Guard','Security Services','KTM HQ - Gate 1','Night',
   18000,TRUE,TRUE,TRUE,TRUE,TRUE,'active'),
  (:co_id,:vnd_sg,:sla_sg,'VE-SG-002','Priya Gurung','प्रिया गुरुङ',
   'Security Guard','Security Services','KTM HQ - Parking','Day',
   18000,TRUE,TRUE,TRUE,TRUE,TRUE,'active'),
  (:co_id,:vnd_sg,:sla_sg,'VE-SG-003','Bikash Tamang','विकास तामाङ',
   'Security Guard','Security Services','KTM HQ - Reception','Day',
   18000,TRUE,FALSE,TRUE,TRUE,TRUE,'active'),
  (:co_id,:vnd_cp,:sla_cp,'VE-CP-001','Sita Rai','सिता राई',
   'Cleaning Staff','Housekeeping','KTM HQ - All Floors','Day',
   16500,TRUE,TRUE,TRUE,TRUE,TRUE,'active'),
  (:co_id,:vnd_cp,:sla_cp,'VE-CP-002','Hari Magar','हरि मगर',
   'Cleaning Staff','Housekeeping','KTM HQ - Common Areas','Day',
   16500,TRUE,TRUE,FALSE,FALSE,TRUE,'active')
ON CONFLICT (company_id, vendor_emp_id) DO NOTHING;

COMMIT;

-- Verify
SELECT
  'group_companies'     AS table_name, COUNT(*) AS rows FROM group_companies
UNION ALL SELECT 'companies',          COUNT(*) FROM companies
UNION ALL SELECT 'branches',           COUNT(*) FROM branches
UNION ALL SELECT 'business_units',     COUNT(*) FROM business_units
UNION ALL SELECT 'cost_centers',       COUNT(*) FROM cost_centers
UNION ALL SELECT 'departments',        COUNT(*) FROM departments
UNION ALL SELECT 'work_locations',     COUNT(*) FROM work_locations
UNION ALL SELECT 'employment_categories',COUNT(*) FROM employment_categories WHERE company_id IS NOT NULL
UNION ALL SELECT 'grade_levels',       COUNT(*) FROM grade_levels
UNION ALL SELECT 'designations',       COUNT(*) FROM designations
UNION ALL SELECT 'positions',          COUNT(*) FROM positions
UNION ALL SELECT 'teams',              COUNT(*) FROM teams
UNION ALL SELECT 'outsource_vendors',  COUNT(*) FROM outsource_vendors
UNION ALL SELECT 'sla_contracts',      COUNT(*) FROM sla_contracts
UNION ALL SELECT 'vendor_employees',   COUNT(*) FROM vendor_employees;
