// FILE: EmpSatisfactionPage.jsx — Employee Satisfaction Dashboard
// eNPS, satisfaction drivers, pulse survey, comparison to industry benchmarks
import { useState } from 'react'
const G = 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const DRIVERS = [
  { driver:'Work-Life Balance',      score:68, weight:18, trend:'▲3', color:'#10b981' },
  { driver:'Manager Relationship',   score:74, weight:15, trend:'▲1', color:'#3b82f6' },
  { driver:'Growth Opportunities',   score:62, weight:17, trend:'▼2', color:'#ef4444' },
  { driver:'Compensation & Benefits',score:71, weight:20, trend:'▲5', color:'#f59e0b' },
  { driver:'Job Security',           score:80, weight:12, trend:'→0', color:'#10b981' },
  { driver:'Work Environment',       score:76, weight:10, trend:'▲2', color:'#3b82f6' },
  { driver:'Company Culture',        score:73, weight:8,  trend:'▲1', color:'#8b5cf6' },
]

const SURVEY = [
  {q:'I feel valued and recognized at work.',           agree:68, neutral:18, disagree:14},
  {q:'My manager supports my career development.',       agree:74, neutral:16, disagree:10},
  {q:'I have clear goals and know what is expected.',    agree:82, neutral:12, disagree:6 },
  {q:'I would recommend this company to a friend.',      agree:61, neutral:22, disagree:17},
  {q:'I have opportunities to learn and grow.',          agree:58, neutral:24, disagree:18},
  {q:'My work-life balance is satisfactory.',            agree:64, neutral:20, disagree:16},
]

const ENPS = { promoters:38, passives:42, detractors:20, score:18 }

const BY_DEPT = [
  {dept:'HR',          score:79, color:'#10b981'},
  {dept:'Marketing',   score:75, color:'#3b82f6'},
  {dept:'Finance',     score:72, color:'#8b5cf6'},
  {dept:'IT',          score:68, color:'#f59e0b'},
  {dept:'Operations',  score:61, color:'#ef4444'},
]

export default function EmpSatisfactionPage() {
  const [tab, setTab] = useState('overview')
  const weighted = Math.round(DRIVERS.reduce((s,d)=>s+(d.score*d.weight/100),0))
  const INDUSTRY_BENCH = 72

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:G,borderRadius:14,padding:'16px 22px',marginBottom:14,color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div>
            <h2 style={{margin:0,fontSize:20,fontWeight:900}}>😊 Employee Satisfaction</h2>
            <p style={{margin:'3px 0 0',fontSize:10,opacity:.8}}>eNPS · Pulse Survey · Satisfaction Drivers · Dept Comparison · Industry Benchmark</p>
          </div>
          <div style={{background:'rgba(255,255,255,.15)',borderRadius:12,padding:'10px 16px',textAlign:'center'}}>
            <div style={{fontSize:28,fontWeight:900}}>{weighted}</div>
            <div style={{fontSize:9,opacity:.8}}>Overall Score /100</div>
            <div style={{fontSize:8,color:'#fbbf24'}}>Industry: {INDUSTRY_BENCH} | {weighted>=INDUSTRY_BENCH?'✅ Above':'⚠️ Below'} Benchmark</div>
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {['overview','enps','survey','by-dept'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'8px 18px',borderRadius:9,border:tab!==t?'1px solid #e2e8f0':'none',background:tab===t?A:'#fff',color:tab===t?'#fff':'#475569',fontSize:10,fontWeight:tab===t?800:400,cursor:'pointer'}}>
            {t==='overview'?'📊 Satisfaction Drivers':t==='enps'?'⭐ eNPS':t==='survey'?'📋 Pulse Survey':'🏢 By Department'}
          </button>
        ))}
      </div>

      {tab==='overview'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'20px'}}>
          <div style={{display:'grid',gap:12}}>
            {DRIVERS.map(d=>(
              <div key={d.driver}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:5}}>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <span style={{fontWeight:700,color:'#374151'}}>{d.driver}</span>
                    <span style={{fontSize:8,color:'#94a3b8'}}>Weight: {d.weight}%</span>
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <span style={{fontSize:9,color:d.trend.startsWith('▲')?'#10b981':d.trend.startsWith('▼')?'#ef4444':'#94a3b8'}}>{d.trend}</span>
                    <span style={{fontWeight:900,color:d.color}}>{d.score}/100</span>
                  </div>
                </div>
                <div style={{height:20,background:'#f1f5f9',borderRadius:10,overflow:'hidden',position:'relative'}}>
                  <div style={{height:'100%',width:d.score+'%',background:d.color,borderRadius:10,transition:'width .4s',display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:6}}>
                    {d.score>20&&<span style={{fontSize:8,color:'#fff',fontWeight:700}}>{d.score}%</span>}
                  </div>
                  <div style={{position:'absolute',top:0,left:INDUSTRY_BENCH+'%',height:'100%',width:2,background:'rgba(0,0,0,.2)'}} title="Industry benchmark"/>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:12,fontSize:9,color:'#94a3b8'}}>▏ = Industry benchmark ({INDUSTRY_BENCH})</div>
        </div>
      )}

      {tab==='enps'&&(
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
            {[['😍 Promoters','Those who score 9-10',ENPS.promoters,'#10b981'],['😐 Passives','Those who score 7-8',ENPS.passives,'#f59e0b'],['😠 Detractors','Those who score 0-6',ENPS.detractors,'#ef4444']].map(([l,d,v,c])=>(
              <div key={l} style={{background:'#fff',borderRadius:12,border:`2px solid ${c}30`,padding:'16px',textAlign:'center'}}>
                <div style={{fontSize:24,fontWeight:900,color:c}}>{v}%</div>
                <div style={{fontSize:11,fontWeight:700,marginTop:4}}>{l}</div>
                <div style={{fontSize:9,color:'#64748b',marginTop:2}}>{d}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'20px',textAlign:'center'}}>
            <div style={{fontSize:12,color:'#64748b',marginBottom:8}}>Employee Net Promoter Score (eNPS) = Promoters% − Detractors%</div>
            <div style={{fontSize:48,fontWeight:900,color:ENPS.score>=30?'#10b981':ENPS.score>=0?'#f59e0b':'#ef4444'}}>{ENPS.score}</div>
            <div style={{fontSize:11,color:'#64748b',marginTop:4}}>Industry Average: 25 | Target: 40</div>
            <div style={{height:12,background:'#f1f5f9',borderRadius:6,overflow:'hidden',margin:'12px 0',position:'relative'}}>
              <div style={{position:'absolute',left:0,width:ENPS.promoters+'%',height:'100%',background:'#10b981'}}/>
              <div style={{position:'absolute',left:ENPS.promoters+'%',width:ENPS.passives+'%',height:'100%',background:'#f59e0b'}}/>
              <div style={{position:'absolute',left:(ENPS.promoters+ENPS.passives)+'%',width:ENPS.detractors+'%',height:'100%',background:'#ef4444'}}/>
            </div>
            <div style={{background:'#fffbeb',borderRadius:10,padding:'10px 14px',fontSize:10,color:'#92400e',textAlign:'left'}}>
              💡 <strong>How to improve:</strong> Focus on Growth Opportunities (lowest driver at 62%) and increase leave utilization. Regular 1:1s between managers and team members consistently improve eNPS by 8-15 points.
            </div>
          </div>
        </div>
      )}

      {tab==='survey'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'20px'}}>
          <div style={{display:'grid',gap:12}}>
            {SURVEY.map(s=>(
              <div key={s.q}>
                <div style={{fontSize:10,fontWeight:700,color:'#374151',marginBottom:6}}>"{s.q}"</div>
                <div style={{height:20,background:'#f1f5f9',borderRadius:10,overflow:'hidden',display:'flex'}}>
                  <div style={{height:'100%',width:s.agree+'%',background:'#10b981'}} title={`Agree: ${s.agree}%`}/>
                  <div style={{height:'100%',width:s.neutral+'%',background:'#94a3b8'}} title={`Neutral: ${s.neutral}%`}/>
                  <div style={{height:'100%',width:s.disagree+'%',background:'#ef4444'}} title={`Disagree: ${s.disagree}%`}/>
                </div>
                <div style={{display:'flex',gap:14,fontSize:8,marginTop:4}}>
                  <span style={{color:'#10b981',fontWeight:700}}>✅ Agree: {s.agree}%</span>
                  <span style={{color:'#94a3b8'}}>— Neutral: {s.neutral}%</span>
                  <span style={{color:'#ef4444',fontWeight:700}}>✗ Disagree: {s.disagree}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='by-dept'&&(
        <div style={{display:'grid',gap:10}}>
          {BY_DEPT.map(d=>(
            <div key={d.dept} style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'14px 18px',display:'flex',gap:16,alignItems:'center'}}>
              <div style={{fontWeight:800,fontSize:12,color:'#0f172a',width:100}}>{d.dept}</div>
              <div style={{flex:1}}>
                <div style={{height:16,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                  <div style={{height:'100%',width:d.score+'%',background:d.color,borderRadius:8}}/>
                </div>
              </div>
              <div style={{fontSize:20,fontWeight:900,color:d.color,width:50,textAlign:'right'}}>{d.score}</div>
              <span style={{fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20,background:d.color+'18',color:d.color,flexShrink:0}}>{d.score>=75?'😊 Good':d.score>=65?'😐 Fair':'😟 Needs Work'}</span>
            </div>
          ))}
          <div style={{background:'#f8fafc',borderRadius:10,padding:'12px 16px',fontSize:9,color:'#64748b',border:'1px solid #e2e8f0'}}>
            📊 Based on Q3 2081 Pulse Survey · 118 respondents · 79% response rate · Next survey: Q4 2081 (October)
          </div>
        </div>
      )}
    </div>
  )
}
