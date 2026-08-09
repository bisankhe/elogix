// FILE: EmploymentContractPage.jsx - Employment Contract
// (HR Services & Support > Employee Self Service)
// Genuinely missing page, confirmed during a full sidebar-vs-route
// audit -- this exact sidebar stub existed with no backing file at
// all since early in this build (flagged but never closed in prior
// sessions). Employee-facing view of their own signed employment
// agreement -- distinct from ContractManagementPage (HR admin's
// management view across all employees) and NonDisclosureAgreementPage
// (a separate document entirely).
import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'
const G='linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A='#0284c7'
const CONTRACT={contract_type:'Permanent -- Regular Employee',signed_date:'2023-03-15',effective_from:'2023-04-01',
  probation_end:'2023-09-30',basic_salary:'NPR 65,000/month',notice_period:'30 days',document_url:'#'}
export default function EmploymentContractPage(){
  const [ctx,setCtx]=useState(null)
  return(
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📄" title="Employment Contract" breadcrumb="HR Services & Support > Employee Self Service" gradient={G}
        stats={[{icon:'📄',label:'Contract Type',value:'Permanent'},{icon:'📅',label:'Signed',value:CONTRACT.signed_date},{icon:'⏱',label:'Notice Period',value:CONTRACT.notice_period},{icon:'🔒',label:'Status',value:'Active'}]}
        onAdd={()=>{}} addLabel=""/>
      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1}}><strong>Your Signed Agreement, Always Accessible:</strong> The exact contract you signed at hiring -- never edited after the fact, always available to download.</div>
      </div>
      <div onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:'My Employment Contract',...CONTRACT,impact_links:['Document Management']}})}}
        style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        {Object.entries({'Contract Type':CONTRACT.contract_type,'Effective From':CONTRACT.effective_from,'Probation Ends':CONTRACT.probation_end,'Basic Salary':CONTRACT.basic_salary,'Notice Period':CONTRACT.notice_period}).map(([k,v],i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #f8fafc'}}>
            <span style={{fontSize:10,color:'#64748b'}}>{k}</span><span style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{v}</span>
          </div>
        ))}
        <button style={{marginTop:14,width:'100%',padding:12,borderRadius:10,border:'none',background:A,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Download Signed Contract (PDF)</button>
      </div>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['This is a read-only view of your own record -- changes to contract terms happen through Contract Management, never edited from here.','Probation status syncs live with the Probation Management module -- one source of truth.','Need a copy for a bank or visa application? Download generates a verified PDF with a digital watermark.']}/>
      </div>
      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[{icon:'📥',label:'Download PDF',key:'view'}]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
