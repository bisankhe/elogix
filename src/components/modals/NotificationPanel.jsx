// FILE: src/components/modals/NotificationPanel.jsx
// eLogix HRMS · eLogix Technologies

export default function NotificationPanel({ onClose }) {
  return (
    <div style={{
      position:'fixed',top:0,left:0,right:0,bottom:0,
      background:'rgba(0,0,0,.5)',zIndex:9999,
      display:'flex',alignItems:'center',justifyContent:'center'
    }}>
      <div style={{
        background:'#fff',borderRadius:16,padding:32,
        minWidth:380,maxWidth:520,
        boxShadow:'0 20px 60px rgba(0,0,0,.2)'
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>🔔 Notifications</h2>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#64748b'}}>✕</button>
        </div>
        <p style={{color:'#64748b',fontSize:13}}>🔔 Notifications settings will appear here.</p>
      </div>
    </div>
  )
}
