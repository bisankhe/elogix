// FILE: EVPManagementPage.jsx - Employee Value Proposition (EVP) Management
// "Give vs Get" pillars, retention-data-backed messaging, Nepal equal pay compliance

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#3b0764 0%,#7e22ce 60%,#c084fc 100%)'
const A = '#7e22ce'

const EVP_PILLARS = [
  { id:'p1', name:'Total Rewards', nepali:'समग्र पुरस्कार', icon:'💰', color:'#10b981',
    weight:30, employee_rating:4.3, market_benchmark:4.0,
    data_sources:['Salary Survey 2025','Retention Exit Interviews','Pulse Survey Q2'],
    status:'strong', last_updated:'2025-06-01',
    impact_links:['Career Page','Recruitment Campaign','Job Posting'] },
  { id:'p2', name:'Career Growth', nepali:'क्यारियर विकास', icon:'📈', color:'#3b82f6',
    weight:25, employee_rating:3.8, market_benchmark:4.1,
    data_sources:['Performance Review Data','L&D Completion Rates','Internal Mobility Stats'],
    status:'needs_work', last_updated:'2025-05-28',
    impact_links:['Career Page','Culture Showcase'] },
  { id:'p3', name:'Culture & Belonging', nepali:'संस्कृति र अपनत्व', icon:'🤝', color:'#f59e0b',
    weight:20, employee_rating:4.5, market_benchmark:3.9,
    data_sources:['Engagement Survey','eNPS Score','DEI Metrics'],
    status:'strong', last_updated:'2025-06-10',
    impact_links:['Culture Showcase','Employee Testimonial','Social Media Branding'] },
  { id:'p4', name:'Purpose & Impact', nepali:'उद्देश्य र प्रभाव', icon:'🎯', color:'#8b5cf6',
    weight:15, employee_rating:4.0, market_benchmark:3.7,
    data_sources:['Mission Alignment Survey','CSR Participation'],
    status:'strong', last_updated:'2025-05-15',
    impact_links:['Culture Showcase','Social Media Branding'] },
  { id:'p5', name:'Workplace Flexibility', nepali:'कार्यस्थल लचिलोपन', icon:'🏠', color:'#06b6d4',
    weight:10, employee_rating:3.5, market_benchmark:4.3,
    data_sources:['Remote Work Survey','Attrition Exit Data'],
    status:'critical', last_updated:'2025-06-05',
    impact_links:['Career Page','Recruitment Campaign'] },
]

const STATUS_CFG = {
  strong:     {c:'#10b981', bg:'#f0fdf4', label:'Strong - Above Market'},
  needs_work: {c:'#f59e0b', bg:'#fffbeb', label:'Needs Improvement'},
  critical:   {c:'#ef4444', bg:'#fef2f2', label:'Critical Gap'},

const CTX = [
  {icon:'👁',label:'View Full Pillar',      key:'view'},
  {icon:'✏',label:'Edit Messaging',          key:'edit'},
  {icon:'📊',label:'View Source Data',       key:'data'},
  {icon:'🔗',label:'Push to Career Page',    key:'push'},
  {icon:'🤖',label:'AI Messaging Suggestion',key:'ai'},
  {icon:'🔗',label:'Impact Analysis',        key:'impact'},
  {icon:'📤',label:'Export',                 key:'export'},
]

export default function EVPManagementPage() {
  const [pillars, setPillars]   = useState(EVP_PILLARS)
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]           = useState(null)
  const [aiMsg, setAiMsg]       = useState('')
  const [generating, setGenerating] = useState(false)

  const filtered = pillars.filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase()))

  const overallEVP = +(pillars.reduce((s,p)=>s+p.employee_rating*p.weight,0)/100).toFixed(2)
  const aboveMarket = pillars.filter(p=>p.employee_rating>=p.market_benchmark).length
  const criticalGaps = pillars.filter(p=>p.status==='critical').length

  const generateAI = (pillar) => {
    setGenerating(true)
    setTimeout(()=>{
      setAiMsg(`"At eLogix HRMS, ${pillar.name.toLowerCase()} isn't just a policy - it's backed by data. ${pillar.employee_rating}/5 employee satisfaction, validated through our latest pulse survey. ${pillar.description} This is the ${pillar.name.toLowerCase()} we live, not just promise."`)
      setGenerating(false)
    },1200)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💎" title="Employee Value Proposition (EVP) Management"
        breadcrumb="Employee Lifecycle > Recruitment > Employer Branding"
        gradient={G}
        stats={[
          {icon:'💎',label:'Overall EVP Score', value:overallEVP+'/5.0'},
          {icon:'📈',label:'Above Market',       value:aboveMarket+'/'+pillars.length},
          {icon:'⚠',label:'Critical Gaps',      value:criticalGaps},
          {icon:'📅',label:'Last Refresh',       value:'Jun 2025'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add Pillar"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#fdf4ff,#f5f3ff)',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#6b21a8'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Compliance:</strong> EVP messaging must reflect equal pay for equal value (Labour Act 2074 Section 7). Claims on career page/social media are subject to Consumer Protection Act - avoid over-promising vs. actual employment contract terms.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search EVP pillars..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:16,marginTop:14}}>
        {filtered.map(p=>{
          const sc = STATUS_CFG[p.status]||STATUS_CFG.needs_work
          const gap = +(p.employee_rating - p.market_benchmark).toFixed(1)
          return (
            <LuxCard key={p.id} color={p.color} onClick={()=>setSelected(p)}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.name,...p}})}}>
              <div style={{padding:'16px 16px 10px',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:50,height:50,borderRadius:14,background:`${p.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{p.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{p.name}</div>
                  <div style={{fontSize:10,color:'#94a3b8',fontStyle:'italic',marginBottom:4}}>{p.nepali}</div>
                  <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:20,fontWeight:900,color:p.color}}>{p.employee_rating}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>/5 RATING</div>
                </div>
              </div>

              {/* Employee rating vs market benchmark bar */}
              <div style={{padding:'0 16px 10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:10}}>
                  <span style={{color:'#64748b'}}>vs Market Benchmark ({p.market_benchmark})</span>
                  <span style={{fontWeight:800,color:gap>=0?'#10b981':'#ef4444'}}>{gap>=0?'+':''}{gap}</span>
                </div>
                <div style={{position:'relative',height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                  <div style={{position:'absolute',left:`${p.market_benchmark/5*100}%`,width:2,height:'100%',background:'#94a3b8',zIndex:2}}/>
                  <div style={{width:`${p.employee_rating/5*100}%`,height:'100%',background:`linear-gradient(90deg,${p.color},${p.color}88)`,borderRadius:8}}/>
                </div>
              </div>

              <div style={{padding:'0 16px 10px',fontSize:10,color:'#64748b',lineHeight:1.5}}>{p.description}</div>

              <div style={{padding:'0 16px 10px',display:'flex',gap:4,flexWrap:'wrap'}}>
                {p.data_sources.map((d,i)=><span key={i} style={{background:'#f8fafc',color:'#475569',fontSize:9,padding:'2px 7px',borderRadius:20,border:'1px solid #e2e8f0'}}>📊 {d}</span>)}
              </div>

              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                <button onClick={ev=>{ev.stopPropagation();generateAI(p);setSelected(p)}} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:`${p.color}12`,color:p.color,fontSize:10,fontWeight:700,cursor:'pointer'}}>AI Messaging</button>
                <button onClick={ev=>ev.stopPropagation()} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,cursor:'pointer'}}>Push to Career Page</button>
              </div>
            </LuxCard>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Add EVP Pillar</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Pillar Name" value="" onChange={()=>{}} required accent={A}/>
                <Field label="Weight (%)" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Employee Rating (1-5)" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Market Benchmark (1-5)" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Data Source" value="" onChange={()=>{}} accent={A} hint="e.g. Pulse Survey Q2"/>
              </div>
              <Field label="Description" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              <AIImpact color={A} lines={['EVP messaging auto-syncs to Career Page and Job Postings.','Data sourced from real retention/engagement metrics - not marketing copy.','Nepal Section 7: claims must reflect actual equal-pay practice.','AI generates authentic messaging variants from this data.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Add Pillar</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="EVP Pillars" columns={['Pillar','Weight %','Employee Rating','Market Benchmark','Status','Data Sources','Last Updated']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>{setSelected(null);setAiMsg('')}} rows={[
        ['Pillar',selected?.name],['Nepali',selected?.nepali],['Weight',selected?.weight+'%'],
        ['Employee Rating',selected?.employee_rating+'/5'],['Market Benchmark',selected?.market_benchmark+'/5'],
        ['Status',selected?.status],['Description',selected?.description],
        ['Data Sources',selected?.data_sources?.join(', ')],['Last Updated',selected?.last_updated],
        ...(aiMsg?[['AI Generated Message',generating?'Generating...':aiMsg]]:[]),
      ]}/>
    </div>
  )
