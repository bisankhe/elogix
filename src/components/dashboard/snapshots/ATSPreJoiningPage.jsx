// ATSPreJoiningPage.jsx
// Pre-Joining: Document Collection (PAN, Citizenship, Passport, etc.)
// Background Verification · Payroll Integration · Attendance Integration · Welcome Kit
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const DOCS_REQUIRED = [
  { id:'d1', name:'Government ID / Citizenship',  icon:'🪪', required:true,  bgv:false },
  { id:'d2', name:'Educational Certificates',      icon:'🎓', required:true,  bgv:true  },
  { id:'d3', name:'Experience Letters / Relieving',icon:'💼', required:true,  bgv:true  },
  { id:'d4', name:'PAN Card',                      icon:'📋', required:true,  bgv:false },
  { id:'d5', name:'Passport (if applicable)',       icon:'📕', required:false, bgv:false },
  { id:'d6', name:'Police Clearance Report',        icon:'👮', required:true,  bgv:true  },
  { id:'d7', name:'Bank Details (for salary)',      icon:'🏦', required:true,  bgv:false },
  { id:'d8', name:'Medical Certificate',            icon:'🏥', required:true,  bgv:false },
  { id:'d9', name:'Recent Passport Photos (3)',     icon:'📷', required:true,  bgv:false },
  { id:'d10',name:'Emergency Contact Form',         icon:'📞', required:true,  bgv:false },
  { id:'d11',name:'Previous Employment Proof',      icon:'📄', required:false, bgv:true  },
  { id:'d12',name:'Signed Offer Letter (copy)',     icon:'✍️', required:true,  bgv:false },
]

const JOINERS = [
  { id:'j1', name:'Gita Maharjan',   role:'Senior React Dev', dept:'Technology', joining:'2081-09-15', manager:'Bikash Shrestha', salary:95000, docs:{ d1:'Received',d2:'Received',d3:'Received',d4:'Received',d5:'NA',d6:'Pending',d7:'Received',d8:'Received',d9:'Received',d10:'Pending',d11:'Received',d12:'Received' }, bgvStatus:'In Progress', payrollCreated:false, empId:'EMP-2081-047', welcomeEmailSent:true },
  { id:'j2', name:'Anil KC',         role:'Senior React Dev', dept:'Technology', joining:'2081-09-20', manager:'Bikash Shrestha', salary:110000,docs:{ d1:'Pending',d2:'Pending',d3:'Pending',d4:'Pending',d5:'Pending',d6:'Pending',d7:'Pending',d8:'Pending',d9:'Pending',d10:'Pending',d11:'Pending',d12:'Received' }, bgvStatus:'Not Started', payrollCreated:false, empId:'EMP-2081-048', welcomeEmailSent:false },
]

const BGV_CHECKS = [
  { name:'Identity Verification',    status:'Cleared',     detail:'Citizenship verified — matches records' },
  { name:'Education Verification',   status:'Cleared',     detail:'M.Tech CS from TU — confirmed' },
  { name:'Employment Verification',  status:'In Progress', detail:'Contacting previous employer — ETA 2 days' },
  { name:'Criminal Record Check',    status:'Cleared',     detail:'Police clearance — clean record' },
  { name:'Reference Check (2/3)',    status:'In Progress', detail:'2 of 3 references responded positively' },
  { name:'Social Media Screening',   status:'Cleared',     detail:'No adverse findings' },
]

export default function ATSPreJoiningPage() {
  const { navigate } = useApp()
  const [selJoiner, setSelJoiner] = useState(JOINERS[0])
  const [docStatus, setDocStatus] = useState({})
  const [msg, setMsg] = useState('')
  const [payrollLoading, setPayrollLoading] = useState(false)
  const [tab, setTab] = useState('docs') // docs | bgv | payroll | welcome

  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const jDocs = { ...selJoiner.docs, ...docStatus }
  const received = Object.values(jDocs).filter(v=>v==='Received').length
  const total = DOCS_REQUIRED.filter(d=>d.required && jDocs[d.id]!=='NA').length
  const pct = Math.round(received / total * 100)

  const createPayroll = async () => {
    setPayrollLoading(true)
    await new Promise(r=>setTimeout(r,1500))
    setPayrollLoading(false)
    notify(`Payroll record created for ${selJoiner.name}! NPR ${selJoiner.salary.toLocaleString()}/month. Synced to HRMS payroll module.`)

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'linear-gradient(135deg,#059669,#0891b2)', borderRadius:14, padding:'16px 22px', marginBottom:16, color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900 }}>Pre-Joining & Onboarding</h2>
          <p style={{ margin:'3px 0 0', fontSize:10, opacity:.8 }}>Document collection · Background verification · Payroll setup · Attendance integration · Welcome kit</p>
        </div>
        {msg && <span style={{ fontSize:9, padding:'5px 14px', background:'rgba(255,255,255,.2)', borderRadius:8 }}>{msg}</span>}
      </div>

      {/* Joiner selector */}
      <div style={{ background:'#fff', borderRadius:12, padding:'10px 14px', marginBottom:14, border:'1px solid #e2e8f0', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <span style={{ fontSize:10, fontWeight:700, color:'#374151', flexShrink:0 }}>Joining Candidate:</span>
        {JOINERS.map(j=>(
          <button key={j.id} onClick={()=>{setSelJoiner(j);setDocStatus({})}} style={{ padding:'7px 14px', borderRadius:9, border:`2px solid ${selJoiner.id===j.id?'#059669':'#e2e8f0'}`, background:selJoiner.id===j.id?'#f0fdf4':'#fff', color:selJoiner.id===j.id?'#065f46':'#475569', fontSize:10, fontWeight:selJoiner.id===j.id?800:400, cursor:'pointer' }}>
            {j.name} — {j.joining}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      <div style={{ background:'#fff', borderRadius:12, padding:'12px 16px', marginBottom:14, border:'1px solid #e2e8f0', display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, marginBottom:4 }}>
            <span style={{ fontWeight:700, color:'#374151' }}>Documents Received</span>
            <span style={{ fontWeight:900, color:pct===100?'#059669':pct>=70?'#f59e0b':'#ef4444' }}>{received}/{total} ({pct}%)</span>
          </div>
          <div style={{ height:8, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
            <div style={{ width:pct+'%', height:'100%', background:pct===100?'#059669':pct>=70?'#f59e0b':'#ef4444', borderRadius:4, transition:'width .3s' }}/>
          </div>
        </div>
        {[['Employee ID',selJoiner.empId],['Joining Date',selJoiner.joining],['Department',selJoiner.dept],['Manager',selJoiner.manager],['Salary','NPR '+selJoiner.salary.toLocaleString()]].map(([k,v])=>(
          <div key={k} style={{ textAlign:'center', padding:'6px 10px', background:'#f8fafc', borderRadius:8 }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#0f172a' }}>{v}</div>
            <div style={{ fontSize:7, color:'#94a3b8' }}>{k}</div>
          </div>
        ))}
      </div>

      {/* Sub tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {[['docs','📄 Documents'],['bgv','🔍 Background Check'],['payroll','💳 Payroll & Attendance'],['welcome','🎉 Welcome Kit']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 16px', borderRadius:9, background:tab===t?'#059669':'#fff', color:tab===t?'#fff':'#475569', fontSize:10, fontWeight:tab===t?800:400, cursor:'pointer', border:tab!==t?'1px solid #e2e8f0':'none' }}>{l}</button>
        ))}
      </div>

      {/* DOCUMENTS TAB */}
      {tab==='docs' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:10 }}>
            {DOCS_REQUIRED.map(d=>{
              const st = jDocs[d.id] || 'Pending'
              const stC = st==='Received'?'#059669':st==='Pending'?'#f59e0b':st==='NA'?'#94a3b8':'#ef4444'
              const stBg = st==='Received'?'#f0fdf4':st==='Pending'?'#fffbeb':st==='NA'?'#f8fafc':'#fef2f2'
              return(
                <div key={d.id} style={{ background:'#fff', borderRadius:11, padding:'12px 14px', border:`1.5px solid ${st==='Received'?'#bbf7d0':st==='Pending'?'#fde68a':'#f1f5f9'}` }}>
                  <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
                    <div style={{ fontSize:22, flexShrink:0 }}>{d.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{d.name}</div>
                      <div style={{ fontSize:8, color:'#94a3b8' }}>{d.required?'Required':'Optional'}{d.bgv?' · BGV Required':''}</div>
                    </div>
                    <span style={{ fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:6, background:stBg, color:stC }}>{st}</span>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={()=>{setDocStatus(s=>({...s,[d.id]:'Received'}));notify(d.name+' marked as received!')}} style={{ flex:1, padding:'5px', borderRadius:7, border:'none', background:'#059669', color:'#fff', fontSize:8, cursor:'pointer' }}>Received</button>
                    <button onClick={()=>{setDocStatus(s=>({...s,[d.id]:'Pending'}))}} style={{ flex:1, padding:'5px', borderRadius:7, border:'1px solid #fde68a', background:'#fffbeb', color:'#92400e', fontSize:8, cursor:'pointer' }}>Pending</button>
                    {!d.required && <button onClick={()=>{setDocStatus(s=>({...s,[d.id]:'NA'}))}} style={{ padding:'5px 8px', borderRadius:7, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#94a3b8', fontSize:8, cursor:'pointer' }}>N/A</button>}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display:'flex', gap:10, marginTop:14 }}>
            <button onClick={()=>notify('Document checklist sent to '+selJoiner.name+' via Email + WhatsApp!')} style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#059669,#0891b2)', color:'#fff', fontSize:10, fontWeight:800, cursor:'pointer' }}>Send Document Request (Email + WhatsApp)</button>
            <button onClick={()=>notify('Reminder sent!')} style={{ padding:'10px 18px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:10, cursor:'pointer' }}>Send Reminder</button>
          </div>
        </div>
      )}

      {/* BGV TAB */}
      {tab==='bgv' && (
        <div>
          <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:12 }}>Background Verification — {selJoiner.name}</div>
          <div style={{ background:selJoiner.bgvStatus==='Cleared'?'#f0fdf4':'#fffbeb', borderRadius:10, padding:'10px 14px', marginBottom:14, border:`1px solid ${selJoiner.bgvStatus==='Cleared'?'#bbf7d0':'#fde68a'}` }}>
            <div style={{ fontSize:10, fontWeight:800, color:selJoiner.bgvStatus==='Cleared'?'#065f46':'#92400e' }}>BGV Status: {selJoiner.bgvStatus}</div>
          </div>
          {BGV_CHECKS.map((c,i)=>(
            <div key={i} style={{ background:'#fff', borderRadius:11, padding:'12px 14px', marginBottom:8, border:`1px solid ${c.status==='Cleared'?'#bbf7d0':c.status==='In Progress'?'#fde68a':'#fecaca'}`, display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:c.status==='Cleared'?'#f0fdf4':c.status==='In Progress'?'#fffbeb':'#fef2f2', border:`2px solid ${c.status==='Cleared'?'#10b981':c.status==='In Progress'?'#f59e0b':'#ef4444'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                {c.status==='Cleared'?'✅':c.status==='In Progress'?'⏳':'❌'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{c.name}</div>
                <div style={{ fontSize:9, color:'#64748b' }}>{c.detail}</div>
              </div>
              <span style={{ fontSize:8, fontWeight:700, padding:'2px 9px', borderRadius:7, background:c.status==='Cleared'?'#d1fae5':c.status==='In Progress'?'#fef9c3':'#fee2e2', color:c.status==='Cleared'?'#065f46':c.status==='In Progress'?'#92400e':'#dc2626' }}>{c.status}</span>
            </div>
          ))}
          <div style={{ display:'flex', gap:10, marginTop:12 }}>
            <button onClick={()=>notify('BGV report requested from agency!')} style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:'#1e40af', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>Request BGV Report</button>
            <button onClick={()=>notify('BGV agency notified!')} style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:10, cursor:'pointer' }}>Escalate to Agency</button>
          </div>
        </div>
      )}

      {/* PAYROLL & ATTENDANCE TAB */}
      {tab==='payroll' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:4 }}>Payroll Setup</div>
              <div style={{ fontSize:9, color:'#64748b', marginBottom:14 }}>Create payroll record in HRMS and configure salary, SSF, TDS, and tax settings.</div>
              {[['Employee ID',selJoiner.empId],['Name',selJoiner.name],['Department',selJoiner.dept],['Designation',selJoiner.role],['Gross Salary','NPR '+selJoiner.salary.toLocaleString()],['Joining Date',selJoiner.joining],['SSF (Employer 20%)','NPR '+(selJoiner.salary*.20).toLocaleString()],['SSF (Employee 11%)','NPR '+(selJoiner.salary*.11).toLocaleString()],['PF Contribution','NPR '+(selJoiner.salary*.10).toLocaleString()],['TDS (as per slab)','Calculated on setup']].map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:9, padding:'5px 0', borderBottom:'1px solid #f8fafc' }}>
                  <span style={{ color:'#94a3b8' }}>{k}</span><span style={{ color:'#0f172a', fontWeight:600 }}>{v}</span>
                </div>
              ))}
              <div style={{ background:'#fffbeb', borderRadius:8, padding:'8px 10px', marginTop:12, marginBottom:12, fontSize:8, color:'#92400e', border:'1px solid #fde68a' }}>
                Per Nepal SSF Act: Employer 20% + Employee 11% = 31% total SSF contribution. Nepal Labour Act 2074 compliance applied.
              </div>
              <button onClick={createPayroll} disabled={payrollLoading} style={{ width:'100%', padding:'10px', borderRadius:10, border:'none', background:payrollLoading?'#e2e8f0':'linear-gradient(135deg,#059669,#0891b2)', color:payrollLoading?'#94a3b8':'#fff', fontSize:10, fontWeight:800, cursor:payrollLoading?'default':'pointer' }}>
                {payrollLoading?'Creating Payroll Record...':'Create Payroll Record in HRMS'}
              </button>
            </div>
            <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:4 }}>Attendance Integration</div>
              <div style={{ fontSize:9, color:'#64748b', marginBottom:14 }}>Register employee in biometric/attendance system and configure shift, leave policy.</div>
              {[['Attendance System','HRMS Biometric'],['Shift','9:00 AM – 6:00 PM (Mon–Fri)'],['Work Days','5 days/week'],['Annual Leave','18 days (Nepal Labour Act)'],['Sick Leave','12 days/year'],['Festival Holidays','13 public holidays'],['Overtime Policy','Per LA2074 Section 26'],['Location','Head Office, Kathmandu']].map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:9, padding:'5px 0', borderBottom:'1px solid #f8fafc' }}>
                  <span style={{ color:'#94a3b8' }}>{k}</span><span style={{ color:'#0f172a', fontWeight:600 }}>{v}</span>
                </div>
              ))}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12 }}>
                <button onClick={()=>notify('Biometric enrollment scheduled!')} style={{ padding:'9px', borderRadius:9, border:'none', background:'#7c3aed', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>Enroll Biometric</button>
                <button onClick={()=>notify('Leave policy assigned!')} style={{ padding:'9px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:9, cursor:'pointer' }}>Assign Leave Policy</button>
                <button onClick={()=>notify('IT setup ticket created!')} style={{ padding:'9px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:9, cursor:'pointer' }}>IT Setup Ticket</button>
                <button onClick={()=>notify('Asset assignment list sent!')} style={{ padding:'9px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:9, cursor:'pointer' }}>Assign Assets</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WELCOME KIT TAB */}
      {tab==='welcome' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ background:'linear-gradient(135deg,#f0fdf4,#ecfeff)', borderRadius:14, padding:20, border:'1px solid #bbf7d0' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>🎉</div>
              <div style={{ fontSize:14, fontWeight:900, color:'#0f172a', marginBottom:4 }}>Welcome to eLogix HRMS!</div>
              <div style={{ fontSize:10, color:'#374151', lineHeight:1.7, marginBottom:16 }}>
                Dear {selJoiner.name},<br/><br/>
                We are thrilled to welcome you as our new <strong>{selJoiner.role}</strong>. Your journey with us begins on <strong>{selJoiner.joining}</strong>. Your Employee ID is <strong>{selJoiner.empId}</strong>.<br/><br/>
                Your manager will be <strong>{selJoiner.manager}</strong>. Please bring all required documents on your first day.
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <button onClick={()=>notify('Welcome email sent to '+selJoiner.name+'!')} style={{ padding:'9px', borderRadius:9, border:'none', background:'#059669', color:'#fff', fontSize:9, fontWeight:800, cursor:'pointer' }}>Send Welcome Email</button>
                <button onClick={()=>notify('Welcome WhatsApp sent!')} style={{ padding:'9px', borderRadius:9, border:'none', background:'#25d366', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>Send WhatsApp</button>
                <button onClick={()=>notify('Orientation calendar invite sent!')} style={{ padding:'9px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:9, cursor:'pointer' }}>Schedule Orientation</button>
                <button onClick={()=>notify('Welcome kit PDF generated!')} style={{ padding:'9px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:9, cursor:'pointer' }}>Generate Welcome Kit</button>
              </div>
            </div>
            <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:12 }}>Day 1 Onboarding Checklist</div>
              {[['Welcome email sent','HR',true],['Employee ID assigned','HR',true],['Manager introduction','HR',false],['IT setup (laptop, email, tools)','IT',false],['Biometric enrollment','Admin',false],['Office tour','Admin',false],['HR policy briefing','HR',false],['Payroll account setup','Finance',false],['SSF enrollment','Finance',false],['Emergency contact collected','HR',false]].map(([t,owner,done],i)=>(
                <div key={i} style={{ display:'flex', gap:10, alignItems:'center', padding:'7px 0', borderBottom:'1px solid #f8fafc' }}>
                  <div style={{ width:18, height:18, borderRadius:'50%', background:done?'#059669':'#f1f5f9', border:`2px solid ${done?'#059669':'#e2e8f0'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff', flexShrink:0 }}>{done?'✓':''}</div>
                  <span style={{ flex:1, fontSize:9, color:done?'#374151':'#64748b', fontWeight:done?600:400 }}>{t}</span>
                  <span style={{ fontSize:7, color:'#94a3b8' }}>{owner}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
