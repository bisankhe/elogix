// FILE: ATSWrittenTestPage.jsx — ATS AI Written Test (NEW)
// Auto-assigns written test on profile creation / job application
// AI generates questions from JD, auto-evaluates, auto-notifies via Email/WhatsApp/Viber
import { useState, useEffect } from 'react'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#38bdf8 100%)'
const A = '#0369a1'

const TESTS = [
  { id:'t1', test_no:'AT-2025-001', candidate:'Rajan Shrestha', position:'Senior SW Dev', dept:'IT',
    triggered_by:'Job Application', triggered_date:'2025-06-16', deadline:'2025-06-20',
    status:'completed', score:87, time_taken:'42 min', notified_via:['Email','WhatsApp'],
    questions:6, correct:5, pass_mark:70,
    sections:[{label:'React & Frontend',score:92},{label:'Data Structures',score:85},{label:'System Design',score:80},{label:'Problem Solving',score:90}],
    ai_note:'Strong performer. Technical knowledge above average. Recommend to Interview stage.' },
  { id:'t2', test_no:'AT-2025-002', candidate:'Priya Tamang', position:'Senior SW Dev', dept:'IT',
    triggered_by:'Profile Created', triggered_date:'2025-06-17', deadline:'2025-06-21',
    status:'in_progress', score:null, time_taken:null, notified_via:['Email','WhatsApp','Viber'],
    questions:6, correct:null, pass_mark:70,
    sections:[],
    ai_note:'Test in progress. Deadline: Jun 21. 2nd reminder sent.' },
  { id:'t3', test_no:'AT-2025-003', candidate:'Sita Khadka', position:'HR Business Partner', dept:'HR',
    triggered_by:'Job Application', triggered_date:'2025-06-15', deadline:'2025-06-19',
    status:'not_started', score:null, time_taken:null, notified_via:['Email'],
    questions:5, correct:null, pass_mark:65,
    sections:[],
    ai_note:'Candidate has not started. Deadline passed. Consider re-invite or skip.' },
  { id:'t4', test_no:'AT-2025-004', candidate:'Gita Maharjan', position:'Cloud Architect', dept:'IT',
    triggered_by:'Job Application', triggered_date:'2025-06-10', deadline:'2025-06-14',
    status:'passed', score:94, time_taken:'38 min', notified_via:['Email','WhatsApp'],
    questions:7, correct:7, pass_mark:75,
    sections:[{label:'Cloud Architecture',score:96},{label:'AWS/GCP Services',score:98},{label:'Security & Compliance',score:88},{label:'Cost Optimization',score:95}],
    ai_note:'Outstanding score. Top 5% of all test-takers. Strongly recommend for Panel Interview.' },
]

const STATUS_CFG = {
  completed:   {c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Completed'},
  passed:      {c:'#059669',bg:'#f0fdf4',icon:'🏆',label:'Passed'},
  in_progress: {c:'#3b82f6',bg:'#eff6ff',icon:'🔄',label:'In Progress'},
  not_started: {c:'#ef4444',bg:'#fef2f2',icon:'⏰',label:'Not Started'},
  failed:      {c:'#f59e0b',bg:'#fffbeb',icon:'❌',label:'Failed'},
}

const SAMPLE_QS = [
  {no:1,type:'MCQ',q:'Which React hook is used to avoid re-running heavy computations on every render?',options:['useEffect','useMemo','useCallback','useRef'],answer:'useMemo',marks:10},
  {no:2,type:'Code',q:'Write a function that returns the nth Fibonacci number with O(n) time complexity.',options:[],answer:'function fib(n) { let a=0,b=1; for(let i=2;i<=n;i++){[a,b]=[b,a+b]} return b }',marks:20},
  {no:3,type:'MCQ',q:'Which AWS service would you use for serverless functions?',options:['EC2','ECS','Lambda','Fargate'],answer:'Lambda',marks:10},
  {no:4,type:'Short',q:'Explain the difference between horizontal and vertical scaling in 2-3 sentences.',options:[],answer:'',marks:15},
]

export default function ATSWrittenTestPage() {
  const [tests, setTests]     = useState(TESTS)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [showPreview, setShowPreview] = useState(null)
  const [selected, setSelected]     = useState(null)
  const [autoSend, setAutoSend]     = useState(true)
  const [msg, setMsg]               = useState('')
  const [form, setForm]             = useState({candidate:'',position:'',dept:'IT',deadline:'',channels:{email:true,whatsapp:true,viber:false}})
  const [generating, setGenerating] = useState(false)
  const [previewAns, setPreviewAns] = useState({})
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = tests.filter(t=>{
    if (filter!=='all'&&t.status!==filter) return false
    if (search&&!t.candidate.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const generateAndSend = () => {
    if(!form.candidate||!form.position){notify('⚠️ Candidate and position required');return}
    setGenerating(true)
    setTimeout(()=>{
      const newTest = {
        id:'t'+Date.now(), test_no:'AT-2025-'+String(tests.length+5).padStart(3,'0'),
        candidate:form.candidate, position:form.position, dept:form.dept,
        triggered_by:'Manual', triggered_date:new Date().toISOString().split('T')[0],
        deadline:form.deadline||new Date(Date.now()+4*24*60*60*1000).toISOString().split('T')[0],
        status:'not_started', score:null, time_taken:null,
        notified_via:Object.entries(form.channels).filter(([,v])=>v).map(([k])=>k.charAt(0).toUpperCase()+k.slice(1)),
        questions:SAMPLE_QS.length, correct:null, pass_mark:70, sections:[],
        ai_note:'AI-generated test based on JD. Notification sent via '+Object.entries(form.channels).filter(([,v])=>v).map(([k])=>k).join(', ')+'.'
      }
      setTests(prev=>[newTest,...prev])
      setGenerating(false)
      setShowCreate(false)
      const channels = Object.entries(form.channels).filter(([,v])=>v).map(([k])=>k).join(', ')
      notify(`✅ Written test AT-${newTest.test_no.split('-')[2]} created & sent to ${form.candidate} via ${channels}`)
      setForm({candidate:'',position:'',dept:'IT',deadline:'',channels:{email:true,whatsapp:true,viber:false}})
    },2000)
  }

  const passedCount = tests.filter(t=>t.status==='passed'||t.score>=t.pass_mark).length
  const avgScore    = Math.round(tests.filter(t=>t.score).reduce((s,t)=>s+t.score,0)/tests.filter(t=>t.score).length)

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      {/* Header */}
      <div style={{background:G,borderRadius:14,padding:'18px 24px',marginBottom:16,color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
          <div>
            <h2 style={{margin:0,fontSize:20,fontWeight:900}}>📝 ATS — AI Written Test</h2>
            <p style={{margin:'4px 0 0',fontSize:10,opacity:.8}}>Auto-assigns tests on application · AI evaluates · Notifies via Email, WhatsApp, Viber</p>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <div style={{background:'rgba(255,255,255,.15)',borderRadius:10,padding:'8px 14px',textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:900}}>{tests.length}</div><div style={{fontSize:8,opacity:.7}}>TESTS</div>
            </div>
            <div style={{background:'rgba(255,255,255,.15)',borderRadius:10,padding:'8px 14px',textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:900}}>{passedCount}</div><div style={{fontSize:8,opacity:.7}}>PASSED</div>
            </div>
            <div style={{background:'rgba(255,255,255,.15)',borderRadius:10,padding:'8px 14px',textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:900}}>{avgScore||0}%</div><div style={{fontSize:8,opacity:.7}}>AVG SCORE</div>
            </div>
          </div>
        </div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:360}}>{msg}</div>}

      {/* Auto-send config */}
      <div style={{background:'linear-gradient(135deg,#f0f9ff,#fff)',border:'1px solid #bae6fd',borderRadius:12,padding:'12px 16px',marginBottom:14,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0369a1',marginBottom:2}}>🤖 Auto-Assignment Engine</div>
          <div style={{fontSize:10,color:'#0c4a6e'}}>Tests are <strong>automatically assigned</strong> when a candidate profile is created or a job application is submitted. AI generates questions from JD + department requirements. Auto-evaluation and scoring on submission.</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:10,color:'#374151'}}>Auto-Send</span>
          <div onClick={()=>setAutoSend(p=>!p)} style={{width:44,height:24,borderRadius:12,background:autoSend?A:'#e2e8f0',cursor:'pointer',position:'relative',transition:'background .2s'}}>
            <div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:autoSend?23:3,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
          </div>
          <button onClick={()=>setShowCreate(true)} style={{padding:'8px 16px',borderRadius:9,border:'none',background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>+ Assign Test</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{flex:1,position:'relative'}}>
          <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#94a3b8',fontSize:14}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by candidate name..."
            style={{width:'100%',padding:'9px 12px 9px 38px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','not_started','in_progress','completed','passed'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{padding:'7px 10px',borderRadius:7,border:'none',cursor:'pointer',fontSize:9,
                background:filter===s?'#fff':'transparent',color:filter===s?A:'#64748b',
                fontWeight:filter===s?700:400}}>
              {s==='all'?'All':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
      </div>

      {/* Test list */}
      <div style={{display:'grid',gap:12}}>
        {filtered.map(t=>{
          const sc = STATUS_CFG[t.status]||STATUS_CFG.not_started
          return (
            <div key={t.id} style={{background:'#fff',borderRadius:14,border:`1px solid ${sc.c}30`,boxShadow:'0 2px 8px rgba(0,0,0,.04)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',gap:14,alignItems:'center',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{t.candidate}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    <span style={{fontFamily:'monospace',fontSize:9,color:'#94a3b8'}}>{t.test_no}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{t.position} · {t.dept} · Triggered: {t.triggered_by} · {t.triggered_date}</div>
                  <div style={{display:'flex',gap:8,marginTop:3,fontSize:9,color:'#94a3b8',flexWrap:'wrap'}}>
                    <span>📅 Deadline: {t.deadline}</span>
                    <span>❓ {t.questions} questions</span>
                    <span>✅ Pass: {t.pass_mark}%</span>
                    <span>📡 Sent via: {t.notified_via.join(', ')}</span>
                    {t.time_taken&&<span>⏱ Time: {t.time_taken}</span>}
                  </div>
                </div>
                {t.score!=null&&(
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:24,fontWeight:900,color:t.score>=80?'#10b981':t.score>=t.pass_mark?A:'#ef4444'}}>{t.score}%</div>
                    <div style={{fontSize:8,color:'#94a3b8'}}>SCORE</div>
                  </div>
                )}
              </div>

              {t.sections.length>0&&(
                <div style={{padding:'10px 18px',borderBottom:'1px solid #f8fafc',display:'flex',gap:8,flexWrap:'wrap'}}>
                  {t.sections.map((s,i)=>(
                    <div key={i} style={{background:`${A}08`,borderRadius:8,padding:'5px 10px',fontSize:9}}>
                      <div style={{fontWeight:700,color:A}}>{s.score}%</div>
                      <div style={{color:'#64748b'}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {t.ai_note&&<div style={{padding:'8px 18px',fontSize:10,color:'#475569',fontStyle:'italic',borderBottom:'1px solid #f8fafc'}}>🤖 {t.ai_note}</div>}

              <div style={{padding:'8px 14px',display:'flex',gap:6,justifyContent:'flex-end',flexWrap:'wrap'}}>
                <button onClick={()=>setShowPreview(t)} style={{padding:'6px 12px',borderRadius:7,border:`1px solid ${A}33`,background:`${A}10`,color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>👁 Preview Test</button>
                {t.status==='not_started'&&<button onClick={()=>notify('📧 Reminder sent to '+t.candidate+' via '+t.notified_via.join(', '))} style={{padding:'6px 12px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,cursor:'pointer'}}>📧 Re-Notify</button>}
                {t.score!=null&&<button onClick={()=>setSelected(t)} style={{padding:'6px 12px',borderRadius:7,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📊 View Results</button>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create/Assign Test Modal */}
      {showCreate&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowCreate(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:500,maxWidth:'95vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>📝 Assign AI Written Test</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              {[['Candidate Name *','candidate','text'],['Position / JD *','position','text'],['Deadline','deadline','date']].map(([l,f,t])=>(
                <div key={f} style={{marginBottom:12}}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                  <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
              ))}
              <div style={{marginBottom:12}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Department</label>
                <select value={form.dept} onChange={e=>setForm(p=>({...p,dept:e.target.value}))}
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                  {['IT','Finance','HR','Operations','Sales','Marketing'].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:9,fontWeight:700,color:'#374151',marginBottom:6}}>Notification Channels</div>
                <div style={{display:'flex',gap:8}}>
                  {[['email','📧 Email'],['whatsapp','💬 WhatsApp'],['viber','📱 Viber']].map(([k,l])=>(
                    <label key={k} style={{display:'flex',gap:6,alignItems:'center',padding:'7px 12px',borderRadius:9,border:`1.5px solid ${form.channels[k]?A:'#e2e8f0'}`,cursor:'pointer',flex:1,background:form.channels[k]?`${A}08`:'#fff'}}>
                      <input type="checkbox" checked={form.channels[k]} onChange={()=>setForm(p=>({...p,channels:{...p.channels,[k]:!p.channels[k]}}))} style={{accentColor:A}}/>
                      <span style={{fontSize:10,color:'#374151'}}>{l}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:10,color:'#4c1d95'}}>
                🤖 AI will generate {form.dept==='IT'?'6-7':'5-6'} questions based on the JD and {form.dept} department requirements. Auto-evaluation and scoring after submission. Results auto-shared with HR panel.
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={generateAndSend} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:generating?'#94a3b8':G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>
                  {generating?'⏳ Generating & Sending...':'🤖 Generate & Send Test'}
                </button>
                <button onClick={()=>setShowCreate(false)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Test Modal */}
      {showPreview&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowPreview(null)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:620,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>👁 Test Preview — {showPreview.candidate}</div>
              <div style={{fontSize:10,opacity:.8,marginTop:2}}>{showPreview.position} · {showPreview.test_no}</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              {SAMPLE_QS.map((q,i)=>(
                <div key={i} style={{marginBottom:20,padding:'14px',background:'#f8fafc',borderRadius:12,border:'1px solid #e2e8f0'}}>
                  <div style={{display:'flex',gap:8,marginBottom:10,alignItems:'flex-start'}}>
                    <span style={{background:A,color:'#fff',fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:20,flexShrink:0}}>Q{q.no} · {q.type} · {q.marks} marks</span>
                    <span style={{fontSize:11,fontWeight:600,color:'#1e293b'}}>{q.q}</span>
                  </div>
                  {q.options.length>0&&q.options.map((opt,oi)=>(
                    <label key={oi} style={{display:'flex',gap:8,padding:'6px 10px',borderRadius:8,marginBottom:4,cursor:'pointer',background:previewAns[q.no]===opt?`${A}10`:'#fff',border:`1px solid ${previewAns[q.no]===opt?A:'#e2e8f0'}`}}>
                      <input type="radio" name={`q${q.no}`} value={opt} checked={previewAns[q.no]===opt} onChange={()=>setPreviewAns(p=>({...p,[q.no]:opt}))} style={{accentColor:A}}/>
                      <span style={{fontSize:10,color:'#374151'}}>{opt}</span>
                    </label>
                  ))}
                  {q.type==='Code'&&<textarea rows={4} placeholder="Write your code here..." style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:10,fontFamily:'monospace',resize:'vertical',boxSizing:'border-box',marginTop:6}}/>}
                  {q.type==='Short'&&<textarea rows={3} placeholder="Your answer..." style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:10,resize:'vertical',boxSizing:'border-box',fontFamily:'inherit',marginTop:6}}/>}
                </div>
              ))}
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{notify('🤖 Preview submitted — AI auto-evaluated');setShowPreview(null)}} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>📊 Submit & Auto-Evaluate (Preview)</button>
                <button onClick={()=>setShowPreview(null)} style={{padding:'10px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
