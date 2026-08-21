// ATSMultiPostPage.jsx — One-Click Multi-Channel Job Publishing + QR Code Apply
// Publish to: Career Portal, LinkedIn, Facebook, Instagram, X, Google Jobs,
// Indeed, Glassdoor, MeroJob, JobAxle, Naukri + Generate QR apply links
import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const CHANNELS = [
  { id:'portal',    name:'Company Career Portal', icon:'🏢', color:'#1e40af', bg:'#eff6ff',  type:'owned',    cost:'Free',     reach:'Internal + SEO',    connected:true },
  { id:'linkedin',  name:'LinkedIn Jobs',         icon:'🔗', color:'#0077b5', bg:'#e8f4fd',  type:'social',   cost:'NPR 5K–15K/post', reach:'500M+ users', connected:true },
  { id:'facebook',  name:'Facebook Jobs',         icon:'📘', color:'#1877f2', bg:'#e7f0fd',  type:'social',   cost:'NPR 2K–8K/post', reach:'300M+ Nepal users', connected:true },
  { id:'instagram', name:'Instagram Story',       icon:'📸', color:'#e1306c', bg:'#fdf0f4',  type:'social',   cost:'NPR 1K–5K/post', reach:'Story reach', connected:true },
  { id:'twitter',   name:'X (Twitter)',            icon:'🐦', color:'#000000', bg:'#f0f0f0',  type:'social',   cost:'Free organic', reach:'Global', connected:true },
  { id:'google',    name:'Google Jobs',            icon:'🔎', color:'#4285f4', bg:'#eaf1fb',  type:'organic',  cost:'Free (schema)', reach:'Google search results', connected:true },
  { id:'indeed',    name:'Indeed',                 icon:'🔍', color:'#2164f3', bg:'#eaeffd',  type:'jobboard', cost:'NPR 3K–12K/post', reach:'250M visitors/mo', connected:true },
  { id:'glassdoor', name:'Glassdoor',              icon:'🪟', color:'#0caa41', bg:'#e8f8ed',  type:'jobboard', cost:'NPR 4K–10K/post', reach:'67M visitors/mo', connected:false },
  { id:'merojob',   name:'MeroJob Nepal',          icon:'🇳🇵', color:'#c0392b', bg:'#fdecea',  type:'local',    cost:'NPR 800–3K/post', reach:'#1 Nepal job portal', connected:true },
  { id:'jobaxle',   name:'JobAxle Nepal',          icon:'⚙️', color:'#8e44ad', bg:'#f5edfb',  type:'local',    cost:'NPR 500–2K/post', reach:'Nepal job seekers', connected:true },
  { id:'naukri',    name:'Naukri.com',             icon:'📋', color:'#4a90e2', bg:'#eaf3fd',  type:'regional', cost:'NPR 2K–8K/post', reach:'India + Nepal', connected:true },
  { id:'internal',  name:'Internal Career Portal', icon:'👥', color:'#059669', bg:'#f0fdf4',  type:'internal', cost:'Free',     reach:'Current employees + referrals', connected:true },
]

const APPLY_METHODS = [
  { id:'direct',    name:'Career Portal',  icon:'🌐', desc:'Direct application on company website' },
  { id:'linkedin',  name:'LinkedIn Apply', icon:'🔗', desc:'Easy Apply via LinkedIn profile' },
  { id:'facebook',  name:'Facebook Apply', icon:'📘', desc:'Apply via Facebook Jobs form' },
  { id:'indeed',    name:'Indeed Apply',   icon:'🔍', desc:'One-click apply via Indeed profile' },
  { id:'qr',        name:'QR Code Apply',  icon:'📱', desc:'Scan QR code with phone to apply instantly' },
  { id:'whatsapp',  name:'WhatsApp Apply', icon:'💬', desc:'Send CV via WhatsApp to apply' },
  { id:'email',     name:'Email Apply',    icon:'📧', desc:'Apply by emailing CV directly' },
  { id:'referral',  name:'Referral Link',  icon:'🤝', desc:'Unique referral link for employee sharing' },
]

const JOBS = [
  { id:'j1', title:'Senior React Developer', dept:'Technology', status:'Draft',    channels:[], views:0,  apps:0 },
  { id:'j2', title:'Finance Manager',        dept:'Finance',    status:'Published', channels:['portal','linkedin','merojob','google'], views:284, apps:42 },
  { id:'j3', title:'Data Scientist',         dept:'Technology', status:'Published', channels:['portal','linkedin','indeed','merojob'], views:196, apps:36 },
  { id:'j4', title:'HR Business Partner',    dept:'HR',         status:'Draft',     channels:[], views:0,  apps:0 },
]

function QRDisplay({ jobTitle, jobId }) {
  // SVG QR code simulation - real implementation would use a QR library
  const cells = Array.from({ length: 21 }, (_, r) =>
    Array.from({ length: 21 }, (_, c) => {
      // finder patterns
      if ((r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7)) return 1
      if ((r === 0||r===6) && c<7) return 1
      if ((r < 7) && (c===0||c===6)) return 1
      return (r * 3 + c * 7 + r * c) % 3 === 0 ? 1 : 0
    })
  )
  return (
    <div style={{ display:'inline-block', background:'#fff', padding:10, borderRadius:8, border:'2px solid #1e40af' }}>
      {cells.map((row, r) => (
        <div key={r} style={{ display:'flex' }}>
          {row.map((cell, c) => (
            <div key={c} style={{ width:6, height:6, background: cell ? '#0f172a' : '#fff' }} />
          ))}
        </div>
      ))}
      <div style={{ textAlign:'center', fontSize:7, color:'#64748b', marginTop:4 }}>Scan to Apply</div>
    </div>
  )

export default function ATSMultiPostPage() {
  const { navigate } = useApp()
  const [selJob, setSelJob] = useState(JOBS[0])
  const [selChannels, setSelChannels] = useState(['portal','linkedin','merojob','google','indeed'])
  const [tab, setTab] = useState('publish') // publish | qr | links | performance
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState({})
  const [schedule, setSchedule] = useState('')
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const toggleChannel = id => setSelChannels(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const publishNow = async () => {
    setPublishing(true)
    for (const chId of selChannels) {
      await new Promise(r => setTimeout(r, 300))
      setPublished(p => ({ ...p, [chId]: 'done' }))
    setPublishing(false)
    notify(`✅ Published to ${selChannels.length} channels! Live on: ${selChannels.map(id => CHANNELS.find(c => c.id === id)?.name).join(', ')}`)

  const totalReach = selChannels.reduce((s, id) => {
    const ch = CHANNELS.find(c => c.id === id)
    return s + (ch?.reach.includes('500M') ? 500 : ch?.reach.includes('300M') ? 300 : ch?.reach.includes('250M') ? 250 : ch?.reach.includes('#1') ? 50 : 10)
  }, 0)

  const applyLink = `https://careers.elogix.com/apply/${selJob?.id}`
  const whatsappLink = `https://wa.me/9779800000001?text=I would like to apply for ${selJob?.title}`
  const referralLink = `https://careers.elogix.com/refer/${selJob?.id}/${Math.random().toString(36).substr(2, 8)}`

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'linear-gradient(135deg,#1e3a5f,#0891b2)', borderRadius:14, padding:'16px 22px', marginBottom:16, color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900 }}>Multi-Channel Job Publisher</h2>
          <p style={{ margin:'3px 0 0', fontSize:10, opacity:.8 }}>One click → Career Portal · LinkedIn · Facebook · Instagram · X · Google Jobs · Indeed · Glassdoor · MeroJob · QR Code</p>
        </div>
        {msg && <span style={{ fontSize:9, padding:'5px 14px', background:'rgba(255,255,255,.2)', borderRadius:8 }}>{msg}</span>}
      </div>

      {/* Job selector */}
      <div style={{ background:'#fff', borderRadius:12, padding:'12px 16px', marginBottom:14, border:'1px solid #e2e8f0', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:10, fontWeight:700, color:'#374151', flexShrink:0 }}>Job:</span>
        {JOBS.map(j => (
          <button key={j.id} onClick={() => setSelJob(j)} style={{ padding:'6px 14px', borderRadius:9, border:`2px solid ${selJob?.id === j.id ? '#0891b2' : '#e2e8f0'}`, background: selJob?.id === j.id ? '#ecfeff' : '#f8fafc', color: selJob?.id === j.id ? '#0891b2' : '#64748b', fontSize:9, fontWeight: selJob?.id === j.id ? 800 : 400, cursor:'pointer', display:'flex', gap:6, alignItems:'center' }}>
            {j.title}
            <span style={{ fontSize:7, padding:'1px 5px', borderRadius:4, background: j.status === 'Published' ? '#d1fae5' : '#f1f5f9', color: j.status === 'Published' ? '#065f46' : '#94a3b8' }}>{j.status}</span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {[['publish','📡 Publish'],['qr','📱 QR Code Apply'],['links','🔗 Apply Links'],['performance','📊 Performance']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:'8px 14px', borderRadius:9, background: tab === t ? '#0891b2' : '#fff', color: tab === t ? '#fff' : '#475569', fontSize:10, fontWeight: tab === t ? 800 : 400, cursor:'pointer', border: tab !== t ? '1px solid #e2e8f0' : 'none' }}>{l}</button>
        ))}
      </div>

      {/* PUBLISH TAB */}
      {tab === 'publish' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:14 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:12 }}>Select Publishing Channels ({selChannels.length} selected)</div>
            {['owned','social','jobboard','local','regional','internal'].map(type => {
              const chs = CHANNELS.filter(c => c.type === type)
              if (!chs.length) return null
              const typeLabel = { owned:'Owned', social:'Social Media', jobboard:'Job Boards', local:'Nepal Local', regional:'Regional', internal:'Internal' }[type]
              return (
                <div key={type} style={{ marginBottom:14 }}>
                  <div style={{ fontSize:9, fontWeight:800, color:'#64748b', marginBottom:7, textTransform:'uppercase', letterSpacing:'.06em' }}>{typeLabel}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:8 }}>
                    {chs.map(ch => {
                      const sel = selChannels.includes(ch.id)
                      const pub = published[ch.id]
                      return (
                        <div key={ch.id} onClick={() => !publishing && toggleChannel(ch.id)}
                          style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 12px', borderRadius:10, border:`2px solid ${sel ? ch.color : '#e2e8f0'}`, background: sel ? ch.bg : '#f8fafc', cursor:'pointer', position:'relative' }}>
                          {pub && <div style={{ position:'absolute', top:6, right:8, fontSize:10 }}>✅</div>}
                          <div style={{ width:32, height:32, borderRadius:8, background: ch.connected ? ch.color + '20' : '#f1f5f9', border:`1px solid ${ch.connected ? ch.color + '40' : '#e2e8f0'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{ch.icon}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{ch.name}</div>
                            <div style={{ fontSize:8, color:'#94a3b8' }}>{ch.cost}</div>
                            <div style={{ fontSize:7, color:'#64748b' }}>{ch.reach}</div>
                          </div>
                          {!ch.connected && <span style={{ fontSize:7, color:'#f59e0b', fontWeight:700 }}>Setup needed</span>}
                          {sel && <div style={{ width:16, height:16, borderRadius:'50%', background: ch.color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:9, flexShrink:0 }}>✓</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary + publish */}
          <div>
            <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #e2e8f0', marginBottom:12, position:'sticky', top:0 }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:12 }}>Publishing Summary</div>
              {[['Job',selJob?.title||'—'],['Channels',selChannels.length + ' selected'],['Est. Reach',totalReach + 'M+ potential viewers'],['Est. Applications','15-60 applications']].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:9, padding:'5px 0', borderBottom:'1px solid #f8fafc' }}>
                  <span style={{ color:'#94a3b8' }}>{k}</span><span style={{ color:'#0f172a', fontWeight:600 }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop:12 }}>
                <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Schedule (optional)</label>
                <input type="datetime-local" value={schedule} onChange={e => setSchedule(e.target.value)} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', boxSizing:'border-box' }} />
              </div>
              <button onClick={publishNow} disabled={publishing || !selChannels.length} style={{ width:'100%', marginTop:12, padding:'12px', borderRadius:10, border:'none', background: (!selChannels.length || publishing) ? '#e2e8f0' : 'linear-gradient(135deg,#1e3a5f,#0891b2)', color: (!selChannels.length || publishing) ? '#94a3b8' : '#fff', fontSize:11, fontWeight:900, cursor: (!selChannels.length || publishing) ? 'default' : 'pointer' }}>
                {publishing ? '📡 Publishing...' : `📡 Publish to ${selChannels.length} Channels Now`}
              </button>
              {schedule && <button onClick={() => notify(`⏰ Scheduled for ${new Date(schedule).toLocaleString()}`)} style={{ width:'100%', marginTop:8, padding:'9px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:10, cursor:'pointer' }}>⏰ Schedule Post</button>}
            </div>
            <div style={{ background:'#eff6ff', borderRadius:10, padding:12, border:'1px solid #bfdbfe', fontSize:8, color:'#334151' }}>
              <div style={{ fontWeight:700, color:'#1e40af', marginBottom:5 }}>Auto-actions on publish:</div>
              {['Job added to Google Jobs schema markup','QR code generated for offline use','WhatsApp apply link activated','Employee referral links created','Analytics tracking started','Auto-close when headcount filled'].map(a => <div key={a} style={{ padding:'1px 0' }}>✓ {a}</div>)}
            </div>
          </div>
        </div>
      )}

      {/* QR CODE TAB */}
      {tab === 'qr' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:22, border:'1px solid #e2e8f0', textAlign:'center' }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:4 }}>QR Code — Apply Now</div>
            <div style={{ fontSize:10, color:'#64748b', marginBottom:20 }}>{selJob?.title || 'Select a job'} · eLogix HRMS</div>
            <div style={{ display:'inline-block', padding:16, background:'#fff', borderRadius:14, boxShadow:'0 4px 20px rgba(0,0,0,.1)', marginBottom:16 }}>
              <QRDisplay jobTitle={selJob?.title} jobId={selJob?.id} />
            </div>
            <div style={{ fontSize:9, color:'#64748b', marginBottom:16 }}>Scan with any phone camera to apply instantly</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <button onClick={() => notify('QR Code downloaded as PNG!')} style={{ padding:'9px', borderRadius:9, border:'none', background:'#1e40af', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>📥 Download PNG</button>
              <button onClick={() => notify('QR Code downloaded as PDF!')} style={{ padding:'9px', borderRadius:9, border:'none', background:'#7c3aed', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>📄 Download PDF</button>
              <button onClick={() => notify('QR printed!')} style={{ padding:'9px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:9, cursor:'pointer' }}>🖨️ Print</button>
              <button onClick={() => notify('Shared to social media!')} style={{ padding:'9px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:9, cursor:'pointer' }}>📤 Share</button>
            </div>
          </div>
          <div style={{ background:'#fff', borderRadius:14, padding:22, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:14 }}>QR Code Use Cases</div>
            {[
              { icon:'🏢', title:'Office Notice Board', desc:'Print and display QR at reception / office entrance so walk-in candidates can apply instantly.' },
              { icon:'📅', title:'Job Fairs & Events', desc:'Display on banners at campus recruitment drives. Students scan and apply without paperwork.' },
              { icon:'📰', title:'Newspaper Ads', desc:'Include QR code in print advertisements. Readers scan directly to apply from the ad.' },
              { icon:'📱', title:'Social Media Stories', desc:'Share as Instagram/Facebook Story. Followers scan from their screen to apply in seconds.' },
              { icon:'🖨️', title:'Business Cards', desc:'Recruiters add job-specific QR to their cards for networking events.' },
              { icon:'🔗', title:'WhatsApp/Viber', desc:'Share QR image in WhatsApp groups. Community members scan to apply without a URL.' },
            ].map((u, i) => (
              <div key={i} style={{ display:'flex', gap:10, padding:'9px 0', borderBottom: i < 5 ? '1px solid #f8fafc' : 'none', alignItems:'flex-start' }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{u.icon}</span>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{u.title}</div>
                  <div style={{ fontSize:8, color:'#64748b', lineHeight:1.5 }}>{u.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* APPLY LINKS TAB */}
      {tab === 'links' && (
        <div>
          <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:12 }}>All Apply Channels — {selJob?.title}</div>
          {APPLY_METHODS.map(m => {
            const linkMap = { direct:applyLink, linkedin:`https://linkedin.com/jobs/${selJob?.id}`, facebook:`https://facebook.com/jobs/${selJob?.id}`, indeed:`https://indeed.com/job/${selJob?.id}`, qr:applyLink, whatsapp:whatsappLink, email:`mailto:careers@elogix.com?subject=Application: ${selJob?.title}`, referral:referralLink }
            const link = linkMap[m.id]
            return (
              <div key={m.id} style={{ background:'#fff', borderRadius:12, padding:'12px 16px', marginBottom:8, border:'1px solid #f1f5f9', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ width:36, height:36, borderRadius:9, background:'#f8fafc', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{m.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{m.name}</div>
                  <div style={{ fontSize:8, color:'#64748b', marginBottom:4 }}>{m.desc}</div>
                  <div style={{ fontSize:8, color:'#3b82f6', fontFamily:'monospace', background:'#f8fafc', padding:'3px 7px', borderRadius:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:400 }}>{link}</div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => notify(`${m.name} link copied!`)} style={{ padding:'5px 12px', borderRadius:7, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#374151', fontSize:8, cursor:'pointer' }}>Copy</button>
                  <button onClick={() => notify(`${m.name} link shared!`)} style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'#1e40af', color:'#fff', fontSize:8, cursor:'pointer' }}>Share</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* PERFORMANCE TAB */}
      {tab === 'performance' && (
        <div>
          <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:12 }}>Channel Performance — All Published Jobs</div>
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
            <div style={{ background:'#1e3a5f', color:'#fff', display:'grid', gridTemplateColumns:'160px 80px 80px 80px 80px 100px', padding:'10px 14px', fontSize:9, fontWeight:700, gap:8 }}>
              {['Channel','Views','Applications','Shortlisted','Hired','Conversion'].map(h => <div key={h} style={{ textAlign:h!=='Channel'?'center':'left' }}>{h}</div>)}
            </div>
            {[
              { name:'Company Portal',  views:684, apps:118, shortlisted:34, hired:9, icon:'🏢' },
              { name:'LinkedIn',        views:4284,apps:142, shortlisted:28, hired:8, icon:'🔗' },
              { name:'MeroJob Nepal',   views:1820,apps:89,  shortlisted:18, hired:4, icon:'🇳🇵' },
              { name:'Indeed',          views:2100,apps:54,  shortlisted:12, hired:4, icon:'🔍' },
              { name:'Google Jobs',     views:3200,apps:68,  shortlisted:14, hired:3, icon:'🔎' },
              { name:'Facebook',        views:5600,apps:38,  shortlisted:8,  hired:2, icon:'📘' },
              { name:'QR Code Scan',    views:420, apps:28,  shortlisted:7,  hired:2, icon:'📱' },
              { name:'WhatsApp Apply',  views:0,   apps:22,  shortlisted:5,  hired:1, icon:'💬' },
              { name:'Referral Links',  views:180, apps:22,  shortlisted:8,  hired:4, icon:'🤝' },
            ].map((s, i) => {
              const conv = s.apps > 0 ? ((s.hired / s.apps) * 100).toFixed(1) + '%' : '—'
              return (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'160px 80px 80px 80px 80px 100px', padding:'9px 14px', borderBottom:'1px solid #f1f5f9', background: i%2===0?'#fff':'#f8fafc', gap:8, alignItems:'center' }}>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{ fontSize:12 }}>{s.icon}</span>
                    <span style={{ fontSize:9, fontWeight:600, color:'#0f172a' }}>{s.name}</span>
                  </div>
                  {[s.views,s.apps,s.shortlisted,s.hired].map((v,j) => <div key={j} style={{ textAlign:'center', fontSize:12, fontWeight:700, color:j===3?'#059669':'#334155' }}>{v.toLocaleString()}</div>)}
                  <div style={{ textAlign:'center', fontSize:10, fontWeight:700, color: parseFloat(conv)>5?'#059669':parseFloat(conv)>2?'#f59e0b':'#ef4444' }}>{conv}</div>
                </div>
              )
            })}
          </div>
          <div style={{ background:'#f0fdf4', borderRadius:10, padding:'10px 14px', border:'1px solid #bbf7d0', marginTop:12, fontSize:9, color:'#065f46' }}>
            AI: Referral Links (18.2% conversion) and Company Portal (7.6%) outperform paid channels. QR Code shows strong ROI — 28 applications at zero cost.
          </div>
        </div>
      )}
    </div>
  )
