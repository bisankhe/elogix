// FILE: AttendanceReportsPage.jsx - Attendance Reports (Attendance Management)
// Configurable, audit-ready report builder: Workhours Distribution, Missing Punch,
// Leave Liability, custom date-range filters, PDF/Excel export, scheduled delivery.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e293b 0%,#334155 60%,#94a3b8 100%)'
const A = '#334155'

const REPORT_TEMPLATES = [
  {key:'workhours',label:'Workhours Distribution Report',icon:'⏱',desc:'Total hours by employee, department, regular vs overtime'},
  {key:'missing_punch',label:'Missing Punch Report',icon:'🕐',desc:'All unresolved and resolved missed punches in range'},
  {key:'leave_liability',label:'Leave Liability Report',icon:'📅',desc:'Accrued leave balances and financial liability exposure'},
  {key:'late_coming',label:'Late-Coming Summary',icon:'⏰',desc:'Tardiness frequency and total minutes by employee'},
  {key:'overtime_cost',label:'Overtime Cost Report',icon:'💰',desc:'OT hours and cost breakdown by department'},
  {key:'labour_audit',label:'Annual Labour Audit Pack',icon:'⚖',desc:'Full compliance bundle for Labour Office submission'},
]

const RECENT_REPORTS = [
  {name:'Workhours Distribution - June 2025',generated:'2025-06-21 09:00 AM',format:'PDF',size:'2.4 MB',scheduled:false},
  {name:'Missing Punch Report - Week 24',generated:'2025-06-20 06:00 AM',format:'Excel',size:'180 KB',scheduled:true},
  {name:'Annual Labour Audit Pack - FY 2024/25',generated:'2025-06-15 11:30 AM',format:'PDF',size:'8.1 MB',scheduled:false},
]

export default function AttendanceReportsPage() {
  const [showBuilder, setShowBuilder] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [form, setForm] = useState({})
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📄" title="Attendance Reports"
        breadcrumb="Workforce Operations > Attendance Management"
        gradient={G}
        stats={[
          {icon:'📄',label:'Report Templates', value:REPORT_TEMPLATES.length},
          {icon:'🕐',label:'Recent Reports',     value:RECENT_REPORTS.length},
          {icon:'📅',label:'Scheduled',          value:RECENT_REPORTS.filter(r=>r.scheduled).length},
          {icon:'⚖',label:'Audit-Ready',        value:'Yes'},
        ]}
        onAdd={()=>setShowBuilder(true)} addLabel="Generate Report"/>

      <div style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#334155',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074 Compliance:</strong> Employers must conduct an annual Labour Audit and submit comprehensive attendance records to the Labour Office when demanded. These reports serve as primary legal defense and evidence of compliance in employment disputes.</div>
      </div>

      <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>📋 Report Templates</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12,marginBottom:24}}>
        {REPORT_TEMPLATES.map(t=>(
          <div key={t.key} onClick={()=>{setSelectedTemplate(t);setShowBuilder(true)}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px',cursor:'pointer',transition:'all .2s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=A}
            onMouseLeave={e=>e.currentTarget.style.borderColor='#e2e8f0'}>
            <div style={{fontSize:24,marginBottom:8}}>{t.icon}</div>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:4}}>{t.label}</div>
            <div style={{fontSize:10,color:'#64748b'}}>{t.desc}</div>
          </div>
        ))}
      </div>

      <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>🕐 Recently Generated</div>
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden'}}>
        {RECENT_REPORTS.map((r,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.name,impact_links:['Attendance Analytics','Payroll Setup']}})}}
            style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 18px',borderBottom:i<RECENT_REPORTS.length-1?'1px solid #f8fafc':'none'}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{r.name}{r.scheduled&&<span style={{marginLeft:8,background:'#eff6ff',color:'#1d4ed8',fontSize:8,fontWeight:700,padding:'1px 7px',borderRadius:20}}>🔄 Auto-Scheduled</span>}</div>
              <div style={{fontSize:9,color:'#94a3b8'}}>{r.generated} . {r.format} . {r.size}</div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#f8fafc',color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>📥 Download</button>
              <button style={{padding:'6px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:10,cursor:'pointer'}}>📧 Email</button>
            </div>
          </div>
        ))}
      </div>

      {showBuilder&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>{setShowBuilder(false);setSelectedTemplate(null)}}>
          <div style={{background:'#fff',borderRadius:20,width:580,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>{selectedTemplate?selectedTemplate.label:'Custom Report Builder'}</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Start Date</label>
                <input type="date" value={form.startDate||""} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>End Date</label>
                <input type="date" value={form.endDate||""} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Department</label>
                <select value={form.department||"All Departments"} onChange={e=>setForm(p=>({...p,department:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="All Departments" value="All Departments">All Departments</option><option key="IT" value="IT">IT</option><option key="Finance" value="Finance">Finance</option><option key="Sales" value="Sales">Sales</option><option key="HR" value="HR">HR</option></select>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Format</label>
                <select value={form.format||"PDF"} onChange={e=>setForm(p=>({...p,format:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="PDF" value="PDF">PDF</option><option key="Excel" value="Excel">Excel</option></select>
                </div>
              </div>
              <label style={{display:'flex',gap:8,alignItems:'center',margin:'10px 0',fontSize:12,color:'#374151',cursor:'pointer'}}>
                <input type="checkbox" style={{accentColor:A}}/> Schedule this report for recurring auto-delivery
              </label>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Deliver To (email, comma-separated)</label>
                <input type="text" value={form.deliverToEmailCommas||""} placeholder="Voice input supported" onChange={e=>setForm(p=>({...p,deliverToEmailCommas:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
              <AIImpact color={A} lines={['Reports generated as a permanent, searchable historical record.','Audit-ready format complies with Nepal Labour Office submission requirements.','Scheduled reports auto-deliver to department heads and finance on your set cadence.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>{setShowBuilder(false);setSelectedTemplate(null)}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Generate Report</button>
                <button onClick={()=>{setShowBuilder(false);setSelectedTemplate(null)}} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'📥',label:'Download',key:'download'},{icon:'📧',label:'Email',key:'email'},
        {icon:'🔄',label:'Re-generate',key:'regen'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
