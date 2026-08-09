-- FILE: database/seeds/01_employment_categories.sql
-- Seeds all 11 employment category types per Nepal Labour Act 2074 + Excel list
-- Run once per new company: SELECT fn_seed_company_emp_categories('company-uuid-here');

CREATE OR REPLACE FUNCTION fn_seed_company_emp_categories(p_company_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO employment_categories
    (company_id, code, name, name_nepali, la_type, la_section,
     written_contract_required, max_probation_months, max_days_per_month, max_weekly_hrs,
     pf_eligible, ssf_eligible, gratuity_eligible, medical_eligible,
     annual_leave_days, sick_leave_days, maternity_eligible, paternity_eligible,
     cba_eligible, max_daily_hrs, statutory_color, is_system, sort_order,
     ai_compliance_notes, ai_risk_level)
  SELECT
    p_company_id, code, name, name_nepali, la_type, la_section,
    written_contract_required, max_probation_months, max_days_per_month, max_weekly_hrs,
    pf_eligible, ssf_eligible, gratuity_eligible, medical_eligible,
    annual_leave_days, sick_leave_days, maternity_eligible, paternity_eligible,
    cba_eligible, max_daily_hrs, statutory_color, TRUE, sort_order,
    ai_compliance_notes, ai_risk_level
  FROM employment_categories
  WHERE company_id IS NULL   -- global seeds
  ON CONFLICT (company_id, code) DO NOTHING;

  RETURN 'Seeded 11 employment categories for company ' || p_company_id::TEXT;
END;$$;

-- Seed data for company 'DEMO-001' (replace with real UUID in production)
-- SELECT fn_seed_company_emp_categories('your-company-uuid-here');
