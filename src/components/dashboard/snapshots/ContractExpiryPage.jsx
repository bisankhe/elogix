// FILE: ContractExpiryPage.jsx — Contract Expiry Tracker
// Full list: name, position, dept, expiry date | Renew Now / Schedule Later
import { useState } from 'react'
const G = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'
const CONTRACTS = [
  { id:'C001', name:'Ramesh Koirala',   pos:'Sales Executive',     dept:'Sales',      type:'Contract',  start:'2025-07-15',expiry:'2026-07-15',days:15,risk:'critical',salary:'NPR 55,000' },
  { id:'C002', name:'Anita Shrestha',   pos:'Marketing Officer',   dept:'Marketing',  type:'Contract',  start:'2025-01-28',expiry:'2026-07-28',days:28,risk:'critical',salary:'NPR 48,000' },
  { id:'C003', name:'Dilip Tamang',     pos:'IT Support',          dept:'IT',         type:'Probation', start:'2026-02-05',expiry:'2026-08-05',days:36,risk:'warning', salary:'NPR 42,000' },
  { id:'C004', name:'Sushma Khadka',    pos:'Accountant',          dept:'Finance',    type:'Contract',  start:'2025-02-20',expiry:'2026-08-20',days:51,risk:'warning', salary:'NPR 60,000' },
  { id:'C005', name:'Nabin Regmi',      pos:'HR Officer',          dept:'HR',         type:'Contract',  start:'2025-03-01',expiry:'2026-09-01',days:63,risk:'normal',  salary:'NPR 52,000' },
  { id:'C006', name:'Bina Magar',       pos:'Receptionist',        dept:'Admin',      type:'Contract',  start:'2025-03-15',expiry:'2026-09-15',days:77,risk:'normal',  salary:'NPR 38,000' },
  { id:'C007', name:'Suraj Basnet',     pos:'Driver',              dept:'Operations', type:'Outsource', start:'2025-04-01',expiry:'2026-10-01',days:93,risk:'normal',  salary:'NPR 32,000' },
  { id:'C008', name:'Puja Karmacharya', pos:'Security Supervisor',  dept:'Operations', type:'Contract',  start:'2025-04-20',expiry:'2026-10-20',days:112,risk:'normal', salary:'NPR 44,000' },
]
const RISK_C = { critical:'#ef4444', warning:'#f59e0b', normal:'#10b981' }
const RISK_BG = { critical:'#fef2f2', warning:'#fffbeb', normal:'#f0fdf4' }

export default function ContractExpiryPage() {
  const [contracts, setContracts] = useState(CONTRACTS)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // {type:'renew'|'schedule', contract}
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = contracts.filter(c =>
    (filter==='all'||c.risk===filter) &&
    (!search||c.name.toLowerCase().includes(search.toLowerCase())||c.dept.toLowerCase().includes(search.toLowerCase()))
  )

  const renew = (id) => {
    setContracts(prev=>prev.map(c=>c.id!==id?c:{...c,renewed:true}))
    notify('✅ Contract renewal initiated! HR will send paperwork.'); setModal(null)
  }

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:G,borderRadius:14,padding:'16px 22px',marginBottom:14,color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div><h2 style={{margin:0,fontSize:20,fontWeight:900}}>📄 Contract Expiry Tracker</h2>
            <p style={{margin:'3px 0 0',fontSize:10,opacity:.8}}>Upcoming renewals · Name · Position · Department · Expiry Date · Action</p>
          </div>
          <div style={{display:'flex',gap:12}}>
            <div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:900,color:'#fca5a5'}}>{contracts.filter(c=>c.risk==='critical').length}</div><div style={{fontSize:8,opacity:.8}}>Critical</div></div>
            <div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:900,color:'#fcd34d'}}>{contracts.filter(c=>c.risk==='warning').length}</div><div style={{fontSize:8,opacity:.8}}>Warning</div></div>
            <div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:900}}>{contracts.length}</div><div style={{fontSize:8,opacity:.8}}>Total</div></div>
          </div>
        </div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46'}}>{msg}</div>}

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search name or department..."
          style={{flex:1,minWidth:160,padding:'8px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none'}}/>
        {['all','critical','warning','normal'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'7px 16px',borderRadius:20,border:filter!==f?'1px solid #e2e8f0':'none',background:filter===f?(f==='all'?A:RISK_C[f]):'#fff',color:filter===f?'#fff':(f==='all'?'#475569':RISK_C[f]),fontSize:9,fontWeight:700,cursor:'pointer',textTransform:'capitalize'}}>{f}</button>
        ))}
      </div>

      <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
          <thead><tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
            {['','Name','Position','Department','Type','Contract Period','Expiry Date','Days Left','Status','Action'].map(h=><th key={h} style={{padding:'11px 13px',textAlign:'left',fontSize:9,fontWeight:800,color:'#475569',whiteSpace:'nowrap'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((c,i)=>(
              <tr key={c.id} style={{borderBottom:'1px solid #f1f5f9',background:c.renewed?'#f0fdf4':i%2?'#fafafa':'#fff'}}>
                <td style={{padding:'11px 13px'}}><span style={{fontSize:16}}>{c.risk==='critical'?'🔴':c.risk==='warning'?'🟡':'🟢'}</span></td>
                <td style={{padding:'11px 13px',fontWeight:700,color:'#0f172a'}}>{c.name}</td>
                <td style={{padding:'11px 13px',color:'#374151'}}>{c.pos}</td>
                <td style={{padding:'11px 13px',color:'#475569'}}>{c.dept}</td>
                <td style={{padding:'11px 13px'}}><span style={{fontSize:8,fontWeight:700,padding:'3px 8px',borderRadius:20,background:'#f1f5f9',color:'#475569'}}>{c.type}</span></td>
                <td style={{padding:'11px 13px',fontSize:9,color:'#64748b'}}>{c.start} → {c.expiry}</td>
                <td style={{padding:'11px 13px',fontWeight:700,color:RISK_C[c.risk]}}>{c.expiry}</td>
                <td style={{padding:'11px 13px'}}>
                  <div style={{background:RISK_BG[c.risk],borderRadius:8,padding:'4px 10px',textAlign:'center',fontWeight:900,color:RISK_C[c.risk],fontSize:11,whiteSpace:'nowrap'}}>{c.days} days</div>
                </td>
                <td style={{padding:'11px 13px'}}>
                  {c.renewed?<span style={{fontSize:8,fontWeight:700,padding:'3px 9px',borderRadius:20,background:'#d1fae5',color:'#059669'}}>✅ Renewal Initiated</span>
                  :<span style={{fontSize:8,fontWeight:700,padding:'3px 9px',borderRadius:20,background:RISK_BG[c.risk],color:RISK_C[c.risk]}}>{c.risk==='critical'?'⚡ Urgent':c.risk==='warning'?'⏳ Review':'✓ On Track'}</span>}
                </td>
                <td style={{padding:'11px 13px'}}>
                  {!c.renewed&&<div style={{display:'flex',gap:4}}>
                    <button onClick={()=>setModal({type:'renew',contract:c})} style={{padding:'5px 10px',borderRadius:7,border:'none',background:c.risk==='critical'?'#ef4444':A,color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer'}}>Renew Now</button>
                    <button onClick={()=>setModal({type:'schedule',contract:c})} style={{padding:'5px 10px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:8,cursor:'pointer'}}>Schedule</button>
                  </div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setModal(null)}>
          <div style={{background:'#fff',borderRadius:16,padding:26,width:420,maxWidth:'92vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:900,marginBottom:4}}>{modal.type==='renew'?'🔄 Renew Contract':'📅 Schedule Renewal'}</div>
            <div style={{fontSize:10,color:'#64748b',marginBottom:16}}>{modal.contract.name} · {modal.contract.pos} · {modal.contract.dept}</div>
            <div style={{background:'#f8fafc',borderRadius:10,padding:'12px',marginBottom:16,fontSize:10}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#64748b'}}>Current expiry</span><span style={{fontWeight:700,color:RISK_C[modal.contract.risk]}}>{modal.contract.expiry}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#64748b'}}>Days remaining</span><span style={{fontWeight:700}}>{modal.contract.days} days</span></div>
              <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#64748b'}}>Current salary</span><span style={{fontWeight:700,color:'#059669'}}>{modal.contract.salary}</span></div>
            </div>
            {modal.type==='renew'&&(
              <>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                  {[['New Period','1 Year'],['New Salary',modal.contract.salary],['Start Date',modal.contract.expiry],['End Date','']].map(([l,v])=>(
                    <div key={l}><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <input defaultValue={v} style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/></div>
                  ))}
                </div>
                <button onClick={()=>renew(modal.contract.id)} style={{width:'100%',padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>✅ Initiate Renewal</button>
              </>
            )}
            {modal.type==='schedule'&&(
              <>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Schedule Review Date</label>
                  <input type="date" style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Note</label>
                  <textarea rows={3} placeholder="Reason for scheduling later..." style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:10,outline:'none',resize:'none',boxSizing:'border-box'}}/>
                </div>
                <button onClick={()=>{notify('📅 Review scheduled!');setModal(null)}} style={{width:'100%',padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>📅 Schedule for Later</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
