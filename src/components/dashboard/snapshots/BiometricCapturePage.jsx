// FILE: BiometricCapturePage.jsx — Biometric Capture (Preboarding)
// AI liveness detection, facial ID verification, consent management, attendance system sync
// Nepal: Not mandated for domestic hires under Labour Act 2074; mandatory for foreign nationals (DoFE/Immigration)

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const CAPTURES = [
  { id:'bc1', employee_id:'EMP-2081-0142', name:'Gita Maharjan', position:'Cloud Architect',
    nationality:'Nepali', capture_type:'facial+fingerprint',
    facial_status:'verified', fingerprint_status:'verified', liveness_check:'passed',
    consent_given:true, consent_date:'2025-06-12', capture_date:'2025-06-13',
    id_match_score:97.8, device:'Mobile App (Android)', synced_to_attendance:true,
    status:'completed',
    ai_note:'High-confidence match (97.8%). Liveness check passed — blink + smile detected. No spoofing flags.',
    impact_links:['Joining Checklist','Attendance Setup','Employee Profile'] },
  { id:'bc2', employee_id:'EMP-2081-0141', name:'Sunita Rai', position:'Senior Software Developer',
    nationality:'Nepali', capture_type:'facial',
    facial_status:'pending', fingerprint_status:'not_required', liveness_check:'pending',
    consent_given:true, consent_date:'2025-06-16', capture_date:null,
    id_match_score:null, device:null, synced_to_attendance:false,
    status:'pending_capture',
    ai_note:'Consent recorded. Awaiting biometric capture session — webcam-based facial scan scheduled for joining day.',
    impact_links:['Joining Checklist'] },
  { id:'bc3', employee_id:'EMP-2081-0098', name:'John Mark Williams', position:'Technical Consultant (Foreign National)',
    nationality:'British', capture_type:'facial+fingerprint+document',
    facial_status:'verified', fingerprint_status:'verified', liveness_check:'passed',
    consent_given:true, consent_date:'2025-05-20', capture_date:'2025-05-22',
    id_match_score:99.1, device:'Office Kiosk', synced_to_attendance:true,
    status:'completed', work_permit_biometric:true, dofe_registered:true,
    ai_note:'Foreign national — DoFE/Immigration biometric profiling completed per mandatory requirement. Work permit linked.',
    impact_links:['Joining Checklist','Work Permit Compliance','Attendance Setup'] },
  { id:'bc4', employee_id:'EMP-2081-0143', name:'Hari Adhikari', position:'HR Business Partner',
    nationality:'Nepali', capture_type:'facial',
    facial_status:'failed', fingerprint_status:'not_required', liveness_check:'failed',
    consent_given:true, consent_date:'2025-06-14', capture_date:'2025-06-15',
    id_match_score:42.3, device:'Mobile App (iOS)', synced_to_attendance:false,
    status:'retry_required',
    ai_note:'LOW CONFIDENCE (42.3%) — possible poor lighting or angle. Liveness check failed. Retry capture required.',
    impact_links:['Joining Checklist'] },
]

const STATUS_CFG = {
  completed:        {c:'#10b981', bg:'#f0fdf4', b:'#bbf7d0', icon:'✅', label:'Completed'},
  pending_capture:  {c:'#f59e0b', bg:'#fffbeb', b:'#fde68a', icon:'📷', label:'Pending Capture'},
  retry_required:   {c:'#ef4444', bg:'#fef2f2', b:'#fecaca', icon:'🔄', label:'Retry Required'},
  consent_declined: {c:'#94a3b8', bg:'#f8fafc', b:'#e2e8f0', icon:'🚫', label:'Consent Declined'},
}

const CHECK_CFG = {verified:'#10b981', passed:'#10b981', pending:'#f59e0b', failed:'#ef4444', not_required:'#94a3b8'}

const CTX = [
  {icon:'👁',label:'View Capture Details',  key:'view'},
  {icon:'📷',label:'Re-initiate Capture',    key:'retry'},
  {icon:'📋',label:'View Consent Record',    key:'consent'},
  {icon:'🔗',label:'Sync to Attendance',     key:'sync'},
  {icon:'🔗',label:'Impact Analysis',        key:'impact'},
  {icon:'📤',label:'Export',                 key:'export'},
  {icon:'🗑',label:'Revoke Biometric Data',  key:'revoke',danger:true},
]

export default function BiometricCapturePage() {
  const [captures, setCaptures]   = useState(CAPTURES)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('all')
  const [selected, setSelected]   = useState(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]             = useState(null)
  const [liveCapture, setLiveCapture] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)

  const filtered = captures.filter(c=>{
    if (filterStatus!=='all'&&c.status!==filterStatus) return false
    if (search&&!c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const completed = captures.filter(c=>c.status==='completed').length
  const pending    = captures.filter(c=>c.status==='pending_capture').length
  const retryCount = captures.filter(c=>c.status==='retry_required').length

  const startLiveCapture = () => {
    setLiveCapture(true)
    setScanProgress(0)
    const interval = setInterval(()=>{
      setScanProgress(p=>{
        if (p>=100) { clearInterval(interval); return 100 }
        return p+10
      })
    }, 200)
  }

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔐" title="Biometric Capture"
        breadcrumb="Employee Lifecycle > Onboarding > Preboarding"
        gradient={G}
        stats={[
          {icon:'🔐',label:'Total Records',  value:captures.length},
          {icon:'✅',label:'Completed',       value:completed},
          {icon:'📷',label:'Pending Capture', value:pending},
          {icon:'🔄',label:'Retry Required',  value:retryCount},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Capture Session"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#1e40af'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Compliance:</strong> Biometric capture not legally mandated for domestic hires under Labour Act 2074. <strong>Mandatory for foreign nationals</strong> per Department of Foreign Employment (DoFE) and Immigration requirements. Explicit consent required for all biometric data collection regardless of nationality.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','completed','pending_capture','retry_required'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))',gap:14}}>
        {filtered.map(c=>{
          const sc = STATUS_CFG[c.status]||STATUS_CFG.pending_capture
          return (
            <LuxCard key={c.id} color={sc.c} onClick={()=>setSelected(c)}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.name,...c}})}}>
              <div style={{padding:'14px 16px 10px',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:48,height:48,borderRadius:14,background:`${sc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{c.capture_type.includes('document')?'🛂':'🔐'}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{c.name}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{c.position}</div>
                  <div style={{display:'flex',gap:5,marginTop:4,flexWrap:'wrap'}}>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {c.nationality!=='Nepali'&&<span style={{background:'#fef9c3',color:'#854d0e',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{c.nationality} — DoFE Required</span>}
                  </div>
                </div>
                {c.id_match_score&&(
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:900,color:c.id_match_score>=90?'#10b981':c.id_match_score>=70?'#f59e0b':'#ef4444'}}>{c.id_match_score}%</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>ID MATCH</div>
                  </div>
                )}
              </div>

              <div style={{padding:'0 16px 10px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                {[['Facial',c.facial_status],['Fingerprint',c.fingerprint_status],['Liveness',c.liveness_check]].map(([l,v],i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'6px 4px'}}>
                    <div style={{fontSize:11,fontWeight:800,color:CHECK_CFG[v]||'#94a3b8',textTransform:'capitalize'}}>{v.replace('_',' ')}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{l}</div>
                  </div>
                ))}
              </div>

              <div style={{padding:'0 16px 10px',display:'flex',gap:5,flexWrap:'wrap'}}>
                <span style={{background:c.consent_given?'#f0fdf4':'#fef2f2',color:c.consent_given?'#15803d':'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{c.consent_given?'✓':'✗'} Consent</span>
                <span style={{background:c.synced_to_attendance?'#f0fdf4':'#fffbeb',color:c.synced_to_attendance?'#15803d':'#f59e0b',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{c.synced_to_attendance?'✓':'⏳'} Attendance Sync</span>
                {c.device&&<span style={{background:'#f8fafc',color:'#475569',fontSize:9,padding:'2px 8px',borderRadius:20,border:'1px solid #e2e8f0'}}>{c.device}</span>}
              </div>

              <div style={{padding:'0 16px 10px',fontSize:10,color:'#64748b',fontStyle:'italic'}}>🤖 {c.ai_note}</div>

              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                {(c.status==='pending_capture'||c.status==='retry_required')&&(
                  <button onClick={ev=>{ev.stopPropagation();startLiveCapture()}} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Start Capture</button>
                )}
                <button onClick={ev=>{ev.stopPropagation();setSelected(c)}} style={{flex:1,padding:'7px',borderRadius:8,border:`1px solid ${A}33`,background:`${A}10`,color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>View Details</button>
              </div>
            </LuxCard>
          )
        })}
      </div>

      {/* Live capture simulation modal */}
      {liveCapture&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:6000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setLiveCapture(false)}>
          <div style={{background:'#0f172a',borderRadius:20,width:420,padding:'24px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff',marginBottom:16}}>AI Liveness Detection</div>
            <div style={{width:240,height:240,margin:'0 auto 16px',borderRadius:'50%',border:`4px solid ${scanProgress>=100?'#10b981':A}`,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,.05)'}}>
              <div style={{fontSize:60}}>{scanProgress>=100?'✅':'🧑'}</div>
              <div style={{position:'absolute',inset:-4,borderRadius:'50%',border:`4px solid transparent`,borderTopColor:A,transform:`rotate(${scanProgress*3.6}deg)`,transition:'transform .2s linear'}}/>
            </div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.7)',marginBottom:8}}>{scanProgress<100?'Please blink and smile naturally...':'Liveness confirmed! Matching against ID...'}</div>
            <div style={{height:6,background:'rgba(255,255,255,.1)',borderRadius:6,overflow:'hidden',marginBottom:16}}>
              <div style={{width:`${scanProgress}%`,height:'100%',background:A,borderRadius:6,transition:'width .2s linear'}}/>
            </div>
            <button onClick={()=>setLiveCapture(false)} style={{padding:'10px 24px',borderRadius:10,border:'none',background:scanProgress>=100?'#10b981':'#374151',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>
              {scanProgress>=100?'Done':'Cancel'}
            </button>
          </div>
        </div>
      )}

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>New Biometric Capture Session</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Employee" type="select" value="" onChange={e=>setForm(p=>({...p,[e.target.name||'f']:e.target.value}))} accent={A} options={['Sunita Rai (EMP-2081-0141)','New Employee']}/>
                <Field label="Nationality" type="select" value="" onChange={e=>setForm(p=>({...p,[e.target.name||'f']:e.target.value}))} accent={A} options={['Nepali','Foreign National']}/>
                <Field label="Capture Type" type="select" value="" onChange={e=>setForm(p=>({...p,[e.target.name||'f']:e.target.value}))} accent={A} options={['facial','facial+fingerprint','facial+fingerprint+document']}/>
                <Field label="Capture Device" type="select" value="" onChange={e=>setForm(p=>({...p,[e.target.name||'f']:e.target.value}))} accent={A} options={['Mobile App (Android)','Mobile App (iOS)','Office Kiosk','Webcam (Desktop)']}/>
              </div>
              <div style={{margin:'12px 0'}}>
                <label style={{display:'flex',gap:8,alignItems:'center',cursor:'pointer',fontSize:12,color:'#334155'}}>
                  <input type="checkbox" style={{accentColor:A}}/> Employee consent to biometric data collection obtained and documented
                </label>
              </div>
              <AIImpact color={A} lines={['AI liveness detection prevents photo/video spoofing.','Facial ID matched against uploaded national ID/passport.','Foreign nationals: auto-flagged for DoFE/Immigration registration.','On completion, syncs automatically to Attendance & Time Tracking module.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{setShowAdd(false);startLiveCapture()}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Start Live Capture</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Biometric Capture" columns={['Employee ID','Name','Nationality','Capture Type','Facial Status','Fingerprint Status','Consent','ID Match %','Capture Date']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Employee ID',selected?.employee_id],['Name',selected?.name],['Nationality',selected?.nationality],
        ['Capture Type',selected?.capture_type],['Facial Status',selected?.facial_status],
        ['Fingerprint Status',selected?.fingerprint_status],['Liveness Check',selected?.liveness_check],
        ['ID Match Score',selected?.id_match_score?selected.id_match_score+'%':'N/A'],
        ['Consent Given',selected?.consent_given?'Yes':'No'],['Consent Date',selected?.consent_date],
        ['Capture Date',selected?.capture_date||'Pending'],['Device',selected?.device||'N/A'],
        ['Synced to Attendance',selected?.synced_to_attendance?'Yes':'No'],['AI Note',selected?.ai_note],
      ]}/>
    </div>
  )
}
