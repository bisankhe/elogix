// FILE: VendorReportsPage.jsx - Vendor Reports & Analytics
// Strategic spend analytics, Nepal DOL statutory reports, AI insights

import { useState } from 'react'
import { ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0f172a 0%,#581c87 60%,#7c3aed 100%)'
const A = '#7c3aed'

const REPORT_TYPES = [
  { id:'r1', name:'Total Vendor Spend YTD', icon:'💰', color:'#1e40af',
    value:'NPR 24.8L', change:'+12%', period:'Jan-Jun 2025',
    breakdown:[
      {label:'Security Services',  value:1112760, pct:45, color:'#3b82f6'},
      {label:'Housekeeping',        value:397105,  pct:16, color:'#10b981'},
      {label:'IT Support',          value:353498,  pct:14, color:'#f59e0b'},
      {label:'Payroll Processing',  value:321120,  pct:13, color:'#8b5cf6'},
      {label:'Others',              value:297000,  pct:12, color:'#64748b'},
    ],
    ai_insight:'Vendor spend up 12% YoY. Security services dominating at 45%. Consider renegotiating ShieldGuard rate at renewal.',
  },
  { id:'r2', name:'SLA Compliance Summary', icon:'📊', color:'#059669',
    value:'89.5%', change:'-2.1%', period:'Jun 2025',
    breakdown:[
      {label:'ShieldGuard Nepal',   value:96, pct:96, color:'#10b981'},
      {label:'CleanPro Services',   value:88, pct:88, color:'#3b82f6'},
      {label:'SalaryExpert',        value:99, pct:99, color:'#7c3aed'},
      {label:'TechStaff Solutions', value:74, pct:74, color:'#ef4444'},
    ],
    ai_insight:'TechStaff Solutions pulling overall SLA below 90% threshold. Immediate performance review required.',
  },
  { id:'r3', name:'Invoice Processing Time', icon:'⏱', color:'#d97706',
    value:'2.8 days avg', change:'-0.7d', period:'Jun 2025',
    breakdown:[
      {label:'Upload to OCR Scan',  value:0.5, pct:18, color:'#3b82f6'},
      {label:'3-Way Match Check',   value:0.8, pct:29, color:'#f59e0b'},
      {label:'HR Approval',         value:0.7, pct:25, color:'#8b5cf6'},
      {label:'Finance Approval',    value:0.8, pct:29, color:'#10b981'},
    ],
    ai_insight:'Cycle time improved 0.7d to 2.8 days (target: <3.5d). Finance approval is bottleneck. Consider auto-approve for invoices under NPR 50,000.',
  },
  { id:'r4', name:'Workforce Headcount', icon:'👷', color:'#7c3aed',
    value:'83 workers', change:'+5', period:'Jun 2025',
    breakdown:[
      {label:'Security (ShieldGuard)', value:45, pct:54, color:'#3b82f6'},
      {label:'Housekeeping (CleanPro)',value:18, pct:22, color:'#10b981'},
      {label:'IT Staff (TechStaff)',   value:12, pct:14, color:'#f59e0b'},
      {label:'Drivers (DrivePro)',     value:5,  pct:6,  color:'#8b5cf6'},
      {label:'Others',                 value:3,  pct:4,  color:'#64748b'},
    ],
    ai_insight:'83 vendor workers across 5 agencies. 67% in non-core roles per LA2074. TechStaff IT roles need compliance review (core work risk).',
  },
  { id:'r5', name:'TDS & Tax Summary', icon:'🏛', color:'#dc2626',
    value:'NPR 1.23L', change:'+14%', period:'Jan-Jun 2025',
    breakdown:[
      {label:'TDS on Services (1.5%)',  value:85000, pct:69, color:'#ef4444'},
      {label:'VAT Collected (13%)',     value:38000, pct:31, color:'#f97316'},
    ],
    ai_insight:'All TDS deductions filed with IRD. 6 TDS certificates generated YTD. Q2 TDS return due July 15.',
  },
]

const STATUTORY = [
  {title:'Annual Labour Audit Report',deadline:'2026-02-28',status:'pending',authority:'Department of Labour (DOL)',icon:'📋'},
  {title:'Q2 TDS Return (Services)',deadline:'2025-07-15',status:'due_soon',authority:'Inland Revenue Department (IRD)',icon:'🏛'},
  {title:'Poush Report - Vendor Employee Details',deadline:'2026-01-15',status:'pending',authority:'Department of Labour (DOL)',icon:'📊'},
  {title:'SSF Employer Quarterly Filing',deadline:'2025-09-30',status:'upcoming',authority:'Social Security Fund (SSF)',icon:'🛡'},
]

const CTX_ACTIONS = [
  {icon:'👁',label:'View Full Report',     key:'view'},
  {icon:'📊',label:'Drill Down',           key:'drill'},
  {icon:'📤',label:'Export to Excel',      key:'export'},
  {icon:'📄',label:'Generate PDF Report',  key:'pdf'},
  {icon:'📧',label:'Email to Management',  key:'email'},
  {icon:'🔗',label:'Impact Analysis',      key:'impact'},
]

export default function VendorReportsPage() {
  const [activeReport, setActiveReport] = useState('r1')
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),4000) }
  const [search, setSearch] = useState('')
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const report = REPORT_TYPES.find(r=>r.id===activeReport)||REPORT_TYPES[0]

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📈" title="Vendor Reports & Analytics"
        breadcrumb="Organization Management > Vendor / Outsource Management"
        gradient={G}
        stats={[
          {icon:'💰',label:'Total Spend YTD',  value:'NPR 24.8L'},
          {icon:'📊',label:'Avg SLA Score',     value:'89.5%'},
          {icon:'⏱',label:'Invoice Cycle',      value:'2.8 days'},
          {icon:'👷',label:'Total Workers',      value:'83'},
        ]}
        onAdd={()=>{setGenerating(true);notify('🤖 AI is generating comprehensive vendor report...');setTimeout(()=>{setGenerating(false);notify('✅ Vendor Report generated! Download ready.')},2500)}} addLabel={generating?'⏳ Generating...':'📊 Generate Report'}
        onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:8,alignItems:'center'}}>{generating&&<span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>⏳</span>}{msg}</div>}

      <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:16,marginTop:4}}>
        {/* Report sidebar */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:8,padding:'0 4px'}}>REPORT CATEGORIES</div>
          {REPORT_TYPES.map(r=>(
            <div key={r.id} onClick={()=>setActiveReport(r.id)}
              style={{marginBottom:4,padding:'12px 14px',borderRadius:12,cursor:'pointer',
                background:activeReport===r.id?`${r.color}12`:'#fff',
                border:`1.5px solid ${activeReport===r.id?r.color:'#e2e8f0'}`,
                transition:'all .15s ease'}}>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:18}}>{r.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#0f172a',lineHeight:1.3}}>{r.name}</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>{r.period}</div>
                </div>
              </div>
              {activeReport===r.id&&(
                <div style={{marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:16,fontWeight:900,color:r.color}}>{r.value}</span>
                  <span style={{fontSize:10,fontWeight:700,color:r.change.startsWith('+')?'#10b981':'#ef4444',background:r.change.startsWith('+')?'#f0fdf4':'#fef2f2',padding:'2px 8px',borderRadius:20}}>{r.change}</span>
                </div>
              )}
            </div>
          ))}

          {/* Statutory reports */}
          <div style={{fontSize:11,fontWeight:700,color:'#64748b',margin:'16px 4px 8px'}}>STATUTORY SUBMISSIONS</div>
          {STATUTORY.map((s,i)=>{
            const statusColor = s.status==='due_soon'?'#ef4444':s.status==='upcoming'?'#f59e0b':'#94a3b8'
            return (
              <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:'10px 12px',marginBottom:6}}>
                <div style={{display:'flex',gap:6,alignItems:'flex-start'}}>
                  <span style={{fontSize:14}}>{s.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#0f172a',lineHeight:1.3}}>{s.title}</div>
                    <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{s.authority}</div>
                    <div style={{fontSize:9,color:statusColor,fontWeight:700,marginTop:2}}>Due: {s.deadline}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Report detail panel */}
        <div>
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,.05)'}}>
            <div style={{background:`linear-gradient(135deg,${report.color}22,${report.color}08)`,padding:'20px 24px',borderBottom:'1px solid #e2e8f0'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:18,fontWeight:900,color:'#0f172a',display:'flex',gap:8,alignItems:'center'}}>{report.icon} {report.name}</div>
                  <div style={{fontSize:11,color:'#64748b',marginTop:2}}>Period: {report.period}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:28,fontWeight:900,color:report.color}}>{report.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:report.change.startsWith('+')?'#10b981':'#ef4444'}}>{report.change} vs last period</div>
                </div>
              </div>
            </div>

            {/* Bar chart visualization */}
            <div style={{padding:'20px 24px'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:14}}>Breakdown</div>
              {report.breakdown.map((item,i)=>(
                <div key={i} style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:11}}>
                    <span style={{color:'#475569',fontWeight:600}}>{item.label}</span>
                    <span style={{fontWeight:800,color:item.color}}>{item.pct}{typeof item.value==='number'&&item.value>100?'%':''}</span>
                  </div>
                  <div style={{height:10,background:'#f1f5f9',borderRadius:10,overflow:'hidden'}}>
                    <div style={{
                      width:`${item.pct}%`,height:'100%',borderRadius:10,
                      background:`linear-gradient(90deg,${item.color},${item.color}88)`,
                      transition:'width .8s ease'
                    }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* AI insight */}
            <div style={{margin:'0 24px 24px',background:`${report.color}08`,border:`1px solid ${report.color}22`,borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:11,fontWeight:700,color:report.color,marginBottom:5}}>AI Insight</div>
              <div style={{fontSize:11,color:'#475569',lineHeight:1.6}}>{report.ai_insight}</div>
            </div>

            {/* Export buttons — all working */}
            <div style={{borderTop:'1px solid #f1f5f9',padding:'14px 24px',display:'flex',gap:10}}>
              <button onClick={()=>notify('📤 Exporting: '+report.name+' to Excel...')} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>📤 Export Excel</button>
              <button onClick={()=>notify('📄 Generating PDF: '+report.name+'...')} style={{flex:1,padding:'10px',borderRadius:10,border:`1px solid ${A}33`,background:`${A}10`,color:A,fontSize:12,fontWeight:700,cursor:'pointer'}}>📄 Generate PDF</button>
              <button onClick={()=>notify('📧 Report emailed to management!')} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:12,fontWeight:600,cursor:'pointer'}}>📧 Email Report</button>
            </div>
          </div>

          {/* AI Summary Card */}
          <div style={{marginTop:14,background:'linear-gradient(135deg,#0f172a,#312e81)',borderRadius:14,padding:'18px 20px',color:'#fff'}}>
            <div style={{fontSize:13,fontWeight:800,marginBottom:10}}>AI Executive Summary - Vendor Management H1 2025</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[
                {l:'Total Vendor Spend',v:'NPR 24.8L',trend:'up',note:'12% increase YoY'},
                {l:'Avg SLA Compliance',v:'89.5%',trend:'down',note:'TechStaff pulling score down'},
                {l:'Invoice Cycle Time',v:'2.8 days',trend:'down',note:'Under 3.5 day global target'},
                {l:'High-Risk Vendors',v:'1 of 4',trend:'stable',note:'TechStaff - action required'},
              ].map((s,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,.08)',borderRadius:10,padding:'10px 14px'}}>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.6)',marginBottom:3}}>{s.l}</div>
                  <div style={{fontSize:16,fontWeight:900}}>{s.v}</div>
                  <div style={{fontSize:9,color:'rgba(255,255,255,.5)'}}>{s.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showExcel&&<ExcelModal title="Vendor Reports" columns={['Report Type','Period','Value','Change','Vendor','Category','Amount NPR']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
