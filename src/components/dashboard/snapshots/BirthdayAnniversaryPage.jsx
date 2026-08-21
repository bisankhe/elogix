// FILE: BirthdayAnniversaryPage.jsx — Birthdays & Anniversaries
// Auto-send WhatsApp/Viber/Email at 7 AM on exact date | Wish button | Auto notifications
import { useState } from 'react'

const G = 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const PEOPLE = [
  { id:1, name:'Sita Adhikari',   avatar:'SA', dept:'Finance',     date:'2081-03-22', display:'Today 🎉',      type:'birthday',    years:null, daysUntil:0, phone:'+977-9801111111', email:'sita@company.com',   wished:false },
  { id:2, name:'Ram Prasad Sah',  avatar:'RS', dept:'Operations',  date:'2081-03-24', display:'In 2 days',     type:'anniversary', years:5,   daysUntil:2, phone:'+977-9802222222', email:'ram@company.com',    wished:false },
  { id:3, name:'Anita Gurung',    avatar:'AG', dept:'HR',          date:'2081-03-26', display:'In 4 days',     type:'birthday',    years:null, daysUntil:4, phone:'+977-9803333333', email:'anita@company.com',  wished:false },
  { id:4, name:'Bikram Thapa',    avatar:'BT', dept:'Engineering', date:'2081-03-28', display:'In 6 days',     type:'anniversary', years:3,   daysUntil:6, phone:'+977-9804444444', email:'bikram@company.com', wished:false },
  { id:5, name:'Priya Maharjan',  avatar:'PM', dept:'Marketing',   date:'2081-04-01', display:'In 10 days',    type:'birthday',    years:null, daysUntil:10,phone:'+977-9805555555', email:'priya@company.com',  wished:false },
  { id:6, name:'Suresh KC',       avatar:'SK', dept:'IT',          date:'2081-04-05', display:'In 14 days',    type:'anniversary', years:7,   daysUntil:14,phone:'+977-9806666666', email:'suresh@company.com', wished:false },
  { id:7, name:'Kamala Shrestha', avatar:'KS', dept:'Admin',       date:'2081-04-08', display:'In 17 days',    type:'birthday',    years:null, daysUntil:17,phone:'+977-9807777777', email:'kamala@company.com', wished:false },
  { id:8, name:'Deepak Rana',     avatar:'DR', dept:'Sales',       date:'2081-04-12', display:'In 21 days',    type:'anniversary', years:2,   daysUntil:21,phone:'+977-9808888888', email:'deepak@company.com', wished:false },
]

const AUTO_CONFIG = { whatsapp:true, viber:true, email:true, notification:true, send_time:'07:00 AM' }

const WISH_TEMPLATES = {
  birthday: (name) => `🎂 Happy Birthday, ${name}!\n\nWishing you a wonderful day filled with joy and happiness. Thank you for your valuable contributions to our team!\n\nWith warm regards,\nHR Team — Future Company Nepal`,
  anniversary: (name, years) => `🥂 Happy Work Anniversary, ${name}!\n\nToday marks ${years} incredible year${years>1?'s':''} of your journey with us. Thank you for your dedication and hard work. Here's to many more years of success together!\n\nWith appreciation,\nHR Team — Future Company Nepal`,

export default function BirthdayAnniversaryPage() {
  const [people, setPeople]   = useState(PEOPLE)
  const [autoConfig, setAuto] = useState(AUTO_CONFIG)
  const [tab, setTab]         = useState('upcoming')
  const [wishModal, setWishModal] = useState(null)
  const [customMsg, setCustomMsg] = useState('')
  const [msg, setMsg]         = useState('')
  const [testMode, setTestMode] = useState(false)

  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3500) }

  const openWish = (p) => {
    const def = p.type==='birthday' ? WISH_TEMPLATES.birthday(p.name) : WISH_TEMPLATES.anniversary(p.name, p.years)
    setCustomMsg(def)
    setWishModal(p)

  const sendWish = () => {
    if (!wishModal) return
    setPeople(prev=>prev.map(p=>p.id===wishModal.id?{...p,wished:true}:p))
    const channels = [autoConfig.whatsapp&&'WhatsApp',autoConfig.viber&&'Viber',autoConfig.email&&'Email'].filter(Boolean).join(' + ')
    notify(`🎉 Wish sent to ${wishModal.name} via ${channels}!`)
    setWishModal(null)

  const toggleAuto = (key) => setAuto(p=>({...p,[key]:!p[key]}))

  const today = people.filter(p=>p.daysUntil===0)
  const thisWeek = people.filter(p=>p.daysUntil>0&&p.daysUntil<=7)
  const upcoming = people.filter(p=>p.daysUntil>7)

  const Card = ({p}) => {
    const isBD = p.type==='birthday'
    const color = isBD ? '#ec4899' : '#10b981'
    const bg    = isBD ? '#fdf2f8' : '#f0fdf4'
    return (
      <div style={{background:'#fff',borderRadius:14,border:`1px solid ${p.daysUntil===0?color:'#e2e8f0'}`,padding:'14px 16px',display:'flex',gap:12,alignItems:'flex-start',boxShadow:p.daysUntil===0?`0 0 0 2px ${color}30`:'none'}}>
        {p.daysUntil===0&&<div style={{position:'absolute',top:-8,right:12,background:color,color:'#fff',fontSize:8,fontWeight:800,padding:'3px 10px',borderRadius:20}}>🎉 TODAY!</div>}
        <div style={{width:46,height:46,borderRadius:'50%',background:bg,border:`2px solid ${color}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
          {isBD?'🎂':'🥂'}
        </div>
        <div style={{flex:1}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{p.name}</div>
              <div style={{fontSize:9,color:'#64748b'}}>{p.dept}</div>
              {p.years&&<div style={{fontSize:9,color:color,fontWeight:700,marginTop:2}}>🎊 {p.years} year{p.years>1?'s':''} with us!</div>}
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:9,fontWeight:700,color:color}}>{p.display}</div>
              <div style={{fontSize:8,color:'#94a3b8'}}>{p.date}</div>
            </div>
          </div>
          <div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap'}}>
            {!p.wished ? (
              <button onClick={()=>openWish(p)} style={{padding:'5px 14px',borderRadius:9,border:'none',background:color,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                🎉 Send Wish
              </button>
            ) : (
              <span style={{fontSize:9,fontWeight:700,padding:'5px 14px',borderRadius:9,background:'#f0fdf4',color:'#059669'}}>✅ Wished!</span>
            )}
            <span style={{fontSize:8,padding:'5px 10px',borderRadius:9,background:bg,color}}>📱 Auto-send configured</span>
          </div>
        </div>
      </div>
    )

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:G,borderRadius:14,padding:'16px 22px',marginBottom:14,color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div>
            <h2 style={{margin:0,fontSize:20,fontWeight:900}}>🎂 Birthdays & Work Anniversaries</h2>
            <p style={{margin:'3px 0 0',fontSize:10,opacity:.8}}>Auto-send wishes at 7:00 AM via WhatsApp · Viber · Email · Notification</p>
          </div>
          <div style={{display:'flex',gap:12}}>
            <div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:900}}>{today.length}</div><div style={{fontSize:8,opacity:.8}}>Today</div></div>
            <div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:900}}>{thisWeek.length}</div><div style={{fontSize:8,opacity:.8}}>This Week</div></div>
            <div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:900}}>{people.filter(p=>p.type==='birthday').length}</div><div style={{fontSize:8,opacity:.8}}>Birthdays</div></div>
            <div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:900}}>{people.filter(p=>p.type==='anniversary').length}</div><div style={{fontSize:8,opacity:.8}}>Anniversaries</div></div>
          </div>
        </div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46'}}>{msg}</div>}

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:14}}>
        {['upcoming','auto-settings'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'8px 18px',borderRadius:9,border:tab!==t?'1px solid #e2e8f0':'none',background:tab===t?A:'#fff',color:tab===t?'#fff':'#475569',fontSize:10,fontWeight:tab===t?800:400,cursor:'pointer'}}>
            {t==='upcoming'?'📅 Upcoming':'⚙️ Auto-Send Settings'}
          </button>
        ))}
      </div>

      {tab==='upcoming'&&(
        <div style={{display:'grid',gap:10}}>
          {today.length>0&&(
            <div>
              <div style={{fontSize:10,fontWeight:800,color:'#ec4899',marginBottom:8}}>🎉 TODAY</div>
              {today.map(p=><div key={p.id} style={{position:'relative'}}><Card p={p}/></div>)}
            </div>
          )}
          {thisWeek.length>0&&(
            <div>
              <div style={{fontSize:10,fontWeight:800,color:'#f59e0b',marginBottom:8}}>📅 THIS WEEK</div>
              {thisWeek.map(p=><Card key={p.id} p={p}/>)}
            </div>
          )}
          <div>
            <div style={{fontSize:10,fontWeight:800,color:'#64748b',marginBottom:8}}>🗓️ COMING SOON</div>
            {upcoming.map(p=><Card key={p.id} p={p}/>)}
          </div>
        </div>
      )}

      {tab==='auto-settings'&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'22px'}}>
          <div style={{fontSize:13,fontWeight:900,color:'#0f172a',marginBottom:4}}>⚙️ Automatic Wish Configuration</div>
          <div style={{fontSize:10,color:'#64748b',marginBottom:20}}>These settings control automatic birthday and work anniversary wishes sent to employees on their exact date at <strong>7:00 AM</strong>.</div>

          <div style={{background:'#f8fafc',borderRadius:12,padding:'16px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:12}}>📡 Send Channels</div>
            {[
              ['whatsapp','💬 WhatsApp','Send wish via WhatsApp Business API'],
              ['viber','📱 Viber','Send via Viber bot integration'],
              ['email','📧 Email','Send personalized email via SMTP'],
              ['notification','🔔 In-App Notification','Push notification on employee dashboard'],
            ].map(([key,label,desc])=>(
              <div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #f1f5f9'}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{label}</div>
                  <div style={{fontSize:9,color:'#64748b'}}>{desc}</div>
                </div>
                <div onClick={()=>toggleAuto(key)} style={{width:44,height:24,borderRadius:12,background:autoConfig[key]?A:'#e2e8f0',cursor:'pointer',position:'relative',transition:'background .2s'}}>
                  <div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:3,transition:'left .2s',left:autoConfig[key]?'23px':'3px',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
                </div>
              </div>
            ))}
          </div>

          <div style={{background:'#f8fafc',borderRadius:12,padding:'16px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:8}}>⏰ Send Time</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input type="time" defaultValue="07:00" style={{padding:'8px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:11,outline:'none'}}/>
              <span style={{fontSize:10,color:'#64748b'}}>Employee's local time (Nepal Standard Time)</span>
            </div>
          </div>

          <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,padding:'14px 16px',marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,color:'#92400e',marginBottom:8}}>📝 Default Wish Templates</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {['Birthday','Work Anniversary'].map(t=>(
                <div key={t} style={{background:'#fff',borderRadius:10,padding:'10px 12px',fontSize:9,color:'#374151'}}>
                  <div style={{fontWeight:700,marginBottom:4}}>{t==='Birthday'?'🎂':'🥂'} {t}</div>
                  <div style={{color:'#64748b',lineHeight:1.6}}>
                    {t==='Birthday'?'"Happy Birthday [Name]! Wishing you joy and success. — HR Team"':'"Happy Work Anniversary [Name]! [N] years of great service. — HR Team"'}
                  </div>
                  <button style={{marginTop:6,padding:'3px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:'#f8fafc',fontSize:8,cursor:'pointer'}}>✏️ Edit Template</button>
                </div>
              ))}
            </div>
          </div>

          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{notify('✅ Settings saved! Auto-wishes active at 7:00 AM')}} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>💾 Save Settings</button>
            <button onClick={()=>{setTestMode(true);notify('🧪 Test wish sent to your phone/email!')}} style={{padding:'11px 18px',borderRadius:10,border:'1px solid '+A,color:A,background:'#fff',fontSize:11,cursor:'pointer'}}>🧪 Send Test</button>
          </div>
        </div>
      )}

      {/* Wish Modal */}
      {wishModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setWishModal(null)}>
          <div style={{background:'#fff',borderRadius:18,padding:28,width:520,maxWidth:'95vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,borderRadius:12,padding:'14px 18px',marginBottom:18,color:'#fff',display:'flex',gap:12,alignItems:'center'}}>
              <div style={{fontSize:28}}>{wishModal.type==='birthday'?'🎂':'🥂'}</div>
              <div>
                <div style={{fontWeight:900,fontSize:14}}>{wishModal.name}</div>
                <div style={{fontSize:9,opacity:.8}}>{wishModal.dept} · {wishModal.type==='birthday'?'Birthday':'Work Anniversary '+(wishModal.years||'')+'yr'}</div>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>✍️ Customize Wish Message</label>
              <textarea value={customMsg} onChange={e=>setCustomMsg(e.target.value)} rows={8}
                style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:10,outline:'none',resize:'vertical',boxSizing:'border-box',lineHeight:1.7}}/>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:9,fontWeight:700,color:'#374151',marginBottom:8}}>📡 Send via:</div>
              <div style={{display:'flex',gap:8}}>
                {[['💬','WhatsApp',autoConfig.whatsapp],['📱','Viber',autoConfig.viber],['📧','Email',autoConfig.email]].map(([icon,label,active])=>(
                  <span key={label} style={{fontSize:9,padding:'4px 12px',borderRadius:9,background:active?`${A}15`:'#f1f5f9',color:active?A:'#94a3b8',fontWeight:700}}>{icon} {label}</span>
                ))}
              </div>
              <div style={{fontSize:9,color:'#64748b',marginTop:6}}>To: {wishModal.phone} · {wishModal.email}</div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={sendWish} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>🎉 Send Wish Now</button>
              <button onClick={()=>setWishModal(null)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
