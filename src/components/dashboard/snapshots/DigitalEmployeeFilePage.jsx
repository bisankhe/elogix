// FILE: DigitalEmployeeFilePage.jsx - Digital Employee File (Employee Documents)
// 360-degree single-view profile: masonry doc grid, expiring alerts, pending e-signatures

import { useState } from 'react'
import { PageHeader, Badge, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#3b82f6 100%)'
const A = '#1e3a5f'

const FILE_DATA = {
  employee: { name:'Gita Maharjan', position:'Cloud Architect', dept:'Information Technology',
    manager:'Rajesh Sharma (CTO)', code:'EMP-0041', avatar_color:'#3b82f6' },
  sidebar_tabs: ['Personal Info','Contracts','Letters','Payroll','Performance'],
  recently_viewed:[
    {name:'Employment_Contract_v1.0.pdf',type:'Contract',viewed:'2 hours ago',icon:'📜'},
    {name:'Citizenship_Certificate.pdf',type:'ID Proof',viewed:'1 day ago',icon:'🪪'},
    {name:'NDA_Signed.pdf',type:'NDA',viewed:'3 days ago',icon:'🔒'},
  ],
  expiring_contracts:[
    {employee:'Priya Khadka',type:'Time-Bound Contract',expires:'2025-07-05',days_left:14},
  ],
  pending_signatures:[
    {employee:'Sunita Rai',document:'Employment Contract',sent:'2025-06-19',waiting_days:2},
    {employee:'Ramesh B. Shrestha',document:'Vendor Service Agreement',sent:'2025-06-18',waiting_days:3},
  ],
  audit_log:[
    {action:'Viewed',document:'Citizenship Certificate',by:'HR Admin',date:'2025-06-20 14:32'},
    {action:'Downloaded',document:'Employment Contract',by:'Gita Maharjan',date:'2025-06-19 09:15'},
    {action:'Uploaded',document:'NDA_Signed.pdf',by:'HR Admin',date:'2025-06-18 16:40'},
  ],
}

export default function DigitalEmployeeFilePage() {
  const [tab, setTab] = useState('Personal Info')
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [ctx, setCtx] = useState(null)
  const d = FILE_DATA

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗂" title="Digital Employee File"
        breadcrumb="Employee Lifecycle > Employee Records > Employee Documents"
        gradient={G}
        stats={[
          {icon:'📁',label:'Recent Files',     value:d.recently_viewed.length},
          {icon:'⏰',label:'Expiring Contracts',value:d.expiring_contracts.length},
          {icon:'✍',label:'Pending e-Sign',     value:d.pending_signatures.length},
          {icon:'🔍',label:'Audit Entries',     value:d.audit_log.length},
        ]}
        onAdd={()=>notify('📁 Digital employee file created')} addLabel="+ Create File" onExcel={()=>notify('📤 Exporting digital files...')}/>

      {/* 360 profile header */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:18,overflow:'hidden',marginBottom:16}}>
        <div style={{background:G,padding:'22px 26px',display:'flex',gap:16,alignItems:'center'}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,color:'#fff',border:'3px solid rgba(255,255,255,.4)'}}>
            {d.employee.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>{d.employee.name}</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.8)'}}>{d.employee.position} . {d.employee.dept}</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,.6)',marginTop:2}}>{d.employee.code} . Reports to {d.employee.manager}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:2,padding:'0 24px',borderBottom:'1px solid #f1f5f9',overflowX:'auto'}}>
          {d.sidebar_tabs.map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{padding:'12px 16px',border:'none',background:'none',cursor:'pointer',fontSize:11,fontWeight:700,whiteSpace:'nowrap',
                color:tab===t?A:'#94a3b8',borderBottom:tab===t?`2.5px solid ${A}`:'2.5px solid transparent'}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Masonry dashboard grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>📂 Recently Viewed Documents</div>
          {d.recently_viewed.map((doc,i)=>(
            <div key={i} style={{display:'flex',gap:10,alignItems:'center',padding:'8px 0',borderBottom:i<d.recently_viewed.length-1?'1px solid #f8fafc':'none'}}>
              <span style={{fontSize:18}}>{doc.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:600,color:'#0f172a'}}>{doc.name}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{doc.type} . {doc.viewed}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{background:'#fff',border:'1px solid #fecaca',borderRadius:16,padding:'18px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#991b1b',marginBottom:12}}>⏰ Expiring Contracts (Alerts)</div>
          {d.expiring_contracts.length>0?d.expiring_contracts.map((c,i)=>(
            <div key={i} style={{background:'#fef2f2',borderRadius:10,padding:'10px 12px',marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{c.employee}</div>
              <div style={{fontSize:10,color:'#64748b'}}>{c.type} . Expires {c.expires}</div>
              <div style={{fontSize:10,fontWeight:700,color:'#dc2626',marginTop:2}}>⚠ {c.days_left} days remaining</div>
            </div>
          )):<div style={{fontSize:11,color:'#94a3b8'}}>No contracts expiring soon.</div>}
        </div>

        <div style={{background:'#fff',border:'1px solid #fde68a',borderRadius:16,padding:'18px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#92400e',marginBottom:12}}>✍ Pending e-Signatures</div>
          {d.pending_signatures.map((p,i)=>(
            <div key={i} style={{background:'#fffbeb',borderRadius:10,padding:'10px 12px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{p.employee}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{p.document} . Sent {p.sent}</div>
              </div>
              <span style={{fontSize:9,fontWeight:700,color:'#b45309'}}>{p.waiting_days}d waiting</span>
            </div>
          ))}
        </div>

        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🔍 Audit Trail (Who Accessed What)</div>
          {d.audit_log.map((a,i)=>(
            <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'8px 0',borderBottom:i<d.audit_log.length-1?'1px solid #f8fafc':'none'}}>
              <span style={{background:a.action==='Viewed'?'#eff6ff':a.action==='Downloaded'?'#f0fdf4':'#fef9c3',color:a.action==='Viewed'?'#1d4ed8':a.action==='Downloaded'?'#15803d':'#854d0e',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20,flexShrink:0}}>{a.action}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:'#0f172a'}}>{a.document}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>by {a.by} . {a.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={['Document Management']} actions={[{icon:'👁',label:'View',key:'view'}]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
