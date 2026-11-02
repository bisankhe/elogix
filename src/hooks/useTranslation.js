/**
 * FILE: src/hooks/useTranslation.js
 * i18n translation hook.
 * Usage: const { t, lang } = useTranslation()
 */
import { useContext } from 'react'
import { AppContext } from '../context/AppContext.jsx'
import en from '../i18n/locales/en.json'
import ne from '../i18n/locales/ne.json'
import hi from '../i18n/locales/hi.json'

const LOCALES = { en, ne, hi }

export function useTranslation() {
  const ctx  = useContext(AppContext)
  const lang = ctx?.language || 'en'
  const dict = LOCALES[lang] || LOCALES.en

  const t = (key, fallback) => {
    const keys = key.split('.')
    let val = dict
    for (const k of keys) { val = val?.[k] }
    return val || fallback || key
  }

  return { t, lang }
}

export default useTranslation
