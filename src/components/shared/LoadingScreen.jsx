// FILE: src/components/shared/LoadingScreen.jsx
// eLogix HRMS — Loading Screen
// Only used for route-level loading (not the initial app splash)
// eLogix Technologies · www.elogix.com.np
const G = 'linear-gradient(135deg,#1e1b4b 0%,#312e81 55%,#4338ca 100%)'

export default function LoadingScreen({ message = 'Loading eLogix HRMS...' }) {
  return (
    <div style={{
      position:'fixed', inset:0, background:G, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', zIndex:9999, fontFamily:'system-ui,sans-serif'
    }}>
      {/* eLogix logo mark */}
      <div style={{
        width:72, height:72, borderRadius:20,
        background:'rgba(255,255,255,.12)', display:'flex',
        alignItems:'center', justifyContent:'center',
        fontSize:38, marginBottom:20,
        boxShadow:'0 8px 32px rgba(0,0,0,.25)'
      }}>🏢</div>

      <div style={{fontSize:26, fontWeight:900, color:'#fff', letterSpacing:-.5, marginBottom:4}}>
        eLogix
      </div>
      <div style={{fontSize:11, color:'rgba(255,255,255,.6)', marginBottom:32}}>
        HRIS · HRMS · HRIM · HCM
      </div>

      {/* Progress bar */}
      <div style={{width:200, height:3, background:'rgba(255,255,255,.15)', borderRadius:2, marginBottom:16, overflow:'hidden'}}>
        <div style={{
          height:'100%', background:'rgba(255,255,255,.8)', borderRadius:2,
          animation:'progress 1.5s ease-in-out infinite'
        }}/>
      </div>
      <div style={{fontSize:11, color:'rgba(255,255,255,.55)'}}>{message}</div>

      <style>{`
        @keyframes progress {
          0%   { width: 0%;   margin-left: 0; }
          50%  { width: 70%;  margin-left: 15%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}
