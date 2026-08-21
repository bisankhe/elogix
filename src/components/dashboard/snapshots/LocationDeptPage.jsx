// FILE: LocationDeptPage.jsx - Location-wide & Department-wide Workforce View
import { useState } from 'react'
import { BRANCHES, DEPARTMENTS, WFP_THEME } from '../../../data/wfpData.js'
import { ExcelModal, PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'
const { G, A } = WFP_THEME.location
export default function LocationDeptPage() {
  const [view, setView] = useState('location')
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const data = view==='location' ? BRANCHES : DEPARTMENTS
  const totalQuota  = data.reduce((s,d)=>s+d.quota,0)
  const totalFilled = data.reduce((s,d)=>s+d.filled,0)
  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗺" title="Location-wide & Department-wide Workforce"
        breadcrumb="Employee Lifecycle > Recruitment > Workforce Planning"
        gradient={G}
        stats={[
          {icon:'🏢',label:view==='location'?'Locations':'Departments',value:data.length},
          {icon:'📋',label:'Total Quota',  value:totalQuota},
          {icon:'✅',label:'Total Filled', value:totalFilled},
          {icon:'📈',label:'Fill Rate',    value:+(totalFilled/totalQuota*100).toFixed(1)+'%'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>setShowExcel(true)}/>

      <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:4,borderRadius:10,marginBottom:14,width:'fit-content'}}>
        {['location','department'].map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{padding:'9px 20px',borderRadius:8,border:'none',cursor:'pointer',
              background:view===v?'#fff':'transparent',color:view===v?A:'#64748b',
              fontWeight:view===v?700:400,fontSize:12,boxShadow:view===v?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {v==='location'?'By Location':'By Department'}
          </button>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
        {data.map(item=>{
          const pct = +(item.filled/item.quota*100).toFixed(1)
          const color = pct>=90?'#10b981':pct>=75?'#f59e0b':'#ef4444'
          const budgetLabel = item.budget_npr ? 'NPR '+(item.budget_npr/100000).toFixed(1)+'L' : null
          return (
            <div key={item.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:item.name,...item}})}}
              style={{background:'#fff',border:`1.5px solid ${color}44`,borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.05)',borderTop:`4px solid ${color}`}}>
              <div style={{padding:'14px 16px 10px'}}>
                <div style={{fontSize:14,fontWeight:900,color:'#0f172a',marginBottom:2}}>{item.name}</div>
                {item.code&&<div style={{fontSize:10,color:'#94a3b8',marginBottom:3}}>Code: {item.code}{item.province?' . '+item.province:''}</div>}
                {item.branch&&<div style={{fontSize:10,color:'#64748b'}}>{item.branch}</div>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,padding:'0 14px 12px'}}>
                {[{l:'Quota',v:item.quota,c:'#64748b'},{l:'Filled',v:item.filled,c:'#10b981'},{l:'Vacant',v:item.vacant,c:'#ef4444'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:16,fontWeight:900,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{padding:'0 14px 14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:11}}>
                  <span style={{color:'#64748b'}}>Fill Rate</span>
                  <span style={{fontWeight:800,color}}>{pct}%</span>
                </div>
                <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${color},${color}88)`,borderRadius:8,transition:'width .7s ease'}}/>
                </div>
                {budgetLabel&&<div style={{marginTop:8,fontSize:10,color:'#64748b'}}>Budget: <strong style={{color:A}}>{budgetLabel}</strong></div>}
              </div>
            </div>
          )
        })}
      </div>
      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={['Headcount Planning','Annual Manpower Plan','Resource Allocation']} actions={[{icon:'👁',label:'View Detail',key:'view'},{icon:'📊',label:'Drill Down',key:'drill'},{icon:'📤',label:'Export',key:'export'}]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Location Department View" columns={['Name','Code','Province/Branch','Quota','Filled','Vacant','Fill Rate %','Budget NPR']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
