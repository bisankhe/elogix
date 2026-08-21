// FILE: DeviceIntegrationPage.jsx - Device Integration (System Settings)
// General device hub (MDM, connected devices per employee, IoT
// integrations) -- distinct from BiometricIntegrationPage (attendance-
// specific hardware terminal sync) and APIThirdPartyIntegrationPage
// (software connectors). This is the physical device management layer.
import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'
const G='linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A='#15803d'
const DEVICES=[
  {name:'Lenovo Laptop . SN-2024-041',type:'Laptop',employee:'Hari Thapa',status:'enrolled',mdm_compliant:true,last_seen:'2 min ago'},
  {name:'iPhone 14 . SN-M-2847',type:'Mobile',employee:'Gita Maharjan',status:'enrolled',mdm_compliant:true,last_seen:'Online'},
  {name:'Reception iPad . Lobby-01',type:'Kiosk',employee:'Shared',status:'enrolled',mdm_compliant:true,last_seen:'Online'},
  {name:'Personal iPhone . SN-M-9921',type:'Mobile',employee:'Bikash Rai',status:'pending_review',mdm_compliant:false,last_seen:'3 hours ago',
   flag_note:'MDM profile not installed -- device accessing company data without management policy.'},
]
export default function DeviceIntegrationPage(){
  const [search,setSearch]=useState('')
  const [ctx,setCtx]=useState(null)
  const filtered=DEVICES.filter(d=>!search||d.employee.toLowerCase().includes(search.toLowerCase())||d.name.toLowerCase().includes(search.toLowerCase()))
  return(
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📱" title="Device Integration" breadcrumb="System Administration > System Settings" gradient={G}
        stats={[{icon:'📱',label:'Registered Devices',value:DEVICES.length},{icon:'✅',label:'MDM Compliant',value:DEVICES.filter(d=>d.mdm_compliant).length},{icon:'⚠',label:'Pending Review',value:DEVICES.filter(d=>d.status==='pending_review').length},{icon:'🌐',label:'Online Now',value:DEVICES.filter(d=>d.last_seen==='Online').length}]}
        onAdd={()=>{}} addLabel="Enroll Device"/>
      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1}}><strong>No Unmanaged Device Should Touch Company Data:</strong> Every device accessing HR records appears here. An unmanaged personal phone accessing payroll data is a policy breach that surfaces immediately.</div>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search devices..."/>
      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map((d,i)=>(
          <div key={i} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.name,...d,impact_links:['Security Settings']}})}}
            style={{background:'#fff',border:`1px solid ${d.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:12,padding:'12px 16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <div><div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{d.name}</div><div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{d.type} . {d.employee} . {d.last_seen}</div></div>
              <div style={{display:'flex',gap:4}}>
                <span style={{background:d.mdm_compliant?'#f0fdf4':'#fef2f2',color:d.mdm_compliant?'#15803d':'#dc2626',fontSize:7,fontWeight:700,padding:'2px 8px',borderRadius:20}}>MDM {d.mdm_compliant?'✓':'✗'}</span>
                <span style={{background:'#f8fafc',color:'#64748b',fontSize:7,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{d.status}</span>
              </div>
            </div>
            {d.flag_note&&<div style={{marginTop:6,fontSize:8,color:'#b45309'}}>⚠ {d.flag_note}</div>}
          </div>
        ))}
      </div>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Non-compliant devices accessing HR data trigger an immediate alert -- never discovered during a quarterly security review.','Biometric devices (attendance terminals) register here as well, bridging the hardware and software views of the same physical device.','Remote wipe is available for enrolled devices -- protects sensitive data if a device is lost or an employee is offboarded.']}/>
      </div>
      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[{icon:'👁',label:'View Device Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'}]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
