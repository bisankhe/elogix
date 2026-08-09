// ============================================================
// FILE: src/components/dashboard/RecruitmentOfficerDashboard.jsx
// PURPOSE: INTERNAL Recruitment Officer workspace -- candidate
//          pipeline, interviews, offer approvals, hiring analytics,
//          AI candidate ranking. Genuinely distinct from the
//          EXISTING RecruitmentDashboard.jsx, which is explicitly
//          the external Agency Portal (RBAC-blocked from payroll/
//          internal employee data). This persona is a company
//          employee with full internal recruitment-module access.
// ============================================================
import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { StatCard } from '../shared/StatCard.jsx'
import { Card } from '../shared/Card.jsx'

const PIPELINE=[
  {stage:'Applied',count:84},{stage:'Screened',count:41},{stage:'Interviewed',count:19},{stage:'Offered',count:6},{stage:'Hired',count:4},
]
const PENDING_OFFERS=[
  {candidate:'Bishal Karki',role:'Senior Backend Engineer',awaiting:'HR Manager Sign-off'},
  {candidate:'Aastha Shrestha',role:'Marketing Lead',awaiting:'Department Head Approval'},
]

export default function RecruitmentOfficerDashboard(){
  const { navTo, t } = useApp()
  const maxCount = Math.max(...PIPELINE.map(p=>p.count))
  return(
    <div>
      <h1 style={{fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:4}}>🎯 Recruitment Officer Workspace</h1>
      <p style={{fontSize:11,color:'#94a3b8',marginBottom:18}}>Pipeline, interviews, offers, and AI-ranked candidates -- internal hiring operations</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:20}}>
        <StatCard icon="📋" label="Open Requisitions" value="11"/>
        <StatCard icon="👥" label="Active Candidates" value="84"/>
        <StatCard icon="🗓" label="Interviews This Week" value="14"/>
        <StatCard icon="✉" label="Offers Pending" value={PENDING_OFFERS.length}/>
        <StatCard icon="⏱" label="Avg Time-to-Fill" value="28 days"/>
      </div>

      <Card>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🪜 Candidate Pipeline</div>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',height:90}}>
          {PIPELINE.map((p,i)=>(
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <div style={{fontSize:9,fontWeight:700,color:'#f97316'}}>{p.count}</div>
              <div style={{width:'100%',background:'#f97316',borderRadius:'4px 4px 0 0',height:`${p.count/maxCount*60}px`}}/>
              <div style={{fontSize:7,color:'#94a3b8'}}>{p.stage}</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{marginTop:16}}><Card>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>✉ Offers Awaiting Approval</div>
        {PENDING_OFFERS.map((o,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<PENDING_OFFERS.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap',gap:8}}>
            <div><div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{o.candidate}</div><div style={{fontSize:8,color:'#94a3b8'}}>{o.role}</div></div>
            <span style={{fontSize:8,color:'#b45309'}}>{o.awaiting}</span>
          </div>
        ))}
      </Card></div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:8}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['ATS Dashboard','ats-dashboard'],['Interview Scheduling','interview-scheduling'],['Offer Management','offer-management'],['Resume Screening (AI)','resume-screening'],['Recruitment Analytics','recruitment-analytics']].map(([label,id])=>
            <button key={id} onClick={()=>navTo(id)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8,fontWeight:600,cursor:'pointer'}}>{label}</button>)}
        </div>
      </div>
    </div>
  )
}
