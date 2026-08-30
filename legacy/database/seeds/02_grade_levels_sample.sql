-- FILE: database/seeds/02_grade_levels_sample.sql
-- Sample grade structure for Nepal private sector company
-- Minimum salary >= NPR 15,000 enforced by DB constraint

-- Usage: Replace ':company_id' with actual company UUID
-- \set company_id 'your-company-uuid'

INSERT INTO grade_levels (company_id, code, name, level_order, category,
  salary_min, salary_mid, salary_max, pf_pct_employer, ssf_pct_employer, ai_competitiveness)
VALUES
  (:'company_id', 'L1',  'Level 1 - Junior Staff',       10, 'staff',      15000,  20000,  25000,  10, 3.33, 'at_market'),
  (:'company_id', 'L2',  'Level 2 - Staff',               9,  'staff',      25000,  32500,  40000,  10, 3.33, 'at_market'),
  (:'company_id', 'L3',  'Level 3 - Senior Staff',        8,  'staff',      40000,  52500,  65000,  10, 3.33, 'at_market'),
  (:'company_id', 'M1',  'Manager Level 1',               7,  'management', 65000,  82500,  100000, 10, 3.33, 'at_market'),
  (:'company_id', 'M2',  'Manager Level 2',               6,  'management', 100000, 130000, 160000, 10, 3.33, 'at_market'),
  (:'company_id', 'M3',  'Senior Manager',                5,  'management', 160000, 200000, 240000, 10, 3.33, 'at_market'),
  (:'company_id', 'E1',  'Executive / Director',          4,  'executive',  240000, 320000, 400000, 10, 3.33, 'at_market'),
  (:'company_id', 'E2',  'Senior Executive / VP',         3,  'executive',  400000, 550000, 700000, 10, 3.33, 'above_market'),
  (:'company_id', 'C1',  'C-Suite / CEO / MD',            1,  'executive',  700000, 950000, 1200000,10, 3.33, 'above_market')
ON CONFLICT (company_id, code) DO NOTHING;
