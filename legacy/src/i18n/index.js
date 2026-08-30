// ============================================================
// FILE: src/i18n/index.js
// PURPOSE: i18n engine — loads all language JSON files,
//          exposes translate(), LANGUAGES list, RTL support
// ============================================================

import en from './locales/en.json'
import ne from './locales/ne.json'
import hi from './locales/hi.json'
import ar from './locales/ar.json'
import zh from './locales/zh.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import pt from './locales/pt.json'
import ru from './locales/ru.json'
import id from './locales/id.json'
import ms from './locales/ms.json'
import th from './locales/th.json'
import tr from './locales/tr.json'
import vi from './locales/vi.json'
import bn from './locales/bn.json'
import ur from './locales/ur.json'
import sw from './locales/sw.json'

// ── All language metadata ────────────────────────────────────
export const LANGUAGES = [
  { code: 'en', label: 'English',           native: 'English',          flag: '🇬🇧', dir: 'ltr' },
  { code: 'ne', label: 'Nepali',            native: 'नेपाली',            flag: '🇳🇵', dir: 'ltr' },
  { code: 'hi', label: 'Hindi',             native: 'हिन्दी',             flag: '🇮🇳', dir: 'ltr' },
  { code: 'ar', label: 'Arabic',            native: 'العربية',           flag: '🇸🇦', dir: 'rtl' },
  { code: 'zh', label: 'Chinese',           native: '中文',               flag: '🇨🇳', dir: 'ltr' },
  { code: 'ja', label: 'Japanese',          native: '日本語',             flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', label: 'Korean',            native: '한국어',             flag: '🇰🇷', dir: 'ltr' },
  { code: 'es', label: 'Spanish',           native: 'Español',           flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', label: 'French',            native: 'Français',          flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', label: 'German',            native: 'Deutsch',           flag: '🇩🇪', dir: 'ltr' },
  { code: 'pt', label: 'Portuguese',        native: 'Português',         flag: '🇵🇹', dir: 'ltr' },
  { code: 'ru', label: 'Russian',           native: 'Русский',           flag: '🇷🇺', dir: 'ltr' },
  { code: 'id', label: 'Indonesian',        native: 'Bahasa Indonesia',  flag: '🇮🇩', dir: 'ltr' },
  { code: 'ms', label: 'Malay',             native: 'Bahasa Melayu',     flag: '🇲🇾', dir: 'ltr' },
  { code: 'th', label: 'Thai',              native: 'ภาษาไทย',           flag: '🇹🇭', dir: 'ltr' },
  { code: 'tr', label: 'Turkish',           native: 'Türkçe',            flag: '🇹🇷', dir: 'ltr' },
  { code: 'vi', label: 'Vietnamese',        native: 'Tiếng Việt',        flag: '🇻🇳', dir: 'ltr' },
  { code: 'bn', label: 'Bengali',           native: 'বাংলা',             flag: '🇧🇩', dir: 'ltr' },
  { code: 'ur', label: 'Urdu',              native: 'اردو',              flag: '🇵🇰', dir: 'rtl' },
  { code: 'sw', label: 'Swahili',           native: 'Kiswahili',         flag: '🇰🇪', dir: 'ltr' },
]

// ── All translations map ─────────────────────────────────────
const translations = {
  en, ne, hi, ar, zh, ja, ko, es,
  fr, de, pt, ru, id, ms, th, tr,
  vi, bn, ur, sw,
}

// ── Translate function ───────────────────────────────────────
export const translate = (lang, key) => {
  const dict = translations[lang] || translations['en']
  return dict[key] ?? translations['en'][key] ?? key
}

// ── Get language metadata ────────────────────────────────────
export const getLanguage = (code) =>
  LANGUAGES.find(l => l.code === code) || LANGUAGES[0]

// ── Get text direction ───────────────────────────────────────
export const getDir = (code) =>
  LANGUAGES.find(l => l.code === code)?.dir || 'ltr'

export default translations
