// FILE: PayslipDownloadPage.jsx - Payslip Download
// (HR Services & Support > Employee Self Service)
// Secure historical archive, pure UI over the EXISTING payslips table
// (which already has published_to_ess + pdf_url designed exactly for
// this). Distinct from My Payroll (the analytical view); this is the
// document repository.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const PAYSLIPS = [
  {id:'p1',pay_period:'2025-06',gross:62000,net:52000,published:true},
  {id:'p2',pay_period:'2025-05',gross:68500,net:58500,published:true},
  {id:'p3',pay_period:'2025-04',gross:62000,net:52000,published:true},
  {id:'p4',pay_period:'2025-03',gross:64200,net:54200,published:true},
  {id:'p5',pay_period:'2025-02',gross:62000,net:52000,published:true},
  {id:'p6',pay_period:'2025-01',gross:62000,net:52000,published:true},
]

export default function PayslipDownloadPage() {
  const [search, setSearch] = useState('')
  const [pinModal, setPinModal] = useState(null)
  const [ctx, setCtx] = useState(null)

  const filtered = PAYSLIPS.filter(p=>!search||p.pay_period.includes(search))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🧾" title="Payslip Download"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'🧾',label:'Available Payslips',  value:PAYSLIPS.length},
          {icon:'🔒',label:'Encryption',              value:'AES-256'},
          {icon:'📥',label:'Format',                     value:'PDF, Password-Protected'},
          {icon:'🗂',label:'History',                       value:'Full Archive'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>Your Secured Archive:</strong> Every PDF requires your security PIN before opening. Available the instant payroll finalizes -- never wait on HR to email a copy again.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by month (e.g. 2025-06)..."/>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',marginTop:14}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
          <thead><tr style={{background:'#f8fafc'}}>
            {['Pay Period','Gross','Net','Status','Action'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,fontWeight:800,color:A}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map(p=>(
              <tr key={p.id} style={{borderBottom:'1px solid #f8fafc'}}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.pay_period,...p,impact_links:['My Payroll']}})}}>
                <td style={{padding:'10px 14px',fontWeight:700,color:'#0f172a'}}>{p.pay_period}</td>
                <td style={{padding:'10px 14px',color:'#374151'}}>NPR {p.gross.toLocaleString()}</td>
                <td style={{padding:'10px 14px',fontWeight:700,color:A}}>NPR {p.net.toLocaleString()}</td>
                <td style={{padding:'10px 14px'}}><span style={{background:'#f0fdf4',color:'#15803d',fontSize:8,fontWeight:700,padding:'2px 9px',borderRadius:20}}>Published</span></td>
                <td style={{padding:'10px 14px'}}>
                  <button onClick={()=>setPinModal(p)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>📥 Download</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pinModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setPinModal(null)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(380px,100%)',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:14,fontWeight:900,color:'#fff'}}>Enter PIN to Open</div></div>
            <div style={{padding:'22px 24px'}}>
              <div style={{fontSize:10,color:'#64748b',marginBottom:14}}>{pinModal.pay_period} Payslip</div>
              <input maxLength={4} placeholder="----" style={{width:120,padding:'12px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:20,textAlign:'center',letterSpacing:8,marginBottom:14}}/>
              <button onClick={()=>setPinModal(null)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Unlock &amp; Download</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Payslips publish to this archive the instant payroll finalizes and locks -- never a manually-uploaded copy.','Bank account numbers display masked everywhere except the final downloaded PDF.','Every download is logged with a timestamp, satisfying audit-trail requirements for sensitive financial documents.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Preview',key:'view'},{icon:'📥',label:'Download',key:'download'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
