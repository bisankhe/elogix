// FILE: HolidayManagementPage.jsx - Holiday Management (Leave Operations)
// Interactive timeline of public/cultural/optional holidays, BS+AD dual-date,
// substitute-leave tracker (21-day rule), women's-extra-day flag.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const HOLIDAYS = [
  { id:'h1', name:'Dashain (Phulpati)', name_nepali:'फूलपाती', date_ad:'2025-10-09', date_bs:'2082-06-23', type:'statutory', category:'major_festival', women_only:false, impact_links:['Leave Policy'] },
  { id:'h2', name:'Dashain (Bijaya Dashami)', name_nepali:'विजया दशमी', date_ad:'2025-10-11', date_bs:'2082-06-25', type:'statutory', category:'major_festival', women_only:false, impact_links:[] },
  { id:'h3', name:'Tihar (Laxmi Puja)', name_nepali:'लक्ष्मी पूजा', date_ad:'2025-10-29', date_bs:'2082-07-13', type:'statutory', category:'major_festival', women_only:false, impact_links:[] },
  { id:'h4', name:'International Women\'s Day', name_nepali:'महिला दिवस', date_ad:'2026-03-08', date_bs:'2082-11-25', type:'statutory', category:'international', women_only:true, impact_links:[] },
  { id:'h5', name:'Labour Day (May Day)', name_nepali:'मे दिवस', date_ad:'2026-05-01', date_bs:'2083-01-18', type:'statutory', category:'international', women_only:false, impact_links:[] },
  { id:'h6', name:'Company Foundation Day', name_nepali:null, date_ad:'2026-02-14', date_bs:'2082-11-02', type:'optional', category:'regional', women_only:false, impact_links:[] },
]

const SUBSTITUTE_TRACKER = [
  { employee:'Ramesh Shrestha (Security)', worked_holiday:'2025-10-11 (Bijaya Dashami)', substitute_due_by:'2025-11-01', status:'pending' },
  { employee:'Sita Tamang (Housekeeping)', worked_holiday:'2025-10-09 (Phulpati)', substitute_due_by:'2025-10-30', status:'taken' },
]

const TYPE_CFG = {statutory:{c:'#10b981',label:'Statutory'},optional:{c:'#94a3b8',label:'Optional'},restricted:{c:'#f59e0b',label:'Restricted'}}

export default function HolidayManagementPage() {
  const [holidays, setHolidays] = useState(HOLIDAYS)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = holidays.filter(h=>!search||h.name.toLowerCase().includes(search.toLowerCase()))
  const statutoryCount = holidays.filter(h=>h.type==='statutory').length
  const pendingSubstitutes = SUBSTITUTE_TRACKER.filter(s=>s.status==='pending').length

  return (
    <div onClick={()=>setCtx(null)}>
      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}
      <PageHeader icon="🎌" title="Holiday Management"
        breadcrumb="Workforce Operations > Leave Management > Leave Operations"
        gradient={G}
        stats={[
          {icon:'🎌',label:'Total Holidays',    value:holidays.length},
          {icon:'⚖',label:'Statutory',          value:statutoryCount},
          {icon:'👩',label:'Women +1 Day',       value:holidays.filter(h=>h.women_only).length},
          {icon:'🔄',label:'Substitute Pending', value:pendingSubstitutes},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add Holiday"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> 13 paid public holidays/year (14 for women, incl. International Women's Day). Public holidays are NOT deducted from individual leave balances. If staff work through a holiday/weekly-off, a substitute day off must be given within 21 days.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search holidays..."/>

      {/* Timeline */}
      <div style={{marginTop:14,position:'relative',paddingLeft:24}}>
        <div style={{position:'absolute',left:8,top:8,bottom:8,width:2,background:'#e2e8f0'}}/>
        {filtered.map(h=>{
          const tc = TYPE_CFG[h.type]
          return (
            <div key={h.id} style={{position:'relative',marginBottom:14}}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:h.name,...h}})}}>
              <div style={{position:'absolute',left:-20,top:4,width:14,height:14,borderRadius:'50%',background:tc.c,border:'3px solid #fff',boxShadow:`0 0 0 2px ${tc.c}33`}}/>
              <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'14px 18px',boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                  <div>
                    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{h.name}</span>
                      {h.name_nepali&&<span style={{fontSize:11,color:'#64748b'}}>({h.name_nepali})</span>}
                      <span style={{background:`${tc.c}15`,color:tc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{tc.label}</span>
                      {h.women_only&&<span style={{background:'#fce7f3',color:'#be185d',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>👩 Women +1</span>}
                    </div>
                    <div style={{fontSize:10,color:'#64748b'}}>{h.date_ad} (AD) . {h.date_bs} (BS)</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Substitute leave tracker */}
      <div style={{marginTop:16,background:'#fff',border:'1px solid #fed7aa',borderRadius:16,padding:'18px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🔄 Substitute Leave Tracker (21-Day Rule)</div>
        {SUBSTITUTE_TRACKER.map((s,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<SUBSTITUTE_TRACKER.length-1?'1px solid #f8fafc':'none'}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{s.employee}</div>
              <div style={{fontSize:9,color:'#64748b'}}>Worked: {s.worked_holiday} . Due by: {s.substitute_due_by}</div>
            </div>
            <span style={{background:s.status==='pending'?'#fffbeb':'#f0fdf4',color:s.status==='pending'?'#b45309':'#15803d',fontSize:9,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{s.status==='pending'?'⏳ Pending':'✅ Taken'}</span>
          </div>
        ))}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:560,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Add Holiday</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Holiday Name (English) *</label>
                <input type="text" value={form.holidayNameEnglish||""} onChange={e=>setForm(p=>({...p,holidayNameEnglish:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Holiday Name (Nepali)</label>
                <input type="text" value={form.holidayNameNepali||""} onChange={e=>setForm(p=>({...p,holidayNameNepali:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Date (AD) *</label>
                <input type="date" value={form.dateAd||""} onChange={e=>setForm(p=>({...p,dateAd:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Date (BS)</label>
                <input type="text" value={form.dateBs||""} placeholder="e.g. 2082-06-23" onChange={e=>setForm(p=>({...p,dateBs:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Type</label>
                <select value={form.type||"Statutory"} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="Statutory" value="Statutory">Statutory</option><option key="Optional" value="Optional">Optional</option><option key="Restricted" value="Restricted">Restricted</option></select>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Category</label>
                <select value={form.category||"National"} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="National" value="National">National</option><option key="Religious" value="Religious">Religious</option><option key="International" value="International">International</option><option key="Major Festival" value="Major Festival">Major Festival</option><option key="Regional" value="Regional">Regional</option></select>
                </div>
              </div>
              <label style={{display:'flex',gap:8,alignItems:'center',margin:'10px 0',fontSize:12,color:'#374151',cursor:'pointer'}}>
                <input type="checkbox" style={{accentColor:A}}/> Extra day for women employees (e.g. International Women's Day)
              </label>
              <AIImpact color={A} lines={['Auto-applies to all employee calendars company-wide.','Never deducted from individual leave balances.','Substitute-leave tracker auto-creates a 21-day-due-by entry for anyone scheduled to work this date.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>{notify("Record created");setShowAdd(false);setForm({})}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Add Holiday</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'✏',label:'Edit',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'🗑',label:'Remove',key:'delete'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Holiday Calendar" columns={['Name','Name (Nepali)','Date AD','Date BS','Type','Category','Women Extra Day']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
