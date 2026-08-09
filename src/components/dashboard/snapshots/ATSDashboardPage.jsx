// FILE: ATSDashboardPage.jsx - ATS Dashboard
// Kanban pipeline, AI screening, auto written/video exam, interview panel scoring

import { useState } from 'react'
import { ExcelModal, PageHeader, SearchBar, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const STAGES = [
  {id:'applied',    label:'Applied',        color:'#64748b', icon:'📩', bg:'#f8fafc'},
  {id:'screening',  label:'AI Screening',   color:'#8b5cf6', icon:'🤖', bg:'#f5f3ff'},
  {id:'written',    label:'Written Exam',   color:'#0891b2', icon:'✍', bg:'#f0f9ff'},
  {id:'video',      label:'Video Interview',color:'#f59e0b', icon:'🎥', bg:'#fffbeb'},
  {id:'panel',      label:'Panel Interview',color:'#7c3aed', icon:'👥', bg:'#f5f3ff'},
  {id:'offer',      label:'Offer',          color:'#10b981', icon:'📋', bg:'#f0fdf4'},
  {id:'hired',      label:'Hired',          color:'#059669', icon:'✅', bg:'#ecfdf5'},
]

const CANDIDATES = [
  {id:'c1',name:'Rajan Shrestha',    position:'Senior SW Dev',ai_score:94,stage:'panel',    written:88,video:91,overall:91,avatar:'RS',email:'rajan@email.com',exp:'6 years',edu:'B.Tech CS',phone:'9801111111'},
  {id:'c2',name:'Priya Tamang',      position:'Senior SW Dev',ai_score:91,stage:'panel',    written:85,video:89,overall:88,avatar:'PT',email:'priya@email.com',exp:'5 years',edu:'M.Sc IT',phone:'9802222222'},
  {id:'c3',name:'Anil KC',           position:'Senior SW Dev',ai_score:88,stage:'video',    written:82,video:null,overall:null,avatar:'AK',email:'anil@email.com',exp:'7 years',edu:'B.E. CS',phone:'9803333333'},
  {id:'c4',name:'Sunita Rai',        position:'Senior SW Dev',ai_score:85,stage:'written',  written:null,video:null,overall:null,avatar:'SR',email:'sunita@email.com',exp:'4 years',edu:'BCA',phone:'9804444444'},
  {id:'c5',name:'Bikash Gurung',     position:'Senior SW Dev',ai_score:79,stage:'screening',written:null,video:null,overall:null,avatar:'BG',email:'bikash@email.com',exp:'5 years',edu:'B.Sc IT',phone:'9805555555'},
  {id:'c6',name:'Maya Pradhan',      position:'Finance Manager',ai_score:92,stage:'video',  written:90,video:null,overall:null,avatar:'MP',email:'maya@email.com',exp:'8 years',edu:'CA',phone:'9806666666'},
  {id:'c7',name:'Dipak Thapa',       position:'Finance Manager',ai_score:81,stage:'written',written:null,video:null,overall:null,avatar:'DT',email:'dipak@email.com',exp:'6 years',edu:'ACCA',phone:'9807777777'},
  {id:'c8',name:'Sita Khadka',       position:'HR Business Partner',ai_score:87,stage:'screening',written:null,video:null,overall:null,avatar:'SK',email:'sita@email.com',exp:'5 years',edu:'MBA HR',phone:'9808888888'},
  {id:'c9',name:'Hari Adhikari',     position:'HR Business Partner',ai_score:72,stage:'applied',written:null,video:null,overall:null,avatar:'HA',email:'hari@email.com',exp:'3 years',edu:'BBS',phone:'9809999999'},
  {id:'c10',name:'Gita Maharjan',    position:'Senior SW Dev',ai_score:96,stage:'offer',    written:92,video:94,overall:94,avatar:'GM',email:'gita@email.com',exp:'6 years',edu:'M.Tech',phone:'9800000000'},
]

const PANEL_MEMBERS = [
  {id:'p1',name:'Rajesh Sharma',role:'CTO',expertise:'Technical Architecture',score:null},
  {id:'p2',name:'Priya Adhikari',role:'HR Manager',expertise:'Culture & Soft Skills',score:null},
  {id:'p3',name:'Bikash Shrestha',role:'IT Lead',expertise:'Programming & Problem Solving',score:null},
]

const CTX = [
  {icon:'👁',label:'View Full Profile',      key:'view'},
  {icon:'✍',label:'Send Written Exam',       key:'written'},
  {icon:'🎥',label:'Send Video Interview',   key:'video'},
  {icon:'📧',label:'Send Email',             key:'email'},
  {icon:'👥',label:'Schedule Panel',         key:'panel'},
  {icon:'⬆',label:'Move to Next Stage',      key:'advance'},
  {icon:'⬇',label:'Move to Previous Stage', key:'regress'},
  {icon:'🚫',label:'Reject Candidate',       key:'reject', danger:true},
]

export default function ATSDashboardPage() {
  const [candidates, setCandidates] = useState(CANDIDATES)
  const [search, setSearch]         = useState('')
  const [filterPos, setFilterPos]   = useState('all')
  const [selected, setSelected]     = useState(null)
  const [showExcel, setShowExcel]   = useState(false)
  const [ctx, setCtx]               = useState(null)
  const [dragOver, setDragOver]     = useState(null)
  const [panelScores, setPanelScores] = useState({})

  const positions = [...new Set(candidates.map(c=>c.position))]
  const filtered = candidates.filter(c=>{
    if (filterPos!=='all'&&c.position!==filterPos) return false
    if (search&&!c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const byStage = STAGES.reduce((acc,s)=>{acc[s.id]=filtered.filter(c=>c.stage===s.id);return acc},{})

  const advanceCandidate = (cid, direction=1) => {
    setCandidates(prev=>prev.map(c=>{
      if(c.id!==cid) return c
      const idx = STAGES.findIndex(s=>s.id===c.stage)
      const nextIdx = idx+direction
      if(nextIdx<0||nextIdx>=STAGES.length) return c
      const nextStage = STAGES[nextIdx].id
      // Auto-trigger exams
      if(nextStage==='written') alert(`AI Written Exam sent to ${c.name} at ${c.email}`)
      if(nextStage==='video')   alert(`Video Interview invitation sent to ${c.name} at ${c.email}`)
      if(nextStage==='panel')   alert(`Panel interview scheduled. Notification sent to all panel members.`)
      return {...c, stage:nextStage}
    }))
  }

  const sendOffer = (cid) => {
    setCandidates(prev=>prev.map(c=>c.id===cid?{...c,stage:'offer'}:c))
    const c = candidates.find(x=>x.id===cid)
    if(c) alert(`Offer letter emailed to ${c.name} at ${c.email}`)
  }

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🤖" title="ATS Dashboard"
        breadcrumb="Employee Lifecycle > Recruitment > Recruitment Management"
        gradient={G}
        stats={[
          {icon:'👤',label:'Total Candidates', value:candidates.length},
          {icon:'🤖',label:'AI Screened',       value:candidates.filter(c=>c.ai_score>0).length},
          {icon:'👥',label:'In Panel Stage',    value:candidates.filter(c=>c.stage==='panel').length},
          {icon:'📋',label:'Offers Sent',       value:candidates.filter(c=>c.stage==='offer'||c.stage==='hired').length},
        ]}
        onAdd={()=>{}} addLabel="Import CVs" onExcel={()=>setShowExcel(true)}/>

      {/* AI automation banner */}
      <div style={{background:'linear-gradient(135deg,#f5f3ff,#ede9fe)',border:'1px solid #c4b5fd',borderRadius:12,padding:'12px 16px',marginBottom:14,display:'flex',gap:12,alignItems:'center'}}>
        <span style={{fontSize:24}}>🤖</span>
        <div>
          <div style={{fontSize:12,fontWeight:800,color:'#3730a3',marginBottom:3}}>AI Automation Active</div>
          <div style={{fontSize:11,color:'#4338ca'}}>Auto-ranking by: CV match (40%) + Written exam (25%) + Video interview (25%) + AI profile (10%). Auto-email triggers active for all stage transitions. Top 10 candidates auto-selected for panel.</div>
        </div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search candidates..."/>
        <select value={filterPos} onChange={e=>setFilterPos(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Positions</option>
          {positions.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Kanban Board */}
      <div style={{display:'grid',gridTemplateColumns:`repeat(${STAGES.length},1fr)`,gap:8,overflowX:'auto'}}>
        {STAGES.map(stage=>{
          const stageCandidates = byStage[stage.id]||[]
          return (
            <div key={stage.id}
              onDragOver={e=>{e.preventDefault();setDragOver(stage.id)}}
              onDrop={e=>{e.preventDefault();const cid=e.dataTransfer.getData('candidateId');const c=candidates.find(x=>x.id===cid);if(c){const fromIdx=STAGES.findIndex(s=>s.id===c.stage);const toIdx=STAGES.findIndex(s=>s.id===stage.id);advanceCandidate(cid,toIdx-fromIdx)};setDragOver(null)}}
              onDragLeave={()=>setDragOver(null)}
              style={{minWidth:160,background:dragOver===stage.id?`${stage.color}12`:stage.bg,borderRadius:12,border:`2px solid ${dragOver===stage.id?stage.color:'#e2e8f0'}`,transition:'all .15s ease'}}>
              <div style={{padding:'10px 12px',borderBottom:`2px solid ${stage.color}33`,position:'sticky',top:0,background:stage.bg,borderRadius:'10px 10px 0 0',zIndex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontSize:11,fontWeight:800,color:stage.color}}>{stage.icon} {stage.label}</div>
                  <div style={{background:stage.color,color:'#fff',borderRadius:12,padding:'1px 8px',fontSize:10,fontWeight:700}}>{stageCandidates.length}</div>
                </div>
              </div>
              <div style={{padding:'8px',minHeight:200,display:'flex',flexDirection:'column',gap:7}}>
                {stageCandidates.map(c=>(
                  <div key={c.id}
                    draggable
                    onDragStart={e=>e.dataTransfer.setData('candidateId',c.id)}
                    onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.name,...c}})}}
                    onClick={()=>setSelected(c)}
                    style={{background:'#fff',borderRadius:10,padding:'8px 10px',boxShadow:'0 1px 4px rgba(0,0,0,.08)',cursor:'pointer',
                      border:`1px solid ${stage.color}22`}}>
                    <div style={{display:'flex',gap:7,alignItems:'center',marginBottom:4}}>
                      <div style={{width:28,height:28,borderRadius:'50%',background:`${stage.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:stage.color,flexShrink:0}}>{c.avatar}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,fontWeight:700,color:'#0f172a',lineHeight:1.2}}>{c.name}</div>
                        <div style={{fontSize:9,color:'#94a3b8'}}>{c.exp}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{background:`${stage.color}12`,color:stage.color,fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:8}}>AI: {c.ai_score}%</span>
                      {c.overall&&<span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:8}}>Ovr: {c.overall}%</span>}
                    </div>
                    <div style={{display:'flex',gap:3,marginTop:5}}>
                      <button onClick={e=>{e.stopPropagation();advanceCandidate(c.id,-1)}} style={{flex:1,padding:'3px',borderRadius:5,border:'none',background:'#f1f5f9',color:'#64748b',fontSize:9,cursor:'pointer'}}>⬅</button>
                      <button onClick={e=>{e.stopPropagation();advanceCandidate(c.id,1)}} style={{flex:1,padding:'3px',borderRadius:5,border:'none',background:`${stage.color}18`,color:stage.color,fontSize:9,cursor:'pointer',fontWeight:700}}>➡</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Panel scoring section */}
      {byStage['panel']?.length>0&&(
        <div style={{marginTop:16,background:'#fff',border:'1px solid #c4b5fd',borderRadius:14,padding:'18px 20px'}}>
          <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:12}}>Panel Interview Scoring - {byStage['panel']?.length} candidates</div>
          <div style={{display:'grid',gap:10}}>
            {byStage['panel']?.map(c=>(
              <div key={c.id} style={{background:'#f5f3ff',borderRadius:12,padding:'12px 14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,flexWrap:'wrap',gap:8}}>
                  <div>
                    <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{c.name}</span>
                    <span style={{fontSize:10,color:'#94a3b8',marginLeft:8}}>{c.position}</span>
                    <span style={{fontSize:10,color:'#8b5cf6',marginLeft:8,fontWeight:700}}>CV: {c.ai_score}% | Written: {c.written||'-'}% | Video: {c.video||'-'}%</span>
                  </div>
                  <button onClick={()=>sendOffer(c.id)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Send Offer</button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {PANEL_MEMBERS.map(pm=>(
                    <div key={pm.id} style={{background:'#fff',borderRadius:10,padding:'8px 10px',border:'1px solid #c4b5fd'}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#4338ca'}}>{pm.name}</div>
                      <div style={{fontSize:9,color:'#94a3b8',marginBottom:5}}>{pm.expertise}</div>
                      <input type="number" min="0" max="100" placeholder="Score /100"
                        value={panelScores[`${c.id}-${pm.id}`]||''}
                        onChange={e=>setPanelScores(p=>({...p,[`${c.id}-${pm.id}`]:e.target.value}))}
                        style={{width:'100%',padding:'5px 8px',borderRadius:6,border:'1px solid #c4b5fd',fontSize:11,textAlign:'center'}}/>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidate detail drawer */}
      {selected&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:4000,display:'flex',justifyContent:'flex-end'}} onClick={()=>setSelected(null)}>
          <div style={{background:'#fff',width:420,height:'100%',overflow:'auto',boxShadow:'-10px 0 40px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px',position:'sticky',top:0}}>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:'#fff'}}>{selected.avatar}</div>
                <div>
                  <div style={{fontSize:15,fontWeight:900,color:'#fff'}}>{selected.name}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.75)'}}>{selected.position}</div>
                </div>
                <button onClick={()=>setSelected(null)} style={{marginLeft:'auto',background:'rgba(255,255,255,.2)',border:'none',color:'#fff',width:28,height:28,borderRadius:'50%',cursor:'pointer',fontSize:14}}>x</button>
              </div>
            </div>
            <div style={{padding:'16px 24px'}}>
              {[['Email',selected.email],['Phone',selected.phone],['Experience',selected.exp],['Education',selected.edu],
                ['Current Stage',selected.stage?.toUpperCase()],['AI Score',selected.ai_score+'%'],
                ['Written Exam',selected.written?selected.written+'%':'Not yet taken'],
                ['Video Interview',selected.video?selected.video+'%':'Not yet taken'],
                ['Overall Score',selected.overall?selected.overall+'%':'Pending'],
              ].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f8fafc',fontSize:11}}>
                  <span style={{color:'#64748b',fontWeight:600}}>{l}</span>
                  <span style={{color:'#0f172a',fontWeight:700}}>{v||'N/A'}</span>
                </div>
              ))}
              <div style={{marginTop:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <button onClick={()=>advanceCandidate(selected.id,1)} style={{padding:10,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Advance Stage</button>
                <button onClick={()=>setCandidates(p=>p.filter(c=>c.id!==selected.id))&&setSelected(null)} style={{padding:10,borderRadius:10,border:'none',background:'#fef2f2',color:'#dc2626',fontSize:11,fontWeight:700,cursor:'pointer'}}>Reject</button>
                <button style={{padding:10,borderRadius:10,border:'none',background:'#eff6ff',color:'#1d4ed8',fontSize:11,fontWeight:700,cursor:'pointer'}}>Send Exam</button>
                <button style={{padding:10,borderRadius:10,border:'none',background:'#fffbeb',color:'#b45309',fontSize:11,fontWeight:700,cursor:'pointer'}}>Video Invite</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={['Vacancy Management','Job Posting','Candidate Database','HR Dashboard']} actions={CTX} onAction={(k,item)=>{if(k==='view')setSelected(item);if(k==='advance')advanceCandidate(item.id,1)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="ATS Candidates" columns={['Name','Email','Phone','Position','Stage','AI Score','Written %','Video %','Overall %','Experience','Education']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}
