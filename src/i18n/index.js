// FILE: src/i18n/index.js
// eLogix HRMS — Internationalization (i18n)
// Supports: English (en), Nepali (ne)
// eLogix Technologies · www.elogix.com.np

export const LANGUAGES = [
  { code: 'en', name: 'English',  nativeName: 'English',  dir: 'ltr', flag: '🇺🇸' },
  { code: 'ne', name: 'Nepali',   nativeName: 'नेपाली',   dir: 'ltr', flag: '🇳🇵' },
]

const TRANSLATIONS = {
  en: {
    'persona.superAdmin'    : 'Super Admin',
    'persona.executive'     : 'Executive',
    'persona.hrManager'     : 'HR Manager',
    'persona.hrOfficer'     : 'HR Officer',
    'persona.deptHead'      : 'Department Head',
    'persona.branchManager' : 'Branch Manager',
    'persona.finance'       : 'Finance',
    'persona.recruitment'   : 'Recruitment',
    'persona.itAdmin'       : 'IT Admin',
    'persona.employee'      : 'Employee',
    'persona.elogixAdmin'   : 'eLogix Admin',
    'nav.dashboard'         : 'Dashboard',
    'nav.employees'         : 'Employees',
    'nav.attendance'        : 'Attendance',
    'nav.leave'             : 'Leave',
    'nav.payroll'           : 'Payroll',
    'nav.recruitment'       : 'Recruitment',
    'nav.performance'       : 'Performance',
    'nav.settings'          : 'Settings',
    'common.save'           : 'Save',
    'common.cancel'         : 'Cancel',
    'common.delete'         : 'Delete',
    'common.edit'           : 'Edit',
    'common.loading'        : 'Loading...',
    'common.noData'         : 'No data available',
    'common.search'         : 'Search',
    'common.filter'         : 'Filter',
    'common.export'         : 'Export',
  },
  ne: {
    'persona.superAdmin'    : 'सुपर एडमिन',
    'persona.executive'     : 'कार्यकारी',
    'persona.hrManager'     : 'मानव संसाधन प्रबन्धक',
    'persona.employee'      : 'कर्मचारी',
    'nav.dashboard'         : 'ड्यासबोर्ड',
    'nav.employees'         : 'कर्मचारीहरू',
    'nav.attendance'        : 'उपस्थिति',
    'nav.leave'             : 'बिदा',
    'nav.payroll'           : 'तलब',
    'common.save'           : 'सुरक्षित गर्नुहोस्',
    'common.cancel'         : 'रद्द गर्नुहोस्',
    'common.loading'        : 'लोड हुँदैछ...',
    'common.noData'         : 'कुनै डेटा छैन',
    'common.search'         : 'खोज्नुहोस्',
  },
}

export function translate(lang = 'en', key) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en
  return dict[key] || TRANSLATIONS.en[key] || key
}

export function getDir(lang = 'en') {
  return LANGUAGES.find(l => l.code === lang)?.dir || 'ltr'
}
