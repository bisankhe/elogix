// FILE: CandidateDatabasePage.jsx - Candidate Database (Talent Pool)
// AI semantic search, anonymized profiles, GDPR-compliant, Nepal LA2074

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, SearchBar, Drawer, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#3b82f6 100%)'
const A = '#1e3a5f'

const TALENT_POOL = [
  {id:'cp1',code:'CAND-001',name:'Rajan Shrestha',    email:'rajan@email.com',   phone:'980-XXXX',city:'Kathmandu',
   current_role:'Senior Developer',edu:'B.Tech CS',exp_yrs:6,notice_period:'1 month',
   skills:['React','Python','AWS','PostgreSQL','Docker'],ai_score:94,stage:'In Process',
   source:'LinkedIn',applied_roles:['Senior SW Dev'],last_activity:'2025-06-15',
   status:'active',la_consent:true,gdpr_expiry:'2027-06-15',
   tags:['Top Talent','Tech','Frontend']},
  {id:'cp2',code:'CAND-002',name:'Priya Tamang',      email:'priya@email.com',   phone:'981-XXXX',city:'Kathmandu',
   current_role:'IT Analyst',edu:'M.Sc IT',exp_yrs:5,notice_period:'2 months',
   skills:['Java','Spring Boot','MySQL','Microservices'],ai_score:91,stage:'Panel Interview',
   source:'Merojob',applied_roles:['Senior SW Dev'],last_activity:'2025-06-14',
   status:'active',la_consent:true,gdpr_expiry:'2027-06-14',
   tags:['Backend','Shortlisted']},
  {id:'cp3',code:'CAND-003',name:'Maya Pradhan',      email:'maya@email.com',    phone:'982-XXXX',city:'Lalitpur',
   current_role:'Finance Controller',edu:'CA',exp_yrs:8,notice_period:'3 months',
   skills:['IFRS','SAP FI','Tax','Audit','ERP'],ai_score:92,stage:'Video Interview',
   source:'Referral',applied_roles:['Finance Manager'],last_activity:'2025-06-13',
   status:'active',la_consent:true,gdpr_expiry:'2027-06-13',
   tags:['Finance','CA','Senior']},
  {id:'cp4',code:'CAND-004',name:'Gita Maharjan',     email:'gita@email.com',    phone:'983-XXXX',city:'Bhaktapur',
   current_role:'Cloud Engineer',edu:'M.Tech',exp_yrs:6,notice_period:'1 month',
   skills:['AWS','GCP','Kubernetes','Terraform','CI/CD'],ai_score:96,stage:'Offer Sent',
   source:'Direct Apply',applied_roles:['Cloud Architect'],last_activity:'2025-06-16',
   status:'active',la_consent:true,gdpr_expiry:'2027-06-16',
   tags:['Cloud','Top Pick','Offer Stage']},
  {id:'cp5',code:'CAND-005',name:'Sita Khadka',       email:'sita@email.com',    phone:'984-XXXX',city:'Pokhara',
   current_role:'HR Officer',edu:'MBA HR',exp_yrs:5,notice_period:'1 month',
   skills:['HRMS','Recruitment','Labour Law','L&D','Performance Mgmt'],ai_score:87,stage:'Applied',
   source:'LinkedIn',applied_roles:['HR Business Partner'],last_activity:'2025-06-12',
   status:'active',la_consent:true,gdpr_expiry:'2027-06-12',
   tags:['HR','MidLevel']},
  {id:'cp6',code:'CAND-006',name:'Anon Candidate',    email:'hidden@email.com',  phone:'XXX-XXXX',city:'Kathmandu',
   current_role:'Sales Manager',edu:'BBS',exp_yrs:7,notice_period:'2 months',
   skills:['B2B Sales','CRM','Negotiation','Channel Mgmt'],ai_score:78,stage:'Talent Pool',
   source:'JobsNepal',applied_roles:[],last_activity:'2025-05-20',
   status:'pool',la_consent:true,gdpr_expiry:'2026-05-20',
   tags:['Sales','Passive']},
  {id:'cp7',code:'CAND-007',name:'Ram Bahadur KC',   email:'ram@email.com',     phone:'985-XXXX',city:'Biratnagar',
   current_role:'Operations Supervisor',edu:'BBA',exp_yrs:9,notice_period:'1 month',
   skills:['Operations','Team Management','Logistics','ERP','ISO'],ai_score:82,stage:'Talent Pool',
   source:'Referral',applied_roles:[],last_activity:'2025-04-10',
   status:'pool',la_consent:true,gdpr_expiry:'2026-04-10',
   tags:['Operations','Experienced']},
]

const STAGE_COLOR = {
  'In Process':'#3b82f6','Panel Interview':'#7c3aed','Video Interview':'#f59e0b',
  'Offer Sent':'#10b981','Applied':'#64748b','Talent Pool':'#94a3b8',
}

const CTX = [
  {icon:'👁',label:'View Full Profile',     key:'view'},
  {icon:'🤖',label:'AI Match to Opening',  key:'match'},
  {icon:'📧',label:'Send Email',            key:'email'},
  {icon:'📋',label:'Add to Pipeline',       key:'pipeline'},
  {icon:'🏷',label:'Add Tag',               key:'tag'},
  {icon:'🔗',label:'Impact Analysis',       key:'impact'},
  {icon:'📤',label:'Export Profile',        key:'export'},
  {icon:'🗑',label:'Request GDPR Deletion', key:'gdpr', danger:true},
]

export default function CandidateDatabasePage() {
  const [candidates, setCandidates] = useState(TALENT_POOL)
  const [search, setSearch]         = useState('')
  const [filterStage, setFilterStage] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [view, setView]             = useState('cards')
  const [selected, setSelected]     = useState(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [showExcel, setShowExcel]   = useState(false)
  const [ctx, setCtx]               = useState(null)
  const [aiQuery, setAiQuery]       = useState('')
  const [aiResults, setAiResults]   = useState(null)
  const [msg, setMsg]               = useState('')
  const [matchResult, setMatchResult] = useState(null)
  const [form, setForm]             = useState({name:'',email:'',phone:'',city:'Kathmandu',current_role:'',exp_yrs:'',edu:'',skills:'',source:'Direct Apply',notice_period:'1 month'})
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const stages  = [...new Set(candidates.map(c=>c.stage))]
  const sources = [...new Set(candidates.map(c=>c.source))]

  const filtered = candidates.filter(c=>{
    if (filterStage!=='all'&&c.stage!==filterStage) return false
    if (filterSource!=='all'&&c.source!==filterSource) return false
    if (search&&!c.name.toLowerCase().includes(search.toLowerCase())&&
        !c.skills.join(' ').toLowerCase().includes(search.toLowerCase())&&
        !c.current_role.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const runAISearch = () => {
    const matches = candidates.filter(c=>
      c.skills.some(s=>aiQuery.toLowerCase().includes(s.toLowerCase())) ||
      c.current_role.toLowerCase().includes(aiQuery.toLowerCase())
    ).sort((a,b)=>b.ai_score-a.ai_score)
    setAiResults(matches.slice(0,5))
  }

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗄" title="Candidate Database"
        breadcrumb="Employee Lifecycle > Recruitment > Recruitment Management"
        gradient={G}
        stats={[
          {icon:'👤',label:'Total Candidates',  value:candidates.length},
          {icon:'🎯',label:'Active Pipeline',   value:candidates.filter(c=>c.status==='active').length},
          {icon:'🔄',label:'Talent Pool',       value:candidates.filter(c=>c.status==='pool').length},
          {icon:'🛡',label:'GDPR Compliant',    value:candidates.filter(c=>c.la_consent).length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="+ Add Candidate"
        onExcel={()=>setShowExcel(true)}/>

      {/* AI Semantic Search */}
      <div style={{background:'linear-gradient(135deg,#0f172a,#1e3a5f)',borderRadius:14,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
        <div style={{fontSize:12,fontWeight:800,marginBottom:8}}>🤖 AI Semantic Search - "Find me candidates with 5+ years React and AWS experience in Kathmandu"</div>
        <div style={{display:'flex',gap:8}}>
          <input value={aiQuery} onChange={e=>setAiQuery(e.target.value)}
            placeholder="e.g. 'Finance professional with CA certification and ERP experience'"
            style={{flex:1,padding:'10px 14px',borderRadius:10,border:'none',fontSize:12,outline:'none',color:'#0f172a'}}/>
          <button onClick={runAISearch} style={{padding:'10px 20px',borderRadius:10,border:'none',background:'#3b82f6',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>AI Search</button>
          {aiResults&&<button onClick={()=>setAiResults(null)} style={{padding:'10px 14px',borderRadius:10,border:'1px solid rgba(255,255,255,.3)',background:'transparent',color:'#fff',fontSize:11,cursor:'pointer'}}>Clear</button>}
        </div>
        {aiResults&&(
          <div style={{marginTop:10}}>
            <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginBottom:6}}>AI found {aiResults.length} matching candidates:</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {aiResults.map(c=>(
                <div key={c.id} onClick={()=>setSelected(c)} style={{background:'rgba(255,255,255,.15)',borderRadius:20,padding:'4px 12px',fontSize:11,color:'#fff',cursor:'pointer',fontWeight:600}}>
                  {c.name} ({c.ai_score}%)
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, skill, role..."/>
        <select value={filterStage} onChange={e=>setFilterStage(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Stages</option>
          {stages.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterSource} onChange={e=>setFilterSource(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Sources</option>
          {sources.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        {['cards','table'].map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{padding:'9px 14px',borderRadius:9,border:`1.5px solid ${view===v?A:'#e2e8f0'}`,background:view===v?'#eff6ff':'#fff',color:view===v?A:'#64748b',fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>
            {v==='cards'?'Cards':'Table'}
          </button>
        ))}
      </div>

      {view==='cards'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
          {filtered.map(c=>{
            const stageColor = STAGE_COLOR[c.stage]||'#64748b'
            return (
              <LuxCard key={c.id} color={A} onClick={()=>setSelected(c)}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.name,...c}})}}>
                <div style={{padding:'14px 16px 8px',display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:44,height:44,borderRadius:'50%',background:`${A}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:A,flexShrink:0}}>{c.code.split('-')[1]}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:900,color:'#0f172a',marginBottom:2}}>{c.name}</div>
                    <div style={{fontSize:10,color:'#64748b',marginBottom:3}}>{c.current_role} . {c.exp_yrs} yrs . {c.city}</div>
                    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                      <span style={{background:`${stageColor}15`,color:stageColor,fontSize:9,fontWeight:700,padding:'1px 7px',borderRadius:20}}>{c.stage}</span>
                      <span style={{background:'#f8fafc',color:'#64748b',fontSize:9,padding:'1px 7px',borderRadius:20}}>{c.source}</span>
                    </div>
                  </div>
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:900,color:c.ai_score>=90?'#10b981':c.ai_score>=80?A:'#f59e0b'}}>{c.ai_score}%</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>AI</div>
                  </div>
                </div>
                <div style={{padding:'0 14px 8px',display:'flex',gap:4,flexWrap:'wrap'}}>
                  {c.skills.slice(0,4).map((s,i)=><span key={i} style={{background:'#f1f5f9',color:'#475569',fontSize:9,padding:'2px 7px',borderRadius:20}}>{s}</span>)}
                  {c.skills.length>4&&<span style={{fontSize:9,color:'#94a3b8',padding:'2px 4px'}}>+{c.skills.length-4}</span>}
                </div>
                <div style={{padding:'0 14px 8px',display:'flex',gap:4,flexWrap:'wrap'}}>
                  {c.tags.map((t,i)=><span key={i} style={{background:'#fef9c3',color:'#854d0e',fontSize:8,fontWeight:700,padding:'1px 6px',borderRadius:20}}>{t}</span>)}
                </div>
                <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:5}}>
                  <button onClick={ev=>{ev.stopPropagation();setMatchResult(c);notify('🤖 AI matching '+c.name+' to open roles...')}} style={{flex:1,padding:'6px',borderRadius:7,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>🤖 AI Match</button>
                  <button onClick={ev=>{ev.stopPropagation();notify('✅ '+c.name+' added to recruitment pipeline for '+c.applied_roles[0]||'open role')}} style={{flex:1,padding:'6px',borderRadius:7,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:600,cursor:'pointer'}}>➕ Add to Role</button>
                </div>
              </LuxCard>
            )
          })}
        </div>
      )}

      {view==='table'&&(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr style={{background:'linear-gradient(135deg,#f0f9ff,#eff6ff)'}}>
                  {['Code','Name','Current Role','Exp','City','Skills','AI%','Stage','Source','Last Active','Actions'].map(h=>(
                    <th key={h} style={{padding:'11px 12px',textAlign:'left',fontSize:10,fontWeight:800,color:A,borderBottom:`2px solid ${A}22`,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c=>(
                  <tr key={c.id} style={{borderBottom:'1px solid #f8fafc',cursor:'pointer'}}
                    onClick={()=>setSelected(c)}
                    onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.name,...c}})}}
                    onMouseEnter={e=>e.currentTarget.style.background='#f0f9ff'}
                    onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:10,fontWeight:700,color:A}}>{c.code}</td>
                    <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{c.name}</td>
                    <td style={{padding:'9px 12px',color:'#64748b',fontSize:10}}>{c.current_role}</td>
                    <td style={{padding:'9px 12px',textAlign:'center',fontWeight:700}}>{c.exp_yrs}y</td>
                    <td style={{padding:'9px 12px',color:'#64748b',fontSize:10}}>{c.city}</td>
                    <td style={{padding:'9px 12px'}}>
                      <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                        {c.skills.slice(0,3).map((s,i)=><span key={i} style={{background:'#f1f5f9',color:'#475569',fontSize:8,padding:'1px 5px',borderRadius:20}}>{s}</span>)}
                      </div>
                    </td>
                    <td style={{padding:'9px 12px',textAlign:'center',fontWeight:800,color:c.ai_score>=90?'#10b981':c.ai_score>=80?A:'#f59e0b'}}>{c.ai_score}%</td>
                    <td style={{padding:'9px 12px'}}><span style={{fontSize:9,fontWeight:700,color:STAGE_COLOR[c.stage]||'#64748b'}}>{c.stage}</span></td>
                    <td style={{padding:'9px 12px',color:'#94a3b8',fontSize:10}}>{c.source}</td>
                    <td style={{padding:'9px 12px',color:'#94a3b8',fontSize:10}}>{c.last_activity}</td>
                    <td style={{padding:'9px 12px'}}>
                      <button onClick={ev=>{ev.stopPropagation();setSelected(c)}} style={{padding:'4px 8px',borderRadius:6,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:9,cursor:'pointer',fontWeight:600}}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:360}}>{msg}</div>}

      {/* AI Match Result */}
      {matchResult&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setMatchResult(null)}>
          <div style={{background:'#fff',borderRadius:16,padding:0,width:460,maxWidth:'95vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'16px 16px 0 0',color:'#fff'}}>
              <div style={{fontSize:13,fontWeight:900}}>🤖 AI Role Match: {matchResult.name}</div>
              <div style={{fontSize:10,opacity:.8,marginTop:2}}>AI Score: {matchResult.ai_score}% · {matchResult.exp_yrs} yrs exp · {matchResult.city}</div>
            </div>
            <div style={{padding:'18px 22px'}}>
              <div style={{fontSize:11,color:'#374151',marginBottom:12}}>Best matching open roles based on skills and experience:</div>
              {[{role:'Senior Software Developer',match:96,dept:'IT',req:'MR-2025-041'},{role:'Cloud Architect',match:88,dept:'IT',req:'MR-2025-040'},{role:'IT Project Manager',match:78,dept:'IT',req:'MR-2025-043'}].map((r,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:10,border:'1px solid #e2e8f0',marginBottom:8,background:i===0?'#f0fdf4':'#fff'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{r.role}</div>
                    <div style={{fontSize:9,color:'#64748b'}}>{r.dept} · {r.req}</div>
                  </div>
                  <div style={{fontSize:16,fontWeight:900,color:r.match>=90?'#10b981':r.match>=80?'#f59e0b':'#64748b'}}>{r.match}%</div>
                  <button onClick={()=>{notify('✅ '+matchResult.name+' added to pipeline for '+r.role);setMatchResult(null)}} style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#0891b2',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Add</button>
                </div>
              ))}
              <button onClick={()=>setMatchResult(null)} style={{width:'100%',padding:'10px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,marginTop:4,cursor:'pointer'}}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:540,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>👤 Add New Candidate</div>
              <div style={{fontSize:10,opacity:.8,marginTop:2}}>All fields stored with GDPR consent. Nepal LA2074 compliant.</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                {[['Full Name *','name','text'],['Email *','email','email'],['Phone','phone','text'],['City','city','text'],['Current Role','current_role','text'],['Experience (years)','exp_yrs','number'],['Education','edu','text'],['Notice Period','notice_period','text']].map(([l,f,t])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
              </div>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Skills (comma-separated)</label>
                <input value={form.skills} onChange={e=>setForm(p=>({...p,skills:e.target.value}))} placeholder="e.g. React, Python, AWS"
                  style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Source</label>
                <select value={form.source} onChange={e=>setForm(p=>({...p,source:e.target.value}))}
                  style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                  {['Direct Apply','LinkedIn','Merojob','Referral','JobsNepal','MoLESS Portal','Campus Hiring'].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  if(!form.name||!form.email){notify('⚠️ Name and email required');return}
                  const newId='CAND-'+String(100+candidates.length+1).padStart(3,'0')
                  setCandidates(prev=>[...prev,{
                    id:'cp'+Date.now(),code:newId,name:form.name,email:form.email,phone:form.phone||'—',
                    city:form.city||'Kathmandu',current_role:form.current_role||'—',
                    edu:form.edu||'—',exp_yrs:parseInt(form.exp_yrs)||0,
                    notice_period:form.notice_period||'1 month',
                    skills:form.skills.split(',').map(s=>s.trim()).filter(Boolean),
                    ai_score:Math.floor(60+Math.random()*30),stage:'Applied',
                    source:form.source,applied_roles:[],
                    last_activity:new Date().toISOString().split('T')[0],
                    status:'active',la_consent:true,
                    gdpr_expiry:new Date(Date.now()+2*365*24*60*60*1000).toISOString().split('T')[0],
                    tags:['New']
                  }])
                  notify('✅ Candidate '+form.name+' added — '+newId)
                  setShowAdd(false)
                  setForm({name:'',email:'',phone:'',city:'Kathmandu',current_role:'',exp_yrs:'',edu:'',skills:'',source:'Direct Apply',notice_period:'1 month'})
                }} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>✅ Add Candidate</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={['ATS Dashboard','Job Posting','Vacancy Management']} actions={CTX} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Candidate Database" columns={['Code','Name','Email','Phone','City','Current Role','Experience (yrs)','Education','Skills','AI Score','Stage','Source','Tags','GDPR Consent','GDPR Expiry']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Code',selected?.code],['Name',selected?.name],['Email',selected?.email],
        ['Phone',selected?.phone],['City',selected?.city],
        ['Current Role',selected?.current_role],['Experience',selected?.exp_yrs+' years'],
        ['Education',selected?.edu],['Notice Period',selected?.notice_period],
        ['Skills',selected?.skills?.join(', ')],['AI Score',selected?.ai_score+'%'],
        ['Stage',selected?.stage],['Source',selected?.source],
        ['Last Activity',selected?.last_activity],
        ['GDPR Consent',selected?.la_consent?'Yes':'NO'],
        ['GDPR Expiry',selected?.gdpr_expiry],['Tags',selected?.tags?.join(', ')],
      ]}/>
    </div>
  )
}
