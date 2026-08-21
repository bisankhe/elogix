// FILE: src/components/dashboard/snapshots/InventoryAssetsPage.jsx
// eLogix HRMS -- Inventory and Assets
// Tenant-scoped: only this company's data
// eLogix Technologies · www.elogix.com.np
import { useState, useEffect } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const A = '#059669'
const G = 'linear-gradient(135deg,#0c4a6e,#059669)'

function useCompanyCtx() {
  const auth   = (() => { try { return JSON.parse(localStorage.getItem('elogix_auth')||'{}') } catch { return {} } })()
  const regCos = (() => { try { return JSON.parse(localStorage.getItem('elogix_registered_companies')||'{}') } catch { return {} } })()
  const slug   = auth.company?.slug || auth.user?.company || 'demo'
  return {
    company_id:   auth.company?.id || slug,
    company_name: auth.company?.name || regCos[slug]?.name || 'Your Company',
    company_slug: slug,
    plan:         auth.company?.plan || 'trial',
    currency:     auth.company?.currency || 'NPR',
    token:        localStorage.getItem('elogix_token') || auth.token || '',

export default function InventoryAssetsPage() {
  const ctx = useCompanyCtx()
  const { navTo } = useApp()
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [toast,   setToast]   = useState('')
  const [form,    setForm]    = useState({ name:'', description:'', status:'active' })

  const notify = m => { setToast(m); setTimeout(()=>setToast(''), 3500) }
  const sf = (k,v) => setForm(p => ({ ...p, [k]:v }))
  const storageKey = `elogix_inventory-assets_${ctx.company_slug}`

  useEffect(() => {
    const load = async () => {
      try {
        if (ctx.token) {
          const res = await fetch('/api/v1/inventory-assets', {
            headers: { Authorization: `Bearer ${ctx.token}` }
          })
          if (res.ok) {
            const d = await res.json()
            const data = d.data || d.items || []
            setItems(Array.isArray(data) ? data : [])
            localStorage.setItem(storageKey, JSON.stringify(data))
            setLoading(false); return
      } catch {}
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]')
      setItems(stored)
      setLoading(false)
    load()
  }, [ctx.company_slug])

  const handleAdd = async () => {
    if (!form.name) { notify('Name is required'); return }
    const item = { id:`inventory-assets-${Date.now()}`, company_id:ctx.company_id,
                   ...form, created_at:new Date().toISOString().split('T')[0] }
    const updated = [...items, item]
    setItems(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    try {
      if (ctx.token) await fetch('/api/v1/inventory-assets', {
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${ctx.token}`},
        body: JSON.stringify(item)
      })
    } catch {}
    notify('Saved')
    setShowAdd(false)
    setForm({ name:'', description:'', status:'active' })

  const handleDelete = (id) => {
    const updated = items.filter(i => i.id !== id)
    setItems(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    notify('Deleted')

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', minHeight:'100%',
      background:'#f8fafc', overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
      {toast && (
        <div style={{ position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0fdf4',
          border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 18px',
          fontSize:11,fontWeight:700,color:'#15803d',boxShadow:'0 4px 16px rgba(0,0,0,.1)' }}>
          {toast}
        </div>
      )}

      <div style={{ background:G,padding:'14px 20px',borderRadius:'0 0 14px 14px',marginBottom:14 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10 }}>
          <div>
            <div style={{ fontSize:15,fontWeight:900,color:'#fff' }}>📦 Inventory and Assets</div>
            <div style={{ fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2 }}>
              {ctx.company_name} · {items.length} records
            </div>
          </div>
          <button onClick={()=>setShowAdd(p=>!p)}
            style={{ padding:'8px 16px',borderRadius:9,border:'none',
              background:'rgba(255,255,255,.2)',color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer' }}>
            + Add
          </button>
        </div>
      </div>

      <div style={{ padding:'0 16px 20px' }}>
        <div style={{ background:'#eff6ff',border:'1px solid #bae6fd',borderRadius:9,
          padding:'8px 14px',marginBottom:12,fontSize:11,display:'flex',alignItems:'center',gap:8 }}>
          <span>🔒</span>
          <span>Showing <b>{ctx.company_name}</b> data only</span>
          <span style={{ marginLeft:'auto',fontSize:9,padding:'2px 8px',borderRadius:20,
            background:A,color:'#fff',fontWeight:700 }}>{(ctx.plan||'trial').toUpperCase()}</span>
        </div>

        {showAdd && (
          <div style={{ background:'#fff',borderRadius:12,padding:16,
            boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:12,border:`1px solid ${A}30` }}>
            <div style={{ fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:12 }}>+ Add Inventory and Assets</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10,marginBottom:12 }}>
              {[['Name','name','Enter name'],['Description','description','Optional']].map(([lb,k,ph])=>(
                <div key={k}>
                  <label style={{ fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:3 }}>{lb}</label>
                  <input value={form[k]} onChange={e=>sf(k,e.target.value)} placeholder={ph}
                    style={{ width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',
                      fontSize:11,outline:'none',boxSizing:'border-box' }}/>
                </div>
              ))}
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button onClick={handleAdd}
                style={{ padding:'9px 20px',borderRadius:8,border:'none',background:G,
                  color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer' }}>Save</button>
              <button onClick={()=>setShowAdd(false)}
                style={{ padding:'9px 16px',borderRadius:8,border:'1.5px solid #e2e8f0',
                  background:'#fff',fontSize:11,fontWeight:700,cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign:'center',padding:40,color:'#94a3b8' }}>Loading...</div>
        ) : items.length === 0 ? (
          <div style={{ background:'#fff',borderRadius:12,padding:'48px',textAlign:'center',
            boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize:48,marginBottom:12 }}>📦</div>
            <div style={{ fontSize:14,fontWeight:700,color:'#374151',marginBottom:6 }}>No Inventory and Assets records yet</div>
            <div style={{ fontSize:11,color:'#64748b',marginBottom:16 }}>Add records for {ctx.company_name}</div>
            <button onClick={()=>setShowAdd(true)}
              style={{ padding:'10px 24px',borderRadius:9,border:'none',background:G,
                color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer' }}>+ Add First</button>
          </div>
        ) : (
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:10 }}>
            {items.map(item => (
              <div key={item.id} style={{ background:'#fff',borderRadius:11,padding:14,
                boxShadow:'0 2px 6px rgba(0,0,0,.05)',border:'1px solid #e2e8f0' }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
                  <div style={{ fontSize:12,fontWeight:700,color:'#0f172a' }}>📦 {item.name}</div>
                  <span style={{ fontSize:9,padding:'2px 8px',borderRadius:20,fontWeight:700,
                    background:item.status==='active'?'#f0fdf4':'#fef2f2',
                    color:item.status==='active'?'#16a34a':'#dc2626' }}>{item.status}</span>
                </div>
                {item.description && <div style={{ fontSize:10,color:'#64748b',marginBottom:8 }}>{item.description}</div>}
                <div style={{ display:'flex',gap:6,justifyContent:'flex-end' }}>
                  <button onClick={()=>handleDelete(item.id)}
                    style={{ padding:'4px 10px',borderRadius:6,border:'1px solid #fecaca',
                      background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,cursor:'pointer' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
