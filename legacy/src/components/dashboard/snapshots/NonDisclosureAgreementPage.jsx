// FILE: NonDisclosureAgreementPage.jsx — NDA (Non-Disclosure Agreement)
// Every employee must sign before accessing HRMS. Digital signature required.
import { useState } from 'react'

const G = 'linear-gradient(135deg,#1c1917 0%,#292524 60%,#57534e 100%)'
const A = '#292524'

const NDA_TEXT = `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into between [Company Name] ("Company") and the undersigned employee or user ("Recipient").

1. CONFIDENTIAL INFORMATION
The Recipient agrees to keep strictly confidential all information accessed through this HRMS platform including but not limited to: employee personal data, salary information, performance records, medical data, disciplinary records, company financials, business strategies, client information, and trade secrets.

2. OBLIGATIONS
The Recipient shall:
(a) Not disclose any Confidential Information to any third party without prior written consent
(b) Use Confidential Information solely for the purpose of performing job duties
(c) Report any unauthorized disclosure immediately to HR
(d) Return or destroy all Confidential Information upon employment termination

3. DIGITAL SYSTEMS SECURITY
The Recipient shall not share login credentials, take screenshots of restricted data, or access data beyond their role-based permissions.

4. DURATION
This Agreement remains in effect during employment and for 3 years after termination.

5. PENALTIES
Breach of this Agreement may result in disciplinary action up to and including dismissal, and civil/criminal liability under Nepal's Privacy Act 2075 and Electronic Transactions Act 2063.

6. GOVERNING LAW
This Agreement is governed by the laws of Nepal.`

const SIGNED_USERS = [
  { id:'n1', name:'Gita Maharjan', emp_id:'EMP-0142', signed_date:'2025-06-13', method:'Digital (HRMS)', ip:'192.168.1.45', status:'signed' },
  { id:'n2', name:'Sunita Rai', emp_id:'EMP-0141', signed_date:'2025-06-15', method:'Digital (HRMS)', ip:'192.168.1.62', status:'signed' },
  { id:'n3', name:'Hari Adhikari', emp_id:'EMP-0143', signed_date:null, method:null, ip:null, status:'pending' },
]

export default function NonDisclosureAgreementPage() {
  const [tab, setTab]           = useState('sign')
  const [agreed, setAgreed]     = useState(false)
  const [sigName, setSigName]   = useState('')
  const [signed, setSigned]     = useState(false)
  const [msg, setMsg]           = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const signNDA = () => {
    if (!agreed) { notify('⚠️ You must check the agreement checkbox first'); return }
    if (!sigName.trim()) { notify('⚠️ Please type your full name to sign'); return }
    setSigned(true)
    notify('✅ NDA signed digitally. You now have full HRMS access.')
  }

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:G,borderRadius:14,padding:'18px 24px',marginBottom:16,color:'#fff'}}>
        <div style={{fontSize:18,fontWeight:900}}>🔒 Non-Disclosure Agreement</div>
        <div style={{fontSize:11,opacity:.8,marginTop:3}}>All HRMS users must sign this NDA before accessing any data. Nepal Privacy Act 2075 compliant.</div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{msg}</div>}

      {!signed&&(
        <div style={{background:'#fef9c3',border:'2px solid #fde68a',borderRadius:12,padding:'12px 16px',marginBottom:14,fontSize:12,color:'#92400e',display:'flex',gap:10}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div><strong>NDA Signature Required:</strong> You cannot access, view, edit, or use any features of this HRMS until you have read and signed this Non-Disclosure Agreement.</div>
        </div>
      )}

      <div style={{display:'flex',gap:2,background:'#f1f5f9',padding:4,borderRadius:12,marginBottom:14,width:'fit-content'}}>
        {[['sign','✍️ Sign NDA'],['status','📋 Signature Status']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:'9px 20px',borderRadius:9,border:'none',cursor:'pointer',fontSize:11,background:tab===k?'#fff':'transparent',color:tab===k?A:'#64748b',fontWeight:tab===k?700:400,boxShadow:tab===k?'0 1px 4px rgba(0,0,0,.1)':'none'}}>{l}</button>
        ))}
      </div>

      {tab==='sign'&&(
        <div>
          {signed?(
            <div style={{background:'#f0fdf4',border:'2px solid #bbf7d0',borderRadius:16,padding:'32px',textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:12}}>✅</div>
              <div style={{fontSize:18,fontWeight:900,color:'#065f46',marginBottom:6}}>NDA Signed Successfully</div>
              <div style={{fontSize:12,color:'#15803d',marginBottom:8}}>Signed as: {sigName} · {new Date().toLocaleDateString()}</div>
              <div style={{fontSize:11,color:'#64748b'}}>You now have full access to the HRMS based on your role permissions.</div>
            </div>
          ):(
            <div>
              <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'20px 24px',marginBottom:14,maxHeight:300,overflowY:'auto'}}>
                <pre style={{fontSize:10,color:'#374151',lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'Georgia,serif'}}>{NDA_TEXT}</pre>
              </div>
              <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'20px 24px'}}>
                <div style={{marginBottom:14}}>
                  <label style={{display:'flex',gap:10,alignItems:'flex-start',cursor:'pointer',fontSize:11,color:'#374151',lineHeight:1.6}}>
                    <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{accentColor:A,marginTop:2,flexShrink:0,width:16,height:16}}/>
                    <span>I have read, understood, and agree to the terms of this Non-Disclosure Agreement. I understand that breach of this agreement may result in disciplinary action including dismissal.</span>
                  </label>
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Type your full name to digitally sign *</label>
                  <input value={sigName} onChange={e=>setSigName(e.target.value)} placeholder="Full Name (as in your employment record)"
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <button onClick={signNDA} style={{width:'100%',padding:'12px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                  ✍️ I Agree — Sign Non-Disclosure Agreement
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab==='status'&&(
        <div style={{display:'grid',gap:10}}>
          {SIGNED_USERS.map(u=>(
            <div key={u.id} style={{background:'#fff',border:`1px solid ${u.status==='signed'?'#bbf7d0':'#fde68a'}`,borderRadius:12,padding:'14px 18px',display:'flex',gap:14,alignItems:'center',borderLeft:`4px solid ${u.status==='signed'?'#10b981':'#f59e0b'}`}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{u.name} <span style={{fontSize:10,color:'#94a3b8'}}>{u.emp_id}</span></div>
                {u.status==='signed'
                  ? <div style={{fontSize:10,color:'#64748b'}}>✅ Signed: {u.signed_date} · Method: {u.method} · IP: {u.ip}</div>
                  : <div style={{fontSize:10,color:'#b45309'}}>⏳ NDA not yet signed — HRMS access restricted</div>}
              </div>
              {u.status==='pending'&&(
                <button onClick={()=>notify('📧 NDA signing reminder sent to '+u.name+' via Email, WhatsApp & Viber')} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#f59e0b',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📧 Send Reminder</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
