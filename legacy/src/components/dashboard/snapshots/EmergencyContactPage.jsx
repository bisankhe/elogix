// FILE: EmergencyContactPage.jsx - Emergency Contact (Employee Database)
// Min 2 contacts required, primary/secondary priority, annual verification prompt

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7f1d1d 0%,#dc2626 60%,#fca5a5 100%)'
const A = '#dc2626'

const CONTACTS = [
  { id:'ec1', name:'Suresh Maharjan', relationship:'Father', phone:'980-7777777', alt_phone:'01-5551234',
    address:'Ward 5, Bhaktapur', is_primary:true, last_verified:'2025-06-17', verified_pct:100 },
  { id:'ec2', name:'Rohan Maharjan', relationship:'Spouse', phone:'980-8888888', alt_phone:'',
    address:'Baneshwor, Kathmandu', is_primary:false, last_verified:'2025-06-17', verified_pct:100 },
]

export default function EmergencyContactPage() {
  const [contacts, setContacts] = useState(CONTACTS)

  const [form, setForm] = useState({})
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const setPrimary = (id) => setContacts(prev=>prev.map(c=>({...c,is_primary:c.id===id})))
  const meetsMinimum = contacts.length >= 2
  const hasPrimary = contacts.some(c=>c.is_primary)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🆘" title="Emergency Contact"
        breadcrumb="Employee Lifecycle > Employee Records > Employee Database"
        gradient={G}
        stats={[
          {icon:'🆘',label:'Total Contacts', value:contacts.length},
          {icon:hasPrimary?'✅':'⚠',label:'Primary Set',  value:hasPrimary?'Yes':'No'},
          {icon:meetsMinimum?'✅':'⚠',label:'Min Required (2)',value:meetsMinimum?'Met':'Not Met'},
          {icon:'📅',label:'Last Verified', value:'Jun 2025'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add Contact"
        onExcel={()=>setShowExcel(true)}/>

      {!meetsMinimum&&(
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#991b1b',display:'flex',gap:10}}>
          <span style={{fontSize:18}}>⚠</span>
          <div><strong>Action Required:</strong> Best practice requires at least 2 emergency contacts on file. Please add one more contact below.</div>
        </div>
      )}

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#9a3412',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🔔</span>
        <div><strong>Annual Verification Reminder:</strong> Outdated emergency contacts create liability during incidents. You'll be prompted to reconfirm these details annually. Last confirmed: June 17, 2025.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
        {contacts.map(c=>(
          <LuxCard key={c.id} color={c.is_primary?'#dc2626':'#94a3b8'}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.name,impact_links:['Family Details']}})}}>
            <div style={{padding:'16px 16px 10px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{c.name}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{c.relationship}</div>
                </div>
                <button onClick={()=>setPrimary(c.id)}
                  style={{background:c.is_primary?'#fef2f2':'#f8fafc',border:`1.5px solid ${c.is_primary?'#dc2626':'#e2e8f0'}`,
                    color:c.is_primary?'#dc2626':'#94a3b8',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20,cursor:'pointer',flexShrink:0}}>
                  {c.is_primary?'★ Primary':'Set Primary'}
                </button>
              </div>
              <div style={{fontSize:11,color:'#374151',marginBottom:4}}>📞 {c.phone}</div>
              {c.alt_phone&&<div style={{fontSize:11,color:'#374151',marginBottom:4}}>📞 {c.alt_phone} (alt)</div>}
              <div style={{fontSize:10,color:'#64748b'}}>📍 {c.address}</div>
              <div style={{marginTop:8,fontSize:9,color:'#10b981',fontWeight:600}}>✓ Verified {c.last_verified}</div>
            </div>
            <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
              <button style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#fef2f2',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer'}}>📞 Call Now</button>
              <button style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f8fafc',color:'#64748b',fontSize:10,fontWeight:700,cursor:'pointer'}}>✏ Edit</button>
            </div>
          </LuxCard>
        ))}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:560,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Add Emergency Contact</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Full Name</label><input type="text" value={form.full_name||''} onChange={e=>setForm(p=>({...p,full_name:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Relationship</label><select value={form.relationship||''} onChange={e=>setForm(p=>({...p,relationship:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['Father','Mother','Spouse','Sibling','Friend','Other'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Mobile Phone</label><input type="text" value={form.mobile_phone||''} onChange={e=>setForm(p=>({...p,mobile_phone:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Alternate Phone</label><input type="text" value={form.alternate_phone||''} onChange={e=>setForm(p=>({...p,alternate_phone:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
              </div>
              <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Address</label><input type="text" value={form.address||''} onChange={e=>setForm(p=>({...p,address:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
              <label style={{display:'flex',gap:8,alignItems:'center',marginTop:8,fontSize:12,color:'#374151',cursor:'pointer'}}>
                <input type="radio" name="primary" style={{accentColor:A}}/> Set as primary emergency contact
              </label>
              <AIImpact color={A} lines={['Primary contact is shown first to managers/HR in case of incident.','Mobile-first format ensures access even offline.','Auto-syncs candidates from Family Details for quick-add.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Add Contact</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'📞',label:'Call Now',key:'call'},{icon:'✏',label:'Edit',key:'edit'},
        {icon:'★',label:'Set as Primary',key:'primary'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Emergency Contacts" columns={['Name','Relationship','Phone','Alt Phone','Address','Primary','Last Verified']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
