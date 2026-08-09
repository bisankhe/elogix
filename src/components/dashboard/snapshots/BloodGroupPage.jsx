// FILE: BloodGroupPage.jsx — Blood Group Directory
// Click group to see employee list | Shows unrecorded employees
import { useState } from 'react'
const G = 'linear-gradient(135deg,#7f1d1d 0%,#dc2626 60%,#fca5a5 100%)'
const A = '#dc2626'
const GROUPS = [
  { group:'A+',  count:28, color:'#dc2626', bg:'#fef2f2' },
  { group:'A-',  count:8,  color:'#b91c1c', bg:'#fee2e2' },
  { group:'B+',  count:24, color:'#d97706', bg:'#fffbeb' },
  { group:'B-',  count:6,  color:'#b45309', bg:'#fef3c7' },
  { group:'AB+', count:12, color:'#7c3aed', bg:'#f5f3ff' },
  { group:'AB-', count:4,  color:'#6d28d9', bg:'#ede9fe' },
  { group:'O+',  count:32, color:'#059669', bg:'#f0fdf4' },
  { group:'O-',  count:10, color:'#047857', bg:'#dcfce7' },
]
const ALL_EMP = {
  'A+': [{id:'E001',name:'Gita Maharjan',dept:'IT',pos:'Cloud Architect',phone:'+977-9801111111',blood:'A+'},{id:'E002',name:'Sunita Rai',dept:'IT',pos:'Sr Developer',phone:'+977-9802222222',blood:'A+'},{id:'E003',name:'Maya Pradhan',dept:'Finance',pos:'Finance Manager',phone:'+977-9803333333',blood:'A+'},{id:'E004',name:'Hari Thapa',dept:'IT',pos:'DevOps Eng',phone:'+977-9804444444',blood:'A+'}],
  'B+': [{id:'E010',name:'Bikash KC',dept:'Sales',pos:'Sales Executive',phone:'+977-9810101010',blood:'B+'},{id:'E011',name:'Anita Gurung',dept:'HR',pos:'HR Officer',phone:'+977-9811111111',blood:'B+'}],
  'O+': [{id:'E020',name:'Rajesh Sharma',dept:'IT',pos:'CTO',phone:'+977-9820202020',blood:'O+'},{id:'E021',name:'Priya Adhikari',dept:'HR',pos:'HR Head',phone:'+977-9821212121',blood:'O+'},{id:'E022',name:'Dev Thapa',dept:'Marketing',pos:'Mktg Head',phone:'+977-9822222222',blood:'O+'}],
  'AB+': [{id:'E030',name:'Sanjay Karki',dept:'Finance',pos:'CFO',phone:'+977-9830303030',blood:'AB+'}],
}
const UNRECORDED = [
  {id:'E050',name:'Ram Bhandari',dept:'Operations',pos:'Guard',joined:'2081-03-20'},
  {id:'E051',name:'Sita Lama',dept:'Marketing',pos:'Exec',joined:'2081-03-15'},
  {id:'E052',name:'Dipak Tamang',dept:'IT',pos:'Junior Dev',joined:'2081-03-28'},
]
const TOTAL = GROUPS.reduce((s,g)=>s+g.count,0)

export default function BloodGroupPage() {
  const [sel, setSel] = useState(null)
  const [tab, setTab] = useState('groups')
  const emp = sel ? (ALL_EMP[sel]||[]) : []
  const selG = GROUPS.find(g=>g.group===sel)

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:G,borderRadius:14,padding:'16px 22px',marginBottom:14,color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div><h2 style={{margin:0,fontSize:20,fontWeight:900}}>🩸 Blood Group Directory</h2>
            <p style={{margin:'3px 0 0',fontSize:10,opacity:.8}}>Total recorded: {TOTAL} · Unrecorded: {UNRECORDED.length} · Click any group to view employees</p>
          </div>
          <div style={{display:'flex',gap:6}}>
            {['groups','unrecorded'].map(t=><button key={t} onClick={()=>{setTab(t);setSel(null)}} style={{padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:9,fontWeight:700,background:tab===t?'rgba(255,255,255,.9)':'rgba(255,255,255,.15)',color:tab===t?A:'#fff'}}>{t==='groups'?'🩸 By Group':'⚠️ Unrecorded ('+UNRECORDED.length+')'}</button>)}
          </div>
        </div>
      </div>

      {tab==='groups'&&(
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:14}}>
            {GROUPS.map(g=>(
              <div key={g.group} onClick={()=>setSel(sel===g.group?null:g.group)} style={{background:sel===g.group?g.color:'#fff',borderRadius:14,border:`2px solid ${g.color}`,padding:'18px 16px',textAlign:'center',cursor:'pointer',transition:'all .2s',boxShadow:sel===g.group?`0 4px 16px ${g.color}40`:'none'}}>
                <div style={{fontSize:24,fontWeight:900,color:sel===g.group?'#fff':g.color,marginBottom:4}}>{g.group}</div>
                <div style={{fontSize:20,fontWeight:900,color:sel===g.group?'#fff':g.color}}>{g.count}</div>
                <div style={{fontSize:8,color:sel===g.group?'rgba(255,255,255,.8)':'#94a3b8'}}>employees</div>
                <div style={{fontSize:8,color:sel===g.group?'rgba(255,255,255,.7)':'#cbd5e1',marginTop:2}}>{Math.round(g.count/TOTAL*100)}%</div>
              </div>
            ))}
          </div>

          {sel&&(
            <div style={{background:'#fff',borderRadius:14,border:`2px solid ${selG?.color}30`,overflow:'hidden'}}>
              <div style={{background:`${selG?.color}10`,padding:'12px 18px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:13,fontWeight:900,color:selG?.color}}>Blood Group {sel} — {selG?.count} employees</div>
                {emp.length<(selG?.count||0)&&<span style={{fontSize:9,color:'#64748b'}}>Showing {emp.length} sample records</span>}
              </div>
              {emp.length>0?(
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
                  <thead><tr style={{background:'#f8fafc'}}>
                    {['Employee ID','Name','Department','Position','Phone','Blood Group'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,fontWeight:700,color:'#64748b'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>{emp.map((e,i)=>(
                    <tr key={e.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2?'#fafafa':'#fff'}}>
                      <td style={{padding:'10px 14px',color:'#3b82f6',fontWeight:700}}>{e.id}</td>
                      <td style={{padding:'10px 14px',fontWeight:700}}>{e.name}</td>
                      <td style={{padding:'10px 14px',color:'#475569'}}>{e.dept}</td>
                      <td style={{padding:'10px 14px',color:'#475569'}}>{e.pos}</td>
                      <td style={{padding:'10px 14px',color:'#64748b'}}>{e.phone}</td>
                      <td style={{padding:'10px 14px'}}><span style={{fontSize:9,fontWeight:800,padding:'3px 10px',borderRadius:20,background:selG?.bg,color:selG?.color}}>{e.blood}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              ):<div style={{padding:24,textAlign:'center',color:'#94a3b8',fontSize:11}}>Full employee list loads from backend API · {selG?.count} employees in group {sel}</div>}
            </div>
          )}
        </>
      )}

      {tab==='unrecorded'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{background:'#fff7ed',padding:'12px 18px',borderBottom:'1px solid #fde68a',display:'flex',gap:10,alignItems:'center'}}>
            <span style={{fontSize:18}}>⚠️</span>
            <div style={{fontSize:11,color:'#92400e'}}><strong>{UNRECORDED.length} employees</strong> have not recorded their blood group. Please collect and update their health records.</div>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Employee ID','Name','Department','Position','Joining Date','Action'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,fontWeight:700,color:'#64748b'}}>{h}</th>)}
            </tr></thead>
            <tbody>{UNRECORDED.map((e,i)=>(
              <tr key={e.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2?'#fafafa':'#fff'}}>
                <td style={{padding:'10px 14px',color:'#3b82f6',fontWeight:700}}>{e.id}</td>
                <td style={{padding:'10px 14px',fontWeight:700}}>{e.name}</td>
                <td style={{padding:'10px 14px',color:'#475569'}}>{e.dept}</td>
                <td style={{padding:'10px 14px',color:'#475569'}}>{e.pos}</td>
                <td style={{padding:'10px 14px',color:'#64748b'}}>{e.joined}</td>
                <td style={{padding:'10px 14px'}}><button style={{padding:'5px 12px',borderRadius:8,border:'none',background:'#dc2626',color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer'}}>📝 Update Blood Group</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
