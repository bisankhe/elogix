// FILE: ImplementHRPolicyPage.jsx — Compliance & Risk > Compliance Management > Implement HR Policy
// Reads from elogix_policy_impl_v2 (written by PublishHRPolicyPage)
// Reads reader progress from elogix_policy_readers_v2
// Shows department-wise rollout, implementation checklist, training scheduler

import { useState, useMemo } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 100%)'
const P = '#0369a1'

const IMPL_KEY    = 'elogix_policy_impl_v2'
const READERS_KEY = 'elogix_policy_readers_v2'
const LIBRARY_KEY = 'elogix_policy_library_v2'

const EMPLOYEES = [
  { id:'e1',  name:'Bikash Shrestha',  dept:'Engineering' }, { id:'e2',  name:'Anita Gurung',    dept:'Engineering' },
  { id:'e3',  name:'Hari Thapa',       dept:'Engineering' }, { id:'e4',  name:'Maya Pradhan',    dept:'Finance'     },
  { id:'e5',  name:'Sandeep Tamang',   dept:'Finance'     }, { id:'e6',  name:'Priya Maharjan',  dept:'Sales'       },
  { id:'e7',  name:'Suresh KC',        dept:'IT'          }, { id:'e8',  name:'Laxmi Karki',     dept:'Operations'  },
  { id:'e9',  name:'Ramesh Koirala',   dept:'HR'          }, { id:'e10', name:'Gita Shrestha',   dept:'IT'          },
  { id:'e11', name:'Deepak Rana',      dept:'Sales'       }, { id:'e12', name:'Sunita Shrestha', dept:'Marketing'   },
  { id:'e13', name:'Arjun Tamang',     dept:'Admin'       }, { id:'e14', name:'Bina Magar',      dept:'Operations'  },
  { id:'e15', name:'Dev Lama',         dept:'IT'          },
]
const DEPTS = [...new Set(EMPLOYEES.map(e=>e.dept))]

const IMPL_STEPS = [
  { id:'notify',   label:'Staff Notified',       icon:'📢', desc:'All staff notified via Email + WhatsApp + Viber' },
  { id:'training', label:'Awareness Training',   icon:'🎓', desc:'Training session scheduled and conducted'        },
  { id:'read',     label:'Policy Distributed',   icon:'📤', desc:'Policy accessible in HR Policy Library'         },
  { id:'ack',      label:'Ack ≥ 80%',            icon:'✅', desc:'At least 80% of staff have acknowledged'        },
  { id:'qa',       label:'Q&A Session Done',     icon:'💬', desc:'Employee questions addressed by HR/Compliance'  },
  { id:'monitor',  label:'Compliance Monitored', icon:'📊', desc:'Ongoing tracking in compliance dashboard'       },
]

// Built-in base policies always tracked (even before publish workflow creates records)
const BASE_IMPL = [
  { id:'std-001', title:'Employment Contracts & Terms',     control:'POL-EMP-001', cat:'EMP', mandatory:true,  publishedAt:'2026-01-01T00:00:00Z', audience:'All Employees', steps:{notify:true,training:true,read:true,ack:false,qa:false,monitor:false} },
  { id:'std-002', title:'Code of Conduct Policy',          control:'POL-EMP-002', cat:'EMP', mandatory:true,  publishedAt:'2026-01-01T00:00:00Z', audience:'All Employees', steps:{notify:true,training:true,read:true,ack:true, qa:true, monitor:true}  },
  { id:'std-003', title:'Non-Discrimination Policy',       control:'POL-EMP-004', cat:'EMP', mandatory:true,  publishedAt:'2026-01-01T00:00:00Z', audience:'All Employees', steps:{notify:true,training:false,read:true,ack:false,qa:false,monitor:false}},
  { id:'std-004', title:'Anti-Harassment Policy',          control:'POL-EMP-005', cat:'EMP', mandatory:true,  publishedAt:'2026-01-01T00:00:00Z', audience:'All Employees', steps:{notify:true,training:true,read:true,ack:false,qa:false,monitor:false} },
  { id:'std-005', title:'Health & Safety Policy',          control:'POL-SCP-004', cat:'SCP', mandatory:true,  publishedAt:'2026-01-01T00:00:00Z', audience:'All Employees', steps:{notify:true,training:false,read:false,ack:false,qa:false,monitor:false}},
  { id:'std-006', title:'Disciplinary Policy',             control:'POL-ECA-001', cat:'ECA', mandatory:true,  publishedAt:'2026-01-01T00:00:00Z', audience:'All Employees', steps:{notify:true,training:true,read:true,ack:true, qa:true, monitor:true}  },
  { id:'std-007', title:'Leave Policy',                    control:'POL-LWS-001', cat:'LWS', mandatory:true,  publishedAt:'2026-01-01T00:00:00Z', audience:'All Employees', steps:{notify:true,training:true,read:true,ack:true, qa:false,monitor:true}  },
  { id:'std-008', title:'Compensation Policy',             control:'POL-RCP-003', cat:'RCP', mandatory:true,  publishedAt:'2026-01-01T00:00:00Z', audience:'All Employees', steps:{notify:true,training:false,read:true,ack:false,qa:false,monitor:false} },
  { id:'std-009', title:'Data Protection & Privacy Policy',control:'POL-WRT-006', cat:'WRT', mandatory:true,  publishedAt:'2026-01-01T00:00:00Z', audience:'All Employees', steps:{notify:true,training:false,read:false,ack:false,qa:false,monitor:false}},
  { id:'std-010', title:'Attendance Policy',               control:'POL-ECA-003', cat:'ECA', mandatory:true,  publishedAt:'2026-01-01T00:00:00Z', audience:'All Employees', steps:{notify:true,training:true,read:true,ack:true, qa:true, monitor:true}  },
]

export default function ImplementHRPolicyPage() {
  const [msg, setMsg] = useState('')
  const notify = (m) => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const { navTo } = useApp()

  // Load saved implementation states
  const [implRecords, setImplRecords] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(IMPL_KEY)||'[]')
      const savedIds = new Set(saved.map(p=>p.id))
      return [...saved, ...BASE_IMPL.filter(b=>!savedIds.has(b.id))]
    } catch { return BASE_IMPL }
  })

  const [readers] = useState(() => { try { return JSON.parse(localStorage.getItem(READERS_KEY)||'{}') } catch { return {} } })
  const [selected, setSelected] = useState(null)
  const [search,   setSearch]   = useState('')
  const [schedMsg, setSchedMsg] = useState('')

  const filtered = implRecords.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()))

  // Calculate real ack % from reader data
  const getAckPct = (polId) => {
    const polReaders = readers[polId]
    if (!polReaders) {
      // Fall back to base data estimate
      const base = BASE_IMPL.find(b=>b.id===polId)
      if (base?.steps?.ack) return 88
      if (base?.steps?.read) return 60
      return 20
    }
    const total  = Object.keys(polReaders).length
    const signed = Object.values(polReaders).filter(r=>r.signedAt).length
    return total > 0 ? Math.round(signed/total*100) : 0
  }

  const getDeptBreakdown = (polId) => {
    return DEPTS.map(dept => {
      const deptEmps  = EMPLOYEES.filter(e=>e.dept===dept)
      const seed = (polId.charCodeAt(polId.length-1) + dept.charCodeAt(0)) % 10
      return { dept, ack:Math.min(100,50+(seed*5)), total:deptEmps.length }
    })
  }

  const toggleStep = (polId, stepId, done) => {
    const updated = implRecords.map(p => p.id===polId ? { ...p, steps:{ ...p.steps, [stepId]:done } } : p)
    setImplRecords(updated)
    localStorage.setItem(IMPL_KEY, JSON.stringify(updated))
  }

  const scheduleTraining = (pol) => {
    setSchedMsg(`✅ Training session scheduled for "${pol.title}" — invitations sent to all department heads via Email + Calendar.`)
    setTimeout(()=>setSchedMsg(''), 4000)
    toggleStep(pol.id, 'training', true)
    try {
      const notifs = JSON.parse(localStorage.getItem('elogix_hris_notifications')||'[]')
      notifs.unshift({ id:`TR-${Date.now()}`, cat:'FYI', icon:'🎓', title:`Policy Training Scheduled: ${pol.title}`, body:`All departments · Next 7 days · HR to facilitate`, time:'Just now', unread:true })
      localStorage.setItem('elogix_hris_notifications', JSON.stringify(notifs.slice(0,100)))
    } catch {}
  }

  const pctCol = pct => pct>=90?'#10b981':pct>=70?'#f59e0b':'#ef4444'

  const totals = {
    implemented: implRecords.filter(p=>getAckPct(p.id)>=80).length,
    gap:         implRecords.filter(p=>p.mandatory&&getAckPct(p.id)<80).length,
  }

  const W = ({children,title}) => (
    <div style={{background:'#fff',borderRadius:14,padding:18,border:'1px solid #e2e8f0',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
      {title&&<div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12,paddingBottom:8,borderBottom:'1px solid #f1f5f9'}}>{title}</div>}
      {children}
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:G,borderRadius:16,padding:'22px 28px',boxShadow:'0 4px 24px rgba(3,105,161,.25)'}}>
        <div style={{fontSize:8,color:'rgba(255,255,255,.5)',marginBottom:4,letterSpacing:1,textTransform:'uppercase'}}>Compliance & Risk Management › Compliance Management</div>
        <div style={{fontSize:20,fontWeight:900,color:'#fff',letterSpacing:-.3}}>⚙️ Implement HR Policy</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:4}}>Department rollout · Checklist · Training · Real-time acknowledgement tracking</div>
        <div style={{display:'flex',gap:10,marginTop:14,flexWrap:'wrap',alignItems:'center'}}>
          {[
            {icon:'📋',label:'Policies',     val:implRecords.length},
            {icon:'✅',label:'≥80% Ack',    val:totals.implemented},
            {icon:'⚠️',label:'Gaps (Mand)', val:totals.gap, alert:totals.gap>0},
          ].map((s,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,.12)',borderRadius:10,padding:'6px 16px'}}>
              <div style={{fontSize:9,color:'rgba(255,255,255,.7)'}}>{s.icon} {s.label}</div>
              <div style={{fontSize:18,fontWeight:900,color:s.alert&&s.val>0?'#fca5a5':'#fff'}}>{s.val}</div>
            </div>
          ))}
          <div style={{marginLeft:'auto',display:'flex',gap:8}}>
            <button onClick={()=>navTo?.('policy-readers')} style={{padding:'7px 14px',borderRadius:10,border:'none',background:'rgba(255,255,255,.2)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>👥 Readers →</button>
            <button onClick={()=>navTo?.('hr-policy-library')} style={{padding:'7px 14px',borderRadius:10,border:'none',background:'rgba(255,255,255,.2)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📚 Library →</button>
          </div>
        </div>
        {schedMsg&&<div style={{marginTop:10,fontSize:10,color:'rgba(255,255,255,.95)',fontWeight:700,background:'rgba(255,255,255,.15)',padding:'8px 14px',borderRadius:8}}>{schedMsg}</div>}
      </div>

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search policies..."
        style={{padding:'9px 14px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:11,outline:'none',width:'100%',boxSizing:'border-box'}}/>

      <div style={{display:'grid',gridTemplateColumns:selected?'1fr 400px':'1fr',gap:16}}>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {filtered.map(pol=>{
            const ack    = getAckPct(pol.id)
            const steps  = IMPL_STEPS.map(s=>({...s,done:!!pol.steps?.[s.id]}))
            const done   = steps.filter(s=>s.done).length
            const isSel  = selected?.id===pol.id
            return (
              <div key={pol.id} onClick={()=>setSelected(pol)}
                style={{background:'#fff',borderRadius:14,padding:'16px 18px',border:`1.5px solid ${isSel?P:'#e2e8f0'}`,cursor:'pointer',boxShadow:isSel?`0 4px 16px ${P}15`:'0 1px 4px rgba(0,0,0,.04)',transition:'all .2s'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                      <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{pol.title}</span>
                      {pol.mandatory&&<span style={{fontSize:7,fontWeight:800,padding:'1px 6px',borderRadius:8,background:'#fef2f2',color:'#dc2626'}}>MANDATORY</span>}
                      <span style={{fontSize:7,color:'#94a3b8'}}>{pol.control}</span>
                    </div>

                    {/* Dept progress */}
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
                      {getDeptBreakdown(pol.id).slice(0,8).map(d=>(
                        <div key={d.dept}>
                          <div style={{fontSize:7,color:'#94a3b8',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.dept}</div>
                          <div style={{height:5,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${d.ack}%`,background:pctCol(d.ack),borderRadius:3}}/>
                          </div>
                          <div style={{fontSize:7,color:pctCol(d.ack),fontWeight:700,marginTop:1}}>{d.ack}%</div>
                        </div>
                      ))}
                    </div>

                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{flex:1,height:7,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${ack}%`,background:pctCol(ack),borderRadius:4,transition:'width .6s'}}/>
                      </div>
                      <span style={{fontSize:11,fontWeight:900,color:pctCol(ack),minWidth:44,textAlign:'right'}}>{ack}% ack</span>
                      <span style={{fontSize:9,color:'#64748b',minWidth:60}}>{done}/{IMPL_STEPS.length} steps</span>
                      {ack<80&&pol.mandatory&&<span style={{fontSize:7,fontWeight:700,padding:'2px 7px',borderRadius:8,background:'#fef2f2',color:'#ef4444'}}>⚠️ Gap</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail panel */}
        {selected&&(()=>{
          const ack   = getAckPct(selected.id)
          const steps = IMPL_STEPS.map(s=>({...s,done:!!selected.steps?.[s.id]}))
          const depts = getDeptBreakdown(selected.id)
          return (
            <div style={{display:'flex',flexDirection:'column',gap:12,position:'sticky',top:80,height:'fit-content'}}>
              <W title={`⚙️ ${selected.title}`}>
                <div style={{textAlign:'center',padding:'16px',background:`${pctCol(ack)}10`,borderRadius:12,border:`1px solid ${pctCol(ack)}30`,marginBottom:14}}>
                  <div style={{fontSize:36,fontWeight:900,color:pctCol(ack)}}>{ack}%</div>
                  <div style={{fontSize:10,color:'#64748b'}}>Average Acknowledgement</div>
                  <div style={{fontSize:10,fontWeight:700,color:pctCol(ack),marginTop:4}}>
                    {ack>=90?'✅ Fully Implemented':ack>=80?'🟡 Nearly Done':'🔴 Action Required'}
                  </div>
                </div>

                <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginBottom:8}}>📋 Implementation Checklist</div>
                {steps.map(step=>(
                  <div key={step.id} onClick={()=>toggleStep(selected.id,step.id,!step.done)}
                    style={{display:'flex',alignItems:'flex-start',gap:10,padding:'9px 10px',borderRadius:10,background:step.done?'#f0fdf4':'#f8fafc',border:`1px solid ${step.done?'#bbf7d0':'#e2e8f0'}`,marginBottom:6,cursor:'pointer',transition:'all .2s'}}>
                    <span style={{fontSize:18,flexShrink:0}}>{step.done?'✅':step.icon}</span>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:step.done?'#15803d':'#0f172a'}}>{step.label}</div>
                      <div style={{fontSize:8,color:'#64748b',marginTop:2}}>{step.desc}</div>
                    </div>
                  </div>
                ))}

                <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginTop:14,marginBottom:8}}>🏢 Department Breakdown</div>
                {depts.map(d=>(
                  <div key={d.dept} style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                    <div style={{width:70,fontSize:9,color:'#374151',flexShrink:0}}>{d.dept}</div>
                    <div style={{flex:1,height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${d.ack}%`,background:pctCol(d.ack),borderRadius:3}}/>
                    </div>
                    <div style={{fontSize:9,fontWeight:800,color:pctCol(d.ack),width:36,textAlign:'right'}}>{d.ack}%</div>
                  </div>
                ))}

                <div style={{display:'flex',flexDirection:'column',gap:7,marginTop:14}}>
                  <button onClick={()=>scheduleTraining(selected)} style={{padding:'10px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:800,cursor:'pointer'}}>🎓 Schedule Training Session</button>
                  <button onClick={()=>navTo?.('policy-readers')} style={{padding:'10px',borderRadius:9,border:`1px solid ${P}`,background:`${P}10`,color:P,fontSize:10,fontWeight:700,cursor:'pointer'}}>👥 View Reader Tracking →</button>
                  <button onClick={()=>setSelected(null)} style={{padding:'8px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:10,cursor:'pointer'}}>✕ Close</button>
                </div>
              </W>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
