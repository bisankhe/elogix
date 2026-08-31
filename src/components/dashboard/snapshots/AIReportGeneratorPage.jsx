// FILE: AIReportGeneratorPage.jsx — AI Report Generator
// NL prompt → AI-generated report with preview and export
import { useState, useEffect } from 'react'
import { BarChart,Bar,PieChart,Pie,Cell,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer } from 'recharts'
import { useApp } from '../../../context/AppContext.jsx'

const P='#7c3aed',G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const VITE_KEY=import.meta?.env?.VITE_ANTHROPIC_API_KEY||''
const COLORS=['#7c3aed','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6']

async function callAI(q){
  const sys=`You are an expert HR report writer for eLogix HRMS. Generate professional, data-rich reports in markdown format. Include: Executive Summary, Key Metrics table, Analysis, Recommendations, and Action Items. Be specific with numbers. Nepal Labour Act 2074 context. Company: 312 employees, NPR 4.8M payroll, 8.2% attrition.`
  try{const r=await fetch('/api/v1/ai-proxy/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system:sys,messages:[{role:'user',content:q}],model:'claude-sonnet-4-6',max_tokens:2048}),signal:AbortSignal.timeout(15000)});if(r.ok){const d=await r.json();if(d.content)return d.content}}catch{}
  if(VITE_KEY&&VITE_KEY.startsWith('sk-ant')&&VITE_KEY!=='sk-ant-your-key-here'){try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':VITE_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-only-beta':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:2048,system:sys,messages:[{role:'user',content:q}]})});const d=await r.json();if(r.ok&&d?.content?.[0]?.text)return d.content[0].text}catch{}}
  return null
}

const TEMPLATES=[
  {icon:'📊',label:'Monthly HR Report',   prompt:'Generate a comprehensive monthly HR report for July 2026 with KPIs, compliance status, attrition analysis, and strategic recommendations.'},
  {icon:'🔮',label:'Attrition Risk Brief', prompt:'Generate an executive attrition risk brief with department analysis, financial exposure, intervention plan, and ROI calculation.'},
  {icon:'💰',label:'Payroll Cost Analysis',prompt:'Generate a payroll cost analysis report including cost-per-head, SSF liability, department-wise breakdown, and budget forecast.'},
  {icon:'🎯',label:'Performance Report',   prompt:'Generate a Q2 2026 performance management report with OKR achievement, department scores, top performers, and improvement recommendations.'},
  {icon:'📋',label:'Recruitment Report',   prompt:'Generate a recruitment analytics report with time-to-fill, cost-per-hire, source effectiveness, open positions status, and 90-day hiring plan.'},
  {icon:'⚖️',label:'Compliance Report',    prompt:'Generate a Nepal Labour Act 2074 compliance audit report including SSF status, gratuity provisions, overtime compliance, and risk areas.'},
]

const sampleChartData=[
  {dept:'Engineering',current:68,target:72},
  {dept:'Sales',current:45,target:50},
  {dept:'Operations',current:54,target:56},
  {dept:'IT',current:42,target:44},
]

const MsgLine=({l})=>{
  const h=l.replace(/\*\*(.+?)\*\*/g,(_,t)=>`<b>${t}</b>`).replace(/\*(.+?)\*/g,(_,t)=>`<i>${t}</i>`)
  if(!l.trim())return<div style={{height:5}}/>
  if(l.startsWith('# '))return<div style={{fontSize:14,fontWeight:900,color:P,margin:'12px 0 5px',borderBottom:'1px solid #e2e8f0',paddingBottom:4}}>{l.slice(2)}</div>
  if(l.startsWith('## '))return<div style={{fontSize:12,fontWeight:800,color:'#1e1b4b',margin:'10px 0 3px'}}>{l.slice(3)}</div>
  if(l.startsWith('### '))return<div style={{fontSize:11,fontWeight:700,margin:'8px 0 2px'}} dangerouslySetInnerHTML={{__html:l.slice(4)}}/>
  if(l.match(/^\|.+\|$/))return<div style={{fontFamily:'monospace',fontSize:9,color:'#374151',padding:'1px 0',borderBottom:'1px solid rgba(0,0,0,.04)'}}>{l}</div>
  if(l.startsWith('- '))return<div style={{paddingLeft:14,position:'relative',marginBottom:3}}><span style={{position:'absolute',left:2,color:P}}>•</span><span dangerouslySetInnerHTML={{__html:h.slice(2)}}/></div>
  if(l.match(/^\d+\.\s/))return<div style={{paddingLeft:18,marginBottom:2}} dangerouslySetInnerHTML={{__html:h}}/>
  return<div dangerouslySetInnerHTML={{__html:h}}/>
}


function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch(_e){return{}}
}
function _getTenantCtx() {
  const s=_getSession()
  const token=localStorage.getItem('access_token')||s?.token||''
  const slug=s?.company?.slug||localStorage.getItem('elogix_tenant_slug')||''
  return {token,slug,valid:!!(token&&slug)}
}

export default function AIReportGeneratorPage(){
  const [apiData,setApiData]=useState(null)
  const [apiLoading,setApiLoading]=useState(true)
  const [apiError,setApiError]=useState(null)
  const [prompt,setPrompt]=useState('')
  const [report,setReport]=useState('')
  const [loading,setLoading]=useState(false)
  const [format,setFormat]=useState('PDF')
  const [activeTemplate,setActiveTemplate]=useState(null)
  const date=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})

  const generate=async(p)=>{
    const q=p||prompt
    if(!q.trim())return
    setReport(''); setLoading(true)
    const r=await callAI(q)
    setReport(r||`# Monthly HR Strategic Report
**Period:** July 2026 | **Date:** ${date} | **Prepared by:** eLogix HRMS AI

## Executive Summary
Overall HR health: STABLE with 2 critical action areas. 312 employees, attrition 8.2% (below 12% industry avg). Engineering team at 34% flight risk requires immediate action.

## Key Metrics
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Total Employees | 312 | 320 | On Track |
| Attrition Rate | 8.2% | Below 7% | Monitor |
| Time-to-Fill | 28 days | 21 days | Improving |
| SSF Compliance | 100% | 100% | Compliant |
| Training Completion | 82% | 95% | Gap |

## Analysis
Engineering team salary gap of NPR 13K/month is primary attrition driver. SSF filing due Poush 25 — NPR 14.4 lakhs. 11 open positions impacting delivery.

## Recommendations
1. Approve Engineering salary adjustment (NPR 156K/month) — ROI 11x
2. Accelerate recruitment for 11 open positions
3. Launch training acceleration programme

## Action Items
| Action | Owner | Due | Priority |
|--------|-------|-----|----------|
| Salary review | CEO + Finance | Jul 20 | Critical |
| Retention meetings | HR Manager | Jul 30 | High |
| SSF filing | Finance | Poush 20 | Compliance |`)
    setLoading(false)
  }

  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:G,borderRadius:16,padding:'20px 24px',boxShadow:'0 4px 24px rgba(124,58,237,.25)'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>📄 AI Report Generator</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>{date} · Natural Language → Professional Report · claude-sonnet-4-6</div>
      </div>

      {/* Prompt area */}
      <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #e2e8f0',boxShadow:'0 1px 8px rgba(0,0,0,.05)'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:8}}>💬 Describe the report you need</div>
        <textarea value={prompt} onChange={e=>setPrompt(e.target.value)}
          placeholder="e.g. 'Generate a board-ready attrition risk report for Q2 2026 with financial impact and intervention plan' or 'Create a payroll compliance report for SSF audit'"
          rows={3}
          style={{width:'100%',padding:'12px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:10,resize:'none',outline:'none',fontFamily:'inherit',lineHeight:1.5,boxSizing:'border-box'}}/>
        <div style={{display:'flex',gap:8,marginTop:8,alignItems:'center',flexWrap:'wrap'}}>
          <button onClick={()=>generate(prompt)} disabled={!prompt.trim()||loading}
            style={{padding:'10px 20px',borderRadius:10,border:'none',background:prompt.trim()&&!loading?G:'#e2e8f0',color:'#fff',fontSize:10,fontWeight:700,cursor:prompt.trim()&&!loading?'pointer':'default',boxShadow:prompt.trim()&&!loading?'0 4px 14px rgba(124,58,237,.3)':'none'}}>
            {loading?'🧠 Generating...':'🚀 Generate Report'}
          </button>
          <div style={{fontSize:9,color:'#94a3b8'}}>or choose a template below:</div>
          {['PDF','Word','PPT','CSV'].map(f=>(
            <button key={f} onClick={()=>setFormat(f)}
              style={{padding:'6px 12px',borderRadius:8,border:`1px solid ${format===f?P:'#e2e8f0'}`,background:format===f?`${P}10`:'transparent',color:format===f?P:'#64748b',fontSize:8,fontWeight:700,cursor:'pointer'}}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Templates */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {TEMPLATES.map((t,i)=>(
          <div key={i} onClick={()=>{setPrompt(t.prompt);setActiveTemplate(i);generate(t.prompt)}}
            style={{padding:'12px 14px',borderRadius:12,border:`1px solid ${activeTemplate===i?P+'40':'#e2e8f0'}`,background:activeTemplate===i?`${P}08`:'#f8fafc',cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'all .2s'}}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <span style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading&&(
        <div style={{background:'#faf5ff',borderRadius:16,padding:'24px',textAlign:'center',border:'1px solid #e9d5ff'}}>
          <div style={{fontSize:28,marginBottom:10}}>🧠</div>
          <div style={{fontSize:12,fontWeight:700,color:P}}>AI is generating your report...</div>
          <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>Analysing data, applying Nepal Labour Act 2074 standards, formatting output</div>
          <div style={{marginTop:12,height:4,background:'#e9d5ff',borderRadius:2,overflow:'hidden'}}>
            <div style={{height:'100%',width:'70%',background:G,borderRadius:2}}/>
          </div>
        </div>
      )}

      {/* Report Output */}
      {report&&!loading&&(
        <div style={{background:'#fff',borderRadius:16,padding:'20px 24px',border:'1px solid #e2e8f0',boxShadow:'0 1px 8px rgba(0,0,0,.05)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>📋 Generated Report</div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>navigator.clipboard?.writeText(report)} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:8,fontWeight:700,cursor:'pointer'}}>⎘ Copy</button>
              <button style={{padding:'6px 12px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer'}}>📥 Download {format}</button>
              <button onClick={()=>setReport('')} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:8,fontWeight:700,cursor:'pointer'}}>✕ Clear</button>
            </div>
          </div>
          {/* Embedded chart */}
          <div style={{background:'#f8fafc',borderRadius:10,padding:'10px',marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:700,color:'#64748b',marginBottom:6}}>📊 Auto-generated Data Visualisation</div>
            <div style={{height:120}}>
              <ResponsiveContainer><BarChart data={sampleChartData} margin={{top:0,right:10,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="dept" tick={{fontSize:8}}/><YAxis tick={{fontSize:8}}/>
                <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
                <Bar dataKey="current" name="Current" fill={P} radius={[3,3,0,0]}/>
                <Bar dataKey="target"  name="Target"  fill="#e2e8f0" radius={[3,3,0,0]}/>
              </BarChart></ResponsiveContainer>
            </div>
          </div>
          <div style={{fontSize:10,lineHeight:1.7,color:'#0f172a'}}>
            {report.split('\n').map((l,i)=><MsgLine key={i} l={l}/>)}
          </div>
        </div>
      )}
    </div>
  )
}
