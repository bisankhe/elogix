// FILE: SkillGapMatrixPage.jsx - Skill Gap Matrix
// (Performance & Talent > Talent Development > Learning & Development)
// Page 1 of the Matrix -> Analysis -> Training Request pipeline. Pure
// heatmap UI over the EXISTING employee_skill_levels/v_skill_matrix
// (built in Course Management) -- the inventory/comparison layer.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const SKILLS = ['Cloud Architecture','Communication','DevOps','Negotiation','CRM Tools','Leadership']
const REQUIRED_LEVELS = {'Cloud Architecture':7,'Communication':7,'DevOps':7,'Negotiation':8,'CRM Tools':6,'Leadership':7}

const MATRIX_DATA = [
  {employee:'Hari Thapa',dept:'IT',levels:{'Cloud Architecture':3,'Communication':5,'DevOps':4,'Leadership':5}},
  {employee:'Anjali Sharma',dept:'Sales',levels:{'Negotiation':5,'Communication':8,'CRM Tools':7}},
  {employee:'Bikash Rai',dept:'IT',levels:{'Cloud Architecture':6,'Communication':4,'DevOps':6,'Leadership':3}},
]

function cellColor(level, required) {
  if (!level) return '#f1f5f9'
  const ratio = level/required
  if (ratio>=1) return '#10b981'
  if (ratio>=0.7) return '#eab308'
  return '#ef4444'
}

export default function SkillGapMatrixPage() {
  const [search, setSearch] = useState('')
  const [selectedCell, setSelectedCell] = useState(null)
  const [ctx, setCtx] = useState(null)

  const filtered = MATRIX_DATA.filter(m=>!search||m.employee.toLowerCase().includes(search.toLowerCase()))
  let criticalCount = 0, developingCount = 0, proficientCount = 0
  filtered.forEach(row=>SKILLS.forEach(skill=>{
    const level = row.levels[skill]
    if (!level) return
    if (ratio>=1) proficientCount++; else if (ratio>=0.7) developingCount++; else criticalCount++
  }))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🧩" title="Skill Gap Matrix"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'👥',label:'Employees Mapped',  value:MATRIX_DATA.length},
          {icon:'🟢',label:'Proficient',          value:proficientCount},
          {icon:'🟡',label:'Developing',          value:developingCount},
          {icon:'🔴',label:'Critical Gaps',        value:criticalCount},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📐</span>
        <div style={{flex:1,minWidth:200}}><strong>The Inventory Layer:</strong> Pure data comparison - required role competencies (X-axis) against actual rated proficiency (Y-axis, 1-5+ scale). Green = proficient, Yellow = developing, Red = critical gap. Click any cell to calibrate it in Skill Gap Analysis.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginTop:14,overflowX:'auto'}}>
        <table style={{borderCollapse:'collapse',fontSize:11,minWidth:600}}>
          <thead>
            <tr>
              <th style={{padding:'8px 10px',textAlign:'left',fontSize:9,fontWeight:800,color:A}}>Employee</th>
              {SKILLS.map(s=>(<th key={s} style={{padding:'8px 6px',textAlign:'center',fontSize:8,fontWeight:800,color:A,maxWidth:90}}>{s}<br/><span style={{color:'#94a3b8',fontWeight:600}}>req. {REQUIRED_LEVELS[s]}</span></th>))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row,i)=>(
              <tr key={i}>
                <td style={{padding:'8px 10px',fontWeight:700,color:'#0f172a',whiteSpace:'nowrap'}}>{row.employee}<div style={{fontSize:8,color:'#94a3b8',fontWeight:400}}>{row.dept}</div></td>
                {SKILLS.map(skill=>{
                  return (
                    <td key={skill} style={{padding:4,textAlign:'center'}}>
                      <div onClick={()=>level&&setSelectedCell({employee:row.employee,skill,level,required:REQUIRED_LEVELS[skill]})}
                        onContextMenu={ev=>{if(level){ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:`${row.employee} - ${skill}`,impact_links:['Skill Gap Analysis']}})}}}
                        style={{width:40,height:32,borderRadius:7,background:cellColor(level,REQUIRED_LEVELS[skill]),display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:11,cursor:level?'pointer':'default',margin:'0 auto'}}>
                        {level||'-'}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCell&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setSelectedCell(null)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(420px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}>
              <div style={{fontSize:15,fontWeight:900,color:'#fff'}}>{selectedCell.employee}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.8)'}}>{selectedCell.skill}</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:10}}>
                <span style={{color:'#64748b'}}>Actual Level</span><span style={{fontWeight:800,color:'#0f172a'}}>{selectedCell.level}/10</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:14}}>
                <span style={{color:'#64748b'}}>Required Level</span><span style={{fontWeight:800,color:'#0f172a'}}>{selectedCell.required}/10</span>
              </div>
              <button style={{width:'100%',padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Calibrate in Skill Gap Analysis {'>'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Required levels auto-populate from each role\'s job profile -- no manual entry per employee.','Skill levels update automatically when an employee completes a tagged course in the LMS.','Click any red or yellow cell to begin formal calibration and gap analysis.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'📊',label:'Open in Skill Gap Analysis',key:'analyze'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
