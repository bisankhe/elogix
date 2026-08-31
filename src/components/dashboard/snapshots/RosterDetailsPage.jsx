// FILE: RosterDetailsPage.jsx — Roster Details & Missing Roster Alert
// Shows weekly roster by dept · Alerts if dept hasn't submitted next-week roster
import { useState, useEffect } from 'react'
const G = 'linear-gradient(135deg,#1e3a5f 0%,#0891b2 60%,#38bdf8 100%)'
const A = '#0891b2'

const SHIFTS = { Morning:'#f59e0b', Afternoon:'#3b82f6', Night:'#7c3aed', Off:'#e2e8f0', Regular:'#10b981' }
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const THIS_WEEK = [
  { dept:'IT',        submitted:true,  staff:[
    {name:'Gita M.',    schedule:['Morning','Morning','Morning','Morning','Morning','Off','Off']},
    {name:'Hari T.',    schedule:['Regular','Regular','Regular','Regular','Regular','Off','Off']},
    {name:'Bikash K.',  schedule:['Afternoon','Afternoon','Morning','Morning','Afternoon','Off','Off']},
  ]},
  { dept:'Operations',submitted:true,  staff:[
    {name:'Ram B.',     schedule:['Morning','Morning','Morning','Morning','Morning','Morning','Off']},
    {name:'Suraj B.',   schedule:['Night','Night','Night','Night','Night','Off','Off']},
    {name:'Puja K.',    schedule:['Afternoon','Afternoon','Afternoon','Afternoon','Afternoon','Off','Off']},
  ]},
  { dept:'Finance',   submitted:true,  staff:[
    {name:'Maya P.',    schedule:['Regular','Regular','Regular','Regular','Regular','Off','Off']},
    {name:'Sushma K.',  schedule:['Regular','Regular','Regular','Regular','Regular','Off','Off']},
  ]},
]

const NEXT_WEEK_STATUS = [
  { dept:'Information Technology', submitted:true,  by:'Rajesh Sharma',  date:'2081-03-28' },
  { dept:'Finance & Accounts',     submitted:true,  by:'Sanjay Karki',   date:'2081-03-27' },
  { dept:'Human Resources',        submitted:false, by:null,             date:null,  deadline:'2081-03-29' },
  { dept:'Marketing & Sales',      submitted:false, by:null,             date:null,  deadline:'2081-03-29' },
  { dept:'Operations',             submitted:true,  by:'Maya Gurung',    date:'2081-03-28' },
  { dept:'Administration',         submitted:false, by:null,             date:null,  deadline:'2081-03-29' },
]
const MISSING = NEXT_WEEK_STATUS.filter(d=>!d.submitted)


function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch(_e){return{}}
}
function _getTenantCtx() {
  const s=_getSession()
  const token=localStorage.getItem('access_token')||s?.token||''
  const slug=s?.company?.slug||localStorage.getItem('elogix_tenant_slug')||''
  return {token,slug,valid:!!(token&&slug)}
}

export default function RosterDetailsPage() {
  const [apiData,setApiData]=useState(null)
  const [apiLoading,setApiLoading]=useState(true)
  const [apiError,setApiError]=useState(null)
  const [tab, setTab] = useState('this-week')
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  useEffect(()=>{
    const {token,slug,valid} = _getTenantCtx()
    if(!valid){setApiLoading(false);return}
    setApiLoading(true);setApiError(null)
    fetch('/api/v1/roster/details',{headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>{const p=d.roster||d.data||d;if(p)setApiData(p)})
      .catch(err=>setApiError(err.message))
      .finally(()=>setApiLoading(false))
  },[])

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:G,borderRadius:14,padding:'16px 22px',marginBottom:14,color:'#fff'}}>
      {apiLoading && (
        <div style={{textAlign:'center',padding:40,color:'#7c3aed',fontSize:13,fontWeight:600}}>
          <div style={{fontSize:32,marginBottom:8}}>⟳</div>Loading...
        </div>
      )}
      {apiError && !apiLoading && (
        <div style={{padding:'8px 14px',background:'#fef2f2',border:'1px solid #fecaca',
          borderRadius:8,fontSize:12,color:'#dc2626',marginBottom:8,fontWeight:600}}>
          ⚠️ {apiError}
        </div>
      )}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div><h2 style={{margin:0,fontSize:20,fontWeight:900}}>📅 Roster Details</h2>
            <p style={{margin:'3px 0 0',fontSize:10,opacity:.8}}>Weekly shift schedule · Missing roster alerts · Regular staff marking</p>
          </div>
          {MISSING.length>0&&<div style={{background:'rgba(239,68,68,.3)',borderRadius:12,padding:'8px 14px',fontSize:10,fontWeight:700}}>⚠️ {MISSING.length} departments haven't submitted next week's roster!</div>}
        </div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46'}}>{msg}</div>}

      {/* Missing alert banner */}
      {MISSING.length>0&&(
        <div style={{background:'#fef2f2',border:'2px solid #fecaca',borderRadius:12,padding:'14px 18px',marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:800,color:'#dc2626',marginBottom:10}}>⚠️ MISSING ROSTER — Next Week</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:8}}>
            {MISSING.map(d=>(
              <div key={d.dept} style={{background:'#fff',borderRadius:10,padding:'10px 14px',border:'1px solid #fca5a5'}}>
                <div style={{fontWeight:700,fontSize:11,color:'#0f172a',marginBottom:3}}>{d.dept}</div>
                <div style={{fontSize:9,color:'#dc2626'}}>❌ Roster not submitted</div>
                <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>Deadline: {d.deadline}</div>
                <button onClick={()=>notify(`📧 Reminder sent to ${d.dept} HOD!`)} style={{marginTop:8,width:'100%',padding:'5px',borderRadius:7,border:'none',background:'#dc2626',color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer'}}>📧 Send Reminder</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{display:'flex',gap:6,marginBottom:14}}>
        {['this-week','next-week','mark-regular'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'8px 18px',borderRadius:9,border:tab!==t?'1px solid #e2e8f0':'none',background:tab===t?A:'#fff',color:tab===t?'#fff':'#475569',fontSize:10,fontWeight:tab===t?800:400,cursor:'pointer'}}>
            {t==='this-week'?'📅 This Week':t==='next-week'?'📆 Next Week Status':'✅ Mark Regular'}
          </button>
        ))}
      </div>

      {tab==='this-week'&&(
        <div style={{display:'grid',gap:14}}>
          {THIS_WEEK.map(dept=>(
            <div key={dept.dept} style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div style={{background:`${A}10`,padding:'10px 16px',borderBottom:'1px solid #e2e8f0',fontWeight:800,color:A,fontSize:11}}>{dept.dept} Department</div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:9,minWidth:500}}>
                  <thead><tr style={{background:'#f8fafc'}}>
                    <th style={{padding:'8px 12px',textAlign:'left',fontWeight:700,color:'#64748b',minWidth:100}}>Staff Name</th>
                    {DAYS.map(d=><th key={d} style={{padding:'8px 10px',textAlign:'center',fontWeight:700,color:'#64748b'}}>{d}</th>)}
                  </tr></thead>
                  <tbody>{dept.staff.map(s=>(
                    <tr key={s.name} style={{borderBottom:'1px solid #f1f5f9'}}>
                      <td style={{padding:'8px 12px',fontWeight:700,color:'#0f172a'}}>{s.name}</td>
                      {s.schedule.map((sh,i)=>(
                        <td key={i} style={{padding:'5px',textAlign:'center'}}>
                          <span style={{fontSize:8,fontWeight:700,padding:'3px 7px',borderRadius:20,background:SHIFTS[sh]+'20',color:sh==='Off'?'#94a3b8':SHIFTS[sh],display:'block',textAlign:'center'}}>{sh}</span>
                        </td>
                      ))}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='next-week'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Department','Roster Status','Submitted By','Submission Date','Deadline','Action'].map(h=><th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:9,fontWeight:700,color:'#64748b'}}>{h}</th>)}
            </tr></thead>
            <tbody>{NEXT_WEEK_STATUS.map((d,i)=>(
              <tr key={d.dept} style={{borderBottom:'1px solid #f1f5f9',background:!d.submitted?'#fff5f5':i%2?'#fafafa':'#fff'}}>
                <td style={{padding:'11px 14px',fontWeight:700}}>{d.dept}</td>
                <td style={{padding:'11px 14px'}}><span style={{fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20,background:d.submitted?'#d1fae5':'#fee2e2',color:d.submitted?'#059669':'#dc2626'}}>{d.submitted?'✅ Submitted':'❌ Not Submitted'}</span></td>
                <td style={{padding:'11px 14px',color:'#475569'}}>{d.by||'—'}</td>
                <td style={{padding:'11px 14px',color:'#64748b'}}>{d.date||'—'}</td>
                <td style={{padding:'11px 14px',color:!d.submitted?'#dc2626':'#64748b',fontWeight:!d.submitted?700:400}}>{d.deadline||'—'}</td>
                <td style={{padding:'11px 14px'}}>
                  {!d.submitted?<button onClick={()=>notify(`📧 Reminder sent to ${d.dept}!`)} style={{padding:'5px 12px',borderRadius:8,border:'none',background:'#dc2626',color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer'}}>📧 Remind HOD</button>
                  :<button style={{padding:'5px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontSize:8,cursor:'pointer'}}>👁 View Roster</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab==='mark-regular'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'20px'}}>
          <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:10,color:'#065f46'}}>
            <strong>Mark as Regular Staff:</strong> Regular staff follow a fixed Mon–Fri 9AM–5PM schedule. They do not need weekly roster entries. Mark them here to exclude from weekly roster requirements.
          </div>
          {['Gita Maharjan — IT','Maya Pradhan — Finance','Priya Adhikari — HR','Sanjay Karki — Finance','Rajesh Sharma — IT'].map(name=>(
            <div key={name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #f1f5f9',fontSize:10}}>
              <div style={{fontWeight:600,color:'#0f172a'}}>{name}</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:9,padding:'3px 10px',borderRadius:20,background:'#d1fae5',color:'#059669',fontWeight:700}}>✅ Regular</span>
                <button style={{padding:'4px 10px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:8,cursor:'pointer'}}>Edit</button>
              </div>
            </div>
          ))}
          <button onClick={()=>notify('✅ Regular staff list updated!')} style={{marginTop:14,padding:'10px 24px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>💾 Save Regular Staff List</button>
        </div>
      )}
    </div>
  )
}
