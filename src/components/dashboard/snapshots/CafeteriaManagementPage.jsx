// FILE: CafeteriaManagementPage.jsx - Cafeteria Management
// (Finance, Assets & Administration > Administrative Operations)
// Digital menu with dietary tags, pre-order + payroll-deducted payment.
// Section 28: mandatory 30-min tiffin break after 5 continuous hours,
// counted toward total shift -- surfaced directly, not assumed.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const MENU = [
  {item:'Dal Bhat Tarkari',tags:['Vegetarian'],price:120,calories:650},
  {item:'Chicken Momo (10pc)',tags:['High Protein'],price:150,calories:480},
  {item:'Vegan Buddha Bowl',tags:['Vegan','Gluten-Free'],price:180,calories:420},
  {item:'Masala Chiya',tags:['Vegetarian'],price:30,calories:80},
]

export default function CafeteriaManagementPage() {
  const [preOrders, setPreOrders] = useState({})
  const [ctx, setCtx] = useState(null)

  const totalPreOrdered = Object.values(preOrders).reduce((s,q)=>s+q,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="☕" title="Cafeteria Management"
        breadcrumb="Finance, Assets & Administration > Administrative Operations"
        gradient={G}
        stats={[
          {icon:'☕',label:"Today's Menu Items",  value:MENU.length},
          {icon:'🛒',label:'My Pre-Orders',           value:totalPreOrdered},
          {icon:'⏰',label:'Tiffin Break',                value:'30 min . after 5h'},
          {icon:'🚭',label:'Tobacco-Free Zone',              value:'Enforced'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⏰</span>
        <div style={{flex:1,minWidth:200}}><strong>Section 28, Counted Toward Your Shift:</strong> Your 30-minute tiffin break after 5 continuous hours is paid time, not an unpaid gap -- pre-order ahead to make the most of it without a long queue.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>
        {MENU.map((m,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:m.item,...m}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{m.item}</div>
            <div style={{display:'flex',gap:4,marginTop:6,flexWrap:'wrap'}}>
              {m.tags.map((t,j)=><span key={j} style={{background:'#f0fdf4',color:'#15803d',fontSize:7,fontWeight:600,padding:'2px 7px',borderRadius:20}}>{t}</span>)}
            </div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:6}}>{m.calories} kcal</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10}}>
              <span style={{fontSize:13,fontWeight:800,color:A}}>NPR {m.price}</span>
              <button onClick={()=>setPreOrders(p=>({...p,[m.item]:(p[m.item]||0)+1}))} style={{padding:'5px 14px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>+ Pre-Order</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Pre-order headcount feeds straight to the kitchen, cutting food waste and queue time during peak hours.','Payment deducts directly from your linked digital wallet or payroll -- never a separate coupon system to lose.','Peak-hour forecasting adjusts inventory automatically based on real booking patterns, not last week\'s guess.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Nutrition Info',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
