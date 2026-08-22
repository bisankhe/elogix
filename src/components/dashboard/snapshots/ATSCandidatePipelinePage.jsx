// FILE: ATSCandidatePipelinePage.jsx
// World-class ATS — Kanban Candidate Pipeline with AI scoring, bulk actions, auto-comms

import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const G  = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const GA = 'linear-gradient(135deg,#4338ca,#7c3aed)'
const P  = '#4338ca'

const STAGES = [
  { id:'applied',    label:'Applied',         color:'#64748b', icon:'📩', bg:'#f8fafc',  textColor:'#334155' },
  { id:'ai_screen',  label:'AI Screening',    color:'#8b5cf6', icon:'🤖', bg:'#faf5ff',  textColor:'#6d28d9' },
  { id:'hr_review',  label:'HR Review',       color:'#3b82f6', icon:'👤', bg:'#eff6ff',  textColor:'#1e40af' },
  { id:'written',    label:'Written Test',    color:'#0891b2', icon:'✍️', bg:'#f0f9ff',  textColor:'#0e7490' },
  { id:'video',      label:'Video Interview', color:'#f59e0b', icon:'🎥', bg:'#fffbeb',  textColor:'#92400e' },
  { id:'panel',      label:'Panel Interview', color:'#7c3aed', icon:'👥', bg:'#f5f3ff',  textColor:'#5b21b6' },
  { id:'client',     label:'Client Review',   color:'#ec4899', icon:'🏢', bg:'#fdf4ff',  textColor:'#86198f' },
  { id:'offer',      label:'Offer',           color:'#10b981', icon:'📋', bg:'#f0fdf4',  textColor:'#065f46' },
  { id:'hired',      label:'Hired',           color:'#059669', icon:'✅', bg:'#ecfdf5',  textColor:'#064e3b' },
  { id:'rejected',   label:'Rejected',        color:'#ef4444', icon:'❌', bg:'#fef2f2',  textColor:'#7f1d1d' },
]

const CANDIDATES = [
  { id:'c1',  name:'Rajan Shrestha',   job:'Senior SW Engineer', ai:94, stage:'panel',    written:88, video:91, rank:'Gold',   avatar:'RS', exp:'6yr', edu:'B.Tech CS',      email:'rajan@email.com',   phone:'9801111111', applied:'2024-01-20', comms:['📧 Test Invite','📧 Video Invite','📧 Panel Invite'] },
  { id:'c2',  name:'Priya Tamang',     job:'Senior SW Engineer', ai:91, stage:'panel',    written:85, video:89, rank:'Gold',   avatar:'PT', exp:'5yr', edu:'M.Sc IT',         email:'priya@email.com',   phone:'9802222222', applied:'2024-01-19', comms:['📧 Test Invite','📧 Video Invite','📧 Panel Invite'] },
  { id:'c3',  name:'Anil KC',          job:'Senior SW Engineer', ai:88, stage:'video',    written:82, video:null,rank:'Silver', avatar:'AK', exp:'7yr', edu:'B.E. CS',         email:'anil@email.com',    phone:'9803333333', applied:'2024-01-18', comms:['📧 Test Invite','📧 Video Invite'] },
  { id:'c4',  name:'Sunita Rai',       job:'Senior SW Engineer', ai:85, stage:'written',  written:null,video:null,rank:'Silver',avatar:'SR', exp:'4yr', edu:'BCA',             email:'sunita@email.com',  phone:'9804444444', applied:'2024-01-21', comms:['📧 Test Invite'] },
  { id:'c5',  name:'Bikash Gurung',    job:'Senior SW Engineer', ai:79, stage:'hr_review',written:null,video:null,rank:'Bronze',avatar:'BG', exp:'5yr', edu:'B.Sc IT',         email:'bikash@email.com',  phone:'9805555555', applied:'2024-01-22', comms:[] },
  { id:'c6',  name:'Maya Pradhan',     job:'Finance Manager',    ai:92, stage:'video',    written:90, video:null,rank:'Gold',  avatar:'MP', exp:'8yr', edu:'CA',              email:'maya@email.com',    phone:'9806666666', applied:'2024-01-17', comms:['📧 Test Invite','📧 Video Invite'] },
  { id:'c7',  name:'Dipak Thapa',      job:'Finance Manager',    ai:81, stage:'written',  written:null,video:null,rank:'Silver',avatar:'DT', exp:'6yr', edu:'ACCA',            email:'dipak@email.com',   phone:'9807777777', applied:'2024-01-20', comms:['📧 Test Invite'] },
  { id:'c8',  name:'Sita Khadka',      job:'HR Business Partner',ai:87, stage:'hr_review',written:null,video:null,rank:'Silver',avatar:'SK', exp:'5yr', edu:'MBA HR',          email:'sita@email.com',    phone:'9808888888', applied:'2024-01-23', comms:[] },
  { id:'c9',  name:'Hari Adhikari',    job:'HR Business Partner',ai:72, stage:'applied',  written:null,video:null,rank:'Bronze',avatar:'HA', exp:'3yr', edu:'BBS',             email:'hari@email.com',    phone:'9809999999', applied:'2024-01-24', comms:[] },
  { id:'c10', name:'Gita Maharjan',    job:'Senior SW Engineer', ai:96, stage:'offer',    written:92, video:94,  rank:'Gold',  avatar:'GM', exp:'6yr', edu:'M.Tech',           email:'gita@email.com',    phone:'9800000000', applied:'2024-01-15', comms:['📧 Test Invite','📧 Video Invite','📧 Panel Invite','📧 Offer Sent'] },
  { id:'c11', name:'Roshan Maharjan',  job:'Product Manager',    ai:89, stage:'video',    written:87, video:null,rank:'Gold',  avatar:'RM', exp:'5yr', edu:'MBA',              email:'roshan@email.com',  phone:'9811111111', applied:'2024-01-22', comms:['📧 Test Invite','📧 Video Invite'] },
  { id:'c12', name:'Anita Shrestha',   job:'DevOps Engineer',    ai:83, stage:'hr_review',written:null,video:null,rank:'Silver',avatar:'AS', exp:'4yr', edu:'B.E. IT',         email:'anita@email.com',   phone:'9822222222', applied:'2024-01-23', comms:[] },
]

const RANK_CFG = { Gold:['#fbbf24','#fffbeb'], Silver:['#94a3b8','#f8fafc'], Bronze:['#d97706','#fffbeb'], Reject:['#ef4444','#fef2f2'] }

function CandidateCard({ c, onSelect, selected }) {
  const stage = STAGES.find(s=>s.id===c.stage)
  const [rc,rbg] = RANK_CFG[c.rank]||['#64748b','#f8fafc']
  return (
    <div onClick={()=>onSelect(c)} style={{ background:'#fff', borderRadius:11, padding:'12px', border:`1.5px solid ${selected?P:stage?.color+'30'||'#e2e8f0'}`, cursor:'pointer', transition:'all .15s', boxShadow:selected?`0 4px 16px ${P}20`:'0 1px 4px rgba(0,0,0,.05)', marginBottom:6 }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
        <div style={{ width:32, height:32, borderRadius:9, background:GA, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:9, fontWeight:900, flexShrink:0 }}>{c.avatar}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
          <div style={{ fontSize:8, color:'#64748b', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.job}</div>
          <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>
            <span style={{ fontSize:7, padding:'1px 5px', borderRadius:6, background:'#eff6ff', color:'#1e40af', fontWeight:700 }}>{c.exp}</span>
            <span style={{ fontSize:7, padding:'1px 5px', borderRadius:6, background:'#f5f3ff', color:'#6d28d9', fontWeight:700 }}>{c.edu}</span>
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:14, fontWeight:900, color:c.ai>=90?'#059669':c.ai>=80?'#f59e0b':'#ef4444' }}>{c.ai}%</div>
          <div style={{ fontSize:7, color:'#94a3b8' }}>AI Score</div>
          <span style={{ fontSize:7, fontWeight:800, padding:'1px 5px', borderRadius:6, background:rbg, color:rc, display:'block', marginTop:3 }}>{c.rank}</span>
        </div>
      </div>
      {(c.written||c.video) && (
        <div style={{ display:'flex', gap:6, marginTop:6, paddingTop:6, borderTop:'1px solid #f8fafc' }}>
          {c.written&&<span style={{ fontSize:7, color:'#0891b2' }}>✍️ {c.written}%</span>}
          {c.video&&<span style={{ fontSize:7, color:'#f59e0b' }}>🎥 {c.video}%</span>}
        </div>
      )}
    </div>
  )
}

export default function ATSCandidatePipelinePage() {
  const { navTo } = useApp()
  const [candidates, setCandidates] = useState(CANDIDATES)
  const [selected,   setSelected]   = useState(null)
  const [jobFilter,  setJobFilter]  = useState('All')
  const [rankFilter, setRankFilter] = useState('All')
  const [search,     setSearch]     = useState('')
  const [bulkMsg,    setBulkMsg]    = useState('')
  const [sending,    setSending]    = useState(false)

  const jobs = ['All', ...new Set(CANDIDATES.map(c=>c.job))]

  const filtered = candidates.filter(c =>
    (jobFilter==='All' || c.job===jobFilter) &&
    (rankFilter==='All' || c.rank===rankFilter) &&
    (!search || c.name.toLowerCase().includes(search.toLowerCase()))
  )

  const moveStage = (cid, newStage) => {
    setCandidates(p => p.map(c => c.id===cid ? {...c,stage:newStage} : c))
    setSelected(p => p?.id===cid ? {...p,stage:newStage} : p)
    setBulkMsg(`✅ Candidate moved to ${STAGES.find(s=>s.id===newStage)?.label}. Auto-email & WhatsApp notification sent.`)
    setTimeout(()=>setBulkMsg(''),3000)
  }

  const sendBulkComm = async (type) => {
    setSending(true)
    await new Promise(r=>setTimeout(r,1500))
    setSending(false)
    setBulkMsg(`✅ ${type} sent to ${filtered.length} candidates via Email + WhatsApp + SMS`)
    setTimeout(()=>setBulkMsg(''),3000)
  }

  const totalByStage = (stageId) => filtered.filter(c=>c.stage===stageId).length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, fontFamily:'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background:G, borderRadius:16, padding:'18px 24px', boxShadow:'0 4px 20px rgba(67,56,202,.3)' }}>
        <div style={{ fontSize:8, color:'rgba(255,255,255,.5)', marginBottom:3 }}>ATS · Recruitment & Hiring</div>
        <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>🔄 AI Candidate Pipeline</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:2 }}>Kanban pipeline · AI scoring · Auto-comms · Bulk actions · Stage-wise tracking</div>
        <div style={{ display:'flex', gap:10, marginTop:12, flexWrap:'wrap', alignItems:'center' }}>
          {[{l:'Total',v:candidates.length},{l:'Gold',v:candidates.filter(c=>c.rank==='Gold').length},{l:'Silver',v:candidates.filter(c=>c.rank==='Silver').length},{l:'Active Stages',v:STAGES.length-2}].map((s,i)=>(
            <div key={i} style={{ background:'rgba(255,255,255,.12)', borderRadius:10, padding:'5px 12px' }}>
              <div style={{ fontSize:8, color:'rgba(255,255,255,.6)' }}>{s.l}</div>
              <div style={{ fontSize:15, fontWeight:900, color:'#fff' }}>{s.v}</div>
            </div>
          ))}
          {bulkMsg && <div style={{ marginLeft:'auto', fontSize:10, color:'rgba(255,255,255,.95)', fontWeight:700, background:'rgba(255,255,255,.15)', padding:'6px 14px', borderRadius:8 }}>{bulkMsg}</div>}
        </div>
      </div>

      {/* Filters + Bulk Actions */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search candidates..." style={{ padding:'8px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:11, outline:'none', width:180 }}/>
        <select value={jobFilter} onChange={e=>setJobFilter(e.target.value)} style={{ padding:'8px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:10, outline:'none', background:'#fff' }}>
          {jobs.map(j=><option key={j} value={j}>{j}</option>)}
        </select>
        <div style={{ display:'flex', gap:3, background:'#f8fafc', borderRadius:9, padding:3 }}>
          {['All','Gold','Silver','Bronze'].map(r=>(
            <button key={r} onClick={()=>setRankFilter(r)} style={{ padding:'5px 12px', borderRadius:7, border:'none', background:rankFilter===r?'#fff':'transparent', color:rankFilter===r?P:'#64748b', fontWeight:rankFilter===r?700:400, fontSize:9, cursor:'pointer' }}>{r}</button>
          ))}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          <button onClick={()=>sendBulkComm('Written Test Invitations')} disabled={sending} style={{ padding:'7px 12px', borderRadius:9, border:'none', background:'#eff6ff', color:'#1e40af', fontSize:9, fontWeight:700, cursor:'pointer' }}>✍️ Send Test</button>
          <button onClick={()=>sendBulkComm('Video Interview Links')} disabled={sending} style={{ padding:'7px 12px', borderRadius:9, border:'none', background:'#fffbeb', color:'#92400e', fontSize:9, fontWeight:700, cursor:'pointer' }}>🎥 Video Link</button>
          <button onClick={()=>sendBulkComm('Rejection Notifications')} disabled={sending} style={{ padding:'7px 12px', borderRadius:9, border:'none', background:'#fef2f2', color:'#dc2626', fontSize:9, fontWeight:700, cursor:'pointer' }}>❌ Reject All</button>
          <button onClick={()=>navTo?.('ats-assessment')} style={{ padding:'7px 14px', borderRadius:9, border:'none', background:GA, color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>📝 Assessment →</button>
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:8 }}>
        {STAGES.map(stage => (
          <div key={stage.id} style={{ minWidth:200, maxWidth:220, flexShrink:0 }}>
            {/* Stage header */}
            <div style={{ background:stage.color, borderRadius:'10px 10px 0 0', padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:14 }}>{stage.icon}</span>
                <span style={{ fontSize:10, fontWeight:700, color:'#fff' }}>{stage.label}</span>
              </div>
              <span style={{ fontSize:12, fontWeight:900, color:'#fff', background:'rgba(255,255,255,.25)', borderRadius:6, padding:'1px 8px' }}>{totalByStage(stage.id)}</span>
            </div>
            {/* Stage column */}
            <div style={{ background:stage.bg, borderRadius:'0 0 10px 10px', padding:'8px', minHeight:400, border:`1px solid ${stage.color}30`, borderTop:'none' }}>
              {filtered.filter(c=>c.stage===stage.id).map(c=>(
                <CandidateCard key={c.id} c={c} onSelect={setSelected} selected={selected?.id===c.id}/>
              ))}
              {filtered.filter(c=>c.stage===stage.id).length===0 && (
                <div style={{ textAlign:'center', padding:'20px 10px', color:'#94a3b8', fontSize:9 }}>No candidates</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Candidate detail panel */}
      {selected && (
        <div style={{ background:'#fff', borderRadius:16, padding:20, border:`1px solid ${P}30`, boxShadow:`0 4px 20px ${P}15` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ width:44, height:44, borderRadius:12, background:GA, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:14, fontWeight:900 }}>{selected.avatar}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:900, color:'#0f172a' }}>{selected.name}</div>
                <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>{selected.job} · {selected.exp} · {selected.edu}</div>
                <div style={{ fontSize:9, color:'#94a3b8', marginTop:2 }}>{selected.email} · {selected.phone}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ textAlign:'center', padding:'8px 14px', background:selected.ai>=90?'#f0fdf4':selected.ai>=80?'#fffbeb':'#fef2f2', borderRadius:10 }}>
                <div style={{ fontSize:20, fontWeight:900, color:selected.ai>=90?'#059669':selected.ai>=80?'#f59e0b':'#ef4444' }}>{selected.ai}%</div>
                <div style={{ fontSize:8, color:'#64748b' }}>AI Match Score</div>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#94a3b8' }}>✕</button>
            </div>
          </div>

          {/* Scores */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
            {[{l:'AI Score',v:selected.ai+'%',c:'#8b5cf6'},{l:'Written Test',v:selected.written?selected.written+'%':'Pending',c:'#0891b2'},{l:'Video Intv',v:selected.video?selected.video+'%':'Pending',c:'#f59e0b'},{l:'Rank',v:selected.rank,c:RANK_CFG[selected.rank]?.[0]||'#64748b'}].map((s,i)=>(
              <div key={i} style={{ textAlign:'center', padding:'10px', background:'#f8fafc', borderRadius:10 }}>
                <div style={{ fontSize:16, fontWeight:900, color:s.c }}>{s.v}</div>
                <div style={{ fontSize:8, color:'#94a3b8' }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Comms history */}
          {selected.comms.length>0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#374151', marginBottom:6 }}>📧 Communication History</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {selected.comms.map((m,i)=><span key={i} style={{ fontSize:8, padding:'2px 8px', borderRadius:8, background:'#f0fdf4', color:'#15803d', fontWeight:600 }}>{m}</span>)}
              </div>
            </div>
          )}

          {/* Stage actions */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#374151', marginBottom:8 }}>Move to Stage</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {STAGES.filter(s=>s.id!==selected.stage).map(s=>(
                <button key={s.id} onClick={()=>moveStage(selected.id, s.id)} style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${s.color}40`, background:`${s.color}10`, color:s.color, fontSize:9, fontWeight:700, cursor:'pointer' }}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[
              {l:'📧 Send Email',bg:'#eff6ff',cl:'#1e40af'},
              {l:'💬 WhatsApp',bg:'#f0fdf4',cl:'#15803d'},
              {l:'✍️ Written Test',bg:'#f0f9ff',cl:'#0e7490',id:'ats-assessment'},
              {l:'🎥 Video Interview',bg:'#fffbeb',cl:'#92400e',id:'ats-video-interview'},
              {l:'👥 Panel Interview',bg:'#f5f3ff',cl:'#5b21b6',id:'ats-interview-panel'},
              {l:'📋 Offer Letter',bg:'#f0fdf4',cl:'#065f46',id:'ats-offer-management'},
            ].map((a,i)=>(
              <button key={i} onClick={()=>a.id&&navTo?.(a.id)} style={{ padding:'7px 14px', borderRadius:9, border:'none', background:a.bg, color:a.cl, fontSize:9, fontWeight:700, cursor:'pointer' }}>{a.l}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
