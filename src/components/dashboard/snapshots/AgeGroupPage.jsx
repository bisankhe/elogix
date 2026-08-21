// FILE: AgeGroupPage.jsx — Age Group Distribution (Bar, Pie, Table)
import { useState } from 'react'
const G = 'linear-gradient(135deg,#065f46 0%,#059669 60%,#6ee7b7 100%)'
const A = '#059669'

const DATA = [
  { range:'18–25',  count:14, color:'#f59e0b', gender:{m:8,f:6}  },
  { range:'26–30',  count:28, color:'#3b82f6', gender:{m:15,f:13} },
  { range:'31–35',  count:32, color:'#8b5cf6', gender:{m:18,f:14} },
  { range:'36–40',  count:22, color:'#10b981', gender:{m:14,f:8}  },
  { range:'41–50',  count:16, color:'#f97316', gender:{m:11,f:5}  },
  { range:'51+',    count:8,  color:'#ef4444', gender:{m:6,f:2}   },
]
const TOTAL = DATA.reduce((s,d)=>s+d.count,0)

export default function AgeGroupPage() {
  const [chart, setChart] = useState('bar')
  const [sel, setSel] = useState(null)
  const avgAge = 33.4

  const PieChart = () => {
    let start = 0
    const cx=100,cy=100,r=80,ir=38
    const deg = a=>(a-90)*Math.PI/180
    return (
      <svg viewBox="0 0 200 200" style={{width:180,height:180}}>
        {DATA.map((d,i)=>{
          const angle=(d.count/TOTAL)*360; const s=start; start+=angle
          const [x1,y1]=[cx+r*Math.cos(deg(s)),cy+r*Math.sin(deg(s))]
          const [x2,y2]=[cx+r*Math.cos(deg(s+angle)),cy+r*Math.sin(deg(s+angle))]
          const [xi1,yi1]=[cx+ir*Math.cos(deg(s)),cy+ir*Math.sin(deg(s))]
          const [xi2,yi2]=[cx+ir*Math.cos(deg(s+angle)),cy+ir*Math.sin(deg(s+angle))]
          const lg=angle>180?1:0
          return <path key={i} onClick={()=>setSel(sel===d.range?null:d.range)}
            d={`M${xi1} ${yi1}L${x1} ${y1}A${r} ${r} 0 ${lg} 1 ${x2} ${y2}L${xi2} ${yi2}A${ir} ${ir} 0 ${lg} 0 ${xi1} ${yi1}Z`}
            fill={d.color} stroke="#fff" strokeWidth={1.5} style={{cursor:'pointer'}} opacity={sel&&sel!==d.range?.5:1}/>
        })}
        <text x={cx} y={cy-6} textAnchor="middle" fontSize={18} fontWeight={900} fill="#0f172a">{TOTAL}</text>
        <text x={cx} y={cy+10} textAnchor="middle" fontSize={8} fill="#64748b">employees</text>
      </svg>
    )

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:G,borderRadius:14,padding:'16px 22px',marginBottom:14,color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div><h2 style={{margin:0,fontSize:20,fontWeight:900}}>👥 Age Group Distribution</h2>
            <p style={{margin:'3px 0 0',fontSize:10,opacity:.8}}>Total: {TOTAL} employees · Average Age: {avgAge} years · Gender breakdown included</p>
          </div>
          <div style={{display:'flex',gap:6}}>
            {['bar','pie','table'].map(c=><button key={c} onClick={()=>setChart(c)} style={{padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:9,fontWeight:700,background:chart===c?'rgba(255,255,255,.9)':'rgba(255,255,255,.15)',color:chart===c?A:'#fff'}}>{c==='bar'?'📊 Bar':c==='pie'?'🥧 Pie':'📋 Table'}</button>)}
          </div>
        </div>
      </div>

      {chart==='bar'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'20px'}}>
          <div style={{display:'grid',gap:12}}>
            {DATA.map(d=>(
              <div key={d.range} style={{cursor:'pointer'}} onClick={()=>setSel(sel===d.range?null:d.range)}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:4}}>
                  <span style={{fontWeight:700,color:'#374151'}}>Age {d.range}</span>
                  <div style={{display:'flex',gap:10}}>
                    <span style={{color:'#3b82f6',fontSize:9}}>👨 {d.gender.m}</span>
                    <span style={{color:'#ec4899',fontSize:9}}>👩 {d.gender.f}</span>
                    <span style={{fontWeight:900,color:d.color}}>{d.count} ({Math.round(d.count/TOTAL*100)}%)</span>
                  </div>
                </div>
                <div style={{height:28,background:'#f1f5f9',borderRadius:8,overflow:'hidden',display:'flex'}}>
                  <div style={{height:'100%',background:'#3b82f6',width:(d.gender.m/TOTAL*100)+'%',transition:'width .4s'}}/>
                  <div style={{height:'100%',background:'#ec4899',width:(d.gender.f/TOTAL*100)+'%',transition:'width .4s'}}/>
                </div>
              </div>
            ))}
            <div style={{display:'flex',gap:16,fontSize:9,marginTop:4}}>
              <span style={{display:'flex',gap:4,alignItems:'center'}}><div style={{width:10,height:10,borderRadius:2,background:'#3b82f6'}}/> Male: {DATA.reduce((s,d)=>s+d.gender.m,0)}</span>
              <span style={{display:'flex',gap:4,alignItems:'center'}}><div style={{width:10,height:10,borderRadius:2,background:'#ec4899'}}/> Female: {DATA.reduce((s,d)=>s+d.gender.f,0)}</span>
            </div>
          </div>
        </div>
      )}

      {chart==='pie'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'20px',display:'flex',gap:24,alignItems:'center',flexWrap:'wrap'}}>
          <div><PieChart/></div>
          <div style={{display:'grid',gap:8,flex:1}}>
            {DATA.map(d=>(
              <div key={d.range} onClick={()=>setSel(sel===d.range?null:d.range)} style={{display:'flex',gap:10,alignItems:'center',cursor:'pointer',padding:'7px 12px',borderRadius:10,background:sel===d.range?`${d.color}12`:'#f8fafc'}}>
                <div style={{width:12,height:12,borderRadius:2,background:d.color,flexShrink:0}}/>
                <span style={{fontSize:11,fontWeight:600,flex:1}}>Age {d.range}</span>
                <span style={{fontWeight:900,color:d.color}}>{d.count}</span>
                <span style={{fontSize:9,color:'#94a3b8'}}>{Math.round(d.count/TOTAL*100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {chart==='table'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Age Group','Total','Male','Female','% of Workforce','Category'].map(h=><th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:9,fontWeight:700,color:'#64748b'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {DATA.map((d,i)=>(
                <tr key={d.range} style={{borderBottom:'1px solid #f1f5f9',background:i%2?'#fafafa':'#fff'}}>
                  <td style={{padding:'11px 14px',fontWeight:700}}>Age {d.range}</td>
                  <td style={{padding:'11px 14px',fontWeight:900,color:d.color,fontSize:14}}>{d.count}</td>
                  <td style={{padding:'11px 14px',color:'#3b82f6',fontWeight:700}}>👨 {d.gender.m}</td>
                  <td style={{padding:'11px 14px',color:'#ec4899',fontWeight:700}}>👩 {d.gender.f}</td>
                  <td style={{padding:'11px 14px'}}><div style={{display:'flex',gap:6,alignItems:'center'}}><div style={{height:6,width:60,background:'#f1f5f9',borderRadius:3}}><div style={{height:'100%',width:Math.round(d.count/TOTAL*100)+'%',background:d.color,borderRadius:3}}/></div><span style={{fontWeight:700,color:d.color}}>{Math.round(d.count/TOTAL*100)}%</span></div></td>
                  <td style={{padding:'11px 14px'}}><span style={{fontSize:8,fontWeight:700,padding:'3px 9px',borderRadius:20,background:d.color+'18',color:d.color}}>{['Gen Z','Millennial','Millennial','Gen X','Gen X','Boomer'][i]}</span></td>
                </tr>
              ))}
              <tr style={{background:'#f8fafc'}}>
                <td style={{padding:'11px 14px',fontWeight:900}}>TOTAL</td>
                <td style={{padding:'11px 14px',fontWeight:900,color:A,fontSize:14}}>{TOTAL}</td>
                <td style={{padding:'11px 14px',fontWeight:900,color:'#3b82f6'}}>{DATA.reduce((s,d)=>s+d.gender.m,0)}</td>
                <td style={{padding:'11px 14px',fontWeight:900,color:'#ec4899'}}>{DATA.reduce((s,d)=>s+d.gender.f,0)}</td>
                <td style={{padding:'11px 14px',fontWeight:900,color:A}}>100%</td>
                <td style={{padding:'11px 14px',fontSize:10,color:'#64748b'}}>Avg age: {avgAge}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
