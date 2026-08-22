// FILE: RelievingLetterPage.jsx - Relieving Letter (Settlement & Documents)
// Auto-issued on clean separation, no-ransom policy, never withheld over F&F disputes

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const SAMPLE_LETTER = `[eLogix HRMS Pvt. Ltd. Letterhead]

RELIEVING LETTER

Date: July 10, 2025

This is to confirm that Mr. Dipendra Yadav (Employee ID: EMP-0067), who served as Junior Accountant in the Finance & Accounts Department, has been formally relieved of his duties at eLogix HRMS Pvt. Ltd. effective July 10, 2025.

Mr. Yadav has completed his notice period as required and has no pending obligations to the company. He is free to pursue employment with any other organization.

We thank him for his contribution and wish him well in his future career.

For eLogix HRMS Pvt. Ltd.

_______________________
Priya Adhikari
HR Manager`

const LETTERS = [
  { id:'rl1', employee:'Dipendra Yadav', position:'Junior Accountant', lwd:'2025-07-10',
    notice_completed:true, clearance_complete:true, fnf_settled:true,
    issued_date:'2025-07-10', status:'issued', digital_signature:true,
    withholding_reason:null,
    impact_links:['Experience Letter','Full & Final Settlement','Exit Clearance'] },
  { id:'rl2', employee:'Anjali Sharma', position:'Sales Executive', lwd:'2025-06-22',
    notice_completed:false, clearance_complete:false, fnf_settled:false,
    issued_date:null, status:'blocked', digital_signature:false,
    withholding_reason:'Notice period shortfall (3 days) and pending asset return - clearance must complete first. F&F dispute, if any, must NOT delay this letter once clearance/notice conditions are met.',
    impact_links:['Exit Clearance','Asset Return'] },
]

const STATUS_CFG = {
  issued:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Issued'},
  blocked:{c:'#f59e0b',bg:'#fffbeb',icon:'🚫',label:'Blocked - Conditions Not Met'},
  ready:{c:'#3b82f6',bg:'#eff6ff',icon:'📋',label:'Ready to Issue'},
}

export default function RelievingLetterPage() {
  const [letters, setLetters] = useState(LETTERS)
  const [search, setSearch] = useState('')
  const [showPreview, setShowPreview] = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({employee:'',position:'',lwd:'',notice_ok:false,clearance_ok:false,fnf_ok:false})
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const filtered = letters.filter(l=>!search||l.employee.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="Relieving Letter"
        breadcrumb="Employee Lifecycle > Offboarding > Settlement & Documents"
        gradient={G}
        stats={[
          {icon:'📋',label:'Total Requests', value:letters.length},
          {icon:'✅',label:'Issued',          value:letters.filter(l=>l.status==='issued').length},
          {icon:'🚫',label:'Blocked',         value:letters.filter(l=>l.status==='blocked').length},
          {icon:'⚖',label:'Notice Periods',  value:'1/7/30 days'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="+ Issue Letter" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fef2f2',border:'2px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:14,fontSize:11,color:'#7f1d1d',display:'flex',gap:10}}>
        <span style={{fontSize:20}}>🚫</span>
        <div><strong>No-Ransom Policy:</strong> Never withhold the relieving letter over Full & Final settlement DISPUTES - those must be resolved separately and legally, not via document leverage. The letter may only be held back if notice period or clearance conditions explicitly defined in the offer letter remain unmet.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(l=>{
          const sc = STATUS_CFG[l.status]
          return (
            <div key={l.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.employee,...l}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{l.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{l.position} . LWD {l.lwd}</div>
                </div>
              </div>

              {/* Three release conditions checklist */}
              <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,borderBottom:'1px solid #f8fafc'}}>
                {[['Notice Completed',l.notice_completed],['Clearance Complete',l.clearance_complete],['F&F Settled',l.fnf_settled]].map(([label,met],i)=>(
                  <div key={i} style={{textAlign:'center',background:met?'#f0fdf4':'#fef2f2',borderRadius:8,padding:'8px 4px',border:`1px solid ${met?'#bbf7d0':'#fecaca'}`}}>
                    <div style={{fontSize:14,color:met?'#10b981':'#ef4444'}}>{met?'✓':'✗'}</div>
                    <div style={{fontSize:8,color:met?'#065f46':'#991b1b',fontWeight:600,marginTop:2}}>{label}</div>
                  </div>
                ))}
              </div>

              {l.withholding_reason&&(
                <div style={{padding:'10px 20px',background:'#fffbeb',fontSize:10,color:'#92400e',borderBottom:'1px solid #fde68a'}}>
                  <strong>Pending condition (not F&F amount dispute):</strong> {l.withholding_reason}
                </div>
              )}

              <div style={{padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:10,color:'#64748b'}}>{l.issued_date?`Issued ${l.issued_date}${l.digital_signature?' . ✓ Digitally signed':''}`:'Not yet issued'}</span>
                <div style={{display:'flex',gap:6}}>
                  {l.status==='issued'?(
                    <>
                      <button onClick={()=>setShowPreview(l)} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>Preview</button>
                      <button style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:11,fontWeight:700,cursor:'pointer'}}>Download PDF</button>
                    </>
                  ):(
                    <button disabled style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#e2e8f0',color:'#94a3b8',fontSize:11,fontWeight:700,cursor:'not-allowed'}}>Awaiting Conditions</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showPreview&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowPreview(null)}>
          <div style={{background:'#fff',borderRadius:16,width:640,maxHeight:'88vh',overflow:'auto',boxShadow:'0 40px 100px rgba(0,0,0,.4)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>Relieving Letter Preview - {showPreview.employee}</span>
              <button onClick={()=>setShowPreview(null)} style={{background:'rgba(255,255,255,.2)',border:'none',color:'#fff',width:26,height:26,borderRadius:'50%',cursor:'pointer'}}>✕</button>
            </div>
            <div style={{padding:'24px 30px'}}>
              <div style={{background:'#fafaf9',border:'1px solid #e7e5e4',borderRadius:10,padding:'24px 28px',fontSize:11.5,lineHeight:1.8,color:'#1c1917',fontFamily:'Georgia, serif',whiteSpace:'pre-wrap'}}>
                {SAMPLE_LETTER}
              </div>
              <div style={{marginTop:14,background:'#eff6ff',borderRadius:10,padding:'10px 14px',fontSize:10,color:'#1e40af'}}>
                ✓ Issued on last working day. Confirms notice period served and no pending obligations - auto-generated only after all 3 release conditions are met.
              </div>
              <div style={{display:'flex',gap:10,marginTop:14}}>
                <button style={{flex:1,padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>📥 Download PDF</button>
                <button style={{flex:1,padding:12,borderRadius:10,border:`1.5px solid ${A}`,background:'#fff',color:A,fontSize:12,fontWeight:700,cursor:'pointer'}}>🔐 Verify Digital Signature</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:360}}>{msg}</div>}

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:480,maxWidth:'95vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>📋 Issue Relieving Letter</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              {[['Employee Name *','employee','text'],['Position','position','text'],['Last Working Day *','lwd','date']].map(([l,f,t])=>(
                <div key={f} style={{marginBottom:12}}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                  <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/>
                </div>
              ))}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:'#374151',marginBottom:8}}>Release Conditions (must all be met)</div>
                {[['notice_ok','✅ Notice period fully served'],['clearance_ok','✅ All departmental clearances completed'],['fnf_ok','✅ Full & Final Settlement processed']].map(([f,l])=>(
                  <label key={f} style={{display:'flex',gap:8,alignItems:'center',cursor:'pointer',fontSize:11,color:'#374151',marginBottom:6}}>
                    <input type="checkbox" checked={form[f]} onChange={()=>setForm(p=>({...p,[f]:!p[f]}))} style={{accentColor:'#4338ca'}}/>
                    {l}
                  </label>
                ))}
              </div>
              {(!form.notice_ok||!form.clearance_ok||!form.fnf_ok)&&<div style={{background:'#fef9c3',border:'1px solid #fde68a',borderRadius:9,padding:'8px 12px',marginBottom:14,fontSize:10,color:'#92400e'}}>⚠️ All 3 release conditions must be met to issue a Relieving Letter. Letter cannot be withheld beyond these conditions.</div>}
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  if(!form.employee||!form.lwd){notify('⚠️ Employee and LWD required');return}
                  const canIssue = form.notice_ok&&form.clearance_ok&&form.fnf_ok
                  setLetters(prev=>[...prev,{id:'rl'+Date.now(),employee:form.employee,position:form.position||'Staff',lwd:form.lwd,notice_completed:form.notice_ok,clearance_complete:form.clearance_ok,fnf_settled:form.fnf_ok,issued_date:canIssue?new Date().toISOString().split('T')[0]:null,status:canIssue?'issued':'blocked',digital_signature:false,withholding_reason:canIssue?null:'Release conditions not yet met',impact_links:[]}])
                  notify(canIssue?'✅ Relieving letter issued for '+form.employee:'⏳ Relieving letter created — blocked until conditions are met for '+form.employee)
                  setShowAdd(false)
                }} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>📋 Issue Relieving Letter</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Preview Letter',key:'view'},{icon:'📥',label:'Download PDF',key:'download'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Relieving Letters" columns={['Employee','Position','LWD','Notice Completed','Clearance Complete','F&F Settled','Issued Date','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
