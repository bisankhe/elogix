// FILE: src/components/dashboard/MarketingDashboard.jsx
// PURPOSE: Marketing workspace -- employer branding, recruitment
// campaigns, social media branding, career page performance.
import { StatCard } from '../shared/StatCard.jsx'
import { Card } from '../shared/Card.jsx'
const CAMPAIGNS=[
  {name:'Campus Hiring 2025 -- Engineering',reach:'12.4K',applications:84},
  {name:'LinkedIn EVP Series',reach:'8.1K',applications:21},
]

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

export default function MarketingDashboard(){
  const { navTo } = _useAppFallback()
  return(
    <div>
      <h1 style={{fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:4}}>📣 Marketing Workspace</h1>
      <p style={{fontSize:11,color:'#94a3b8',marginBottom:18}}>Employer branding, recruitment campaigns, and career page performance</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:20}}>
        <StatCard icon="📣" label="Active Campaigns" value={CAMPAIGNS.length}/>
        <StatCard icon="👁" label="Career Page Visits (MTD)" value="4.2K"/>
        <StatCard icon="📝" label="Applications via Campaign" value="105"/>
        <StatCard icon="⭐" label="Employer Brand Score" value="8.1/10"/>
      </div>
      <Card>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📣 Active Recruitment Campaigns</div>
        {CAMPAIGNS.map((c,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<CAMPAIGNS.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap',gap:8}}>
            <span style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{c.name}</span><span style={{fontSize:8,color:'#94a3b8'}}>{c.reach} reach . {c.applications} applications</span>
          </div>
        ))}
      </Card>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:8}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['Recruitment Campaign','recruitment-campaign'],['Career Page','career-page'],['Social Media Branding','social-media-branding'],['Culture Showcase','culture-showcase']].map(([label,id])=>
            <button key={id} onClick={()=>navTo(id)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8,fontWeight:600,cursor:'pointer'}}>{label}</button>)}
        </div>
      </div>
    </div>
  )
}
