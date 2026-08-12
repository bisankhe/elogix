// FILE: FieldVisitTrackingPage.jsx - Field Visit Tracking (TA & DA) (Daily Attendance)
// Pre-travel request -> GPS check-in/out at manager-assigned location ->
// auto-calculated mileage TA + tiered DA -> receipt upload -> multi-level
// approval -> payroll sync. Live map dashboard for managers.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const CITY_TIER_RATES = {A:{label:'Tier A (Kathmandu/Pokhara)',da_npr:1200},B:{label:'Tier B (District HQ)',da_npr:900},C:{label:'Tier C (Rural/Remote)',da_npr:700}}
const TA_RATE_PER_KM = 15

const VISITS = [
  { id:'fv1', employee:'Ramesh Shrestha', position:'Sales Officer', visit_date:'2025-06-21',
    task:'Client renewal meeting', assigned_location:'Client ABC Pvt Ltd, Lalitpur', assigned_by:'Dipak Tamang',
    checkin_time:'10:15 AM', checkout_time:'01:30 PM', geo_validated:true,
    distance_km:18.4, city_tier:'A', ta_npr:276, da_npr:1200, total_allowance:1476,
    receipts_uploaded:2, receipt_total_npr:340, status:'pending_manager',
    route_deviation_pct:4, ai_flag:null,
    impact_links:['Task & Location Assignment','GPS Attendance'] },
  { id:'fv2', employee:'Sunita Rai', position:'HR Field Coordinator', visit_date:'2025-06-21',
    task:'SSF enrollment drive', assigned_location:'Multiple sites, Bhaktapur', assigned_by:'Priya Adhikari',
    checkin_time:'09:00 AM', checkout_time:'04:45 PM', geo_validated:true,
    distance_km:32.1, city_tier:'A', ta_npr:482, da_npr:1200, total_allowance:1682,
    receipts_uploaded:1, receipt_total_npr:150, status:'approved_manager',
    route_deviation_pct:2, ai_flag:null,
    impact_links:['Letters - SSF'] },
  { id:'fv3', employee:'Bikash Rai', position:'IT Field Support', visit_date:'2025-06-20',
    task:'Server installation', assigned_location:'Branch Office, Pokhara', assigned_by:'Bikash Shrestha',
    checkin_time:'08:00 AM', checkout_time:'06:00 PM', geo_validated:true,
    distance_km:206, city_tier:'A', ta_npr:3090, da_npr:1200, total_allowance:4290,
    receipts_uploaded:3, receipt_total_npr:2100, status:'approved_finance',
    route_deviation_pct:18, ai_flag:'Route deviated 18% from planned path - flagged for review, since approved with manager note.',
    impact_links:['Full & Final Settlement'] },
  { id:'fv4', employee:'Anjali Sharma', position:'Sales Executive', visit_date:'2025-06-19',
    task:'New lead prospecting', assigned_location:'Unassigned / Self-reported', assigned_by:null,
    checkin_time:'11:00 AM', checkout_time:'02:00 PM', geo_validated:false,
    distance_km:12, city_tier:'A', ta_npr:180, da_npr:1200, total_allowance:1380,
    receipts_uploaded:0, receipt_total_npr:0, status:'rejected',
    route_deviation_pct:null, ai_flag:'No manager-assigned task/location found - GPS could not validate the claimed site.',
    rejection_reason:'Field visit requires prior task+location assignment from supervisor. Please request assignment before traveling.',
    impact_links:[] },
]

const STATUS_CFG = {
  pending_manager:{c:'#f59e0b',bg:'#fffbeb',icon:'⏳',label:'Pending Manager'},
  approved_manager:{c:'#3b82f6',bg:'#eff6ff',icon:'👔',label:'Manager Approved > Finance'},
  approved_finance:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Approved & Synced to Payroll'},
  rejected:{c:'#ef4444',bg:'#fef2f2',icon:'🚫',label:'Rejected'},
}

export default function FieldVisitTrackingPage() {
  const [visits, setVisits] = useState(VISITS)
  const [form, setForm] = useState({})
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showRequest, setShowRequest] = useState(false)
  const [showExpense, setShowExpense] = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = visits.filter(v=>{
    if (filterStatus!=='all'&&v.status!==filterStatus) return false
    if (search&&!v.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalAllowance = visits.filter(v=>v.status!=='rejected').reduce((s,v)=>s+v.total_allowance,0)
  const pendingCount = visits.filter(v=>v.status==='pending_manager').length
  const flaggedCount = visits.filter(v=>v.ai_flag).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🚗" title="Field Visit Tracking (TA & DA)"
        breadcrumb="Workforce Operations > Attendance Management > Daily Attendance"
        gradient={G}
        stats={[
          {icon:'🚗',label:'Total Visits',     value:visits.length},
          {icon:'⏳',label:'Pending Approval', value:pendingCount},
          {icon:'⚠',label:'AI Flagged',       value:flaggedCount},
          {icon:'💰',label:'Total TA+DA',      value:'NPR '+totalAllowance.toLocaleString()},
        ]}
        onAdd={()=>setShowRequest(true)} addLabel="Request Field Visit"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>📍</span>
        <div><strong>Mandatory Pre-Assignment Rule:</strong> Before any field visit, the supervisor/manager must assign a specific task + location. No attendance or TA/DA is accepted from an odd/unassigned location - the GPS only validates check-ins within that pre-assigned geo-fence.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9,overflowX:'auto'}}>
          {['all',...Object.keys(STATUS_CFG)].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,whiteSpace:'nowrap',
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s].label}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(v=>{
          const sc = STATUS_CFG[v.status]
          return (
            <div key={v.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:v.employee,...v}})}}
              style={{background:'#fff',border:`1.5px solid ${v.ai_flag?'#fed7aa':sc.c+'33'}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{v.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {v.geo_validated?<span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>📍 Geo-Validated</span>:<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>📍 Not Validated</span>}
                  </div>
                  <div style={{fontSize:11,color:'#374151',fontWeight:600}}>{v.task}</div>
                  <div style={{fontSize:10,color:'#64748b',marginTop:2}}>📍 {v.assigned_location} {v.assigned_by&&`. Assigned by ${v.assigned_by}`}</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{v.visit_date} . {v.checkin_time} {'>'} {v.checkout_time}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:A}}>NPR {v.total_allowance.toLocaleString()}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>TOTAL TA + DA</div>
                </div>
              </div>

              <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,borderBottom:'1px solid #f8fafc'}}>
                {[{l:'Distance',v:v.distance_km?v.distance_km+' km':'-',c:'#3b82f6'},
                  {l:'TA (Mileage)',v:'NPR '+v.ta_npr,c:'#7c3aed'},
                  {l:'DA (Tier '+v.city_tier+')',v:'NPR '+v.da_npr,c:'#10b981'},
                  {l:'Receipts',v:v.receipts_uploaded+' (NPR '+v.receipt_total_npr+')',c:'#f59e0b'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:12,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600,marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>

              {v.ai_flag&&(
                <div style={{padding:'10px 20px',background:'#fff7ed',fontSize:10,color:'#9a3412',borderBottom:'1px solid #fed7aa'}}>
                  <strong>🤖 AI Flag{v.route_deviation_pct&&` (${v.route_deviation_pct}% route deviation)`}:</strong> {v.ai_flag}
                </div>
              )}
              {v.rejection_reason&&(
                <div style={{padding:'10px 20px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}>
                  <strong>Rejection note:</strong> {v.rejection_reason}
                </div>
              )}

              <div style={{padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:9,color:'#94a3b8'}}>Receipts: {v.receipts_uploaded} uploaded</span>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>setShowExpense(v)} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#fff7ed',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>📎 Add Receipt</button>
                  {v.status==='pending_manager'&&<button style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>✅ Approve</button>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Live map dashboard */}
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 18px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>🗺 Live Field Team Map (Today)</div>
        <div style={{height:200,background:'linear-gradient(135deg,#fff7ed,#fffbeb)',borderRadius:12,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:'30%',left:'20%',width:60,height:60,borderRadius:'50%',border:`2px dashed ${A}`,background:`${A}10`}}/>
          <div style={{position:'absolute',top:'55%',left:'55%',width:50,height:50,borderRadius:'50%',border:`2px dashed ${A}`,background:`${A}10`}}/>
          {visits.filter(v=>v.status!=='rejected').map((v,i)=>(
            <div key={i} style={{position:'absolute',top:`${25+i*16}%`,left:`${22+i*16}%`,width:11,height:11,borderRadius:'50%',
              background:v.geo_validated?'#10b981':'#ef4444',border:'2px solid #fff',boxShadow:'0 1px 4px rgba(0,0,0,.3)'}} title={v.employee}/>
          ))}
        </div>
        <div style={{fontSize:9,color:'#94a3b8',marginTop:8}}>Dashed circles = assigned task geo-fences . Dots = field team current/last position</div>
      </div>

      {/* Pre-Travel Request Form */}
      {showRequest&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowRequest(false)}>
          <div style={{background:'#fff',borderRadius:20,width:600,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Request Field Visit</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:4}}>Requires supervisor task + location assignment first.</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Visit Date *</label>
                <input type="date" value={form.visitDate||""} onChange={e=>setForm(p=>({...p,visitDate:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>City Tier</label>
                <input type="text" value={form.cityTier||""} onChange={e=>setForm(p=>({...p,cityTier:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Destination / Client *</label>
                <input type="text" value={form.destinationClient||""} onChange={e=>setForm(p=>({...p,destinationClient:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Estimated Distance (km)</label>
                <input type="number" value={form.estimatedDistanceKm||""} onChange={e=>setForm(p=>({...p,estimatedDistanceKm:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
              </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Purpose of Visit *</label>
                <textarea value={form.purposeOfVisit||""} onChange={e=>setForm(p=>({...p,purposeOfVisit:e.target.value}))} rows={3} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
                </div>
              <div style={{background:'#f8fafc',borderRadius:10,padding:'10px 14px',marginTop:8,fontSize:10,color:'#64748b'}}>
                Estimated allowance: <strong style={{color:A}}>TA NPR {TA_RATE_PER_KM}/km + DA per Tier</strong> - final amount auto-calculated from actual GPS-tracked distance.
              </div>
              <AIImpact color={A} lines={['Auto-creates a temporary geo-fence once manager assigns the task + location.','GPS check-in/out at that location auto-calculates TA via shortest-path distance.','City-tier DA auto-applied based on destination.','AI cross-checks route deviation and flags anomalies before manager review.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowRequest(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Request</button>
                <button onClick={()=>setShowRequest(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense/Receipt Upload */}
      {showExpense&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowExpense(null)}>
          <div style={{background:'#fff',borderRadius:20,width:520,maxHeight:'85vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:16,fontWeight:900,color:'#fff'}}>Add Receipt - {showExpense.employee}</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Expense Category</label>
                <select value={form.expenseCategory||"Food/Lodging"} onChange={e=>setForm(p=>({...p,expenseCategory:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="Food/Lodging" value="Food/Lodging">Food/Lodging</option><option key="Local Transit" value="Local Transit">Local Transit</option><option key="Fuel" value="Fuel">Fuel</option><option key="Toll/Parking" value="Toll/Parking">Toll/Parking</option><option key="Other" value="Other">Other</option></select>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Amount (NPR) *</label>
                <input type="number" value={form.amountNpr||""} onChange={e=>setForm(p=>({...p,amountNpr:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
              </div>
              <div style={{margin:'10px 0'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:6}}>Receipt Photo (OCR auto-fills amount)</div>
                <div style={{border:'2px dashed #fed7aa',borderRadius:12,padding:'20px',textAlign:'center',background:'#fff7ed',cursor:'pointer'}}>
                  <div style={{fontSize:26,marginBottom:4}}>📸</div>
                  <div style={{fontSize:10,color:'#9a3412'}}>Tap to take photo or upload from gallery</div>
                </div>
              </div>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowExpense(null)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Attach Receipt</button>
                <button onClick={()=>setShowExpense(null)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Visit Detail',key:'view'},{icon:'🗺',label:'View Route on Map',key:'map'},
        {icon:'✅',label:'Approve',key:'approve'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Field Visit Tracking" columns={['Employee','Visit Date','Task','Location','Distance KM','TA NPR','DA NPR','Total Allowance','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
