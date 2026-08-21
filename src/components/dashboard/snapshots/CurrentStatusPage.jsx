// FILE: CurrentStatusPage.jsx - Current Status (Ex-filled Positions)
import { useState } from 'react'
import { DEPARTMENTS, TOTAL_QUOTA, TOTAL_FILLED, TOTAL_VACANT, VACANCY_RATE, WFP_THEME } from '../../../data/wfpData.js'
import { ExcelModal, PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'
const { G, A } = WFP_THEME.current
const CTX = [{icon:'👁',label:'View Detail',key:'view'},{icon:'📋',label:'Create JRF',key:'jrf'},{icon:'🔗',label:'Impact',key:'impact'},{icon:'📤',label:'Export',key:'export'}]
export default function CurrentStatusPage() {
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [hover, setHover] = useState(null)
  const utilizationRate = +(TOTAL_FILLED/TOTAL_QUOTA*100).toFixed(1)
  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="Current Status (Ex-filled Positions)"
        breadcrumb="Employee Lifecycle > Recruitment > Workforce Planning"
        gradient={G}
        stats={[
          {icon:'📊',label:'Total Quota',      value:TOTAL_QUOTA},
          {icon:'✅',label:'Ex-Filled',         value:TOTAL_FILLED},
          {icon:'🔴',label:'Vacant',            value:TOTAL_VACANT},
          {icon:'📈',label:'Utilization',       value:utilizationRate+'%'},
        ]}
        onAdd={()=>{}} addLabel="Refresh Data" onExcel={()=>setShowExcel(true)}/>

      {/* Visual status overview */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px 22px'}}>
          <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:12}}>Quota Utilization</div>
          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:12}}>
            <div style={{width:100,height:100,borderRadius:'50%',background:`conic-gradient(${A} 0% ${utilizationRate}%, #f1f5f9 ${utilizationRate}% 100%)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <div style={{width:72,height:72,borderRadius:'50%',background:'#fff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <div style={{fontSize:18,fontWeight:900,color:A}}>{utilizationRate}%</div>
                <div style={{fontSize:8,color:'#94a3b8'}}>FILLED</div>
              </div>
            </div>
            <div style={{flex:1}}>
              {[{l:'Filled (Ex-filled)',v:TOTAL_FILLED,c:'#10b981'},{l:'Vacant',v:TOTAL_VACANT,c:'#ef4444'},{l:'On Hold',v:DEPARTMENTS.reduce((s,d)=>s+d.onhold,0),c:'#f59e0b'}].map((s,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',marginBottom:6,alignItems:'center'}}>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}><div style={{width:10,height:10,borderRadius:2,background:s.c}}/><span style={{fontSize:11,color:'#64748b'}}>{s.l}</span></div>
                  <span style={{fontWeight:800,color:s.c,fontSize:13}}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px 22px'}}>
          <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:12}}>AI Insight</div>
          <div style={{background:`${A}08`,border:`1px solid ${A}22`,borderRadius:10,padding:'12px 14px',fontSize:11,color:'#475569',lineHeight:1.7}}>
            Utilization at {utilizationRate}%. <strong style={{color:A}}>Operations dept</strong> has highest vacancy gap (5 posts). {DEPARTMENTS.filter(d=>d.vacant>2).length} departments below 90% fill rate. Recommend initiating JRFs for critical vacancies before Q3.
          </div>
        </div>
      </div>

      {/* Department status grid */}
      <div style={{display:'grid',gap:10}}>
        {DEPARTMENTS.map(d=>{
          const pct = +(d.filled/d.quota*100).toFixed(1)
          const color = pct>=90?'#10b981':pct>=75?'#f59e0b':'#ef4444'
          return (
            <div key={d.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.name,...d}})}}
              onMouseEnter={()=>setHover(d.id)} onMouseLeave={()=>setHover(null)}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 18px',
                boxShadow:hover===d.id?'0 4px 16px rgba(0,0,0,.08)':'none',transition:'box-shadow .2s'}}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 3fr',gap:12,alignItems:'center'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{d.name}</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>{d.branch} . {d.nepali}</div>
                </div>
                {[
                  {l:'Quota',v:d.quota,c:'#64748b'},
                  {l:'Filled',v:d.filled,c:'#10b981'},
                  {l:'Vacant',v:d.vacant,c:'#ef4444'},
                  {l:'On Hold',v:d.onhold,c:'#f59e0b'},
                ].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'6px'}}>
                    <div style={{fontSize:14,fontWeight:900,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                  </div>
                ))}
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:10}}>
                    <span style={{color:'#64748b'}}>Fill Rate</span>
                    <span style={{fontWeight:800,color}}>{pct}%</span>
                  </div>
                  <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                    <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:8,transition:'width .6s ease'}}/>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={['Vacancy Planning','Annual Manpower Plan','Headcount Planning']} actions={CTX} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Current Status" columns={['Department','Branch','Quota','Filled','Vacant','On Hold','Fill Rate %']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
