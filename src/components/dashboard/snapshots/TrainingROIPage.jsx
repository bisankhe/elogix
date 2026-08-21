// FILE: TrainingROIPage.jsx - ROI (Return on Investment) on Training
// (Performance & Talent > Talent Development > Learning & Development)
// Calculation engine: ROI% = (Net Benefits / Costs) x 100. Extends the
// EXISTING training_roi_snapshots (Performance Analytics) with full
// cost-input breakdown -- never duplicates the score-lift mechanism.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const ROI_CALCULATIONS = [
  { id:'r1', course:'AWS Solutions Architect', costs:{course_fees:45000,facilitator:0,lost_productivity:38400,lms_license_share:2000},
    benefits:{error_reduction_npr:62000,productivity_gain_npr:48000}, participants:8,
    impact_links:['Effectiveness of Training','Course Management'] },
  { id:'r2', course:'CI/CD Pipeline Mastery', costs:{course_fees:28000,facilitator:15000,lost_productivity:24000,lms_license_share:1500},
    benefits:{error_reduction_npr:12000,productivity_gain_npr:9000}, participants:6,
    impact_links:['Effectiveness of Training'] },
]

function calcROI(r) {
  const totalCost = Object.values(r.costs).reduce((a,b)=>a+b,0)
  const totalBenefit = Object.values(r.benefits).reduce((a,b)=>a+b,0)
  const netBenefit = totalBenefit - totalCost
  const roiPct = Math.round(netBenefit/totalCost*100)
  return { totalCost, totalBenefit, netBenefit, roiPct }

export default function TrainingROIPage() {
  const [search, setSearch] = useState('')
  const [showCalc, setShowCalc] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = ROI_CALCULATIONS.filter(r=>!search||r.course.toLowerCase().includes(search.toLowerCase()))
  const avgROI = Math.round(ROI_CALCULATIONS.reduce((s,r)=>s+calcROI(r).roiPct,0)/ROI_CALCULATIONS.length)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💰" title="ROI on Training"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'💰',label:'Avg ROI',           value:avgROI+'%'},
          {icon:'📊',label:'Courses Calculated',  value:ROI_CALCULATIONS.length},
          {icon:'✅',label:'Positive ROI',          value:ROI_CALCULATIONS.filter(r=>calcROI(r).roiPct>0).length},
          {icon:'📐',label:'Formula',                value:'(Benefit/Cost)×100'},
        ]}
        onAdd={()=>setShowCalc(true)} addLabel="New ROI Calculation"/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📐</span>
        <div style={{flex:1,minWidth:200}}><strong>ROI % = (Net Training Benefits ÷ Training Costs) × 100.</strong> You don't need to be a finance expert -- enter direct costs (fees, facilitator, lost productivity) and tangible benefits (error reduction, productivity gain); the system calculates the rest.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by course name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(r=>{
          const calc = calcROI(r)
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.course,...r,impact_links:r.impact_links}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${calc.roiPct>=0?'#10b981':'#ef4444'}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.course}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{r.participants} participants</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:22,fontWeight:900,color:calc.roiPct>=0?'#10b981':'#ef4444'}}>{calc.roiPct>=0?'+':''}{calc.roiPct}%</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>ROI</div>
                </div>
              </div>
              <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                <div style={{textAlign:'center',background:'#fef2f2',borderRadius:8,padding:'10px 6px'}}>
                  <div style={{fontSize:11,fontWeight:800,color:'#dc2626'}}>NPR {calc.totalCost.toLocaleString()}</div>
                  <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>Total Cost</div>
                </div>
                <div style={{textAlign:'center',background:'#f0fdf4',borderRadius:8,padding:'10px 6px'}}>
                  <div style={{fontSize:11,fontWeight:800,color:'#15803d'}}>NPR {calc.totalBenefit.toLocaleString()}</div>
                  <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>Total Benefit</div>
                </div>
                <div style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'10px 6px'}}>
                  <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>NPR {calc.netBenefit.toLocaleString()}</div>
                  <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>Net Benefit</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showCalc&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowCalc(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(600px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>New ROI Calculation</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Course" type="select" value="" onChange={()=>{}} accent={A} options={['AWS Solutions Architect','CI/CD Pipeline Mastery']}/>
              <div style={{fontSize:10,fontWeight:700,color:'#15803d',margin:'10px 0 4px'}}>💸 Direct Costs (NPR)</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                <Field label="Course Fees" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Facilitator Cost" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Lost Productivity" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="LMS License Share" type="number" value="" onChange={()=>{}} accent={A}/>
              </div>
              <div style={{fontSize:10,fontWeight:700,color:'#15803d',margin:'10px 0 4px'}}>📈 Tangible Benefits (NPR)</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                <Field label="Error Reduction Value" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Productivity Gain Value" type="number" value="" onChange={()=>{}} accent={A}/>
              </div>
              <AIImpact color={A} lines={['Benefits estimated from Productivity Analytics output correlation where available -- not just self-reported.','Isolates training impact from market/management variables where possible, flagged as a confidence range.','Auto-feeds into the Performance Analytics Training ROI dashboard for company-wide rollup.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowCalc(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Calculate ROI</button>
                <button onClick={()=>setShowCalc(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Calculation Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
