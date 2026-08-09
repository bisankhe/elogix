// FILE: MyFeedbackPage.jsx - My Feedback
// (HR Services & Support > Employee Self Service)
// Dual-tab: Peer Recognition (social feed, reuses peer_recognitions
// from Employee Engagement) vs Pulse Surveys/1-on-1 Notes (private,
// reuses survey_responses + employee_feedback_tickets) -- two
// genuinely different trust models, never merged into one feed.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const RECOGNITIONS = [
  {from:'Sunil Magar',value_tag:'Going Above and Beyond',message:'Stayed late three nights to unblock the client launch.',time:'2 days ago'},
  {from:'Anjali Sharma',value_tag:'Team-First Attitude',message:'Always the first to jump in when someone is stuck.',time:'1 week ago'},
]

const PRIVATE_NOTES = [
  {type:'1-on-1',from:'Manager',note:'Discussed Q3 priorities and the AWS certification timeline.',date:'2025-06-20'},
  {type:'pulse',from:'Pulse Survey',note:'Your belonging score: 8/10 (anonymous, manager cannot see individual responses).',date:'2025-06-15'},
]

export default function MyFeedbackPage() {
  const [tab, setTab] = useState('recognition')
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💬" title="My Feedback"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'❤️',label:'Recognitions Received',  value:RECOGNITIONS.length},
          {icon:'🔒',label:'Private Notes',              value:PRIVATE_NOTES.length},
          {icon:'💚',label:'Latest Belonging Score',        value:'8/10'},
          {icon:'🛡',label:'Privacy',                          value:'Strictly Isolated'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🛡</span>
        <div style={{flex:1,minWidth:200}}><strong>Two Different Trust Models, Kept Separate:</strong> Public peer recognition is meant to be seen. Pulse survey responses and confidential notes never are -- securely isolated from any manager-facing dashboard, by design.</div>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:18,background:'#f1f5f9',padding:5,borderRadius:11,maxWidth:340}}>
        {[{k:'recognition',l:'❤️ Peer Recognition'},{k:'private',l:'🔒 Pulse & 1-on-1'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            style={{flex:1,padding:'10px',borderRadius:8,border:'none',cursor:'pointer',fontSize:10,fontWeight:700,
              background:tab===t.k?'#fff':'transparent',color:tab===t.k?A:'#64748b',boxShadow:tab===t.k?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {t.l}
          </button>
        ))}
      </div>

      {tab==='recognition'?(
        <div style={{display:'grid',gap:14}}>
          {RECOGNITIONS.map((r,i)=>(
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.from,...r,impact_links:['Appreciation Program']}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                <div style={{fontSize:11,color:'#374151'}}><strong>{r.from}</strong> recognized you</div>
                <span style={{background:'#fff7ed',color:'#b45309',fontSize:8,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{r.value_tag}</span>
              </div>
              <div style={{fontSize:10,color:'#374151',marginTop:8}}>"{r.message}"</div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:8}}>{r.time}</div>
            </div>
          ))}
        </div>
      ):(
        <div style={{display:'grid',gap:14}}>
          {PRIVATE_NOTES.map((n,i)=>(
            <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${A}`}}>
              <div style={{fontSize:8,fontWeight:700,color:A,textTransform:'uppercase'}}>{n.type==='1-on-1'?'1-on-1 Note':'Pulse Survey Result'}</div>
              <div style={{fontSize:10,color:'#374151',marginTop:6}}>{n.note}</div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:8}}>{n.from} . {n.date}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Pulse survey results show only your own aggregate scores -- individual answers are never linked back to you, even for HR.','Give a peer recognition yourself any time from the Appreciation Program.','Sentiment analysis on your private notes is used only to surface support resources to you -- never reported upward.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
