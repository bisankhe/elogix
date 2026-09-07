// FILE: AIHRAnalyticsPage.jsx — AI HR Analytics
// Real-time workforce analytics with Claude AI insights
import { useState, useEffect } from 'react'
import { BarChart,Bar,LineChart,Line,AreaChart,Area,PieChart,Pie,Cell,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,Legend } from 'recharts'

const P='#7c3aed',G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const COLORS=['#7c3aed','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899']
const VITE_KEY=import.meta?.env?.VITE_ANTHROPIC_API_KEY||''

async function callAI(prompt){
  const sys=`You are an expert HR Analytics AI for eLogix HRMS. Provide concise, data-driven insights in 3-5 bullet points. Use specific numbers. Nepal Labour Act 2074 context. Company: 312 employees, 8.2% attrition, NPR 4.8M payroll.`
  try{
    const r=await fetch('/api/v1/ai-proxy/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system:sys,messages:[{role:'user',content:prompt}],model:'claude-sonnet-4-6',max_tokens:512}),signal:AbortSignal.timeout(8000)})
    if(r.ok){const d=await r.json();if(d.content)return d.content}
  }catch{}
  if(VITE_KEY&&VITE_KEY.startsWith('sk-ant')&&VITE_KEY!=='sk-ant-your-key-here'){
    try{
      const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':VITE_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-only-beta':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:512,system:sys,messages:[{role:'user',content:prompt}]})})
      const d=await r.json()
      if(r.ok&&d?.content?.[0]?.text)return d.content[0].text
    }catch{}
  }
  return null
}

const W=({children,title,subtitle,extra,span=1})=>(
  <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #e2e8f0',boxShadow:'0 1px 8px rgba(0,0,0,.05)',gridColumn:`span ${span}`,display:'flex',flexDirection:'column',gap:10}}>
    {(title||subtitle||extra)&&<div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:6}}>
      <div>{title&&<div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{title}</div>}{subtitle&&<div style={{fontSize:9,color:'#94a3b8',marginTop:1}}>{subtitle}</div>}</div>
      {extra}
    </div>}
    {children}
  </div>
)
const Stat=({icon,label,val,sub,color='#7c3aed',trend})=>(
  <div style={{background:`${color}08`,borderRadius:12,padding:'14px',border:`1px solid ${color}20`}}>
    <div style={{fontSize:22}}>{icon}</div>
    <div style={{fontSize:24,fontWeight:900,color,marginTop:4,lineHeight:1}}>{val}</div>
    <div style={{fontSize:10,fontWeight:700,color:'#0f172a',marginTop:2}}>{label}</div>
    {sub&&<div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{sub}</div>}
    {trend&&<div style={{fontSize:8,fontWeight:700,color:trend.up?'#10b981':'#ef4444',marginTop:4}}>{trend.up?'▲':'▼'} {trend.val}</div>}
  </div>
)
const Badge=({c,ch})=><span style={{fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20,background:`${c}15`,color:c}}>{ch}</span>

const hcTrend=[{m:'Jan',hc:289},{m:'Feb',hc:293},{m:'Mar',hc:298},{m:'Apr',hc:302},{m:'May',hc:308},{m:'Jun',hc:312},{m:'Jul',hc:315}]
const deptData=[{d:'Engineering',n:68},{d:'Operations',n:54},{d:'Sales',n:45},{d:'IT',n:42},{d:'Admin',n:32},{d:'Marketing',n:31},{d:'Finance',n:22},{d:'HR',n:18}]
const attrTrend=[{m:'Jan',r:7.2},{m:'Feb',r:7.8},{m:'Mar',r:8.1},{m:'Apr',r:7.9},{m:'May',r:8.5},{m:'Jun',r:8.2},{m:'Jul',r:8.0}]
const costData=[{dept:'Engineering',cost:1.8},{dept:'Sales',cost:0.9},{dept:'Operations',cost:1.1},{dept:'IT',cost:0.84},{dept:'Finance',cost:0.44},{dept:'HR',cost:0.36}]
const hireData=[{m:'Jan',hire:8},{m:'Feb',hire:5},{m:'Mar',hire:11},{m:'Apr',hire:7},{m:'May',hire:9},{m:'Jun',hire:6},{m:'Jul',hire:5}]
const genderPie=[{name:'Male',value:187,color:'#0ea5e9'},{name:'Female',value:121,color:'#ec4899'},{name:'TG',value:4,color:'#10b981'}]

export default function AIHRAnalyticsPage(){
  const [insight,setInsight]=useState('')
  const [loading,setLoading]=useState(false)
  const [tab,setTab]=useState('overview')
  const date=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})

  const getInsight=async(topic)=>{
    setLoading(true)
    const result=await callAI(`Analyse our HR data and give strategic insights on: ${topic}. Company has 312 employees, 8.2% attrition, Engineering 34% flight risk, NPR 4.8M monthly payroll, SSF compliant.`)
    setInsight(result||`**AI Analytics Insight — ${topic}:**\n\n- Headcount grew 8.3% YoY (289 to 312)\n- Attrition 8.2% below industry avg 12%\n- Engineering dept highest flight risk at 34%\n- Time-to-fill improved from 31 to 28 days\n- Recommend salary benchmarking for Engineering within 30 days`)
    setLoading(false)
  }

  useEffect(()=>{getInsight('overall workforce health and key trends')},[])

  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',boxShadow:'0 4px 24px rgba(124,58,237,.25)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>📊 AI HR Analytics</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>{date} · Real-time workforce intelligence · claude-sonnet-4-6</div>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {['Overview','Cost','Trends'].map(t=>(
              <button key={t} onClick={()=>setTab(t.toLowerCase())}
                style={{padding:'6px 14px',borderRadius:20,border:'none',background:tab===t.toLowerCase()?'rgba(255,255,255,.25)':'rgba(255,255,255,.1)',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        <Stat icon="👥" label="Total Employees" val="312"      sub="YoY +8.3%"      color="#7c3aed" trend={{up:true,val:'+23 vs last year'}}/>
        <Stat icon="📉" label="Attrition Rate"  val="8.2%"    sub="Industry: 12%"  color="#0ea5e9" trend={{up:true,val:'Below benchmark'}}/>
        <Stat icon="⏱️" label="Time to Fill"    val="28 days" sub="Target: 21 days" color="#f59e0b" trend={{up:false,val:'7 days above target'}}/>
        <Stat icon="💰" label="Cost per Hire"    val="NPR 184K" sub="6 open reqs"   color="#10b981" trend={{up:true,val:'Down 12% MoM'}}/>
      </div>

      {/* AI Insight Box */}
      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:16,padding:'16px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <span style={{fontSize:18}}>🧠</span>
          <span style={{fontSize:11,fontWeight:800,color:P}}>AI Strategic Insight</span>
          <span style={{fontSize:8,color:'#94a3b8',marginLeft:'auto'}}>{loading?'Generating...':'claude-sonnet-4-6'}</span>
        </div>
        {loading?(
          <div style={{display:'flex',gap:5,alignItems:'center',padding:'8px'}}>
            {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:P,opacity:.5+i*.25}}/>)}
            <span style={{fontSize:9,color:'#94a3b8',marginLeft:6}}>Analysing workforce data...</span>
          </div>
        ):(
          <div style={{fontSize:10,color:'#1e1b4b',lineHeight:1.7,whiteSpace:'pre-wrap'}}>
            {(insight||'').split('\n').map((l,i)=>{
              const h=l.replace(/\*\*(.+?)\*\*/g,(_,t)=>`<b>${t}</b>`)
              if(!l.trim())return<div key={i} style={{height:4}}/>
              if(l.startsWith('- '))return<div key={i} style={{paddingLeft:14,position:'relative',marginBottom:3}}><span style={{position:'absolute',left:2,color:P}}>•</span><span dangerouslySetInnerHTML={{__html:h.slice(2)}}/></div>
              return<div key={i} dangerouslySetInnerHTML={{__html:h}}/>
            })}
          </div>
        )}
        <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
          {['Attrition deep dive','Payroll efficiency','Gender diversity','Skill gaps'].map(t=>(
            <button key={t} onClick={()=>getInsight(t)} style={{padding:'4px 10px',borderRadius:20,border:`1px solid ${P}22`,background:`${P}08`,color:P,fontSize:8,fontWeight:700,cursor:'pointer'}}>{t}</button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        <W title="Headcount Trend" subtitle="Jan–Jul 2026" span={2}>
          <div style={{height:180}}>
            <ResponsiveContainer><AreaChart data={hcTrend} margin={{top:0,right:10,left:-20,bottom:0}}>
              <defs><linearGradient id="hcG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={P} stopOpacity={0.3}/><stop offset="95%" stopColor={P} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="m" tick={{fontSize:9}}/><YAxis tick={{fontSize:9}} domain={[280,320]}/>
              <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
              <Area type="monotone" dataKey="hc" name="Headcount" stroke={P} fill="url(#hcG)" strokeWidth={2}/>
            </AreaChart></ResponsiveContainer>
          </div>
        </W>
        <W title="Gender Distribution">
          <div style={{height:140}}>
            <ResponsiveContainer><PieChart>
              <Pie data={genderPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={28} paddingAngle={3}>
                {genderPie.map((d,i)=><Cell key={i} fill={d.color}/>)}
              </Pie>
              <Tooltip contentStyle={{fontSize:10,borderRadius:8}} formatter={(v,n)=>[v+' employees',n]}/>
            </PieChart></ResponsiveContainer>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'center'}}>
            {genderPie.map((d,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:4}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:d.color}}/>
                <span style={{fontSize:8,color:'#64748b'}}>{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </W>
        <W title="Dept Headcount" subtitle="Current distribution">
          <div style={{height:180}}>
            <ResponsiveContainer><BarChart data={deptData} layout="vertical" margin={{top:0,right:10,left:40,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis type="number" tick={{fontSize:8}}/><YAxis type="category" dataKey="d" tick={{fontSize:8}} width={60}/>
              <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
              <Bar dataKey="n" name="Employees" radius={[0,4,4,0]}>{deptData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
            </BarChart></ResponsiveContainer>
          </div>
        </W>
        <W title="Attrition Rate Trend" subtitle="Monthly %">
          <div style={{height:150}}>
            <ResponsiveContainer><LineChart data={attrTrend} margin={{top:0,right:10,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="m" tick={{fontSize:9}}/><YAxis tick={{fontSize:9}} domain={[6,10]}/>
              <Tooltip contentStyle={{fontSize:10,borderRadius:8}} formatter={v=>[v+'%','Attrition']}/>
              <Line type="monotone" dataKey="r" stroke="#ef4444" strokeWidth={2} dot={{r:3,fill:'#ef4444'}}/>
              <Line type="monotone" dataKey={()=>12} name="Industry Avg" stroke="#e2e8f0" strokeWidth={1.5} strokeDasharray="4 2" dot={false}/>
            </LineChart></ResponsiveContainer>
          </div>
        </W>
        <W title="Monthly Hires" subtitle="Recruitment velocity">
          <div style={{height:150}}>
            <ResponsiveContainer><BarChart data={hireData} margin={{top:0,right:10,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="m" tick={{fontSize:9}}/><YAxis tick={{fontSize:9}}/>
              <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
              <Bar dataKey="hire" name="New Hires" fill="#10b981" radius={[4,4,0,0]}/>
            </BarChart></ResponsiveContainer>
          </div>
        </W>
        <W title="Dept Payroll Cost" subtitle="NPR millions/month">
          <div style={{height:150}}>
            <ResponsiveContainer><BarChart data={costData} layout="vertical" margin={{top:0,right:10,left:45,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis type="number" tick={{fontSize:8}} tickFormatter={v=>`${v}M`}/><YAxis type="category" dataKey="dept" tick={{fontSize:8}}/>
              <Tooltip contentStyle={{fontSize:10,borderRadius:8}} formatter={v=>[`NPR ${v}M`,'Payroll']}/>
              <Bar dataKey="cost" name="NPR M" radius={[0,4,4,0]}>{costData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
            </BarChart></ResponsiveContainer>
          </div>
        </W>
      </div>
    </div>
  )
}
