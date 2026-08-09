// FILE: ATSEvaluationSuitePage.jsx
// 5-Tab World-Class ATS Evaluation Suite
// Tab 1: Written Test — AI Qs + full Q&A Answer Sheet + per-Q grading
// Tab 2: Video Interview — AI Qs + Video Playback + Transcript + per-Q grading
// Tab 3: Physical Interview — Eval Sheet + Competency Grid + Committee Decision
// Tab 4: Overall & Final — Composite grade, letters, finalization
// Tab 5: Auto Scheduler — AI calendar, self-booking, panel availability
import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

async function callAI(prompt, sys, max=2000) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:max,
        system: sys||'You are a world-class HR assessment expert.',
        messages:[{role:'user',content:prompt}] }),
      signal: AbortSignal.timeout(30000)
    })
    if (r.ok) { const d=await r.json(); return d.content?.map(c=>c.text).join('')||'' }
  } catch {}
  return null
}

const CANDIDATES=[
  {id:'c1',name:'Gita Maharjan', role:'Senior React Dev',age:30,source:'LinkedIn',cv_score:92,avatar:'GM',email:'gita@mail.com'},
  {id:'c2',name:'Rajan Shrestha',role:'Senior React Dev',age:31,source:'Indeed',  cv_score:86,avatar:'RS',email:'rajan@mail.com'},
  {id:'c3',name:'Anil KC',       role:'Senior React Dev',age:33,source:'Portal',  cv_score:90,avatar:'AK',email:'anil@mail.com'},
  {id:'c4',name:'Priya Tamang',  role:'Senior React Dev',age:28,source:'Naukri',  cv_score:80,avatar:'PT',email:'priya@mail.com'},
  {id:'c5',name:'Bikash Tamang', role:'Senior React Dev',age:26,source:'Facebook',cv_score:70,avatar:'BT',email:'bikash@mail.com'},
]

const W_QUESTIONS=[
  {id:'w1',type:'MCQ',  marks:5, topic:'React',         q:'What hook memoizes a function reference between renders?',            opts:['useState','useCallback','useMemo','useEffect'],correct:1},
  {id:'w2',type:'MCQ',  marks:5, topic:'JavaScript',    q:'Which creates a shallow copy of an array?',                           opts:['Array.from()','arr.slice()','arr.concat()','All of above'],correct:3},
  {id:'w3',type:'MCQ',  marks:5, topic:'SQL',           q:'Which SQL clause filters groups AFTER aggregation?',                  opts:['WHERE','HAVING','GROUP BY','ORDER BY'],correct:1},
  {id:'w4',type:'MCQ',  marks:5, topic:'System Design', q:'What pattern handles async side-effects in Redux?',                   opts:['Thunk Middleware','Pure Reducers','Context API','useReducer'],correct:0},
  {id:'w5',type:'MCQ',  marks:5, topic:'Node.js',       q:'Which engine provides the Node.js event loop?',                      opts:['fs','path','libuv','http'],correct:2},
  {id:'w6',type:'CODING',marks:20,topic:'Algorithms',   q:'Find length of longest substring without repeating characters.\nExample: "abcabcbb" -> 3',starter:'function lengthOfLongestSubstring(s) {\n  // Your solution\n}',testCases:[{inp:'"abcabcbb"',out:'3'},{inp:'"pwwkew"',out:'3'}]},
  {id:'w7',type:'CODING',marks:20,topic:'React Hooks',  q:'Build a custom useDebounce hook that delays state updates.\nAccept value and delay(ms). Return debounced value.',starter:'function useDebounce(value, delay) {\n  // Implement\n}',testCases:[{inp:'useDebounce("test",500)',out:'Returns "test" after 500ms'}]},
  {id:'w8',type:'ESSAY',marks:15,topic:'System Design', q:'Design a notification system for 1M users. Cover architecture, DB, scaling, failure handling. (Min 300 words)',wordLimit:'300-500',rubric:'Architecture · Tech choices · Scaling · Failure handling'},
  {id:'w9',type:'ESSAY',marks:20,topic:'Problem Solving',q:'Describe the most complex technical problem you solved. Include problem, approach, solution, outcomes. (Min 250 words)',wordLimit:'250-400',rubric:'Clarity · Approach · Depth · Metrics · Lessons'},
]

const W_CONDUCT={
  c1:{submitted_at:'10:58 AM',time_taken:'58m 22s',tab_switches:0,face_pct:96,device:'Chrome 121/Win11',ip:'192.168.1.42',flags:[]},
  c2:{submitted_at:'11:18 AM',time_taken:'78m 11s',tab_switches:2,face_pct:89,device:'Firefox 122/macOS',ip:'10.0.0.55',flags:['Tab exit 11:05','Tab exit 11:12']},
  c3:{submitted_at:'11:08 AM',time_taken:'68m 45s',tab_switches:0,face_pct:98,device:'Chrome 121/Win10',ip:'192.168.2.10',flags:[]},
  c4:{submitted_at:'11:27 AM',time_taken:'87m 03s',tab_switches:1,face_pct:91,device:'Safari 17/macOS',ip:'192.168.3.5',flags:['Tab exit 11:20']},
  c5:{submitted_at:'11:30 AM',time_taken:'90m 00s',tab_switches:4,face_pct:77,device:'Chrome 121/Win10',ip:'10.0.0.99',flags:['Multiple tab exits','Face absent 9x']},
}

const W_ANSWERS={
  c1:{w1:1,w2:3,w3:1,w4:0,w5:2,
    w6:{code:'function lengthOfLongestSubstring(s){\n  let map=new Map(),max=0,l=0;\n  for(let r=0;r<s.length;r++){\n    if(map.has(s[r]))l=Math.max(l,map.get(s[r])+1);\n    map.set(s[r],r);\n    max=Math.max(max,r-l+1);\n  }\n  return max;\n}',ai_score:19,ai_feedback:'Optimal sliding window O(n). Perfect edge case handling. Excellent variable naming.'},
    w7:{code:'function useDebounce(value,delay){\n  const[debounced,setDebounced]=useState(value);\n  useEffect(()=>{\n    const t=setTimeout(()=>setDebounced(value),delay);\n    return()=>clearTimeout(t);\n  },[value,delay]);\n  return debounced;\n}',ai_score:20,ai_feedback:'Perfect. Cleanup prevents memory leak. Dependency array correct.'},
    w8:{text:'Entry via REST/gRPC API gateway with rate limiting. Events to Apache Kafka (partitioned by user_id). Worker pools: email (SendGrid), push (Firebase FCM), SMS (Twilio). DB: PostgreSQL for preferences, Redis for fan-out cache, Cassandra for history. Stateless workers scale horizontally. Failure: retry queues, dead-letter topics, circuit breakers.',ai_score:14,ai_feedback:'Excellent architecture. Could expand on monitoring strategy.'},
    w9:{text:'At FinSoft our payment API timed out at 8s for 30% of requests vs 500ms target. Profiled with py-spy: N+1 queries fetching user data per transaction. Fixed with SQLAlchemy joinedload, Redis caching (TTL 5min), connection pooling. Result: p95 latency dropped from 8s to 210ms, zero timeouts in 3 months.',ai_score:19,ai_feedback:'Outstanding STAR structure. Quantified outcome. Strong debugging discipline.'}},
  c2:{w1:1,w2:1,w3:0,w4:0,w5:2,
    w6:{code:'function lengthOfLongestSubstring(s){\n  let res=0,start=0,seen={};\n  for(let i=0;i<s.length;i++){\n    if(seen[s[i]]!==undefined&&seen[s[i]]>=start)start=seen[s[i]]+1;\n    seen[s[i]]=i;\n    res=Math.max(res,i-start+1);\n  }\n  return res;\n}',ai_score:18,ai_feedback:'Correct sliding window using object. Works and handles edge cases.'},
    w7:{code:'function useDebounce(value,delay){\n  const[dv,setDv]=useState(value);\n  useEffect(()=>{\n    const id=setTimeout(()=>setDv(value),delay);\n    return()=>clearTimeout(id);\n  },[value,delay]);\n  return dv;\n}',ai_score:20,ai_feedback:'Correct. Cleanup included.'},
    w8:{text:'Use microservices with Kafka for event streaming. Workers send emails and push. Redis caching. PostgreSQL for storage. Scale horizontally. Retry queues for failures.',ai_score:9,ai_feedback:'Covers basics but lacks depth on partitioning, DB selection, failure specifics.'},
    w9:{text:'Led monolith to microservices migration in Node.js. 6 months, 4 engineers, Strangler Fig pattern. Zero downtime via feature flags. 40% faster responses.',ai_score:16,ai_feedback:'Good narrative. Saga pattern shows advanced knowledge.'}},
  c3:{w1:1,w2:3,w3:1,w4:0,w5:2,
    w6:{code:'var lengthOfLongestSubstring=function(s){\n  let m=new Map(),l=0,ans=0;\n  for(let r=0;r<s.length;r++){\n    if(m.has(s[r]))l=Math.max(m.get(s[r])+1,l);\n    m.set(s[r],r);\n    ans=Math.max(ans,r-l+1);\n  }\n  return ans;\n};',ai_score:19,ai_feedback:'Identical logic to optimal. O(n) time O(k) space. Production-ready.'},
    w7:{code:'import{useState,useEffect}from"react";\nfunction useDebounce(value,delay){\n  const[v,s]=useState(value);\n  useEffect(()=>{const t=setTimeout(()=>s(value),delay);return()=>clearTimeout(t)},[value,delay]);\n  return v;\n}',ai_score:20,ai_feedback:'Correct. Imports shown, cleanup included.'},
    w8:{text:'API Gateway -> Kafka (partitioned by user_id) -> Worker Pool (email/push/SMS). DB: Postgres for accounts, Redis sorted sets for queues, Elasticsearch for search. K8s HPA for scaling. Circuit breakers. DLQ for failed messages. Prometheus + Grafana monitoring.',ai_score:15,ai_feedback:'Strong architecture. K8s, DLQ, monitoring covered. Very professional.'},
    w9:{text:'Fixed race condition causing double-charges at peak load. Root: non-atomic read-modify-write on balance. Applied SELECT FOR UPDATE + Redis distributed lock. 1000 RPS load test, zero duplicates. Saved NPR 2M in monthly refunds.',ai_score:18,ai_feedback:'Outstanding. Race condition is senior-level problem. Business impact in currency. Precise.'}},
  c4:{w1:0,w2:1,w3:1,w4:3,w5:0,
    w6:{code:'function lengthOfLongestSubstring(s){\n  let max=0;\n  for(let i=0;i<s.length;i++){\n    let set=new Set();\n    for(let j=i;j<s.length;j++){\n      if(set.has(s[j]))break;\n      set.add(s[j]);\n      max=Math.max(max,j-i+1);\n    }\n  }\n  return max;\n}',ai_score:13,ai_feedback:'Correct but O(n^2). Sliding window would be O(n). Shows understanding, needs optimisation.'},
    w7:{code:'function useDebounce(value,delay){\n  const[v,s]=useState(value);\n  useEffect(()=>{\n    const t=setTimeout(()=>s(value),delay);\n    return()=>clearTimeout(t);\n  });\n  return v;\n}',ai_score:16,ai_feedback:'Missing dependency array - will cause infinite re-renders. Critical React bug.'},
    w8:{text:'I would use cloud hosting with auto-scaling. Message queue for notifications. Redis caching. Multiple servers. Load balancer. Database replication.',ai_score:6,ai_feedback:'Too vague. Missing specific tech, architecture pattern, failure handling.'},
    w9:{text:'Built a real-time dashboard using WebSockets and React. Clients could see analytics live. The client was satisfied with the result.',ai_score:8,ai_feedback:'Vague. No metrics, no problem framing, insufficient depth.'}},
  c5:{w1:0,w2:0,w3:1,w4:0,w5:0,
    w6:{code:'function lengthOfLongestSubstring(s){\n  return[...new Set(s)].length;\n}',ai_score:2,ai_feedback:'Incorrect. Counts unique characters total, not longest substring. Misunderstands problem.'},
    w7:{code:'function useDebounce(v,d){\n  setTimeout(()=>v,d);\n  return v;\n}',ai_score:3,ai_feedback:'Incorrect. No React state. setTimeout has no effect on return. Lacks hook knowledge.'},
    w8:{text:'Use microservices and cloud. Queue system. Database.',ai_score:2,ai_feedback:'Critically insufficient. Under 10 words of substance.'},
    w9:{text:'I fixed a bug that made things slow. My team was happy.',ai_score:2,ai_feedback:'Far too brief. No context, approach, or outcome.'}},
}

const V_QUESTIONS=[
  {id:'v1',category:'General',  duration:120,keywords:['led','built','impact','result','improved','architected'],q:'Walk me through your most impactful project. What was the challenge, your role, and the measurable outcome?'},
  {id:'v2',category:'Technical',duration:150,keywords:['Fiber','virtual DOM','diffing','memo','useCallback','useMemo'],q:'Explain React reconciliation algorithm and how you optimised rendering in a large application.'},
  {id:'v3',category:'Behavioral',duration:120,keywords:['communicate','compromise','respect','outcome','professional','data'],q:'Tell me about a disagreement with a team member. How did you handle it and what was the result?'},
  {id:'v4',category:'Learning', duration:90, keywords:['documentation','practice','project','course','mentor','experiment'],q:'How do you approach learning a new technology? Give a recent example.'},
  {id:'v5',category:'Career',   duration:90, keywords:['growth','lead','architect','contribute','align','vision'],q:'Where do you see yourself in 3 years and why is this role the right next step?'},
]

const V_CONDUCT={
  c1:{completed:'2081-08-22 02:34 PM',duration:'28m 14s',face_pct:94,eye_warnings:1,audio:'Excellent',net_drops:0},
  c2:{completed:'2081-08-22 04:12 PM',duration:'24m 08s',face_pct:87,eye_warnings:3,audio:'Good',net_drops:1},
  c3:{completed:'2081-08-23 10:21 AM',duration:'30m 02s',face_pct:96,eye_warnings:0,audio:'Excellent',net_drops:0},
  c4:{completed:'2081-08-22 07:45 PM',duration:'22m 33s',face_pct:82,eye_warnings:5,audio:'Fair',net_drops:2},
  c5:{completed:'2081-08-24 11:05 AM',duration:'18m 44s',face_pct:71,eye_warnings:8,audio:'Poor',net_drops:3},
}

const V_ANSWERS={
  c1:[
    {qId:'v1',overall:92,grade:'A', confidence:90,clarity:91,kw_hit:['led','built','improved','architected'],ai_notes:'Exceptional STAR structure. Strong quantification. Leadership clearly demonstrated.',transcript:'I led the rebuild of a real-time trading dashboard handling 50,000 concurrent users. Page load dropped from 4s to 800ms after I redesigned the backend with microservices, Redis caching, and WebSocket streaming. Led 8 engineers over 6 months. The system has maintained 99.99% uptime for 18 months.'},
    {qId:'v2',overall:94,grade:'A', confidence:88,clarity:91,kw_hit:['Fiber','memo','useCallback','useMemo','diffing'],ai_notes:'Deep technical knowledge. Named Fiber and time-slicing correctly. Quantified optimization impact.',transcript:'React Fiber since v16 enables async rendering and time-slicing. The reconciler diffs the work-in-progress tree using key-based heuristics. I optimise with React.memo, useCallback for event handlers passed as props, useMemo for expensive values, and React.lazy with Suspense for code splitting. In our dashboard we reduced unnecessary re-renders by 60%.'},
    {qId:'v3',overall:91,grade:'A', confidence:88,clarity:94,kw_hit:['communicate','compromise','outcome','professional','data'],ai_notes:'Data-driven conflict resolution. Collaborative approach with positive team outcome.',transcript:'A colleague wanted a 200KB charting library for just 3 chart types. I prepared a bundle size comparison and performance analysis and presented it at sprint planning. Team agreed to use D3.js. We saved 180KB and gained full customization. The colleague acknowledged it was the right call.'},
    {qId:'v4',overall:88,grade:'B+',confidence:86,clarity:89,kw_hit:['documentation','practice','project','mentor'],ai_notes:'Structured approach. Open source contribution shows initiative beyond requirements.',transcript:'For TypeScript I read the handbook first, then migrated a utility library as practice. I contributed three PRs to open-source TS projects to get maintainer feedback. Within three weeks I was reviewing team TypeScript code.'},
    {qId:'v5',overall:91,grade:'A', confidence:92,clarity:90,kw_hit:['growth','lead','architect','contribute','vision'],ai_notes:'Specific career vision. Referenced actual JD details. Shows genuine research about the role.',transcript:'In three years I aim to be a Staff Engineer driving cross-team architecture decisions. This role is right because your 500k-user platform and the greenfield migration in the JD is exactly the scale of challenge I am seeking. Your investment in engineering culture aligns with where I want to grow.'},
  ],
  c2:[
    {qId:'v1',overall:79,grade:'B', confidence:75,clarity:78,kw_hit:['led','improved'],ai_notes:'Good project but lacks technical depth. Outcome briefly quantified.',transcript:'I led monolith to microservices migration. Six months, team of four. Strangler Fig pattern. Zero downtime via feature flags. 40% faster response times.'},
    {qId:'v2',overall:74,grade:'B-',confidence:70,clarity:72,kw_hit:['memo','useCallback'],ai_notes:'Surface-level explanation. Did not mention Fiber. Insufficient for senior role.',transcript:'React virtual DOM compares old and new trees and updates only what changed. I use React.memo to prevent unnecessary re-renders and useCallback. Also code splitting with dynamic import.'},
    {qId:'v3',overall:65,grade:'C+',confidence:62,clarity:68,kw_hit:['outcome'],ai_notes:'Vague resolution. Passive approach. No technical reasoning shown.',transcript:'I had a disagreement about which database to use. I made my case, we voted, went with team decision. Worked out fine.'},
    {qId:'v4',overall:70,grade:'B-',confidence:68,clarity:72,kw_hit:['course','project'],ai_notes:'Standard approach. Lacks initiative beyond courses.',transcript:'I read documentation and watch tutorials. For GraphQL I took a Udemy course then added it to a project.'},
    {qId:'v5',overall:60,grade:'C+',confidence:58,clarity:62,kw_hit:['growth'],ai_notes:'Generic. No company research. Does not inspire confidence.',transcript:'I want to grow into a senior technical lead. This role gives me that opportunity.'},
  ],
  c3:[
    {qId:'v1',overall:94,grade:'A', confidence:94,clarity:93,kw_hit:['built','impact','result','architected'],ai_notes:'Outstanding. Senior-level problem diagnosis. Business impact quantified in currency.',transcript:'Fixed a race condition causing double-charges at peak load. Root: non-atomic read-modify-write on account balance. Applied SELECT FOR UPDATE with Redis distributed lock. Load-tested at 1,000 RPS, zero duplicates. Prevented NPR 2M in monthly refunds.'},
    {qId:'v2',overall:95,grade:'A+',confidence:92,clarity:95,kw_hit:['Fiber','memo','useMemo','diffing','virtual DOM'],ai_notes:'Mentioned time-slicing, two-phase commit, fiber interruptibility, windowing. Exceptional depth.',transcript:'React Fiber rewrote the reconciler for async rendering and time-slicing - work can be paused and resumed. Reconciliation creates a work-in-progress fiber tree, diffs with key heuristics, commits in two phases: render (interruptible) and commit (synchronous). I optimise with React.memo, PureComponent, react-window for list virtualisation, and selective context use.'},
    {qId:'v3',overall:92,grade:'A', confidence:91,clarity:92,kw_hit:['communicate','data','professional','outcome'],ai_notes:'Excellent data-driven decision making. Created reusable process from disagreement.',transcript:'Disagreed with architect about GraphQL for a simple CRUD service. Created a decision matrix on complexity, learning curve, migration risk, and maintenance. Presented at architecture review. Architect agreed REST was right. We now have a clear framework for when to use each technology.'},
    {qId:'v4',overall:91,grade:'A', confidence:91,clarity:90,kw_hit:['documentation','project','mentor','experiment'],ai_notes:'Real-world application with knowledge transfer. Shows teaching orientation.',transcript:'For Kubernetes I did the CKA course and labs, then deployed staging to DigitalOcean cluster. Encountered real problems with networking and persistent volumes. Wrote internal docs for the team. Three months later I was helping ops debug production Kubernetes networking issues.'},
    {qId:'v5',overall:93,grade:'A', confidence:94,clarity:93,kw_hit:['growth','lead','architect','align','vision'],ai_notes:'Specific, researched, aligned to real company scale. Outstanding.',transcript:'In three years I aim to be a Principal Engineer driving architecture across teams. This role is right because your event-driven microservices at 500k concurrent users is exactly where I want to grow from coding to system design at scale.'},
  ],
  c4:[
    {qId:'v1',overall:60,grade:'C+',confidence:58,clarity:62,kw_hit:['built'],ai_notes:'Vague impact. No metrics. Insufficient for senior role.',transcript:'I built a real-time dashboard using WebSockets and React. Clients could see analytics live. It was challenging and the client was satisfied.'},
    {qId:'v2',overall:55,grade:'C', confidence:52,clarity:58,kw_hit:['memo'],ai_notes:'Too surface-level. No mention of Fiber or advanced patterns.',transcript:'React uses a virtual DOM. It updates only what changed. I use React.memo to prevent components from re-rendering when props have not changed.'},
    {qId:'v3',overall:40,grade:'D+',confidence:38,clarity:45,kw_hit:[],ai_notes:'Passive avoidance is concerning at senior level. No leadership demonstrated.',transcript:'I prefer to avoid disagreements. If I have a different view I usually follow the team decision.'},
    {qId:'v4',overall:38,grade:'D', confidence:35,clarity:40,kw_hit:[],ai_notes:'No structured approach. Insufficient for senior role.',transcript:'I usually Google things and watch YouTube, then try to use it.'},
    {qId:'v5',overall:30,grade:'F', confidence:28,clarity:32,kw_hit:[],ai_notes:'No specific vision. No research evident.',transcript:'I want to grow professionally and this looks like a good opportunity.'},
  ],
  c5:[
    {qId:'v1',overall:29,grade:'F',confidence:25,clarity:32,kw_hit:[],ai_notes:'No specific project. No structure. Insufficient.',transcript:'I have worked on various projects involving websites and APIs.'},
    {qId:'v2',overall:27,grade:'F',confidence:22,clarity:30,kw_hit:[],ai_notes:'Fundamental misconception. Missing all required depth.',transcript:'Virtual DOM is like a copy of the real DOM and React uses it to update things faster.'},
    {qId:'v3',overall:24,grade:'F',confidence:20,clarity:28,kw_hit:[],ai_notes:'No example given. Empty statement.',transcript:'I agree with my team. I am a good team player.'},
    {qId:'v4',overall:20,grade:'F',confidence:18,clarity:22,kw_hit:[],ai_notes:'No structure or example.',transcript:'I learn fast. YouTube mostly.'},
    {qId:'v5',overall:10,grade:'F',confidence:8, clarity:12,kw_hit:[],ai_notes:'Entirely inappropriate for professional interview.',transcript:'I need a job and this one looks good.'},
  ],
}

const COMPETENCIES=[
  {id:'pc1',label:'Technical Knowledge',   weight:30,desc:'Depth of role-specific knowledge, architecture thinking'},
  {id:'pc2',label:'Communication',         weight:15,desc:'Clarity, listening, explaining complex ideas simply'},
  {id:'pc3',label:'Leadership & Initiative',weight:15,desc:'Demonstrated leadership, proactive attitude'},
  {id:'pc4',label:'Problem-Solving',        weight:15,desc:'Structured thinking, data-driven decisions'},
  {id:'pc5',label:'Team Collaboration',     weight:10,desc:'Teamwork, conflict resolution, company values'},
  {id:'pc6',label:'Learning Agility',       weight:10,desc:'Learning quickly, adapting to change'},
  {id:'pc7',label:'Role Motivation',        weight:5, desc:'Genuine interest, realistic expectations'},
]
const PANEL=[
  {id:'i1',name:'Bikash Shrestha',title:'CTO',           avatar:'BS'},
  {id:'i2',name:'Maya Pradhan',   title:'HR Director',   avatar:'MP'},
  {id:'i3',name:'Anita Gurung',   title:'VP Engineering',avatar:'AG'},
]
const P_SCORES={
  c1:{i1:{pc1:92,pc2:88,pc3:85,pc4:90,pc5:86,pc6:88,pc7:90,notes:'Outstanding technical depth. Excellent real-world examples with business impact.',rec:'Strong Hire'},
      i2:{pc1:88,pc2:92,pc3:82,pc4:86,pc5:90,pc6:84,pc7:92,notes:'Very professional. Clear culture fit. Excellent communicator.',rec:'Hire'},
      i3:{pc1:90,pc2:86,pc3:88,pc4:88,pc5:84,pc6:90,pc7:88,notes:'Strong coding discussions. Great performance optimisation instinct.',rec:'Strong Hire'},
      conducted:'2081-08-26 10:00 AM',format:'In-Person'},
  c3:{i1:{pc1:94,pc2:90,pc3:88,pc4:92,pc5:82,pc6:90,pc7:88,notes:'Best technical candidate this year. Race condition story was brilliant.',rec:'Strong Hire'},
      i2:{pc1:90,pc2:88,pc3:86,pc4:90,pc5:84,pc6:88,pc7:90,notes:'Extremely mature. Culture fit excellent. Recommend without reservation.',rec:'Strong Hire'},
      i3:{pc1:92,pc2:86,pc3:90,pc4:94,pc5:80,pc6:92,pc7:86,notes:'Principal-level thinking. K8s and system design breadth impressive.',rec:'Strong Hire'},
      conducted:'2081-08-26 02:00 PM',format:'In-Person'},
}

const DAYS=['Mon','Tue','Wed','Thu','Fri']
const IV_AVAIL={
  BS:{Mon:['10:00','11:00','14:00'],Tue:['09:00','15:00'],Wed:['10:00','11:00','16:00'],Thu:['09:00','14:00'],Fri:['10:00']},
  MP:{Mon:['09:00','10:00','14:00'],Tue:['10:00','11:00','14:00'],Wed:['09:00','15:00'],Thu:['10:00','14:00'],Fri:['09:00','10:00']},
  AG:{Mon:['11:00','14:00'],Tue:['09:00','10:00','15:00'],Wed:['11:00','14:00'],Thu:['10:00','11:00'],Fri:['11:00']},
}
const SCHED_PANELS=[
  {id:'sp1',candidate:'Gita Maharjan', date:'Mon 2081-09-02',time:'10:00 AM',type:'Physical',  interviewers:['BS','MP','AG'],platform:'In-Person',  status:'Confirmed', invitesSent:true},
  {id:'sp2',candidate:'Anil KC',       date:'Mon 2081-09-02',time:'02:00 PM',type:'Physical',  interviewers:['BS','AG'],    platform:'In-Person',  status:'Pending',   invitesSent:true},
  {id:'sp3',candidate:'Rajan Shrestha',date:'Tue 2081-09-03',time:'10:00 AM',type:'Virtual',   interviewers:['MP','AG'],    platform:'Google Meet',status:'Confirmed', invitesSent:true,meetLink:'https://meet.google.com/ats-rajan-int'},
]

// ── SCORE CALCULATORS ─────────────────────────────────────────
function calcW(cid){
  const a=W_ANSWERS[cid]; if(!a) return null
  const mcqKeys=['w1','w2','w3','w4','w5']
  const mcq=mcqKeys.reduce((s,k,i)=>s+(a[k]===W_QUESTIONS[i]?.correct?W_QUESTIONS[i].marks:0),0)
  const cod=(a.w6?.ai_score||0)+(a.w7?.ai_score||0)
  const ess=(a.w8?.ai_score||0)+(a.w9?.ai_score||0)
  const tot=mcq+cod+ess
  const grade=tot>=90?'A+':tot>=80?'A':tot>=70?'B+':tot>=60?'B':tot>=50?'C':tot>=40?'D':'F'
  return{mcq,coding:cod,essay:ess,total:tot,grade,passed:tot>=65}
}
function calcV(cid){
  const a=V_ANSWERS[cid]; if(!a) return null
  const avg=Math.round(a.reduce((s,v)=>s+v.overall,0)/a.length)
  const grade=avg>=90?'A+':avg>=80?'A':avg>=70?'B+':avg>=60?'B':avg>=50?'C':avg>=40?'D':'F'
  return{avg,grade,passed:avg>=60,answers:a}
}
function calcP(cid){
  const sc=P_SCORES[cid]; if(!sc) return null
  const ivs=[sc.i1,sc.i2,sc.i3].filter(Boolean)
  const compAvg=COMPETENCIES.map(c=>{
    const vals=ivs.map(p=>p[c.id]||0)
    const avg=Math.round(vals.reduce((s,v)=>s+v,0)/vals.length)
    return{...c,avg,weighted:(avg*c.weight/100).toFixed(1)}
  })
  const pct=Math.round(compAvg.reduce((s,c)=>s+parseFloat(c.weighted),0))
  const grade=pct>=90?'A+':pct>=80?'A':pct>=70?'B+':pct>=60?'B':'F'
  const recs=ivs.map(p=>p.rec)
  const decision=recs.every(r=>r==='Strong Hire')?'Strong Hire':recs.filter(r=>r.includes('Hire')).length>=2?'Hire':recs.filter(r=>r==='No Hire').length>=2?'No Hire':'Hold'
  return{compAvg,pct,grade,decision,passed:pct>=60}
}
function calcOverall(cid){
  const cv=CANDIDATES.find(c=>c.id===cid)?.cv_score||0
  const w=calcW(cid),v=calcV(cid),p=calcP(cid)
  const composite=Math.round(cv*0.20+(w?.total||0)*0.30+(v?.avg||0)*0.25+(p?.pct||0)*0.25)
  const grade=composite>=90?'A+':composite>=80?'A':composite>=70?'B+':composite>=60?'B':composite>=50?'C':'F'
  return{cv,written:w?.total||null,video:v?.avg||null,physical:p?.pct||null,composite,grade,w,v,p,
    recommend:composite>=75?'Select':composite>=60?'Consider':'Reject'}
}

// ── UI ATOMS ─────────────────────────────────────────────────
const typeStyle={MCQ:{c:'#3b82f6',bg:'#eff6ff'},CODING:{c:'#7c3aed',bg:'#f5f3ff'},ESSAY:{c:'#10b981',bg:'#f0fdf4'}}
const catStyle={General:{c:'#10b981',bg:'#f0fdf4'},Technical:{c:'#3b82f6',bg:'#eff6ff'},Behavioral:{c:'#8b5cf6',bg:'#f5f3ff'},Learning:{c:'#f59e0b',bg:'#fffbeb'},Career:{c:'#0891b2',bg:'#ecfeff'}}
const gc=g=>g?.startsWith('A')?'#059669':g?.startsWith('B')?'#1e40af':g?.startsWith('C')?'#f59e0b':'#ef4444'
const gb=g=>g?.startsWith('A')?'#f0fdf4':g?.startsWith('B')?'#eff6ff':g?.startsWith('C')?'#fffbeb':'#fef2f2'

function GBadge({g,lg}){return <span style={{fontSize:lg?20:10,fontWeight:900,padding:lg?'6px 14px':'2px 8px',borderRadius:8,background:gb(g),color:gc(g),border:`1.5px solid ${gc(g)}30`,display:'inline-block'}}>{g||'—'}</span>}
function SBar({label,val,max=100,color='#3b82f6',weight}){
  return(<div style={{marginBottom:7}}>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:9,marginBottom:2}}>
      <span style={{color:'#374151',fontWeight:600}}>{label}{weight?<span style={{color:'#94a3b8'}}> ({weight}%)</span>:''}</span>
      <span style={{fontWeight:900,color}}>{val}/{max}</span>
    </div>
    <div style={{height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
      <div style={{width:Math.round(val/max*100)+'%',height:'100%',background:color,borderRadius:3,transition:'width .4s'}}/>
    </div>
  </div>)
}
function CPill({c,sel,onClick}){return <button onClick={onClick} style={{padding:'6px 12px',borderRadius:9,border:`2px solid ${sel?'#1e40af':'#e2e8f0'}`,background:sel?'#eff6ff':'#fff',color:sel?'#1e40af':'#334155',fontSize:9,fontWeight:sel?800:400,cursor:'pointer',display:'flex',gap:6,alignItems:'center'}}>
  <div style={{width:20,height:20,borderRadius:'50%',background:sel?'#1e40af':'#f1f5f9',color:sel?'#fff':'#64748b',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800}}>{c.avatar}</div>
  {c.name.split(' ')[0]}
</button>}

// ── VIDEO PLAYER ─────────────────────────────────────────────
function VideoPlayer({candidate,qIdx,answer,question}){
  const [playing,setPlaying]=useState(false)
  const [progress,setProgress]=useState(0)
  const [showT,setShowT]=useState(false)
  const tiRef=useRef(null)
  const toggle=()=>{
    if(playing){clearInterval(tiRef.current);setPlaying(false)}
    else{setPlaying(true);tiRef.current=setInterval(()=>setProgress(p=>{if(p>=100){clearInterval(tiRef.current);setPlaying(false);return 100}return p+0.5}),60)}
  }
  useEffect(()=>{setPlaying(false);setProgress(0);clearInterval(tiRef.current)},[qIdx])
  const cs=catStyle[question?.category]||catStyle.General
  return(
    <div style={{background:'#0f172a',borderRadius:12,overflow:'hidden',border:'1px solid #1e293b'}}>
      <style>{`@keyframes recB{0%,100%{opacity:1}50%{opacity:.2}}`}</style>
      <div style={{position:'relative',paddingBottom:'52%',background:'linear-gradient(135deg,#0f172a,#1e293b)'}}>
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}>
          <div style={{width:68,height:68,borderRadius:'50%',background:`linear-gradient(135deg,${cs.c}40,${cs.c}20)`,border:`2px solid ${cs.c}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:900,color:'#fff'}}>{candidate.avatar}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.8)',fontWeight:700}}>{candidate.name}</div>
          <div style={{fontSize:9,color:'rgba(255,255,255,.4)'}}>Q{qIdx+1} — {question?.category} Interview</div>
          {playing&&<div style={{position:'absolute',top:10,right:10,display:'flex',gap:5,alignItems:'center',background:'rgba(239,68,68,.15)',padding:'3px 8px',borderRadius:6}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:'#ef4444',animation:'recB 1s infinite'}}/>
            <span style={{fontSize:7,color:'#ef4444',fontWeight:800}}>PLAYBACK</span>
          </div>}
        </div>
      </div>
      <div style={{background:'#1e293b',padding:'10px 14px'}}>
        <div style={{height:3,background:'#334155',borderRadius:2,marginBottom:10,cursor:'pointer'}} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setProgress(Math.round((e.clientX-r.left)/r.width*100))}}>
          <div style={{width:progress+'%',height:'100%',background:`linear-gradient(90deg,${cs.c},${cs.c}99)`,borderRadius:2}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>{setProgress(0);setPlaying(false)}} style={{background:'none',border:'none',color:'#94a3b8',fontSize:14,cursor:'pointer'}}>⏮</button>
          <button onClick={toggle} style={{width:32,height:32,borderRadius:'50%',background:cs.c,border:'none',color:'#fff',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{playing?'⏸':'▶'}</button>
          <span style={{fontSize:8,color:'#64748b',fontVariantNumeric:'tabular-nums'}}>{Math.round(progress)}%</span>
          <div style={{flex:1}}/>
          <span style={{fontSize:8,padding:'2px 8px',borderRadius:6,background:answer.overall>=80?'#d1fae5':answer.overall>=60?'#dbeafe':'#fee2e2',color:answer.overall>=80?'#065f46':answer.overall>=60?'#1e40af':'#dc2626',fontWeight:700}}>{answer.overall}%</span>
          <GBadge g={answer.grade}/>
          <button onClick={()=>setShowT(s=>!s)} style={{padding:'2px 8px',borderRadius:5,border:'1px solid #334155',background:'transparent',color:'#94a3b8',fontSize:7,cursor:'pointer'}}>{showT?'Hide':'Transcript'}</button>
        </div>
      </div>
      {showT&&<div style={{background:'#0a0f1a',padding:'10px 14px',borderTop:'1px solid #1e293b',maxHeight:120,overflowY:'auto'}}>
        <div style={{fontSize:8,color:'#64748b',fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Auto-Transcript</div>
        <div style={{fontSize:9,color:'#cbd5e1',lineHeight:1.8,fontStyle:'italic'}}>"{answer.transcript}"</div>
        {answer.kw_hit?.length>0&&<div style={{marginTop:6,display:'flex',gap:3,flexWrap:'wrap'}}>
          {answer.kw_hit.map(k=><span key={k} style={{fontSize:7,padding:'1px 6px',borderRadius:4,background:'#1e3a5f',color:'#60a5fa',border:'1px solid #1e40af40'}}>✓ {k}</span>)}
        </div>}
      </div>}
    </div>
  )
}

// ── SCHEDULER ────────────────────────────────────────────────
function Scheduler({notify}){
  const [st,setSt]=useState('calendar')
  const [selDay,setSelDay]=useState(null)
  const [selTime,setSelTime]=useState(null)
  const [selPanel,setSelPanel]=useState(['BS','MP','AG'])
  const [schedType,setSchedType]=useState('Physical')
  const [schedCand,setSchedCand]=useState(CANDIDATES[0])
  const [booking,setBooking]=useState(false)
  const [booked,setBooked]=useState([])
  const [selfLink,setSelfLink]=useState('')
  const commonSlots=DAYS.map(day=>{
    const sets=selPanel.map(p=>new Set(IV_AVAIL[p]?.[day]||[]))
    const common=new Set(sets[0]||[])
    sets.slice(1).forEach(s=>[...common].forEach(t=>{if(!s.has(t))common.delete(t)}))
    return{day,slots:[...common].sort()}
  })
  const doBook=async()=>{
    if(!selDay||!selTime){notify('Select a slot first');return}
    setBooking(true);await new Promise(r=>setTimeout(r,1200))
    setBooked(b=>[...b,{id:'b'+Date.now(),candidate:schedCand.name,date:`${selDay} 2081-09-0${DAYS.indexOf(selDay)+2}`,time:selTime,type:schedType,interviewers:selPanel,platform:schedType==='Physical'?'In-Person':'Google Meet',status:'Confirmed',invitesSent:true}])
    setBooking(false);setSelDay(null);setSelTime(null)
    notify(`Interview scheduled for ${schedCand.name} on ${selDay} ${selTime}! Email+WhatsApp+Calendar sent to all ${selPanel.length} interviewers and candidate.`)
  }
  const allSched=[...SCHED_PANELS,...booked]
  return(<div>
    <div style={{background:'linear-gradient(135deg,#059669,#0891b2)',borderRadius:12,padding:'12px 16px',marginBottom:14,color:'#fff'}}>
      <div style={{fontSize:13,fontWeight:900}}>AI Auto Interview Scheduler</div>
      <div style={{fontSize:9,opacity:.8}}>AI detects availability · Books optimal slots · Auto Email+WhatsApp+Calendar · Candidate self-booking</div>
    </div>
    <div style={{display:'flex',gap:6,marginBottom:14}}>
      {[['calendar','Calendar'],['scheduled','Scheduled'],['self-book','Self-Booking']].map(([t,l])=>(
        <button key={t} onClick={()=>setSt(t)} style={{padding:'7px 14px',borderRadius:8,border:'none',background:st===t?'#059669':'#f1f5f9',color:st===t?'#fff':'#475569',fontSize:10,fontWeight:st===t?800:400,cursor:'pointer'}}>{l}</button>
      ))}
    </div>
    {st==='calendar'&&<div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:14}}>
      <div>
        <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #e2e8f0',marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:8}}>Candidate + Panel Setup</div>
          <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
            {CANDIDATES.slice(0,3).map(c=><button key={c.id} onClick={()=>{setSchedCand(c);setSelfLink('')}} style={{padding:'5px 12px',borderRadius:8,border:`2px solid ${schedCand.id===c.id?'#059669':'#e2e8f0'}`,background:schedCand.id===c.id?'#f0fdf4':'#f8fafc',color:schedCand.id===c.id?'#065f46':'#64748b',fontSize:9,fontWeight:schedCand.id===c.id?800:400,cursor:'pointer'}}>{c.name.split(' ')[0]}</button>)}
          </div>
          <div style={{display:'flex',gap:6,marginBottom:10}}>
            {['Physical','Virtual (Meet)','Virtual (Zoom)'].map(t=><button key={t} onClick={()=>setSchedType(t)} style={{flex:1,padding:'6px',borderRadius:8,border:`2px solid ${schedType===t?'#059669':'#e2e8f0'}`,background:schedType===t?'#f0fdf4':'#f8fafc',color:schedType===t?'#065f46':'#64748b',fontSize:8,fontWeight:schedType===t?800:400,cursor:'pointer',textAlign:'center'}}>{t==='Physical'?'🏢':t.includes('Meet')?'🎥':'🔵'} {t.split(' ')[0]}</button>)}
          </div>
          <div style={{display:'flex',gap:6}}>
            {PANEL.map(iv=>{const sel=selPanel.includes(iv.id);return(
              <button key={iv.id} onClick={()=>setSelPanel(p=>sel?p.filter(x=>x!==iv.id):[...p,iv.id])} style={{flex:1,padding:'7px',borderRadius:9,border:`2px solid ${sel?'#059669':'#e2e8f0'}`,background:sel?'#f0fdf4':'#f8fafc',color:sel?'#065f46':'#64748b',fontSize:9,cursor:'pointer',textAlign:'center'}}>
                <div style={{fontWeight:900}}>{iv.avatar}</div>
                <div style={{fontSize:7}}>{iv.name.split(' ')[0]}</div>
                {sel&&<div style={{fontSize:7,color:'#10b981'}}>Selected</div>}
              </button>
            )})}
          </div>
        </div>
        <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:4}}>AI Common Availability Grid</div>
          <div style={{fontSize:8,color:'#64748b',marginBottom:10}}>Green = all {selPanel.length} panel members free simultaneously</div>
          <div style={{display:'grid',gridTemplateColumns:`90px repeat(${commonSlots.length},1fr)`,gap:3}}>
            <div style={{fontSize:8,color:'#94a3b8',padding:'5px 0',fontWeight:700}}>Time</div>
            {commonSlots.map(d=><div key={d.day} style={{fontSize:9,fontWeight:800,color:'#334155',textAlign:'center',padding:'5px 0',background:selDay===d.day?'#f0fdf4':'transparent',borderRadius:5}}>{d.day}</div>)}
            {['09:00','10:00','11:00','14:00','15:00','16:00'].map(time=>[
              <div key={'t'+time} style={{fontSize:8,color:'#94a3b8',padding:'5px 3px',display:'flex',alignItems:'center'}}>{time}</div>,
              ...commonSlots.map(d=>{
                const avail=d.slots.includes(time),isSel=selDay===d.day&&selTime===time
                return<div key={d.day+time} onClick={()=>{if(avail){setSelDay(d.day);setSelTime(time)}}}
                  style={{height:32,borderRadius:6,background:isSel?'#059669':avail?'#d1fae5':'#f8fafc',border:`2px solid ${isSel?'#059669':avail?'#10b981':'#f1f5f9'}`,cursor:avail?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {avail&&<div style={{fontSize:8,fontWeight:700,color:isSel?'#fff':'#065f46'}}>{isSel?'Selected':time}</div>}
                </div>
              })
            ])}
          </div>
        </div>
      </div>
      <div>
        <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #e2e8f0',marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>Booking Summary</div>
          {[['Candidate',schedCand.name],['Type',schedType],['Date',selDay||'Not selected'],['Time',selTime||'Not selected'],['Panel',selPanel.join(', ')||'None']].map(([k,v])=>(
            <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:9,padding:'4px 0',borderBottom:'1px solid #f8fafc'}}>
              <span style={{color:'#94a3b8'}}>{k}</span><span style={{color:'#0f172a',fontWeight:600}}>{v}</span>
            </div>
          ))}
          {selDay&&selTime&&<div style={{marginTop:10,padding:'8px 10px',background:'#f0fdf4',borderRadius:7,border:'1px solid #bbf7d0'}}>
            <div style={{fontSize:8,fontWeight:700,color:'#065f46',marginBottom:4}}>Auto-sends:</div>
            {['Email to candidate + panel','WhatsApp to all parties','Google Calendar event','Reminders 24h + 2h before'].map((i,ix)=>(
              <div key={ix} style={{fontSize:8,color:'#374151'}}>✓ {i}</div>
            ))}
          </div>}
          <button onClick={doBook} disabled={!selDay||!selTime||booking} style={{width:'100%',marginTop:10,padding:'10px',borderRadius:9,border:'none',background:(!selDay||!selTime||booking)?'#e2e8f0':'linear-gradient(135deg,#059669,#0891b2)',color:(!selDay||!selTime||booking)?'#94a3b8':'#fff',fontSize:10,fontWeight:800,cursor:(!selDay||!selTime||booking)?'default':'pointer'}}>
            {booking?'Scheduling...':'Confirm & Send All Invites'}
          </button>
        </div>
        <div style={{background:'#eff6ff',borderRadius:10,padding:'12px',border:'1px solid #bfdbfe'}}>
          <div style={{fontSize:9,fontWeight:800,color:'#1e40af',marginBottom:7}}>AI Recommendations</div>
          {['Monday 10:00 AM — all 3 interviewers free; peak energy','Avoid Fri PM — lower panel alertness','Allow 90min gap between panels','Send prep materials 48h before'].map((s,i)=>(
            <div key={i} style={{fontSize:8,color:'#334155',padding:'2px 0',display:'flex',gap:4}}><span style={{color:'#3b82f6'}}>⚡</span>{s}</div>
          ))}
        </div>
      </div>
    </div>}
    {st==='scheduled'&&<div>
      <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>{allSched.length} Scheduled Interviews</div>
      {allSched.map(s=>(
        <div key={s.id} style={{background:'#fff',borderRadius:11,padding:'12px 14px',marginBottom:8,border:`1.5px solid ${s.status==='Confirmed'?'#bbf7d0':'#fde68a'}`,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:160}}>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
              <span style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{s.candidate}</span>
              <span style={{fontSize:8,fontWeight:700,padding:'1px 8px',borderRadius:6,background:s.status==='Confirmed'?'#d1fae5':'#fef9c3',color:s.status==='Confirmed'?'#065f46':'#92400e'}}>{s.status}</span>
            </div>
            <div style={{fontSize:8,color:'#64748b'}}>{s.date} · {s.time} · {s.platform}</div>
            <div style={{fontSize:7,color:'#94a3b8'}}>Panel: {s.interviewers.join(', ')}</div>
            {s.meetLink&&<a href={s.meetLink} style={{fontSize:7,color:'#3b82f6'}}>{s.meetLink}</a>}
          </div>
          <div style={{display:'flex',gap:5}}>
            {s.invitesSent&&<span style={{fontSize:8,color:'#10b981',fontWeight:700}}>Invites sent</span>}
            <button onClick={()=>notify(`Reminder sent to ${s.candidate} and panel!`)} style={{padding:'4px 8px',borderRadius:6,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8,cursor:'pointer'}}>Remind</button>
            <button onClick={()=>notify('Rescheduled!')} style={{padding:'4px 8px',borderRadius:6,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8,cursor:'pointer'}}>Reschedule</button>
          </div>
        </div>
      ))}
    </div>}
    {st==='self-book'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
      <div style={{background:'#fff',borderRadius:12,padding:'16px',border:'1px solid #e2e8f0'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:4}}>Candidate Self-Booking Portal</div>
        <div style={{fontSize:10,color:'#64748b',marginBottom:14}}>Send a link so the candidate picks their preferred slot from pre-approved windows.</div>
        <select value={schedCand.id} onChange={e=>{setSchedCand(CANDIDATES.find(c=>c.id===e.target.value));setSelfLink('')}} style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:11,outline:'none',marginBottom:12}}>
          {CANDIDATES.map(c=><option key={c.id} value={c.id}>{c.name} — {c.role}</option>)}
        </select>
        <button onClick={()=>{setSelfLink(`https://schedule.nephrpro.com/book/${schedCand.id}/${Date.now().toString(36)}`);notify(`Self-booking link generated for ${schedCand.name}!`)}} style={{width:'100%',padding:'10px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#059669,#1e40af)',color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer',marginBottom:10}}>Generate Self-Booking Link</button>
        {selfLink&&<div style={{background:'#f0fdf4',borderRadius:8,padding:'10px',border:'1px solid #bbf7d0'}}>
          <div style={{fontSize:8,fontFamily:'monospace',color:'#334155',wordBreak:'break-all',marginBottom:8}}>{selfLink}</div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>notify('Copied!')} style={{flex:1,padding:'6px',borderRadius:6,border:'none',background:'#059669',color:'#fff',fontSize:9,cursor:'pointer'}}>Copy</button>
            <button onClick={()=>notify(`Self-booking link sent to ${schedCand.name} via Email + WhatsApp!`)} style={{flex:1,padding:'6px',borderRadius:6,border:'none',background:'#1e40af',color:'#fff',fontSize:9,cursor:'pointer'}}>Send</button>
          </div>
        </div>}
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:'16px',border:'1px solid #e2e8f0'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>How Self-Booking Works</div>
        {[['Link Generated','Unique URL with pre-approved slots only'],['Auto-Sent','Email + WhatsApp to candidate instantly'],['Candidate Picks','Candidate opens link, selects preferred slot'],['Instant Confirm','ATS confirms, sends invites to all panel'],['Auto Reminders','24h and 2h reminders to all parties']].map(([t,d],i)=>(
          <div key={i} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:'1px solid #f8fafc',alignItems:'flex-start'}}>
            <div style={{width:24,height:24,borderRadius:'50%',background:'#f0fdf4',border:'2px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,flexShrink:0,fontWeight:900}}>{i+1}</div>
            <div><div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{t}</div><div style={{fontSize:8,color:'#64748b'}}>{d}</div></div>
          </div>
        ))}
      </div>
    </div>}
  </div>)
}

// ── MAIN COMPONENT ───────────────────────────────────────────
export default function ATSEvaluationSuitePage(){
  const{navigate}=useApp()
  const[mainTab,setMainTab]=useState('written')
  const[selCand,setSelCand]=useState(CANDIDATES[0])
  const[selVQ,setSelVQ]=useState(0)
  const[physRows,setPhysRows]=useState({})
  const[genState,setGenState]=useState({})
  const[letters,setLetters]=useState({})
  const[msg,setMsg]=useState('')

  const notify=m=>{setMsg(m);setTimeout(()=>setMsg(''),3000)}

  const wRes=calcW(selCand.id),vRes=calcV(selCand.id),pRes=calcP(selCand.id),oRes=calcOverall(selCand.id)
  const wAns=W_ANSWERS[selCand.id],vAns=V_ANSWERS[selCand.id],vCond=V_CONDUCT[selCand.id],wCond=W_CONDUCT[selCand.id]

  const genLetter=async(cand,type)=>{
    const key=cand.id+(type==='reject'?'_r':'')
    setGenState(s=>({...s,[key]:true}))
    const o2=calcOverall(cand.id)
    const prompt=type==='offer'
      ?`Write formal employment offer letter for ${cand.name}, role: ${cand.role}, salary: NPR 100,000/month, joining: 2081-09-15, composite: ${o2.composite}% (${o2.grade}), probation: 6 months Nepal Labour Act 2074 S.13. Include benefits, SSF per LA2074. Professional HTML.`
      :`Write professional, empathetic rejection for ${cand.name} who applied for ${cand.role}. 150 words. Thank them, encourage future applications. Subject line included.`
    const txt=await callAI(prompt)
    setLetters(l=>({...l,[key]:txt||`Dear ${cand.name},\n\n${type==='offer'?'We are pleased to offer you...':'Thank you for your application...'}`}))
    setGenState(s=>({...s,[key]:false}))
  }

  const TABS=[['written','Written Test'],['video','Video Interview'],['physical','Physical Interview'],['overall','Overall & Final'],['schedule','Auto Scheduler']]

  return(
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:'linear-gradient(135deg,#0f172a,#1e40af)',borderRadius:14,padding:'16px 22px',marginBottom:14,color:'#fff',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:900}}>ATS Evaluation Suite</h2>
          <p style={{margin:'3px 0 0',fontSize:10,opacity:.8}}>Written Q+A Sheet · Video Playback · Physical Eval · Overall Grade · Auto Scheduler</p>
        </div>
        {msg&&<span style={{fontSize:9,padding:'5px 14px',background:'rgba(255,255,255,.2)',borderRadius:8}}>{msg}</span>}
      </div>

      <div style={{background:'#fff',borderRadius:12,padding:'10px 14px',marginBottom:12,border:'1px solid #e2e8f0',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontSize:10,fontWeight:700,color:'#374151',flexShrink:0}}>Candidate:</span>
        {CANDIDATES.map(c=><CPill key={c.id} c={c} sel={selCand.id===c.id} onClick={()=>{setSelCand(c);setSelVQ(0)}}/>)}
      </div>

      <div style={{background:'#fff',borderRadius:'12px 12px 0 0',border:'1px solid #e2e8f0',borderBottom:'none',display:'flex',overflowX:'auto'}}>
        {TABS.map(([t,l])=>(
          <button key={t} onClick={()=>setMainTab(t)} style={{padding:'10px 18px',borderRadius:0,border:'none',borderBottom:`3px solid ${mainTab===t?'#1e40af':'transparent'}`,background:'none',color:mainTab===t?'#1e40af':'#64748b',fontSize:10,fontWeight:mainTab===t?800:400,cursor:'pointer',whiteSpace:'nowrap'}}>{l}</button>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:'0 0 14px 14px',padding:'20px',marginBottom:16}}>

        {/* ── WRITTEN TEST ── */}
        {mainTab==='written'&&(
          <div>
            <div style={{background:'#eff6ff',borderRadius:10,padding:'10px 14px',marginBottom:14,border:'1px solid #bfdbfe',display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>Senior React Developer Written Assessment</div>
                <div style={{fontSize:9,color:'#64748b',marginTop:2}}>2081-08-20 · 90 min · NepHR ATS Online Exam Portal · AI Proctoring</div>
              </div>
              {wRes&&<div style={{display:'flex',gap:8,alignItems:'center'}}>
                <div style={{textAlign:'center',padding:'6px 12px',background:'#fff',borderRadius:8,border:'1px solid #e2e8f0'}}>
                  <div style={{fontSize:20,fontWeight:900,color:wRes.passed?'#059669':'#ef4444'}}>{wRes.total}/100</div>
                  <div style={{fontSize:7,color:'#94a3b8'}}>Total Score</div>
                </div>
                <GBadge g={wRes.grade} lg/>
                <span style={{fontSize:9,fontWeight:800,padding:'4px 10px',borderRadius:8,background:wRes.passed?'#d1fae5':'#fee2e2',color:wRes.passed?'#065f46':'#dc2626'}}>{wRes.passed?'PASSED':'NOT PASSED'}</span>
              </div>}
            </div>

            {wCond&&<div style={{background:wCond.tab_switches>2?'#fff7ed':'#f0fdf4',borderRadius:10,padding:'10px 14px',marginBottom:14,border:`1px solid ${wCond.tab_switches>2?'#fed7aa':'#bbf7d0'}`}}>
              <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:7}}>Exam Conduct Evidence</div>
              {wCond.flags.length>0&&<div style={{fontSize:8,fontWeight:800,color:'#c2410c',padding:'4px 10px',background:'#ffedd5',borderRadius:6,marginBottom:7}}>PROCTORING FLAGS: {wCond.flags.join(' | ')}</div>}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:5}}>
                {[['Submitted At',wCond.submitted_at],['Time Taken',wCond.time_taken],['Face Detected',wCond.face_pct+'%'],['Tab Switches',wCond.tab_switches+(wCond.tab_switches>0?' ALERT':'')],['Device',wCond.device],['IP Address',wCond.ip]].map(([k,v])=>(
                  <div key={k} style={{background:'#fff',borderRadius:7,padding:'5px 8px',border:'1px solid rgba(0,0,0,.06)'}}>
                    <div style={{fontSize:7,color:'#94a3b8'}}>{k}</div>
                    <div style={{fontSize:8,fontWeight:700,color:'#0f172a'}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>}

            <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>Question and Answer Sheet — {selCand.name}</div>

            {W_QUESTIONS.map((q,qi)=>{
              const ans=wAns?.[q.id]
              const ts=typeStyle[q.type]||typeStyle.MCQ
              const isCorrect=q.type==='MCQ'?ans===q.correct:null
              const aiScore=q.type!=='MCQ'?(ans?.ai_score||0):null
              const scored=q.type==='MCQ'?(isCorrect?q.marks:0):aiScore
              return(
                <div key={q.id} style={{background:'#f8fafc',borderRadius:12,marginBottom:12,border:`1.5px solid ${q.type==='MCQ'?(isCorrect?'#bbf7d0':'#fecaca'):aiScore>=q.marks*.7?'#bfdbfe':'#fde68a'}`,overflow:'hidden'}}>
                  {/* Question header */}
                  <div style={{background:ts.bg,padding:'10px 14px',borderBottom:'1px solid rgba(0,0,0,.06)',display:'flex',gap:10,alignItems:'flex-start'}}>
                    <div style={{width:26,height:26,borderRadius:'50%',background:ts.c,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,flexShrink:0}}>{qi+1}</div>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',gap:7,alignItems:'center',marginBottom:5,flexWrap:'wrap'}}>
                        <span style={{fontSize:8,fontWeight:800,padding:'2px 7px',borderRadius:5,background:'rgba(255,255,255,.6)',color:ts.c}}>{q.type}</span>
                        <span style={{fontSize:8,color:'#64748b'}}>{q.topic}</span>
                        <span style={{fontSize:8,color:'#94a3b8'}}>{q.marks} marks</span>
                        {q.wordLimit&&<span style={{fontSize:7,color:'#94a3b8'}}>Word limit: {q.wordLimit}</span>}
                      </div>
                      <div style={{fontSize:10,fontWeight:700,color:'#0f172a',lineHeight:1.55,whiteSpace:'pre-wrap'}}>{q.q}</div>
                    </div>
                    <div style={{textAlign:'center',padding:'5px 10px',background:'#fff',borderRadius:8,flexShrink:0,border:'1px solid #f1f5f9'}}>
                      <div style={{fontSize:17,fontWeight:900,color:scored>=q.marks*.75?'#059669':scored>=q.marks*.5?'#1e40af':'#ef4444'}}>{scored}/{q.marks}</div>
                      <div style={{fontSize:7,color:'#94a3b8'}}>marks</div>
                    </div>
                  </div>
                  {/* MCQ options */}
                  {q.type==='MCQ'&&q.opts&&(
                    <div style={{padding:'10px 14px',borderBottom:'1px solid rgba(0,0,0,.04)'}}>
                      <div style={{fontSize:8,fontWeight:700,color:'#94a3b8',marginBottom:5,textTransform:'uppercase',letterSpacing:'.06em'}}>Options</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                        {q.opts.map((opt,oi)=>{
                          const isCandAns=ans===oi,isRight=oi===q.correct
                          return<div key={oi} style={{padding:'5px 9px',borderRadius:7,background:isRight?'#d1fae5':isCandAns&&!isRight?'#fee2e2':'#fff',border:`1.5px solid ${isRight?'#10b981':isCandAns&&!isRight?'#ef4444':'#e2e8f0'}`,fontSize:9,fontWeight:(isRight||isCandAns)?700:400,color:isRight?'#065f46':isCandAns&&!isRight?'#dc2626':'#374151'}}>
                            <span style={{fontWeight:900,marginRight:5}}>{String.fromCharCode(65+oi)}.</span>{opt}
                            {isRight&&<span style={{marginLeft:5,fontSize:8}}> Correct Answer</span>}
                            {isCandAns&&!isRight&&<span style={{marginLeft:5,fontSize:8}}> Candidate answered</span>}
                            {isCandAns&&isRight&&<span style={{marginLeft:5,fontSize:8}}> Correct</span>}
                          </div>
                        })}
                      </div>
                    </div>
                  )}
                  {/* Candidate answer section */}
                  <div style={{padding:'10px 14px'}}>
                    <div style={{fontSize:8,fontWeight:700,color:'#94a3b8',marginBottom:5,textTransform:'uppercase',letterSpacing:'.06em'}}>
                      {q.type==='MCQ'?'Candidate Answer':'Candidate Submission'}
                    </div>
                    {q.type==='MCQ'?(
                      <div style={{fontSize:10,fontWeight:700,color:isCorrect?'#059669':'#dc2626'}}>
                        {ans!==undefined?`${String.fromCharCode(65+ans)}. ${q.opts[ans]} ${isCorrect?'CORRECT':'INCORRECT — Correct: '+q.opts[q.correct]}`:'Not answered'}
                      </div>
                    ):q.type==='CODING'?(
                      <div>
                        {q.testCases&&<div style={{fontSize:8,color:'#64748b',fontFamily:'monospace',padding:'5px 8px',background:'#f0fdf4',borderRadius:5,marginBottom:7}}>
                          {q.testCases.map((tc,i)=><div key={i}>Test {i+1}: {tc.inp} Expected: {tc.out}</div>)}
                        </div>}
                        <pre style={{background:'#1e293b',color:'#e2e8f0',fontFamily:'JetBrains Mono,Consolas,monospace',fontSize:9,padding:'10px 12px',borderRadius:8,overflowX:'auto',lineHeight:1.65,margin:'0 0 8px',whiteSpace:'pre-wrap'}}>{ans?.code||'No code submitted'}</pre>
                        {ans?.ai_feedback&&<div style={{fontSize:9,color:'#1e40af',padding:'7px 10px',background:'#eff6ff',borderRadius:7,border:'1px solid #bfdbfe',lineHeight:1.6}}>AI Feedback: {ans.ai_feedback}</div>}
                      </div>
                    ):(
                      <div>
                        <div style={{fontSize:10,color:'#334155',lineHeight:1.8,padding:'9px',background:'#fff',borderRadius:7,border:'1px solid #e2e8f0',marginBottom:7,minHeight:55}}>{ans?.text||'No response submitted'}</div>
                        {q.rubric&&<div style={{fontSize:8,color:'#94a3b8',marginBottom:5}}>Rubric: {q.rubric}</div>}
                        {ans?.ai_feedback&&<div style={{fontSize:9,color:'#1e40af',padding:'7px 10px',background:'#eff6ff',borderRadius:7,border:'1px solid #bfdbfe',lineHeight:1.6}}>AI Feedback: {ans.ai_feedback}</div>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {wRes&&<div style={{background:'#0f172a',borderRadius:12,padding:'14px 18px',color:'#fff',display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
              {[['MCQ (5x5)',wRes.mcq,25,'#3b82f6'],['Coding (2 Qs)',wRes.coding,40,'#8b5cf6'],['Essay (2 Qs)',wRes.essay,35,'#10b981'],['Total',wRes.total,100,'#f59e0b']].map(([l,v,m,c])=>(
                <div key={l} style={{textAlign:'center'}}>
                  <div style={{fontSize:l==='Total'?26:18,fontWeight:900,color:c}}>{v}<span style={{fontSize:9,color:'rgba(255,255,255,.3)'}}>/{m}</span></div>
                  <div style={{fontSize:7,color:'rgba(255,255,255,.4)'}}>{l}</div>
                </div>
              ))}
              <div style={{flex:1}}/>
              <GBadge g={wRes.grade} lg/>
              <span style={{fontSize:10,fontWeight:800,padding:'5px 12px',borderRadius:8,background:wRes.passed?'#10b981':'#ef4444',color:'#fff'}}>{wRes.passed?'PASSED':'NOT PASSED'}</span>
            </div>}
          </div>
        )}

        {/* ── VIDEO INTERVIEW ── */}
        {mainTab==='video'&&(
          <div>
            <div style={{background:'#ecfeff',borderRadius:10,padding:'10px 14px',marginBottom:14,border:'1px solid #a5f3fc',display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>Senior React Developer — AI Video Interview</div>
                <div style={{fontSize:9,color:'#64748b',marginTop:2}}>AI Interviewer · 5 questions · Async candidate-paced · Auto-recorded</div>
              </div>
              {vRes&&<div style={{display:'flex',gap:8,alignItems:'center'}}>
                <div style={{textAlign:'center',padding:'6px 12px',background:'#fff',borderRadius:8,border:'1px solid #e2e8f0'}}>
                  <div style={{fontSize:20,fontWeight:900,color:vRes.passed?'#059669':'#ef4444'}}>{vRes.avg}%</div>
                  <div style={{fontSize:7,color:'#94a3b8'}}>Avg Score</div>
                </div>
                <GBadge g={vRes.grade} lg/>
                <span style={{fontSize:9,fontWeight:800,padding:'4px 10px',borderRadius:8,background:vRes.passed?'#d1fae5':'#fee2e2',color:vRes.passed?'#065f46':'#dc2626'}}>{vRes.passed?'PASSED':'NOT PASSED'}</span>
              </div>}
            </div>

            {vCond&&<div style={{background:vCond.audio==='Poor'||vCond.eye_warnings>4?'#fff7ed':'#f0fdf4',borderRadius:10,padding:'10px 14px',marginBottom:14,border:`1px solid ${vCond.audio==='Poor'||vCond.eye_warnings>4?'#fed7aa':'#bbf7d0'}`}}>
              <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:6}}>Video Interview Conduct Evidence</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:5}}>
                {[['Completed',vCond.completed],['Duration',vCond.duration],['Face Detected',vCond.face_pct+'%'],['Eye Warnings',vCond.eye_warnings+(vCond.eye_warnings>3?' ALERT':'')],['Audio',vCond.audio],['Net Drops',vCond.net_drops]].map(([k,v])=>(
                  <div key={k} style={{background:'#fff',borderRadius:7,padding:'5px 8px',border:'1px solid rgba(0,0,0,.06)'}}>
                    <div style={{fontSize:7,color:'#94a3b8'}}>{k}</div>
                    <div style={{fontSize:8,fontWeight:700,color:'#0f172a'}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>}

            {/* Q navigator */}
            <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
              {V_QUESTIONS.map((q,i)=>{
                const ans=vAns?.[i],cs=catStyle[q.category]||catStyle.General
                return<button key={q.id} onClick={()=>setSelVQ(i)} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:9,border:`2px solid ${selVQ===i?cs.c:'#e2e8f0'}`,background:selVQ===i?cs.bg:'#fff',color:selVQ===i?cs.c:'#64748b',fontSize:9,fontWeight:selVQ===i?800:400,cursor:'pointer'}}>
                  <span style={{width:18,height:18,borderRadius:'50%',background:selVQ===i?cs.c:'#f1f5f9',color:selVQ===i?'#fff':'#64748b',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900}}>{i+1}</span>
                  {q.category}
                  {ans&&<GBadge g={ans.grade}/>}
                </button>
              })}
            </div>

            {vAns&&(()=>{
              const q=V_QUESTIONS[selVQ],ans=vAns[selVQ],cs=catStyle[q.category]||catStyle.General
              return(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                  <div>
                    {/* AI Question */}
                    <div style={{background:cs.bg,borderRadius:12,padding:'12px',marginBottom:12,border:`1px solid ${cs.c}30`}}>
                      <div style={{display:'flex',gap:7,alignItems:'center',marginBottom:7}}>
                        <span style={{width:22,height:22,borderRadius:'50%',background:cs.c,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900}}>{selVQ+1}</span>
                        <span style={{fontSize:8,fontWeight:800,padding:'2px 7px',borderRadius:5,background:'rgba(255,255,255,.6)',color:cs.c}}>{q.category}</span>
                        <span style={{fontSize:8,color:'#94a3b8'}}>Max {Math.floor(q.duration/60)}:{String(q.duration%60).padStart(2,'0')} min</span>
                      </div>
                      <div style={{fontSize:11,fontWeight:700,color:'#0f172a',lineHeight:1.6,marginBottom:7}}>{q.q}</div>
                      <div style={{fontSize:8,color:'#94a3b8'}}>Expected keywords: {q.keywords.join(' · ')}</div>
                    </div>
                    {/* Video player */}
                    <VideoPlayer candidate={selCand} qIdx={selVQ} answer={ans} question={q}/>
                  </div>
                  <div>
                    <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #e2e8f0',marginBottom:10}}>
                      <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:10}}>AI Analysis — Q{selVQ+1}</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:12}}>
                        {[['Overall',ans.overall,'#059669'],['Confidence',ans.confidence,'#3b82f6'],['Clarity',ans.clarity,'#8b5cf6'],['Grade','—','—']].map(([l,v,c],i)=>(
                          <div key={l} style={{textAlign:'center',padding:'9px',background:'#f8fafc',borderRadius:8,border:'1px solid #f1f5f9'}}>
                            {i===3?<GBadge g={ans.grade} lg/>:<div style={{fontSize:20,fontWeight:900,color:c}}>{v}%</div>}
                            <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <SBar label="Relevance to Question" val={ans.overall} color={cs.c}/>
                      <SBar label="Confidence Level" val={ans.confidence} color="#3b82f6"/>
                      <SBar label="Clarity of Expression" val={ans.clarity} color="#8b5cf6"/>
                      <div style={{marginTop:9}}>
                        <div style={{fontSize:8,fontWeight:700,color:'#64748b',marginBottom:5}}>Keyword Detection ({ans.kw_hit?.length||0}/{q.keywords.length} found)</div>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                          {q.keywords.map(kw=>{const hit=ans.kw_hit?.includes(kw);return<span key={kw} style={{fontSize:8,padding:'2px 7px',borderRadius:5,background:hit?'#d1fae5':'#f1f5f9',color:hit?'#065f46':'#94a3b8',border:`1px solid ${hit?'#bbf7d0':'#e2e8f0'}`,fontWeight:hit?700:400}}>{hit?'':''}  {kw}</span>})}
                        </div>
                      </div>
                      <div style={{marginTop:10,padding:'8px 10px',background:'#eff6ff',borderRadius:7,border:'1px solid #bfdbfe',fontSize:9,color:'#1e40af',lineHeight:1.6}}>
                        AI Notes: {ans.ai_notes}
                      </div>
                    </div>
                    <div style={{background:'#f8fafc',borderRadius:12,padding:'12px',border:'1px solid #e2e8f0'}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#0f172a',marginBottom:7}}>Full Auto-Transcript</div>
                      <div style={{fontSize:10,color:'#334155',lineHeight:1.8,fontStyle:'italic',padding:'9px',background:'#fff',borderRadius:7,border:'1px solid #f1f5f9'}}>"{ans.transcript}"</div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* All-Q summary table */}
            {vAns&&<div style={{marginTop:14}}>
              <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:8}}>All Questions Summary</div>
              <div style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden'}}>
                <div style={{background:'#1e3a5f',color:'#fff',display:'grid',gridTemplateColumns:'40px 1fr 80px 80px 80px 70px 70px',padding:'8px 12px',fontSize:9,fontWeight:700,gap:6}}>
                  {['Q','Question (click to view)','Category','Overall','Confidence','Keywords','Grade'].map(h=><div key={h} style={{textAlign:h!=='Question (click to view)'?'center':'left'}}>{h}</div>)}
                </div>
                {V_QUESTIONS.map((q,i)=>{
                  const ans=vAns[i],cs=catStyle[q.category]||catStyle.General
                  return(
                    <div key={q.id} onClick={()=>setSelVQ(i)} style={{display:'grid',gridTemplateColumns:'40px 1fr 80px 80px 80px 70px 70px',padding:'9px 12px',borderBottom:'1px solid #f8fafc',background:selVQ===i?'#eff6ff':'#fff',cursor:'pointer',gap:6,alignItems:'center'}}>
                      <div style={{textAlign:'center',width:22,height:22,borderRadius:'50%',background:cs.bg,border:`2px solid ${cs.c}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:cs.c,margin:'0 auto'}}>{i+1}</div>
                      <div style={{fontSize:9,color:'#334155',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{q.q.slice(0,52)}...</div>
                      <div style={{textAlign:'center',fontSize:8,padding:'2px 5px',borderRadius:5,background:cs.bg,color:cs.c,fontWeight:700}}>{q.category}</div>
                      <div style={{textAlign:'center',fontSize:13,fontWeight:900,color:ans.overall>=80?'#059669':ans.overall>=60?'#1e40af':'#ef4444'}}>{ans.overall}%</div>
                      <div style={{textAlign:'center',fontSize:12,fontWeight:700,color:'#3b82f6'}}>{ans.confidence}%</div>
                      <div style={{textAlign:'center',fontSize:11,fontWeight:700,color:'#10b981'}}>{ans.kw_hit?.length||0}/{q.keywords.length}</div>
                      <div style={{textAlign:'center'}}><GBadge g={ans.grade}/></div>
                    </div>
                  )
                })}
              </div>
            </div>}
          </div>
        )}

        {/* ── PHYSICAL INTERVIEW ── */}
        {mainTab==='physical'&&(
          <div>
            <div style={{background:'#f0fdf4',borderRadius:10,padding:'10px 14px',marginBottom:14,border:'1px solid #bbf7d0'}}>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>Physical Interview Evaluation Sheet</div>
              <div style={{fontSize:9,color:'#64748b',marginTop:2}}>7 competencies · weighted scoring · {PANEL.length} panel members · committee decision</div>
            </div>
            {P_SCORES[selCand.id]?(
              <div>
                <div style={{fontSize:9,color:'#64748b',marginBottom:12}}>Conducted: {P_SCORES[selCand.id].conducted} · {P_SCORES[selCand.id].format}</div>
                <div style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:14}}>
                  <div style={{background:'#1e3a5f',color:'#fff',display:'grid',gridTemplateColumns:'190px 1fr 1fr 1fr 70px 60px',padding:'9px 12px',fontSize:9,fontWeight:700,gap:6}}>
                    <div>Competency (Weight)</div>
                    {PANEL.map(p=><div key={p.id} style={{textAlign:'center'}}>{p.avatar} {p.name.split(' ')[0]}</div>)}
                    <div style={{textAlign:'center'}}>Avg</div><div style={{textAlign:'center'}}>Wtd</div>
                  </div>
                  {(()=>{
                    const sc=P_SCORES[selCand.id]
                    return COMPETENCIES.map((comp,ci)=>{
                      const vals=[sc.i1,sc.i2,sc.i3].filter(Boolean).map(p=>p[comp.id]||0)
                      const avg=Math.round(vals.reduce((s,v)=>s+v,0)/vals.length)
                      const wtd=(avg*comp.weight/100).toFixed(1)
                      return(
                        <div key={comp.id} style={{display:'grid',gridTemplateColumns:'190px 1fr 1fr 1fr 70px 60px',padding:'8px 12px',borderBottom:'1px solid #f1f5f9',background:ci%2===0?'#fff':'#f8fafc',gap:6,alignItems:'center'}}>
                          <div><div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{comp.label}</div><div style={{fontSize:7,color:'#94a3b8'}}>{comp.weight}% · {comp.desc}</div></div>
                          {[sc.i1,sc.i2,sc.i3].map((iv,ii)=>(
                            <div key={ii} style={{textAlign:'center',fontSize:15,fontWeight:900,color:(iv?.[comp.id]||0)>=80?'#059669':(iv?.[comp.id]||0)>=60?'#1e40af':'#f59e0b'}}>{iv?.[comp.id]||'—'}</div>
                          ))}
                          <div style={{textAlign:'center',fontSize:13,fontWeight:900,color:'#1e40af'}}>{avg}</div>
                          <div style={{textAlign:'center',fontSize:12,fontWeight:800,color:'#059669'}}>{wtd}</div>
                        </div>
                      )
                    })
                  })()}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
                  {PANEL.map(iv=>{
                    const sc2=P_SCORES[selCand.id][iv.id];if(!sc2)return null
                    return(
                      <div key={iv.id} style={{background:'#f8fafc',borderRadius:10,padding:'11px',border:'1px solid #e2e8f0'}}>
                        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:7}}>
                          <div style={{width:26,height:26,borderRadius:'50%',background:'#eff6ff',border:'2px solid #bfdbfe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'#1e40af'}}>{iv.avatar}</div>
                          <div style={{flex:1}}><div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{iv.name}</div><div style={{fontSize:7,color:'#94a3b8'}}>{iv.title}</div></div>
                          <span style={{fontSize:8,fontWeight:800,padding:'2px 7px',borderRadius:6,background:sc2.rec.includes('Strong')?'#d1fae5':sc2.rec==='Hire'?'#dbeafe':sc2.rec==='Hold'?'#fef9c3':'#fee2e2',color:sc2.rec.includes('Strong')?'#065f46':sc2.rec==='Hire'?'#1e40af':sc2.rec==='Hold'?'#92400e':'#dc2626'}}>{sc2.rec}</span>
                        </div>
                        <div style={{fontSize:8,color:'#475569',lineHeight:1.5,fontStyle:'italic'}}>"{sc2.notes}"</div>
                      </div>
                    )
                  })}
                </div>
                {pRes&&<div style={{background:'#0f172a',borderRadius:12,padding:'14px 18px',color:'#fff',display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
                  <div><div style={{fontSize:9,color:'rgba(255,255,255,.4)'}}>Weighted Panel Score</div><div style={{fontSize:28,fontWeight:900,color:pRes.passed?'#86efac':'#fca5a5'}}>{pRes.pct}/100</div></div>
                  <GBadge g={pRes.grade} lg/>
                  <div style={{flex:1}}/>
                  <div style={{textAlign:'center',padding:'10px 18px',background:'rgba(255,255,255,.08)',borderRadius:9}}>
                    <div style={{fontSize:9,color:'rgba(255,255,255,.4)',marginBottom:3}}>COMMITTEE DECISION</div>
                    <div style={{fontSize:18,fontWeight:900,color:pRes.decision.includes('Hire')?'#86efac':'#fca5a5'}}>{pRes.decision.includes('Strong')?'Strong Hire':pRes.decision==='Hire'?'Hire':pRes.decision==='Hold'?'Hold':'No Hire'}</div>
                  </div>
                </div>}
              </div>
            ):(
              <div>
                <div style={{background:'#fffbeb',borderRadius:9,padding:'9px 12px',marginBottom:12,border:'1px solid #fde68a',fontSize:10,color:'#92400e'}}>Physical interview not yet conducted for {selCand.name}. Fill in scores below after the interview.</div>
                <div style={{background:'#f8fafc',borderRadius:12,border:'2px dashed #e2e8f0',overflow:'hidden'}}>
                  <div style={{background:'#1e3a5f',color:'#fff',padding:'9px 14px',fontSize:10,fontWeight:800}}>Evaluation Sheet — {selCand.name} · {selCand.role}</div>
                  {COMPETENCIES.map((comp,i)=>(
                    <div key={comp.id} style={{display:'grid',gridTemplateColumns:'160px repeat(3,1fr)',padding:'9px 12px',borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#f8fafc',gap:8,alignItems:'center'}}>
                      <div><div style={{fontSize:9,fontWeight:700}}>{comp.label} ({comp.weight}%)</div><div style={{fontSize:7,color:'#94a3b8'}}>{comp.desc}</div></div>
                      {PANEL.map(iv=>(
                        <div key={iv.id} style={{textAlign:'center'}}>
                          <div style={{fontSize:7,color:'#64748b',fontWeight:600,marginBottom:3}}>{iv.name.split(' ')[0]}</div>
                          <input type="number" min="0" max="100" placeholder="0-100"
                            onChange={e=>setPhysRows(prev=>({...prev,[selCand.id]:{...prev[selCand.id],[iv.id]:{...(prev[selCand.id]?.[iv.id]||{}),[comp.id]:+e.target.value}}}))}
                            style={{width:'75%',padding:'5px',textAlign:'center',borderRadius:6,border:'1px solid #e2e8f0',fontSize:11,outline:'none'}}/>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div style={{padding:'10px 12px',background:'#fff',display:'flex',gap:8}}>
                    <button onClick={()=>notify('Evaluation submitted!')} style={{flex:1,padding:'9px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#1e3a5f,#059669)',color:'#fff',fontSize:10,fontWeight:800,cursor:'pointer'}}>Submit All Scores</button>
                    <button onClick={()=>notify('Sheet emailed to panel!')} style={{flex:1,padding:'9px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:10,cursor:'pointer'}}>Email to Panel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── OVERALL & FINAL ── */}
        {mainTab==='overall'&&(
          <div>
            <div style={{fontSize:11,fontWeight:900,color:'#0f172a',marginBottom:4}}>Overall Evaluation — All Candidates</div>
            <div style={{fontSize:9,color:'#64748b',marginBottom:14}}>CV 20% + Written Exam 30% + Video Interview 25% + Physical 25% = Composite Score</div>
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:16}}>
              <div style={{background:'#1e3a5f',color:'#fff',display:'grid',gridTemplateColumns:'150px 65px 80px 70px 80px 90px 60px 100px 100px',padding:'9px 12px',fontSize:9,fontWeight:700,gap:5}}>
                {['Candidate','CV','Written','Video','Physical','Composite','Grade','Decision','Action'].map(h=><div key={h} style={{textAlign:h!=='Candidate'?'center':'left'}}>{h}</div>)}
              </div>
              {CANDIDATES.map(cand=>{
                const o2=calcOverall(cand.id),isSel=selCand.id===cand.id
                const recC=o2.recommend==='Select'?'#059669':o2.recommend==='Consider'?'#92400e':'#dc2626'
                const recBg=o2.recommend==='Select'?'#d1fae5':o2.recommend==='Consider'?'#fef9c3':'#fee2e2'
                return(
                  <div key={cand.id} onClick={()=>setSelCand(cand)} style={{display:'grid',gridTemplateColumns:'150px 65px 80px 70px 80px 90px 60px 100px 100px',padding:'9px 12px',borderBottom:'1px solid #f1f5f9',background:isSel?'#eff6ff':'#fff',cursor:'pointer',gap:5,alignItems:'center'}}>
                    <div><div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{cand.name}</div><div style={{fontSize:7,color:'#94a3b8'}}>{cand.source}</div></div>
                    {[{v:o2.cv,c:'#64748b'},{v:o2.written,c:'#7c3aed'},{v:o2.video,c:'#0891b2'},{v:o2.physical,c:'#059669'}].map((s,i)=>(
                      <div key={i} style={{textAlign:'center',fontSize:12,fontWeight:900,color:s.v!=null?(s.v>=80?s.c:s.v>=60?'#f59e0b':'#ef4444'):'#94a3b8'}}>{s.v!=null?s.v+'%':'—'}</div>
                    ))}
                    <div style={{textAlign:'center',fontSize:18,fontWeight:900,color:o2.composite>=80?'#059669':o2.composite>=65?'#1e40af':'#ef4444'}}>{o2.composite}%</div>
                    <div style={{textAlign:'center'}}><GBadge g={o2.grade}/></div>
                    <div style={{textAlign:'center',fontSize:8,fontWeight:800,padding:'2px 5px',borderRadius:6,background:recBg,color:recC}}>{o2.recommend}</div>
                    <div style={{textAlign:'center'}}>
                      {o2.recommend==='Select'
                        ?<button onClick={e=>{e.stopPropagation();genLetter(cand,'offer')}} disabled={!!genState[cand.id]} style={{padding:'4px 7px',borderRadius:6,border:'none',background:genState[cand.id]?'#e2e8f0':'#059669',color:genState[cand.id]?'#94a3b8':'#fff',fontSize:8,cursor:genState[cand.id]?'default':'pointer',width:'100%'}}>{genState[cand.id]?'...':'Offer Letter'}</button>
                        :<button onClick={e=>{e.stopPropagation();genLetter(cand,'reject')}} disabled={!!genState[cand.id+'_r']} style={{padding:'4px 7px',borderRadius:6,border:'none',background:genState[cand.id+'_r']?'#e2e8f0':'#ef4444',color:genState[cand.id+'_r']?'#94a3b8':'#fff',fontSize:8,cursor:genState[cand.id+'_r']?'default':'pointer',width:'100%'}}>{genState[cand.id+'_r']?'...':'Rejection'}</button>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
              <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #e2e8f0'}}>
                <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:10}}>Score Breakdown — {selCand.name}</div>
                <SBar label="CV Score (20%)" val={oRes.cv} color="#64748b" weight={20}/>
                <SBar label="Written Exam (30%)" val={oRes.written||0} color="#7c3aed" weight={30}/>
                <SBar label="Video Interview (25%)" val={oRes.video||0} color="#0891b2" weight={25}/>
                <SBar label="Physical Interview (25%)" val={oRes.physical||0} color="#059669" weight={25}/>
                <div style={{borderTop:'2px solid #e2e8f0',paddingTop:12,marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div><div style={{fontSize:9,color:'#64748b'}}>Composite Score</div><div style={{fontSize:28,fontWeight:900,color:oRes.composite>=75?'#059669':oRes.composite>=60?'#1e40af':'#ef4444'}}>{oRes.composite}%</div></div>
                  <GBadge g={oRes.grade} lg/>
                </div>
                <div style={{marginTop:10,padding:'8px 12px',textAlign:'center',borderRadius:8,background:oRes.recommend==='Select'?'#f0fdf4':oRes.recommend==='Consider'?'#fffbeb':'#fef2f2',border:`1px solid ${oRes.recommend==='Select'?'#bbf7d0':oRes.recommend==='Consider'?'#fde68a':'#fecaca'}`}}>
                  <div style={{fontSize:15,fontWeight:900,color:oRes.recommend==='Select'?'#059669':oRes.recommend==='Consider'?'#92400e':'#dc2626'}}>{oRes.recommend==='Select'?'SELECT':oRes.recommend==='Consider'?'CONSIDER':'REJECT'}</div>
                </div>
              </div>
              <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'1px solid #e2e8f0'}}>
                <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:10}}>Stage Grades</div>
                {[{s:'CV Screening',v:oRes.cv,g:oRes.cv>=85?'A':oRes.cv>=75?'B+':'B',c:'#64748b'},{s:'Written Exam',v:oRes.written,g:oRes.w?.grade,c:'#7c3aed'},{s:'Video Interview',v:oRes.video,g:oRes.v?.grade,c:'#0891b2'},{s:'Physical',v:oRes.physical,g:oRes.p?.grade,c:'#059669'}].map((st,i)=>(
                  <div key={i} style={{display:'flex',gap:9,alignItems:'center',padding:'8px 10px',background:'#f8fafc',borderRadius:8,marginBottom:6}}>
                    <div style={{width:4,height:36,borderRadius:2,background:st.c,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{st.s}</div>
                      <div style={{fontSize:8,color:'#94a3b8'}}>{st.v!=null?st.v+'%':'Not completed'}</div>
                    </div>
                    <GBadge g={st.g}/>
                  </div>
                ))}
              </div>
            </div>
            {(letters[selCand.id]||letters[selCand.id+'_r'])&&(
              <div style={{background:'#fff',borderRadius:12,padding:'14px',border:'2px solid #e2e8f0',marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:9}}>{letters[selCand.id]?'AI Offer Letter':'AI Rejection Letter'} — {selCand.name}</div>
                <div style={{background:'#f8fafc',borderRadius:8,padding:'12px',fontSize:10,color:'#334155',lineHeight:1.9,maxHeight:240,overflowY:'auto',border:'1px solid #e2e8f0',whiteSpace:'pre-wrap',fontFamily:'Georgia,serif'}}>{letters[selCand.id]||letters[selCand.id+'_r']}</div>
                <div style={{display:'flex',gap:7,marginTop:9}}>
                  {letters[selCand.id]&&<><button onClick={()=>notify('Offer sent via Email + WhatsApp!')} style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:'#059669',color:'#fff',fontSize:9,fontWeight:800,cursor:'pointer'}}>Send Offer</button>
                  <button onClick={()=>notify('DocuSign envelope created!')} style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:'#1e40af',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>eSignature</button></>}
                  {letters[selCand.id+'_r']&&<button onClick={()=>notify(`Rejection sent to ${selCand.name}!`)} style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:'#ef4444',color:'#fff',fontSize:9,fontWeight:800,cursor:'pointer'}}>Send Rejection</button>}
                  <button onClick={()=>notify('Copied!')} style={{padding:'8px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:9,cursor:'pointer'}}>Copy</button>
                </div>
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:9}}>
              {oRes.recommend==='Select'
                ?<button onClick={()=>genLetter(selCand,'offer')} disabled={!!genState[selCand.id]} style={{padding:'11px',borderRadius:10,border:'none',background:genState[selCand.id]?'#e2e8f0':'linear-gradient(135deg,#059669,#1e40af)',color:genState[selCand.id]?'#94a3b8':'#fff',fontSize:10,fontWeight:900,cursor:genState[selCand.id]?'default':'pointer'}}>{genState[selCand.id]?'Generating...':'Generate Offer Letter'}</button>
                :<button onClick={()=>genLetter(selCand,'reject')} disabled={!!genState[selCand.id+'_r']} style={{padding:'11px',borderRadius:10,border:'none',background:genState[selCand.id+'_r']?'#e2e8f0':'#ef4444',color:genState[selCand.id+'_r']?'#94a3b8':'#fff',fontSize:10,fontWeight:900,cursor:genState[selCand.id+'_r']?'default':'pointer'}}>{genState[selCand.id+'_r']?'Generating...':'Generate Rejection'}</button>
              }
              <button onClick={()=>notify('Full evaluation PDF exported!')} style={{padding:'11px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:10,fontWeight:700,cursor:'pointer'}}>Export PDF Report</button>
              <button onClick={()=>notify(`All ${CANDIDATES.length} decisions finalized! HR notified.`)} style={{padding:'11px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#0f172a,#1e3a5f)',color:'#fff',fontSize:10,fontWeight:900,cursor:'pointer'}}>Finalize All Decisions</button>
            </div>
          </div>
        )}

        {/* ── AUTO SCHEDULER ── */}
        {mainTab==='schedule'&&<Scheduler notify={notify}/>}

      </div>
    </div>
  )
}
