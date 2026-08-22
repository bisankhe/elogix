// ============================================================
// FILE: src/data/sidebarMenu.js
// PURPOSE: Complete sidebar navigation tree
//          12 top-level modules, 130+ sub-pages
//          Used by Sidebar.jsx to render navigation
// ============================================================

export const SIDEBAR_MENU = [

  // ─────────────────────────────────────────────────────────
  // 1. DASHBOARD & WORKSPACE
  // ─────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    icon: '🏠',
    labelKey: 'dashboard',
    label: 'Dashboard & Workspace',
    children: [
      // Snapshot Dashboards
      { id: 'attendance-snapshot',      label: 'Attendance Snapshot',                 badge: 'Live',  group: 'Snapshots' },
      { id: 'headcount-analysis',       label: 'Headcount Analysis (Total, M/F)',                     group: 'Snapshots' },
      { id: 'dept-employee-comparison', label: 'Dept-wise Employee List (YoY)',                       group: 'Snapshots' },
      { id: 'leave-snapshot',           label: 'Leave Snapshot',                                      group: 'Snapshots' },
      { id: 'emp-satisfaction',         label: 'Employee Satisfaction',                               group: 'Snapshots' },
      { id: 'worklife-balance',         label: 'Work-Life Balance',                                   group: 'Snapshots' },
      { id: 'attrition-snapshot',       label: 'Attrition Snapshot',                                  group: 'Snapshots' },
      { id: 'recruitment-snapshot',     label: 'Recruitment Snapshot',                                group: 'Snapshots' },
      { id: 'onboarding-month',         label: 'Onboarding (This Month)',                             group: 'Snapshots' },
      { id: 'payroll-snapshot',         label: 'Payroll Snapshot',       badge: '🔒',                 group: 'Snapshots' },
      { id: 'performance-snapshot',     label: 'Performance Snapshot',                                group: 'Snapshots' },
      { id: 'engagement-snapshot',      label: 'Engagement Snapshot',                                 group: 'Snapshots' },

      // Widgets & Alerts
      { id: 'calendar-events',          label: 'Calendar with Events',                                group: 'Widgets' },
      { id: 'notifications',            label: 'Notifications & Alerts',  badge: '7',                 group: 'Widgets' },
      { id: 'quick-actions',            label: 'Quick Actions',                                        group: 'Widgets' },
      { id: 'upcoming-events',          label: 'Upcoming Events',                                      group: 'Widgets' },
      { id: 'birthday-anniversary',     label: 'Employee Birthday & Anniversary',                      group: 'Widgets' },
      { id: 'tenure-chart',             label: 'Tenure-wise Employee Chart',                           group: 'Widgets' },
      { id: 'age-group',                label: 'Employees Age Group',                                  group: 'Widgets' },
      { id: 'blood-group',              label: 'Employees Blood Group',                                group: 'Widgets' },
      { id: 'contract-expiry',          label: 'Contract Expiry',                                      group: 'Widgets' },
      { id: 'minutes-of-meeting',       label: 'Minutes of Meeting (AI Voice + Text)', badge: 'AI',   group: 'Widgets' },
      { id: 'roster-details',           label: 'Roster Details by Department',                         group: 'Widgets' },
      { id: 'ai-insights',              label: 'AI Insights',              badge: 'AI',                group: 'Widgets' },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 2. AI ASSISTANT
  // ─────────────────────────────────────────────────────────
  {
    id: 'ai-assistant',
    icon: '🧠',
    labelKey: 'aiAssistant',
    label: 'AI Assistant',
    children: [
      { id: 'ai-business-intelligence', label: 'AI Business Intelligence',  badge: 'AI' },
      { id: 'ai-hr-chatbot',            label: 'AI HR Chatbot',           badge: 'AI' },
      { id: 'ai-hr-analytics',          label: 'AI HR Analytics',         badge: 'AI' },
      { id: 'ai-policy-assistant',      label: 'AI Policy Assistant',     badge: 'AI' },
      { id: 'ai-resume-screening',      label: 'AI Resume Screening',     badge: 'AI' },
      { id: 'ai-attendance-insights',   label: 'AI Attendance Insights',  badge: 'AI' },
      { id: 'ai-attrition-prediction',  label: 'AI Attrition Prediction', badge: 'AI' },
      { id: 'predictive-analytics',     label: 'Predictive Analytics',    badge: 'AI' },
      { id: 'ai-performance-insights',  label: 'AI Performance Insights', badge: 'AI' },
      { id: 'smart-notifications',      label: 'Smart Notifications',     badge: 'AI' },
      { id: 'ai-report-generator',      label: 'AI Report Generator',     badge: 'AI' },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 3. ORGANIZATION MANAGEMENT
  // ─────────────────────────────────────────────────────────
  {
    id: 'org-mgmt',
    icon: '🏛️',
    labelKey: 'orgMgmt',
    label: 'Organization Management',
    children: [

      // ── Company & Branch ──────────────────────────────────
      { id: 'company-profile',          label: 'Company Profile',                      group: 'Company Setup' },
      { id: 'company-setup',            label: 'Company Setup',                        group: 'Company Setup' },
      { id: 'group-company',            label: 'Group Company',                        group: 'Company Setup' },
      { id: 'branch-location-setup',    label: 'Branch & Location Setup',              group: 'Company Setup' },
      { id: 'business-unit-setup',      label: 'Business Unit / Division Setup',       group: 'Company Setup' },

      // ── Department & Team ─────────────────────────────────
      { id: 'department-setup',         label: 'Department Setup',                     group: 'Department & Team' },
      { id: 'section-unit',             label: 'Section & Unit',                       group: 'Department & Team' },
      { id: 'team-setup',               label: 'Team Setup',                           group: 'Department & Team' },
      { id: 'cost-center',              label: 'Cost Center',                          group: 'Department & Team' },
      { id: 'work-location',            label: 'Work Location',                        group: 'Department & Team' },

      // ── Structure & Hierarchy ─────────────────────────────
      { id: 'employment-category',      label: 'Employment Category',                  group: 'Structure & Hierarchy' },
      { id: 'designation-setup',        label: 'Designation Setup',                    group: 'Structure & Hierarchy' },
      { id: 'grade-level',              label: 'Grade & Level',                        group: 'Structure & Hierarchy' },
      { id: 'reporting-hierarchy',      label: 'Reporting Hierarchy',                  group: 'Structure & Hierarchy' },
      { id: 'position-management',      label: 'Position Management',                  group: 'Structure & Hierarchy' },
      { id: 'org-chart',                label: 'Organization Chart',                   group: 'Structure & Hierarchy' },
      { id: 'process-flow',             label: 'Process Flow Chart',                   group: 'Structure & Hierarchy' },

      // ── Workforce Configuration ───────────────────────────
      { id: 'holiday-calendar',         label: 'Holiday Calendar',                     group: 'Workforce Configuration' },
      { id: 'weekend-policy',           label: 'Weekend Policy',                       group: 'Workforce Configuration' },
      { id: 'shift-setup',              label: 'Shift Setup',                          group: 'Workforce Configuration' },

      // ── Vendor Management ─────────────────────────────────
      { id: 'vendor-listing',           label: 'Vendor Listing',                       group: 'Vendor Management' },
      { id: 'vendor-bg-verification',   label: 'Vendor Background Verification',       group: 'Vendor Management' },
      { id: 'vendor-agreement',         label: 'Vendor Agreement',                     group: 'Vendor Management' },
      { id: 'vendor-profile',           label: 'Vendor Profile',                       group: 'Vendor Management' },
      { id: 'vendor-performance',       label: 'Vendor Performance',                   group: 'Vendor Management' },

      // ── Insource & Outsource ──────────────────────────────
      { id: 'employment-type',          label: 'Insource & Outsource',                 group: 'Insource & Outsource' },
      { id: 'sla-contract',             label: 'SLA & Contract',                       group: 'Insource & Outsource' },
      { id: 'vendor-outsource-mapping', label: 'Vendor & Outsource Employee Mapping',  group: 'Insource & Outsource' },
      { id: 'outsource-employees',      label: 'Outsource Employees',                  group: 'Insource & Outsource' },
      { id: 'vendor-employees',         label: 'Vendor Employees',                     group: 'Insource & Outsource' },
      { id: 'vendor-inventory-assets',  label: 'Inventory or Assets',                  group: 'Insource & Outsource' },
      { id: 'vendor-leave-requests',    label: 'Leave Requests (Vendor)',               group: 'Insource & Outsource' },
      { id: 'vendor-cash-advance',      label: 'Cash Advance (Vendor)',                 group: 'Insource & Outsource' },
      { id: 'outsource-attendance',     label: 'Outsource Attendance',                  group: 'Insource & Outsource' },
      { id: 'vendor-attendance',        label: 'Vendor Employee Attendance',            group: 'Insource & Outsource' },
      { id: 'vendor-billing',           label: 'Vendor Billing',                       group: 'Insource & Outsource' },
      { id: 'vendor-invoice',           label: 'Vendor Invoice',                       group: 'Insource & Outsource' },
      { id: 'outsource-billing',        label: 'Billing & Invoice',                    group: 'Insource & Outsource' },
      { id: 'vendor-clearance',         label: 'Clearance',                            group: 'Insource & Outsource' },
      { id: 'vendor-reports',           label: 'Vendor Reports',                       group: 'Insource & Outsource' },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 4. EMPLOYEE LIFECYCLE MANAGEMENT
  // ─────────────────────────────────────────────────────────
  {
    id: 'emp-lifecycle',
    icon: '🔄',
    labelKey: 'empLifecycle',
    label: 'Employee Lifecycle',
    children: [

      // ── Workforce Planning ────────────────────────────────
      { id: 'quota-darbadi',              label: 'Staff Quota (Darbadi)',                group: 'Workforce Planning' },
      { id: 'current-status-ex-filled',   label: 'Current Status (Ex-filled)',           group: 'Workforce Planning' },
      { id: 'location-dept-wide',         label: 'Location & Department-wide',           group: 'Workforce Planning' },
      { id: 'annual-manpower-plan',       label: 'Annual Manpower Plan',                 group: 'Workforce Planning' },
      { id: 'quarterly-workforce-review', label: 'Quarterly Workforce Review',           group: 'Workforce Planning' },
      { id: 'monthly-workforce-review',   label: 'Monthly Workforce Review',             group: 'Workforce Planning' },
      { id: 'headcount-planning',         label: 'Headcount Planning',                   group: 'Workforce Planning' },
      { id: 'replacement-planning',       label: 'Replacement Planning',                 group: 'Workforce Planning' },
      { id: 'expansion-planning',         label: 'Expansion Planning',                   group: 'Workforce Planning' },
      { id: 'vacancy-planning',           label: 'Vacancy Planning',                     group: 'Workforce Planning' },
      { id: 'contract-staff-planning',    label: 'Contract Staff Planning',              group: 'Workforce Planning' },
      { id: 'outsource-staff-planning',   label: 'Outsource Staff Planning',             group: 'Workforce Planning' },
      { id: 'productivity-planning',      label: 'Productivity Planning',                group: 'Workforce Planning' },
      { id: 'resource-allocation',        label: 'Resource Allocation',                  group: 'Workforce Planning' },

      // ── Recruitment ───────────────────────────────────────
      { id: 'recruitment-mgmt-dash',      label: 'Recruitment Dashboard',                group: 'Recruitment' },
      { id: 'hiring-approval-workflow',   label: 'Hiring Approval Workflow',             group: 'Recruitment' },
      { id: 'ats-dashboard',              label: 'ATS Dashboard (Legacy)',               group: 'Recruitment' },
      { id: 'ats-career-portal',          label: 'ATS — Career Portal',                  group: 'Recruitment' },
      { id: 'ats-job-requisition',        label: 'ATS — Job Requisition',                group: 'Recruitment' },
      { id: 'ats-command-center',         label: 'ATS — Command Center',      badge: 'AI', group: 'Recruitment' },
      { id: 'manpower-requisition',       label: 'Manpower Requisition',                 group: 'Recruitment' },
      { id: 'create-job-description',     label: 'Create Job Description',    badge: 'AI', group: 'Recruitment' },
      { id: 'jd-library',                 label: 'Job Description Library',   badge: 'AI', group: 'Recruitment' },
      { id: 'ats-multipost',              label: 'ATS — Multi-Channel Post',             group: 'Recruitment' },
      { id: 'job-posting',                label: 'Job Posting',                          group: 'Recruitment' },
      { id: 'ats-job-manager',            label: 'ATS — Job Manager',         badge: 'AI', group: 'Recruitment' },
      { id: 'vacancy-management',         label: 'Vacancy Management',                   group: 'Recruitment' },
      { id: 'bulk-cv-submit',             label: 'Bulk CV Submission',                   group: 'Recruitment' },
      { id: 'talent-pool',                label: 'Talent Pool',                          group: 'Recruitment' },
      { id: 'ats-ocr-parser',             label: 'ATS — AI OCR CV Parser',    badge: 'AI', group: 'Recruitment' },
      { id: 'ats-talent-pool',            label: 'ATS — Talent Pool & CRM',   badge: 'AI', group: 'Recruitment' },
      { id: 'ats-written-test',           label: 'ATS — AI Written Test',      badge: 'AI', group: 'Recruitment' },
      { id: 'ats-candidate-pipeline',     label: 'ATS — Candidate Pipeline',  badge: 'AI', group: 'Recruitment' },
      { id: 'ats-resume-parser',          label: 'ATS — Resume Parser',       badge: 'AI', group: 'Recruitment' },
      { id: 'candidate-database',         label: 'Candidate Database',                   group: 'Recruitment' },
      { id: 'ats-candidate-search',       label: 'ATS — AI Candidate Search', badge: 'AI', group: 'Recruitment' },
      { id: 'resume-screening',           label: 'Resume Screening',          badge: 'AI', group: 'Recruitment' },
      { id: 'ats-assessment',             label: 'ATS — Assessment Centre',   badge: 'AI', group: 'Recruitment' },
      { id: 'ats-video-interview',        label: 'ATS — AI Video Interview',  badge: 'AI', group: 'Recruitment' },
      { id: 'ats-auto-shortlist',         label: 'ATS — Auto Shortlist Engine', badge: 'AI', group: 'Recruitment' },
      { id: 'ats-evaluation-suite',       label: 'ATS — Evaluation Suite',    badge: 'AI', group: 'Recruitment' },
      { id: 'interview-scheduling',       label: 'Interview Scheduling',                 group: 'Recruitment' },
      { id: 'panel-notification',         label: 'Notification to Panel',                group: 'Recruitment' },
      { id: 'ats-interview-panel',        label: 'ATS — Interview Panel',                group: 'Recruitment' },
      { id: 'interview-management',       label: 'Interview Management',                 group: 'Recruitment' },
      { id: 'ats-offer-management',       label: 'ATS — Offer Management',    badge: 'AI', group: 'Recruitment' },
      { id: 'background-verification',    label: 'Background Verification',              group: 'Recruitment' },
      { id: 'offer-management',           label: 'Offer Management',                     group: 'Recruitment' },
      { id: 'ats-pre-joining',            label: 'ATS — Pre-Joining & Docs',             group: 'Recruitment' },
      { id: 'ats-onboarding',             label: 'ATS — Pre-Join & Onboard',             group: 'Recruitment' },
      { id: 'ats-api-integrations',       label: 'ATS — API Integrations',               group: 'Recruitment' },
      { id: 'ats-analytics',              label: 'ATS — Analytics & BI',      badge: 'AI', group: 'Recruitment' },
      { id: 'ats-analytics-dash',         label: 'ATS — Analytics & Insights', badge: 'AI', group: 'Recruitment' },
      { id: 'ats-referral',               label: 'ATS — Employee Referrals',             group: 'Recruitment' },
      { id: 'ats-communication',          label: 'ATS — Communications Hub',             group: 'Recruitment' },
      { id: 'ats-ai-tools',               label: 'ATS — AI Toolbox',          badge: 'AI', group: 'Recruitment' },
      { id: 'ats-hr-chat',                label: 'ATS — HR AI Assistant',     badge: 'AI', group: 'Recruitment' },
      { id: 'ats-rbac',                   label: 'ATS — AI Tools Hub',        badge: 'AI', group: 'Recruitment' },
      { id: 'recruitment-analytics',      label: 'Recruitment Analytics',                group: 'Recruitment' },

      // ── Employer Branding ─────────────────────────────────
      { id: 'employer-branding-evp',      label: 'Employee Value Proposition (EVP)',     group: 'Employer Branding' },
      { id: 'evp-management',             label: 'EVP Management',                       group: 'Employer Branding' },
      { id: 'career-page',                label: 'Career Page',                          group: 'Employer Branding' },
      { id: 'recruitment-campaign',       label: 'Recruitment Campaign',                 group: 'Employer Branding' },
      { id: 'campus-hiring',              label: 'Campus Hiring',                        group: 'Employer Branding' },
      { id: 'social-media-branding',      label: 'Social Media Branding',               group: 'Employer Branding' },
      { id: 'employee-testimonial',       label: 'Employee Testimonial',                 group: 'Employer Branding' },
      { id: 'culture-showcase',           label: 'Culture Showcase',                     group: 'Employer Branding' },
      { id: 'hiring-event-branding',      label: 'Hiring Event Branding',               group: 'Employer Branding' },

      // ── Preboarding ───────────────────────────────────────
      { id: 'offer-acceptance',           label: 'Offer Acceptance',                     group: 'Preboarding' },
      { id: 'biometric-capture',          label: 'Biometric Capture',                    group: 'Preboarding' },
      { id: 'document-collection',        label: 'Document Collection',                  group: 'Preboarding' },
      { id: 'digital-forms-esign',        label: 'Digital Forms & E-sign',               group: 'Preboarding' },
      { id: 'joining-checklist',          label: 'Joining Checklist',                    group: 'Preboarding' },

      // ── Employee Joining ──────────────────────────────────
      { id: 'employee-joining',           label: 'Employee Joining / Enrollment',        group: 'Employee Joining' },
      { id: 'employee-enrollment',        label: 'Employee Enrollment (Insource/Outsource)', group: 'Employee Joining' },
      { id: 'digital-signature',          label: 'Digital Signature Creation',           group: 'Employee Joining' },
      { id: 'non-disclosure',             label: 'Non-Disclosure Agreement',             group: 'Employee Joining' },
      { id: 'orientation-program',        label: 'Orientation Program',                  group: 'Employee Joining' },
      { id: 'account-creation',           label: 'Account Creation',                     group: 'Employee Joining' },
      { id: 'asset-allocation-onboard',   label: 'Asset Allocation',                     group: 'Employee Joining' },
      { id: 'buddy-assignment',           label: 'Buddy Assignment',                     group: 'Employee Joining' },
      { id: 'welcome-communication',      label: 'Welcome Communication',                group: 'Employee Joining' },
      { id: 'department-introduction',    label: 'Department Introduction',              group: 'Employee Joining' },

      // ── Probation ─────────────────────────────────────────
      { id: 'probation-7-days',           label: '7 Days Review',                        group: 'Probation' },
      { id: 'probation-30-days',          label: '30 Days Review',                       group: 'Probation' },
      { id: 'probation-60-days',          label: '60 Days Review',                       group: 'Probation' },
      { id: 'probation-90-days',          label: '90 Days Review',                       group: 'Probation' },
      { id: 'probation-confirmation',     label: 'Confirmation or Termination',          group: 'Probation' },

      // ── Employee Records ──────────────────────────────────
      { id: 'employee-directory',         label: 'Employee Directory',                   group: 'Employee Records' },
      { id: 'employee-profile',           label: 'Employee Profile',                     group: 'Employee Records' },
      { id: 'personal-information',       label: 'Personal Information',                 group: 'Employee Records' },
      { id: 'family-details',             label: 'Family Details',                       group: 'Employee Records' },
      { id: 'emergency-contact',          label: 'Emergency Contact',                    group: 'Employee Records' },
      { id: 'employee-assets',            label: 'Employee Assets',                      group: 'Employee Records' },
      { id: 'employment-history',         label: 'Employment History',                   group: 'Employee Records' },
      { id: 'document-management',        label: 'Document Management',                  group: 'Employee Records' },
      { id: 'contract-management',        label: 'Contract Management',                  group: 'Employee Records' },
      { id: 'digital-employee-file',      label: 'Digital Employee File',                group: 'Employee Records' },
      { id: 'ai-hr-letters',              label: 'AI Driven HR Letters',                 group: 'Employee Records' },

      // ── Employee Movement ─────────────────────────────────
      { id: 'promotion-history',          label: 'Promotion & History',                  group: 'Employee Movement' },
      { id: 'demotion-history',           label: 'Demotion & History',                   group: 'Employee Movement' },
      { id: 'confirmation-management',    label: 'Confirmation Management',              group: 'Employee Movement' },
      { id: 'transfer-history',           label: 'Transfer & History',                   group: 'Employee Movement' },
      { id: 'disciplinary-records',       label: 'Disciplinary Records',                 group: 'Employee Movement' },
      { id: 'employee-timeline',          label: 'Employee Timeline',                    group: 'Employee Movement' },

      // ── Offboarding ───────────────────────────────────────
      { id: 'resignation-management',     label: 'Resignation Management',               group: 'Offboarding' },
      { id: 'exit-clearance',             label: 'Exit Clearance',                       group: 'Offboarding' },
      { id: 'exit-asset-return',          label: 'Asset Return',                         group: 'Offboarding' },
      { id: 'exit-interview',             label: 'Exit Interview',                       group: 'Offboarding' },
      { id: 'knowledge-transfer',         label: 'Knowledge Transfer',                   group: 'Offboarding' },
      { id: 'full-final-settlement',      label: 'Full & Final Settlement',              group: 'Offboarding' },
      { id: 'experience-letter',          label: 'Experience Letter',                    group: 'Offboarding' },
      { id: 'relieving-letter',           label: 'Relieving Letter',                     group: 'Offboarding' },
      { id: 'attrition-dashboard',        label: 'Attrition Dashboard',                  group: 'Offboarding' },
      { id: 'exit-analysis',              label: 'Exit Analysis',                        group: 'Offboarding' },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 5. WORKFORCE OPERATIONS
  // ─────────────────────────────────────────────────────────
  {
    id: 'workforce-ops',
    icon: '⚙️',
    labelKey: 'workforceOps',
    label: 'Workforce Operations',
    children: [
      // Attendance Setup
      { id: 'attendance-policy',        label: 'Attendance Policy',                    group: 'Attendance Setup' },
      { id: 'shift-management',         label: 'Shift Management',                     group: 'Attendance Setup' },
      { id: 'break-management',         label: 'Break Management',                     group: 'Attendance Setup' },
      { id: 'roster-management',        label: 'Roster Management',                    group: 'Attendance Setup' },
      { id: 'biometric-integration',    label: 'Biometric Integration',                group: 'Attendance Setup' },
      { id: 'gps-attendance',           label: 'GPS Attendance',                       group: 'Attendance Setup' },
      { id: 'geo-fencing',              label: 'Geo-Fencing',                          group: 'Attendance Setup' },
      { id: 'task-location-assignment', label: 'Task & Location Assignment',           group: 'Attendance Setup' },
      { id: 'ssf-letters',              label: 'Social Security Fund (SSF)',           group: 'Letters' },
      { id: 'cit-letters',              label: 'Citizen Investment Trust (CIT)',       group: 'Letters' },
      { id: 'labour-department-letters', label: 'Labour Department',                  group: 'Letters' },
      { id: 'tax-department-letters',  label: 'Tax Department',                       group: 'Letters' },
      { id: 'other-government-entities-letters', label: 'Other Government Entities',  group: 'Letters' },

      // Daily Attendance
      { id: 'live-attendance',          label: 'Live Attendance',          badge: 'Live', group: 'Daily Attendance' },
      { id: 'employee-movement',         label: 'Employee Movement',                    group: 'Daily Attendance' },
      { id: 'biometric-attendance',     label: 'Biometric Attendance',                 group: 'Daily Attendance' },
      { id: 'geo-attendance',           label: 'Geo Attendance',                       group: 'Daily Attendance' },
      { id: 'web-check-in',             label: 'Web Check-In & Out',                   group: 'Daily Attendance' },
      { id: 'missed-punch',             label: 'Missed Punch Request',                 group: 'Daily Attendance' },
      { id: 'insource-attendance',      label: 'Insource Attendance',                  group: 'Daily Attendance' },
      { id: 'daily-outsource-attendance', label: 'Outsource Attendance',                group: 'Daily Attendance' },
      { id: 'attendance-regularization',label: 'Attendance Regularization',            group: 'Daily Attendance' },
      { id: 'wfh-tracking',             label: 'Work From Home Tracking',              group: 'Daily Attendance' },
      { id: 'field-visit-tracking',     label: 'Field Visit Tracking (TA & DA)',       group: 'Daily Attendance' },

      // Overtime & Monitoring
      { id: 'overtime-monitoring-dashboard', label: 'Overtime & Monitoring', badge: 'New', group: 'Overtime' },
      { id: 'overtime-management',      label: 'Overtime Management',                  group: 'Overtime' },
      { id: 'overtime-acceptance',      label: 'Overtime Acceptance',                  group: 'Overtime' },
      { id: 'late-early-tracking',      label: 'Late & Early Tracking',                group: 'Overtime' },
      { id: 'real-time-monitoring',     label: 'Real-Time Monitoring',   badge: 'Live', group: 'Overtime' },
      { id: 'mobile-attendance-tracking',label: 'Mobile Attendance Tracking',          group: 'Overtime' },

      // Attendance Processing
      { id: 'attendance-processing',     label: 'Attendance Processing',                group: 'Attendance Processing' },
      { id: 'attendance-approval',      label: 'Attendance Approval',                  group: 'Attendance Processing' },
      { id: 'payroll-attendance-gen',   label: 'Payroll Attendance Generation',        group: 'Attendance Processing' },
      { id: 'attendance-analytics',     label: 'Attendance Analytics',                 group: 'Attendance Processing' },
      { id: 'attendance-reports',       label: 'Attendance Reports',                   group: 'Attendance Processing' },

      // Leave Setup
      { id: 'leave-setup',              label: 'Leave Setup',                          group: 'Leave Setup' },
      { id: 'leave-policy',             label: 'Leave Policy',                         group: 'Leave Setup' },
      { id: 'leave-type',               label: 'Leave Type',                           group: 'Leave Setup' },
      { id: 'leave-balance-rule',       label: 'Leave Balance Rule',                   group: 'Leave Setup' },

      // Leave Operations
      { id: 'leave-request',            label: 'Leave Request',                        group: 'Leave Operations' },
      { id: 'leave-balance',            label: 'Leave Balance',                        group: 'Leave Operations' },
      { id: 'leave-approval',           label: 'Leave Approval',                       group: 'Leave Operations' },
      { id: 'leave-calendar',           label: 'Leave Calendar',                       group: 'Leave Operations' },
      { id: 'holiday-management',       label: 'Holiday Management',                   group: 'Leave Operations' },
      { id: 'half-day-leave',           label: 'Half-Day Leave',                       group: 'Leave Operations' },
      { id: 'leave-adjustment',         label: 'Leave Adjustment',                     group: 'Leave Operations' },

      // Leave Settlement
      { id: 'leave-encashment',         label: 'Leave Encashment',                     group: 'Leave Settlement' },
      { id: 'compensatory-leave',       label: 'Compensatory Leave',                   group: 'Leave Settlement' },

      // Leave Reports
      { id: 'leave-attendance-sync',    label: 'Leave & Attendance Sync',              group: 'Leave Reports' },
      { id: 'leave-analytics',          label: 'Leave Analytics',                      group: 'Leave Reports' },
      { id: 'leave-reports',            label: 'Leave Reports',                        group: 'Leave Reports' },

      // Payroll Setup
      { id: 'payroll-setup',            label: 'Payroll Setup',                        group: 'Payroll Setup' },
      { id: 'salary-structure',         label: 'Salary Structure',         badge: '🔒', group: 'Payroll Setup' },
      { id: 'overtime-payroll',         label: 'Overtime Payroll',                     group: 'Payroll Setup' },
      { id: 'insource-payroll',         label: 'Insource Payroll',                     group: 'Payroll Setup' },
      { id: 'outsource-payroll',        label: 'Outsource Payroll',                    group: 'Payroll Setup' },
      { id: 'vendor-billing-payroll',   label: 'Vendor Billing Payroll',               group: 'Payroll Setup' },
      { id: 'tax-setup',                label: 'Tax Setup',                            group: 'Payroll Setup' },
      { id: 'allowance-setup',          label: 'Allowance',                            group: 'Payroll Setup' },
      { id: 'deduction-setup',          label: 'Deduction',                            group: 'Payroll Setup' },
      { id: 'compliance-setup',         label: 'Compliance Setup',                     group: 'Payroll Setup' },

      // Payroll Processing
      { id: 'automated-payroll',        label: 'Automated Payroll',                    group: 'Payroll Processing' },
      { id: 'overtime-calculation',     label: 'Overtime Calculation',                 group: 'Payroll Processing' },
      { id: 'bonus-processing',         label: 'Bonus Processing',                     group: 'Payroll Processing' },
      { id: 'incentive-processing',     label: 'Incentive Processing',                 group: 'Payroll Processing' },
      { id: 'loan-management',          label: 'Loan Management',                      group: 'Payroll Processing' },
      { id: 'advance-salary',           label: 'Advance Salary',                       group: 'Payroll Processing' },
      { id: 'tax-compliance',           label: 'Tax & Compliance',                     group: 'Payroll Processing' },
      { id: 'vendor-billing-payroll-proc',label: 'Vendor Billing Payroll',             group: 'Payroll Processing' },

      // Payroll Finalization
      { id: 'payroll-approval',         label: 'Payroll Approval',         badge: '🔒', group: 'Payroll Finalization' },
      { id: 'payslip-generation',       label: 'Payslip Generation',                   group: 'Payroll Finalization' },
      { id: 'bank-transfer-file',       label: 'Bank Transfer File',                   group: 'Payroll Finalization' },
      { id: 'final-settlement',         label: 'Final Settlement',                     group: 'Payroll Finalization' },

      // Information
      { id: 'ssf-information',          label: 'Social Security Fund (SSF)',           group: 'Information' },
      { id: 'cit-information',          label: 'Citizen Investment Trust (CIT)',       group: 'Information' },
      { id: 'tax-information',          label: 'TAX',                                  group: 'Information' },

      // Payroll Analytics
      { id: 'payroll-reports',          label: 'Payroll Reports',                      group: 'Payroll Analytics' },
      { id: 'compensation-analytics',   label: 'Compensation Analytics',               group: 'Payroll Analytics' },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 6. PERFORMANCE & TALENT MANAGEMENT
  // ─────────────────────────────────────────────────────────
  {
    id: 'perf-talent',
    icon: '🎯',
    labelKey: 'perfTalent',
    label: 'Performance & Talent',
    children: [
      // Work & Performance
      { id: 'workload-employeewise',    label: 'Workload Analysis — Employeewise',     group: 'Work & Performance' },
      { id: 'workload-departmentwise',  label: 'Workload Analysis — Departmentwise',   group: 'Work & Performance' },

      // Goal Management
      { id: 'kra-management',           label: 'KRA Management',                       group: 'Goal Management' },
      { id: 'kpi-management',           label: 'KPI Management',                       group: 'Goal Management' },
      { id: 'okr-management',           label: 'OKR Management',                       group: 'Goal Management' },
      { id: 'goal-assignment',          label: 'Goal Assignment',                      group: 'Goal Management' },
      { id: 'goal-tracking',            label: 'Goal Tracking',                        group: 'Goal Management' },
      { id: '360-pms',                  label: '360 Degree PMS',                       group: 'Goal Management' },

      // Performance Evaluation
      { id: 'performance-appraisal',    label: 'Performance Appraisal',                group: 'Performance Evaluation' },
      { id: 'continuous-feedback',      label: 'Continuous Feedback',                  group: 'Performance Evaluation' },
      { id: '360-feedback',             label: '360 Degree Feedback',                  group: 'Performance Evaluation' },
      { id: 'behaviour-evaluation',     label: 'Behaviour Evaluation',                 group: 'Performance Evaluation' },
      { id: 'performance-review',       label: 'Performance Review',                   group: 'Performance Evaluation' },
      { id: 'performance-reports',      label: 'Performance Reports',                  group: 'Performance Evaluation' },
      { id: 'stored-daily-tasks',       label: 'Stored Daily Tasks',                   group: 'Performance Evaluation' },
      { id: 'stored-weekly-tasks',      label: 'Stored Weekly Tasks',                  group: 'Performance Evaluation' },
      { id: 'stored-monthly-tasks',     label: 'Stored Monthly Tasks',                 group: 'Performance Evaluation' },
      { id: 'stored-annual-tasks',      label: 'Stored Annual Tasks',                  group: 'Performance Evaluation' },
      { id: 'pip-management',           label: 'Performance Improvement Plan (PIP)',   group: 'Performance Evaluation' },

      // Rewards & Recognition
      { id: 'reward-program',           label: 'Reward Program',                       group: 'Rewards & Recognition' },
      { id: 'recognition-program',      label: 'Recognition Program',                  group: 'Rewards & Recognition' },
      { id: 'promotion-recommendation', label: 'Promotion Recommendation',             group: 'Rewards & Recognition' },
      { id: 'incentive-recommendation', label: 'Incentive Recommendation',             group: 'Rewards & Recognition' },
      { id: 'training-recommendation',  label: 'Training Recommendation',              group: 'Rewards & Recognition' },
      { id: 'termination-recommendation', label: 'Termination Recommendation',         group: 'Rewards & Recognition' },

      // Performance Analytics
      { id: 'performance-dashboard',    label: 'Performance Dashboard',                group: 'Performance Analytics' },
      { id: 'goal-achievement',         label: 'Goal Achievement',                     group: 'Performance Analytics' },
      { id: 'productivity-analytics',   label: 'Productivity Analytics',               group: 'Performance Analytics' },
      { id: 'kpi-transformation-before', label: 'KPI Transformation — Before',          group: 'Performance Analytics' },
      { id: 'kpi-transformation-after',  label: 'KPI Transformation — After',           group: 'Performance Analytics' },
      { id: 'speedometer-recruitment',  label: 'Speedometer — Recruitment',            group: 'Performance Analytics' },
      { id: 'speedometer-compliance',   label: 'Speedometer — Compliance',             group: 'Performance Analytics' },
      { id: 'speedometer-attendance',   label: 'Speedometer — Attendance',             group: 'Performance Analytics' },
      { id: 'speedometer-documentation', label: 'Speedometer — Documentation',         group: 'Performance Analytics' },

      // Learning & Development
      { id: 'skill-gap-matrix',         label: 'Skill Gap Matrix',                     group: 'Learning & Development' },
      { id: 'skill-gap-analysis',       label: 'Skill Gap Analysis',                   group: 'Learning & Development' },
      { id: 'training-request',         label: 'Training Request',                     group: 'Learning & Development' },
      { id: 'training-needs-identification', label: 'Training Needs Identification',   group: 'Learning & Development' },
      { id: 'training-needs-analysis',  label: 'Training Needs Analysis',              group: 'Learning & Development' },
      { id: 'annual-training-calendar', label: 'Annual Training Calendar',             group: 'Learning & Development' },
      { id: 'monthly-training-calendar',label: 'Monthly Training Calendar',            group: 'Learning & Development' },
      { id: 'weekly-training-calendar', label: 'Weekly Training Calendar',             group: 'Learning & Development' },
      { id: 'daily-training-calendar',  label: 'Daily Training Calendar',              group: 'Learning & Development' },
      { id: 'course-management',        label: 'Course Management',                    group: 'Learning & Development' },
      { id: 'learning-portal',          label: 'Learning Portal',                      group: 'Learning & Development' },
      { id: 'elearning-management',     label: 'E-Learning Management',                group: 'Learning & Development' },
      { id: 'generate-certificate',     label: 'Generate Certificate',                 group: 'Learning & Development' },
      { id: 'certification-tracking',   label: 'Certification Tracking',               group: 'Learning & Development' },
      { id: 'training-feedback',        label: 'Training Feedback',                    group: 'Learning & Development' },
      { id: 'training-effectiveness',  label: 'Effectiveness of Training',            group: 'Learning & Development' },
      { id: 'training-roi',            label: 'ROI on Training',                      group: 'Learning & Development' },
      { id: 'assessment-quiz',          label: 'Assessment & Quiz',                    group: 'Learning & Development' },
      { id: 'training-participation',   label: 'Training Participation List',          group: 'Learning & Development' },
      { id: 'training-reports',         label: 'Training Reports',                     group: 'Learning & Development' },

      // Career Development
      { id: 'career-pathing',           label: 'Career Pathing',                       group: 'Career Development' },
      { id: 'employee-dev-plan',        label: 'Employee Development Plan',            group: 'Career Development' },
      { id: 'training-portfolio',       label: 'Training Portfolio',                   group: 'Career Development' },
      { id: 'leadership-development',   label: 'Leadership Development',               group: 'Career Development' },

      // Succession Planning
      { id: 'successor-identification', label: 'Successor Identification',             group: 'Succession Planning' },
      { id: 'talent-mapping',           label: 'Talent Mapping',                       group: 'Succession Planning' },
      { id: 'hipo-employees',           label: 'HiPo Employees (High Potential)',      group: 'Succession Planning' },
      { id: 'readiness-assessment',     label: 'Readiness Assessment',                 group: 'Succession Planning' },
      { id: 'leadership-pipeline',      label: 'Leadership Pipeline',                  group: 'Succession Planning' },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 7. EMPLOYEE EXPERIENCE & CULTURE
  // ─────────────────────────────────────────────────────────
  {
    id: 'emp-experience',
    icon: '❤️',
    labelKey: 'empExperience',
    label: 'Employee Experience & Culture',
    children: [
      // Employee Engagement
      { id: 'engagement-dashboard',     label: 'Engagement Dashboard',                 group: 'Engagement' },
      { id: 'announcement-board',       label: 'Announcement Board',                   group: 'Engagement' },
      { id: 'employee-engagement',      label: 'Employee Engagement',                  group: 'Engagement' },
      { id: 'employee-social-feed',     label: 'Employee Hub (Social Feed)',            group: 'Engagement' },
      { id: 'employee-survey',          label: 'Employee Survey',                      group: 'Engagement' },
      { id: 'employee-feedback',        label: 'Employee Feedback',                    group: 'Engagement' },
      { id: 'suggestion-box',           label: 'Suggestion Box',                       group: 'Engagement' },
      { id: 'employee-events',          label: 'Employee Events',                      group: 'Engagement' },
      { id: 'appreciation-program',     label: 'Appreciation Program',                 group: 'Engagement' },
      { id: 'internal-communication',   label: 'Internal Communication',               group: 'Engagement' },

      // Employee Relations
      { id: 'grievance-management',     label: 'Grievance Management',                 group: 'Employee Relations' },
      { id: 'complaint-management',     label: 'Complaint Management',                 group: 'Employee Relations' },
      { id: 'conflict-resolution',      label: 'Conflict Resolution',                  group: 'Employee Relations' },
      { id: 'disciplinary-management',  label: 'Disciplinary Management',              group: 'Employee Relations' },
      { id: 'warning-letter',           label: 'Warning Letter',                       group: 'Employee Relations' },

      // Wellness & Support
      { id: 'wellness-program',         label: 'Wellness Program',                     group: 'Wellness & Support' },
      { id: 'mental-health-support',    label: 'Mental Health Support',                group: 'Wellness & Support' },
      { id: 'insurance-management',     label: 'Insurance Management',                 group: 'Wellness & Support' },
      { id: 'emergency-support',        label: 'Emergency Support',                    group: 'Wellness & Support' },
      { id: 'employee-assistance',      label: 'Employee Assistance Program',          group: 'Wellness & Support' },

      // Diversity & Inclusion
      { id: 'diversity-dashboard',      label: 'Diversity Dashboard',                  group: 'Diversity & Inclusion' },
      { id: 'gender-analytics',         label: 'Gender Analytics',                     group: 'Diversity & Inclusion' },
      { id: 'inclusion-program',        label: 'Inclusion Program',                    group: 'Diversity & Inclusion' },
      { id: 'dei-training',             label: 'DEI Training',                         group: 'Diversity & Inclusion' },
      { id: 'accessibility-support',    label: 'Accessibility Support',                group: 'Diversity & Inclusion' },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 8. HR SERVICES & SUPPORT
  // ─────────────────────────────────────────────────────────
  {
    id: 'hr-services',
    icon: '🎧',
    labelKey: 'hrServices',
    label: 'HR Services & Support',
    children: [
      // HR Helpdesk
      { id: 'hr-ticketing',             label: 'HR Ticketing System',                  group: 'HR Helpdesk' },
      { id: 'employee-queries',         label: 'Employee Queries',                     group: 'HR Helpdesk' },
      { id: 'hr-consultation',          label: 'HR Consultation',                      group: 'HR Helpdesk' },
      { id: 'case-tracking',            label: 'Case Tracking',                        group: 'HR Helpdesk' },

      // Employee Self Service (ESS)
      { id: 'my-policies',              label: 'My HR Policies',         badge: '📋',  group: 'ESS' },
      { id: 'my-profile',               label: 'My Profile',                           group: 'ESS' },
      { id: 'profile-update',           label: 'Profile Update',                       group: 'ESS' },
      { id: 'my-documents',             label: 'My Documents',                         group: 'ESS' },
      { id: 'my-digital-signature',     label: 'My Digital Signature',                 group: 'ESS' },
      { id: 'my-training-certificates', label: 'My Internal Training Certificates',    group: 'ESS' },
      { id: 'employment-contract',      label: 'Employment Contract',                  group: 'ESS' },
      { id: 'my-dress-code',            label: 'My Dress Code',                        group: 'ESS' },
      { id: 'my-daily-activity',        label: 'My Daily Activity Report',             group: 'ESS' },
      { id: 'my-attendance-ess',        label: 'My Attendance',                        group: 'ESS' },
      { id: 'attendance-request',       label: 'Attendance Request',                   group: 'ESS' },
      { id: 'overtime-request',         label: 'Overtime Request',                     group: 'ESS' },
      { id: 'my-field-visit',           label: 'My Field Visit',                       group: 'ESS' },
      { id: 'field-visit-expenses',     label: 'Submit Field Visit Expenses',          group: 'ESS' },
      { id: 'cash-advance-bills',       label: 'Submit Cash Advance Bills',            group: 'ESS' },
      { id: 'my-leave-ess',             label: 'My Leave',                             group: 'ESS' },
      { id: 'leave-request-ess',        label: 'Leave Request',                        group: 'ESS' },
      { id: 'letter-request',           label: 'Letter Request',                       group: 'ESS' },
      { id: 'my-payroll-ess',           label: 'My Payroll',                           group: 'ESS' },
      { id: 'payslip-download',         label: 'Payslip Download',                     group: 'ESS' },
      { id: 'minutes-of-meeting-ess',   label: 'Minutes of Meeting',                   group: 'ESS' },
      { id: 'my-goals-kpi',             label: 'My Goals & KPI',                       group: 'ESS' },
      { id: 'my-training-ess',          label: 'My Training',                          group: 'ESS' },
      { id: 'my-requests',              label: 'My Requests',                          group: 'ESS' },
      { id: 'my-activity-today',        label: 'My Activity Today',                    group: 'ESS' },
      { id: 'my-activity-week',         label: 'My Activity This Week',                group: 'ESS' },
      { id: 'my-activity-month',        label: 'My Activity This Month',               group: 'ESS' },
      { id: 'my-activity-quarter',      label: 'My Activity This Quarter',             group: 'ESS' },
      { id: 'my-activity-year',         label: 'My Activity This Year',                group: 'ESS' },
      { id: 'my-feedback-ess',          label: 'My Feedback',                          group: 'ESS' },
      { id: 'my-resignation',           label: 'My Resignation',                       group: 'ESS' },
      { id: 'helpdesk-ticket',          label: 'Helpdesk & Ticket',                    group: 'ESS' },

      // Manager Self Service (MSS)
      { id: 'team-daily-activity',      label: 'Team Daily Activity Report',           group: 'MSS' },
      { id: 'team-dashboard-mss',       label: 'Team Dashboard',                       group: 'MSS' },
      { id: 'team-attendance',          label: 'Team Attendance',                      group: 'MSS' },
      { id: 'overtime-forward',         label: 'Overtime Forward',                     group: 'MSS' },
      { id: 'approval-center',          label: 'Approval Center',                      group: 'MSS' },
      { id: 'approve-resignation',      label: 'Approve Resignation',                  group: 'MSS' },
      { id: 'team-performance-mss',     label: 'Team Performance',                     group: 'MSS' },
      { id: 'performance-review-mss',   label: 'Performance Review',                   group: 'MSS' },
      { id: 'team-activity-today',      label: 'Team Activity Today',                  group: 'MSS' },
      { id: 'team-activity-week',       label: 'Team Activity This Week',              group: 'MSS' },
      { id: 'team-activity-month',      label: 'Team Activity This Month',             group: 'MSS' },
      { id: 'team-activity-quarter',    label: 'Team Activity This Quarter',           group: 'MSS' },
      { id: 'team-activity-year',       label: 'Team Activity This Year',              group: 'MSS' },
      { id: 'forward-cash-advance',     label: 'Forward Cash Advance Request',         group: 'MSS' },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 9. FINANCE, ASSETS & ADMINISTRATION
  // ─────────────────────────────────────────────────────────
  {
    id: 'finance-assets',
    icon: '💰',
    labelKey: 'financeAssets',
    label: 'Finance, Assets & Admin',
    children: [
      // HR Budgeting
      { id: 'annual-hr-budget',         label: 'Annual HR Budget',                     group: 'HR Budgeting' },
      { id: 'department-budget',        label: 'Department Budget',                    group: 'HR Budgeting' },
      { id: 'recruitment-budget',       label: 'Recruitment Budget',                   group: 'HR Budgeting' },
      { id: 'training-budget',          label: 'Training Budget',                      group: 'HR Budgeting' },
      { id: 'engagement-budget',        label: 'Engagement Budget',                    group: 'HR Budgeting' },
      { id: 'payroll-budget',           label: 'Payroll Budget',                       group: 'HR Budgeting' },
      { id: 'budget-forecasting',       label: 'Budget Forecasting',                   group: 'HR Budgeting' },
      { id: 'budget-variance-analysis', label: 'Budget Variance Analysis',             group: 'HR Budgeting' },

      // Asset & Inventory
      { id: 'asset-management',         label: 'Asset Management',                     group: 'Asset & Inventory' },
      { id: 'it-inventory',             label: 'IT Inventory',                         group: 'Asset & Inventory' },
      { id: 'furniture-inventory',      label: 'Furniture Inventory',                  group: 'Asset & Inventory' },
      { id: 'stationery-inventory',     label: 'Stationery Inventory',                 group: 'Asset & Inventory' },
      { id: 'asset-allocation-fin',     label: 'Asset Allocation',                     group: 'Asset & Inventory' },
      { id: 'asset-return',             label: 'Asset Return',                         group: 'Asset & Inventory' },
      { id: 'qr-barcode-tracking',      label: 'QR / Barcode Tracking',               group: 'Asset & Inventory' },
      { id: 'warranty-tracking',        label: 'Warranty Tracking',                    group: 'Asset & Inventory' },
      { id: 'vendor-management-asset',  label: 'Vendor Management',                    group: 'Asset & Inventory' },

      // Administrative Operations
      { id: 'visitor-management',       label: 'Visitor Management',                   group: 'Admin Operations' },
      { id: 'meeting-room-booking',     label: 'Meeting Room Booking',                 group: 'Admin Operations' },
      { id: 'minutes-of-meeting-admin', label: 'Minutes of Meeting',                  group: 'Admin Operations' },
      { id: 'travel-management',        label: 'Travel Management',                    group: 'Admin Operations' },
      { id: 'transport-management',     label: 'Transport Management',                 group: 'Admin Operations' },
      { id: 'cafeteria-management',     label: 'Cafeteria Management',                 group: 'Admin Operations' },
      { id: 'helpdesk-admin',           label: 'Helpdesk',                             group: 'Admin Operations' },
      { id: 'facility-management',      label: 'Facility Management',                  group: 'Admin Operations' },
      { id: 'gate-pass',                label: 'Gate Pass Management',                 group: 'Admin Operations' },
      { id: 'id-card-management',       label: 'ID Card Management',                   group: 'Admin Operations' },
      { id: 'event-management',         label: 'Event Management',                     group: 'Admin Operations' },

      // Finance & Claims
      { id: 'expense-claims',           label: 'Expense Claims',                       group: 'Finance & Claims' },
      { id: 'travel-request',           label: 'Travel Request',                       group: 'Finance & Claims' },
      { id: 'reimbursement',            label: 'Reimbursement',                        group: 'Finance & Claims' },
      { id: 'petty-cash',               label: 'Petty Cash Claim',                     group: 'Finance & Claims' },
      { id: 'mobile-fuel-claim',        label: 'Mobile & Fuel Claim',                  group: 'Finance & Claims' },
      { id: 'approval-workflow-fin',    label: 'Approval Workflow',                    group: 'Finance & Claims' },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 10. COMPLIANCE & RISK MANAGEMENT
  // ─────────────────────────────────────────────────────────
  {
    id: 'compliance',
    icon: '⚖️',
    labelKey: 'compliance',
    label: 'Compliance & Risk',
    children: [
      // HR Policy Library — MANDATORY READ & SIGN
      { id: 'draft-hr-policy',          label: 'Draft HR Policy',        badge:'AI',  group: 'HR Policies' },
      { id: 'publish-hr-policy',        label: 'Publish HR Policy',                   group: 'HR Policies' },
      { id: 'hr-policy-library',        label: 'HR Policy Library',      badge: '20', group: 'HR Policies' },
      { id: 'implement-hr-policy',      label: 'Implement HR Policy',                 group: 'HR Policies' },
      { id: 'policy-readers',           label: 'Policy Readers',                      group: 'HR Policies' },
      { id: 'hr-policies',              label: 'All Policies (44)',       badge: '44', group: 'HR Policies' },
      { id: 'policy-acknowledgment',    label: 'My Policy Sign Status',  badge: '!',  group: 'HR Policies' },
      { id: 'policy-compliance-report', label: 'Policy Compliance Report',            group: 'HR Policies' },

      // Compliance Management
      { id: 'labor-compliance',         label: 'Labor Compliance',                     group: 'Compliance Management' },
      { id: 'statutory-compliance',     label: 'Statutory Compliance',                 group: 'Compliance Management' },
      { id: 'policy-compliance',        label: 'Policy Compliance',                    group: 'Compliance Management' },
      { id: 'hr-audit-management',      label: 'HR Audit Management',                  group: 'Compliance Management' },
      { id: 'annual-labour-audit',      label: 'Annual Labour Audit',                  group: 'Compliance Management' },
      { id: 'license-management',       label: 'License Management',                   group: 'Compliance Management' },

      // Risk Management
      { id: 'kri-dashboard',            label: 'KRI Dashboard',                        group: 'Risk Management' },
      { id: 'compliance-risk',          label: 'Compliance Risk',                      group: 'Risk Management' },
      { id: 'payroll-risk',             label: 'Payroll Risk',                         group: 'Risk Management' },
      { id: 'attrition-risk',           label: 'Attrition Risk',                       group: 'Risk Management' },
      { id: 'security-risk',            label: 'Security Risk',                        group: 'Risk Management' },
      { id: 'risk-alerts',              label: 'Risk Alerts',            badge: '!',   group: 'Risk Management' },

      // Legal Management
      { id: 'legal-case-tracking',      label: 'Legal Case Tracking',                  group: 'Legal Management' },
      { id: 'contract-compliance',      label: 'Contract Compliance',                  group: 'Legal Management' },
      { id: 'ethics-governance',        label: 'Ethics & Governance',                  group: 'Legal Management' },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 11. REPORTS, ANALYTICS & BI
  // ─────────────────────────────────────────────────────────
  {
    id: 'reports',
    icon: '📈',
    labelKey: 'reports',
    label: 'Reports, Analytics & BI',
    children: [
      // Standard Reports
      { id: 'hr-analytics-page',        label: 'HR Analytics',                         group: 'Standard Reports' },
      { id: 'workforce-summary',        label: 'Workforce Summary',                    group: 'Standard Reports' },
      { id: 'department-reports',       label: 'Department Reports',                   group: 'Standard Reports' },
      { id: 'attendance-reports-page',  label: 'Attendance Reports',                   group: 'Standard Reports' },
      { id: 'training-reports-page',    label: 'Training Reports',                     group: 'Standard Reports' },
      { id: 'payroll-reports-std',      label: 'Payroll Reports',          badge: '🔒', group: 'Standard Reports' },
      { id: 'recruitment-reports',      label: 'Recruitment Reports',                  group: 'Standard Reports' },
      { id: 'performance-reports-page', label: 'Performance Reports',                  group: 'Standard Reports' },
      { id: 'leave-reports-page',       label: 'Leave Reports',                        group: 'Standard Reports' },

      // HR Analytics
      { id: 'headcount-analysis-page',  label: 'Headcount Analysis',                   group: 'HR Analytics' },
      { id: 'attrition-analysis',       label: 'Attrition Analysis',                   group: 'HR Analytics' },
      { id: 'productivity-analysis',    label: 'Productivity Analysis',                group: 'HR Analytics' },
      { id: 'cost-analysis',            label: 'Cost Analysis',                        group: 'HR Analytics' },
      { id: 'vendor-headcount',         label: 'Vendor-wise Headcount',                group: 'HR Analytics' },
      { id: 'outsource-attendance-rpt', label: 'Outsource Attendance Report',          group: 'HR Analytics' },
      { id: 'vendor-billing-report',    label: 'Vendor Billing Report',                group: 'HR Analytics' },
      { id: 'insource-outsource-cost',  label: 'Insource vs Outsource Cost Report',    group: 'HR Analytics' },
      { id: 'compliance-reports',       label: 'Compliance Reports',                   group: 'HR Analytics' },
      { id: 'workforce-analytics',      label: 'Workforce Analytics',                  group: 'HR Analytics' },
      { id: 'annual-hr-audit',         label: 'Annual HR Audit',                      group: 'HR Analytics' },

      // Advanced Analytics
      { id: 'predictive-analytics-page',label: 'Predictive Analytics',    badge: 'AI', group: 'Advanced Analytics' },
      { id: 'ai-insights-page',         label: 'AI Insights',              badge: 'AI', group: 'Advanced Analytics' },
      { id: 'bi-dashboard',             label: 'BI Dashboard (Business Intelligence)', group: 'Advanced Analytics' },
      { id: 'custom-report-builder',    label: 'Custom Report Builder',                group: 'Advanced Analytics' },
      { id: 'export-center',            label: 'Export Center',                        group: 'Advanced Analytics' },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 12. SYSTEM ADMINISTRATION
  // ─────────────────────────────────────────────────────────
  {
    id: 'sys-admin',
    icon: '🔧',
    labelKey: 'sysAdmin',
    label: 'System Administration',
    children: [
      // User & Access
      { id: 'user-management',          label: 'User Management',                      group: 'User & Access' },
      { id: 'role-permission',          label: 'Role & Permission',                    group: 'User & Access' },
      { id: 'permission-management', label: 'Permission Management', icon: '🔐', group: 'Access Control', badge: 'NEW', desc: 'Assign & revoke user/role access' },
      { id: 'permission-matrix',        label: 'Permission Matrix',                    group: 'User & Access' },
      { id: 'access-control',           label: 'Access Control',                       group: 'User & Access' },
      { id: 'menu-management',          label: 'Menu Management',                      group: 'User & Access' },

      // Workflow & Automation
      { id: 'workflow-builder',         label: 'Workflow Builder',                     group: 'Workflow & Automation' },
      { id: 'auto-reminder-setup',      label: 'Auto Reminder Setup',                  group: 'Workflow & Automation' },
      { id: 'approval-matrix',          label: 'Approval Matrix / Workflow Setup',     group: 'Workflow & Automation' },
      { id: 'multi-level-approval',     label: 'Multi-Level Approval',                 group: 'Workflow & Automation' },
      { id: 'notification-engine',      label: 'Notification Engine',                  group: 'Workflow & Automation' },
      { id: 'escalation-rules',         label: 'Escalation Rules',                     group: 'Workflow & Automation' },
      { id: 'automation-rules',         label: 'Automation Rules',                     group: 'Workflow & Automation' },

      // Integration & API
      { id: 'api-integration',          label: 'API & Third Party Integration',        group: 'Integration & API' },
      { id: 'integration-hub',          label: 'Integration Hub',                      group: 'Integration & API' },
      { id: 'email-sms-integration',    label: 'Email & SMS Integration',              group: 'Integration & API' },
      { id: 'biometric-setup',          label: 'Biometric Integration',                group: 'Integration & API' },

      // Mobile App Configuration
      { id: 'mobile-configuration',     label: 'Mobile App Configuration',             group: 'Mobile App' },
      { id: 'mobile-attendance',        label: 'Mobile Attendance',                    group: 'Mobile App' },
      { id: 'gps-tracking-config',      label: 'GPS Tracking',                         group: 'Mobile App' },
      { id: 'geo-fencing-mobile-config', label: 'Geo-Fencing',                         group: 'Mobile App' },
      { id: 'field-visit-tracking-cfg', label: 'Field Visit Tracking',                 group: 'Mobile App' },
      { id: 'route-monitoring',         label: 'Route Monitoring',                     group: 'Mobile App' },
      { id: 'field-task-management',    label: 'Field Task Management',                group: 'Mobile App' },

      // Operations
      { id: 'data-migration',            label: 'Data Migration',                       group: 'Operations' },

      // System Settings
      { id: 'dashboard-customization',  label: 'Dashboard Customization',              group: 'System Settings' },
      { id: 'custom-form-builder',      label: 'Custom Form Builder',                  group: 'System Settings' },
      { id: 'report-builder',           label: 'Report Builder',                       group: 'System Settings' },
      { id: 'security-settings',        label: 'Security Settings',                    group: 'System Settings' },
      { id: 'audit-logs',               label: 'Audit Logs',                           group: 'System Settings' },
      { id: 'device-integration',       label: 'Device Integration',                   group: 'System Settings' },
      { id: 'backup-restore',           label: 'Backup & Restore',                     group: 'System Settings' },
      { id: 'system-setting',           label: 'System Setting',                       group: 'System Settings' },
    ],
  },
]

// ── Helper: Find menu item by id ─────────────────────────────
export const findMenuItemById = (id) => {
  for (const menu of SIDEBAR_MENU) {
    const child = menu.children?.find(c => c.id === id)
    if (child) return { menu, child }
  }
  return null
}

// ── Helper: Get label for any page id ───────────────────────
export const getLabelById = (id) => {
  const result = findMenuItemById(id)
  return result?.child?.label || id
}

// ── Helper: Get all ids flat list ────────────────────────────
export const getAllPageIds = () => {
  return SIDEBAR_MENU.flatMap(m => m.children?.map(c => c.id) || [])
}

export default SIDEBAR_MENU

// ════════════════════════════════════════════════════════════════════
// PLAN-BASED SIDEBAR FILTERING
// Maps every plan to which TOP-LEVEL section IDs and child item IDs
// are visible. Everything NOT in this list is hidden for that plan.
//
// Based on the official eLogix plan features table:
//   Trial   → Core basics only (ESS, Attendance, Leave)
//   Starter → + Payroll, Recruitment
//   Growth  → + Performance, Training, Multi-branch, Reports, AI
//   Business→ + Advanced Analytics, API, SSO
//   Enterprise → + White Label, On-site, Dedicated
//   Unlimited  → Everything
// ════════════════════════════════════════════════════════════════════

// ── PLAN → MODULE IDs (matches tenantPermissions.js module keys) ──
export const PLAN_VISIBLE_SECTIONS = {
  trial: {
    // Only show these top-level section IDs
    sections: ['dashboard', 'hr-services', 'sys-admin'],
    // Within those sections, only these child IDs
    items: new Set([
      // Dashboard basics
      'attendance-snapshot','leave-snapshot','calendar-events',
      'notifications','upcoming-events','birthday-anniversary',
      // ESS
      'my-profile','my-documents','my-attendance-ess','my-leave-ess',
      'leave-request-ess','attendance-request','my-policies',
      'my-daily-activity','helpdesk-ticket',
      // Leave & Attendance (limited)
      'leave-request','leave-balance','leave-calendar',
      'live-attendance','web-check-in',
      // Very basic sys admin
      'user-management',
    ]),
  },

  starter: {
    sections: ['dashboard','workforce-ops','hr-services','sys-admin','org-mgmt'],
    items: new Set([
      // Dashboard
      'attendance-snapshot','leave-snapshot','payroll-snapshot',
      'recruitment-snapshot','calendar-events','notifications',
      'upcoming-events','birthday-anniversary','roster-details',
      // Org (basic)
      'company-profile','company-setup','department-setup','designation-setup',
      'branch-location-setup','shift-setup','holiday-calendar',
      // Attendance
      'live-attendance','web-check-in','missed-punch','attendance-regularization',
      'leave-request','leave-balance','leave-approval','leave-calendar',
      'leave-setup','leave-policy','leave-type','leave-reports',
      'attendance-policy','attendance-reports',
      // Payroll
      'payroll-setup','salary-structure','tax-setup','allowance-setup',
      'deduction-setup','automated-payroll','payslip-generation',
      'ssf-information','cit-information','tax-information',
      'payroll-reports',
      // Recruitment (basic)
      'recruitment-mgmt-dash','job-posting','vacancy-management',
      'candidate-database','interview-scheduling','offer-management',
      // ESS
      'my-profile','my-documents','my-attendance-ess','my-leave-ess',
      'leave-request-ess','attendance-request','my-payroll-ess',
      'payslip-download','my-policies','helpdesk-ticket',
      // Sys admin
      'user-management','role-permission','security-settings',
    ]),
  },

  growth: {
    sections: ['dashboard','org-mgmt','emp-lifecycle','workforce-ops',
               'perf-talent','hr-services','compliance','reports','sys-admin'],
    items: new Set([
      // Everything from starter PLUS:
      // Dashboard
      'attendance-snapshot','leave-snapshot','payroll-snapshot',
      'recruitment-snapshot','performance-snapshot','engagement-snapshot',
      'onboarding-month','calendar-events','notifications',
      'upcoming-events','birthday-anniversary','tenure-chart',
      'age-group','blood-group','contract-expiry','ai-insights',
      'roster-details','headcount-analysis',
      // Org (full)
      'company-profile','company-setup','group-company',
      'branch-location-setup','business-unit-setup',
      'department-setup','section-unit','team-setup',
      'cost-center','work-location','employment-category',
      'designation-setup','grade-level','reporting-hierarchy',
      'position-management','org-chart','process-flow',
      'holiday-calendar','weekend-policy','shift-setup',
      // Employee Lifecycle
      'recruitment-mgmt-dash','ats-dashboard','ats-career-portal',
      'ats-job-requisition','ats-command-center','manpower-requisition',
      'create-job-description','jd-library','ats-multipost','job-posting',
      'ats-job-manager','vacancy-management','ats-candidate-pipeline',
      'candidate-database','resume-screening','interview-scheduling',
      'ats-interview-panel','interview-management','offer-management',
      'ats-onboarding','background-verification',
      'employee-joining','employee-enrollment','orientation-program',
      'employee-directory','employee-profile','personal-information',
      'family-details','emergency-contact','employee-assets',
      'employment-history','document-management','digital-employee-file',
      'ai-hr-letters','promotion-history','transfer-history',
      'resignation-management','exit-clearance','full-final-settlement',
      'attrition-dashboard',
      // Headcount planning
      'headcount-planning','replacement-planning','expansion-planning',
      'vacancy-planning','resource-allocation',
      // Attendance & Leave (full)
      'attendance-policy','shift-management','roster-management',
      'biometric-integration','gps-attendance','geo-fencing',
      'live-attendance','biometric-attendance','geo-attendance',
      'web-check-in','missed-punch','wfh-tracking',
      'attendance-regularization','overtime-monitoring-dashboard',
      'overtime-management','attendance-processing','attendance-approval',
      'attendance-reports','leave-setup','leave-policy','leave-type',
      'leave-request','leave-balance','leave-approval','leave-calendar',
      'leave-encashment','leave-analytics','leave-reports',
      // Payroll (full)
      'payroll-setup','salary-structure','tax-setup','allowance-setup',
      'deduction-setup','compliance-setup','automated-payroll',
      'payroll-approval','payslip-generation','bank-transfer-file',
      'ssf-information','cit-information','payroll-reports',
      // Performance & Talent
      'kra-management','kpi-management','okr-management',
      'goal-assignment','goal-tracking',
      'performance-appraisal','continuous-feedback','performance-review',
      'performance-reports','performance-dashboard',
      'skill-gap-matrix','skill-gap-analysis','training-request',
      'annual-training-calendar','course-management','learning-portal',
      'training-feedback','training-reports','career-pathing',
      // ESS + MSS (full)
      'my-profile','my-documents','my-attendance-ess','my-leave-ess',
      'leave-request-ess','attendance-request','my-payroll-ess',
      'payslip-download','my-policies','helpdesk-ticket','my-goals-kpi',
      'my-training-ess','letter-request','my-resignation',
      'team-dashboard-mss','team-attendance','approval-center',
      'team-performance-mss','performance-review-mss',
      // Compliance
      'hr-policy-library','hr-policies','policy-acknowledgment',
      'labor-compliance','statutory-compliance','compliance-reports',
      // Reports (standard + some advanced)
      'hr-analytics-page','workforce-summary','department-reports',
      'attendance-reports-page','payroll-reports-std',
      'recruitment-reports','performance-reports-page','leave-reports-page',
      'headcount-analysis-page','attrition-analysis','workforce-analytics',
      'custom-report-builder',
      // Sys admin
      'user-management','role-permission','permission-management',
      'permission-matrix','workflow-builder','approval-matrix',
      'data-migration','security-settings','audit-logs','system-setting',
    ]),
  },

  business: {
    // Business gets everything Growth has + Advanced Analytics, API, SSO, Dedicated support
    sections: ['dashboard','org-mgmt','emp-lifecycle','workforce-ops',
               'perf-talent','emp-experience','hr-services',
               'finance-assets','compliance','reports','sys-admin'],
    items: 'GROWTH_PLUS_BUSINESS', // signal to filter function
  },

  enterprise: {
    sections: 'ALL',
    items: 'ALL',
  },

  unlimited: {
    sections: 'ALL',
    items: 'ALL',
  },
}

// ── BUSINESS TYPE → SECTION VISIBILITY ───────────────────────────
// Certain sections are only relevant for specific business types.
// Hides irrelevant sections entirely from sidebar.
export const BUSINESS_TYPE_VISIBLE_SECTIONS = {
  recruitment_agency: [
    'dashboard','org-mgmt','emp-lifecycle','workforce-ops',
    'hr-services','reports','sys-admin',
    // recruitment agencies see emp-lifecycle heavily (ATS is their core)
  ],
  bank_finance: [
    'dashboard','org-mgmt','emp-lifecycle','workforce-ops',
    'perf-talent','emp-experience','hr-services',
    'finance-assets','compliance','reports','sys-admin',
  ],
  hospital_health: [
    'dashboard','org-mgmt','emp-lifecycle','workforce-ops',
    'perf-talent','hr-services','compliance','reports','sys-admin',
  ],
  ngo_ingo: [
    'dashboard','org-mgmt','emp-lifecycle','workforce-ops',
    'hr-services','finance-assets','compliance','reports','sys-admin',
  ],
  it_software: [
    'dashboard','org-mgmt','emp-lifecycle','workforce-ops',
    'perf-talent','emp-experience','hr-services',
    'compliance','reports','sys-admin',
    // + AI heavily
  ],
  manufacturing: [
    'dashboard','org-mgmt','emp-lifecycle','workforce-ops',
    'perf-talent','hr-services','finance-assets','compliance','reports','sys-admin',
  ],
  hotel_hospitality: [
    'dashboard','org-mgmt','emp-lifecycle','workforce-ops',
    'emp-experience','hr-services','finance-assets','reports','sys-admin',
  ],
  education: [
    'dashboard','org-mgmt','emp-lifecycle','workforce-ops',
    'perf-talent','emp-experience','hr-services','compliance','reports','sys-admin',
  ],
  government: [
    'dashboard','org-mgmt','emp-lifecycle','workforce-ops',
    'hr-services','finance-assets','compliance','reports','sys-admin',
  ],
  custom: 'ALL',
}

// ─────────────────────────────────────────────────────────────────────
// MAIN FILTER FUNCTION
// Call this in Sidebar.jsx and QuickDock.jsx to filter what's visible.
//
// Usage:
//   import { getVisibleMenu } from './sidebarMenu.js'
//   const menu = getVisibleMenu(plan, businessType, grantedModules)
//
// @param plan          {string}   - tenant's plan key
// @param businessType  {string}   - tenant's business_type
// @param grantedModules{string[]} - modules from tenantPermissions.js
// @returns {Array}     filtered SIDEBAR_MENU
// ─────────────────────────────────────────────────────────────────────
export function getVisibleMenu(plan, businessType, grantedModules = []) {
  const planKey   = plan || 'trial'
  const bizType   = businessType || 'custom'
  const planCfg   = PLAN_VISIBLE_SECTIONS[planKey] || PLAN_VISIBLE_SECTIONS.trial
  const grantedSet= new Set(grantedModules)

  // Enterprise / Unlimited — show everything
  if (planCfg.sections === 'ALL') return SIDEBAR_MENU

  // Which top-level sections are allowed by BOTH plan AND business type
  const bizSections = BUSINESS_TYPE_VISIBLE_SECTIONS[bizType]
  const planSections = new Set(planCfg.sections)

  const allowedSections = bizSections === 'ALL'
    ? planSections
    : new Set([...planCfg.sections].filter(s => bizSections.includes(s)))

  // For Business plan: combine Growth items + add advanced items
  let allowedItems = planCfg.items
  if (planCfg.items === 'GROWTH_PLUS_BUSINESS') {
    const growthItems = PLAN_VISIBLE_SECTIONS.growth.items
    // Business adds: Advanced analytics, API, SSO, finance-assets, emp-experience
    const businessExtras = new Set([
      // Advanced analytics
      'predictive-analytics-page','ai-insights-page','bi-dashboard',
      'export-center','ai-business-intelligence','ai-hr-analytics',
      'ai-attrition-prediction','ai-performance-insights',
      // API & SSO
      'api-integration','integration-hub','email-sms-integration',
      'biometric-setup','security-settings','sso',
      // Employee Experience
      'engagement-dashboard','announcement-board','employee-engagement',
      'employee-survey','grievance-management','wellness-program',
      'diversity-dashboard',
      // Finance & Assets
      'annual-hr-budget','department-budget','asset-management',
      'expense-claims','travel-management','reimbursement',
      // Performance extras
      '360-feedback','pip-management','reward-program',
      'recognition-program','succession-planning',
      'successor-identification','talent-mapping','hipo-employees',
    ])
    allowedItems = new Set([...growthItems, ...businessExtras])
  }

  return SIDEBAR_MENU
    .filter(section => allowedSections.has(section.id))
    .map(section => {
      // If items = 'ALL' (enterprise) keep all children
      if (allowedItems === 'ALL') return section

      const visibleChildren = (section.children || []).filter(child => {
        // Must be in plan's allowed items
        if (!allowedItems.has(child.id)) return false
        // Must also pass tenantPermissions module grant (if we have them)
        // If no grants yet, use plan items as gate
        return true
      })

      return visibleChildren.length > 0
        ? { ...section, children: visibleChildren }
        : null
    })
    .filter(Boolean)
}

// ─────────────────────────────────────────────────────────────────────
// QUICKDOCK FILTER
// Filters dock items to only show pages the tenant has access to.
//
// @param dockItems     {Array}    - DOCK_CONFIGS[persona]
// @param plan          {string}
// @param grantedModules{string[]}
// @returns {Array}     filtered dock items
// ─────────────────────────────────────────────────────────────────────
export function getVisibleDockItems(dockItems, plan, grantedModules = []) {
  const planKey  = plan || 'trial'
  const planCfg  = PLAN_VISIBLE_SECTIONS[planKey] || PLAN_VISIBLE_SECTIONS.trial
  const granted  = new Set(grantedModules)

  // Enterprise/Unlimited — all items visible
  if (planCfg.items === 'ALL') return dockItems

  let allowedItems = planCfg.items
  if (planCfg.items === 'GROWTH_PLUS_BUSINESS') {
    allowedItems = new Set([
      ...PLAN_VISIBLE_SECTIONS.growth.items,
      'predictive-analytics-page','bi-dashboard','api-integration',
    ])
  }

  return dockItems.filter(item => {
    // Always show: notifications, AI co-pilot (action items)
    if (item.action) return true
    // Dashboard landing pages always show
    if (!item.page) return true
    // Check if page is in allowed items
    if (allowedItems === 'ALL') return true
    return allowedItems.has(item.page)
  })
}
