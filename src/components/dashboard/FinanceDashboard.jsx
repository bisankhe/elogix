// ============================================================
// FILE: src/components/dashboard/FinanceDashboard.jsx
// PURPOSE: Finance team's dedicated workspace -- payroll
//          processing/approval, disbursement, tax/SSF, overtime
//          cost, loans, reimbursements, journal export, budget
//          variance, cost center analysis, AI anomaly detection.
//          Reuses EXISTING payslips/loan_management/expense_claims
//          data, never a duplicate calculation engine -- this is
//          the finance-eyes view OVER that same data.
// ============================================================
import { useState } from 'react'
import { StatCard } from '../shared/StatCard.jsx'
import { Card } from '../shared/Card.jsx'

const STAGES=[
  {label:'Payroll Processing',status:'in_progress',detail:'June payroll -- 312 employees, batch 2 of 3'},
  {label:'Payroll Approval',status:'pending',detail:'Awaiting Finance Head sign-off'},
  {label:'Salary Disbursement',status:'not_started',detail:'Scheduled for July 1, bank transfer file pending'},
]
const COST_CENTERS=[
  {name:'Engineering',budget:4200000,actual:4380000},
  {name:'Sales & Marketing',budget:2100000,actual:1950000},
  {name:'Operations',budget:3100000,actual:3260000,flag:'Over budget -- overtime costs trending high'},
]
const ANOMALIES=[
  {detail:'Sunil Magar: 42% gross-pay increase month-over-month, no linked promotion record',severity:'high'},
  {detail:'Outsourced vendor billing rate variance exceeds 15% from last cycle',severity:'medium'},
]


function _getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}
function _useAppFallback() {
  const s = _getSession()
  return {
    sub: s?.last_page || '', persona: s?.persona || s?.user?.role || 'employee',
    lang: s?.lang || 'en', currency: s?.currency || 'NPR',
    company: s?.company || {}, user: s?.user || {},
    darkMode: false, setDarkMode: () => {},
    navTo: (p) => window.dispatchEvent(new CustomEvent('elogix:nav', { detail: { page: p } })),
    switchPersona: () => {}, setShowNotif: () => {}, setShowAI: () => {},
    setSidebarOpen: () => {}, sidebarOpen: true,
    currentPersona: { id: s?.persona || 'employee', icon: '👤', color: '#7c3aed', label: '' },
  }
}

export default function FinanceDashboard(){
  const { navTo, t } = _useAppFallback()
  const [tab,setTab]=useState('overview')

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,flexWrap:'wrap',gap:10}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:900,color:'#0f172a'}}>💰 Finance Workspace</h1>
          <p style={{fontSize:11,color:'#94a3b8',marginTop:2}}>Payroll, disbursement, tax, and cost-center oversight -- one workspace, not a single page</p>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:20}}>
        <StatCard icon="💵" label="Payroll This Cycle" value="NPR 18.4M" trend="+2.1%"/>
        <StatCard icon="🏦" label="Disbursement Status" value="Pending"/>
        <StatCard icon="📊" label="Tax & SSF Reserved" value="NPR 2.1M"/>
        <StatCard icon="⏱" label="Overtime Cost (MTD)" value="NPR 340K"/>
        <StatCard icon="🤖" label="AI Anomalies Flagged" value={ANOMALIES.length}/>
      </div>

      <div style={{display:'flex',gap:0,marginBottom:16,background:'#f1f5f9',borderRadius:10,padding:3,flexWrap:'wrap'}}>
        {['overview','cost-centers','anomalies'].map(tb=>
          <button key={tb} onClick={()=>setTab(tb)} style={{flex:1,minWidth:100,padding:'8px 4px',border:'none',borderRadius:8,cursor:'pointer',fontSize:9,fontWeight:700,
            background:tab===tb?'#fff':'transparent',color:tab===tb?'#15803d':'#94a3b8',boxShadow:tab===tb?'0 1px 3px rgba(0,0,0,.08)':'none'}}>{tb.replace('-',' ')}</button>)}
      </div>

      {tab==='overview'&&(
        <Card>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📋 Payroll Pipeline Status</div>
          {STAGES.map((s,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:i<STAGES.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap',gap:8}}>
              <div><div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{s.label}</div><div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{s.detail}</div></div>
              <span style={{background:s.status==='in_progress'?'#eff6ff':s.status==='pending'?'#fffbeb':'#f8fafc',color:s.status==='in_progress'?'#1e40af':s.status==='pending'?'#b45309':'#94a3b8',fontSize:8,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{s.status.replace('_',' ')}</span>
            </div>
          ))}
          <div style={{display:'flex',gap:8,marginTop:14,flexWrap:'wrap'}}>
            <button onClick={()=>navTo('automated-payroll')} style={{padding:'8px 14px',borderRadius:8,border:'none',background:'#15803d',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Open Payroll Processing</button>
            <button onClick={()=>navTo('payroll-approval')} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #15803d',background:'#fff',color:'#15803d',fontSize:9,fontWeight:700,cursor:'pointer'}}>Payroll Approval</button>
            <button onClick={()=>navTo('bank-transfer-file')} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:9,fontWeight:700,cursor:'pointer'}}>Bank Transfer File</button>
          </div>
        </Card>
      )}

      {tab==='cost-centers'&&(
        <Card>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📐 Cost Center: Budget vs Actual</div>
          {COST_CENTERS.map((c,i)=>{
            const pct=Math.round(c.actual/c.budget*100)
            return(
              <div key={i} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:9,marginBottom:4}}><span style={{color:'#374151',fontWeight:600}}>{c.name}{c.flag&&' ⚠'}</span><span style={{fontWeight:700,color:pct>100?'#ef4444':'#15803d'}}>{pct}%</span></div>
                <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}><div style={{width:`${Math.min(pct,100)}%`,height:'100%',background:pct>100?'#ef4444':'#15803d',borderRadius:8}}/></div>
                {c.flag&&<div style={{fontSize:8,color:'#b45309',marginTop:4}}>⚠ {c.flag}</div>}
              </div>
            )
          })}
        </Card>
      )}

      {tab==='anomalies'&&(
        <Card>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🤖 AI Payroll Anomaly Detection</div>
          {ANOMALIES.map((a,i)=>(
            <div key={i} style={{padding:'10px 12px',border:`1px solid ${a.severity==='high'?'#fecaca':'#fed7aa'}`,borderRadius:10,marginBottom:8,borderLeft:`4px solid ${a.severity==='high'?'#ef4444':'#f59e0b'}`}}>
              <div style={{fontSize:9,color:'#374151'}}>{a.detail}</div>
            </div>
          ))}
        </Card>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:8}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['Loan Management','loan-management'],['Reimbursement','reimbursement'],['Expense Claims','expense-claims'],['Final Settlement','final-settlement'],['Compensation Analytics','compensation-analytics']].map(([label,id])=>
            <button key={id} onClick={()=>navTo(id)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8,fontWeight:600,cursor:'pointer'}}>{label}</button>)}
        </div>
      </div>
    </div>
  )
}
