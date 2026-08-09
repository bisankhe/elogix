// FILE: src/pages/billing/BillingPage.jsx
// eLogix HRMS — Client Billing & Plan Management
// View plan, invoices, usage, support tickets
// eLogix Technologies · www.elogix.com.np
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'

const G = 'linear-gradient(135deg,#065f46 0%,#059669 55%,#34d399 100%)'
const A = '#059669'
const inp = {width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',
  fontSize:11,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}

const PLANS = [
  {id:'trial',    name:'Free Trial', price:0,     emp:10,   storage:'2GB',  ai:50,   color:'#10b981',icon:'🎁',popular:false},
  {id:'starter',  name:'Starter',    price:5000,  emp:50,   storage:'10GB', ai:200,  color:'#0891b2',icon:'🚀',popular:false},
  {id:'growth',   name:'Growth',     price:12000, emp:250,  storage:'50GB', ai:1000, color:'#0369a1',icon:'📈',popular:true},
  {id:'business', name:'Business',   price:25000, emp:500,  storage:'100GB',ai:5000, color:'#7c3aed',icon:'🏢',popular:false},
  {id:'enterprise',name:'Enterprise',price:45000, emp:1000, storage:'200GB',ai:20000,color:'#d97706',icon:'🏛',popular:false},
  {id:'unlimited',name:'Unlimited',  price:75000, emp:99999,storage:'500GB',ai:99999,color:'#dc2626',icon:'⚡',popular:false},
]

const MOCK_INVOICES = [
  {id:'i1',invoice_number:'ELX-202607-COMP-0001',period_month:'2026-07',plan:'growth',total_npr:13560,status:'pending',due_date:'2026-08-15'},
  {id:'i2',invoice_number:'ELX-202606-COMP-0001',period_month:'2026-06',plan:'growth',total_npr:13560,status:'paid',due_date:'2026-07-15',paid_at:'2026-07-10'},
  {id:'i3',invoice_number:'ELX-202605-COMP-0001',period_month:'2026-05',plan:'growth',total_npr:13560,status:'paid',due_date:'2026-06-15',paid_at:'2026-06-12'},
]

export default function BillingPage() {
  const { company, companyPlan } = useAuth()
  const [tab, setTab]     = useState('plan')
  const [msg, setMsg]     = useState('')
  const [showTicket, setShowTicket] = useState(false)
  const [tform, setTform] = useState({subject:'',description:'',priority:'normal',category:'technical'})
  const notify = m=>{setMsg(m);setTimeout(()=>setMsg(''),3500)}
  const currentPlan = PLANS.find(p=>p.id===companyPlan)||PLANS[2]

  return (
    <div style={{fontFamily:'system-ui,sans-serif',minHeight:'100vh',background:'#f0fdf4'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0fdf4',
        border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 18px',fontSize:11,color:'#065f46',
        boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:440}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,padding:'16px 24px',color:'#fff',marginBottom:16,borderRadius:14}}>
        <div style={{fontSize:18,fontWeight:900}}>💰 Billing & Plan</div>
        <div style={{fontSize:10,opacity:.75}}>Manage your eLogix subscription · support@elogix.com.np</div>
        <div style={{display:'flex',gap:14,marginTop:14,flexWrap:'wrap'}}>
          <div style={{background:'rgba(255,255,255,.15)',borderRadius:10,padding:'8px 16px',textAlign:'center'}}>
            <div style={{fontSize:18,fontWeight:900,color:'#d1fae5'}}>{currentPlan.name}</div>
            <div style={{fontSize:9,opacity:.8}}>Current Plan</div>
          </div>
          <div style={{background:'rgba(255,255,255,.15)',borderRadius:10,padding:'8px 16px',textAlign:'center'}}>
            <div style={{fontSize:18,fontWeight:900,color:'#d1fae5'}}>
              NPR {currentPlan.price.toLocaleString()}
            </div>
            <div style={{fontSize:9,opacity:.8}}>per month</div>
          </div>
          <div style={{background:'rgba(255,255,255,.15)',borderRadius:10,padding:'8px 16px',textAlign:'center'}}>
            <div style={{fontSize:18,fontWeight:900,color:'#fde68a'}}>Active ✅</div>
            <div style={{fontSize:9,opacity:.8}}>Account status</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {[['plan','📋 Plan & Usage'],['invoices','📄 Invoices'],['upgrade','⬆️ Upgrade'],['support','🎫 Support']].map(([id,lb])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{padding:'8px 16px',borderRadius:20,border:`1.5px solid ${tab===id?A:'#e2e8f0'}`,
              background:tab===id?A+'15':'#fff',color:tab===id?A:'#64748b',
              fontSize:11,fontWeight:tab===id?800:400,cursor:'pointer'}}>
            {lb}
          </button>
        ))}
      </div>

      {/* ── PLAN & USAGE ── */}
      {tab==='plan'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={{background:'#fff',borderRadius:14,padding:'20px',boxShadow:'0 1px 6px rgba(0,0,0,.06)'}}>
            <div style={{fontWeight:800,fontSize:13,marginBottom:16}}>📊 Usage This Month</div>
            {[
              ['👥','Employees','198','250',79,'#0369a1'],
              ['💾','Storage','42GB','50GB',84,'#7c3aed'],
              ['🤖','AI Requests','347','1,000',35,'#d97706'],
              ['📋','Reports','23','100',23,'#059669'],
            ].map(([ic,lb,used,limit,pct,color])=>(
              <div key={lb} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:11}}>
                  <span style={{fontWeight:700}}>{ic} {lb}</span>
                  <span style={{color:'#64748b'}}>{used} / {limit}</span>
                </div>
                <div style={{height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,
                    background:pct>90?'#dc2626':pct>75?'#d97706':color,
                    borderRadius:4,transition:'width .4s'}}/>
                </div>
                {pct>85&&<div style={{fontSize:9,color:'#dc2626',marginTop:2}}>
                  ⚠️ Approaching limit — consider upgrading
                </div>}
              </div>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:14,padding:'20px',boxShadow:'0 1px 6px rgba(0,0,0,.06)'}}>
            <div style={{fontWeight:800,fontSize:13,marginBottom:14}}>📅 Billing Info</div>
            {[
              ['Current Plan',currentPlan.name.toUpperCase()],
              ['Price',`NPR ${currentPlan.price.toLocaleString()} + 13% VAT = NPR ${Math.round(currentPlan.price*1.13).toLocaleString()}/mo`],
              ['Next Invoice','August 1, 2026'],
              ['Due Date','August 15, 2026'],
              ['Billing Cycle','Monthly'],
              ['Auto-Renew','Enabled ✅'],
              ['eLogix Contact','support@elogix.com.np'],
              ['Portal URL',`${company?.slug||'your-company'}.elogix.com.np`],
            ].map(([lb,v])=>(
              <div key={lb} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',
                borderBottom:'1px solid #f1f5f9',fontSize:11}}>
                <span style={{color:'#64748b'}}>{lb}</span>
                <span style={{fontWeight:700,color:'#0f172a',textAlign:'right',maxWidth:'60%'}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:16}}>
              <button onClick={()=>notify('📧 Billing email sent to admin@company.com')}
                style={{width:'100%',padding:'10px',borderRadius:9,border:'none',background:G,
                  color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                📧 Email Invoice to Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INVOICES ── */}
      {tab==='invoices'&&(
        <div style={{background:'#fff',borderRadius:14,boxShadow:'0 1px 6px rgba(0,0,0,.06)',overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',fontWeight:800,fontSize:13}}>
            📄 Invoice History
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead>
              <tr style={{background:'#f8fafc'}}>
                {['Invoice #','Period','Plan','Amount (incl. VAT)','Status','Due Date','Action'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,fontWeight:700,
                    color:'#374151',borderBottom:'1px solid #f1f5f9'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_INVOICES.map((inv,i)=>{
                const sc={pending:{bg:'#fffbeb',c:'#d97706'},paid:{bg:'#f0fdf4',c:'#059669'},
                  overdue:{bg:'#fef2f2',c:'#dc2626'}}[inv.status]||{}
                return (
                  <tr key={inv.id} style={{background:i%2===0?'#fff':'#fafafa'}}>
                    <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:9}}>{inv.invoice_number}</td>
                    <td style={{padding:'10px 14px',fontWeight:700}}>{inv.period_month}</td>
                    <td style={{padding:'10px 14px',color:'#64748b'}}>{inv.plan}</td>
                    <td style={{padding:'10px 14px',fontWeight:800,color:'#059669'}}>NPR {inv.total_npr.toLocaleString()}</td>
                    <td style={{padding:'10px 14px'}}>
                      <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,
                        padding:'2px 8px',borderRadius:20}}>{inv.status}</span>
                    </td>
                    <td style={{padding:'10px 14px',color:'#64748b',fontSize:10}}>{inv.due_date}</td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>notify(`📄 Invoice ${inv.invoice_number} downloaded`)}
                          style={{padding:'4px 10px',borderRadius:6,border:'none',background:'#eff6ff',
                            color:'#1d4ed8',fontSize:9,fontWeight:700,cursor:'pointer'}}>📥 PDF</button>
                        {inv.status==='pending'&&(
                          <button onClick={()=>notify('💳 Payment portal opening...')}
                            style={{padding:'4px 10px',borderRadius:6,border:'none',background:'#f0fdf4',
                              color:'#059669',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                            💳 Pay via eSewa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── UPGRADE ── */}
      {tab==='upgrade'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14}}>
          {PLANS.map(plan=>{
            const isCurrent = plan.id===companyPlan
            return (
              <div key={plan.id}
                style={{background:isCurrent?plan.color+'08':'#fff',borderRadius:14,padding:'20px',
                  boxShadow:'0 2px 8px rgba(0,0,0,.06)',
                  border:`2px solid ${isCurrent?plan.color:'#e2e8f0'}`,
                  position:'relative',overflow:'hidden'}}>
                {plan.popular&&(
                  <div style={{position:'absolute',top:-1,right:-1,background:'#d97706',
                    color:'#fff',fontSize:8,fontWeight:700,padding:'3px 10px',borderRadius:'0 14px 0 8px'}}>
                    POPULAR
                  </div>
                )}
                {isCurrent&&(
                  <div style={{position:'absolute',top:-1,left:-1,background:plan.color,
                    color:'#fff',fontSize:8,fontWeight:700,padding:'3px 10px',borderRadius:'14px 0 8px 0'}}>
                    CURRENT
                  </div>
                )}
                <div style={{fontSize:28,marginBottom:8}}>{plan.icon}</div>
                <div style={{fontSize:15,fontWeight:900,color:plan.color,marginBottom:2}}>{plan.name}</div>
                <div style={{fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:4}}>
                  {plan.price===0?'Free':
                    <><span style={{fontSize:12,color:'#64748b'}}>NPR </span>{plan.price.toLocaleString()}</>}
                  {plan.price>0&&<span style={{fontSize:10,color:'#94a3b8'}}>/mo</span>}
                </div>
                {plan.price>0&&<div style={{fontSize:9,color:'#94a3b8',marginBottom:12}}>
                  + 13% VAT = NPR {Math.round(plan.price*1.13).toLocaleString()}/mo
                </div>}
                <div style={{fontSize:10,color:'#374151',lineHeight:1.8}}>
                  <div>👥 {plan.emp===99999?'Unlimited':plan.emp} employees</div>
                  <div>💾 {plan.storage} storage</div>
                  <div>🤖 {plan.ai===99999?'Unlimited':plan.ai.toLocaleString()} AI req/mo</div>
                </div>
                {!isCurrent&&(
                  <button onClick={()=>notify(`📧 Upgrade request sent to support@elogix.com.np`)}
                    style={{width:'100%',marginTop:14,padding:'9px',borderRadius:9,border:'none',
                      background:plan.color,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                    {plan.price>currentPlan.price?'⬆️ Upgrade':'⬇️ Downgrade'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── SUPPORT ── */}
      {tab==='support'&&(
        <div style={{maxWidth:600}}>
          <div style={{background:'#fff',borderRadius:14,padding:'20px',
            boxShadow:'0 1px 6px rgba(0,0,0,.06)',marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:13,marginBottom:14}}>🎫 eLogix Support</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
              {[
                ['📧','Email Support','support@elogix.com.np','Standard — 24hr response'],
                ['📞','Phone Support','+977-01-XXXXXXX','Business hours 9AM–6PM NPT'],
                ['💬','Live Chat','chat.elogix.com.np','Priority & Enterprise only'],
                ['📚','Documentation','docs.elogix.com.np','Help articles & guides'],
              ].map(([ic,lb,val,note])=>(
                <div key={lb} style={{background:'#f8fafc',borderRadius:10,padding:'14px'}}>
                  <div style={{fontSize:24,marginBottom:6}}>{ic}</div>
                  <div style={{fontWeight:700,fontSize:11,color:'#0f172a'}}>{lb}</div>
                  <div style={{fontSize:10,color:'#0369a1',fontWeight:600}}>{val}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{note}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setShowTicket(true)}
              style={{width:'100%',padding:'11px',borderRadius:9,border:'none',background:G,
                color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>
              + Raise Support Ticket
            </button>
          </div>
        </div>
      )}

      {/* ── Support Ticket Modal ── */}
      {showTicket&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowTicket(false)}>
          <div style={{background:'#fff',borderRadius:18,width:500,maxWidth:'96vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>🎫 Create Support Ticket</div>
              <div style={{fontSize:10,opacity:.8}}>eLogix team responds within 24 hours</div>
            </div>
            <div style={{padding:'18px 22px'}}>
              {[['Subject *','subject','text'],['Category','category','select'],['Priority','priority','select']].map(([lb,k,t])=>(
                <div key={k} style={{marginBottom:12}}>
                  <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>{lb}</label>
                  {t==='select'?(
                    <select value={tform[k]} onChange={e=>setTform(p=>({...p,[k]:e.target.value}))} style={inp}>
                      {k==='category'?['technical','billing','hr_config','training','other'].map(o=><option key={o}>{o}</option>)
                        :['low','normal','high','critical'].map(o=><option key={o}>{o}</option>)}
                    </select>
                  ):(
                    <input value={tform[k]} onChange={e=>setTform(p=>({...p,[k]:e.target.value}))} style={inp} placeholder={lb.replace(' *','')}/>
                  )}
                </div>
              ))}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:3}}>Description</label>
                <textarea rows={3} value={tform.description} onChange={e=>setTform(p=>({...p,description:e.target.value}))}
                  style={{...inp,resize:'vertical',fontFamily:'inherit'}} placeholder="Describe your issue in detail..."/>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{notify('✅ Support ticket created — eLogix team notified');setShowTicket(false)}}
                  style={{flex:1,padding:'10px',borderRadius:9,border:'none',background:G,
                    color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                  🎫 Submit Ticket
                </button>
                <button onClick={()=>setShowTicket(false)}
                  style={{padding:'10px 16px',borderRadius:9,border:'1px solid #e2e8f0',
                    background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
