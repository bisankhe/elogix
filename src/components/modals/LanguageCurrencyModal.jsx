// ============================================================
// FILE: src/components/modals/LanguageCurrencyModal.jsx
// PURPOSE: Language & Currency selector modal — 20 languages
//          with native names + flags, 26 world currencies,
//          search filter, RTL support, Nepal Privacy Act note
// ============================================================

import { useState } from 'react'
import { useApp }       from '../../context/AppContext.jsx'
import { LANGUAGES }    from '../../i18n/index.js'
import { CURRENCIES }   from '../../data/currencies.js'

// ── Tab Button ────────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 0',
        borderRadius: 8,
        border: 'none',
        background: active ? '#fff' : 'transparent',
        color: active ? '#0f172a' : '#64748b',
        fontWeight: active ? 700 : 400,
        fontSize: 13,
        cursor: 'pointer',
        boxShadow: active ? '0 1px 4px rgba(0,0,0,.06)' : 'none',
        transition: 'all .15s',
      }}
    >
      {children}
    </button>
  )
}

// ── Language Card ─────────────────────────────────────────────
function LangCard({ lang, selected, onClick }) {
  const isSelected = selected === lang.code
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10,
        border: `2px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
        background: isSelected ? '#eff6ff' : '#fff',
        cursor: 'pointer', textAlign: 'left',
        transition: 'all .12s', width: '100%',
      }}
      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.background = '#f8fafc' }}}
      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' }}}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>{lang.flag}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 700,
          color: isSelected ? '#1d4ed8' : '#334155',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {lang.label}
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
          {lang.native}
          {lang.dir === 'rtl' && (
            <span style={{ marginLeft: 4, background: '#fef9c3', color: '#92400e', padding: '1px 4px', borderRadius: 4, fontSize: 9, fontWeight: 600 }}>
              RTL
            </span>
          )}
        </div>
      </div>
      {isSelected && (
        <span style={{ color: '#3b82f6', fontSize: 18, flexShrink: 0 }}>✓</span>
      )}
    </button>
  )
}

// ── Currency Card ─────────────────────────────────────────────
function CurrencyCard({ curr, selected, onClick }) {
  const isSelected = selected === curr.code
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10,
        border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
        background: isSelected ? '#f0fdf4' : '#fff',
        cursor: 'pointer', textAlign: 'left',
        transition: 'all .12s', width: '100%',
      }}
      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#6ee7b7'; e.currentTarget.style.background = '#f8fafc' }}}
      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' }}}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>{curr.flag}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 700,
          color: isSelected ? '#15803d' : '#334155',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span>{curr.code}</span>
          <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 11 }}>{curr.symbol}</span>
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {curr.name}
        </div>
      </div>
      {isSelected && (
        <span style={{ color: '#10b981', fontSize: 18, flexShrink: 0 }}>✓</span>
      )}
    </button>
  )
}

// ── Main Modal ────────────────────────────────────────────────
export default function LanguageCurrencyModal({ onClose }) {
  const { language, setLanguage, currency, setCurrency, t } = useApp()

  const [activeTab, setActiveTab] = useState('language')
  const [search,    setSearch]    = useState('')

  const filteredLangs = LANGUAGES.filter(l =>
    l.label.toLowerCase().includes(search.toLowerCase()) ||
    l.native.toLowerCase().includes(search.toLowerCase()) ||
    l.code.includes(search.toLowerCase())
  )

  const filteredCurrs = CURRENCIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.symbol.includes(search)
  )

  const handleLangSelect = (code) => {
    setLanguage(code)
    setSearch('')
    // Apply RTL
    const lang = LANGUAGES.find(l => l.code === code)
    document.documentElement.dir = lang?.dir || 'ltr'
  }

  const handleCurrSelect = (code) => {
    setCurrency(code)
    setSearch('')
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.52)',
        zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 18, padding: 24,
          width: 580, maxHeight: '86vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,.22)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
              🌐 Language & 💱 Currency
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
              Select your preferred interface language and display currency.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: 8,
              width: 32, height: 32, cursor: 'pointer', fontSize: 16,
              color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Bar */}
        <div style={{
          display: 'flex', gap: 4,
          background: '#f1f5f9', padding: 4,
          borderRadius: 12, marginBottom: 14,
          border: '1px solid #e2e8f0',
        }}>
          <TabBtn active={activeTab === 'language'} onClick={() => { setActiveTab('language'); setSearch('') }}>
            🌐 Language ({LANGUAGES.length})
          </TabBtn>
          <TabBtn active={activeTab === 'currency'} onClick={() => { setActiveTab('currency'); setSearch('') }}>
            💱 Currency ({CURRENCIES.length})
          </TabBtn>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#94a3b8' }}>🔍</span>
          <input
            type="text"
            placeholder={activeTab === 'language' ? 'Search language...' : 'Search currency...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 36px',
              borderRadius: 9, border: '1px solid #e2e8f0',
              fontSize: 13, outline: 'none', boxSizing: 'border-box',
              transition: 'border-color .15s',
            }}
            onFocus={e => e.target.style.borderColor = '#93c5fd'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8' }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Current selection badge */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {activeTab === 'language' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#1d4ed8', background: '#eff6ff', padding: '3px 10px', borderRadius: 20, border: '1px solid #bfdbfe' }}>
              {LANGUAGES.find(l => l.code === language)?.flag} Current: <strong>{LANGUAGES.find(l => l.code === language)?.label}</strong>
            </div>
          )}
          {activeTab === 'currency' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#15803d', background: '#f0fdf4', padding: '3px 10px', borderRadius: 20, border: '1px solid #bbf7d0' }}>
              {CURRENCIES.find(c => c.code === currency)?.flag} Current: <strong>{currency}</strong> ({CURRENCIES.find(c => c.code === currency)?.symbol})
            </div>
          )}
        </div>

        {/* Options Grid */}
        <div style={{ overflow: 'auto', flex: 1, paddingRight: 2 }}>
          {activeTab === 'language' ? (
            filteredLangs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                No languages found for "{search}"
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {filteredLangs.map(lang => (
                  <LangCard
                    key={lang.code}
                    lang={lang}
                    selected={language}
                    onClick={() => handleLangSelect(lang.code)}
                  />
                ))}
              </div>
            )
          ) : (
            filteredCurrs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                No currencies found for "{search}"
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {filteredCurrs.map(curr => (
                  <CurrencyCard
                    key={curr.code}
                    curr={curr}
                    selected={currency}
                    onClick={() => handleCurrSelect(curr.code)}
                  />
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 14, paddingTop: 12,
          borderTop: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>🔒</span>
            <span>Preference is saved locally · Nepal Privacy Act 2018 compliant</span>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 22px', borderRadius: 9,
              border: 'none', background: '#3b82f6',
              color: '#fff', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', transition: 'background .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
            onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
          >
            {t('save') || 'Save'} & {t('close') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
