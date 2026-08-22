// FILE: CareerPageBuilderPage.jsx - Career Page (Headless CMS Builder)
// Drag-and-drop blocks, live preview, mobile-first, one-click apply

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const BLOCK_TYPES = [
  {id:'hero',     label:'Hero Banner',         icon:'🖼', color:'#7c3aed', desc:'Headline + CTA + background image'},
  {id:'evp',      label:'EVP Highlights',      icon:'💎', color:'#7e22ce', desc:'Total Rewards, Culture, Growth pillars'},
  {id:'jobs',     label:'Open Positions Feed', icon:'💼', color:'#0284c7', desc:'Live job listing with filters'},
  {id:'testimonial',label:'Employee Testimonials',icon:'🎬',color:'#ec4899', desc:'Video carousel of employee stories'},
  {id:'culture',  label:'Culture Gallery',      icon:'📸', color:'#f59e0b', desc:'Office photos, team events, DEI stats'},
  {id:'stats',    label:'Company Stats',         icon:'📊', color:'#10b981', desc:'Headcount, locations, growth %'},
  {id:'faq',      label:'FAQ / Chatbot',          icon:'💬', color:'#06b6d4', desc:'AI chatbot for instant candidate Q&A'},
  {id:'footer',   label:'Footer + Social Links',   icon:'🔗', color:'#64748b', desc:'LinkedIn, Instagram, Glassdoor links'},
]

const PAGE_BLOCKS = [
  {id:'b1', type:'hero', order:1, status:'live', config:{headline:'Join Our Growing Team', cta:'View Open Roles'}},
  {id:'b2', type:'evp', order:2, status:'live', config:{pillars:5}},
  {id:'b3', type:'jobs', order:3, status:'live', config:{showFilters:true}},
  {id:'b4', type:'testimonial', order:4, status:'live', config:{videos:4}},
  {id:'b5', type:'culture', order:5, status:'draft', config:{photos:12}},
  {id:'b6', type:'faq', order:6, status:'live', config:{aiEnabled:true}},
]

const ANALYTICS = {visits_30d:12480, applications_30d:892, conversion_pct:7.1, avg_time_on_page:'2m 14s', mobile_pct:68}

const CTX = [
  {icon:'👁',label:'Preview Block',     key:'preview'},
  {icon:'✏',label:'Edit Block',          key:'edit'},
  {icon:'⬆',label:'Move Up',             key:'up'},
  {icon:'⬇',label:'Move Down',          key:'down'},
  {icon:'📊',label:'Block Analytics',   key:'analytics'},
  {icon:'🔗',label:'Impact Analysis',   key:'impact'},
  {icon:'🗑',label:'Remove Block',       key:'remove',danger:true},
]

export default function CareerPageBuilderPage() {
  const [blocks, setBlocks]     = useState(PAGE_BLOCKS)
  const [search, setSearch]     = useState('')
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]           = useState(null)
  const [dragId, setDragId]     = useState(null)

  const liveBlocks = blocks.filter(b=>b.status==='live').length

  const moveBlock = (id, dir) => {
    setBlocks(prev=>{
      const idx = prev.findIndex(b=>b.id===id)
      const newIdx = idx+dir
      if (newIdx<0||newIdx>=prev.length) return prev
      const copy = [...prev]
      ;[copy[idx],copy[newIdx]] = [copy[newIdx],copy[idx]]
      return copy.map((b,i)=>({...b,order:i+1}))
    })
  }

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🖥" title="Career Page Builder"
        breadcrumb="Employee Lifecycle > Recruitment > Employer Branding"
        gradient={G}
        stats={[
          {icon:'🖥',label:'Live Blocks',      value:liveBlocks},
          {icon:'👁',label:'Visits (30d)',     value:ANALYTICS.visits_30d.toLocaleString()},
          {icon:'📩',label:'Applications',     value:ANALYTICS.applications_30d},
          {icon:'📈',label:'Conversion',       value:ANALYTICS.conversion_pct+'%'},
        ]}
        onAdd={()=>setShowAddBlock(true)} addLabel="Add Block"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16}}>
        {/* Page builder (drag-drop blocks) */}
        <div>
          <div style={{fontSize:12,fontWeight:700,color:'#64748b',marginBottom:10}}>Page Structure - Drag to Reorder</div>
          <div style={{display:'grid',gap:8}}>
            {blocks.map((b,i)=>{
              const bt = BLOCK_TYPES.find(t=>t.id===b.type)
              return (
                <div key={b.id}
                  draggable
                  onDragStart={()=>setDragId(b.id)}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={e=>{e.preventDefault();if(dragId&&dragId!==b.id){const fromIdx=blocks.findIndex(x=>x.id===dragId);const toIdx=i;moveBlock(dragId,toIdx-fromIdx)}}}
                  onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:bt?.label,...b}})}}
                  style={{background:'#fff',border:`1.5px solid ${b.status==='live'?bt?.color+'33':'#e2e8f0'}`,
                    borderRadius:14,padding:'14px 16px',cursor:'grab',display:'flex',alignItems:'center',gap:14,
                    boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
                  <div style={{fontSize:14,color:'#cbd5e1',cursor:'grab'}}>⠿⠿</div>
                  <div style={{width:40,height:40,borderRadius:10,background:`${bt?.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{bt?.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:2}}>
                      <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{bt?.label}</span>
                      <span style={{background:b.status==='live'?'#f0fdf4':'#fffbeb',color:b.status==='live'?'#15803d':'#f59e0b',fontSize:9,fontWeight:700,padding:'1px 7px',borderRadius:20}}>{b.status}</span>
                    </div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{bt?.desc}</div>
                  </div>
                  <div style={{display:'flex',gap:4,flexShrink:0}}>
                    <button onClick={()=>moveBlock(b.id,-1)} style={{width:26,height:26,borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',cursor:'pointer',fontSize:10}}>↑</button>
                    <button onClick={()=>moveBlock(b.id,1)} style={{width:26,height:26,borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',cursor:'pointer',fontSize:10}}>↓</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Live preview panel */}
        <div>
          <div style={{fontSize:12,fontWeight:700,color:'#64748b',marginBottom:10}}>Mobile Preview</div>
          <div style={{background:'#0f172a',borderRadius:24,padding:'10px',boxShadow:'0 8px 30px rgba(0,0,0,.2)'}}>
            <div style={{background:'#fff',borderRadius:18,overflow:'hidden',height:480,overflowY:'auto'}}>
              {blocks.filter(b=>b.status==='live').map(b=>{
                const bt = BLOCK_TYPES?.find?.(t=>t.id===b.type) || {id:b.type,icon:'📄',label:b.type,color:'#0369a1'}
                return (
                  <div key={b.id} style={{padding:'16px 14px',borderBottom:'1px solid #f1f5f9',background:bt?.id==='hero'?`linear-gradient(135deg,${bt.color},${bt.color}cc)`:'#fff',color:bt?.id==='hero'?'#fff':'#0f172a'}}>
                    <div style={{fontSize:10,fontWeight:700,opacity:.7,marginBottom:4}}>{bt?.icon} {bt?.label}</div>
                    {bt?.id==='hero'&&<div style={{fontSize:14,fontWeight:900}}>{b.config?.headline}</div>}
                    {bt?.id==='jobs'&&<div style={{fontSize:10,color:'#64748b'}}>15 open positions . Filter by location</div>}
                    {bt?.id==='testimonial'&&<div style={{fontSize:10,color:'#64748b'}}>{b.config?.videos} video stories</div>}
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{marginTop:12,background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'12px 14px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginBottom:6}}>Page Analytics</div>
            {[['Avg Time on Page',ANALYTICS.avg_time_on_page],['Mobile Traffic',ANALYTICS.mobile_pct+'%'],['Conversion Rate',ANALYTICS.conversion_pct+'%']].map(([l,v],i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:10,padding:'4px 0',borderBottom:'1px solid #f8fafc'}}>
                <span style={{color:'#64748b'}}>{l}</span><span style={{fontWeight:700,color:A}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddBlock&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAddBlock(false)}>
          <div style={{background:'#fff',borderRadius:20,width:600,maxHeight:'85vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Add Page Block</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {BLOCK_TYPES.map(bt=>(
                  <div key={bt.id} onClick={()=>{setBlocks(p=>[...p,{id:'b'+Date.now(),type:bt.id,order:p.length+1,status:'draft',config:{}}]);setShowAddBlock(false)}}
                    style={{padding:'14px',borderRadius:12,border:`1.5px solid ${bt.color}33`,cursor:'pointer',display:'flex',gap:10,alignItems:'center'}}>
                    <span style={{fontSize:20}}>{bt.icon}</span>
                    <div><div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{bt.label}</div><div style={{fontSize:9,color:'#94a3b8'}}>{bt.desc}</div></div>
                  </div>
                ))}
              </div>
              <AIImpact color={A} lines={['Blocks pull live data from EVP, Testimonials, Culture, and Job Postings modules.','Mobile-first responsive by default.','One-click Apply integrates with Career Portal/ATS.','AI chatbot block answers candidate FAQs automatically.']}/>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={['Career Portal','EVP Management','Employee Testimonial','Culture Showcase']} actions={CTX} onAction={(k,item)=>{if(k==='up')moveBlock(item.id,-1);if(k==='down')moveBlock(item.id,1)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Career Page Blocks" columns={['Block Type','Order','Status','Config']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
