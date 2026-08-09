// FILE: StoredTasksPage.jsx — Stored tasks placeholder
import { useApp } from '../../../context/AppContext.jsx'
const G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
export default function StoredTasksPage(){
  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:G,borderRadius:16,padding:'20px 24px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>📋 Stored Tasks</div><div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>Daily · Weekly · Monthly · Annual task repository</div></div>
      <div style={{background:'#fff',borderRadius:16,padding:20,border:'1px solid #e2e8f0',textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:32,marginBottom:8}}>📋</div><div style={{fontSize:11}}>No tasks stored yet. Use Quick Actions or your module pages to create and assign tasks.</div></div>
    </div>
  )
}
