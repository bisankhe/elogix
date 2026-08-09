// FILE: BackupRestorePage.jsx - Backup & Restore (System Settings)
import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'
const G='linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A='#0284c7'
const BACKUPS=[
  {id:'bk-2025-06-30-02',ts:'2025-06-30 02:00 AM',type:'Automated',size:'2.4 GB',status:'success',region:'ap-south-1'},
  {id:'bk-2025-06-29-02',ts:'2025-06-29 02:00 AM',type:'Automated',size:'2.4 GB',status:'success',region:'ap-south-1'},
  {id:'bk-2025-06-28-14',ts:'2025-06-28 02:14 PM',type:'Manual',size:'2.3 GB',status:'success',region:'ap-south-1',note:'Pre-migration backup before Kathmandu Logistics data import'},
]
export default function BackupRestorePage(){
  const [ctx,setCtx]=useState(null)
  return(
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💾" title="Backup & Restore" breadcrumb="System Administration > System Settings" gradient={G}
        stats={[{icon:'💾',label:'Latest Backup',value:'2 hours ago'},{icon:'📅',label:'Auto Schedule',value:'Daily 2 AM'},{icon:'🌍',label:'Geo-Redundant',value:'2 regions'},{icon:'⏱',label:'Recovery RTO',value:'< 4 hrs'}]}
        onAdd={()=>{}} addLabel="Manual Backup Now"/>
      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🛡</span>
        <div style={{flex:1}}><strong>Automatic by Default, Restorable in One Click:</strong> Daily automated backups run at 2 AM across two geographic regions. Manual restore to any point in the last 30 days without IT involvement -- never a support ticket to get your data back.</div>
      </div>
      <div style={{display:'grid',gap:12,marginBottom:18}}>
        {BACKUPS.map((b,i)=>(
          <div key={i} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:b.id,...b}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 16px',display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
            <div><div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{b.ts}</div><div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{b.type} . {b.size} . {b.region}{b.note&&' . '+b.note}</div></div>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <span style={{background:'#f0fdf4',color:'#15803d',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>✓ Success</span>
              <button style={{padding:'4px 12px',borderRadius:7,border:'none',background:A,color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer'}}>Restore</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Point-in-time recovery means restoring to 10 minutes before a bad data migration -- not the entire previous day\'s backup.','Pre-migration backups are created automatically the moment a Data Migration job is approved for promotion -- never a manual step someone forgets.','Backup verification runs automatically after each snapshot -- a backup that can\'t be verified is treated the same as no backup at all.']}/>
      </div>
      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={[]} actions={[{icon:'🔄',label:'Restore to This Point',key:'view'}]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
