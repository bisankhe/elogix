// FILE: CareerPage.jsx — Career Page (Employer Branding)
import { useState } from 'react'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const JOBS = [
  { id:'j1', title:'Senior Software Developer', dept:'IT', location:'Kathmandu HQ', type:'Permanent', salary:'NPR 90K-130K', posted:'2025-06-15', applications:24, status:'active' },
  { id:'j2', title:'Finance Manager', dept:'Finance', location:'Kathmandu HQ', type:'Permanent', salary:'NPR 120K-160K', posted:'2025-06-10', applications:12, status:'active' },
  { id:'j3', title:'HR Business Partner', dept:'HR', location:'Kathmandu HQ', type:'Permanent', salary:'NPR 70K-100K', posted:'2025-06-18', applications:8, status:'active' },
  { id:'j4', title:'Sales Officer', dept:'Sales', location:'Pokhara', type:'Contract', salary:'NPR 45K-65K', posted:'2025-06-20', applications:31, status:'active' },
]

const CULTURE = [
  { icon:'🤝', title:'Collaborative Culture', desc:'Open-door policy. Cross-functional teams. Everyone\'s voice matters.' },
  { icon:'📈', title:'Growth First', desc:'Annual performance reviews, training budgets, and promotion-from-within policy.' },
  { icon:'⚖️', title:'Work-Life Balance', desc:'Flexible hours, hybrid options, and generous leave per Nepal Labour Act 2074.' },
  { icon:'🌍', title:'Diversity & Inclusion', desc:'Equal opportunity employer. Gender-neutral pay bands. Inclusive hiring.' },
]

export default function CareerPage() {
  const [tab, setTab] = useState('jobs')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({name:'',email:'',phone:'',role:'',cv:null,cover:''})
  const [showApply, setShowApply] = useState(null)
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = JOBS.filter(j=>!search||j.title.toLowerCase().includes(search.toLowerCase())||j.dept.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:G,borderRadius:14,padding:'24px 32px',marginBottom:16,color:'#fff',textAlign:'center'}}>
        <div style={{fontSize:28,fontWeight:900,marginBottom:8}}>Join Our Team 🚀</div>
        <div style={{fontSize:13,opacity:.8,marginBottom:16}}>Build your career at a company that invests in your growth. Nepal Labour Act 2074 compliant employer.</div>
        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          {[['🏆','Great Place to Work Certified'],['💰','Competitive Pay'],['📚','Learning Budget'],['🏖️','Generous Leave']].map(([i,l])=>(
            <span key={l} style={{background:'rgba(255,255,255,.15)',padding:'6px 16px',borderRadius:20,fontSize:11}}>{i} {l}</span>
          ))}
        </div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{msg}</div>}

      <div style={{display:'flex',gap:2,background:'#f1f5f9',padding:4,borderRadius:12,marginBottom:16,width:'fit-content'}}>
        {[['jobs','💼 Open Positions'],['culture','🎉 Our Culture'],['benefits','🏆 Benefits']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:'9px 20px',borderRadius:9,border:'none',cursor:'pointer',fontSize:11,background:tab===k?'#fff':'transparent',color:tab===k?A:'#64748b',fontWeight:tab===k?700:400,boxShadow:tab===k?'0 1px 4px rgba(0,0,0,.1)':'none'}}>{l}</button>
        ))}
      </div>

      {tab==='jobs'&&(
        <>
          <div style={{position:'relative',marginBottom:14}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#94a3b8',fontSize:14}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by role or department..."
              style={{width:'100%',padding:'10px 16px 10px 38px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div style={{display:'grid',gap:12}}>
            {filtered.map(j=>(
              <div key={j.id} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 20px',display:'flex',gap:16,alignItems:'center',flexWrap:'wrap',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:4}}>{j.title}</div>
                  <div style={{display:'flex',gap:8,fontSize:10,color:'#64748b',flexWrap:'wrap'}}>
                    <span>🏢 {j.dept}</span><span>📍 {j.location}</span><span>📄 {j.type}</span>
                    <span>💰 {j.salary}</span><span>📅 Posted: {j.posted}</span>
                    <span style={{color:A,fontWeight:700}}>👥 {j.applications} applied</span>
                  </div>
                </div>
                <button onClick={()=>setShowApply(j)} style={{padding:'10px 24px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0}}>Apply Now</button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab==='culture'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:14}}>
          {CULTURE.map(c=>(
            <div key={c.title} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px'}}>
              <div style={{fontSize:32,marginBottom:10}}>{c.icon}</div>
              <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:6}}>{c.title}</div>
              <div style={{fontSize:11,color:'#64748b',lineHeight:1.6}}>{c.desc}</div>
            </div>
          ))}
        </div>
      )}

      {tab==='benefits'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
          {[['💰','Competitive Salary','Market-linked pay reviews annually. Performance bonus up to 15%.'],['🏥','Medical Insurance','Full family coverage including dental and vision. Group health insurance.'],['📅','Leave Benefits','18 days annual + 12 sick + 13 festival leaves per Nepal Labour Act 2074.'],['📚','Learning Budget','NPR 50,000/year training budget per employee. LinkedIn Learning access.'],['🚗','Transport Allowance','Daily transport allowance or company vehicle for eligible grades.'],['🏠','Remote Work','Hybrid options for most roles. Work from home 2 days/week.']].map(([i,t,d])=>(
            <div key={t} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'16px'}}>
              <div style={{fontSize:24,marginBottom:6}}>{i}</div>
              <div style={{fontSize:12,fontWeight:700,color:'#0f172a',marginBottom:4}}>{t}</div>
              <div style={{fontSize:10,color:'#64748b',lineHeight:1.6}}>{d}</div>
            </div>
          ))}
        </div>
      )}

      {showApply&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowApply(null)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:520,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>Apply — {showApply.title}</div>
              <div style={{fontSize:10,opacity:.8,marginTop:2}}>{showApply.dept} · {showApply.location} · {showApply.type}</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              {[['Full Name *','name','text'],['Email *','email','email'],['Phone','phone','text']].map(([l,f,t])=>(
                <div key={f} style={{marginBottom:12}}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                  <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
              ))}
              <div style={{marginBottom:12}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Upload CV (PDF/DOC)</label>
                <div style={{border:'2px dashed #e2e8f0',borderRadius:10,padding:'24px',textAlign:'center',background:'#f8fafc',cursor:'pointer'}}
                  onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();setForm(p=>({...p,cv:e.dataTransfer.files[0]}))}}>
                  <div style={{fontSize:24,marginBottom:6}}>📄</div>
                  <div style={{fontSize:11,color:'#64748b'}}>{form.cv?form.cv.name:'Drag & Drop or click to upload CV'}</div>
                  <input type="file" accept=".pdf,.doc,.docx" onChange={e=>setForm(p=>({...p,cv:e.target.files[0]}))} style={{position:'absolute',opacity:0,inset:0,cursor:'pointer',width:'100%',height:'100%'}}/>
                </div>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Cover Note</label>
                <textarea value={form.cover} onChange={e=>setForm(p=>({...p,cover:e.target.value}))} rows={3}
                  placeholder="Tell us why you're a great fit for this role..."
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:10,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{if(!form.name||!form.email){notify('⚠️ Name and email required');return}notify('✅ Application submitted for '+showApply.title+' — Confirmation email sent to '+form.email);setShowApply(null);setForm({name:'',email:'',phone:'',role:'',cv:null,cover:''})}}
                  style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>🚀 Submit Application</button>
                <button onClick={()=>setShowApply(null)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
