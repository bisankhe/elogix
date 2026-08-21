// FILE: VendorLeaveRequestsPage.jsx - Vendor Employee Leave Requests
// Calendar view, self-service, AI auto-approve, Nepal Labour Act 2074 balances

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, Badge, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#065f46 0%,#0891b2 60%,#38bdf8 100%)'
const A = '#0891b2'

const LEAVE_TYPES = {
  sick:         {label:'Sick Leave',       color:'#ef4444',icon:'🤒',annual:12},
  annual:       {label:'Annual Leave',     color:'#3b82f6',icon:'🏖',annual:18},
  festival:     {label:'Festival Leave',   color:'#f59e0b',icon:'🎉',annual:13},
  casual:       {label:'Casual Leave',     color:'#8b5cf6',icon:'🚶',annual:6},
  maternity:    {label:'Maternity Leave',  color:'#ec4899',icon:'🤱',annual:98},
  paternity:    {label:'Paternity Leave',  color:'#06b6d4',icon:'👨‍👶',annual:15},
  unpaid:       {label:'Unpaid Leave',     color:'#94a3b8',icon:'📋',annual:0},
  half_day:     {label:'Half Day Leave',   color:'#06b6d4',icon:'🕐',annual:0},

const LEAVE_REQUESTS = [
  { id:'lr1', request_no:'LR-2025-041', emp_id:'VE-001', emp_name:'Ramesh Bahadur Shrestha',
    vendor:'ShieldGuard Nepal', role:'Security Guard', leave_type:'sick',
    from_date:'2025-06-18', to_date:'2025-06-19', days:2,
    status:'pending', applied_on:'2025-06-16', applied_via:'mobile',
    balance_before:12, balance_after:10, cover_arrangement:'VE-005 Hari Prasad Rai',
    impact_links:['Attendance','Billing','SLA Contract'] },
  { id:'lr2', request_no:'LR-2025-038', emp_id:'VE-002', emp_name:'Sunita Gurung',
    vendor:'CleanPro Services', role:'Housekeeper', leave_type:'festival',
    from_date:'2025-07-05', to_date:'2025-07-07', days:3,
    status:'approved', applied_on:'2025-06-10', applied_via:'web',
    balance_before:13, balance_after:10, cover_arrangement:'Temp staff arranged by CleanPro',
    approved_by:'HR Manager - Priya Adhikari', approved_date:'2025-06-11',
    impact_links:['Attendance','Billing'] },
  { id:'lr3', request_no:'LR-2025-035', emp_id:'VE-003', emp_name:'Bikash Tamang',
    vendor:'TechStaff Solutions', role:'IT Helpdesk L1', leave_type:'casual',
    from_date:'2025-06-20', to_date:'2025-06-20', days:1,
    status:'rejected', applied_on:'2025-06-14', applied_via:'web',
    balance_before:3, balance_after:3, cover_arrangement:'None',
    rejected_by:'Team Lead - Anil KC', rejected_date:'2025-06-15',
    impact_links:['Attendance'] },
  { id:'lr4', request_no:'LR-2025-042', emp_id:'VE-005', emp_name:'Hari Prasad Rai',
    vendor:'ShieldGuard Nepal', role:'Security Guard', leave_type:'annual',
    from_date:'2025-07-14', to_date:'2025-07-18', days:5,
    status:'pending', applied_on:'2025-06-15', applied_via:'mobile',
    balance_before:18, balance_after:13, cover_arrangement:'Pending - ShieldGuard to arrange',
    impact_links:['Attendance','SLA Contract','Billing'] },
  { id:'lr5', request_no:'LR-2025-046', emp_id:'VE-002', emp_name:'Sunita Gurung',
    vendor:'CleanPro Services', role:'Housekeeper', leave_type:'half_day',
    from_date:'2025-06-22', to_date:'2025-06-22', days:0.5, half_day_slot:'afternoon',
    status:'pending', applied_on:'2025-06-20', applied_via:'mobile',
    balance_before:6, balance_after:5.5, cover_arrangement:'Morning shift colleague to cover',
    impact_links:['Attendance','Billing'] },
]

const STATUS_CFG = {
  pending:  {c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',icon:'⏳',label:'Pending'},
  approved: {c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',icon:'✅',label:'Approved'},
  rejected: {c:'#ef4444',bg:'#fef2f2',b:'#fecaca',icon:'❌',label:'Rejected'},
  cancelled:{c:'#94a3b8',bg:'#f8fafc',b:'#e2e8f0',icon:'🚫',label:'Cancelled'},
const CTX_ACTIONS = [
  {icon:'✅',label:'Approve Leave',        key:'approve'},
  {icon:'❌',label:'Reject Leave',          key:'reject'},
  {icon:'💬',label:'Request More Info',     key:'info'},
  {icon:'📅',label:'View Leave Calendar',   key:'calendar'},
  {icon:'📊',label:'Check Balance',         key:'balance'},
  {icon:'🔗',label:'Impact Analysis',       key:'impact'},
  {icon:'📤',label:'Export',                key:'export'},
]

export default function VendorLeaveRequestsPage() {
  const [requests, setRequests] = useState(LEAVE_REQUESTS)
  const [view, setView] = useState('list')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [form, setForm] = useState({emp_id:'',leave_type:'sick',from_date:'',to_date:'',reason:'',cover:'',half_day_slot:'full_day'})

  const filtered = requests.filter(r=>{
    if (filterStatus!=='all'&&r.status!==filterStatus) return false
    if (filterType!=='all'&&r.leave_type!==filterType) return false
    if (search&&!r.emp_name.toLowerCase().includes(search.toLowerCase())&&!r.request_no.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const pending  = requests.filter(r=>r.status==='pending').length
  const approved = requests.filter(r=>r.status==='approved').length
  const totalDays = requests.filter(r=>r.status==='approved').reduce((s,r)=>s+r.days,0)

  const approveReq = (id) => setRequests(p=>p.map(r=>r.id===id?{...r,status:'approved',approved_by:'HR Manager',approved_date:new Date().toISOString().split('T')[0]}:r))
  const rejectReq  = (id) => setRequests(p=>p.map(r=>r.id===id?{...r,status:'rejected',rejected_by:'HR Manager',rejected_date:new Date().toISOString().split('T')[0]}:r))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏖" title="Leave Requests (Vendor Employees)"
        breadcrumb="Organization Management > Vendor / Outsource Employee Management"
        gradient={G}
        stats={[
          {icon:'⏳',label:'Pending',        value:pending},
          {icon:'✅',label:'Approved',        value:approved},
          {icon:'📅',label:'Total Days Off',  value:totalDays},
          {icon:'📋',label:'All Requests',    value:requests.length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Request"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#f0fdf4,#eff6ff)',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#065f46'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> Annual 18 days + 12 sick + 13 festival + 6 casual. Maternity 98 days (full pay). Paternity 15 days. Vendor employees entitled to all statutory leave per Section 53 of LA2074.</div>
      </div>

      {/* Leave type legend */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        {Object.entries(LEAVE_TYPES).map(([k,v])=>(
          <div key={k} style={{display:'flex',gap:5,alignItems:'center',fontSize:10,color:'#475569',padding:'4px 10px',borderRadius:20,border:`1px solid ${filterType===k?v.color:'#e2e8f0'}`,background:filterType===k?`${v.color}12`:'#fff',cursor:'pointer'}} onClick={()=>setFilterType(filterType===k?'all':k)}>
            <span style={{color:v.color}}>{v.icon}</span>{v.label} <span style={{fontSize:9,color:'#94a3b8'}}>({v.annual}d/yr)</span>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, request no..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','pending','approved','rejected'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'8px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:11,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:12}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status]||STATUS_CFG.pending
          const lt = LEAVE_TYPES[r.leave_type]||{icon:'📋',color:'#64748b',label:'Leave'}
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.emp_name,...r}})}}
              style={{background:'#fff',border:`1px solid ${sc.b}`,borderRadius:14,overflow:'hidden',
                boxShadow:'0 2px 8px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{width:44,height:44,borderRadius:12,background:`${lt.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{lt.icon}</div>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.emp_name}</span>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    <span style={{background:`${lt.color}12`,color:lt.color,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{lt.icon} {lt.label}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{r.request_no} . {r.emp_id} . {r.vendor} . {r.role}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:lt.color}}>{r.days}d{r.half_day_slot&&r.half_day_slot!=='full_day'?<span style={{fontSize:10,color:'#06b6d4',marginLeft:4}}>½</span>:null}</div>
                  {r.half_day_slot&&r.half_day_slot!=='full_day'&&<div style={{fontSize:8,background:'#f0f9ff',color:'#0369a1',padding:'2px 6px',borderRadius:6,fontWeight:700}}>{r.half_day_slot==='morning'?'Morning Half':'Afternoon Half'}</div>}
                  <div style={{fontSize:10,color:'#94a3b8'}}>{r.from_date} to {r.to_date}</div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:0,borderBottom:'1px solid #f8fafc'}}>
                <div style={{padding:'10px 18px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:3}}>Reason</div>
                  <div style={{fontSize:11,color:'#64748b'}}>{r.reason}</div>
                  {r.cover_arrangement && <div style={{fontSize:10,color:'#10b981',marginTop:4}}>Cover: {r.cover_arrangement}</div>}
                </div>
                <div style={{padding:'10px 14px',borderLeft:'1px solid #f8fafc'}}>
                  <div style={{fontSize:10,color:'#94a3b8',marginBottom:3}}>Leave Balance</div>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{r.balance_before} {'->'} {r.balance_after}</div>
                  <div style={{fontSize:9,color:'#94a3b8'}}>Before {'->'} After</div>
                </div>
                <div style={{padding:'10px 14px',borderLeft:'1px solid #f8fafc'}}>
                  <div style={{fontSize:10,color:'#94a3b8',marginBottom:3}}>AI Recommendation</div>
                  <div style={{fontSize:10,color:'#64748b',fontStyle:'italic',lineHeight:1.4}}>{r.ai_recommendation}</div>
                </div>
              </div>

              {r.status==='pending' && (
                <div style={{padding:'10px 16px',display:'flex',gap:8,background:'#fffbeb',borderBottom:'1px solid #fde68a'}}>
                  <span style={{fontSize:10,color:'#92400e',flex:1}}>Applied: {r.applied_on} via {r.applied_via}</span>
                  <button onClick={()=>approveReq(r.id)} style={{padding:'6px 16px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Approve</button>
                  <button onClick={()=>rejectReq(r.id)} style={{padding:'6px 16px',borderRadius:8,border:'none',background:'#ef4444',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Reject</button>
                </div>
              )}
              {r.status==='approved' && (
                <div style={{padding:'8px 18px',background:'#f0fdf4',fontSize:10,color:'#15803d'}}>
                  Approved by: <strong>{r.approved_by}</strong> on {r.approved_date}
                </div>
              )}
              {r.status==='rejected' && (
                <div style={{padding:'8px 18px',background:'#fef2f2',fontSize:10,color:'#dc2626'}}>
                  Rejected by: <strong>{r.rejected_by}</strong> on {r.rejected_date} . Reason: {r.rejection_reason}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>+ New Leave Request (Vendor Employee)</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Employee (VE-ID)" type="select" value={form.emp_id} onChange={v=>setForm(p=>({...p,emp_id:v}))} accent={A}
                  options={['VE-001 Ramesh Shrestha','VE-002 Sunita Gurung','VE-003 Bikash Tamang','VE-005 Hari Rai']}/>
                <Field label="Leave Type" type="select" value={form.leave_type} onChange={v=>setForm(p=>({...p,leave_type:v}))} accent={A}
                  options={Object.entries(LEAVE_TYPES).map(([k,v])=>`${v.icon} ${v.label}`)}/>
                <Field label="From Date" type="date" value={form.from_date} onChange={v=>setForm(p=>({...p,from_date:v}))} accent={A}/>
                <Field label="To Date (same as From for half day)" type="date" value={form.to_date} onChange={v=>setForm(p=>({...p,to_date:v}))} accent={A}/>
                <div style={{gridColumn:'1/-1',display:'flex',gap:8,alignItems:'center',padding:'8px 12px',background:'#f0f9ff',borderRadius:10,border:'1px solid #bae6fd'}}>
                  <span style={{fontSize:14}}>🕐</span>
                  <span style={{fontSize:10,fontWeight:700,color:'#0369a1',flex:1}}>Half Day Leave</span>
                  <div style={{display:'flex',gap:4}}>
                    {['full_day','morning','afternoon'].map(slot=>(
                      <button key={slot} onClick={()=>setForm(p=>({...p,half_day_slot:p.half_day_slot===slot&&slot!=='full_day'?'full_day':slot}))}
                        style={{padding:'4px 12px',borderRadius:8,border:'none',cursor:'pointer',fontSize:9,fontWeight:700,
                          background:form.half_day_slot===slot?A:'#e0f2fe',color:form.half_day_slot===slot?'#fff':'#0369a1'}}>
                        {slot==='full_day'?'Full Day':slot==='morning'?'Morning Half':'Afternoon Half'}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Reason" value={form.reason} onChange={v=>setForm(p=>({...p,reason:v}))} accent={A} hint="Voice input supported"/>
                <Field label="Coverage Arrangement" value={form.cover} onChange={v=>setForm(p=>({...p,cover:v}))} accent={A}/>
              </div>
              <AIImpact color={A} lines={[
                'AI checks leave balance, team coverage, and SLA impact before routing.',
                'Auto-approval for sick leave with sufficient balance and coverage.',
                'Manager + Vendor Agency HR notified simultaneously.',
                'Nepal LA2074: Vendor employees entitled to same statutory leave as direct hires.',
              ]}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{setRequests(p=>[{id:'lr'+Date.now(),request_no:'LR-2025-0'+Math.floor(Math.random()*90+10),emp_id:form.emp_id?.split(' ')[0]||'VE-001',emp_name:form.emp_id?.split(' ').slice(1).join(' ')||'Employee',vendor:'Vendor',role:'Staff',leave_type:form.leave_type?.toLowerCase().split(' ')[0]||'annual',from_date:form.from_date,to_date:form.to_date,days:1,reason:form.reason,status:'pending',applied_on:new Date().toISOString().split('T')[0],applied_via:'web',balance_before:10,balance_after:9,cover_arrangement:form.cover,ai_recommendation:'Pending review.',impact_links:['Attendance']}, ...p]);setShowAdd(false)}}
                  style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Request</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX_ACTIONS} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel && <ExcelModal title="Leave Requests" columns={['Request No','Employee ID','Employee Name','Vendor','Leave Type','From Date','To Date','Days','Reason','Status','Applied On']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
