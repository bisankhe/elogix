// FILE: HolidayCalendarPage.jsx - Holiday Calendar (Luxury HRIS)
// Global Holiday Matrix: Nepal + regional + floating holidays

import { useState, useEffect } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#065f46 0%,#10b981 60%,#34d399 100%)'
const A = '#065f46'

const MONTHS_BS = ['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra']
const MONTHS_AD = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const HOLIDAYS_2081 = [
  // Statutory (Mandatory) - Nepal Public Holidays
  {id:'h1',name:'Prithvi Narayan Shah Jayanti',nepali:'पृथ्वी नारायण शाह जयन्ती',date_bs:'2081-09-27',date_ad:'2025-01-10',type:'statutory',category:'national',paid:true,applicable:'all',region:'Nepal',color:'#dc2626',optional:false},
  {id:'h2',name:'Martyrs Day',nepali:'शहिद दिवस',date_bs:'2081-10-16',date_ad:'2025-01-30',type:'statutory',category:'national',paid:true,applicable:'all',region:'Nepal',color:'#dc2626',optional:false},
  {id:'h3',name:'Democracy Day (Prajatantra Diwas)',nepali:'प्रजातन्त्र दिवस',date_bs:'2081-11-07',date_ad:'2025-02-19',type:'statutory',category:'national',paid:true,applicable:'all',region:'Nepal',color:'#dc2626',optional:false},
  {id:'h4',name:'International Women Day',nepali:'अन्तर्राष्ट्रिय महिला दिवस',date_bs:'2081-11-24',date_ad:'2025-03-08',type:'statutory',category:'international',paid:true,applicable:'all',region:'Nepal',color:'#8b5cf6',optional:false},
  {id:'h5',name:'Holi',nepali:'होली',date_bs:'2081-11-28',date_ad:'2025-03-12',type:'cultural',category:'religious',paid:true,applicable:'all',region:'Nepal-Terai',color:'#f59e0b',optional:false},
  {id:'h6',name:'Holi (Hills)',nepali:'होली (पहाड)',date_bs:'2081-11-29',date_ad:'2025-03-13',type:'cultural',category:'religious',paid:true,applicable:'all',region:'Nepal-Hills',color:'#f59e0b',optional:false},
  {id:'h7',name:'New Year (Naya Barsha)',nepali:'नयाँ वर्ष',date_bs:'2082-01-01',date_ad:'2025-04-14',type:'statutory',category:'national',paid:true,applicable:'all',region:'Nepal',color:'#dc2626',optional:false},
  {id:'h8',name:'International Labour Day',nepali:'श्रमिक दिवस',date_bs:'2082-01-18',date_ad:'2025-05-01',type:'statutory',category:'international',paid:true,applicable:'all',region:'Nepal',color:'#3b82f6',optional:false},
  {id:'h9',name:'Republic Day (Ganatantra Diwas)',nepali:'गणतन्त्र दिवस',date_bs:'2082-01-15',date_ad:'2025-04-28',type:'statutory',category:'national',paid:true,applicable:'all',region:'Nepal',color:'#dc2626',optional:false},
  {id:'h10',name:'Ubhauli/Buddha Jayanti',nepali:'बुद्ध जयन्ती',date_bs:'2082-02-12',date_ad:'2025-05-26',type:'cultural',category:'religious',paid:true,applicable:'all',region:'Nepal',color:'#f59e0b',optional:false},
  {id:'h11',name:'Eid-ul-Adha',nepali:'ईद-उल-अधा',date_bs:'2082-03-08',date_ad:'2025-06-07',type:'cultural',category:'religious',paid:true,applicable:'all',region:'Nepal',color:'#f59e0b',optional:true},
  {id:'h12',name:'Teej',nepali:'तीज',date_bs:'2082-05-19',date_ad:'2025-09-02',type:'cultural',category:'religious',paid:true,applicable:'women',region:'Nepal',color:'#ec4899',optional:false},
  {id:'h13',name:'Indra Jatra',nepali:'इन्द्र जात्रा',date_bs:'2082-05-24',date_ad:'2025-09-07',type:'cultural',category:'religious',paid:true,applicable:'ktm',region:'Kathmandu Valley',color:'#8b5cf6',optional:false},
  {id:'h14',name:'Dashain (Ghatasthapana)',nepali:'घटस्थापना',date_bs:'2082-06-09',date_ad:'2025-09-22',type:'cultural',category:'major_festival',paid:true,applicable:'all',region:'Nepal',color:'#ef4444',optional:false},
  {id:'h15',name:'Dashain (Fulpati)',nepali:'फूलपाती',date_bs:'2082-06-15',date_ad:'2025-09-28',type:'cultural',category:'major_festival',paid:true,applicable:'all',region:'Nepal',color:'#ef4444',optional:false},
  {id:'h16',name:'Dashain (Maha Ashtami)',nepali:'महाअष्टमी',date_bs:'2082-06-16',date_ad:'2025-09-29',type:'cultural',category:'major_festival',paid:true,applicable:'all',region:'Nepal',color:'#ef4444',optional:false},
  {id:'h17',name:'Dashain (Maha Nawami)',nepali:'महानवमी',date_bs:'2082-06-17',date_ad:'2025-09-30',type:'cultural',category:'major_festival',paid:true,applicable:'all',region:'Nepal',color:'#ef4444',optional:false},
  {id:'h18',name:'Dashain (Vijaya Dashami)',nepali:'विजया दशमी',date_bs:'2082-06-18',date_ad:'2025-10-01',type:'statutory',category:'major_festival',paid:true,applicable:'all',region:'Nepal',color:'#dc2626',optional:false},
  {id:'h19',name:'Dashain (Ekadashi)',nepali:'एकादशी',date_bs:'2082-06-19',date_ad:'2025-10-02',type:'cultural',category:'major_festival',paid:true,applicable:'all',region:'Nepal',color:'#ef4444',optional:false},
  {id:'h20',name:'Tihar (Dhanteras)',nepali:'धनतेरस',date_bs:'2082-07-04',date_ad:'2025-10-17',type:'cultural',category:'major_festival',paid:true,applicable:'all',region:'Nepal',color:'#f59e0b',optional:false},
  {id:'h21',name:'Tihar (Laxmi Puja / Deepawali)',nepali:'लक्ष्मी पूजा',date_bs:'2082-07-05',date_ad:'2025-10-18',type:'statutory',category:'major_festival',paid:true,applicable:'all',region:'Nepal',color:'#dc2626',optional:false},
  {id:'h22',name:'Tihar (Mha Puja)',nepali:'म्ह पूजा',date_bs:'2082-07-06',date_ad:'2025-10-19',type:'cultural',category:'major_festival',paid:true,applicable:'all',region:'Nepal',color:'#f59e0b',optional:false},
  {id:'h23',name:'Tihar (Bhai Tika)',nepali:'भाइटीका',date_bs:'2082-07-07',date_ad:'2025-10-20',type:'statutory',category:'major_festival',paid:true,applicable:'all',region:'Nepal',color:'#dc2626',optional:false},
  {id:'h24',name:'Constitution Day',nepali:'संविधान दिवस',date_bs:'2082-06-03',date_ad:'2025-09-19',type:'statutory',category:'national',paid:true,applicable:'all',region:'Nepal',color:'#dc2626',optional:false},
  {id:'h25',name:'Christmas',nepali:'क्रिसमस',date_bs:'2082-09-10',date_ad:'2025-12-25',type:'cultural',category:'religious',paid:false,applicable:'optional',region:'Global',color:'#10b981',optional:true},
]

const TYPE_COLORS = {statutory:'#dc2626',cultural:'#f59e0b',optional:'#10b981',floating:'#8b5cf6'}
const TYPE_LABELS = {statutory:'Statutory',cultural:'Cultural',optional:'Optional/Floating',floating:'Floating'}
const CTX_ACTIONS = [
  {icon:'👁',label:'View Holiday Details',key:'view'},
  {icon:'✏',label:'Edit Holiday',key:'edit'},
  {icon:'👥',label:'Who Gets This Holiday',key:'employees'},
  {icon:'📅',label:'Add to Leave Calendar',key:'leave'},
  {icon:'💰',label:'Payroll Impact',key:'payroll'},
  {icon:'🔗',label:'Impact Analysis',key:'impact'},
  {icon:'📤',label:'Export',key:'export'},
  {icon:'🗑',label:'Remove Holiday',key:'remove',danger

:true},
]


// ── Tenant context ────────────────────────────────────────────
function useCompanyCtx() {
  const auth   = (() => { try { return JSON.parse(localStorage.getItem('elogix_auth')||'{}') } catch { return {} } })()
  const regCos = (() => { try { return JSON.parse(localStorage.getItem('elogix_registered_companies')||'{}') } catch { return {} } })()
  const slug   = auth.company?.slug || auth.user?.company || 'demo'
  return {
    company_id:   auth.company?.id || slug,
    company_name: auth.company?.name || regCos[slug]?.name || 'Your Company',
    company_slug: slug,
    plan:         auth.company?.plan || 'trial',
    currency:     auth.company?.currency || 'NPR',
    token:        localStorage.getItem('elogix_token') || auth.token || '',

export default function HolidayCalendarPage() {
  const ctx = useCompanyCtx()  // Tenant scope

  const [holidays, setHolidays] = useState(HOLIDAYS_2081)
  const [view, setView] = useState('matrix')
  const [filterType, setFilterType] = useState('all')
  const [calMode, setCalMode] = useState('BS')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [search, setSearch] = useState('')
  const [addForm, setAddForm] = useState({name:'',nepali:'',date_bs:'',date_ad:'',type:'statutory',region:'Nepal',optional:false,paid:true})

  const filtered = holidays.filter(h=>{
    if(filterType!=='all'&&h.type!==filterType) return false
    if(search&&!h.name.toLowerCase().includes(search.toLowerCase())&&!h.nepali.includes(search)) return false
    return true
  })

  const statutory = holidays.filter(h=>h.type==='statutory').length
  const cultural  = holidays.filter(h=>h.type==='cultural').length
  const optional  = holidays.filter(h=>h.optional).length

  // Group by month for matrix view
  const byMonth = {}
  filtered.forEach(h=>{
    const mKey = calMode==='BS' ? h.date_bs?.substring(5,7) : h.date_ad?.substring(5,7)
    const mNum = parseInt(mKey||'0')
    if(!byMonth[mNum]) byMonth[mNum]=[]
    byMonth[mNum].push(h)
  })

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="📅" title="Holiday Calendar 2081/82 BS"
        breadcrumb="Organization Management > Workforce Configuration"
        gradient={G}
        stats={[
          {icon:'📅',label:'Total Holidays',value:holidays.length},
          {icon:'🔴',label:'Statutory',     value:statutory},
          {icon:'🟡',label:'Cultural',      value:cultural},
          {icon:'🟢',label:'Optional',      value:optional},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add Holiday"
        onExcel={()=>setShowExcel(true)}
      />

      {/* Controls */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search holidays..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:8}}>
          {['all','statutory','cultural','optional'].map(t=>(
            <button key={t} onClick={()=>setFilterType(t)}
              style={{padding:'7px 12px',borderRadius:6,border:'none',cursor:'pointer',
                background:filterType===t?'#fff':'transparent',
                color:filterType===t?'#0f172a':'#64748b',fontSize:11,fontWeight:filterType===t?700:400,
                boxShadow:filterType===t?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {t==='all'?'All Types':t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:8,marginLeft:'auto'}}>
          {['BS','AD'].map(m=>(
            <button key={m} onClick={()=>setCalMode(m)}
              style={{padding:'7px 14px',borderRadius:6,border:'none',cursor:'pointer',
                background:calMode===m?A:'transparent',color:calMode===m?'#fff':'#64748b',fontSize:11,fontWeight:700}}>
              {m}
            </button>
          ))}
        </div>
        {['matrix','list'].map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{padding:'9px 14px',borderRadius:8,border:`1.5px solid ${view===v?A:'#e2e8f0'}`,background:view===v?'#f0fdf4':'#fff',color:view===v?A:'#64748b',fontSize:11,fontWeight:600,cursor:'pointer'}}>
            {v==='matrix'?'Monthly Matrix':'List View'}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        {Object.entries(TYPE_COLORS).map(([t,c])=>(
          <div key={t} style={{display:'flex',gap:5,alignItems:'center',fontSize:11,color:'#475569'}}>
            <div style={{width:12,height:12,borderRadius:3,background:c,flexShrink:0}}/>
            {TYPE_LABELS[t]}
          </div>
        ))}
      </div>

      {/* MATRIX VIEW */}
      {view==='matrix' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
          {[...Array(12)].map((_,i)=>{
            const mNum = i+1
            const mHols = byMonth[mNum]||[]
            const mName = calMode==='BS'?MONTHS_BS[i]:MONTHS_AD[i]
            return (
              <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
                <div style={{background:`linear-gradient(135deg,${A}15,${A}05)`,padding:'10px 14px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{mName}</div>
                  <div style={{fontSize:11,color:A,fontWeight:700}}>{mHols.length} holidays</div>
                </div>
                <div style={{padding:'8px 12px',minHeight:60}}>
                  {mHols.length===0
                    ? <div style={{fontSize:11,color:'#94a3b8',textAlign:'center',padding:'12px 0'}}>No holidays</div>
                    : mHols.map(h=>(
                      <div key={h.id}
                        onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:h.name,...h}})}}
                        style={{display:'flex',gap:8,alignItems:'flex-start',padding:'5px 0',borderBottom:'1px solid #f8fafc',cursor:'pointer'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <div style={{width:4,height:4,borderRadius:2,background:h.color,flexShrink:0,marginTop:5}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,fontWeight:600,color:'#0f172a',lineHeight:1.3}}>{h.name}</div>
                          <div style={{fontSize:9,color:'#94a3b8'}}>{calMode==='BS'?h.date_bs:h.date_ad} &bull; {h.region}</div>
                        </div>
                        <div style={{display:'flex',gap:3,flexShrink:0}}>
                          {h.optional&&<span style={{background:'#f0fdf4',color:'#15803d',fontSize:8,padding:'1px 5px',borderRadius:8,fontWeight:700}}>OPT</span>}
                          {h.paid&&<span style={{background:'#eff6ff',color:'#1d4ed8',fontSize:8,padding:'1px 5px',borderRadius:8,fontWeight:700}}>PAID</span>}
                        </div>
                      </div>
                    ))
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {view==='list' && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:'linear-gradient(135deg,#f0fdf4,#eff6ff)'}}>
                  {['#','Holiday Name','Nepali Name','Date BS','Date AD','Type','Category','Region','Paid','Optional'].map(h=>(
                    <th key={h} style={{padding:'12px 12px',textAlign:'left',fontSize:10,fontWeight:800,color:A,borderBottom:`2px solid ${A}22`,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((h,i)=>(
                  <tr key={h.id}
                    onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:h.name,...h}})}}
                    style={{borderBottom:'1px solid #f8fafc',cursor:'pointer'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#f0fdf4'}
                    onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    <td style={{padding:'10px 12px',color:'#94a3b8',fontSize:11}}>{i+1}</td>
                    <td style={{padding:'10px 12px'}}>
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        <div style={{width:8,height:8,borderRadius:2,background:h.color,flexShrink:0}}/>
                        <span style={{fontWeight:700,color:'#0f172a'}}>{h.name}</span>
                      </div>
                    </td>
                    <td style={{padding:'10px 12px',color:'#64748b',fontFamily:'Noto Sans Devanagari,sans-serif'}}>{h.nepali}</td>
                    <td style={{padding:'10px 12px',fontFamily:'monospace',color:A,fontWeight:700}}>{h.date_bs}</td>
                    <td style={{padding:'10px 12px',fontFamily:'monospace',color:'#64748b'}}>{h.date_ad}</td>
                    <td style={{padding:'10px 12px'}}><span style={{background:`${TYPE_COLORS[h.type]}18`,color:TYPE_COLORS[h.type],fontSize:9,padding:'2px 8px',borderRadius:20,fontWeight:700}}>{h.type}</span></td>
                    <td style={{padding:'10px 12px',color:'#64748b',fontSize:11,textTransform:'capitalize'}}>{h.category.replace('_',' ')}</td>
                    <td style={{padding:'10px 12px',color:'#64748b',fontSize:11}}>{h.region}</td>
                    <td style={{padding:'10px 12px',textAlign:'center'}}><span style={{color:h.paid?'#10b981':'#ef4444',fontWeight:700,fontSize:12}}>{h.paid?'Yes':'No'}</span></td>
                    <td style={{padding:'10px 12px',textAlign:'center'}}><span style={{color:h.optional?'#f59e0b':'#94a3b8',fontWeight:700,fontSize:12}}>{h.optional?'Yes':'-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'92vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px',position:'sticky',top:0,zIndex:10}}>
              <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ Add Holiday</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:3}}>Voice input enabled on all fields.</div>
            </div>
            <div style={{padding:'24px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Holiday Name (English)" value={addForm.name} onChange={v=>setAddForm(p=>({...p,name:v}))} required accent={A}/>
                <Field label="Holiday Name (Nepali)" value={addForm.nepali} onChange={v=>setAddForm(p=>({...p,nepali:v}))} accent={A}/>
                <Field label="Date (BS)" value={addForm.date_bs} onChange={v=>setAddForm(p=>({...p,date_bs:v}))} accent={A} hint="YYYY-MM-DD e.g. 2081-09-27"/>
                <Field label="Date (AD)" type="date" value={addForm.date_ad} onChange={v=>setAddForm(p=>({...p,date_ad:v}))} accent={A}/>
                <Field label="Holiday Type" type="select" value={addForm.type} onChange={v=>setAddForm(p=>({...p,type:v}))} accent={A}
                  options={['statutory','cultural','optional','floating']}/>
                <Field label="Region" type="select" value={addForm.region} onChange={v=>setAddForm(p=>({...p,region:v}))} accent={A}
                  options={['Nepal','Kathmandu Valley','Nepal-Hills','Nepal-Terai','Global','All Branches']}/>
              </div>
              <div style={{display:'flex',gap:16,margin:'12px 0'}}>
                {[['Paid Holiday',addForm.paid,'paid'],['Optional / Floating',addForm.optional,'optional']].map(([l,val,k])=>(
                  <label key={k} style={{display:'flex',gap:8,alignItems:'center',cursor:'pointer',fontSize:13,color:'#334155',fontWeight:500}}>
                    <input type="checkbox" checked={val} onChange={e=>setAddForm(p=>({...p,[k]:e.target.checked}))} style={{width:16,height:16,accentColor:A}}/>
                    {l}
                  </label>
                ))}
              </div>
              <AIImpact color={A} lines={[
                'Holiday links to Leave Management - auto-adjusts leave balance if worked.',
                'Statutory holidays affect payroll - paid holiday entitlement.',
                'Optional holidays let employees pick from floating pool.',
                'All branches/locations inherit this holiday automatically.',
              ]}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{setHolidays(p=>[...p,{...addForm,id:'h'+Date.now(),color:TYPE_COLORS[addForm.type]||'#64748b',applicable:'all'}]);setShowAdd(false)}}
                  style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Add Holiday</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={['Leave Management','Payroll','Attendance','Labour Compliance']} actions={CTX_ACTIONS} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel && <ExcelModal title="Holiday Calendar" columns={['Name','Nepali Name','Date BS','Date AD','Type','Category','Region','Paid (Y/N)','Optional (Y/N)']} onClose={()=>setShowExcel(false)} onImport={f=>alert('Importing: '+f.name)}/>}
    </div>
  )
