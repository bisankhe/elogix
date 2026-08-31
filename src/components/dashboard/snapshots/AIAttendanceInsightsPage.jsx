// FILE: AIAttendanceInsightsPage.jsx — AI Attendance Insights
import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useApp } from '../../../context/AppContext.jsx'

const P='#7c3aed',G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const COLORS=['#7c3aed','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6']
const W=({children,title,subtitle,span=1})=>(
  <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #e2e8f0',boxShadow:'0 1px 8px rgba(0,0,0,.05)',gridColumn:`span ${span}`,display:'flex',flexDirection:'column',gap:10}}>
    {(title||subtitle)&&<div>{title&&<div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{title}</div>}{subtitle&&<div style={{fontSize:9,color:'#94a3b8',marginTop:1}}>{subtitle}</div>}</div>}
    {children}
  </div>
)

const trend=[{m:'Jan',pct:92.1},{m:'Feb',pct:93.4},{m:'Mar',pct:91.8},{m:'Apr',pct:94.0},{m:'May',pct:93.7},{m:'Jun',pct:94.1},{m:'Jul',pct:94.3}]
const deptAtt=[{d:'HR',pct:97},{d:'Finance',pct:96},{d:'IT',pct:95},{d:'Ops',pct:93},{d:'Eng',pct:92},{d:'Sales',pct:90},{d:'Marketing',pct:91}]
const lateData=[{d:'Mon',late:8},{d:'Tue',late:5},{d:'Wed',late:6},{d:'Thu',late:4},{d:'Fri',late:12}]
const otData=[{dept:'Engineering',hrs:6.2},{dept:'Operations',hrs:4.8},{dept:'Sales',hrs:3.1},{dept:'IT',hrs:2.4},{dept:'Finance',hrs:1.2}]
const aiAlerts=[
  {icon:'🔴',msg:'Friday late arrivals 3x higher than Monday — possible commute/burnout pattern. Recommend flexible Friday start.',severity:'high'},
  {icon:'🟠',msg:'Engineering OT at 6.2 hrs/week — above Labour Act limit of 4 hrs/day. Risk of non-compliance.',severity:'med'},
  {icon:'🟡',msg:'Sales team Monday absenteeism up 40% last 3 weeks. Recommend manager 1:1.',severity:'med'},
  {icon:'🟢',msg:'HR department 97% attendance — highest in company. Recommend as best practice benchmark.',severity:'good'},
  {icon:'🔵',msg:'Predicted: 14-18% attendance dip next week due to upcoming public holiday cluster.',severity:'info'},
]


function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch(_e){return{}}
}
function _getTenantCtx() {
  const s=_getSession()
  const token=localStorage.getItem('access_token')||s?.token||''
  const slug=s?.company?.slug||localStorage.getItem('elogix_tenant_slug')||''
  return {token,slug,valid:!!(token&&slug)}
}

export default function AIAttendanceInsightsPage(){
  const [apiData,setApiData]=useState(null)
  const [apiLoading,setApiLoading]=useState(true)
  const [apiError,setApiError]=useState(null)
  const [msg, setMsg] = useState('')
  const notify = (m) => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const today=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})
  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:G,borderRadius:16,padding:'18px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>AI Attendance Insights</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>Real-time analytics + predictive patterns · {today}</div>
        </div>
        <div style={{display:'flex',gap:12}}>
          {[{label:'Present',val:'294',color:'#4ade80'},{label:'Absent',val:'12',color:'#fbbf24'},{label:'On Leave',val:'6',color:'#94a3b8'}].map((s,i)=>(
            <div key={i} style={{textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:900,color:s.color}}>{s.val}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,.6)'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        <W title="Attendance Rate Trend" subtitle="Monthly %" span={2}>
          <div style={{height:150}}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{top:0,right:10,left:-20,bottom:0}}>
                <defs><linearGradient id="attg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="m" tick={{fontSize:9}}/><YAxis tick={{fontSize:8}} domain={[88,100]}/>
                <Tooltip contentStyle={{fontSize:10,borderRadius:8}} formatter={v=>[`${v}%`,'']}/>
                <Area type="monotone" dataKey="pct" name="Attendance" stroke="#10b981" fill="url(#attg)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </W>
        <W title="Today's Status" subtitle="Live breakdown">
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[{label:'On Time',val:271,pct:87,color:'#10b981'},{label:'Late',val:23,pct:7,color:'#f59e0b'},{label:'WFH',val:12,pct:4,color:'#0ea5e9'},{label:'Absent',val:6,pct:2,color:'#ef4444'}].map((s,i)=>(
              <div key={i}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                  <span style={{fontSize:9,color:'#64748b'}}>{s.label}</span>
                  <span style={{fontSize:9,fontWeight:700,color:s.color}}>{s.val} ({(s.pct||0)}%)</span>
                </div>
                <div style={{height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${(s.pct||0)}%`,background:s.color,borderRadius:3}}/></div>
              </div>
            ))}
          </div>
        </W>
        <W title="Dept-wise Attendance" subtitle="This month %">
          <div style={{height:160}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptAtt} layout="vertical" margin={{top:0,right:30,left:30,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis type="number" domain={[85,100]} tick={{fontSize:8}}/><YAxis type="category" dataKey="d" tick={{fontSize:9}}/>
                <Tooltip contentStyle={{fontSize:10,borderRadius:8}} formatter={v=>[`${v}%`,'']}/>
                <Bar dataKey="pct" radius={[0,4,4,0]}>{deptAtt.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </W>
        <W title="Late Arrivals by Day" subtitle="This week pattern">
          <div style={{height:160}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lateData} margin={{top:0,right:10,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="d" tick={{fontSize:9}}/><YAxis tick={{fontSize:8}}/>
                <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
                <Bar dataKey="late" name="Late Arrivals" fill="#f59e0b" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </W>
        <W title="Overtime by Dept" subtitle="Avg hrs/week — Labour Act limit: 4 hrs/day">
          <div style={{height:160}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={otData} margin={{top:0,right:10,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="dept" tick={{fontSize:8}} angle={-20} textAnchor="end" height={30}/><YAxis tick={{fontSize:8}}/>
                <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
                <Bar dataKey="hrs" name="OT hrs/week" radius={[4,4,0,0]}>{otData.map((d,i)=><Cell key={i} fill={d.hrs>4?'#ef4444':'#10b981'}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </W>
      </div>

      <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #e2e8f0'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>AI Attendance Insights & Alerts</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {aiAlerts.map((a,i)=>(
            <div key={i} style={{display:'flex',gap:10,padding:'10px 12px',background:'#f8fafc',borderRadius:10,border:'1px solid #f1f5f9'}}>
              <span style={{fontSize:18,flexShrink:0}}>{a.icon}</span>
              <span style={{fontSize:10,color:'#0f172a',lineHeight:1.5}}>{a.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
