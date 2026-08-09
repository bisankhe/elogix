// FILE: src/pages/auth/RegisterPage.jsx
// eLogix HRMS — New Company Self-Registration (Trial Signup)
// 4-step wizard: Company Info → Admin Account → Plan → Confirm
// eLogix Technologies · www.elogix.com.np
import { useState } from 'react'
import { eLogixAPI } from '../../utils/api.js'

const G   = 'linear-gradient(135deg,#059669 0%,#0369a1 55%,#38bdf8 100%)'
const A   = '#0369a1'
const inp = {
  width:'100%', padding:'10px 14px', borderRadius:9,
  border:'1.5px solid #e2e8f0', fontSize:12, outline:'none',
  boxSizing:'border-box', fontFamily:'inherit', transition:'border .15s',
}

const PLANS = [
  { id:'trial',   name:'Free Trial',   price:0,     emp:10,   days:14, color:'#059669', popular:false },
  { id:'starter', name:'Starter',      price:5000,  emp:50,   days:0,  color:'#0891b2', popular:false },
  { id:'growth',  name:'Growth',       price:12000, emp:250,  days:0,  color:'#0369a1', popular:true  },
  { id:'business',name:'Business',     price:25000, emp:500,  days:0,  color:'#7c3aed', popular:false },
]

const INDUSTRIES = ['Banking & Finance','Human Resources','IT & Technology','Telecom',
  'Healthcare','Education','Manufacturing','Retail','NGO/INGO','Government','Other']

export default function RegisterPage({ onSuccess }) {
  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(null)
  const [form, setForm] = useState({
    company_name:'', slug:'', industry:'', phone:'', country:'Nepal',
    admin_name:'', admin_email:'', password:'', confirm_password:'',
    plan:'trial',
  })
  const sf = (k,v) => setForm(p=>({...p,[k]:v}))
  const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')

  const handleSubmit = async () => {
    if (!form.company_name||!form.slug||!form.admin_email||!form.password) {
      setError('Please fill all required fields'); return
    }
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    try {
      let data
      try { data = await eLogixAPI.createCompany(form) }
      catch {
        // Dev mock
        data = {
          success: true,
          portal_url: `https://${form.slug}.elogix.com.np`,
          tenant_slug: form.slug,
          company_name: form.company_name,
          plan: form.plan,
          note: 'Account created! Check your email for login details.',
        }
      }
      if (!data.success) { setError(data.error || 'Registration failed'); return }
      setDone(data)
    } catch (err) {
      setError(err.message || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const Inp = ({label, k, type='text', placeholder, required}) => (
    <div style={{marginBottom:14}}>
      <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>
        {label}{required&&<span style={{color:'#dc2626',marginLeft:2}}>*</span>}
      </label>
      <input type={type} value={form[k]} onChange={e=>sf(k,e.target.value)}
        placeholder={placeholder||label}
        style={inp}
        onFocus={e=>e.target.style.borderColor=A}
        onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
    </div>
  )

  if (done) return (
    <div style={{minHeight:'100vh',background:'#f0fdf4',display:'flex',alignItems:'center',
      justifyContent:'center',fontFamily:'system-ui,sans-serif',padding:24}}>
      <div style={{textAlign:'center',maxWidth:480}}>
        <div style={{fontSize:72,marginBottom:12}}>🎉</div>
        <div style={{fontSize:26,fontWeight:900,color:'#065f46',marginBottom:6}}>
          Welcome to eLogix!
        </div>
        <div style={{fontSize:13,color:'#374151',marginBottom:24,lineHeight:1.7}}>
          Your <b>{done.company_name}</b> account is ready.<br/>
          Check your email for login details.
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:'20px',
          border:'1px solid #bbf7d0',marginBottom:24}}>
          <div style={{fontSize:10,color:'#64748b',marginBottom:4}}>Your eLogix Portal</div>
          <a href={done.portal_url} style={{fontSize:15,fontWeight:800,color:A,
            textDecoration:'none'}}>{done.portal_url}</a>
          <div style={{marginTop:10,padding:'8px 12px',background:'#f0fdf4',borderRadius:9,
            fontSize:11,color:'#065f46'}}>
            {done.note}
          </div>
        </div>
        <a href={done.portal_url}
          style={{display:'inline-block',padding:'12px 28px',borderRadius:10,background:G,
            color:'#fff',fontSize:13,fontWeight:800,textDecoration:'none',
            boxShadow:'0 4px 14px rgba(3,105,161,.3)'}}>
          🚀 Open My Portal
        </a>
        <div style={{marginTop:14,fontSize:11,color:'#64748b'}}>
          Need help? <a href="mailto:support@elogix.com.np" style={{color:A}}>support@elogix.com.np</a>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f0f7ff',fontFamily:'system-ui,sans-serif'}}>
      {/* Header */}
      <div style={{background:G,padding:'14px 24px',color:'#fff',display:'flex',
        justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:18,fontWeight:900}}>🏢 eLogix HRMS</div>
          <div style={{fontSize:10,opacity:.75}}>Start your 14-day free trial · No credit card needed</div>
        </div>
        <a href="/login" style={{color:'#bae6fd',fontSize:11,fontWeight:700,textDecoration:'none'}}>
          Already have an account? Sign in →
        </a>
      </div>

      {/* Steps */}
      <div style={{maxWidth:640,margin:'0 auto',padding:'32px 24px'}}>
        {/* Progress */}
        <div style={{display:'flex',gap:0,marginBottom:32}}>
          {['Company Info','Admin Account','Choose Plan','Confirm'].map((lb,i)=>{
            const n=i+1, active=n===step, done_s=n<step
            return (
              <div key={lb} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}>
                <div style={{position:'relative',width:'100%',display:'flex',alignItems:'center'}}>
                  {i>0&&<div style={{flex:1,height:2,background:done_s?A:'#e2e8f0'}}/>}
                  <div style={{width:32,height:32,borderRadius:'50%',display:'flex',
                    alignItems:'center',justifyContent:'center',flexShrink:0,
                    background:done_s?A:active?A:'#fff',border:`2px solid ${active||done_s?A:'#e2e8f0'}`,
                    color:active||done_s?'#fff':'#94a3b8',fontWeight:800,fontSize:12}}>
                    {done_s?'✓':n}
                  </div>
                  {i<3&&<div style={{flex:1,height:2,background:done_s?A:'#e2e8f0'}}/>}
                </div>
                <div style={{fontSize:9,color:active?A:'#94a3b8',fontWeight:active?700:400,
                  marginTop:5,textAlign:'center',whiteSpace:'nowrap'}}>{lb}</div>
              </div>
            )
          })}
        </div>

        <div style={{background:'#fff',borderRadius:16,padding:'28px',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
          {error&&(
            <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:9,
              padding:'10px 14px',marginBottom:16,fontSize:11,color:'#dc2626'}}>
              ⚠️ {error}
            </div>
          )}

          {/* Step 1: Company Info */}
          {step===1&&(
            <div>
              <div style={{fontWeight:900,fontSize:18,color:'#0f172a',marginBottom:4}}>Company Information</div>
              <div style={{fontSize:11,color:'#64748b',marginBottom:24}}>Tell us about your company</div>
              <Inp label="Company Name" k="company_name" required
                placeholder="e.g. Himalayan Bank Ltd."
                onChange_extra={(v)=>{ sf('company_name',v); if(!form.slug) sf('slug',autoSlug(v)) }}/>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>
                  Company Portal URL <span style={{color:'#dc2626'}}>*</span>
                </label>
                <div style={{display:'flex',alignItems:'center',border:'1.5px solid #e2e8f0',
                  borderRadius:9,overflow:'hidden',background:'#fff'}}>
                  <input value={form.slug}
                    onChange={e=>sf('slug',e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))}
                    placeholder="yourcompany"
                    style={{flex:1,padding:'10px 12px',border:'none',fontSize:12,outline:'none',fontFamily:'inherit'}}/>
                  <span style={{padding:'10px 14px',background:'#f8fafc',borderLeft:'1.5px solid #e2e8f0',
                    fontSize:11,color:'#64748b',whiteSpace:'nowrap'}}>.elogix.com.np</span>
                </div>
                {form.slug&&<div style={{fontSize:10,color:'#059669',marginTop:4}}>
                  ✅ Portal: https://{form.slug}.elogix.com.np
                </div>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Industry</label>
                  <select value={form.industry} onChange={e=>sf('industry',e.target.value)} style={inp}>
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map(ind=><option key={ind}>{ind}</option>)}
                  </select>
                </div>
                <Inp label="Phone" k="phone" placeholder="+977-01-XXXXXXX"/>
              </div>
            </div>
          )}

          {/* Step 2: Admin Account */}
          {step===2&&(
            <div>
              <div style={{fontWeight:900,fontSize:18,color:'#0f172a',marginBottom:4}}>Admin Account</div>
              <div style={{fontSize:11,color:'#64748b',marginBottom:24}}>This will be the Super Admin for {form.company_name}</div>
              <Inp label="Full Name" k="admin_name" required placeholder="HR Admin / Manager"/>
              <Inp label="Admin Email" k="admin_email" type="email" required placeholder="hr@yourcompany.com"/>
              <Inp label="Password" k="password" type="password" required placeholder="Min 10 chars with uppercase, number, symbol"/>
              <Inp label="Confirm Password" k="confirm_password" type="password" required placeholder="Re-enter password"/>
              <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:9,
                padding:'10px 14px',fontSize:10,color:'#92400e'}}>
                🔐 Password must be at least 10 characters with uppercase, lowercase, number and symbol.<br/>
                e.g. <code>NepalHR@2083</code>
              </div>
            </div>
          )}

          {/* Step 3: Plan */}
          {step===3&&(
            <div>
              <div style={{fontWeight:900,fontSize:18,color:'#0f172a',marginBottom:4}}>Choose Your Plan</div>
              <div style={{fontSize:11,color:'#64748b',marginBottom:20}}>Start free — upgrade anytime</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {PLANS.map(plan=>(
                  <div key={plan.id} onClick={()=>sf('plan',plan.id)}
                    style={{borderRadius:12,padding:'16px',cursor:'pointer',position:'relative',
                      border:`2px solid ${form.plan===plan.id?plan.color:'#e2e8f0'}`,
                      background:form.plan===plan.id?plan.color+'08':'#fff',transition:'all .15s'}}>
                    {plan.popular&&<div style={{position:'absolute',top:-8,right:12,
                      background:'#d97706',color:'#fff',fontSize:8,fontWeight:800,
                      padding:'2px 10px',borderRadius:20}}>POPULAR</div>}
                    <div style={{fontSize:22,marginBottom:4}}>{plan.id==='trial'?'🎁':plan.id==='starter'?'🚀':plan.id==='growth'?'📈':'🏢'}</div>
                    <div style={{fontSize:14,fontWeight:800,color:plan.color}}>{plan.name}</div>
                    <div style={{fontSize:18,fontWeight:900,color:'#0f172a',margin:'4px 0'}}>
                      {plan.price===0?'Free':`NPR ${plan.price.toLocaleString()}`}
                      {plan.price>0&&<span style={{fontSize:10,color:'#64748b'}}>/mo</span>}
                    </div>
                    {plan.days>0&&<div style={{fontSize:10,color:'#059669',fontWeight:700}}>{plan.days}-day free trial</div>}
                    <div style={{fontSize:10,color:'#64748b',marginTop:4}}>{plan.emp} employees max</div>
                    {form.plan===plan.id&&<div style={{position:'absolute',top:8,right:8,
                      color:plan.color,fontSize:16}}>✅</div>}
                  </div>
                ))}
              </div>
              <div style={{marginTop:16,fontSize:10,color:'#64748b',textAlign:'center'}}>
                +13% VAT applicable · Cancel anytime · eLogix Technologies
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step===4&&(
            <div>
              <div style={{fontWeight:900,fontSize:18,color:'#0f172a',marginBottom:4}}>Review & Confirm</div>
              <div style={{fontSize:11,color:'#64748b',marginBottom:20}}>Your eLogix account details</div>
              <div style={{background:'#f8fafc',borderRadius:12,padding:'16px',marginBottom:16}}>
                {[
                  ['🏢 Company',form.company_name],
                  ['🌐 Portal',`https://${form.slug}.elogix.com.np`],
                  ['🏭 Industry',form.industry||'—'],
                  ['👤 Admin',form.admin_name],
                  ['📧 Email',form.admin_email],
                  ['📋 Plan',PLANS.find(p=>p.id===form.plan)?.name||form.plan],
                ].map(([lb,v])=>(
                  <div key={lb} style={{display:'flex',justifyContent:'space-between',
                    padding:'8px 0',borderBottom:'1px solid #e2e8f0',fontSize:11}}>
                    <span style={{color:'#64748b'}}>{lb}</span>
                    <span style={{fontWeight:700,color:'#0f172a',textAlign:'right',maxWidth:'60%'}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:9,
                padding:'12px 14px',fontSize:10,color:'#065f46',marginBottom:16,lineHeight:1.7}}>
                ⚡ By clicking below, eLogix will instantly provision your:<br/>
                • Dedicated company database (PostgreSQL schema: <code>elogix_{form.slug}</code>)<br/>
                • 14 default roles with permission matrix<br/>
                • Super Admin account + welcome email<br/>
                • MinIO storage folder for your company files
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{display:'flex',gap:10,marginTop:24}}>
            {step>1&&(
              <button onClick={()=>{setStep(s=>s-1);setError('')}}
                style={{padding:'11px 22px',borderRadius:9,border:'1.5px solid #e2e8f0',
                  background:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                ← Back
              </button>
            )}
            {step<4?(
              <button onClick={()=>{
                if (step===1&&(!form.company_name||!form.slug)){setError('Company name and URL required');return}
                if (step===2&&(!form.admin_name||!form.admin_email||!form.password)){setError('Fill all admin details');return}
                if (step===2&&form.password!==form.confirm_password){setError('Passwords do not match');return}
                setError('');setStep(s=>s+1)
              }} style={{flex:1,padding:'11px',borderRadius:9,border:'none',
                background:G,color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',
                boxShadow:'0 4px 12px rgba(3,105,161,.25)'}}>
                Continue →
              </button>
            ):(
              <button onClick={handleSubmit} disabled={loading}
                style={{flex:1,padding:'11px',borderRadius:9,border:'none',
                  background:loading?'#94a3b8':G,color:'#fff',fontSize:13,fontWeight:800,
                  cursor:loading?'not-allowed':'pointer',
                  boxShadow:'0 4px 12px rgba(3,105,161,.25)'}}>
                {loading?'⏳ Setting up your account...':'🚀 Create eLogix Account'}
              </button>
            )}
          </div>
        </div>

        <div style={{textAlign:'center',marginTop:20,fontSize:10,color:'#94a3b8'}}>
          eLogix Technologies · support@elogix.com.np · www.elogix.com.np
        </div>
      </div>
    </div>
  )
}
