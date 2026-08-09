// ============================================
// FILE: src/data/mockData.js
// PURPOSE: Demo/anonymized data for all dashboards
// NOTE: In production, replace with real API calls
// ============================================

// ── Attendance Data ──
export const attendanceData = [
  { month: 'Jan', present: 1100, leave: 80,  absent: 20 },
  { month: 'Feb', present: 1080, leave: 90,  absent: 30 },
  { month: 'Mar', present: 1150, leave: 70,  absent: 30 },
  { month: 'Apr', present: 1090, leave: 85,  absent: 25 },
  { month: 'May', present: 1087, leave: 163, absent: 0  },
  { month: 'Jun', present: 1120, leave: 110, absent: 20 },
]

// ── Payroll Data ──
export const payrollData = [
  { month: 'Jan', amount: 3800000, budget: 4000000 },
  { month: 'Feb', amount: 3900000, budget: 4000000 },
  { month: 'Mar', amount: 4000000, budget: 4100000 },
  { month: 'Apr', amount: 4100000, budget: 4100000 },
  { month: 'May', amount: 4200000, budget: 4200000 },
  { month: 'Jun', amount: 4350000, budget: 4200000 },
]

// ── Department Distribution ──
export const departmentData = [
  { name: 'IT',         value: 320, color: '#3b82f6' },
  { name: 'HR',         value: 180, color: '#8b5cf6' },
  { name: 'Finance',    value: 210, color: '#10b981' },
  { name: 'Operations', value: 280, color: '#f59e0b' },
  { name: 'Sales',      value: 260, color: '#ef4444' },
]

// ── Attrition Risk ──
export const attritionData = [
  { name: 'Low Risk',    value: 62, color: '#10b981' },
  { name: 'Medium Risk', value: 28, color: '#f59e0b' },
  { name: 'High Risk',   value: 10, color: '#ef4444' },
]

// ── Leave Types (Nepal Labour Act) ──
export const leaveTypeData = [
  { name: 'Annual',    value: 45, color: '#3b82f6', days: 20  },
  { name: 'Sick',      value: 30, color: '#8b5cf6', days: 12  },
  { name: 'Maternity', value: 15, color: '#10b981', days: 98  },
  { name: 'Paternity', value: 10, color: '#f59e0b', days: 15  },
]

// ── Sprint Velocity ──
export const sprintData = [
  { sprint: 'S1', velocity: 72 },
  { sprint: 'S2', velocity: 68 },
  { sprint: 'S3', velocity: 78 },
  { sprint: 'S4', velocity: 80 },
  { sprint: 'S5', velocity: 79 },
  { sprint: 'S6', velocity: 84 },
]

// ── Turnover Prediction (12 months) ──
export const turnoverData = [
  { month: 'Jul', predicted: 7.8,  actual: 7.9  },
  { month: 'Aug', predicted: 8.1,  actual: 8.0  },
  { month: 'Sep', predicted: 8.4,  actual: 8.5  },
  { month: 'Oct', predicted: 10.2, actual: 10.4 },
  { month: 'Nov', predicted: 9.8,  actual: 9.6  },
  { month: 'Dec', predicted: 8.6,  actual: 8.7  },
  { month: 'Jan', predicted: 8.2,  actual: 8.3  },
  { month: 'Feb', predicted: 8.0,  actual: 7.9  },
  { month: 'Mar', predicted: 7.9,  actual: 8.0  },
  { month: 'Apr', predicted: 8.1,  actual: 8.1  },
  { month: 'May', predicted: 8.2,  actual: 8.2  },
  { month: 'Jun', predicted: 8.4,  actual: null  },
]

// ── Hiring Funnel ──
export const funnelData = [
  { name: 'Applied',     value: 145, fill: '#3b82f6' },
  { name: 'Screened',    value: 89,  fill: '#8b5cf6' },
  { name: 'Interviewed', value: 34,  fill: '#f59e0b' },
  { name: 'Offered',     value: 18,  fill: '#10b981' },
  { name: 'Joined',      value: 12,  fill: '#22c55e' },
]

// ── Radar (360° Competency) ──
export const radarData = [
  { subject: 'Leadership',     A: 80, B: 65 },
  { subject: 'Technical',      A: 85, B: 70 },
  { subject: 'Communication',  A: 72, B: 68 },
  { subject: 'Teamwork',       A: 90, B: 75 },
  { subject: 'Punctuality',    A: 88, B: 80 },
  { subject: 'Innovation',     A: 76, B: 60 },
]

// ── Recent Employees (anonymized) ──
export const recentEmployees = [
  { name: 'Ram Bahadur Thapa', dept: 'IT',       pos: 'Senior Developer', joined: '2026-05-20', status: 'Active',    id: 'NHR-001' },
  { name: 'Sita Sharma',       dept: 'HR',       pos: 'HR Executive',     joined: '2026-05-18', status: 'Active',    id: 'NHR-002' },
  { name: 'Hari Prasad KC',    dept: 'Finance',  pos: 'Accountant',       joined: '2026-05-15', status: 'Probation', id: 'NHR-003' },
  { name: 'Gita Rai',          dept: 'Ops',      pos: 'Team Lead',        joined: '2026-05-12', status: 'Active',    id: 'NHR-004' },
  { name: 'Bikram Limbu',      dept: 'Sales',    pos: 'Sales Executive',  joined: '2026-05-10', status: 'Active',    id: 'NHR-005' },
]

// ── Daily Tasks ──
export const tasksData = [
  { id: 1, task: 'Approve 12 leave requests',          priority: 'high',   done: false, dept: 'All',     role: 'HR Manager'   },
  { id: 2, task: 'Review Q2 performance appraisals',   priority: 'high',   done: false, dept: 'All',     role: 'HR Manager'   },
  { id: 3, task: 'Follow up on 5 open requisitions',   priority: 'medium', done: false, dept: 'IT',      role: 'Dept Head'    },
  { id: 4, task: 'Conduct orientation — 3 joiners',    priority: 'medium', done: true,  dept: 'HR',      role: 'HR Manager'   },
  { id: 5, task: 'Finalize May payroll processing',    priority: 'high',   done: false, dept: 'Finance', role: 'HR Manager'   },
  { id: 6, task: 'Submit daily attendance report',     priority: 'low',    done: true,  dept: 'All',     role: 'Employee'     },
  { id: 7, task: 'Complete 360° feedback for team',    priority: 'medium', done: false, dept: 'IT',      role: 'Dept Head'    },
  { id: 8, task: 'Update employee training records',   priority: 'low',    done: false, dept: 'HR',      role: 'HR Manager'   },
]

// ── Notifications ──
export const notificationsData = [
  { type: 'critical', icon: '⚠️', title: '5 appraisals overdue — Q2 cycle',        sub: 'Critical · HR Manager · 3 days overdue',    action: 'Review'      },
  { type: 'critical', icon: '🔐', title: 'Failed login × 5 — Himalaya Corp',        sub: 'Critical · Super Admin · 4 min ago',         action: 'Investigate' },
  { type: 'warning',  icon: '🕐', title: '12 leave requests pending approval',       sub: 'Pending · HR Manager · Oldest: 3 days',      action: 'Approve'     },
  { type: 'warning',  icon: '📋', title: '6 contracts expiring within 30 days',      sub: 'Pending · HR Manager',                       action: 'Review'      },
  { type: 'info',     icon: '👥', title: '3 new employees onboarded today',          sub: 'Info · IT and Sales departments',            action: null          },
  { type: 'info',     icon: '💰', title: 'May payroll processed',                    sub: 'Info · Finance · 3 hr ago',                 action: null          },
  { type: 'info',     icon: '🎂', title: "Today: Roshan Shrestha's birthday",        sub: 'IT Department',                              action: null          },
]

// ── Birthdays & Anniversaries ──
export const birthdaysData = [
  { name: 'Roshan Shrestha', dept: 'IT',      when: 'Today',    icon: '🎂', type: 'birthday'   },
  { name: 'Anita Gurung',    dept: 'HR',      when: 'Tomorrow', icon: '🎂', type: 'birthday'   },
  { name: 'Suresh Bista',    dept: 'Finance', when: 'Jun 8',    icon: '🏅', type: 'anniversary'},
  { name: 'Priya Thapa',     dept: 'Sales',   when: 'Jun 10',   icon: '🎂', type: 'birthday'   },
]

// ── Upcoming Events ──
export const eventsData = [
  { day: '5',  month: 'Jun', title: 'Leadership Training',    sub: 'IT Department · Mandatory'       },
  { day: '10', month: 'Jun', title: 'Q2 Performance Review',  sub: 'With manager Bikram Shrestha'    },
  { day: '15', month: 'Jun', title: 'Payroll Processing',     sub: 'Submit timesheets by Jun 12'     },
  { day: '20', month: 'Jun', title: 'Company Town Hall',      sub: 'All-hands meeting · 10:00 AM'   },
  { day: '30', month: 'Jun', title: 'Compliance Review Due',  sub: 'Nepal Labour Act 2017'          },
]

// ── AI Insights ──
export const aiInsightsData = [
  { color: '#ef4444', label: 'Attrition Alert',      text: '14 employees in IT show disengagement. Predicted exit within 60 days.' },
  { color: '#f59e0b', label: 'Cost Optimization',    text: 'Overtime in Finance 23% above benchmark. Consider 2 junior analysts.'  },
  { color: '#10b981', label: 'Hiring Forecast',      text: 'Sales headcount optimal. No additional hiring needed until Q4 2026.'   },
  { color: '#3b82f6', label: 'Market Salary Alert',  text: 'Senior Developer salaries rose 18% YoY. Band is below market rate.'   },
  { color: '#8b5cf6', label: 'Seasonal Absence',     text: '23% leave spike during Dashain/Tihar (Oct). Pre-plan coverage now.'   },
  { color: '#06b6d4', label: 'Engagement Signal',    text: "Growth rated 6.9/10 — below threshold. Launch mentorship in Q3."      },
]

// ── Candidates (Recruitment Agency) ──
export const candidatesData = [
  { name: 'Sunil Khadka',    pos: 'Senior Developer', stage: 'Offered',     date: '2026-06-01' },
  { name: 'Priyanka Rana',   pos: 'Finance Analyst',  stage: 'Interviewed', date: '2026-05-30' },
  { name: 'Amir Shrestha',   pos: 'Sales Executive',  stage: 'Screened',    date: '2026-05-28' },
  { name: 'Binita Maharjan', pos: 'HR Coordinator',   stage: 'Applied',     date: '2026-05-25' },
  { name: 'Nabin Thapa',     pos: 'IT Support',       stage: 'Joined',      date: '2026-05-20' },
]

// ── Recognitions ──
export const recognitionsData = [
  { name: 'Prabesh Karki',   note: 'Exceptional delivery — API migration',    icon: '⭐', color: '#3b82f6' },
  { name: 'Maya Adhikari',   note: 'Best bug-fix turnaround',                 icon: '🏆', color: '#8b5cf6' },
  { name: 'Dev Raj Poudel',  note: 'Outstanding team mentorship award',       icon: '💡', color: '#10b981' },
]
