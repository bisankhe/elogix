// FILE: AIPerformanceInsightsPage.jsx
import { useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts'
import { useApp } from '../../../context/AppContext.jsx'
const P='#7c3aed',G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const COLORS=['#7c3aed','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6']
const W=({children,title,subtitle,span=1})=>(
  <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #e2e8f0',boxShadow:'0 1px 8px rgba(0,0,0,.05)',gridColumn:`span ${span}`,display:'flex',flexDirection:'column',gap:10}}>
    {(title||subtitle)&&<div>{title&&<div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{title}</div>}{subtitle&&<div style={{fontSize:9,color:'#94a3b8',marginTop:1}}>{subtitle}</div>}</div>}
    {children}
  </div>
)
const radarData=[{s:'KPI',val:78,bench:75},{s:'OKR',val:63,bench:80},{s:'Attendance',val:94,bench:90},{s:'Learning',val:82,bench:85},{s:'Teamwork',val:88,bench:80},{s:'Innovation',val:71,bench:75}]
const deptPerf=[{d:'HR',score:88},{d:'Finance',score:84},{d:'IT',score:81},{d:'Engineering',score:76},{d:'Operations',score:74},{d:'Sales',score:71},{d:'Marketing',score:68}]
const trend=[{m:'Jan',score:71},{m:'Feb',score:73},{m:'Mar',score:72},{m:'Apr',score:75},{m:'May',score:77},{m:'Jun',score:76},{m:'Jul',score:78}]
const topPerformers=[
  {name:'Anita Sharma',dept:'HR',score:96,badge:'Star'},
  {name:'Rajesh Thapa',dept:'Finance',score:94,badge:'High'},
  {name:'Sunita KC',dept:'IT',score:91,badge:'High'},
  {name:'Bikash Rai',dept:'Engineering',score:89,badge:'Good'},
]
const insights=[
  {icon:'🔴',text:'37% of employees at risk of missing Q3 OKRs. Recommend mid-quarter check-ins.'},
  {icon:'🟢',text:'HR department leads with 88% avg score. Recommend sharing best practices with other depts.'},
  {icon:'🟡',text:'Learning completion 82% vs 95% target. 3 mandatory certifications expiring in 30 days.'},
  {icon:'🔵',text:'Correlation found: employees with monthly 1:1s score 23% higher. Recommend manager training.'},
]
export default function AIPerformanceInsightsPage(){
  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:G,borderRadius:16,padding:'18px 22px'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>AI Performance Insights</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>OKR · KPI · KRA · 360 Feedback · Predictive performance AI</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {[{label:'Avg Score',val:'78/100',icon:'📊',color:'#7c3aed'},{label:'OKR Hit Rate',val:'63%',icon:'🎯',color:'#0ea5e9'},{label:'Top Performers',val:'28',icon:'🌟',color:'#10b981'},{label:'PIP Active',val:'5',icon:'⚠️',color:'#ef4444'}].map((s,i)=>(
          <div key={i} style={{background:`${s.color}08`,borderRadius:12,padding:'14px',border:`1px solid ${s.color}20`,textAlign:'center'}}>
            <div style={{fontSize:20}}>{s.icon}</div>
            <div style={{fontSize:20,fontWeight:900,color:s.color,marginTop:4}}>{s.val}</div>
            <div style={{fontSize:9,color:'#64748b'}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        <W title="Competency Radar" subtitle="Score vs Benchmark">
          <div style={{height:170}}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0"/><PolarAngleAxis dataKey="s" tick={{fontSize:8}}/>
                <Radar name="Score" dataKey="val" stroke={P} fill={P} fillOpacity={0.2} strokeWidth={2}/>
                <Radar name="Benchmark" dataKey="bench" stroke="#f59e0b" fill="none" strokeWidth={1.5} strokeDasharray="4 2"/>
                <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </W>
        <W title="Dept Performance Scores" subtitle="Average this quarter">
          <div style={{height:170}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptPerf} layout="vertical" margin={{top:0,right:30,left:35,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis type="number" domain={[60,100]} tick={{fontSize:8}}/><YAxis type="category" dataKey="d" tick={{fontSize:9}}/>
                <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
                <Bar dataKey="score" radius={[0,4,4,0]}>{deptPerf.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </W>
        <W title="Score Trend" subtitle="Monthly avg performance">
          <div style={{height:170}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{top:0,right:10,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="m" tick={{fontSize:9}}/><YAxis tick={{fontSize:8}} domain={[65,85]}/>
                <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
                <Line type="monotone" dataKey="score" stroke={P} strokeWidth={2} dot={{r:3}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </W>
        <W title="Top Performers" subtitle="This quarter" span={2}>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {topPerformers.map((e,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px',background:'#f8fafc',borderRadius:10}}>
                <div style={{width:34,height:34,borderRadius:10,background:G,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:900,flexShrink:0}}>{e.name[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{e.name}</div>
                  <div style={{fontSize:8,color:'#94a3b8'}}>{e.dept}</div>
                </div>
                <div style={{fontSize:14,fontWeight:900,color:P}}>{e.score}</div>
                <span style={{fontSize:7,padding:'2px 8px',borderRadius:20,background:`${P}10`,color:P,fontWeight:700}}>{e.badge}</span>
              </div>
            ))}
          </div>
        </W>
        <W title="AI Insights">
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {insights.map((ins,i)=>(
              <div key={i} style={{display:'flex',gap:8,padding:'8px 10px',background:'#f8fafc',borderRadius:9,fontSize:9,lineHeight:1.5}}>
                <span style={{flexShrink:0}}>{ins.icon}</span><span style={{color:'#0f172a'}}>{ins.text}</span>
              </div>
            ))}
          </div>
        </W>
      </div>
    </div>
  )
}
