// FILE: SmartNotificationsPage.jsx — Smart Notifications Centre
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const P='#7c3aed',G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'

const ALL_NOTIFS=[
  {id:1,cat:'Action Required',icon:'🔴',type:'leave',  title:'3 Leave Requests Pending Approval',                 body:'Sita Rai (3d sick), Bikash Thapa (2d annual), Priya KC (1d personal) — all pending >24hrs',action:'Approve Now',   time:'2 min ago',  priority:'critical',unread:true},
  {id:2,cat:'Action Required',icon:'🟠',type:'payroll', title:'SSF Filing Due in 20 Days',                         body:'SSF contribution for Poush must be filed by Poush 25. NPR 14.4 lakhs due. Finance to process.',action:'View Details', time:'1 hr ago',   priority:'high',    unread:true},
  {id:3,cat:'Action Required',icon:'🟠',type:'contract',title:'2 Contracts Expiring This Month',                   body:'Ramesh Koirala (Jul 15) and Anita Shrestha (Jul 28) — renewal or exit decision needed.',action:'Review Contracts',time:'3 hr ago',  priority:'high',    unread:true},
  {id:4,cat:'Action Required',icon:'🟡',type:'perf',   title:'5 Probation Confirmations Due This Week',            body:'4 employees completing probation this week. Confirmation letters required under Labour Act 2074.',action:'Generate Letters',time:'4 hr ago', priority:'medium',  unread:false},
  {id:5,cat:'AI Alert',       icon:'🔮',type:'attrition',title:'AI: Engineering Flight Risk Increased to 34%',     body:'ML model detected increased exit signals in Engineering: login frequency down 22%, 3 job portal visits detected.',action:'View Brief',   time:'5 hr ago',   priority:'high',    unread:true},
  {id:6,cat:'AI Alert',       icon:'🧠',type:'insight', title:'AI Insight: Friday Absenteeism Pattern Detected',   body:'Attendance on Fridays 23% lower than Mon-Thu. Possible burnout or commute issue. Recommend flexible start.',action:'See Analysis',  time:'6 hr ago',   priority:'medium',  unread:false},
  {id:7,cat:'FYI',            icon:'🎂',type:'birthday','title':'3 Birthdays This Week',                           body:'Anita Gurung (Jul 9), Suresh KC (Jul 11), Priya Maharjan (Jul 14) — send celebration messages.',action:'Send Wishes',  time:'8 hr ago',   priority:'low',     unread:false},
  {id:8,cat:'FYI',            icon:'🎊',type:'anniv',  title:'Work Anniversary: Ram Prasad Sah — 5 Years',         body:'Ram Prasad completes 5 years on Jul 7. Consider recognition award and tenure certificate.',action:'Acknowledge',   time:'1 day ago',  priority:'low',     unread:false},
  {id:9,cat:'FYI',            icon:'✅',type:'payroll', title:'June Payroll Processed Successfully',                body:'NPR 4.8M disbursed to 312 employees. 0 errors. SSF remitted. TDS filed. Bank transfer complete.',action:'View Report',  time:'2 days ago', priority:'info',    unread:false},
  {id:10,cat:'FYI',           icon:'📋',type:'recruit','title':'New Application: Senior Engineer Role',             body:'Kavita Sharma applied via LinkedIn for Senior Engineer position. Strong fit — 7 years experience.',action:'Review CV',    time:'3 days ago', priority:'low',     unread:false},
  {id:11,cat:'System',        icon:'⚙️',type:'system', title:'NepHR Pro System Update v4.2 Deployed',             body:'New features: AI MOM generator, enhanced predictive analytics, SSF auto-calc. No downtime.',action:'View Release', time:'3 days ago', priority:'info',    unread:false},
  {id:12,cat:'System',        icon:'🔒',type:'security','title':'Security: 2 Failed Login Attempts Blocked',        body:'IP 203.x.x.x attempted login to Finance admin account. Blocked by RBAC. No breach.',action:'View Log',     time:'4 days ago', priority:'medium',  unread:false},
]

const catColors={
  'Action Required':'#ef4444',
  'AI Alert':P,
  'FYI':'#10b981',
  'System':'#64748b',
}

const typeIcons={leave:'🌴',payroll:'💰',contract:'📄',perf:'🎯',attrition:'⚠️',insight:'📊',birthday:'🎂',anniv:'🥂',recruit:'👤',system:'⚙️',security:'🔒'}

export default function SmartNotificationsPage(){
  const {navTo}=useApp()
  const [filter,setFilter]=useState('All')
  const [notifs,setNotifs]=useState(ALL_NOTIFS)
  const cats=['All','Action Required','AI Alert','FYI','System']
  const unread=notifs.filter(n=>n.unread).length

  const visible=filter==='All'?notifs:notifs.filter(n=>n.cat===filter)
  const markRead=id=>setNotifs(p=>p.map(n=>n.id===id?{...n,unread:false}:n))
  const markAllRead=()=>setNotifs(p=>p.map(n=>({...n,unread:false})))

  const date=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})

  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:G,borderRadius:16,padding:'20px 24px',boxShadow:'0 4px 24px rgba(124,58,237,.25)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>🔔 Smart Notifications</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>{date} · Event-driven alerts · Role-based · {unread} unread</div>
          </div>
          {unread>0&&(
            <button onClick={markAllRead} style={{padding:'7px 16px',borderRadius:20,border:'1px solid rgba(255,255,255,.3)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>
              Mark All Read
            </button>
          )}
        </div>
        {/* Summary chips */}
        <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
          {[
            {label:'Action Required',count:notifs.filter(n=>n.cat==='Action Required').length,c:'#ef4444'},
            {label:'AI Alerts',count:notifs.filter(n=>n.cat==='AI Alert').length,c:'#c4b5fd'},
            {label:'Unread',count:unread,c:'#fde68a'},
          ].map((s,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,.12)',borderRadius:10,padding:'5px 12px',display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:s.c}}/>
              <span style={{fontSize:9,color:'rgba(255,255,255,.8)'}}>{s.label}</span>
              <span style={{fontSize:11,fontWeight:900,color:'#fff'}}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:4,background:'#f8fafc',borderRadius:12,padding:4}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setFilter(c)}
            style={{flex:1,padding:'7px 8px',borderRadius:9,border:'none',background:filter===c?'#fff':'transparent',color:filter===c?catColors[c]||P:'#64748b',fontWeight:filter===c?800:500,fontSize:9,cursor:'pointer',boxShadow:filter===c?'0 1px 4px rgba(0,0,0,.08)':'none',transition:'all .2s'}}>
            {c}{c==='Action Required'&&<span style={{marginLeft:4,background:'#ef4444',color:'#fff',fontSize:7,padding:'1px 5px',borderRadius:10,fontWeight:900}}>{notifs.filter(n=>n.cat===c).length}</span>}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {visible.map(n=>(
          <div key={n.id} onClick={()=>markRead(n.id)}
            style={{display:'flex',gap:12,padding:'14px 16px',background:n.unread?'#faf5ff':'#fff',borderRadius:14,border:`1px solid ${n.unread?P+'30':'#e2e8f0'}`,cursor:'pointer',transition:'all .2s',boxShadow:n.unread?'0 2px 8px rgba(124,58,237,.08)':'0 1px 4px rgba(0,0,0,.04)'}}>
            <div style={{fontSize:22,flexShrink:0,lineHeight:1}}>{n.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                  {n.unread&&<div style={{width:7,height:7,borderRadius:'50%',background:P,flexShrink:0}}/>}
                  <span style={{fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20,background:`${catColors[n.cat]||P}15`,color:catColors[n.cat]||P}}>{n.cat}</span>
                </div>
                <span style={{fontSize:8,color:'#94a3b8',flexShrink:0}}>{n.time}</span>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginTop:4}}>{n.title}</div>
              <div style={{fontSize:9,color:'#64748b',marginTop:3,lineHeight:1.5}}>{n.body}</div>
              <button onClick={e=>{e.stopPropagation();markRead(n.id)}}
                style={{marginTop:8,padding:'5px 12px',borderRadius:8,border:`1px solid ${P}`,background:'transparent',color:P,fontSize:8,fontWeight:700,cursor:'pointer'}}>
                {n.action} →
              </button>
            </div>
          </div>
        ))}
        {visible.length===0&&(
          <div style={{textAlign:'center',padding:'40px',color:'#94a3b8',fontSize:11}}>
            <div style={{fontSize:32,marginBottom:8}}>✅</div>
            No notifications in this category
          </div>
        )}
      </div>

      {/* AI notification settings */}
      <div style={{background:'#f8fafc',borderRadius:16,padding:'16px 20px',border:'1px solid #e2e8f0'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>⚙️ Smart Notification Settings</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
          {[
            {label:'AI Attrition Alerts',   desc:'When risk score changes >5%',    enabled:true},
            {label:'Leave Reminders',        desc:'Pending approval >4 hours',       enabled:true},
            {label:'Contract Expiry',        desc:'30 days before expiry',           enabled:true},
            {label:'Payroll Anomalies',      desc:'AI detects unusual patterns',     enabled:true},
            {label:'Birthday Reminders',     desc:'3 days before',                   enabled:false},
            {label:'Compliance Deadlines',   desc:'SSF, CIT, Labour Act',           enabled:true},
          ].map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px',background:'#fff',borderRadius:10,border:'1px solid #e2e8f0'}}>
              <div style={{width:28,height:16,borderRadius:8,background:s.enabled?P:'#e2e8f0',flexShrink:0,position:'relative',cursor:'pointer',transition:'background .2s'}}>
                <div style={{position:'absolute',top:2,left:s.enabled?14:2,width:12,height:12,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
              </div>
              <div>
                <div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{s.label}</div>
                <div style={{fontSize:8,color:'#94a3b8',marginTop:1}}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
