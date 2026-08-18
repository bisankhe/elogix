// FILE: src/pages/billing/BillingPage.jsx
// eLogix HRMS — Subscription Plan & Billing
// 6 plans: Trial → Starter → Growth → Business → Enterprise → Unlimited
// Plan gates features/modules; SuperAdmin assigns roles within plan limits
// eLogix Technologies · www.elogix.com.np
import { useState } from 'react'
import { useAuth }  from '../../context/AuthContext.jsx'
import { PLANS, PLAN_LEVELS, FEATURE_LABELS, planHasFeature } from '../../data/planConfig.js'

const G  = 'linear-gradient(135deg,#065f46,#059669,#34d399)'
const A  = '#059669'

const MOCK_INVOICES = [
  { id:'i1', no:'ELX-202607-0001', period:'July 2026',  plan:'growth',   amt:13560, status:'pending', due:'2026-08-15' },
  { id:'i2', no:'ELX-202606-0001', period:'June 2026',  plan:'growth',   amt:13560, status:'paid',    due:'2026-07-15', paid:'2026-07-10' },
  { id:'i3', no:'ELX-202605-0001', period:'May 2026',   plan:'growth',   amt:13560, status:'paid',    due:'2026-06-15', paid:'2026-06-12' },
  { id:'i4', no:'ELX-202504-0001', period:'April 2026', plan:'starter',  amt:5750,  status:'paid',    due:'2026-05-15', paid:'2026-05-08' },
]

const MOCK_USAGE = {
  employees_used: 47,
  storage_used: '18.4 GB',
  ai_used: 612,
  api_calls: 0,
  payslips_generated: 47,
  reports_run: 23,
}

const ADDONS_ACTIVE = []

export default function BillingPage() {
  const { company, companyPlan: ctxPlan } = useAuth()
  const [tab,        setTab]        = useState('overview')
  const REFERRAL_CODE = company?.referral_code || 'ELX-REF-' + Math.random().toString(36).substr(2,6).toUpperCase()
  const [planId,     setPlanId]     = useState(ctxPlan || 'growth')
  const [msg,        setMsg]        = useState('')
  const [upgrading,  setUpgrading]  = useState(null)
  const [showContact,setShowContact]= useState(false)
  const [addons,     setAddons]     = useState(ADDONS_ACTIVE)

  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3500) }
  const plan = PLANS[planId] || PLANS.growth
  const planLevel = PLAN_LEVELS[planId] || 0

  const usagePct = (used, max) => max === 'Unlimited' || max === 999999
    ? 5 : Math.min(100, Math.round((Number(String(used).replace(/\D/g,'')) / Number(String(max).replace(/\D/g,''))) * 100))

  const handleUpgrade = (newPlanId) => {
    if (PLAN_LEVELS[newPlanId] <= planLevel) { notify('⚠️ Select a higher plan to upgrade'); return }
    setUpgrading(newPlanId)
    setTimeout(() => {
      setPlanId(newPlanId)
      setUpgrading(null)
      notify(`✅ Upgraded to ${PLANS[newPlanId].name}! Refreshing access...`)
    }, 1200)
  }

  const TABS = [
    { id:'overview',  label:'📋 Overview'   },
    { id:'plans',     label:'💎 Plans'      },
    { id:'features',  label:'✅ Features'   },
    { id:'invoices',  label:'📄 Invoices'   },
    { id:'addons',    label:'➕ Add-ons'    },
    { id:'support',   label:'🎫 Support'    },
  ]

  return (
    <div style={{fontFamily:'system-ui,sans-serif',background:'#f0fdf4',minHeight:'100vh',padding:'0 0 40px'}}>
      {msg && (
        <div style={{position:'fixed',bottom:20,right:20,zIndex:9999,
          background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,
          padding:'10px 18px',fontSize:11,color:'#065f46',
          boxShadow:'0 4px 16px rgba(0,0,0,.12)',fontWeight:600,maxWidth:420}}>{msg}</div>
      )}

      {/* ── Header ── */}
      <div style={{background:G,padding:'18px 24px',color:'#fff',borderRadius:'0 0 16px 16px',marginBottom:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:20,fontWeight:900,marginBottom:3}}>💰 Billing & Subscription</div>
            <div style={{fontSize:11,opacity:.75}}>{company?.name || 'Demo Company'} · eLogix HRMS · www.elogix.com.np</div>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {[
              { label:'Current Plan',  val: plan.name,             sub: plan.tagline      },
              { label:'Monthly',       val: `NPR ${plan.priceNPR.toLocaleString()}`, sub:'inc. VAT'  },
              { label:'Employees',     val: MOCK_USAGE.employees_used+'/'+plan.employees, sub:'active'   },
              { label:'AI Credits',    val: MOCK_USAGE.ai_used+'/'+plan.aiCredits,        sub:'this month'},
            ].map(({label,val,sub})=>(
              <div key={label} style={{background:'rgba(255,255,255,.15)',borderRadius:10,
                padding:'8px 16px',textAlign:'center',minWidth:100}}>
                <div style={{fontSize:15,fontWeight:900,color:'#d1fae5'}}>{val}</div>
                <div style={{fontSize:9,opacity:.75}}>{label}</div>
                <div style={{fontSize:8,opacity:.5}}>{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan badge */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginTop:14,flexWrap:'wrap'}}>
          <div style={{background:'rgba(255,255,255,.2)',borderRadius:20,
            padding:'4px 14px',fontSize:11,fontWeight:800,display:'flex',alignItems:'center',gap:6}}>
            {plan.icon} {plan.name} Plan
            {plan.popular && <span style={{background:'#fde68a',color:'#78350f',
              fontSize:8,padding:'1px 6px',borderRadius:10,fontWeight:900}}>POPULAR</span>}
          </div>
          <div style={{fontSize:10,opacity:.7}}>{plan.support}</div>
          <div style={{marginLeft:'auto',fontSize:10,opacity:.7}}>SLA: {plan.sla}</div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginTop:14,flexWrap:'wrap'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:'6px 14px',borderRadius:20,border:'none',cursor:'pointer',
                fontSize:11,fontWeight:700,transition:'all .15s',
                background:tab===t.id?'#fff':'rgba(255,255,255,.18)',
                color:tab===t.id?A:'#fff'}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'16px 20px'}}>

        {/* ════ OVERVIEW TAB ════ */}
        {tab==='overview' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {/* Usage stats */}
            <div style={{background:'#fff',borderRadius:12,padding:'18px 20px',
              boxShadow:'0 2px 8px rgba(0,0,0,.06)',gridColumn:'1/-1'}}>
              <div style={{fontSize:13,fontWeight:800,color:'#374151',marginBottom:16}}>📊 Current Usage</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14}}>
                {[
                  { label:'Employees',      used:MOCK_USAGE.employees_used, max:plan.employees,  unit:'users',    icon:'👥', color:'#0369a1' },
                  { label:'Storage',        used:MOCK_USAGE.storage_used,   max:plan.storage,     unit:'',         icon:'💾', color:'#7c3aed' },
                  { label:'AI Credits',     used:MOCK_USAGE.ai_used,        max:plan.aiCredits,   unit:'queries',  icon:'🤖', color:'#059669' },
                  { label:'Payslips',       used:MOCK_USAGE.payslips_generated, max:plan.limits?.payslips||50, unit:'this month', icon:'💰', color:'#d97706' },
                ].map(({label,used,max,unit,icon,color})=>{
                  const pct = usagePct(used, max)
                  const isUnlimited = max === 'Unlimited' || max === 999999
                  return (
                    <div key={label} style={{background:'#f8fafc',borderRadius:10,padding:'14px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                        <div style={{fontSize:11,fontWeight:700,color:'#374151',display:'flex',gap:6,alignItems:'center'}}>
                          <span style={{fontSize:16}}>{icon}</span>{label}
                        </div>
                        <span style={{fontSize:10,fontWeight:700,color:pct>85?'#dc2626':pct>60?'#d97706':color}}>
                          {isUnlimited ? '∞' : `${pct}%`}
                        </span>
                      </div>
                      <div style={{height:6,background:'#e2e8f0',borderRadius:6,overflow:'hidden',marginBottom:6}}>
                        <div style={{height:'100%',width:`${isUnlimited?5:pct}%`,
                          background:pct>85?'#dc2626':pct>60?'#f59e0b':color,
                          borderRadius:6,transition:'width .5s'}}/>
                      </div>
                      <div style={{fontSize:10,color:'#64748b'}}>
                        {used} / {isUnlimited?'Unlimited':max} {unit}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Plan info */}
            <div style={{background:'#fff',borderRadius:12,padding:'18px 20px',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
              <div style={{fontSize:13,fontWeight:800,color:'#374151',marginBottom:14}}>🗓 Subscription Details</div>
              {[
                ['Plan',         `${plan.icon} ${plan.name}`],
                ['Billing',      plan.billingCycle],
                ['Monthly fee',  `NPR ${plan.priceNPR.toLocaleString()} + VAT`],
                ['Next invoice', 'September 15, 2026'],
                ['Storage',      plan.storage],
                ['Support',      plan.support],
                ['SLA',          plan.sla],
              ].map(([k,v])=>(
                <div key={k} style={{display:'flex',padding:'8px 0',borderBottom:'1px solid #f1f5f9',fontSize:12}}>
                  <span style={{color:'#64748b',minWidth:110}}>{k}</span>
                  <span style={{fontWeight:600,color:'#0f172a'}}>{v}</span>
                </div>
              ))}
              <button onClick={()=>setTab('plans')}
                style={{width:'100%',marginTop:16,padding:'10px',borderRadius:10,border:'none',
                  background:G,color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                ⬆️ View Upgrade Options
              </button>
            </div>

            {/* Plan modules */}
            <div style={{background:'#fff',borderRadius:12,padding:'18px 20px',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
              <div style={{fontSize:13,fontWeight:800,color:'#374151',marginBottom:14}}>📦 Included Modules</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {[
                  {id:'dashboard',      icon:'🏠',label:'Dashboard'},
                  {id:'ai-assistant',   icon:'🤖',label:'AI Assistant'},
                  {id:'org-mgmt',       icon:'🏢',label:'Org Management'},
                  {id:'emp-lifecycle',  icon:'👤',label:'Employee Lifecycle'},
                  {id:'workforce-ops',  icon:'⏰',label:'Workforce Ops'},
                  {id:'perf-talent',    icon:'🎯',label:'Performance'},
                  {id:'emp-experience', icon:'❤️',label:'Exp & Culture'},
                  {id:'hr-services',    icon:'🛎',label:'HR Services'},
                  {id:'finance-assets', icon:'💰',label:'Finance & Assets'},
                  {id:'compliance',     icon:'⚖️',label:'Compliance'},
                  {id:'reports',        icon:'📊',label:'Reports'},
                  {id:'sys-admin',      icon:'⚙️',label:'System Admin'},
                ].map(m=>{
                  const has = plan.modules==='all' || (Array.isArray(plan.modules)&&plan.modules.includes(m.id))
                  return (
                    <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',
                      borderRadius:8,background:has?'#f0fdf4':'#f8fafc',
                      border:`1px solid ${has?'#bbf7d0':'#f1f5f9'}`}}>
                      <span style={{fontSize:14,opacity:has?1:.4}}>{m.icon}</span>
                      <span style={{fontSize:10,fontWeight:600,color:has?'#065f46':'#94a3b8'}}>{m.label}</span>
                      <span style={{marginLeft:'auto',fontSize:11,color:has?'#16a34a':'#e2e8f0'}}>
                        {has?'✓':'✕'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════ PLANS TAB ════ */}
        {tab==='plans' && (
          <div>
            <div style={{textAlign:'center',marginBottom:20}}>
              <div style={{fontSize:16,fontWeight:900,color:'#0f172a'}}>Choose Your Plan</div>
              <div style={{fontSize:12,color:'#64748b',marginTop:4}}>
                Upgrade anytime · Prices in NPR · 13% VAT applied · Annual billing saves 20%
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
              {Object.values(PLANS).map(p=>{
                const isCurrent = p.id === planId
                const isLower   = PLAN_LEVELS[p.id] < planLevel
                const isHigher  = PLAN_LEVELS[p.id] > planLevel
                return (
                  <div key={p.id} style={{background:'#fff',borderRadius:14,
                    border:`2px solid ${isCurrent?p.color:'#e2e8f0'}`,
                    boxShadow:isCurrent?`0 4px 20px ${p.color}30`:'0 2px 8px rgba(0,0,0,.05)',
                    padding:'20px',position:'relative',transition:'all .2s'}}>
                    {p.popular && (
                      <div style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',
                        background:'#fde68a',color:'#78350f',fontSize:9,fontWeight:900,
                        padding:'2px 12px',borderRadius:20,whiteSpace:'nowrap'}}>
                        ⭐ MOST POPULAR
                      </div>
                    )}
                    {isCurrent && (
                      <div style={{position:'absolute',top:-10,right:14,
                        background:p.color,color:'#fff',fontSize:9,fontWeight:900,
                        padding:'2px 12px',borderRadius:20}}>
                        ✓ CURRENT
                      </div>
                    )}
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                      <div style={{width:42,height:42,borderRadius:10,background:`${p.color}18`,
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>
                        {p.icon}
                      </div>
                      <div>
                        <div style={{fontSize:15,fontWeight:900,color:p.color}}>{p.name}</div>
                        <div style={{fontSize:10,color:'#64748b'}}>{p.tagline}</div>
                      </div>
                    </div>

                    <div style={{marginBottom:14}}>
                      <span style={{fontSize:28,fontWeight:900,color:'#0f172a'}}>
                        NPR {p.priceNPR.toLocaleString()}
                      </span>
                      <span style={{fontSize:11,color:'#64748b'}}>/month</span>
                      {p.priceUSD>0 && <div style={{fontSize:10,color:'#94a3b8'}}>≈ USD {p.priceUSD}</div>}
                    </div>

                    <div style={{marginBottom:14,display:'flex',flexDirection:'column',gap:5}}>
                      {[
                        `👥 ${p.employees === 99999 ? 'Unlimited' : p.employees} employees`,
                        `💾 ${p.storage} storage`,
                        `🤖 ${p.aiCredits === 99999 ? 'Unlimited' : p.aiCredits} AI credits/month`,
                        `📦 ${p.modules==='all'?'All 12 modules':Array.isArray(p.modules)?p.modules.length+' modules':'2 modules'}`,
                        `🎫 ${p.support}`,
                      ].map(item=>(
                        <div key={item} style={{fontSize:11,color:'#475569',display:'flex',gap:6}}>
                          {item}
                        </div>
                      ))}
                    </div>

                    <div style={{borderTop:'1px solid #f1f5f9',paddingTop:12,marginBottom:14,display:'flex',flexDirection:'column',gap:4}}>
                      {p.highlight.map(h=>(
                        <div key={h} style={{fontSize:10,color:'#059669',display:'flex',gap:6,alignItems:'center'}}>
                          <span>✓</span><span>{h}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => isHigher ? handleUpgrade(p.id) : null}
                      disabled={isCurrent || isLower || upgrading===p.id}
                      style={{width:'100%',padding:'10px',borderRadius:10,border:'none',
                        cursor:isCurrent||isLower?'default':'pointer',
                        background:isCurrent?`${p.color}20`:isLower?'#f1f5f9':
                                   upgrading===p.id?'#94a3b8':p.color,
                        color:isCurrent?p.color:isLower?'#94a3b8':'#fff',
                        fontSize:12,fontWeight:800,transition:'all .15s'}}>
                      {isCurrent ? '✓ Current Plan'
                       : isLower  ? '— Downgrade'
                       : upgrading===p.id ? '⏳ Upgrading...'
                       : `⬆️ Upgrade to ${p.name}`}
                    </button>
                  </div>
                )
              })}
            </div>
            <div style={{textAlign:'center',marginTop:20,fontSize:11,color:'#94a3b8'}}>
              Need a custom plan? Contact us: <b>sales@elogix.com.np</b> · +977-1-XXXXXXX
            </div>
          </div>
        )}

        {/* ════ FEATURES TAB ════ */}
        {tab==='features' && (
          <div style={{background:'#fff',borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,.06)',overflow:'auto'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
              <div style={{fontSize:13,fontWeight:800,color:'#374151'}}>✅ Feature Comparison — All Plans</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:2}}>
                Green = included · Grey = not available · Your plan: <b style={{color:plan.color}}>{plan.icon} {plan.name}</b>
              </div>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
                <thead>
                  <tr style={{background:'#f8fafc'}}>
                    <th style={{padding:'12px 16px',textAlign:'left',fontSize:11,fontWeight:800,
                      color:'#374151',borderBottom:'2px solid #e2e8f0',minWidth:200,
                      position:'sticky',left:0,background:'#f8fafc'}}>
                      Feature
                    </th>
                    {Object.values(PLANS).map(p=>(
                      <th key={p.id} style={{padding:'8px 12px',textAlign:'center',fontSize:10,
                        fontWeight:800,color:p.color,borderBottom:'2px solid #e2e8f0',minWidth:90,
                        background:p.id===planId?`${p.color}08`:'#f8fafc'}}>
                        {p.icon}<br/>{p.name}
                        {p.id===planId&&<div style={{fontSize:8,color:p.color}}>← Current</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(FEATURE_LABELS).map(([key,{label,icon}], ri)=>(
                    <tr key={key} style={{background:ri%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f1f5f9'}}>
                      <td style={{padding:'10px 16px',fontWeight:600,color:'#374151',fontSize:11,
                        position:'sticky',left:0,background:ri%2===0?'#fff':'#fafafa',
                        display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:15}}>{icon}</span>{label}
                      </td>
                      {Object.values(PLANS).map(p=>{
                        const has = p.features[key]
                        const isCur = p.id===planId
                        return (
                          <td key={p.id} style={{padding:'10px 12px',textAlign:'center',
                            background:isCur?(has?`${p.color}06`:'#fef2f2'):undefined}}>
                            <span style={{fontSize:16,color:has?'#16a34a':'#e2e8f0',fontWeight:900}}>
                              {has?'✓':'✕'}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════ INVOICES TAB ════ */}
        {tab==='invoices' && (
          <div style={{background:'#fff',borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,.06)',overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',fontSize:13,fontWeight:800,color:'#374151'}}>
              📄 Invoice History
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                  {['Invoice #','Period','Plan','Amount (NPR)','Status','Due Date','Action'].map(h=>(
                    <th key={h} style={{padding:'10px 16px',textAlign:'left',fontWeight:800,color:'#374151'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_INVOICES.map(inv=>(
                  <tr key={inv.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                    <td style={{padding:'12px 16px',fontWeight:700,color:A}}>{inv.no}</td>
                    <td style={{padding:'12px 16px',color:'#374151'}}>{inv.period}</td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{background:`${PLANS[inv.plan]?.color}15`,
                        color:PLANS[inv.plan]?.color,padding:'2px 8px',
                        borderRadius:10,fontSize:10,fontWeight:700}}>
                        {PLANS[inv.plan]?.icon} {PLANS[inv.plan]?.name}
                      </span>
                    </td>
                    <td style={{padding:'12px 16px',fontWeight:700,color:'#0f172a'}}>
                      {(inv.amt * 1.13).toLocaleString()} <span style={{fontSize:9,color:'#94a3b8'}}>+VAT</span>
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{padding:'3px 10px',borderRadius:10,fontSize:10,fontWeight:700,
                        background:inv.status==='paid'?'#f0fdf4':'#fffbeb',
                        color:inv.status==='paid'?'#16a34a':'#d97706'}}>
                        {inv.status==='paid'?'✓ Paid':'⏳ Pending'}
                      </span>
                    </td>
                    <td style={{padding:'12px 16px',color:'#64748b',fontSize:11}}>{inv.due}</td>
                    <td style={{padding:'12px 16px'}}>
                      <button style={{padding:'4px 12px',borderRadius:8,border:'1px solid #e2e8f0',
                        background:'#f8fafc',cursor:'pointer',fontSize:10,fontWeight:700,color:'#374151'}}>
                        📥 PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ════ ADD-ONS TAB ════ */}
        {tab==='addons' && (
          <div>
            <div style={{background:'#fff7ed',border:'1px solid #fde68a',borderRadius:10,
              padding:'12px 16px',marginBottom:16,fontSize:11,color:'#92400e',fontWeight:600}}>
              ℹ️ Add-ons extend your current {plan.name} plan. Billed monthly with your subscription.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
              {plan.addons.map(addon=>{
                const active = addons.find(a=>a.id===addon.id)
                return (
                  <div key={addon.id} style={{background:'#fff',borderRadius:12,padding:'18px',
                    boxShadow:'0 2px 8px rgba(0,0,0,.06)',
                    border:`2px solid ${active?A:'#e2e8f0'}`}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:4}}>{addon.name}</div>
                    <div style={{fontSize:18,fontWeight:900,color:A,marginBottom:12}}>
                      NPR {addon.priceNPR.toLocaleString()}<span style={{fontSize:10,color:'#64748b'}}>/month</span>
                    </div>
                    <button onClick={()=>{
                        if(active) setAddons(p=>p.filter(a=>a.id!==addon.id))
                        else setAddons(p=>[...p,addon])
                        notify(active?`✅ ${addon.name} removed`:`✅ ${addon.name} added`)
                      }}
                      style={{width:'100%',padding:'9px',borderRadius:9,border:'none',cursor:'pointer',
                        background:active?'#fef2f2':G,color:active?'#dc2626':'#fff',
                        fontSize:12,fontWeight:800}}>
                      {active?'✗ Remove':'+ Add to Plan'}
                    </button>
                  </div>
                )
              })}
            </div>
            {addons.length>0&&(
              <div style={{background:'#fff',borderRadius:12,padding:'16px 20px',
                marginTop:14,boxShadow:'0 2px 8px rgba(0,0,0,.06)',
                display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:12,color:'#374151'}}>
                  <b>{addons.length} add-on(s) selected</b> · Total:
                  <b style={{color:A}}> NPR {addons.reduce((s,a)=>s+a.priceNPR,0).toLocaleString()}/month</b>
                </div>
                <button onClick={()=>notify('✅ Add-ons activated! Billing updated.')}
                  style={{padding:'8px 20px',borderRadius:9,border:'none',background:G,
                    color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                  Confirm Add-ons
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════ SUPPORT TAB ════ */}
        {tab==='support' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div style={{background:'#fff',borderRadius:12,padding:'20px',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
              <div style={{fontSize:13,fontWeight:800,color:'#374151',marginBottom:16}}>🎫 Raise Support Ticket</div>
              {[
                {label:'Subject',     k:'subject',     type:'text',    ph:'Describe your issue briefly'},
                {label:'Description', k:'description', type:'textarea',ph:'Provide details about the issue...'},
              ].map(f=>(
                <div key={f.k} style={{marginBottom:14}}>
                  <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>{f.label}</label>
                  {f.type==='textarea'
                    ? <textarea rows={4} placeholder={f.ph}
                        style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',
                          fontSize:12,outline:'none',boxSizing:'border-box',fontFamily:'inherit',resize:'vertical'}}
                        onFocus={e=>e.target.style.borderColor=A}
                        onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
                    : <input type="text" placeholder={f.ph}
                        style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',
                          fontSize:12,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}
                        onFocus={e=>e.target.style.borderColor=A}
                        onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>}
                </div>
              ))}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                {[
                  {label:'Priority',k:'priority',opts:['normal','high','urgent']},
                  {label:'Category',k:'category',opts:['technical','billing','feature','other']},
                ].map(f=>(
                  <div key={f.k}>
                    <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>{f.label}</label>
                    <select style={{width:'100%',padding:'9px',borderRadius:9,border:'1.5px solid #e2e8f0',
                      fontSize:12,outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
                      {f.opts.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <button onClick={()=>notify('✅ Ticket raised! Our team will respond within SLA time.')}
                style={{width:'100%',padding:'11px',borderRadius:10,border:'none',
                  background:G,color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer'}}>
                Submit Ticket
              </button>
            </div>
            <div>
              <div style={{background:'#fff',borderRadius:12,padding:'20px',
                boxShadow:'0 2px 8px rgba(0,0,0,.06)',marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:800,color:'#374151',marginBottom:14}}>📞 Contact eLogix</div>
                {[
                  ['Email',    'support@elogix.com.np'],
                  ['Sales',    'sales@elogix.com.np'],
                  ['Phone',    '+977-1-XXXXXXX'],
                  ['Hours',    'Sun–Fri · 9AM–6PM NPT'],
                  ['SLA',      plan.sla],
                ].map(([k,v])=>(
                  <div key={k} style={{display:'flex',gap:10,padding:'8px 0',
                    borderBottom:'1px solid #f1f5f9',fontSize:12}}>
                    <span style={{color:'#64748b',minWidth:60}}>{k}</span>
                    <span style={{fontWeight:600,color:'#0f172a'}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{background:'#f0f9ff',borderRadius:12,padding:'16px',
                border:'1px solid #bae6fd',fontSize:11,color:'#0c4a6e'}}>
                <div style={{fontWeight:800,marginBottom:8}}>🏆 Your {plan.name} Plan Includes:</div>
                <div style={{fontWeight:700,marginBottom:4}}>Support: {plan.support}</div>
                <div style={{color:'#0369a1'}}>Response SLA: {plan.sla}</div>
                {PLAN_LEVELS[planId]<4&&(
                  <button onClick={()=>setTab('plans')}
                    style={{marginTop:10,padding:'6px 14px',borderRadius:8,border:'none',
                      background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                    Upgrade for faster support →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
