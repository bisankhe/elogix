// FILE: LeaveBalanceReportPage.jsx
// eLogix HRMS — Leave Balance Report
// Columns from Excel: No·SrNo·EmpCode·MemberName·Designation·Dept·DaysAttended
//   Leaves in Month (CL/EL/SL/HD/A) · Balance (CL/EL/SL) · Consumed (CL/EL/SL)
//   Carry Forward (EL/SL) · Applicable (CL/EL/SL) · Remarks
// Color-coded per leave type · Digital signatures
import { useState, useRef } from 'react'

const LEAVE_COLORS = {
  CL: { bg:'#e0f2fe', c:'#075985', border:'#7dd3fc', label:'Casual Leave'   },
  EL: { bg:'#fef3c7', c:'#92400e', border:'#fcd34d', label:'Earned Leave'   },
  SL: { bg:'#fef2f2', c:'#991b1b', border:'#fca5a5', label:'Sick Leave'     },
  ML: { bg:'#f5f3ff', c:'#5b21b6', border:'#c4b5fd', label:'Maternity'      },
  BL: { bg:'#fdf4ff', c:'#6b21a8', border:'#e879f9', label:'Bereavement'   },
  AL: { bg:'#e8f5e9', c:'#2e7d32', border:'#a5d6a7', label:'Admin Leave'   },
  PL: { bg:'#e3f2fd', c:'#1565c0', border:'#90caf9', label:'Paternity'     },
  HD: { bg:'#fff7ed', c:'#9a3412', border:'#fdba74', label:'Half Day'      },
  A:  { bg:'#fef2f2', c:'#dc2626', border:'#fca5a5', label:'Absent'        },

const DEPTS   = ['All Departments','Nursing','Administration','Finance','IT','HR','Operations','Medical']
const FIRST   = ['Ram','Shyam','Hari','Sita','Gita','Maya','Binod','Sunil','Priya','Anil','Bikash','Sunita','Rajesh','Puja','Deepak','Anita','Sanjay','Rupa','Nabin','Sabita']
const LAST    = ['Thapa','Shrestha','Maharjan','Tamang','Gurung','Rai','Limbu','Karki','Basnet','Adhikari','KC','Bhattarai','Sharma','Poudel']
const DESIG   = ['Staff Nurse','Head Nurse','Admin Officer','HR Officer','Finance Officer','Manager','Officer','Supervisor']
const rand    = a=>a[Math.floor(Math.random()*a.length)]

function genLBRow(i) {
  const daysAtt = 15+Math.floor(Math.random()*8)
  const cl_m=Math.floor(Math.random()*3), el_m=Math.floor(Math.random()*5), sl_m=Math.floor(Math.random()*2)
  const hd_m=Math.floor(Math.random()*2), ab_m=Math.floor(Math.random()*2)
  const cl_b=7-cl_m, el_b=parseFloat((14+Math.random()*2-el_m).toFixed(2)), sl_b=8-sl_m
  const el_cf=parseFloat((Math.random()*5).toFixed(2))
  const cl_ap=7, el_ap=parseFloat((14+el_cf).toFixed(2)), sl_ap=8
  return {
    no:i+1,srNo:i+1,empCode:`EMP-${String(i+1).padStart(4,'0')}`,
    name:`${rand(FIRST)} ${rand(LAST)}`,desig:rand(DESIG),dept:rand(DEPTS.slice(1)),
    daysAtt,
    // Leaves in month
    cl_m,el_m,sl_m,hd_m,ab_m,
    // Balance
    cl_b,el_b,sl_b,
    // Consumed
    cl_c:cl_m,el_c:el_m,sl_c:sl_m,
    // Carry forward
    el_cf,sl_cf:parseFloat((Math.random()*2).toFixed(2)),
    // Applicable
    cl_ap,el_ap,sl_ap,
const ALL_LB = Array.from({length:33},(_,i)=>genLBRow(i))

const G  = 'linear-gradient(135deg,#14532d 0%,#15803d 55%,#86efac 100%)'
const A  = '#15803d'
const today = new Date().toISOString().split('T')[0]
const inp   = {padding:'7px 10px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:10,
  outline:'none',background:'#fff',fontFamily:'inherit',boxSizing:'border-box'}

const GH = ({label,span,bg='#14532d',subcolor='rgba(255,255,255,.8)'}) => (
  <th colSpan={span} style={{padding:'5px 8px',textAlign:'center',fontSize:8,fontWeight:700,
    color:'#fff',borderRight:'2px solid rgba(255,255,255,.25)',background:bg,
    position:'sticky',top:0,zIndex:2}}>{label}</th>
)
const CH = ({label,w=60,bg='#15803d'}) => (
  <th style={{padding:'5px 4px',textAlign:'center',fontSize:8,fontWeight:700,color:'#fff',
    width:w,minWidth:w,borderRight:'1px solid rgba(255,255,255,.15)',
    position:'sticky',top:0,zIndex:2,background:bg}}>{label}</th>
)
const LV = ({val,type}) => {
  if (!val&&val!==0) return <td style={{padding:'5px 6px',textAlign:'center',fontSize:9,color:'#94a3b8',borderBottom:'1px solid #f1f5f9'}}>—</td>
  const lc = LEAVE_COLORS[type]||{bg:'#f8fafc',c:'#374151',border:'#e2e8f0'}
  return (
    <td style={{padding:'5px 6px',textAlign:'center',fontSize:9,fontWeight:700,
      background:lc.bg,color:lc.c,borderBottom:`1px solid ${lc.border}`}}>
      {parseFloat(val).toFixed(val%1===0?0:2)}
    </td>
  )

}
}
}
}

export default function LeaveBalanceReportPage() {
  const [dept,setDept]   = useState('All Departments')
  const [month,setMonth] = useState(today.slice(0,7))
  const [search,setSearch]=useState('')
  const [msg,setMsg]     = useState('')
  const [sigs,setSigs]   = useState({
    prepared:{name:'',designation:'',date:today,signed:false},
    verified:{name:'',designation:'',date:today,signed:false},
    approved:{name:'',designation:'',date:today,signed:false},
  })
  const [showSig,setShowSig] = useState(false)
  const fileRef = useRef(null)
  const notify  = m=>{setMsg(m);setTimeout(()=>setMsg(''),3500)}
  const sign    = k2=>{
    const s=sigs[k2];if(!s.name||!s.designation){notify('⚠️ Fill name & designation');return}
    setSigs(p=>({...p,[k2]:{...p[k2],signed:true,date:today}}));notify(`✅ ${k2} signed`)

  const filtered = ALL_LB.filter(r=>{
    if(dept!=='All Departments'&&r.dept!==dept) return false
    if(search&&!r.name.toLowerCase().includes(search.toLowerCase())&&!r.empCode.includes(search)) return false
    return true
  })

  const totDays = filtered.reduce((s,r)=>s+r.daysAtt,0)
  const totCLB  = parseFloat(filtered.reduce((s,r)=>s+r.cl_b,0).toFixed(2))
  const totELB  = parseFloat(filtered.reduce((s,r)=>s+r.el_b,0).toFixed(2))

  const exportCSV = () => {
    const h=['No','Sr.No','Emp Code','Name','Designation','Dept','Days Attended',
      'CL Month','EL Month','SL Month','HD Month','Absent',
      'CL Balance','EL Balance','SL Balance',
      'CL Consumed','EL Consumed','SL Consumed',
      'EL CF','SL CF','CL Applicable','EL Applicable','SL Applicable','Remarks']
    const body=filtered.map(r=>[r.no,r.srNo,r.empCode,`"${r.name}"`,`"${r.desig}"`,`"${r.dept}"`,r.daysAtt,
      r.cl_m,r.el_m,r.sl_m,r.hd_m,r.ab_m,r.cl_b,r.el_b,r.sl_b,r.cl_c,r.el_c,r.sl_c,
      r.el_cf,r.sl_cf,r.cl_ap,r.el_ap,r.sl_ap,r.remarks])
    const blob=new Blob([[h,...body].map(r=>r.join(',')).join('\n')],{type:'text/csv'})
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Leave_Balance_${month}.csv`;a.click()
    notify('📤 Exported')

  return (
    <div style={{fontFamily:'system-ui,sans-serif',height:'100vh',display:'flex',flexDirection:'column',background:'#f0fdf4'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0fdf4',
        border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 18px',fontSize:11,color:'#065f46',
        boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:400}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,padding:'12px 20px',color:'#fff',flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontSize:17,fontWeight:900}}>📊 Leave Balance Report</div>
            <div style={{fontSize:9,opacity:.75}}>CL · EL · SL · ML · BL · HD — colour-coded · Balance · Consumed · Carry Forward · Applicable</div>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <button onClick={()=>fileRef.current?.click()}
              style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid rgba(255,255,255,.5)',
                background:'rgba(255,255,255,.15)',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>
              📥 Import<input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e=>notify(`📂 ${e.target.files[0]?.name}`)} style={{display:'none'}}/>
            </button>
            <button onClick={exportCSV}
              style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid rgba(255,255,255,.5)',
                background:'rgba(255,255,255,.15)',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>📤 Export</button>
            <button onClick={()=>setShowSig(true)}
              style={{padding:'6px 12px',borderRadius:8,border:'none',background:'#fff',color:A,fontSize:9,fontWeight:800,cursor:'pointer'}}>✍️ Signatures</button>
            <button onClick={()=>notify('🖨 Printing...')}
              style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid rgba(255,255,255,.5)',
                background:'rgba(255,255,255,.15)',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>🖨 Print</button>
          </div>
        </div>
        {/* Stats */}
        <div style={{display:'flex',gap:10,marginTop:10,flexWrap:'wrap'}}>
          {[['👥','Total Staff',filtered.length],['📅','Avg Days',Math.round(totDays/filtered.length||0)],
            ['🟡','Total CL Bal',totCLB],['🟠','Total EL Bal',totELB],
            ['🔴','Total Absent',filtered.reduce((s,r)=>s+r.ab_m,0)]
          ].map(([ic,lb,v])=>(
            <div key={lb} style={{background:'rgba(255,255,255,.12)',borderRadius:8,padding:'6px 12px',textAlign:'center',minWidth:80}}>
              <div style={{fontSize:14,fontWeight:900}}>{v}</div>
              <div style={{fontSize:8,opacity:.75}}>{ic} {lb}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{background:'#fff',padding:'8px 16px',flexShrink:0,boxShadow:'0 1px 4px rgba(0,0,0,.06)',
        display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div style={{flex:'1 1 120px'}}>
          <label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>Month</label>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{...inp,width:'100%'}}/>
        </div>
        <div style={{flex:'1 1 150px'}}>
          <label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>Department</label>
          <select value={dept} onChange={e=>setDept(e.target.value)} style={{...inp,width:'100%'}}>
            {DEPTS.map(d=><option key={d}>{d}</option>)}
          </select>
        </div>
        <div style={{flex:'2 1 180px'}}>
          <label style={{fontSize:8,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>Search</label>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name or Emp Code..." style={{...inp,width:'100%'}}/>
        </div>
        <button onClick={()=>{setSearch('');setDept('All Departments')}}
          style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',fontSize:9,cursor:'pointer',color:'#64748b'}}>↺</button>
      </div>

      {/* Leave colour legend */}
      <div style={{background:'#fff',padding:'5px 16px',flexShrink:0,borderBottom:'1px solid #f1f5f9',
        display:'flex',gap:4,flexWrap:'wrap'}}>
        <span style={{fontSize:8,fontWeight:700,color:'#374151',marginRight:4,alignSelf:'center'}}>Leave Types:</span>
        {Object.entries(LEAVE_COLORS).map(([c,st])=>(
          <span key={c} style={{background:st.bg,color:st.c,border:`1px solid ${st.border}`,
            fontSize:7.5,fontWeight:700,padding:'1px 6px',borderRadius:4,whiteSpace:'nowrap'}}>
            {`${c}=${st.label}`}
          </span>
        ))}
      </div>

      {/* Table */}
      <div style={{flex:1,overflow:'auto',scrollbarWidth:'thin',scrollbarColor:`${A} #e2e8f0`}}>
        <style>{`::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-track{background:#f1f5f9;border-radius:5px}::-webkit-scrollbar-thumb{background:${A};border-radius:5px}::-webkit-scrollbar-corner{background:#f1f5f9}`}</style>
        <table style={{borderCollapse:'collapse',fontSize:9,width:'max-content',minWidth:'100%'}}>
          <thead>
            <tr>
              <GH label="EMPLOYEE"             span={7} bg="#14532d"/>
              <GH label="LEAVES IN MONTH"      span={5} bg="#9a3412"/>
              <GH label="TOTAL BALANCE"        span={3} bg="#0369a1"/>
              <GH label="TOTAL CONSUMED"       span={3} bg="#7c3aed"/>
              <GH label="CARRY FORWARD"        span={2} bg="#0891b2"/>
              <GH label="APPLICABLE"           span={3} bg="#d97706"/>
              <GH label="REMARKS"              span={1} bg="#374151"/>
            </tr>
            <tr>
              {/* Employee info */}
              <CH label="No"         w={40}/>
              <CH label="Sr.No"      w={40}/>
              <CH label="Emp Code"   w={80}/>
              <CH label="Name"       w={140}/>
              <CH label="Designation" w={110}/>
              <CH label="Department"  w={100}/>
              <CH label="Days Attended" w={60} bg="#0c6b38"/>
              {/* Leaves in month - each has its colour in header */}
              {[['CL','#075985','#e0f2fe'],['EL','#92400e','#fffbeb'],['SL','#991b1b','#fef2f2'],
                ['HD','#9a3412','#fff7ed'],['A','#dc2626','#fef2f2']].map(([c,tc,bc])=>(
                <th key={c} style={{padding:'5px 4px',textAlign:'center',fontSize:8,fontWeight:700,
                  color:tc,background:bc,borderRight:`1px solid ${tc}30`,position:'sticky',top:0,zIndex:2,minWidth:40}}>
                  {c}
                </th>
              ))}
              {/* Balance */}
              {[['CL','#075985','#e0f2fe'],['EL','#92400e','#fffbeb'],['SL','#991b1b','#fef2f2']].map(([c,tc,bc])=>(
                <th key={`b${c}`} style={{padding:'5px 4px',textAlign:'center',fontSize:8,fontWeight:700,
                  color:tc,background:bc,borderRight:`1px solid ${tc}30`,position:'sticky',top:0,zIndex:2,minWidth:55}}>
                  {c}
                </th>
              ))}
              {/* Consumed */}
              {[['CL','#075985','#e0f2fe'],['EL','#92400e','#fffbeb'],['SL','#991b1b','#fef2f2']].map(([c,tc,bc])=>(
                <th key={`c${c}`} style={{padding:'5px 4px',textAlign:'center',fontSize:8,fontWeight:700,
                  color:'#fff',background:'#7c3aed',borderRight:'1px solid rgba(255,255,255,.2)',position:'sticky',top:0,zIndex:2,minWidth:40}}>
                  {c}
                </th>
              ))}
              {/* CF */}
              {[['EL','#0891b2'],['SL','#0891b2']].map(([c,bc])=>(
                <th key={`cf${c}`} style={{padding:'5px 4px',textAlign:'center',fontSize:8,fontWeight:700,
                  color:'#fff',background:'#0891b2',borderRight:'1px solid rgba(255,255,255,.2)',position:'sticky',top:0,zIndex:2,minWidth:40}}>
                  {c}
                </th>
              ))}
              {/* Applicable */}
              {[['CL','#d97706'],['EL','#d97706'],['SL','#d97706']].map(([c,bc])=>(
                <th key={`ap${c}`} style={{padding:'5px 4px',textAlign:'center',fontSize:8,fontWeight:700,
                  color:'#fff',background:'#d97706',borderRight:'1px solid rgba(255,255,255,.2)',position:'sticky',top:0,zIndex:2,minWidth:55}}>
                  {c}
                </th>
              ))}
              <th style={{padding:'5px 8px',textAlign:'left',fontSize:8,fontWeight:700,
                color:'#fff',background:'#374151',position:'sticky',top:0,zIndex:2,minWidth:100}}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r,i)=>(
              <tr key={r.no}
                onMouseEnter={e=>e.currentTarget.style.background='#f0fdf4'}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'#fff':'#fafafa'}>
                <td style={{padding:'5px 6px',textAlign:'center',fontWeight:700,color:'#64748b',borderBottom:'1px solid #f1f5f9',fontSize:9}}>{r.no}</td>
                <td style={{padding:'5px 6px',textAlign:'center',color:'#64748b',borderBottom:'1px solid #f1f5f9',fontSize:9}}>{r.srNo}</td>
                <td style={{padding:'5px 6px',fontFamily:'monospace',fontSize:8.5,color:'#0369a1',borderBottom:'1px solid #f1f5f9'}}>{r.empCode}</td>
                <td style={{padding:'5px 6px',fontWeight:700,color:'#0f172a',borderBottom:'1px solid #f1f5f9',whiteSpace:'nowrap'}}>{r.name}</td>
                <td style={{padding:'5px 6px',fontSize:8.5,color:'#475569',borderBottom:'1px solid #f1f5f9'}}>{r.desig}</td>
                <td style={{padding:'5px 6px',fontSize:8.5,color:'#475569',borderBottom:'1px solid #f1f5f9'}}>{r.dept}</td>
                <td style={{padding:'5px 6px',textAlign:'center',fontWeight:800,color:'#059669',borderBottom:'1px solid #f1f5f9',background:'#f0fdf4'}}>{r.daysAtt}</td>
                <LV val={r.cl_m} type="CL"/>
                <LV val={r.el_m} type="EL"/>
                <LV val={r.sl_m} type="SL"/>
                <LV val={r.hd_m} type="HD"/>
                <LV val={r.ab_m} type="A"/>
                <LV val={r.cl_b} type="CL"/>
                <LV val={r.el_b} type="EL"/>
                <LV val={r.sl_b} type="SL"/>
                <td style={{padding:'5px 6px',textAlign:'center',fontSize:9,fontWeight:700,color:'#7c3aed',borderBottom:'1px solid #f1f5f9',background:'#f5f3ff'}}>{r.cl_c}</td>
                <td style={{padding:'5px 6px',textAlign:'center',fontSize:9,fontWeight:700,color:'#7c3aed',borderBottom:'1px solid #f1f5f9',background:'#f5f3ff'}}>{r.el_c}</td>
                <td style={{padding:'5px 6px',textAlign:'center',fontSize:9,fontWeight:700,color:'#7c3aed',borderBottom:'1px solid #f1f5f9',background:'#f5f3ff'}}>{r.sl_c}</td>
                <td style={{padding:'5px 6px',textAlign:'center',fontSize:9,fontWeight:700,color:'#0891b2',borderBottom:'1px solid #f1f5f9',background:'#f0f9ff'}}>{r.el_cf}</td>
                <td style={{padding:'5px 6px',textAlign:'center',fontSize:9,fontWeight:700,color:'#0891b2',borderBottom:'1px solid #f1f5f9',background:'#f0f9ff'}}>{r.sl_cf}</td>
                <td style={{padding:'5px 6px',textAlign:'center',fontSize:9,fontWeight:700,color:'#d97706',borderBottom:'1px solid #f1f5f9',background:'#fffbeb'}}>{r.cl_ap}</td>
                <td style={{padding:'5px 6px',textAlign:'center',fontSize:9,fontWeight:700,color:'#d97706',borderBottom:'1px solid #f1f5f9',background:'#fffbeb'}}>{r.el_ap}</td>
                <td style={{padding:'5px 6px',textAlign:'center',fontSize:9,fontWeight:700,color:'#d97706',borderBottom:'1px solid #f1f5f9',background:'#fffbeb'}}>{r.sl_ap}</td>
                <td style={{padding:'5px 8px',fontSize:9,color:'#94a3b8',borderBottom:'1px solid #f1f5f9'}}>—</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{background:'#14532d',color:'#fff',position:'sticky',bottom:0}}>
              <td colSpan={7} style={{padding:'7px 10px',fontWeight:800,fontSize:10}}>TOTALS — {filtered.length}</td>
              <td style={{padding:'6px 4px',textAlign:'center',fontWeight:800,color:'#bbf7d0'}}>{filtered.reduce((s,r)=>s+r.cl_m,0)}</td>
              <td style={{padding:'6px 4px',textAlign:'center',fontWeight:800,color:'#fde68a'}}>{filtered.reduce((s,r)=>s+r.el_m,0)}</td>
              <td style={{padding:'6px 4px',textAlign:'center',fontWeight:800,color:'#fca5a5'}}>{filtered.reduce((s,r)=>s+r.sl_m,0)}</td>
              <td style={{padding:'6px 4px',textAlign:'center',color:'#d1d5db'}}>{filtered.reduce((s,r)=>s+r.hd_m,0)}</td>
              <td style={{padding:'6px 4px',textAlign:'center',color:'#fca5a5',fontWeight:800}}>{filtered.reduce((s,r)=>s+r.ab_m,0)}</td>
              <td style={{padding:'6px 4px',textAlign:'center',color:'#bae6fd',fontWeight:800}}>{totCLB}</td>
              <td style={{padding:'6px 4px',textAlign:'center',color:'#fde68a',fontWeight:800}}>{totELB}</td>
              <td colSpan={9} style={{padding:'6px 8px',opacity:.7}}>—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Digital Signature Footer */}
      <div style={{background:'#fff',borderTop:'2px solid #f1f5f9',padding:'8px 16px',flexShrink:0}}>
        <div style={{display:'flex',gap:10}}>
          {[['Prepared By','prepared'],['Verified By','verified'],['Approved By','approved']].map(([role,key2])=>{
            const s=sigs[key2]
            return (
              <div key={key2} style={{flex:1,border:`1.5px solid ${s.signed?'#059669':'#e2e8f0'}`,borderRadius:9,padding:'8px 12px',minWidth:0}}>
                <div style={{fontSize:9,fontWeight:800,color:'#374151',marginBottom:3}}>{role}</div>
                {s.signed?(
                  <>
                    <div style={{fontFamily:'cursive',fontSize:14,color:A,borderBottom:`1px solid ${A}`,paddingBottom:2,marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.name}</div>
                    <div style={{fontSize:8,color:'#475569'}}>{s.designation} · {s.date}</div>
                    <div style={{fontSize:8,color:'#059669',fontWeight:700}}>✅ Digitally Signed</div>
                  </>
                ):(
                  <div style={{fontSize:9,color:'#94a3b8'}}>
                    Not signed
                    <button onClick={()=>setShowSig(true)}
                      style={{display:'block',marginTop:3,padding:'3px 8px',borderRadius:5,border:'none',background:A+'15',color:A,fontSize:8,fontWeight:700,cursor:'pointer'}}>Sign →</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Signature Modal */}
      {showSig&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,display:'flex',
          alignItems:'center',justifyContent:'center',padding:12}} onClick={()=>setShowSig(false)}>
          <div style={{background:'#fff',borderRadius:18,width:680,maxWidth:'97vw',maxHeight:'93vh',overflowY:'auto'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>✍️ Digital Signatures — Leave Balance Report</div>
            </div>
            <div style={{padding:'20px 22px'}}>
              <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
                {[['Prepared By','prepared'],['Verified By','verified'],['Approved By','approved']].map(([role,key2])=>{
                  const s=sigs[key2]
                  return (
                    <div key={key2} style={{flex:1,border:`1.5px solid ${s.signed?'#059669':'#e2e8f0'}`,borderRadius:10,padding:'14px',minWidth:180}}>
                      <div style={{fontSize:10,fontWeight:800,color:'#374151',marginBottom:10}}>{role}</div>
                      {['name','designation','date'].map(k=>(
                        <div key={k} style={{marginBottom:8}}>
                          <label style={{fontSize:8,fontWeight:700,color:'#64748b',display:'block',marginBottom:2,textTransform:'capitalize'}}>{k}</label>
                          <input type={k==='date'?'date':'text'} value={s[k]}
                            onChange={e=>setSigs(p=>({...p,[key2]:{...p[key2],[k]:e.target.value}}))}
                            style={{...inp,width:'100%',fontSize:9}}/>
                        </div>
                      ))}
                      {s.signed?(
                        <div style={{textAlign:'center',marginTop:8,borderTop:'1.5px dashed #e2e8f0',paddingTop:8}}>
                          <div style={{fontFamily:'cursive',fontSize:18,color:A,borderBottom:`1.5px solid ${A}`,paddingBottom:3,marginBottom:4}}>{s.name}</div>
                          <div style={{fontSize:8,color:'#059669',fontWeight:700}}>✅ Signed — {s.date}</div>
                        </div>
                      ):(
                        <button onClick={()=>sign(key2)}
                          style={{width:'100%',marginTop:8,padding:'8px',borderRadius:8,border:'none',
                            background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                          ✍️ Sign Digitally
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <button onClick={()=>setShowSig(false)}
                style={{marginTop:14,width:'100%',padding:'10px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

}
