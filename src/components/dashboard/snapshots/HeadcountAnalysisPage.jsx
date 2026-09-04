// FILE: HeadcountAnalysisPage.jsx
import { PieChart,Pie,Cell,BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer } from 'recharts'
const P='#7c3aed',G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const COLORS=['#0ea5e9','#ec4899','#10b981','#f59e0b']
const deptData=[{d:'Engineering',n:68},{d:'Operations',n:54},{d:'Sales',n:45},{d:'IT',n:42},{d:'Admin',n:32},{d:'Marketing',n:31},{d:'Finance',n:22},{d:'HR',n:18}]
const genderPie=[{name:'Male',value:187},{name:'Female',value:121},{name:'TG',value:4}]

function _getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}
function _useAppFallback() {
  const s = _getSession()
  return {
    sub: s?.last_page || '', persona: s?.persona || s?.user?.role || 'employee',
    lang: s?.lang || 'en', currency: s?.currency || 'NPR',
    company: s?.company || {}, user: s?.user || {},
    darkMode: false, setDarkMode: () => {},
    navTo: (p) => window.dispatchEvent(new CustomEvent('elogix:nav', { detail: { page: p } })),
    switchPersona: () => {}, setShowNotif: () => {}, setShowAI: () => {},
    setSidebarOpen: () => {}, sidebarOpen: true,
    currentPersona: { id: s?.persona || 'employee', icon: '👤', color: '#7c3aed', label: '' },
  }
}

export default function HeadcountAnalysisPage(){
  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:G,borderRadius:16,padding:'20px 24px',boxShadow:'0 4px 24px rgba(124,58,237,.25)'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>👥 Headcount Analysis</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>Total · Male · Female · Transgender · Department-wise</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[{icon:'👥',label:'Total',val:312,color:'#7c3aed'},{icon:'👨',label:'Male',val:187,color:'#0ea5e9'},{icon:'👩',label:'Female',val:121,color:'#ec4899'},{icon:'🏳️‍🌈',label:'Transgender',val:4,color:'#10b981'}].map((s,i)=>(
          <div key={i} style={{background:`${s.color}08`,borderRadius:14,padding:16,border:`1px solid ${s.color}20`,textAlign:'center'}}>
            <div style={{fontSize:26}}>{s.icon}</div>
            <div style={{fontSize:28,fontWeight:900,color:s.color,lineHeight:1.1,marginTop:4}}>{s.val}</div>
            <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:16}}>
        <div style={{background:'#fff',borderRadius:16,padding:18,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:12,fontWeight:800,marginBottom:8}}>Gender Split</div>
          <div style={{height:180}}><ResponsiveContainer><PieChart><Pie data={genderPie} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>{genderPie.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
        </div>
        <div style={{background:'#fff',borderRadius:16,padding:18,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:12,fontWeight:800,marginBottom:8}}>Department-wise Headcount</div>
          <div style={{height:180}}><ResponsiveContainer><BarChart data={deptData} margin={{top:0,right:10,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="d" tick={{fontSize:8}} interval={0} angle={-20} textAnchor="end" height={28}/><YAxis tick={{fontSize:8}}/><Tooltip contentStyle={{fontSize:10,borderRadius:8}}/><Bar dataKey="n" fill={P} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
        </div>
      </div>
    </div>
  )
}
