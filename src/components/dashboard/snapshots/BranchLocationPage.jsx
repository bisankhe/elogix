// FILE: BranchLocationPage.jsx - Luxury Branch & Location Setup

import { useState, useRef, useCallback } from 'react'

const THEME = {
  gradient:'linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%)',
  success:'#10b981', danger:'#ef4444',
}

const MOCK_BRANCHES = [
  { id:'br-001', code:'KTM-HQ', name:'Kathmandu Headquarters', short_name:'KTM HQ',
    type:'Headquarters', status:'active', country:'Nepal', province:'Bagmati Province',
    district:'Kathmandu', municipality:'Kathmandu Metropolitan', ward_no:'14',
    address:'Hattisar, Kathmandu 44600', phone:'+977-1-4567890',
    email:'hq@elogix.com.np', map_url:'https://maps.google.com',
    employees:850, cost_center:'CC-KTM-001', is_primary:true, icon:'🏛️',
    latitude:27.7172, longitude:85.3240,
    established:'2020-06-15', manager:'Rajesh Adhikari',
    impact_links:['Company Profile','Payroll','Attendance','Labour Office Zone','Cost Center','Tax Filing'],
  },
  { id:'br-002', code:'PKR-BR', name:'Pokhara Branch', short_name:'Pokhara',
    type:'Branch Office', status:'active', country:'Nepal', province:'Gandaki Province',
    district:'Kaski', municipality:'Pokhara Metropolitan', ward_no:'6',
    address:'Lakeside, Pokhara 33700', phone:'+977-61-521234',
    email:'pokhara@elogix.com.np', map_url:'',
    employees:145, cost_center:'CC-PKR-001', is_primary:false, icon:'🏢',
    latitude:28.2096, longitude:83.9856,
    established:'2021-09-01', manager:'Sushila Gurung',
    impact_links:['Payroll','Attendance','Leave Management','Labour Office Gandaki'],
  },
  { id:'br-003', code:'BRT-BR', name:'Biratnagar Branch', short_name:'Biratnagar',
    type:'Branch Office', status:'active', country:'Nepal', province:'Koshi Province',
    district:'Morang', municipality:'Biratnagar Metropolitan', ward_no:'4',
    address:'Traffic Chowk, Biratnagar 56613', phone:'+977-21-431234',
    email:'biratnagar@elogix.com.np', map_url:'',
    employees:120, cost_center:'CC-BRT-001', is_primary:false, icon:'🏢',
    latitude:26.4525, longitude:87.2718,
    established:'2022-01-15', manager:'Dipesh Rai',
    impact_links:['Payroll','Attendance','Labour Office Koshi'],
  },
  { id:'br-004', code:'IND-DL', name:'Delhi, India Office', short_name:'Delhi India',
    type:'International Office', status:'active', country:'India', province:'Delhi NCR',
    district:'New Delhi', municipality:'NDMC', ward_no:'',
    address:'Connaught Place, New Delhi 110001', phone:'+91-11-45678900',
    email:'delhi@elogixindia.com', map_url:'',
    employees:280, cost_center:'CC-DL-001', is_primary:false, icon:'🏬',
    latitude:28.6315, longitude:77.2167,
    established:'2021-04-01', manager:'Priya Mehta',
    impact_links:['GST Filing','EPFO','Payroll India','Shop & Establishment'],
  },
  { id:'br-005', code:'RMT-WFH', name:'Remote / Work From Home', short_name:'Remote',
    type:'Virtual', status:'active', country:'Various', province:'',
    district:'', municipality:'', ward_no:'',
    address:'Virtual - Multiple Locations', phone:'',
    email:'remote@elogix.com.np', map_url:'',
    employees:295, cost_center:'CC-RMT-001', is_primary:false, icon:'🏠',
    latitude:null, longitude:null,
    established:'2020-03-25', manager:'Bikram Shrestha (CTO)',
    impact_links:['Attendance (Remote)','Payroll','IT Access','VPN Policy'],
  },
]

const TYPE_COLORS = {
  'Headquarters':      '#667eea',
  'Branch Office':     '#10b981',
  'International Office':'#0ea5e9',
  'Virtual':           '#8b5cf6',
  'Regional Office':   '#f59e0b',
}

function ContextMenu({ x, y, item, onClose, onAction }) {
  const actions = [
    { icon:'👁️', label:'View Details',          key:'view'     },
    { icon:'✏️', label:'Edit Branch',           key:'edit'     },
    { icon:'📍', label:'View on Map',           key:'map'      },
    { icon:'👥', label:'View Employees',        key:'employees'},
    { icon:'💰', label:'View Cost Center',      key:'cost'     },
    { icon:'📋', label:'Impact Analysis',       key:'impact'   },
    { icon:'📊', label:'Branch Report',         key:'report'   },
    { icon:'📤', label:'Export to Excel',       key:'export'   },
    { icon:'🔄', label:'Sync Attendance',       key:'sync'     },
    { icon:'❄️', label:'Deactivate Branch',     key:'deactivate', danger:true },
  ]
  return (
    <div style={{ position:'fixed', zIndex:9999, left:x, top:y,
      background:'#fff', borderRadius:12, width:220,
      boxShadow:'0 20px 60px rgba(0,0,0,0.2)', border:'1px solid #e2e8f0', overflow:'hidden' }}>
      <div style={{ background:THEME.gradient, padding:'10px 14px' }}>
        <div style={{ fontSize:11, fontWeight:800, color:'#fff' }}>{item?.name}</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.8)', marginTop:1 }}>
          Affects: {item?.impact_links?.slice(0,3).join(' . ')}
        </div>
      </div>
      {actions.map((a,i) => (
        <div key={i} onClick={() => { onAction(a.key, item); onClose() }}
          style={{ padding:'8px 14px', display:'flex', alignItems:'center', gap:8,
            cursor:'pointer', fontSize:12,
            color: a.danger ? '#ef4444' : '#334155',
            borderBottom: i < actions.length-1 ? '1px solid #f8fafc':'none' }}
          onMouseEnter={e => e.currentTarget.style.background = a.danger?'#fef2f2':'#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
          <span>{a.icon}</span><span>{a.label}</span>
        </div>
      ))}
    </div>
  )
}

function useAudio(onResult) {
  const [listening, setListening] = useState(false)
  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Use Chrome for voice input'); return }
    const r = new SR(); r.lang='en-US'; r.continuous=false; r.interimResults=false
    r.onresult = e => { onResult(e.results[0][0].transcript); setListening(false) }
    r.onerror = () => setListening(false); r.onend = () => setListening(false)
    r.start(); setListening(true)
  }
  return { listening, start }
}

function LuxInput({ label, value, onChange, type='text', options, required, cols=1 }) {
  const { listening, start } = useAudio(t => onChange && onChange(t))
  const [focused, setFocused] = useState(false)
  const style = {
    width:'100%', padding:'10px 44px 10px 12px', borderRadius:10,
    border:`1.5px solid ${focused?'#0ea5e9':'#e2e8f0'}`, fontSize:13,
    outline:'none', boxSizing:'border-box',
    boxShadow: focused?'0 0 0 3px rgba(14,165,233,0.12)':'none',
    transition:'all .2s', background:'#fff'
  }
  return (
    <div style={{ marginBottom:14, gridColumn:`span ${cols}` }}>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#334155', marginBottom:4 }}>
        {label}{required&&<span style={{color:'#ef4444'}}> *</span>}
      </label>
      <div style={{ position:'relative' }}>
        {type==='select' ? (
          <select value={value} onChange={e=>onChange(e.target.value)}
            onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
            style={{...style, paddingRight:12, appearance:'auto'}}>
            <option value="">Select...</option>
            {options?.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
          </select>
        ) : (
          <input type={type} value={value} onChange={e=>onChange(e.target.value)}
            onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={style}/>
        )}
        <button onClick={start} title="Voice input"
          style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
            background: listening?'#ef4444':THEME.gradient, border:'none',
            borderRadius:6, width:26, height:26, color:'#fff', fontSize:12,
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {listening?'Stop':'🎤'}
        </button>
      </div>
    </div>
  )
}

function AddBranchModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    code:'', name:'', short_name:'', type:'Branch Office',
    country:'Nepal', province:'', district:'', municipality:'', ward_no:'',
    address:'', phone:'', email:'', manager:'', cost_center:'',
    established:'', employees:0
  })
  const set = k => v => setForm(p => ({...p, [k]:v}))
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:5000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, width:720, maxHeight:'92vh',
        overflow:'auto', boxShadow:'0 40px 80px rgba(0,0,0,.3)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'20px 28px', background:THEME.gradient, position:'sticky', top:0, zIndex:10 }}>
          <div style={{ fontSize:20, fontWeight:900, color:'#fff' }}>+ Add Branch / Location</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.8)', marginTop:2 }}>
            All fields support voice input via the mic button
          </div>
        </div>
        <div style={{ padding:'24px 28px' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#334155', marginBottom:12,
            paddingBottom:6, borderBottom:'2px solid #f1f5f9' }}>
            Basic Information
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
            <LuxInput label="Branch Code"  value={form.code}       onChange={set('code')}       required />
            <LuxInput label="Branch Name"  value={form.name}       onChange={set('name')}       required />
            <LuxInput label="Short Name"   value={form.short_name} onChange={set('short_name')} />
            <LuxInput label="Branch Type" type="select" value={form.type} onChange={set('type')}
              options={['Headquarters','Branch Office','Regional Office','International Office','Virtual','Project Site']} required />
          </div>
          <div style={{ fontSize:12, fontWeight:700, color:'#334155', marginBottom:12,
            paddingBottom:6, borderBottom:'2px solid #f1f5f9', marginTop:6 }}>
            Location Details
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
            <LuxInput label="Country" type="select" value={form.country} onChange={set('country')}
              options={['Nepal','India','United Kingdom','UAE','USA']} />
            <LuxInput label="Province / State" value={form.province} onChange={set('province')} />
            <LuxInput label="District" value={form.district} onChange={set('district')} />
            <LuxInput label="Municipality" value={form.municipality} onChange={set('municipality')} />
            <LuxInput label="Ward No." value={form.ward_no} onChange={set('ward_no')} />
            <LuxInput label="Phone" type="tel" value={form.phone} onChange={set('phone')} />
          </div>
          <LuxInput label="Full Address" value={form.address} onChange={set('address')} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
            <LuxInput label="Email" type="email" value={form.email} onChange={set('email')} />
            <LuxInput label="Branch Manager" value={form.manager} onChange={set('manager')} />
            <LuxInput label="Cost Center Code" value={form.cost_center} onChange={set('cost_center')} />
            <LuxInput label="Established Date" type="date" value={form.established} onChange={set('established')} />
          </div>
          <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:10,
            padding:'12px 14px', marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#0369a1', marginBottom:4 }}>
              🤖 AI Impact on Creating this Branch
            </div>
            <div style={{ fontSize:11, color:'#0284c7', lineHeight:1.6 }}>
              New branch will create: Cost Center, Payroll Group, Attendance Zone,
              Labour Office Zone link, and default Leave Policy assignment.
              HR policies will be automatically copied from HQ.
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => { onSave(form); onClose() }}
              style={{ flex:1, padding:'14px', borderRadius:12, border:'none',
                background:THEME.gradient, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              ✨ Create Branch
            </button>
            <button onClick={onClose}
              style={{ padding:'14px 24px', borderRadius:12, border:'1px solid #e2e8f0',
                background:'#fff', color:'#475569', fontSize:13, cursor:'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BranchLocationPage() {
  const [branches,    setBranches]    = useState(MOCK_BRANCHES)
  const [contextMenu, setContextMenu] = useState(null)
  const [showAdd,     setShowAdd]     = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [search,      setSearch]      = useState('')
  const [viewMode,    setViewMode]    = useState('cards') // cards | table

  const filtered = branches.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div onClick={() => setContextMenu(null)}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>

      {/* Header */}
      <div style={{ background:THEME.gradient, borderRadius:18, padding:'24px 28px', marginBottom:24, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-10, top:-10, width:150, height:150, borderRadius:'50%', background:'rgba(255,255,255,.08)' }}/>
        <div style={{ position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
            <span style={{ fontSize:32 }}>📍</span>
            <div>
              <h2 style={{ fontSize:24, fontWeight:900, color:'#fff', margin:0 }}>Branch & Location Setup</h2>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.8)', marginTop:2 }}>
                Organization Management &rsaquo; Organization Setup
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            {[
              { label:'Total Branches', value:branches.length,                                        icon:'📍' },
              { label:'Total Employees',value:branches.reduce((s,b)=>s+b.employees,0).toLocaleString(),icon:'👥' },
              { label:'Countries',      value:new Set(branches.map(b=>b.country)).size,                icon:'🌐' },
              { label:'Active',         value:branches.filter(b=>b.status==='active').length,          icon:'✅' },
            ].map((s,i) => (
              <div key={i} style={{ background:'rgba(255,255,255,.15)', borderRadius:10,
                padding:'8px 14px', backdropFilter:'blur(10px)' }}>
                <span style={{ fontSize:13 }}>{s.icon}</span>
                <span style={{ fontSize:16, fontWeight:800, color:'#fff', marginLeft:6 }}>{s.value}</span>
                <span style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginLeft:4 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:1, position:'relative', minWidth:200 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:'#94a3b8' }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search branches..."
            style={{ width:'100%', padding:'10px 14px 10px 36px', borderRadius:12, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box' }}/>
        </div>
        <div style={{ display:'flex', gap:4, background:'#f1f5f9', borderRadius:10, padding:3 }}>
          {['cards','table'].map(m => (
            <button key={m} onClick={()=>setViewMode(m)}
              style={{ padding:'6px 14px', borderRadius:8, border:'none', fontSize:11, fontWeight:600, cursor:'pointer',
                background:viewMode===m?'#fff':'transparent', color:viewMode===m?'#0f172a':'#64748b',
                boxShadow:viewMode===m?'0 1px 4px rgba(0,0,0,.08)':'none' }}>
              {m==='cards'?'Cards Cards':'Table Table'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ padding:'10px 20px', borderRadius:12, border:'none',
            background:THEME.gradient, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
          + Add Branch
        </button>
      </div>

      <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:10,
        padding:'8px 14px', marginBottom:16, fontSize:11, color:'#92400e' }}>
        💡 Right-click any branch card to view impact analysis and linked modules
      </div>

      {/* Cards view */}
      {viewMode === 'cards' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
          {filtered.map(branch => {
            const tc = TYPE_COLORS[branch.type] || '#64748b'
            return (
              <div key={branch.id}
                onClick={() => setSelected(branch)}
                onContextMenu={e => { e.preventDefault(); setContextMenu({x:e.clientX,y:e.clientY,item:branch}) }}
                style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0',
                  overflow:'hidden', cursor:'pointer', transition:'all .2s',
                  boxShadow:'0 2px 8px rgba(0,0,0,.06)', borderLeft:`4px solid ${tc}` }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 10px 30px rgba(0,0,0,.1)' }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.06)' }}>
                <div style={{ padding:'16px 16px 12px', display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{ width:46, height:46, borderRadius:12, background:`${tc}15`,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                    {branch.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:13, fontWeight:800, color:'#0f172a' }}>{branch.name}</span>
                      {branch.is_primary && <span style={{ background:'#eff6ff', color:'#1d4ed8',
                        fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:10 }}>HQ</span>}
                    </div>
                    <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>
                      {branch.code} &bull; {branch.country} &bull; {branch.employees} employees
                    </div>
                    <div style={{ marginTop:5 }}>
                      <span style={{ background:`${tc}15`, color:tc, fontSize:9, fontWeight:700,
                        padding:'2px 8px', borderRadius:20, border:`1px solid ${tc}30` }}>
                        {branch.type}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ padding:'8px 16px 14px', fontSize:11, color:'#64748b' }}>
                  <div style={{ marginBottom:3 }}>📍 {branch.address}</div>
                  {branch.phone && <div>📞 {branch.phone}</div>}
                  <div style={{ marginTop:6, fontSize:10, color:'#94a3b8' }}>
                    Manager: <strong style={{color:'#334155'}}>{branch.manager}</strong>
                  </div>
                </div>
              </div>
            )
          })}
          <div onClick={()=>setShowAdd(true)}
            style={{ border:'2px dashed #cbd5e1', borderRadius:16, minHeight:180,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'#94a3b8', gap:8, transition:'all .2s' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='#0ea5e9';e.currentTarget.style.color='#0ea5e9'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#cbd5e1';e.currentTarget.style.color='#94a3b8'}}>
            <span style={{fontSize:32}}>+</span>
            <span style={{fontSize:12,fontWeight:700}}>Add Branch / Location</span>
          </div>
        </div>
      )}

      {/* Table view */}
      {viewMode === 'table' && (
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Code','Name','Type','Country','Employees','Manager','Status'].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11,
                    fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b,i) => (
                <tr key={b.id}
                  onClick={() => setSelected(b)}
                  onContextMenu={e => { e.preventDefault(); setContextMenu({x:e.clientX,y:e.clientY,item:b}) }}
                  style={{ borderBottom:'1px solid #f8fafc', cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  <td style={{ padding:'11px 14px', fontWeight:700, color:'#334155' }}>{b.code}</td>
                  <td style={{ padding:'11px 14px' }}>{b.icon} {b.name}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ background:`${TYPE_COLORS[b.type]||'#64748b'}15`, color:TYPE_COLORS[b.type]||'#64748b',
                      fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{b.type}</span>
                  </td>
                  <td style={{ padding:'11px 14px', color:'#64748b' }}>{b.country}</td>
                  <td style={{ padding:'11px 14px', fontWeight:700 }}>{b.employees}</td>
                  <td style={{ padding:'11px 14px', color:'#64748b' }}>{b.manager}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ background:'#f0fdf4', color:'#15803d', fontSize:10, fontWeight:700,
                      padding:'2px 8px', borderRadius:20 }}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} item={contextMenu.item}
          onClose={() => setContextMenu(null)}
          onAction={(action, item) => {
            if (action==='view') setSelected(item)
            if (action==='map' && item.latitude) window.open(`https://maps.google.com/?q=${item.latitude},${item.longitude}`)
          }} />
      )}

      {showAdd && <AddBranchModal onClose={()=>setShowAdd(false)}
        onSave={b => setBranches(p=>[...p,{...b,id:'br-'+Date.now(),status:'active',employees:0,icon:'🏢',is_primary:false,impact_links:['Payroll','Attendance']}])} />}

      {/* Detail Drawer */}
      {selected && (
        <div style={{ position:'fixed', right:0, top:0, bottom:0, width:420,
          background:'#fff', boxShadow:'-20px 0 60px rgba(0,0,0,.15)', zIndex:4000,
          overflow:'auto', animation:'fadeIn .2s ease' }}>
          <div style={{ padding:'20px 24px', background:THEME.gradient }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>{selected.name}</div>
              <button onClick={()=>setSelected(null)}
                style={{ background:'rgba(255,255,255,.2)', border:'none', borderRadius:8,
                  width:30, height:30, color:'#fff', cursor:'pointer', fontSize:16 }}>x</button>
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:2 }}>
              {selected.type} &bull; {selected.code}
            </div>
          </div>
          <div style={{ padding:'20px 24px' }}>
            {[
              ['Country',   selected.country],   ['Province',  selected.province],
              ['District',  selected.district],   ['Address',   selected.address],
              ['Phone',     selected.phone],      ['Email',     selected.email],
              ['Manager',   selected.manager],    ['Employees', selected.employees],
              ['Cost Center',selected.cost_center],['Established',selected.established],
            ].filter(([,v])=>v).map(([l,v],i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between',
                padding:'8px 0', borderBottom:'1px solid #f8fafc', fontSize:12 }}>
                <span style={{color:'#64748b'}}>{l}</span>
                <span style={{fontWeight:700,color:'#0f172a',textAlign:'right',maxWidth:'65%'}}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop:16, padding:'12px 14px', background:'#f0f9ff',
              borderRadius:10, border:'1px solid #bae6fd' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#0369a1', marginBottom:6 }}>
                🔗 Impact Links
              </div>
              {selected.impact_links?.map((link,i) => (
                <div key={i} style={{ fontSize:11, color:'#0284c7', padding:'2px 0',
                  display:'flex', alignItems:'center', gap:6 }}>
                  <span>&#8594;</span> {link}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
