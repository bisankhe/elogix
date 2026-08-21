// FILE: TenureChartPage.jsx — Tenure Chart with Pie, Bar, Table
import { useState } from 'react'
const G = 'linear-gradient(135deg,#1e3a5f 0%,#1e40af 60%,#60a5fa 100%)'
const A = '#1e40af'

const DATA = [
  { range:'< 1 Year',   count:18, color:'#f59e0b', pct:18 },
  { range:'1–2 Years',  count:24, color:'#3b82f6', pct:24 },
  { range:'2–5 Years',  count:32, color:'#8b5cf6', pct:32 },
  { range:'5–10 Years', count:16, color:'#10b981', pct:16 },
  { range:'10+ Years',  count:10, color:'#ef4444', pct:10 },
]
const TOTAL = DATA.reduce((s,d)=>s+d.count,0)
const EMPLOYEES = [
  {name:'Rajesh Sharma',   dept:'IT',      tenure:'12y 3m', range:'10+ Years'},
  {name:'Maya Pradhan',    dept:'Finance', tenure:'8y 7m',  range:'5–10 Years'},
  {name:'Sunita Rai',      dept:'HR',      tenure:'5y 1m',  range:'5–10 Years'},
  {name:'Bikash KC',       dept:'Sales',   tenure:'3y 4m',  range:'2–5 Years'},
  {name:'Anita Gurung',    dept:'IT',      tenure:'1y 8m',  range:'1–2 Years'},
  {name:'Ram Thapa',       dept:'Ops',     tenure:'0y 8m',  range:'< 1 Year'},
]

export default function TenureChartPage() {
  const [chart, setChart] = useState('bar')
  const [sel, setSel] = useState(null)

  const PieChart = () => {
    let startAngle = 0
    const cx=100,cy=100,r=80,ir=40
    const slices = DATA.map(d=>{
      const angle = (d.count/TOTAL)*360
      const start = startAngle; startAngle += angle
      const r2a = (a)=>(a-90)*Math.PI/180
      const x1=cx+r*Math.cos(r2a(start)),y1=cy+r*Math.sin(r2a(start))
      const x2=cx+r*Math.cos(r2a(start+angle)),y2=cy+r*Math.sin(r2a(start+angle))
      const xi1=cx+ir*Math.cos(r2a(start)),yi1=cy+ir*Math.sin(r2a(start))
      const xi2=cx+ir*Math.cos(r2a(start+angle)),yi2=cy+ir*Math.sin(r2a(start+angle))
      const lg = angle>180?1:0
      return {d:`M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${lg} 0 ${xi1} ${yi1} Z`,...d}
    })
    return (
      <svg viewBox="0 0 200 200" style={{width:180,height:180}}>
        {slices.map((s,i)=><path key={i} d={s.d} fill={s.color} stroke="#fff" strokeWidth={1.5} opacity={sel===s.range?.8:1} style={{cursor:'pointer'}} onClick={()=>setSel(sel===s.range?null:s.range)}/>)}
        <text x={cx} y={cy-6} textAnchor="middle" fontSize={18} fontWeight={900} fill="#0f172a">{TOTAL}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize={8} fill="#64748b">Total Staff</text>
      </svg>
    )

  const filtered = sel ? EMPLOYEES.filter(e=>e.range===sel) : EMPLOYEES

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:G,borderRadius:14,padding:'16px 22px',marginBottom:14,color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div><h2 style={{margin:0,fontSize:20,fontWeight:900}}>📊 Tenure Distribution</h2>
            <p style={{margin:'3px 0 0',fontSize:10,opacity:.8}}>Employee tenure breakdown · Average: {(DATA.reduce((s,d,i)=>s+d.count*([0.5,1.5,3.5,7.5,12][i]),0)/TOTAL).toFixed(1)} years</p>
          </div>
          <div style={{display:'flex',gap:6}}>
            {['bar','pie','table'].map(c=><button key={c} onClick={()=>setChart(c)} style={{padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:9,fontWeight:700,background:chart===c?'rgba(255,255,255,.9)':'rgba(255,255,255,.15)',color:chart===c?A:'#fff'}}>{c==='bar'?'📊 Bar':c==='pie'?'🥧 Pie':'📋 Table'}</button>)}
          </div>
        </div>
      </div>

      {chart==='bar'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'20px'}}>
          <div style={{display:'grid',gap:14}}>
            {DATA.map(d=>(
              <div key={d.range} style={{cursor:'pointer'}} onClick={()=>setSel(sel===d.range?null:d.range)}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:5}}>
                  <span style={{fontWeight:700,color:sel===d.range?d.color:'#374151'}}>{d.range}</span>
                  <span style={{fontWeight:800,color:d.color}}>{d.count} staff ({(d.pct||0)}%)</span>
                </div>
                <div style={{height:32,background:'#f1f5f9',borderRadius:8,overflow:'hidden',position:'relative'}}>
                  <div style={{height:'100%',background:d.color,width:(d.pct||0)+'%',borderRadius:8,transition:'width .4s',display:'flex',alignItems:'center',paddingLeft:8}}>
                    {d.pct>10&&<span style={{fontSize:9,color:'#fff',fontWeight:700}}>{d.count} employees</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {chart==='pie'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'20px',display:'flex',gap:24,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{display:'flex',justifyContent:'center'}}><PieChart/></div>
          <div style={{display:'grid',gap:8,flex:1}}>
            {DATA.map(d=>(
              <div key={d.range} onClick={()=>setSel(sel===d.range?null:d.range)} style={{display:'flex',gap:10,alignItems:'center',cursor:'pointer',padding:'8px 12px',borderRadius:10,background:sel===d.range?`${d.color}12`:'transparent'}}>
                <div style={{width:14,height:14,borderRadius:3,background:d.color,flexShrink:0}}/>
                <span style={{fontSize:11,fontWeight:600,color:'#374151',flex:1}}>{d.range}</span>
                <span style={{fontSize:11,fontWeight:900,color:d.color}}>{d.count}</span>
                <span style={{fontSize:9,color:'#94a3b8'}}>{(d.pct||0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {chart==='table'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Tenure Range','Employee Count','% of Total','Avg Tenure','Status'].map(h=><th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:9,fontWeight:700,color:'#64748b'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {DATA.map((d,i)=>(
                <tr key={d.range} style={{borderBottom:'1px solid #f1f5f9',background:i%2?'#fafafa':'#fff'}}>
                  <td style={{padding:'11px 14px'}}><div style={{display:'flex',gap:8,alignItems:'center'}}><div style={{width:10,height:10,borderRadius:2,background:d.color}}/><span style={{fontWeight:700}}>{d.range}</span></div></td>
                  <td style={{padding:'11px 14px',fontWeight:900,color:d.color,fontSize:14}}>{d.count}</td>
                  <td style={{padding:'11px 14px'}}><div style={{display:'flex',gap:6,alignItems:'center'}}><div style={{height:6,width:60,background:'#f1f5f9',borderRadius:3}}><div style={{height:'100%',width:(d.pct||0)+'%',background:d.color,borderRadius:3}}/></div><span style={{fontWeight:700,color:d.color}}>{(d.pct||0)}%</span></div></td>
                  <td style={{padding:'11px 14px',color:'#475569'}}>{['6 months','1.5 years','3.5 years','7.5 years','12+ years'][i]}</td>
                  <td style={{padding:'11px 14px'}}><span style={{fontSize:8,fontWeight:700,padding:'3px 9px',borderRadius:20,background:d.color+'18',color:d.color}}>{['New','Growing','Core','Senior','Expert'][i]}</span></td>
                </tr>
              ))}
              <tr style={{background:'#f8fafc',fontWeight:900}}>
                <td style={{padding:'11px 14px',fontWeight:900}}>TOTAL</td>
                <td style={{padding:'11px 14px',fontWeight:900,color:A,fontSize:14}}>{TOTAL}</td>
                <td style={{padding:'11px 14px',fontWeight:900,color:A}}>100%</td>
                <td colSpan={2} style={{padding:'11px 14px',color:'#64748b',fontSize:10}}>Avg tenure: {(DATA.reduce((s,d,i)=>s+d.count*([0.5,1.5,3.5,7.5,12][i]),0)/TOTAL).toFixed(1)} years</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {sel&&(
        <div style={{marginTop:14,background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'14px 18px'}}>
          <div style={{fontSize:11,fontWeight:700,marginBottom:10}}>Employees in "{sel}"</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8}}>
            {filtered.map(e=>(
              <div key={e.name} style={{padding:'8px 12px',background:'#f8fafc',borderRadius:9,fontSize:10}}>
                <div style={{fontWeight:700}}>{e.name}</div>
                <div style={{color:'#64748b',fontSize:9}}>{e.dept} · {e.tenure}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
