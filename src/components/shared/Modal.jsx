// ============================================================
// FILE: src/components/shared/Modal.jsx
// PURPOSE: Reusable modal component — configurable sizes,
//          confirm dialog variant, form modal, full-screen,
//          keyboard (Esc) close, focus trap, accessibility
// ============================================================

import { useEffect, useRef } from 'react'

// ── Size Map ──────────────────────────────────────────────────
const SIZE_MAP = {
  xs:   { width: 360,  maxHeight: '90vh' },
  sm:   { width: 440,  maxHeight: '90vh' },
  md:   { width: 560,  maxHeight: '90vh' },
  lg:   { width: 720,  maxHeight: '90vh' },
  xl:   { width: 920,  maxHeight: '92vh' },
  '2xl':{ width: 1100, maxHeight: '94vh' },
  full: { width: '95vw', maxHeight: '95vh' },
}

// ── Modal Overlay ─────────────────────────────────────────────
function Overlay({ onClick, children }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn .15s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
      {children}
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────
/**
 * @param {boolean}   open          - Is modal open
 * @param {Function}  onClose       - Close handler
 * @param {string}    title         - Modal title
 * @param {string}    subtitle      - Modal subtitle
 * @param {ReactNode} children      - Modal body content
 * @param {ReactNode} footer        - Modal footer (custom buttons)
 * @param {string}    size          - xs | sm | md | lg | xl | 2xl | full
 * @param {boolean}   closable      - Show X button (default true)
 * @param {boolean}   closeOnOverlay- Close when clicking overlay (default true)
 * @param {string}    icon          - Emoji/icon in header
 * @param {string}    variant       - 'default' | 'danger' | 'success' | 'warning'
 * @param {boolean}   noPad         - Remove body padding
 * @param {boolean}   loading       - Show loading state
 * @param {string}    className     - Extra class
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size          = 'md',
  closable      = true,
  closeOnOverlay= true,
  icon,
  variant       = 'default',
  noPad         = false,
  loading       = false,
}) {
  const modalRef = useRef()

  // Esc key close
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape' && closable) onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, closable, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const dim = SIZE_MAP[size] || SIZE_MAP.md

  const variantConfig = {
    default: { headerBg: '#fff', headerBorder: '1px solid #f1f5f9', titleColor: '#0f172a', iconBg: '#eff6ff' },
    danger:  { headerBg: '#fef2f2', headerBorder: '1px solid #fecaca', titleColor: '#991b1b', iconBg: '#fee2e2' },
    success: { headerBg: '#f0fdf4', headerBorder: '1px solid #bbf7d0', titleColor: '#14532d', iconBg: '#dcfce7' },
    warning: { headerBg: '#fffbeb', headerBorder: '1px solid #fde68a', titleColor: '#78350f', iconBg: '#fef9c3' },
  }[variant] || {}

  return (
    <Overlay onClick={closeOnOverlay && closable ? onClose : undefined}>
      <div
        ref={modalRef}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          background: '#fff',
          borderRadius: 16,
          width: dim.width,
          maxHeight: dim.maxHeight,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,.2)',
          overflow: 'hidden',
          animation: 'slideUp .2s ease',
        }}
      >
        {/* ── Header ── */}
        {(title || closable) && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            padding: '18px 20px',
            background: variantConfig.headerBg || '#fff',
            borderBottom: variantConfig.headerBorder || '1px solid #f1f5f9',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {icon && (
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: variantConfig.iconBg || '#eff6ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <h3 id="modal-title" style={{
                    margin: 0, fontSize: 17, fontWeight: 800,
                    color: variantConfig.titleColor || '#0f172a',
                  }}>
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {closable && (
              <button
                onClick={onClose}
                aria-label="Close modal"
                style={{
                  background: '#f1f5f9', border: 'none', borderRadius: 8,
                  width: 30, height: 30, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: '#64748b', flexShrink: 0,
                  transition: 'all .12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#334155' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b' }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* ── Body ── */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: noPad ? 0 : '18px 20px',
          position: 'relative',
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 13 }}>Loading...</div>
            </div>
          ) : children}
        </div>

        {/* ── Footer ── */}
        {footer && (
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            flexShrink: 0, background: '#f8fafc', flexWrap: 'wrap',
          }}>
            {footer}
          </div>
        )}
      </div>
    </Overlay>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────
/**
 * @param {boolean}  open
 * @param {Function} onClose
 * @param {Function} onConfirm
 * @param {string}   title
 * @param {string}   message
 * @param {string}   confirmLabel  - Default "Confirm"
 * @param {string}   cancelLabel   - Default "Cancel"
 * @param {string}   variant       - 'danger' | 'warning' | 'success' | 'default'
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title       = 'Are you sure?',
  message     = 'This action cannot be undone.',
  confirmLabel= 'Confirm',
  cancelLabel = 'Cancel',
  variant     = 'danger',
  loading     = false,
}) {
  const variantColor = {
    danger:  { btn: '#dc2626', hov: '#b91c1c', icon: '⚠️' },
    warning: { btn: '#d97706', hov: '#b45309', icon: '⚠️' },
    success: { btn: '#16a34a', hov: '#15803d', icon: '✅' },
    default: { btn: '#3b82f6', hov: '#2563eb', icon: '❓' },
  }[variant] || { btn: '#dc2626', hov: '#b91c1c', icon: '⚠️' }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xs"
      variant={variant}
      icon={variantColor.icon}
      title={title}
      subtitle={message}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 18px', borderRadius: 9,
              border: '1px solid #e2e8f0', background: '#fff',
              color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 18px', borderRadius: 9,
              border: 'none', background: loading ? '#e2e8f0' : variantColor.btn,
              color: loading ? '#94a3b8' : '#fff',
              fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background .15s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = variantColor.hov }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = variantColor.btn }}
          >
            {loading ? '⏳ Processing...' : confirmLabel}
          </button>
        </>
      }
    >
      {/* Empty — subtitle carries message */}
    </Modal>
  )
}

// ── Modal Preset Buttons ──────────────────────────────────────
export function ModalFooterButtons({ onCancel, onSave, saveLabel = 'Save', cancelLabel = 'Cancel', loading = false, saveColor = '#3b82f6' }) {
  return (
    <>
      <button
        onClick={onCancel}
        disabled={loading}
        style={{ padding: '8px 18px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        {cancelLabel}
      </button>
      <button
        onClick={onSave}
        disabled={loading}
        style={{
          padding: '8px 22px', borderRadius: 9, border: 'none',
          background: loading ? '#e2e8f0' : saveColor,
          color: loading ? '#94a3b8' : '#fff',
          fontSize: 13, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}>
        {loading ? '⏳ Saving...' : saveLabel}
      </button>
    </>
  )
}

export default Modal
