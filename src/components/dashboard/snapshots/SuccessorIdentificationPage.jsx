// FILE: SuccessorIdentificationPage.jsx - Successor Identification
// (Performance & Talent > Talent Development > Succession Planning)
// 1:N critical-role-to-candidate mapping. Visual org node shows cover/
// risk for key leadership roles; click-to-compare candidate cards with
// skill-gap overlay. Reuses designations (is_executive/is_managerial)
// + employee_skill_levels (Course Management) for the gap calculation.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const CRITICAL_ROLES = [
  { id:'cr1', role:'Engineering Director', incumbent:'Dipesh Bhattarai', retirement_eligible:false, flight_risk:'medium',
    candidates:[
      {employee:'Gita Maharjan',readiness:'ready_now',skill_match_pct:91},
      {employee:'Sunil Magar',readiness:'ready_1_2yr',skill_match_pct:74},
    ], impact_links:['Talent Mapping','Readiness Assessment'] },
  { id:'cr2', role:'Finance Controller', incumbent:'Maya Pradhan', retirement_eligible:true, flight_risk:'low',
    candidates:[], impact_links:[],
    flag_note:'No succession plan in place -- critical role with zero ready candidates and an incumbent eligible for retirement.' },
  { id:'cr3', role:'Sales Director', incumbent:'Anjali Sharma', retirement_eligible:false, flight_risk:'high',
    candidates:[{employee:'Ramesh KC',readiness:'ready_3plus_yr',skill_match_pct:58}],
    impact_links:['HiPo Employees'] },
]

const READINESS_CFG = {
  ready_now:{c:'#10b981',label:'Ready Now'},ready_1_2yr:{c:'#f59e0b',label:'Ready in 1-2 Yrs'},ready_3plus_yr:{c:'#ef4444',label:'Ready in 3+ Yrs'},

export default function SuccessorIdentificationPage() {
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState(null)
  const [ctx, setCtx] = useState(null)

  const filtered = CRITICAL_ROLES.filter(r=>!search||r.role.toLowerCase().includes(search.toLowerCase()))
  const exposedCount = CRITICAL_ROLES.filter(r=>r.candidates.length===0).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎯" title="Successor Identification"
        breadcrumb="Performance & Talent Management > Talent Development > Succession Planning"
        gradient={G}
        stats={[
          {icon:'🎯',label:'Critical Roles',     value:CRITICAL_ROLES.length},
          {icon:'⚠',label:'No Coverage',           value:exposedCount},
          {icon:'✅',label:'Ready-Now Candidates',  value:CRITICAL_ROLES.flatMap(r=>r.candidates).filter(c=>c.readiness==='ready_now').length},
          {icon:'📐',label:'Avg Bench Depth',         value:'1.3'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🗺</span>
        <div style={{flex:1,minWidth:200}}><strong>1:N Coverage, Not 1:1 Backups:</strong> Every critical role maps to multiple ready-now and ready-later candidates -- not just a single emergency replacement. Click a role to compare candidates side-by-side with skill-gap overlays.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by role title..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(r=>{
          const noCoverage = r.candidates.length===0
          return (
            <div key={r.id}
              onClick={()=>setSelectedRole(r)}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.role,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${noCoverage?'#fecaca':'#e2e8f0'}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${noCoverage?'#ef4444':'#10b981'}`,cursor:'pointer'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.role}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>Incumbent: {r.incumbent} {r.retirement_eligible&&'. Retirement Eligible'}</div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <span style={{background:r.flight_risk==='high'?'#fef2f2':r.flight_risk==='medium'?'#fffbeb':'#f0fdf4',color:r.flight_risk==='high'?'#dc2626':r.flight_risk==='medium'?'#b45309':'#15803d',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>Flight risk: {r.flight_risk}</span>
                </div>
              </div>
              <div style={{padding:'12px 18px'}}>
                {noCoverage?(
                  <div style={{fontSize:10,color:'#dc2626',fontWeight:700}}>⚠ {r.flag_note}</div>
                ):(
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {r.candidates.map((c,i)=>{
                      const rc = READINESS_CFG[c.readiness]
                      return (<span key={i} style={{background:`${rc.c}15`,color:rc.c,fontSize:9,fontWeight:700,padding:'4px 11px',borderRadius:20}}>{c.employee} -- {rc.label} ({c.skill_match_pct}%)</span>)
                    })}
                  </div>
                )}
                {r.flag_note && !noCoverage && <div style={{marginTop:8,fontSize:10,color:'#b45309'}}>⚠ {r.flag_note}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {selectedRole&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:5000,display:'flex',justifyContent:'flex-end'}} onClick={()=>setSelectedRole(null)}>
          <div style={{background:'#fff',width:'min(440px,100%)',height:'100%',overflow:'auto',boxShadow:'-4px 0 24px rgba(0,0,0,.15)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px'}}>
              <div style={{fontSize:16,fontWeight:900,color:'#fff'}}>{selectedRole.role}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:4}}>Incumbent: {selectedRole.incumbent}</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>Candidate Comparison</div>
              {selectedRole.candidates.length===0?(
                <div style={{fontSize:11,color:'#94a3b8'}}>No candidates currently mapped to this role.</div>
              ):selectedRole.candidates.map((c,i)=>{
                return (
                  <div key={i} style={{background:'#f8fafc',borderRadius:12,padding:'14px',marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{c.employee}</span>
                      <span style={{fontSize:10,fontWeight:700,color:rc.c}}>{rc.label}</span>
                    </div>
                    <div style={{height:8,background:'#e2e8f0',borderRadius:8,overflow:'hidden'}}><div style={{width:`${c.skill_match_pct}%`,height:'100%',background:rc.c,borderRadius:8}}/></div>
                    <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>{c.skill_match_pct}% skill match</div>
                  </div>
                )
              })}
              <button style={{width:'100%',padding:13,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',marginTop:10}}>+ Add Candidate to This Role</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Skill-gap overlay computed live from each candidate\'s current Skill Matrix vs. the role\'s required competencies.','Roles with zero ready-now candidates auto-flag for HR review every quarter.','Retirement-eligible incumbents with no successor trigger an immediate executive alert.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
