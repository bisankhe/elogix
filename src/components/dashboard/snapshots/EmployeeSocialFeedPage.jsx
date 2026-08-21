// FILE: EmployeeSocialFeedPage.jsx
// (Employee Experience & Culture > Employee Engagement > Employee Social Feed)
// Full Employee Hub - 9 tabs: Home Feed / Communities / Recognition /
// Events / Learning / Internal Jobs / Ideas / AI Assistant / Calendar
// Facebook-style social feed: like, comment, react, bookmark, share.
// Gamification: points, badges, leaderboard, streaks.
// HR moderation, privacy controls, company-only content.
import { useState } from 'react'

const A = '#7c3aed'
const TABS = [
  { key:'feed',       label:'🏠 Home Feed' },
  { key:'communities',label:'💬 Communities' },
  { key:'recognition',label:'👏 Recognition' },
  { key:'events',     label:'🎉 Events' },
  { key:'learning',   label:'📚 Learning' },
  { key:'jobs',       label:'💼 Internal Jobs' },
  { key:'ideas',      label:'💡 Ideas' },
  { key:'ai',         label:'🤖 AI Assistant' },
  { key:'calendar',   label:'📅 Calendar' },
]
const REACTIONS = [
  { key:'like',            emoji:'👍', label:'Like' },
  { key:'celebrate',       emoji:'🎉', label:'Celebrate' },
  { key:'congratulations', emoji:'🏆', label:'Congrats' },
  { key:'thanks',          emoji:'🙏', label:'Thanks' },
  { key:'wow',             emoji:'😮', label:'Wow' },
]
const POST_ICON = {
  birthday:'🎂', work_anniversary:'🏆', kudos:'👏', award:'🥇',
  promotion:'🎊', announcement:'📢', team_photo:'📸', company_video:'🎥',
  new_training:'📚', internal_job:'💼', idea:'💡', csr_activity:'❤️',
  event:'🎉', wellness_challenge:'💪', policy_update:'📋',
const DEMO_POSTS = [
  { id:'p1', post_type:'birthday', subject_name:'Hari Thapa', title:'🎂 Happy Birthday, Hari Thapa!', body:'Today is Hari\'s birthday. Send them a celebration message!', reaction_count:14, comment_count:5, created_at:'2 hours ago', i_reacted:false },
  { id:'p2', post_type:'kudos', author_name:'Gita Maharjan', subject_name:'Sunil Magar', title:'👏 Kudos to Sunil Magar!', body:'"Sunil went above and beyond helping our client presentation. True team player!" - Gita Maharjan 💛', reaction_count:28, comment_count:7, created_at:'4 hours ago', i_reacted:true, my_reaction:'celebrate' },
  { id:'p3', post_type:'promotion', subject_name:'Maya Pradhan', title:'🎊 Congratulations, Maya Pradhan - Promoted to Senior Engineer!', body:'We are thrilled to announce Maya\'s well-deserved promotion. Maya has been instrumental in the platform migration project. Congratulations!', reaction_count:47, comment_count:12, created_at:'Yesterday', i_reacted:false },
  { id:'p4', post_type:'announcement', title:'📢 Office Closed: Dashain Holidays', body:'The office will be closed from Ashwin 15 to Ashwin 18 for Dashain. Wishing everyone a wonderful festival season! 🎉', reaction_count:63, comment_count:3, created_at:'2 days ago', i_reacted:true, my_reaction:'celebrate' },
  { id:'p5', post_type:'new_training', title:'📚 New Course: Leadership Essentials for Managers', body:'HR Learning & Development has published a new mandatory course for all team leads. 4 hours . CPD accredited . Certificate on completion.', link_url:'#', link_label:'Start Course', reaction_count:19, comment_count:2, created_at:'3 days ago', i_reacted:false },
  { id:'p6', post_type:'work_anniversary', subject_name:'Bikash Rai', title:'🏆 5 Years with Us - Bikash Rai!', body:'Today marks Bikash\'s 5th work anniversary. From junior analyst to team lead - what a journey! Thank you, Bikash.', reaction_count:52, comment_count:9, created_at:'3 days ago', i_reacted:false },
  { id:'p7', post_type:'csr_activity', title:'❤️ CSR: Volunteering at Pashupatinath School', body:'35 employees spent last Saturday teaching digital skills to school children. This is what our culture is about. Thank you to every volunteer!', media_type:'image', reaction_count:71, comment_count:14, created_at:'1 week ago', i_reacted:true, my_reaction:'heart' },
]
const DEMO_BADGES = [
  { icon_emoji:'📚', name:'Knowledge Seeker', description:'Completed 5 training modules', category:'learning' },
  { icon_emoji:'👏', name:'Recognition Giver', description:'Gave your first Kudos', category:'recognition' },
  { icon_emoji:'✅', name:'30-Day Attendance', description:'Perfect attendance for 30 days', category:'attendance' },
  { icon_emoji:'💡', name:'Idea Generator', description:'Submitted your first idea', category:'innovation' },
]
const DEMO_LEADERBOARD = [
  { rank:1, name:'Gita Maharjan',  dept:'HR',          points:1240, badges:7, streak:14 },
  { rank:2, name:'Sunil Magar',    dept:'Engineering', points:1180, badges:6, streak:21 },
  { rank:3, name:'Maya Pradhan',   dept:'Engineering', points:960,  badges:5, streak:7  },
  { rank:4, name:'Bikash Rai',     dept:'Sales',       points:820,  badges:4, streak:3  },
  { rank:5, name:'You',            dept:'-',           points:740,  badges:3, streak:5, isMe:true },
]
const COMMUNITIES = [
  { key:'hr',     name:'HR & People',    icon:'👥', members:47, posts_today:3 },
  { key:'tech',   name:'Tech Hub',       icon:'💻', members:62, posts_today:8 },
  { key:'sales',  name:'Sales Team',     icon:'📈', members:18, posts_today:2 },
  { key:'sports', name:'Sports & Fitness',icon:'⚽', members:34, posts_today:5 },
  { key:'csr',    name:'CSR & Volunteer',icon:'❤️', members:29, posts_today:1 },
  { key:'social', name:'Watercooler',    icon:'☕', members:89, posts_today:12 },
]

function FeedPost({ post, onReact }){
  const [showReactions, setShowReactions] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comment, setComment] = useState('')
  const [reacted, setReacted] = useState(post.i_reacted)
  const [myReaction, setMyReaction] = useState(post.my_reaction)
  const [rxCount, setRxCount] = useState(post.reaction_count)
  const [bookmarked, setBookmarked] = useState(false)

  const doReact = (rk) => {
    if (reacted && myReaction === rk) { setReacted(false); setMyReaction(null); setRxCount(c=>c-1) }
    else { if (!reacted) setRxCount(c=>c+1); setReacted(true); setMyReaction(rk) }
    setShowReactions(false)

  const icon = POST_ICON[post.post_type] || '📌'
  return(
    <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,marginBottom:14,overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'14px 16px 0',display:'flex',gap:10,alignItems:'flex-start'}}>
        <div style={{width:40,height:40,borderRadius:'50%',background:A+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{icon}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',lineHeight:1.3}}>{post.title}</div>
          {post.author_name && <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>Posted by {post.author_name} . {post.created_at}</div>}
          {!post.author_name && <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{post.created_at}</div>}
        </div>
        <button onClick={()=>setBookmarked(b=>!b)} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,opacity:bookmarked?1:0.4,flexShrink:0}} title="Bookmark">{bookmarked?'🔖':'🔖'}</button>
      </div>
      {/* Body */}
      <div style={{padding:'10px 16px',fontSize:10,color:'#374151',lineHeight:1.6}}>{post.body}</div>
      {post.media_type==='image' && (
        <div style={{background:'linear-gradient(135deg,#e0f2fe,#fce7f3)',height:120,margin:'0 16px 10px',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>📸</div>
      )}
      {post.link_label && (
        <div style={{margin:'0 16px 10px'}}>
          <button style={{padding:'7px 16px',borderRadius:9,border:`1px solid ${A}`,background:'#fff',color:A,fontSize:9,fontWeight:700,cursor:'pointer'}}>{post.link_label} {'>'}</button>
        </div>
      )}
      {/* Reaction summary */}
      <div style={{padding:'6px 16px',borderTop:'1px solid #f8fafc',borderBottom:'1px solid #f8fafc',display:'flex',justifyContent:'space-between',fontSize:9,color:'#94a3b8'}}>
        <span>{rxCount > 0 && `${rxCount} reaction${rxCount!==1?'s':''}`}</span>
        <span style={{cursor:'pointer'}} onClick={()=>setShowComments(x=>!x)}>{post.comment_count > 0 && `${post.comment_count} comment${post.comment_count!==1?'s':''}`}</span>
      </div>
      {/* Action bar */}
      <div style={{display:'flex',gap:0,padding:'4px 8px'}}>
        {/* Like/React button */}
        <div style={{position:'relative',flex:1}}>
          <button
            onMouseEnter={()=>setShowReactions(true)}
            onMouseLeave={()=>setTimeout(()=>setShowReactions(false),300)}
            onClick={()=>doReact('like')}
            style={{width:'100%',padding:'8px 4px',border:'none',background:'none',cursor:'pointer',fontSize:10,fontWeight:700,color:reacted?A:'#64748b',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
            {reacted ? (REACTIONS.find(r=>r.key===myReaction)?.emoji||'👍') : '👍'}
            <span style={{fontSize:9}}>{reacted ? (REACTIONS.find(r=>r.key===myReaction)?.label||'Like') : 'Like'}</span>
          </button>
          {showReactions && (
            <div onMouseEnter={()=>setShowReactions(true)} onMouseLeave={()=>setShowReactions(false)}
              style={{position:'absolute',bottom:'100%',left:0,background:'#fff',border:'1px solid #e2e8f0',borderRadius:40,padding:'6px 10px',display:'flex',gap:6,boxShadow:'0 4px 20px rgba(0,0,0,.12)',zIndex:10,whiteSpace:'nowrap'}}>
              {REACTIONS.map(r=>(
                <button key={r.key} onClick={()=>doReact(r.key)} title={r.label}
                  style={{background:'none',border:'none',cursor:'pointer',fontSize:20,transition:'transform .1s',padding:'2px'}}
                  onMouseEnter={e=>e.target.style.transform='scale(1.3)'}
                  onMouseLeave={e=>e.target.style.transform='scale(1)'}>{r.emoji}</button>
              ))}
            </div>
          )}
        </div>
        <button onClick={()=>setShowComments(x=>!x)} style={{flex:1,padding:'8px 4px',border:'none',background:'none',cursor:'pointer',fontSize:9,fontWeight:700,color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
          💬 Comment
        </button>
        <button style={{flex:1,padding:'8px 4px',border:'none',background:'none',cursor:'pointer',fontSize:9,fontWeight:700,color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
          🔗 Share
        </button>
      </div>
      {/* Comments section */}
      {showComments && (
        <div style={{padding:'8px 16px 14px',borderTop:'1px solid #f8fafc',background:'#fafafa'}}>
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:A+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>You</div>
            <input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Write a comment..."
              style={{flex:1,padding:'6px 10px',borderRadius:20,border:'1px solid #e2e8f0',fontSize:9,background:'#fff'}}/>
            {comment && <button onClick={()=>setComment('')} style={{padding:'6px 12px',borderRadius:20,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Post</button>}
          </div>
          <div style={{fontSize:9,color:'#94a3b8',fontStyle:'italic'}}>Be the first to comment...</div>
        </div>
      )}
    </div>
  )

function PostComposer(){
  const [text, setText] = useState('')
  return(
    <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'14px 16px',marginBottom:16}}>
      <div style={{display:'flex',gap:10,marginBottom:10}}>
        <div style={{width:40,height:40,borderRadius:'50%',background:A+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>😊</div>
        <textarea value={text} onChange={e=>setText(e.target.value)}
          placeholder="Share something with your team... 💬"
          style={{flex:1,minHeight:72,borderRadius:12,border:'1px solid #e2e8f0',padding:'10px 12px',fontSize:10,resize:'none',color:'#374151'}}/>
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',gap:6}}>
          {['📸 Photo','🎥 Video','💡 Idea','🏅 Kudos'].map(opt=>(
            <button key={opt} style={{padding:'5px 10px',borderRadius:20,border:'1px solid #e2e8f0',background:'#f8fafc',fontSize:8,fontWeight:600,cursor:'pointer',color:'#64748b'}}>{opt}</button>
          ))}
        </div>
        <button disabled={!text} style={{padding:'7px 16px',borderRadius:9,border:'none',background:text?A:'#e2e8f0',color:text?'#fff':'#94a3b8',fontSize:9,fontWeight:700,cursor:text?'pointer':'default'}}>Post</button>
      </div>
    </div>
  )

export default function EmployeeSocialFeedPage(){
  const [tab, setTab] = useState('feed')
  const [filter, setFilter] = useState('all')

  const POST_FILTERS = [
    {key:'all',label:'All'},
    {key:'birthday',label:'🎂 Birthdays'},
    {key:'kudos',label:'👏 Kudos'},
    {key:'announcement',label:'📢 News'},
    {key:'new_training',label:'📚 Learning'},
    {key:'promotion',label:'🎊 Promotions'},
  ]
  const filtered = filter==='all' ? DEMO_POSTS : DEMO_POSTS.filter(p=>p.post_type===filter)

  return(
    <div style={{maxWidth:900,margin:'0 auto'}}>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)',borderRadius:20,padding:'20px 24px',marginBottom:18,color:'#fff'}}>
        <div style={{fontSize:22,fontWeight:900,marginBottom:4}}>🏠 Employee Hub</div>
        <div style={{fontSize:11,opacity:.85}}>Your company in one place - news, recognition, events, learning, and your team</div>
        <div style={{display:'flex',gap:10,marginTop:12,flexWrap:'wrap'}}>
          {[{icon:'⭐',label:'740 pts'},{icon:'🏅',label:'3 Badges'},{icon:'🔥',label:'5-day streak'},{icon:'#5',label:'Rank'}].map((s,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,.15)',borderRadius:20,padding:'4px 12px',fontSize:9,fontWeight:700}}>{s.icon} {s.label}</div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{display:'flex',gap:0,marginBottom:18,background:'#f1f5f9',borderRadius:12,padding:4,overflowX:'auto',flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{flex:'0 0 auto',padding:'7px 12px',border:'none',borderRadius:9,cursor:'pointer',fontSize:9,fontWeight:700,whiteSpace:'nowrap',background:tab===t.key?'#fff':'transparent',color:tab===t.key?A:'#94a3b8',boxShadow:tab===t.key?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* HOME FEED */}
      {tab==='feed' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:16}}>
          <div>
            <PostComposer/>
            {/* Filter chips */}
            <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
              {POST_FILTERS.map(f=>(
                <button key={f.key} onClick={()=>setFilter(f.key)}
                  style={{padding:'5px 12px',borderRadius:20,border:filter===f.key?'none':'1px solid #e2e8f0',background:filter===f.key?A:'#fff',color:filter===f.key?'#fff':'#64748b',fontSize:8,fontWeight:700,cursor:'pointer'}}>
                  {f.label}
                </button>
              ))}
            </div>
            {filtered.map(p=><FeedPost key={p.id} post={p}/>)}
          </div>
          {/* Right sidebar */}
          <div>
            {/* Leaderboard */}
            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'14px',marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>🏆 Top Performers (30d)</div>
              {DEMO_LEADERBOARD.map(l=>(
                <div key={l.rank} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #f8fafc',background:l.isMe?'#f5f3ff':'transparent',borderRadius:l.isMe?8:'none',paddingLeft:l.isMe?6:'0'}}>
                  <span style={{fontSize:10,fontWeight:800,color:l.rank<=3?A:'#94a3b8',width:16}}>{l.rank<=3?['🥇','🥈','🥉'][l.rank-1]:l.rank}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:9,fontWeight:700,color:l.isMe?A:'#0f172a'}}>{l.name}{l.isMe&&' (You)'}</div>
                    <div style={{fontSize:8,color:'#94a3b8'}}>{l.dept}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:9,fontWeight:700,color:A}}>{l.points} pts</div>
                    <div style={{fontSize:8,color:'#94a3b8'}}>🔥{l.streak}d</div>
                  </div>
                </div>
              ))}
            </div>
            {/* My badges */}
            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'14px'}}>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>🏅 My Badges</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {DEMO_BADGES.map((b,i)=>(
                  <div key={i} style={{background:'#faf5ff',borderRadius:10,padding:'8px',textAlign:'center'}}>
                    <div style={{fontSize:20}}>{b.icon_emoji}</div>
                    <div style={{fontSize:8,fontWeight:700,color:'#581c87',marginTop:4}}>{b.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMMUNITIES */}
      {tab==='communities' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14}}>
          {COMMUNITIES.map(c=>(
            <div key={c.key} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px',cursor:'pointer'}}>
              <div style={{fontSize:28,marginBottom:8}}>{c.icon}</div>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{c.name}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>{c.members} members . {c.posts_today} posts today</div>
              <button style={{width:'100%',marginTop:10,padding:'7px 0',borderRadius:9,border:`1px solid ${A}`,background:'#fff',color:A,fontSize:9,fontWeight:700,cursor:'pointer'}}>Join Community</button>
            </div>
          ))}
        </div>
      )}

      {/* RECOGNITION */}
      {tab==='recognition' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>👏 Give Kudos</div>
            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px'}}>
              <div style={{fontSize:9,fontWeight:700,color:'#374151',marginBottom:6}}>To</div>
              <input placeholder="Search employee..." style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:9,marginBottom:10,boxSizing:'border-box'}}/>
              <div style={{fontSize:9,fontWeight:700,color:'#374151',marginBottom:6}}>Value Tag</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                {['Innovation','Teamwork','Customer Focus','Leadership','Excellence'].map(v=>(
                  <button key={v} style={{padding:'4px 10px',borderRadius:20,border:'1px solid #e2e8f0',background:'#f8fafc',fontSize:8,cursor:'pointer',color:'#374151'}}>{v}</button>
                ))}
              </div>
              <textarea placeholder="Write a personal message..." style={{width:'100%',minHeight:70,borderRadius:9,border:'1px solid #e2e8f0',padding:'8px',fontSize:9,resize:'none',boxSizing:'border-box',marginBottom:10}}/>
              <button style={{width:'100%',padding:'9px 0',borderRadius:9,border:'none',background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>👏 Send Kudos (+15 pts)</button>
            </div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🏆 Achievement Badges</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {['📚 Knowledge Seeker','👏 Culture Champion','✅ Punctuality Pro','💡 Change Maker','🏅 Wellness Champion','🔥 Learning Champion','⭐ Team Player','🚀 Idea Champion'].map((b,i)=>(
                <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'10px',textAlign:'center',opacity:i<4?1:0.5}}>
                  <div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{b}</div>
                  <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{i<4?'Earned':'Locked'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EVENTS */}
      {tab==='events' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:14}}>
          {[
            {title:'Dashain Celebrations 2025',date:'Oct 14-18',type:'Cultural Holiday',emoji:'🎉',rsvp:87},
            {title:'Q3 All-Hands Meeting',date:'Oct 20, 3 PM',type:'Company Meeting',emoji:'📢',rsvp:142},
            {title:'Leadership Training Workshop',date:'Oct 25',type:'Training',emoji:'📚',rsvp:24},
            {title:'CSR: Tree Plantation Drive',date:'Nov 2',type:'Volunteer',emoji:'🌱',rsvp:31},
          ].map((ev,i)=>(
            <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px'}}>
              <div style={{fontSize:28,marginBottom:8}}>{ev.emoji}</div>
              <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:4}}>{ev.title}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginBottom:2}}>{ev.date} . {ev.type}</div>
              <div style={{fontSize:9,color:'#64748b',marginBottom:10}}>{ev.rsvp} attending</div>
              <button style={{width:'100%',padding:'7px 0',borderRadius:9,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>RSVP (+30 pts)</button>
            </div>
          ))}
        </div>
      )}

      {/* LEARNING */}
      {tab==='learning' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:14}}>
          {[
            {title:'Leadership Essentials for Managers',duration:'4 hrs',badge:'🎓',pts:50,progress:60},
            {title:'Nepal Labour Act 2074 - Compliance Update',duration:'2 hrs',badge:'📋',pts:30,progress:0},
            {title:'MS Excel Advanced for HR Analytics',duration:'6 hrs',badge:'📊',pts:50,progress:100},
            {title:'Effective Communication in the Workplace',duration:'3 hrs',badge:'💬',pts:40,progress:25},
          ].map((c,i)=>(
            <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px'}}>
              <div style={{fontSize:28,marginBottom:8}}>{c.badge}</div>
              <div style={{fontSize:10,fontWeight:700,color:'#0f172a',marginBottom:4}}>{c.title}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginBottom:8}}>{c.duration} . +{c.pts} pts . Certificate</div>
              <div style={{height:6,background:'#f1f5f9',borderRadius:6,marginBottom:10}}>
                <div style={{height:'100%',width:`${c.progress}%`,background:c.progress===100?'#15803d':A,borderRadius:6}}/>
              </div>
              <button style={{width:'100%',padding:'7px 0',borderRadius:9,border:'none',background:c.progress===100?'#f0fdf4':A,color:c.progress===100?'#15803d':'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                {c.progress===100?'✓ Completed':c.progress>0?'Continue':'Start Course'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* INTERNAL JOBS */}
      {tab==='jobs' && (
        <div style={{display:'grid',gap:12}}>
          {[
            {title:'Senior HR Business Partner',dept:'Human Resources',type:'Full-Time',location:'Kathmandu',posted:'2 days ago'},
            {title:'Frontend Engineer (React)',dept:'Engineering',type:'Full-Time',location:'Remote',posted:'3 days ago'},
            {title:'Sales Manager - Terai Region',dept:'Sales',type:'Full-Time',location:'Birgunj',posted:'1 week ago'},
          ].map((j,i)=>(
            <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{j.title}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{j.dept} . {j.type} . {j.location} . {j.posted}</div>
              </div>
              <button style={{padding:'7px 16px',borderRadius:9,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Apply Now</button>
            </div>
          ))}
        </div>
      )}

      {/* IDEAS */}
      {tab==='ideas' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div>
            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px',marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>💡 Submit an Idea</div>
              <input placeholder="Idea title..." style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:9,marginBottom:8,boxSizing:'border-box'}}/>
              <textarea placeholder="Describe your idea..." style={{width:'100%',minHeight:80,borderRadius:9,border:'1px solid #e2e8f0',padding:'8px',fontSize:9,resize:'none',boxSizing:'border-box',marginBottom:10}}/>
              <button style={{width:'100%',padding:'9px 0',borderRadius:9,border:'none',background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Submit Idea (+20 pts)</button>
            </div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🔥 Trending Ideas</div>
            {[
              {title:'4-day work week pilot for Q4',votes:47,status:'Under Review'},
              {title:'Standing desks in all floors',votes:31,status:'Approved'},
              {title:'Monthly lunch with CEO lottery',votes:28,status:'Considering'},
            ].map((idea,i)=>(
              <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'12px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{idea.title}</div><span style={{fontSize:8,color:'#94a3b8'}}>{idea.votes} votes</span></div>
                <span style={{fontSize:8,fontWeight:700,color:idea.status==='Approved'?'#15803d':'#b45309',background:idea.status==='Approved'?'#f0fdf4':'#fffbeb',padding:'2px 8px',borderRadius:20}}>{idea.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI ASSISTANT */}
      {tab==='ai' && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',maxWidth:600,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:20}}>
            <div style={{fontSize:40,marginBottom:8}}>🤖</div>
            <div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>AI HR Assistant</div>
            <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>Ask anything about policies, leave, payroll, or get career advice</div>
          </div>
          {[
            {q:'How many leave days do I have left?',a:'You have 8 annual leave days remaining for this year (ending Chaitra 2081). You have taken 4 days so far.'},
            {q:'Recommend a training course for me',a:'Based on your role and career goals, I recommend "Leadership Essentials for Managers" - you\'re 60% through it already! Complete it to earn your Leadership badge and 50 points.'},
          ].map((ex,i)=>(
            <div key={i} style={{marginBottom:14}}>
              <div style={{background:'#f5f3ff',borderRadius:'12px 12px 4px 12px',padding:'9px 12px',fontSize:10,color:'#581c87',marginBottom:6,alignSelf:'flex-end'}}>{ex.q}</div>
              <div style={{background:'#f8fafc',borderRadius:'4px 12px 12px 12px',padding:'9px 12px',fontSize:10,color:'#374151'}}>{ex.a}</div>
            </div>
          ))}
          <div style={{display:'flex',gap:8}}>
            <input placeholder="Ask me anything..." style={{flex:1,padding:'10px 14px',borderRadius:25,border:'1px solid #e2e8f0',fontSize:10}}/>
            <button style={{padding:'10px 18px',borderRadius:25,border:'none',background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Send</button>
          </div>
        </div>
      )}

      {/* CALENDAR */}
      {tab==='calendar' && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',textAlign:'center'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:6}}>📅 Company Calendar</div>
          <div style={{fontSize:10,color:'#94a3b8',marginBottom:16}}>October 2025 - Kartik 2082</div>
          <div style={{background:'#f8fafc',borderRadius:12,padding:'20px',fontSize:10,color:'#64748b'}}>
            Calendar grid renders here - birthdays, work anniversaries, company events, holidays, and training schedules all in one view.
          </div>
          <div style={{marginTop:14,display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
            {[{c:'#7c3aed',l:'Events'},{c:'#0284c7',l:'Training'},{c:'#dc2626',l:'Holidays'},{c:'#15803d',l:'Birthdays'},{c:'#f59e0b',l:'Anniversaries'}].map(leg=>(
              <div key={leg.l} style={{display:'flex',alignItems:'center',gap:4,fontSize:9}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:leg.c}}/>
                <span style={{color:'#64748b'}}>{leg.l}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
