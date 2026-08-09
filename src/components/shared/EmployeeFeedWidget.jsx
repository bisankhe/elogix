// FILE: src/components/shared/EmployeeFeedWidget.jsx
// Embedded mini social feed -- automatically shown at the bottom of
// every dashboard and every ESS page. Shows the top 4 most recent
// feed posts (birthdays, kudos, announcements, etc.) with reaction
// buttons, and links to the full Employee Hub page.
// Import anywhere: import EmployeeFeedWidget from '../shared/EmployeeFeedWidget.jsx'
import { useState } from 'react'

const A = '#7c3aed'
const REACTIONS = [
  { key:'like', emoji:'👍' },
  { key:'celebrate', emoji:'🎉' },
  { key:'thanks', emoji:'🙏' },
  { key:'wow', emoji:'😮' },
]
const POST_ICON = {
  birthday:'🎂', work_anniversary:'🏆', kudos:'👏', award:'🥇',
  promotion:'🎊', announcement:'📢', new_training:'📚', csr_activity:'❤️',
}
const DEMO = [
  { id:'w1', post_type:'birthday', title:'🎂 Happy Birthday, Hari Thapa!', created_at:'2h ago', reaction_count:14 },
  { id:'w2', post_type:'kudos', title:'👏 Kudos: Sunil Magar - "Outstanding teamwork!"', created_at:'4h ago', reaction_count:28 },
  { id:'w3', post_type:'announcement', title:'📢 Dashain Holiday: Office closed Oct 14-18', created_at:'1d ago', reaction_count:63 },
  { id:'w4', post_type:'new_training', title:'📚 New Course: Leadership Essentials', created_at:'3d ago', reaction_count:19 },
]

export default function EmployeeFeedWidget({ navTo }){
  const [reactions, setReactions] = useState({})
  const [minimised, setMinimised] = useState(false)

  const react = (postId, emoji) => {
    setReactions(prev => ({
      ...prev,
      [postId]: prev[postId]===emoji ? null : emoji,
    }))
  }

  return(
    <div style={{marginTop:24,background:'#fff',border:'1px solid #e2e8f0',borderRadius:18,overflow:'hidden'}}>
      {/* Widget header */}
      <div style={{background:'linear-gradient(135deg,#581c87,#7c3aed)',padding:'12px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}
        onClick={()=>setMinimised(m=>!m)}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:16}}>🏠</span>
          <span style={{fontSize:11,fontWeight:800,color:'#fff'}}>Employee Hub</span>
          <span style={{fontSize:8,background:'rgba(255,255,255,.2)',color:'#fff',padding:'2px 8px',borderRadius:20,fontWeight:700}}>LIVE</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {navTo && <button onClick={e=>{e.stopPropagation(); navTo('employee-social-feed')}}
            style={{padding:'4px 12px',borderRadius:20,border:'1px solid rgba(255,255,255,.4)',background:'transparent',color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer'}}>
            Open Hub
          </button>}
          <span style={{color:'rgba(255,255,255,.7)',fontSize:10}}>{minimised?'▼':'▲'}</span>
        </div>
      </div>

      {!minimised && (
        <div style={{padding:'10px 0'}}>
          {DEMO.map(post=>{
            const myRx = reactions[post.id]
            return(
              <div key={post.id} style={{padding:'10px 18px',borderBottom:'1px solid #f8fafc',display:'flex',gap:10,alignItems:'flex-start'}}>
                <span style={{fontSize:18,flexShrink:0}}>{POST_ICON[post.post_type]||'📌'}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,fontWeight:600,color:'#0f172a',lineHeight:1.4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{post.title}</div>
                  <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{post.created_at} . {post.reaction_count + (myRx&&!reactions[post.id+'_was']?1:0)} reactions</div>
                  <div style={{display:'flex',gap:4,marginTop:6}}>
                    {REACTIONS.map(r=>(
                      <button key={r.key} onClick={()=>react(post.id, r.key)}
                        title={r.key}
                        style={{width:26,height:26,borderRadius:8,border:`1px solid ${myRx===r.key?A:'#e2e8f0'}`,background:myRx===r.key?A+'15':'#f8fafc',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .1s'}}>
                        {r.emoji}
                      </button>
                    ))}
                    <button style={{padding:'0 8px',height:26,borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',fontSize:8,color:'#64748b',fontWeight:600}}>
                      💬
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {navTo && (
            <div style={{padding:'10px 18px'}}>
              <button onClick={()=>navTo('employee-social-feed')}
                style={{width:'100%',padding:'9px 0',borderRadius:10,border:`1px solid ${A}`,background:'#fff',color:A,fontSize:9,fontWeight:700,cursor:'pointer'}}>
                See all posts in Employee Hub {'>'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
