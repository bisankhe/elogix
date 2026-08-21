// FILE: RecruitmentCampaignPage.jsx - Recruitment Campaign
// Multi-channel, ROI tracking, A/B testing, source attribution

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fb923c 100%)'
const A = '#c2410c'

const CAMPAIGNS = [
  { id:'cm1', name:'Senior Tech Talent Q3', channels:['LinkedIn','Merojob','Google Ads'],
    budget_npr:80000, spent_npr:62000, status:'active', start:'2025-06-01', end:'2025-07-31',
    impressions:48200, clicks:2840, applications:142, hires:3, cost_per_hire:20667,
    target_roles:['Senior SW Dev','Cloud Architect'], ab_variant:'A',
    ai_score:88, ai_note:'Strong CTR (5.9%). LinkedIn driving 60% of quality applications.',
    impact_links:['Job Posting','Career Page','Social Media Branding'] },
  { id:'cm2', name:'Finance Leadership Drive', channels:['LinkedIn','Newspaper','Kumarijob'],
    budget_npr:50000, spent_npr:48500, status:'active', start:'2025-04-15', end:'2025-06-30',
    impressions:21400, clicks:980, applications:38, hires:1, cost_per_hire:48500,
    target_roles:['Finance Manager'], ab_variant:'B',
    ai_score:54, ai_note:'High cost-per-hire. Niche role - consider executive search agency instead.',
    impact_links:['Job Posting','Career Page'] },
  { id:'cm3', name:'Mass Hiring - Customer Service', channels:['Facebook','Merojob','JobsNepal'],
    budget_npr:35000, spent_npr:35000, status:'completed', start:'2025-05-01', end:'2025-06-01',
    impressions:67800, clicks:4120, applications:312, hires:8, cost_per_hire:4375,
    target_roles:['Customer Service Rep'], ab_variant:'A',
    ai_score:96, ai_note:'Excellent ROI. Facebook outperformed all other channels for volume roles.',
    impact_links:['Job Posting','Career Page','Social Media Branding'] },
  { id:'cm4', name:'Diversity Hiring Initiative', channels:['LinkedIn','Instagram'],
    budget_npr:60000, spent_npr:12000, status:'draft', start:'2025-07-01', end:'2025-08-31',
    impressions:0, clicks:0, applications:0, hires:0, cost_per_hire:0,
    target_roles:['All Departments'], ab_variant:'A',
    ai_score:0, ai_note:'Not yet launched. AI recommends targeting women-in-tech LinkedIn groups.',
    impact_links:['Social Media Branding','EVP Management'] },
]

const STATUS_CFG = {
  active:{c:'#10b981',bg:'#f0fdf4',icon:'🟢'}, draft:{c:'#94a3b8',bg:'#f8fafc',icon:'📝'},
  completed:{c:'#3b82f6',bg:'#eff6ff',icon:'✓'}, paused:{c:'#f59e0b',bg:'#fffbeb',icon:'⏸'},
const CTX = [
  {icon:'👁',label:'View Campaign',     key:'view'},
  {icon:'📊',label:'ROI Report',        key:'roi'},
  {icon:'🔬',label:'A/B Test Results',  key:'ab'},
  {icon:'⏸',label:'Pause Campaign',     key:'pause'},
  {icon:'🔗',label:'Impact Analysis',   key:'impact'},
  {icon:'📤',label:'Export',            key:'export'},
]

export default function RecruitmentCampaignPage() {
  const [campaigns, setCampaigns] = useState(CAMPAIGNS)

  const [form, setForm] = useState({})
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('all')
  const [showAdd, setShowAdd]     = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]             = useState(null)

  const filtered = campaigns.filter(c=>{
    if (filterStatus!=='all'&&c.status!==filterStatus) return false
    if (search&&!c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalSpend = campaigns.reduce((s,c)=>s+c.spent_npr,0)
  const totalHires = campaigns.reduce((s,c)=>s+c.hires,0)
  const avgCPH     = totalHires>0?Math.round(totalSpend/totalHires):0
  const activeCount = campaigns.filter(c=>c.status==='active').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📣" title="Recruitment Campaign"
        breadcrumb="Employee Lifecycle > Recruitment > Employer Branding"
        gradient={G}
        stats={[
          {icon:'🟢',label:'Active Campaigns', value:activeCount},
          {icon:'💰',label:'Total Spend',       value:'NPR '+(totalSpend/1000).toFixed(0)+'K'},
          {icon:'👤',label:'Total Hires',       value:totalHires},
          {icon:'📊',label:'Avg Cost/Hire',     value:'NPR '+(avgCPH/1000).toFixed(1)+'K'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Campaign"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#991b1b',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Compliance:</strong> Campaigns must demonstrate local-priority hiring before targeting foreign markets. No discrimination based on religion, caste, sex, or language in any creative/copy.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search campaigns..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','active','draft','completed'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(c=>{
          const sc = STATUS_CFG[c.status]||STATUS_CFG.draft
          const spendPct = Math.round(c.spent_npr/c.budget_npr*100)
          const ctr = c.impressions>0?(c.clicks/c.impressions*100).toFixed(1):0
          const convRate = c.clicks>0?(c.applications/c.clicks*100).toFixed(1):0
          return (
            <div key={c.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.name,...c}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>

              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{c.name}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {c.status}</span>
                    <span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>A/B Variant {c.ab_variant}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{c.target_roles.join(', ')} . {c.start} to {c.end}</div>
                  <div style={{display:'flex',gap:5,marginTop:5,flexWrap:'wrap'}}>
                    {c.channels.map((ch,i)=><span key={i} style={{background:'#f8fafc',color:'#475569',fontSize:9,padding:'2px 8px',borderRadius:20,border:'1px solid #e2e8f0'}}>{ch}</span>)}
                  </div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:c.ai_score>=80?'#10b981':c.ai_score>=50?'#f59e0b':'#ef4444'}}>{c.ai_score}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>AI SCORE</div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:0,padding:'12px 20px',borderBottom:'1px solid #f8fafc'}}>
                {[{l:'Impressions',v:c.impressions.toLocaleString(),c:'#3b82f6'},
                  {l:'Clicks',v:c.clicks.toLocaleString(),c:'#8b5cf6'},
                  {l:'CTR',v:ctr+'%',c:'#06b6d4'},
                  {l:'Applications',v:c.applications,c:'#f59e0b'},
                  {l:'Hires',v:c.hires,c:'#10b981'},
                  {l:'Cost/Hire',v:c.hires>0?'NPR '+(c.cost_per_hire/1000).toFixed(1)+'K':'-',c:A},
                ].map((s,i)=>(
                  <div key={i} style={{textAlign:'center'}}>
                    <div style={{fontSize:14,fontWeight:900,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                  </div>
                ))}
              </div>

              <div style={{padding:'10px 20px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:10}}>
                  <span style={{color:'#64748b'}}>Budget Utilization</span>
                  <span style={{fontWeight:700,color:spendPct>90?'#ef4444':A}}>NPR {(c.spent_npr/1000).toFixed(0)}K / {(c.budget_npr/1000).toFixed(0)}K ({spendPct}%)</span>
                </div>
                <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                  <div style={{width:`${spendPct}%`,height:'100%',background:spendPct>90?'#ef4444':`linear-gradient(90deg,${A},${A}88)`,borderRadius:8}}/>
                </div>
                <div style={{marginTop:6,fontSize:10,color:'#64748b',fontStyle:'italic'}}>🤖 {c.ai_note}</div>
              </div>
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Launch Recruitment Campaign</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Campaign Name</label><input type="text" value={form.campaign_name||''} onChange={e=>setForm(p=>({...p,campaign_name:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Target Roles</label><input type="text" value={form.target_roles||''} onChange={e=>setForm(p=>({...p,target_roles:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Budget (NPR)</label><input type="number" value={form.budget_npr||''} onChange={e=>setForm(p=>({...p,budget_npr:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>A/B Test Variant</label><select value={form.ab_test_variant||''} onChange={e=>setForm(p=>({...p,ab_test_variant:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['A','B'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Start Date</label><input type="date" value={form.start_date||''} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>End Date</label><input type="date" value={form.end_date||''} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
              </div>
              <AIImpact color={A} lines={['AI tracks source attribution automatically per applicant.','Cost-per-hire calculated in real-time as candidates progress.','A/B variants compared on CTR and conversion rate.','Auto-pauses if budget exceeded.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Launch Campaign</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Save Draft</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Recruitment Campaigns" columns={['Name','Channels','Budget NPR','Spent NPR','Status','Impressions','Clicks','Applications','Hires','Cost Per Hire']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
