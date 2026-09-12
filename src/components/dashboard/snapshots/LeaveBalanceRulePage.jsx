// FILE: src/components/dashboard/snapshots/LeaveBalanceRulePage.jsx
// eLogix HRMS — Leave Balance Rule Configuration
// COMPLETE REWRITE: Full CRUD UI — replaces 85L stub that just JSON.stringify'd the API.
// No mock data. Per-tenant isolation via X-Tenant-Slug.
// API: GET/POST/PUT/DELETE /api/v1/leave/rules
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G = 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 60%,#a78bfa 100%)'
const A = '#7c3aed'

const EMPTY_RULE = {
  leave_type:'',leave_type_label:'',days_entitled:0,carry_forward:false,
  max_carry_days:0,encashable:false,pro_rated:true,applicable_gender:'All',
  min_service_months:0,requires_document:false,paid:true,remarks:''
}

const LEAVE_TYPES = [
  {code:'CL',label:'Casual Leave'},   {code:'EL',label:'Earned/Annual Leave'},
  {code:'SL',label:'Sick Leave'},     {code:'ML',label:'Maternity Leave'},
  {code:'PL',label:'Paternity Leave'},{code:'BL',label:'Bereavement Leave'},
  {code:'CWL',label:'Child Welfare'}, {code:'HD',label:'Half Day'},
  {code:'UL',label:'Unpaid Leave'},   {code:'CMP',label:'Compensatory Leave'},
]

function Field({label,children}){
  return(
    <div style={{marginBottom:12}}>
      <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>{label}</div>
      {children}
    </div>
  )
}

const inp = {width:'100%',padding:'7px 10px',borderRadius:8,border:'1.5px solid #e2e8f0',
  fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box',fontFamily:'inherit'}

export default function LeaveBalanceRulePage() {
  const [rules,   setRules]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)
  const [msg,     setMsg]     = useState('')
  const [showForm,setShowForm]= useState(false)
  const [editRule,setEditRule]= useState(null)
  const [form,    setForm]    = useState(EMPTY_RULE)

  const s = _getSession(); const company = s?.company || {}
  const notify = (m,isErr=false) => { setMsg(m); setTimeout(()=>setMsg(''),3500); if(isErr)setError(m) }

  const load = () => {
    const token = localStorage.getItem('access_token')||s?.token||''
    const slug  = s?.company?.slug||''
    if(!token||!slug){setLoading(false);return}
    setLoading(true)
    fetch('/api/v1/leave/rules',{headers:_authH()})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')};return r.ok?r.json():Promise.reject(r.status)})
      .then(d=>setRules(d.data||d||[]))
      .catch(e=>setError(String(e)))
      .finally(()=>setLoading(false))
  }
  useEffect(()=>{load()},[])

  const openAdd  = () => { setForm(EMPTY_RULE); setEditRule(null); setShowForm(true) }
  const openEdit = (r) => { setForm({...r});    setEditRule(r);    setShowForm(true) }

  const save = async () => {
    if(!form.leave_type||!form.days_entitled){notify('Leave type and days are required',true);return}
    setSaving(true)
    try{
      const url    = editRule ? `/api/v1/leave/rules/${editRule.id}` : '/api/v1/leave/rules'
      const method = editRule ? 'PUT' : 'POST'
      const r = await fetch(url,{method,headers:_authH(),body:JSON.stringify(form)})
      if(!r.ok) throw new Error(await r.text())
      notify(editRule?'✅ Rule updated':'✅ Rule created')
      setShowForm(false); load()
    }catch(e){notify(`❌ ${e.message}`,true)}
    finally{setSaving(false)}
  }

  const del = async (rule) => {
    if(!window.confirm(`Delete rule for "${rule.leave_type_label||rule.leave_type}"?`))return
    try{
      const r = await fetch(`/api/v1/leave/rules/${rule.id}`,{method:'DELETE',headers:_authH()})
      if(!r.ok) throw new Error('Delete failed')
      notify('🗑️ Rule deleted'); load()
    }catch(e){notify(`❌ ${e.message}`,true)}
  }

  if(loading) return(
    <div style={{textAlign:'center',padding:60,color:A,fontFamily:'system-ui'}}>
      <div style={{fontSize:30,marginBottom:10}}>⟳</div>
      <div style={{fontSize:12,fontWeight:600}}>Loading leave rules for {company?.name}...</div>
    </div>
  )

  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:20,color:'#0f172a',minHeight:'100vh',background:'#f8fafc'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,padding:'10px 18px',borderRadius:10,
        background:msg.startsWith('❌')?'#fef2f2':'#f0fdf4',border:`1px solid ${msg.startsWith('❌')?'#fecaca':'#bbf7d0'}`,
        fontSize:11,color:msg.startsWith('❌')?'#dc2626':'#065f46',boxShadow:'0 4px 16px rgba(0,0,0,.12)'}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'18px 22px',marginBottom:20,boxShadow:'0 4px 20px rgba(124,58,237,.2)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:22}}>📅</span>
              <div>
                <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Leave Balance Rules</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · Leave entitlement & carry-forward configuration</div>
              </div>
            </div>
          </div>
          <button onClick={openAdd} style={{padding:'9px 18px',borderRadius:10,border:'2px solid rgba(255,255,255,.6)',
            background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
            ＋ Add Rule
          </button>
        </div>
      </div>

      {error&&!showForm&&(
        <div style={{padding:'10px 16px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,fontSize:12,color:'#dc2626',marginBottom:14}}>⚠️ {error}</div>
      )}

      {/* Rules Grid */}
      {rules.length===0&&!loading?(
        <div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:16,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:48,marginBottom:12}}>📅</div>
          <div style={{fontSize:15,fontWeight:700,color:'#475569',marginBottom:6}}>No leave rules configured yet</div>
          <div style={{fontSize:12,color:'#94a3b8',marginBottom:18}}>Create rules to define leave entitlements, carry-forward & encashment for {company?.name}</div>
          <button onClick={openAdd} style={{padding:'10px 22px',borderRadius:10,border:'none',background:A,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>
            ＋ Create First Rule
          </button>
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
          {rules.map((rule,i)=>{
            const lt = LEAVE_TYPES.find(l=>l.code===rule.leave_type)||{label:rule.leave_type_label||rule.leave_type}
            return(
              <div key={i} style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',
                boxShadow:'0 2px 8px rgba(0,0,0,.04)',overflow:'hidden'}}>
                <div style={{background:`${A}08`,padding:'12px 16px',borderBottom:'1px solid #e2e8f0',
                  display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{lt.label||rule.leave_type}</div>
                    <div style={{fontSize:10,color:'#64748b',marginTop:2}}>
                      {rule.days_entitled} days/year · {rule.applicable_gender||'All'} · {rule.paid?'Paid':'Unpaid'}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>openEdit(rule)} style={{padding:'4px 10px',borderRadius:7,border:`1px solid ${A}`,
                      background:'#fff',color:A,fontSize:9,fontWeight:700,cursor:'pointer'}}>Edit</button>
                    <button onClick={()=>del(rule)} style={{padding:'4px 10px',borderRadius:7,border:'1px solid #fecaca',
                      background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,cursor:'pointer'}}>Delete</button>
                  </div>
                </div>
                <div style={{padding:'12px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[
                    ['Carry Forward', rule.carry_forward?`Yes (max ${rule.max_carry_days}d)`:'No'],
                    ['Encashable',    rule.encashable?'Yes':'No'],
                    ['Pro-rated',     rule.pro_rated?'Yes':'No'],
                    ['Min Service',   `${rule.min_service_months||0} months`],
                    ['Document Req.', rule.requires_document?'Yes':'No'],
                    ['Nepal Act Ref', rule.nepal_act_ref||'—'],
                  ].map(([k,v],j)=>(
                    <div key={j}>
                      <div style={{fontSize:9,color:'#94a3b8'}}>{k}</div>
                      <div style={{fontSize:11,fontWeight:600,color:'#0f172a'}}>{v}</div>
                    </div>
                  ))}
                </div>
                {rule.remarks&&(
                  <div style={{padding:'8px 16px',borderTop:'1px solid #f1f5f9',fontSize:10,color:'#64748b'}}>{rule.remarks}</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Drawer */}
      {showForm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:1000,display:'flex',alignItems:'flex-end',justifyContent:'flex-end'}}>
          <div style={{background:'#fff',width:440,height:'100vh',overflow:'auto',boxShadow:'-4px 0 20px rgba(0,0,0,.15)',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>{editRule?'Edit Rule':'New Leave Rule'}</div>
              <button onClick={()=>setShowForm(false)} style={{fontSize:18,background:'none',border:'none',cursor:'pointer',color:'#94a3b8'}}>✕</button>
            </div>

            {error&&<div style={{padding:'8px 12px',background:'#fef2f2',borderRadius:8,fontSize:11,color:'#dc2626',marginBottom:14}}>⚠️ {error}</div>}

            <Field label="Leave Type *">
              <select value={form.leave_type} onChange={e=>{const lt=LEAVE_TYPES.find(l=>l.code===e.target.value);setForm(p=>({...p,leave_type:e.target.value,leave_type_label:lt?.label||e.target.value}))}} style={{...inp}}>
                <option value="">— Select —</option>
                {LEAVE_TYPES.map(lt=><option key={lt.code} value={lt.code}>{lt.label}</option>)}
              </select>
            </Field>
            <Field label="Days Entitled / Year *">
              <input type="number" min="0" max="365" value={form.days_entitled} onChange={e=>setForm(p=>({...p,days_entitled:+e.target.value}))} style={{...inp}}/>
            </Field>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Field label="Applicable Gender">
                <select value={form.applicable_gender} onChange={e=>setForm(p=>({...p,applicable_gender:e.target.value}))} style={{...inp}}>
                  <option value="All">All</option><option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </Field>
              <Field label="Min Service (months)">
                <input type="number" min="0" value={form.min_service_months} onChange={e=>setForm(p=>({...p,min_service_months:+e.target.value}))} style={{...inp}}/>
              </Field>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              {[['Carry Forward','carry_forward'],['Encashable','encashable'],['Pro-rated','pro_rated'],['Paid Leave','paid'],['Requires Document','requires_document']].map(([lbl,key])=>(
                <label key={key} style={{display:'flex',alignItems:'center',gap:8,fontSize:11,cursor:'pointer',padding:'6px 0'}}>
                  <input type="checkbox" checked={!!form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.checked}))} style={{width:15,height:15,cursor:'pointer'}}/>
                  {lbl}
                </label>
              ))}
            </div>
            {form.carry_forward&&(
              <Field label="Max Carry-Forward Days">
                <input type="number" min="0" value={form.max_carry_days} onChange={e=>setForm(p=>({...p,max_carry_days:+e.target.value}))} style={{...inp}}/>
              </Field>
            )}
            <Field label="Nepal Labour Act Reference">
              <input value={form.nepal_act_ref||''} onChange={e=>setForm(p=>({...p,nepal_act_ref:e.target.value}))} placeholder="e.g. Sec.55 — 1 day per 20 days" style={{...inp}}/>
            </Field>
            <Field label="Remarks">
              <textarea rows={2} value={form.remarks} onChange={e=>setForm(p=>({...p,remarks:e.target.value}))} style={{...inp,resize:'vertical'}}/>
            </Field>

            <div style={{display:'flex',gap:10,marginTop:20}}>
              <button onClick={save} disabled={saving} style={{flex:1,padding:'10px',borderRadius:10,border:'none',
                background:A,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',opacity:saving?.6:1}}>
                {saving?'Saving...':editRule?'Update Rule':'Create Rule'}
              </button>
              <button onClick={()=>setShowForm(false)} style={{padding:'10px 18px',borderRadius:10,
                border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
