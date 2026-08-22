// FILE: MyDailyActivityPage.jsx — Employee Daily Activity Log
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'
const G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const today=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
export default function MyDailyActivityPage(){
  const tasks=[{time:'09:00',task:'Daily standup — Engineering team',done:true},{time:'10:00',task:'Code review — Attendance module PR #142',done:true},{time:'11:30',task:'1:1 with manager — Q3 goal alignment',done:true},{time:'13:00',task:'Lunch break',done:true},{time:'14:00',task:'Sprint planning — Sprint 24',done:false},{time:'15:30',task:'Fix attendance biometric sync bug',done:false},{time:'17:00',task:'Submit daily timesheet',done:false}]
  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:G,borderRadius:16,padding:'20px 24px',boxShadow:'0 4px 24px rgba(124,58,237,.25)'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>📋 My Daily Activity</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>{today}</div>
      </div>
      <div style={{background:'#fff',borderRadius:16,padding:20,border:'1px solid #e2e8f0'}}>
        <div style={{fontSize:12,fontWeight:800,marginBottom:12}}>Today's Schedule</div>
        {tasks.map((t,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<tasks.length-1?'1px solid #f1f5f9':'none'}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:t.done?'#10b981':'#e2e8f0',flexShrink:0}}/>
            <div style={{width:40,fontSize:9,color:'#94a3b8',flexShrink:0}}>{t.time}</div>
            <div style={{flex:1,fontSize:10,color:t.done?'#94a3b8':'#0f172a',textDecoration:t.done?'line-through':'none'}}>{t.task}</div>
            <span style={{fontSize:9,padding:'2px 8px',borderRadius:20,background:t.done?'#d1fae5':'#f1f5f9',color:t.done?'#065f46':'#64748b',fontWeight:700}}>{t.done?'Done':'Pending'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
