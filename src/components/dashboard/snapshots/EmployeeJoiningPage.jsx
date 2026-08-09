// FILE: EmployeeJoiningPage.jsx — Employee Joining / Enrollment
// Use Existing | Create New | Choose Reporting Manager | AI-generated Contract | Send via Email/WhatsApp/Viber
import { useState } from 'react'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const EXISTING_DB = [
  { emp_id:'CAND-001', name:'Anjali Sharma',  phone:'+977-9801111111', email:'anjali@email.com',  position:'Software Developer', dept:'IT',      exp:'3 years' },
  { emp_id:'CAND-002', name:'Bikash Rai',     phone:'+977-9802222222', email:'bikash@email.com',  position:'Accountant',         dept:'Finance', exp:'5 years' },
  { emp_id:'CAND-003', name:'Sita Gurung',    phone:'+977-9803333333', email:'sita@email.com',    position:'HR Officer',         dept:'HR',      exp:'2 years' },
]

const MANAGERS = [
  'Rajesh Sharma (CTO)','Sanjay Karki (CFO)','Priya Adhikari (HR Manager)',
  'Bikash Shrestha (IT Lead)','Maya Gurung (Ops Head)','Dipak Tamang (Sales Head)',
]

const BLANK = { name:'',email:'',phone:'',position:'',dept:'IT',manager:'',join_date:'',employment_type:'Permanent',grade:'G3',salary:'' }

export default function EmployeeJoiningPage() {
  const [mode, setMode] = useState('list') // list | use_existing | create_new
  const [form, setForm] = useState(BLANK)
  const [selected, setSelected] = useState(null)
  const [contract, setContract] = useState(null)
  const [contractEdit, setContractEdit] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [enrollments, setEnrollments] = useState([])
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3500) }

  const filtered = EXISTING_DB.filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase()))

  const useExisting = (candidate) => {
    setForm({...BLANK,...candidate, join_date:'', employment_type:'Permanent', grade:'G3', salary:''})
    setMode('create_new')
    setSelected(candidate)
    notify('✅ Existing data loaded for '+candidate.name)
  }

  const generateContract = () => {
    if (!form.name||!form.position) { notify('⚠️ Name and position required'); return }
    setGenerating(true)
    setTimeout(()=>{
      const c = `EMPLOYMENT CONTRACT

Date: ${new Date().toLocaleDateString()}
Ref: EC-${Date.now().toString().slice(-5)}

PARTIES:
Employer: [Company Name], Registered at [Address]
Employee: ${form.name}

POSITION:  ${form.position}, ${form.dept} Department
GRADE:     ${form.grade}
REPORTING: ${form.manager||'Direct Manager (TBD)'}
START DATE:${form.join_date||'As agreed'}
SALARY:    NPR ${form.salary||'[As agreed]'}/month

EMPLOYMENT TYPE: ${form.employment_type}

TERMS:
1. Probation period: 6 months per Nepal Labour Act 2074 Section 10
2. Annual leave: 18 days | Sick leave: 12 days | Festival: 13 days
3. Social Security Fund (SSF): Employee 11% + Employer 20% contribution
4. Notice period: 30 days (probation) / 3 months (permanent)
5. This contract is governed by Nepal Labour Act 2074

AI-GENERATED CLAUSES based on JD and role requirements:
- Role-specific IP ownership: All work produced belongs to Company
- Performance KPIs as defined by HOD ${form.manager||'and HR'}
- Confidentiality: NDA applies from date of signing
- Non-compete: 12 months within Nepal after termination

Signed by:
________________________     ________________________
${form.name}                 HR Manager
(Employee)                   (Company Representative)`
      setContract(c)
      setGenerating(false)
      notify('🤖 Employment contract auto-generated based on JD and role details')
    }, 1800)
  }

  const sendContract = () => {
    if (!contract) { notify('⚠️ Generate contract first'); return }
    const newEmp = { id:'enr'+Date.now(), ...form, status:'contract_sent', enrolled_date:new Date().toISOString().split('T')[0] }
    setEnrollments(p=>[...p, newEmp])
    setMode('list')
    setForm(BLANK); setContract(null); setSelected(null)
    notify(`✅ Employment contract sent to ${form.name} via Email (${form.email}), WhatsApp (${form.phone}) & Viber`)
  }

  const f = (l,k,t='text') => (
    <div key={k}>
      <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
      <input type={t} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
        style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
    </div>
  )

  const sel = (l,k,opts) => (
    <div key={k}>
      <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
      <select value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
        style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
        {opts.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:G,borderRadius:14,padding:'18px 24px',marginBottom:16,color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div><div style={{fontSize:18,fontWeight:900}}>🎉 Employee Joining / Enrollment</div>
            <div style={{fontSize:11,opacity:.8,marginTop:3}}>Use existing candidate data or create new. AI auto-generates employment contract.</div></div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{setMode('use_existing');setSearch('')}} style={{padding:'9px 18px',borderRadius:9,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>📂 Use Existing</button>
            <button onClick={()=>{setMode('create_new');setForm(BLANK);setContract(null)}} style={{padding:'9px 18px',borderRadius:9,border:'none',background:'rgba(255,255,255,.95)',color:A,fontSize:11,fontWeight:700,cursor:'pointer'}}>+ Create New</button>
          </div>
        </div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{msg}</div>}

      {/* LIST */}
      {mode==='list'&&(
        <div>
          {enrollments.length===0?
            <div style={{background:'#f8fafc',borderRadius:14,padding:'40px',textAlign:'center',border:'2px dashed #e2e8f0',color:'#94a3b8',fontSize:12}}>No enrollments yet. Click "Use Existing" or "Create New" to enroll an employee.</div>
            :<div style={{display:'grid',gap:10}}>
              {enrollments.map(e=>(
                <div key={e.id} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 18px',display:'flex',gap:14,alignItems:'center'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:800}}>{e.name}</div>
                    <div style={{fontSize:10,color:'#64748b'}}>{e.position} · {e.dept} · {e.employment_type} · Manager: {e.manager||'TBD'}</div>
                  </div>
                  <span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>📧 Contract Sent</span>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* USE EXISTING */}
      {mode==='use_existing'&&(
        <div>
          <div style={{position:'relative',marginBottom:14}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#94a3b8',fontSize:14}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search candidate database..."
              style={{width:'100%',padding:'10px 16px 10px 38px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div style={{display:'grid',gap:8}}>
            {filtered.map(c=>(
              <div key={c.emp_id} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 18px',display:'flex',gap:14,alignItems:'center'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{c.name} <span style={{fontSize:10,color:'#94a3b8'}}>{c.emp_id}</span></div>
                  <div style={{fontSize:10,color:'#64748b'}}>{c.position} · {c.dept} · {c.exp} · {c.email} · {c.phone}</div>
                </div>
                <button onClick={()=>useExisting(c)} style={{padding:'8px 18px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer',flexShrink:0}}>📂 Use This</button>
              </div>
            ))}
          </div>
          <button onClick={()=>setMode('list')} style={{marginTop:12,padding:'9px 18px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>← Back</button>
        </div>
      )}

      {/* CREATE NEW / FORM */}
      {mode==='create_new'&&(
        <div style={{display:'grid',gridTemplateColumns:contract?'1fr 1fr':'1fr',gap:16}}>
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'22px'}}>
            <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:14}}>
              {selected?`✅ Using Existing Data — ${selected.name}`:'👤 New Employee Enrollment'}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              {f('Full Name *','name')} {f('Email *','email','email')}
              {f('Phone','phone')} {f('Position / Designation *','position')}
              {sel('Department','dept',['IT','Finance','HR','Operations','Sales & Marketing','Customer Service','Facilities'])}
              {sel('Reporting Manager','manager',['—', ...MANAGERS])}
              {f('Joining Date','join_date','date')} {f('Salary (NPR)','salary','number')}
              {sel('Employment Type','employment_type',['Permanent','Contract','Probation','Part-Time','Intern','Outsource'])}
              {sel('Grade','grade',['G1','G2','G3','G4','G5','G6','G7','G8'])}
            </div>
            <div style={{display:'flex',gap:10,marginTop:4}}>
              <button onClick={generateContract} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#7c3aed,#4338ca)',color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>
                {generating?'⏳ Generating...':'🤖 Generate AI Contract'}
              </button>
              <button onClick={()=>{setMode('list');setForm(BLANK);setContract(null)}} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
          {contract&&(
            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'22px'}}>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span>🤖 AI-Generated Employment Contract</span>
                <button onClick={()=>setContractEdit(p=>!p)} style={{padding:'5px 12px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:9,cursor:'pointer'}}>{contractEdit?'👁 View':'✏️ Edit'}</button>
              </div>
              {contractEdit
                ? <textarea value={contract} onChange={e=>setContract(e.target.value)} rows={18}
                    style={{width:'100%',padding:'10px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:9,outline:'none',resize:'vertical',fontFamily:'monospace',boxSizing:'border-box'}}/>
                : <pre style={{fontSize:9,color:'#374151',lineHeight:1.7,whiteSpace:'pre-wrap',background:'#f8fafc',borderRadius:10,padding:'14px',maxHeight:340,overflowY:'auto',margin:0}}>{contract}</pre>}
              <div style={{display:'flex',gap:8,marginTop:12}}>
                <button onClick={()=>setContractEdit(false)} style={{flex:1,padding:'10px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,cursor:'pointer'}}>💾 Save Draft</button>
                <button onClick={sendContract} style={{flex:1,padding:'10px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📧 Send to Employee</button>
              </div>
              <div style={{marginTop:8,fontSize:9,color:'#64748b',textAlign:'center'}}>Will send via Email + WhatsApp + Viber to {form.name}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
