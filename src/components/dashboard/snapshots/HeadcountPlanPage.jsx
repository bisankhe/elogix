// FILE: HeadcountPlanPage.jsx - Headcount Planning
// Workforce Planning Module 7/13
import { useState } from 'react'
import { DEPARTMENTS, BRANCHES, HEADCOUNT_TREND, MONTHS_BS, ATTRITION_TREND, HIRING_TREND, WFP_THEME, TOTAL_QUOTA, TOTAL_FILLED, TOTAL_VACANT, FISCAL_YEAR } from '../../../data/wfpData.js'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const { G, A } = WFP_THEME.headcount
const IMPACT = ['Annual Manpower Plan','Headcount Planning','Vacancy Planning','Payroll Budget','HR Dashboard']

export default function HeadcountPlanPage() {
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="👥" title="Headcount Planning"
        breadcrumb="Employee Lifecycle > Recruitment > Workforce Planning"
        gradient={G}
        stats={[
          {icon:'📋',label:'Total Quota',  value:TOTAL_QUOTA},
          {icon:'✅',label:'Filled',        value:TOTAL_FILLED},
          {icon:'🔴',label:'Vacant',        value:TOTAL_VACANT},
          {icon:'📅',label:'Fiscal Year',  value:FISCAL_YEAR},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Plan"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:`linear-gradient(135deg,${A}08,${A}02)`,border:`1px solid ${A}22`,borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:A,display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🤖</span>
        <div><strong>AI Insight - Headcount Planning:</strong> Based on current fill rates and historical attrition, AI projects {Math.round(TOTAL_VACANT*1.2)} positions will need action in Q3. Recommend prioritizing Operations and IT vacancies.</div>
      </div>

      {/* Department planning grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14,marginBottom:16}}>
        {DEPARTMENTS.slice(0,6).map(d=>{
          const pct = +(d.filled/d.quota*100).toFixed(1)
          const color = pct>=90?'#10b981':pct>=75?'#f59e0b':'#ef4444'
          return (
            <LuxCard key={d.id} color={A}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.name,...d}})}}>
              <div style={{padding:'14px 16px 10px'}}>
                <div style={{fontSize:13,fontWeight:900,color:'#0f172a',marginBottom:2}}>{d.name}</div>
                <div style={{fontSize:10,color:'#94a3b8',fontStyle:'italic',marginBottom:8}}>{d.nepali}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>
                  {[{l:'Quota',v:d.quota,c:'#64748b'},{l:'Filled',v:d.filled,c:'#10b981'},{l:'Vacant',v:d.vacant,c:'#ef4444'}].map((s,i)=>(
                    <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'5px 3px'}}>
                      <div style={{fontSize:14,fontWeight:900,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:10}}>
                  <span style={{color:'#64748b'}}>Fill Rate</span>
                  <span style={{fontWeight:700,color}}>{pct}%</span>
                </div>
                <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:7}}/>
                </div>
                <div style={{marginTop:8,fontSize:10,color:'#64748b'}}>
                  Budget: <strong style={{color:A}}>NPR {(d.budget_npr/100000).toFixed(1)}L</strong>
                </div>
              </div>
            </LuxCard>
          )
        })}
      </div>

      {/* Trend chart (mini bars) */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'18px 20px',marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:14}}>Monthly Headcount Trend (FY {FISCAL_YEAR})</div>
        <div style={{display:'flex',alignItems:'flex-end',gap:6,height:80}}>
          {HEADCOUNT_TREND.map((v,i)=>{
            const maxV = Math.max(...HEADCOUNT_TREND)
            const minV = Math.min(...HEADCOUNT_TREND)
            return (
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                <div style={{fontSize:9,color:A,fontWeight:700}}>{v}</div>
                <div style={{width:'100%',background:`${A}18`,borderRadius:4,overflow:'hidden',display:'flex',alignItems:'flex-end',height:55}}>
                  <div style={{width:'100%',height:`${maxV>minV?Math.round((v-minV)/(maxV-minV)*100):50}%`,background:`linear-gradient(180deg,${A},${A}88)`,borderRadius:4}}/>
                </div>
                <div style={{fontSize:8,color:'#94a3b8',textAlign:'center',lineHeight:1}}>{MONTHS_BS[i].substring(0,3)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Planning form modal */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:660,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Create Headcount Planning Record</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Plan Title" value="" onChange={()=>{}} accent={A}/>
                <Field label="Fiscal Year" type="select" value="" onChange={()=>{}} accent={A} options={['2081/82 BS','2082/83 BS','2083/84 BS']}/>
                <Field label="Department" type="select" value="" onChange={()=>{}} accent={A} options={DEPARTMENTS.map(d=>d.name)}/>
                <Field label="Target Headcount" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Budget Allocation (NPR)" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Priority" type="select" value="" onChange={()=>{}} accent={A} options={['Critical','High','Medium','Low']}/>
              </div>
              <Field label="Justification / Notes" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              <AIImpact color={A} lines={['AI will validate against approved quota limits.','Nepal LA2074: Expansion requires Labour Office notification.','Budget impact auto-calculated from grade salary bands.','Links to Vacancy Planning and Resource Allocation.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Save Plan</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={IMPACT} actions={[{icon:'👁',label:'View Detail',key:'view'},{icon:'✏',label:'Edit Plan',key:'edit'},{icon:'📤',label:'Export',key:'export'}]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Headcount Planning" columns={['Department','Branch','Quota','Planned','Budget NPR','Priority','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
