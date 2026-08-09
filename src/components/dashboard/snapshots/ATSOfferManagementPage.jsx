// FILE: ATSOfferManagementPage.jsx
// ATS — Offer Management: AI offer letter, digital signature, accept/reject, counter-offer, joining

import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const G  = 'linear-gradient(135deg,#064e3b 0%,#065f46 60%,#047857 100%)'
const GA = 'linear-gradient(135deg,#065f46,#10b981)'
const P  = '#065f46'

const CANDIDATES = [
  { id:'c1', name:'Gita Maharjan',  job:'Senior Software Engineer', dept:'Engineering', avatar:'GM', aiScore:96, panelScore:91, salaryOffer:'NPR 110,000', joiningBonus:'NPR 50,000', equity:'0.05%', startDate:'2024-02-15', probation:'6 months', status:'Accepted',    offerSent:'2024-01-24', acceptedDate:'2024-01-25', signedDate:'2024-01-25' },
  { id:'c2', name:'Rajan Shrestha', job:'Senior Software Engineer', dept:'Engineering', avatar:'RS', aiScore:94, panelScore:88, salaryOffer:'NPR 95,000',  joiningBonus:'NPR 30,000', equity:'0%',    startDate:'2024-02-20', probation:'6 months', status:'Pending',    offerSent:'2024-01-25', acceptedDate:null,           signedDate:null },
  { id:'c3', name:'Priya Tamang',   job:'Senior Software Engineer', dept:'Engineering', avatar:'PT', aiScore:91, panelScore:86, salaryOffer:'NPR 85,000',  joiningBonus:'NPR 20,000', equity:'0%',    startDate:'2024-03-01', probation:'6 months', status:'Counter',    offerSent:'2024-01-24', acceptedDate:null,           signedDate:null },
  { id:'c4', name:'Maya Pradhan',   job:'Finance Manager',          dept:'Finance',     avatar:'MP', aiScore:92, panelScore:90, salaryOffer:'NPR 120,000', joiningBonus:'NPR 60,000', equity:'0%',    startDate:'2024-02-10', probation:'6 months', status:'Joined',     offerSent:'2024-01-20', acceptedDate:'2024-01-22',  signedDate:'2024-01-22' },
]

const STATUS_CFG = {
  Draft:    { bg:'#fef9c3', cl:'#854d0e', label:'📝 Draft'     },
  Pending:  { bg:'#dbeafe', cl:'#1e40af', label:'⏳ Pending'   },
  Accepted: { bg:'#dcfce7', cl:'#15803d', label:'✅ Accepted'  },
  Rejected: { bg:'#fee2e2', cl:'#dc2626', label:'❌ Rejected'  },
  Counter:  { bg:'#fffbeb', cl:'#92400e', label:'💬 Counter'   },
  Joined:   { bg:'#d1fae5', cl:'#065f46', label:'🎉 Joined'    },
  Withdrawn:{ bg:'#f8fafc', cl:'#64748b', label:'⛔ Withdrawn' },
}

const OFFER_TEMPLATE = (c) => `OFFER LETTER

Date: ${new Date().toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'})}
Ref: OL-${Date.now().toString().slice(-6)}

${c.name}
[Address]

Dear ${c.name.split(' ')[0]},

SUBJECT: OFFER OF EMPLOYMENT — ${c.job}

We are delighted to offer you the position of ${c.job} at [Company Name], subject to the conditions outlined in this letter.

COMPENSATION & BENEFITS
━━━━━━━━━━━━━━━━━━━━━━━━
Monthly Gross Salary  : ${c.salaryOffer}
Joining Bonus         : ${c.joiningBonus} (payable upon joining)
Equity / ESOP         : ${c.equity}
Provident Fund        : As per Nepal Labour Act 2074
Gratuity              : 8.33% of basic salary per annum
Medical Insurance     : Family floater (up to NPR 5 Lakhs)
Annual Leave          : 18 days + 12 sick leave days

EMPLOYMENT TERMS
━━━━━━━━━━━━━━━━━━━━━━━━
Department            : ${c.dept}
Reporting to          : Department Head
Date of Joining       : ${c.startDate}
Probation Period      : ${c.probation}
Work Location         : Kathmandu, Nepal (Hybrid)
Working Hours         : 8 hours/day, 48 hours/week (LA2074 S.28)

CONDITIONS
━━━━━━━━━━━━━━━━━━━━━━━━
This offer is conditional upon:
1. Satisfactory reference checks from previous employers
2. Clean background verification (criminal & academic)
3. Submission of all original documents before joining
4. Medical fitness certificate

This offer is valid for 7 days from the date of issue. Please digitally sign and return within this period to confirm your acceptance.

We look forward to welcoming you to our team!

Warm regards,

[Authorised Signatory]
Chief Human Resources Officer
[Company Name]

━━━━━━━━━━━━━━━━━━━━━━━━
Digital Signature: [Pending]
Accepted By: [Pending]
Acceptance Date: [Pending]
━━━━━━━━━━━━━━━━━━━━━━━━`

export default function ATSOfferManagementPage() {
  const { navTo } = useApp()
  const [selected, setSelected]  = useState(CANDIDATES[0])
  const [view,     setView]      = useState('list')
  const [genLetter,setGenLetter] = useState(false)
  const [letter,   setLetter]    = useState('')
  const [sending,  setSending]   = useState(false)
  const [msg,      setMsg]       = useState('')
  const [sigName,  setSigName]   = useState('')
  const [signed,   setSigned]    = useState(false)
  const [salaryEdit, setSalaryEdit] = useState('')

  const notify = (m) => { setMsg(m); setTimeout(()=>setMsg(''),4000) }

  const generateLetter = async () => {
    setGenLetter(true)
    await new Promise(r=>setTimeout(r,1500))
    setLetter(OFFER_TEMPLATE(selected))
    setGenLetter(false)
    notify('✅ AI-generated offer letter ready. Review and send.')
  }

  const sendOffer = async () => {
    setSending(true)
    await new Promise(r=>setTimeout(r,1500))
    setSending(false)
    notify(`✅ Offer letter sent to ${selected.name} via Email + WhatsApp! Digital signature link included. Candidate has 7 days to respond.`)
  }

  const signOffer = () => {
    if (!sigName.trim()) { notify('Please type your full name to sign'); return }
    setSigned(true)
    notify('🎉 Offer accepted and digitally signed! HR notified. Welcome email will be sent automatically.')
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, fontFamily:'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background:G, borderRadius:16, padding:'18px 24px', boxShadow:'0 4px 20px rgba(6,79,60,.3)' }}>
        <div style={{ fontSize:8, color:'rgba(255,255,255,.5)', marginBottom:3 }}>ATS · Recruitment & Hiring</div>
        <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>📋 Offer Management</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:2 }}>AI offer letter · Digital signature · Accept/Reject/Counter · Auto-notifications · Joining tracker</div>
        <div style={{ display:'flex', gap:10, marginTop:12, flexWrap:'wrap', alignItems:'center' }}>
          {[{l:'Offers Sent',v:4},{l:'Accepted',v:2},{l:'Pending',v:1},{l:'Counter-Offer',v:1}].map((s,i)=>(
            <div key={i} style={{ background:'rgba(255,255,255,.12)', borderRadius:10, padding:'5px 12px' }}>
              <div style={{ fontSize:8, color:'rgba(255,255,255,.6)' }}>{s.l}</div>
              <div style={{ fontSize:16, fontWeight:900, color:'#fff' }}>{s.v}</div>
            </div>
          ))}
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            {[['list','📋 All Offers'],['create','+ New Offer']].map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)} style={{ padding:'7px 14px', borderRadius:10, border:'none', background:view===v?'rgba(255,255,255,.3)':'rgba(255,255,255,.1)', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>{l}</button>
            ))}
          </div>
        </div>
        {msg && <div style={{ marginTop:10, fontSize:10, color:'rgba(255,255,255,.95)', fontWeight:700, background:'rgba(255,255,255,.15)', padding:'8px 14px', borderRadius:8 }}>{msg}</div>}
      </div>

      {/* ── OFFER LIST ── */}
      {view==='list' && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {CANDIDATES.map(c => {
            const sc = STATUS_CFG[c.status] || STATUS_CFG.Draft
            return (
              <div key={c.id} style={{ background:'#fff', borderRadius:14, padding:'16px 20px', border:'1px solid #e2e8f0', boxShadow:'0 1px 6px rgba(0,0,0,.04)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                  <div style={{ width:40, height:40, borderRadius:11, background:GA, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:900, flexShrink:0 }}>{c.avatar}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:800, color:'#0f172a' }}>{c.name}</span>
                      <span style={{ fontSize:9, fontWeight:700, padding:'3px 10px', borderRadius:10, background:sc.bg, color:sc.cl }}>{sc.label}</span>
                    </div>
                    <div style={{ fontSize:10, color:'#64748b', marginBottom:6 }}>{c.job} · {c.dept}</div>
                    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                      {[['Salary',c.salaryOffer],['Joining Bonus',c.joiningBonus],['Start Date',c.startDate],['Offer Sent',c.offerSent]].map(([l,v])=>(
                        <div key={l}><span style={{ fontSize:8, color:'#94a3b8' }}>{l}: </span><span style={{ fontSize:9, fontWeight:700, color:'#0f172a' }}>{v}</span></div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' }}>
                    {c.status==='Pending'&&<button onClick={()=>notify('📧 Reminder sent via Email + WhatsApp!')} style={{ padding:'6px 12px', borderRadius:9, border:'none', background:'#eff6ff', color:'#1e40af', fontSize:9, fontWeight:700, cursor:'pointer' }}>📧 Remind</button>}
                    {c.status==='Counter'&&<button onClick={()=>{setSelected(c);setView('create')}} style={{ padding:'6px 12px', borderRadius:9, border:'none', background:'#fffbeb', color:'#92400e', fontSize:9, fontWeight:700, cursor:'pointer' }}>💬 Counter</button>}
                    <button onClick={()=>{setSelected(c);setView('create')}} style={{ padding:'6px 12px', borderRadius:9, border:'none', background:GA, color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>View →</button>
                  </div>
                </div>
                {c.status==='Accepted'&&c.signedDate&&(
                  <div style={{ marginTop:10, padding:'8px 12px', background:'#f0fdf4', borderRadius:9, fontSize:9, color:'#15803d', fontWeight:600 }}>
                    ✍️ Digitally signed on {c.signedDate} · 🎉 Joining on {c.startDate}
                  </div>
                )}
                {c.status==='Counter'&&(
                  <div style={{ marginTop:10, padding:'8px 12px', background:'#fffbeb', borderRadius:9, fontSize:9, color:'#92400e', fontWeight:600 }}>
                    💬 Candidate requested salary revision to NPR 95,000. Current offer: {c.salaryOffer}. Pending HR decision.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── CREATE / VIEW OFFER ── */}
      {view==='create' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:14 }}>
          {/* Letter */}
          <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:4 }}>📋 Offer Letter — {selected.name}</div>
            <div style={{ fontSize:9, color:'#64748b', marginBottom:14 }}>{selected.job} · {selected.dept} · Salary: {salaryEdit||selected.salaryOffer}</div>

            {!letter ? (
              <div style={{ textAlign:'center', padding:'40px 0' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📄</div>
                <div style={{ fontSize:12, fontWeight:700, color:'#0f172a', marginBottom:6 }}>Generate AI Offer Letter</div>
                <div style={{ fontSize:10, color:'#64748b', marginBottom:16 }}>AI will create a professional, legally compliant offer letter based on candidate and position details</div>
                <button onClick={generateLetter} disabled={genLetter} style={{ padding:'11px 28px', borderRadius:11, border:'none', background:genLetter?'#e2e8f0':GA, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8, margin:'0 auto' }}>
                  {genLetter?<><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite'}}/>Generating...</>:'🤖 Generate Offer Letter'}
                </button>
              </div>
            ) : (
              <>
                <textarea value={letter} onChange={e=>setLetter(e.target.value)} rows={30}
                  style={{ width:'100%', padding:'16px 18px', borderRadius:11, border:'1px solid #e2e8f0', fontSize:11, lineHeight:1.9, fontFamily:'"Times New Roman",Georgia,serif', resize:'vertical', outline:'none', boxSizing:'border-box', color:'#0f172a', background:'#fafafa' }}/>

                {/* Digital Signature */}
                {!signed ? (
                  <div style={{ marginTop:14, padding:'16px', background:'#f0fdf4', borderRadius:12, border:'1px solid #bbf7d0' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#15803d', marginBottom:8 }}>✍️ Digital Signature — Candidate Sign-off</div>
                    <div style={{ fontSize:9, color:'#64748b', marginBottom:10 }}>By typing your full name below, you confirm that you have read and accept the terms of this offer.</div>
                    <input value={sigName} onChange={e=>setSigName(e.target.value)} placeholder="Type your full name to sign..." style={{ width:'100%', padding:'10px 14px', borderRadius:9, border:'1px solid #bbf7d0', fontSize:12, fontStyle:'italic', outline:'none', boxSizing:'border-box', fontFamily:'cursive', marginBottom:10 }}/>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={signOffer} style={{ flex:2, padding:'10px', borderRadius:10, border:'none', background:GA, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>✅ Accept & Sign Digitally</button>
                      <button style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer' }}>❌ Decline Offer</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop:14, padding:'16px', background:'#dcfce7', borderRadius:12, border:'1px solid #86efac', textAlign:'center' }}>
                    <div style={{ fontSize:24, marginBottom:6 }}>🎉</div>
                    <div style={{ fontSize:14, fontWeight:900, color:'#15803d' }}>Offer Accepted & Signed!</div>
                    <div style={{ fontSize:10, color:'#15803d', marginTop:4 }}>Welcome to the team, {selected.name}! Joining date: {selected.startDate}</div>
                    <div style={{ fontSize:9, color:'#15803d', marginTop:4 }}>Signed by: <strong>{sigName}</strong> · {new Date().toLocaleString('en-GB')}</div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:12 }}>💰 Offer Details</div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:9, color:'#94a3b8', display:'block', marginBottom:3 }}>Monthly Salary</label>
                <input value={salaryEdit||selected.salaryOffer} onChange={e=>setSalaryEdit(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:11, fontWeight:700, outline:'none', boxSizing:'border-box' }}/>
              </div>
              {[['Joining Bonus',selected.joiningBonus],['Start Date',selected.startDate],['Probation',selected.probation],['Equity/ESOP',selected.equity],['AI Score',selected.aiScore+'%'],['Panel Score',selected.panelScore+'/100']].map(([l,v])=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f8fafc' }}>
                  <span style={{ fontSize:9, color:'#94a3b8' }}>{l}</span>
                  <span style={{ fontSize:9, fontWeight:700, color:'#0f172a' }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:10 }}>⚡ Actions</div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                <button onClick={generateLetter} disabled={genLetter} style={{ padding:'10px', borderRadius:10, border:'none', background:'#eff6ff', color:'#1e40af', fontSize:10, fontWeight:700, cursor:'pointer' }}>🤖 Regenerate Offer Letter</button>
                <button onClick={sendOffer} disabled={sending||!letter} style={{ padding:'10px', borderRadius:10, border:'none', background:sending||!letter?'#e2e8f0':GA, color:'#fff', fontSize:10, fontWeight:700, cursor:sending||!letter?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  {sending?<><span style={{width:12,height:12,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite'}}/>Sending...</>:'📧 Send via Email + WhatsApp'}
                </button>
                <button style={{ padding:'10px', borderRadius:10, border:'none', background:'#f5f3ff', color:'#6d28d9', fontSize:10, fontWeight:700, cursor:'pointer' }}>📥 Download PDF</button>
                <button onClick={()=>setView('list')} style={{ padding:'10px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontSize:10, cursor:'pointer' }}>← Back to List</button>
              </div>
            </div>

            {/* Offer timeline */}
            <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:10 }}>📅 Offer Timeline</div>
              {[
                { label:'Offer Generated', date:'2024-01-24', done:true, icon:'📋' },
                { label:'Sent to Candidate', date:'2024-01-24', done:true, icon:'📧' },
                { label:'Candidate Viewed', date:'2024-01-24', done:true, icon:'👁️' },
                { label:'Signed & Accepted', date:selected.signedDate||'—', done:!!selected.signedDate, icon:'✍️' },
                { label:'Joining Confirmed', date:selected.startDate, done:selected.status==='Joined', icon:'🎉' },
              ].map((t,i)=>(
                <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', paddingBottom:8, position:'relative' }}>
                  {i<4&&<div style={{ position:'absolute', left:11, top:22, width:2, height:'100%', background:t.done?'#10b981':'#e2e8f0' }}/>}
                  <div style={{ width:24, height:24, borderRadius:'50%', background:t.done?'#f0fdf4':'#f8fafc', border:`2px solid ${t.done?'#10b981':'#e2e8f0'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, flexShrink:0 }}>{t.done?'✓':t.icon}</div>
                  <div>
                    <div style={{ fontSize:10, fontWeight:t.done?700:400, color:t.done?'#15803d':'#94a3b8' }}>{t.label}</div>
                    <div style={{ fontSize:8, color:'#94a3b8' }}>{t.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
