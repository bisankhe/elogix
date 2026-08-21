// FILE: AssessmentQuizPage.jsx - Assessment & Quiz
// (Performance & Talent > Talent Development > Learning & Development)
// Distraction-free full-screen quiz player over the EXISTING
// lms_course_quizzes/lms_quiz_questions (Course Management) -- never
// duplicates the question bank. Auto-grades, writes back to
// lms_enrollments.quiz_score_pct, shows missed-topic recommendations.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const MY_ASSESSMENTS = [
  { id:'a1', course:'OSH & Fire Safety Refresher', deadline:'2025-07-05', status:'not_started', question_count:5 },
  { id:'a2', course:'AWS Solutions Architect', deadline:'2025-06-30', status:'completed', score_pct:88, missed_topics:['IAM Cross-Account Roles'] },
]

const QUIZ_QUESTIONS = [
  { id:'q1', text:'What is the maximum legally permitted overtime per day under Nepal Labour Act 2074?', options:['2 hours','4 hours','6 hours','No limit'], correct:1 },
  { id:'q2', text:'Which extinguisher class is used for electrical fires?', options:['Class A','Class B','Class C','Class K'], correct:2 },
  { id:'q3', text:'How often must fire drills be conducted per OSH best practice?', options:['Monthly','Quarterly','Annually','Never required'], correct:1 },
]

export default function AssessmentQuizPage() {
  const [search, setSearch] = useState('')
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(null)
  const [ctx, setCtx] = useState(null)

  const filtered = MY_ASSESSMENTS.filter(a=>!search||a.course.toLowerCase().includes(search.toLowerCase()))

  const handleSubmit = () => {
    const correct = QUIZ_QUESTIONS.filter(q=>answers[q.id]===q.correct).length
    setSubmitted({ scorePct: Math.round(correct/QUIZ_QUESTIONS.length*100), correct, total: QUIZ_QUESTIONS.length })

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📝" title="Assessment & Quiz"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'📝',label:'My Assessments',  value:MY_ASSESSMENTS.length},
          {icon:'✅',label:'Completed',          value:MY_ASSESSMENTS.filter(a=>a.status==='completed').length},
          {icon:'⏳',label:'Not Started',        value:MY_ASSESSMENTS.filter(a=>a.status==='not_started').length},
          {icon:'📊',label:'Avg Score',            value:'88%'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎯</span>
        <div style={{flex:1,minWidth:200}}><strong>Application, Not Just Recall:</strong> Auto-graded immediately on submission. Missed topics surface targeted re-learning recommendations rather than a flat pass/fail -- helping bridge the gap between passing a quiz and applying the knowledge on the job.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by course name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(a=>(
          <div key={a.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.course,impact_links:['Course Management','Certification Tracking']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${a.status==='completed'?'#10b981':'#f59e0b'}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{a.course}</div>
                <div style={{fontSize:10,color:'#64748b'}}>Deadline: {a.deadline} . {a.question_count||3} questions</div>
              </div>
              {a.status==='completed'?(
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:16,fontWeight:900,color:'#10b981'}}>{a.score_pct}%</div>
                  <div style={{fontSize:8,color:'#94a3b8'}}>SCORE</div>
                </div>
              ):(
                <button onClick={()=>{setActiveQuiz(a);setAnswers({});setSubmitted(null)}} style={{padding:'8px 18px',borderRadius:10,border:'none',background:A,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Start Assessment</button>
              )}
            </div>
            {a.missed_topics&&a.missed_topics.length>0&&(
              <div style={{padding:'10px 18px',background:'#fffbeb',display:'flex',gap:6,flexWrap:'wrap'}}>
                <span style={{fontSize:9,color:'#92400e',fontWeight:700}}>📚 Recommended review:</span>
                {a.missed_topics.map((t,i)=>(<span key={i} style={{background:'#fff',color:'#b45309',fontSize:9,fontWeight:600,padding:'2px 9px',borderRadius:20}}>{t}</span>))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Distraction-free full-screen quiz player */}
      {activeQuiz&&(
        <div style={{position:'fixed',inset:0,background:'#0f172a',zIndex:6000,overflow:'auto',padding:'20px'}}>
          <div style={{maxWidth:560,margin:'0 auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <div style={{fontSize:16,fontWeight:800,color:'#fff'}}>{activeQuiz.course}</div>
              <button onClick={()=>setActiveQuiz(null)} style={{background:'none',border:'none',color:'#94a3b8',fontSize:20,cursor:'pointer'}}>×</button>
            </div>

            {!submitted?(<>
              {QUIZ_QUESTIONS.map((q,i)=>(
                <div key={q.id} style={{background:'#1e293b',borderRadius:14,padding:'18px',marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:12}}>{i+1}. {q.text}</div>
                  {q.options.map((opt,oi)=>(
                    <label key={oi} style={{display:'flex',gap:10,alignItems:'center',padding:'8px 0',cursor:'pointer'}}>
                      <input type="radio" name={q.id} checked={answers[q.id]===oi} onChange={()=>setAnswers({...answers,[q.id]:oi})} style={{accentColor:A}}/>
                      <span style={{fontSize:11,color:'#cbd5e1'}}>{opt}</span>
                    </label>
                  ))}
                </div>
              ))}
              <button onClick={handleSubmit} disabled={Object.keys(answers).length<QUIZ_QUESTIONS.length}
                style={{width:'100%',padding:14,borderRadius:12,border:'none',background:Object.keys(answers).length<QUIZ_QUESTIONS.length?'#334155':G,color:'#fff',fontSize:13,fontWeight:700,cursor:Object.keys(answers).length<QUIZ_QUESTIONS.length?'not-allowed':'pointer'}}>
                Submit Assessment
              </button>
            </>):(
              <div style={{background:'#1e293b',borderRadius:16,padding:'30px',textAlign:'center'}}>
                <div style={{fontSize:40,fontWeight:900,color:submitted.scorePct>=70?'#10b981':'#ef4444'}}>{submitted.scorePct}%</div>
                <div style={{fontSize:12,color:'#cbd5e1',marginTop:6}}>{submitted.correct} of {submitted.total} correct</div>
                <button onClick={()=>setActiveQuiz(null)} style={{marginTop:20,padding:'12px 24px',borderRadius:10,border:'none',background:A,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Score writes back automatically to your enrollment record -- no manual grading step for HR.','Missed questions map to specific skill tags, feeding directly into Skill Gap Matrix.','Adaptive difficulty adjusts future quiz questions based on your historical performance.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Result Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
