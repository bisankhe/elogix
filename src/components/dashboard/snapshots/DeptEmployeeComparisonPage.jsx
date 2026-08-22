// FILE: DeptEmployeeComparisonPage.jsx — Department-wise Employee Comparison
// Total, level-wise, position-wise, gender, headcount table
import { useState } from 'react'
const G = 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#3b82f6 100%)'
const A = '#1e40af'

const DEPTS = [
  { name:'Information Technology', head:'Rajesh Sharma (CTO)',    total:28, male:18,female:10,
    levels:{executive:2,senior:8,officer:12,junior:4,intern:2},
    positions:[{pos:'CTO',n:1},{pos:'IT Lead',n:3},{pos:'Sr Engineer',n:6},{pos:'Engineer',n:10},{pos:'Jr Engineer',n:4},{pos:'Intern',n:4}],
    color:'#3b82f6' },
  { name:'Finance & Accounts',     head:'Sanjay Karki (CFO)',     total:14, male:7,female:7,
    levels:{executive:1,senior:4,officer:6,junior:2,intern:1},
    positions:[{pos:'CFO',n:1},{pos:'Finance Manager',n:2},{pos:'Accountant',n:5},{pos:'Finance Officer',n:4},{pos:'Intern',n:2}],
    color:'#7c3aed' },
  { name:'Human Resources',        head:'Priya Adhikari (CHRO)',  total:12, male:4,female:8,
    levels:{executive:1,senior:3,officer:5,junior:2,intern:1},
    positions:[{pos:'CHRO',n:1},{pos:'HR Manager',n:2},{pos:'HR Officer',n:5},{pos:'HR Asst',n:3},{pos:'Intern',n:1}],
    color:'#059669' },
  { name:'Marketing & Sales',      head:'Dev Thapa (CMO)',        total:18, male:10,female:8,
    levels:{executive:1,senior:5,officer:8,junior:3,intern:1},
    positions:[{pos:'CMO',n:1},{pos:'Sales Manager',n:2},{pos:'Sales Exec',n:8},{pos:'Marketing Exec',n:5},{pos:'Intern',n:2}],
    color:'#f59e0b' },
  { name:'Operations',             head:'Maya Gurung (COO)',       total:22, male:16,female:6,
    levels:{executive:1,senior:4,officer:10,junior:5,intern:2},
    positions:[{pos:'COO',n:1},{pos:'Ops Manager',n:3},{pos:'Supervisor',n:5},{pos:'Team Lead',n:5},{pos:'Ops Staff',n:8}],
    color:'#ef4444' },
  { name:'Administration',         head:'Rita Shrestha',           total:8,  male:3,female:5,
    levels:{executive:0,senior:2,officer:4,junior:1,intern:1},
    positions:[{pos:'Admin Manager',n:1},{pos:'Admin Officer',n:4},{pos:'Receptionist',n:2},{pos:'Intern',n:1}],
    color:'#64748b' },
]
const TOTAL = DEPTS.reduce((s,d)=>s+d.total,0)
const LEVEL_COLORS = {executive:'#7c3aed',senior:'#3b82f6',officer:'#059669',junior:'#f59e0b',intern:'#94a3b8'}

export default function DeptEmployeeComparisonPage() {
  const [view, setView] = useState('cards')
  const [sel, setSel]   = useState(null)
  const selected = DEPTS.find(d=>d.name===sel)

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:G,borderRadius:14,padding:'16px 22px',marginBottom:14,color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div><h2 style={{margin:0,fontSize:20,fontWeight:900}}>🏢 Department-wise Employee Comparison</h2>
            <p style={{margin:'3px 0 0',fontSize:10,opacity:.8}}>Total: {TOTAL} employees · {DEPTS.length} departments · Level-wise · Position-wise · Gender breakdown</p>
          </div>
          <div style={{display:'flex',gap:6}}>
            {['cards','table','bar'].map(v=><button key={v} onClick={()=>setView(v)} style={{padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:9,fontWeight:700,background:view===v?'rgba(255,255,255,.9)':'rgba(255,255,255,.15)',color:view===v?A:'#fff'}}>{v==='cards'?'🃏 Cards':v==='table'?'📋 Table':'📊 Bar Chart'}</button>)}
          </div>
        </div>
      </div>

      {/* Summary pills */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {Object.entries(LEVEL_COLORS).map(([l,c])=>(
          <div key={l} style={{background:'#fff',border:`1px solid ${c}30`,borderRadius:20,padding:'5px 14px',display:'flex',gap:6,alignItems:'center'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:c}}/><span style={{fontSize:9,fontWeight:700,color:'#374151',textTransform:'capitalize'}}>{l}</span>
            <span style={{fontSize:9,fontWeight:900,color:c}}>{DEPTS.reduce((s,d)=>s+(d.levels[l]||0),0)}</span>
          </div>
        ))}
        <div style={{background:'#f1f5f9',borderRadius:20,padding:'5px 14px',fontSize:9,fontWeight:700,color:'#374151'}}>👨 Male: {DEPTS.reduce((s,d)=>s+d.male,0)} &nbsp; 👩 Female: {DEPTS.reduce((s,d)=>s+d.female,0)}</div>
      </div>

      {view==='cards'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:12}}>
          {DEPTS.map(d=>(
            <div key={d.name} onClick={()=>setSel(sel===d.name?null:d.name)} style={{background:'#fff',borderRadius:14,border:`2px solid ${sel===d.name?d.color:'#e2e8f0'}`,padding:16,cursor:'pointer',transition:'all .15s',boxShadow:sel===d.name?`0 4px 16px ${d.color}20`:'none'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                <div>
                  <div style={{fontSize:12,fontWeight:900,color:'#0f172a'}}>{d.name}</div>
                  <div style={{fontSize:9,color:'#64748b'}}>{d.head}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:24,fontWeight:900,color:d.color}}>{d.total}</div>
                  <div style={{fontSize:8,color:'#94a3b8'}}>employees</div>
                </div>
              </div>
              {/* Gender bar */}
              <div style={{height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden',display:'flex',marginBottom:8}}>
                <div style={{height:'100%',background:'#3b82f6',width:(d.male/d.total*100)+'%'}}/>
                <div style={{height:'100%',background:'#ec4899',width:(d.female/d.total*100)+'%'}}/>
              </div>
              <div style={{display:'flex',gap:10,fontSize:8,color:'#64748b',marginBottom:10}}>
                <span>👨 {d.male} M</span><span>👩 {d.female} F</span>
              </div>
              {/* Level breakdown */}
              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {Object.entries(d.levels).filter(([,n])=>n>0).map(([l,n])=>(
                  <span key={l} style={{fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20,background:LEVEL_COLORS[l]+'18',color:LEVEL_COLORS[l],textTransform:'capitalize'}}>{l}: {n}</span>
                ))}
              </div>
              {sel===d.name&&(
                <div style={{marginTop:12,borderTop:'1px solid #f1f5f9',paddingTop:10}}>
                  <div style={{fontSize:9,fontWeight:700,color:'#374151',marginBottom:6}}>Positions</div>
                  {d.positions.map(p=>(
                    <div key={p.pos} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:9,borderBottom:'1px solid #f8fafc'}}>
                      <span style={{color:'#374151'}}>{p.pos}</span>
                      <span style={{fontWeight:700,color:d.color}}>{p.n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {view==='table'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:10,minWidth:700}}>
            <thead><tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
              {['Department','HOD','Total','Male','Female','Executive','Senior','Officer','Junior','Intern'].map(h=><th key={h} style={{padding:'11px 13px',textAlign:'left',fontSize:9,fontWeight:800,color:'#475569',whiteSpace:'nowrap'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {DEPTS.map((d,i)=>(
                <tr key={d.name} style={{borderBottom:'1px solid #f1f5f9',background:i%2?'#fafafa':'#fff'}}>
                  <td style={{padding:'11px 13px'}}><div style={{display:'flex',gap:6,alignItems:'center'}}><div style={{width:10,height:10,borderRadius:2,background:d.color}}/><span style={{fontWeight:700}}>{d.name}</span></div></td>
                  <td style={{padding:'11px 13px',fontSize:9,color:'#64748b'}}>{d.head}</td>
                  <td style={{padding:'11px 13px',fontWeight:900,color:d.color,fontSize:14}}>{d.total}</td>
                  <td style={{padding:'11px 13px',color:'#3b82f6',fontWeight:700}}>👨{d.male}</td>
                  <td style={{padding:'11px 13px',color:'#ec4899',fontWeight:700}}>👩{d.female}</td>
                  {['executive','senior','officer','junior','intern'].map(l=><td key={l} style={{padding:'11px 13px',fontWeight:d.levels[l]>0?700:400,color:d.levels[l]>0?LEVEL_COLORS[l]:'#e2e8f0'}}>{d.levels[l]||'—'}</td>)}
                </tr>
              ))}
              <tr style={{background:'#f0f9ff',fontWeight:900,borderTop:'2px solid #e2e8f0'}}>
                <td style={{padding:'11px 13px',fontWeight:900}}>TOTAL</td>
                <td style={{padding:'11px 13px',color:'#64748b',fontSize:9}}>{DEPTS.length} Departments</td>
                <td style={{padding:'11px 13px',fontWeight:900,color:A,fontSize:14}}>{TOTAL}</td>
                <td style={{padding:'11px 13px',fontWeight:900,color:'#3b82f6'}}>{DEPTS.reduce((s,d)=>s+d.male,0)}</td>
                <td style={{padding:'11px 13px',fontWeight:900,color:'#ec4899'}}>{DEPTS.reduce((s,d)=>s+d.female,0)}</td>
                {['executive','senior','officer','junior','intern'].map(l=><td key={l} style={{padding:'11px 13px',fontWeight:900,color:LEVEL_COLORS[l]}}>{DEPTS.reduce((s,d)=>s+(d.levels[l]||0),0)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {view==='bar'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'20px'}}>
          <div style={{display:'grid',gap:14}}>
            {DEPTS.map(d=>(
              <div key={d.name}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:5}}>
                  <span style={{fontWeight:700,color:'#374151'}}>{d.name}</span>
                  <span style={{fontWeight:900,color:d.color}}>{d.total} ({Math.round(d.total/TOTAL*100)}%)</span>
                </div>
                <div style={{height:28,background:'#f1f5f9',borderRadius:8,overflow:'hidden',display:'flex'}}>
                  <div style={{height:'100%',background:'#3b82f6',width:(d.male/TOTAL*100)+'%'}} title={`Male: ${d.male}`}/>
                  <div style={{height:'100%',background:'#ec4899',width:(d.female/TOTAL*100)+'%'}} title={`Female: ${d.female}`}/>
                </div>
                <div style={{display:'flex',gap:8,fontSize:8,color:'#94a3b8',marginTop:3}}>
                  <span>👨{d.male}</span><span>👩{d.female}</span>
                  {Object.entries(d.levels).filter(([,n])=>n>0).map(([l,n])=><span key={l} style={{color:LEVEL_COLORS[l]}}>{l[0].toUpperCase()}: {n}</span>)}
                </div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:12,marginTop:14,padding:'10px 0',borderTop:'1px solid #f1f5f9',fontSize:8}}>
            <span style={{display:'flex',gap:4,alignItems:'center'}}><div style={{width:10,height:10,borderRadius:2,background:'#3b82f6'}}/> Male</span>
            <span style={{display:'flex',gap:4,alignItems:'center'}}><div style={{width:10,height:10,borderRadius:2,background:'#ec4899'}}/> Female</span>
          </div>
        </div>
      )}
    </div>
  )
}
