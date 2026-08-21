// FILE: MyDressCodePage.jsx
import { useApp } from '../../../context/AppContext.jsx'
const G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
export default function MyDressCodePage(){
  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:G,borderRadius:16,padding:'20px 24px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>👔 Dress Code Policy</div><div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>Company dress code guidelines and standards</div></div>
      <div style={{background:'#fff',borderRadius:16,padding:20,border:'1px solid #e2e8f0'}}><div style={{fontSize:12,fontWeight:800,marginBottom:12}}>Company Dress Code</div><div style={{display:'flex',flexDirection:'column',gap:8}}>{[{day:'Mon–Thu',dress:'Business formal / Business casual',icon:'👔'},{day:'Friday',dress:'Smart casual (no shorts, no flip-flops)',icon:'👕'},{day:'Client meetings',dress:'Full business formal required',icon:'🤝'},{day:'Field visits',dress:'Company uniform / branded polo',icon:'🦺'}].map((d,i)=><div key={i} style={{display:'flex',gap:12,padding:'10px',background:'#f8fafc',borderRadius:10}}><span style={{fontSize:18}}>{d.icon}</span><div><div style={{fontSize:10,fontWeight:700}}>{d.day}</div><div style={{fontSize:9,color:'#64748b'}}>{d.dress}</div></div></div>)}</div></div>
    </div>
  )
