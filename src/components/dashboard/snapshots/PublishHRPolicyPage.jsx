// FILE: PublishHRPolicyPage.jsx — Compliance & Risk > Compliance Management > Publish HR Policy
// CEO / CHRO / HR Head reviews drafts → approves → publishes
// On publish: saves to Library + Implementation + initialises reader records + notifies ALL staff

import { useState, useMemo } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const G  = 'linear-gradient(135deg,#064e3b 0%,#065f46 50%,#047857 100%)'
const P  = '#047857'

export const DRAFT_KEY   = 'elogix_policy_drafts_v2'
export const LIBRARY_KEY = 'elogix_policy_library_v2'
export const IMPL_KEY    = 'elogix_policy_impl_v2'
export const READERS_KEY = 'elogix_policy_readers_v2'

const EMPLOYEES = [
  { id:'e1',  name:'Bikash Shrestha',  dept:'Engineering', email:'bikash@co.com',  phone:'+977-9801234567' },
  { id:'e2',  name:'Anita Gurung',     dept:'Engineering', email:'anita@co.com',   phone:'+977-9812345678' },
  { id:'e3',  name:'Hari Thapa',       dept:'Engineering', email:'hari@co.com',    phone:'+977-9823456789' },
  { id:'e4',  name:'Maya Pradhan',     dept:'Finance',     email:'maya@co.com',    phone:'+977-9834567890' },
  { id:'e5',  name:'Sandeep Tamang',   dept:'Finance',     email:'sandeep@co.com', phone:'+977-9845678901' },
  { id:'e6',  name:'Priya Maharjan',   dept:'Sales',       email:'priya@co.com',   phone:'+977-9856789012' },
  { id:'e7',  name:'Suresh KC',        dept:'IT',          email:'suresh@co.com',  phone:'+977-9867890123' },
  { id:'e8',  name:'Laxmi Karki',      dept:'Operations',  email:'laxmi@co.com',   phone:'+977-9878901234' },
  { id:'e9',  name:'Ramesh Koirala',   dept:'HR',          email:'ramesh@co.com',  phone:'+977-9889012345' },
  { id:'e10', name:'Gita Shrestha',    dept:'IT',          email:'gita@co.com',    phone:'+977-9890123456' },
  { id:'e11', name:'Deepak Rana',      dept:'Sales',       email:'deepak@co.com',  phone:'+977-9801122334' },
  { id:'e12', name:'Sunita Shrestha',  dept:'Marketing',   email:'sunita@co.com',  phone:'+977-9812233445' },
  { id:'e13', name:'Arjun Tamang',     dept:'Admin',       email:'arjun@co.com',   phone:'+977-9823344556' },
  { id:'e14', name:'Bina Magar',       dept:'Operations',  email:'bina@co.com',    phone:'+977-9834455667' },
  { id:'e15', name:'Dev Lama',         dept:'IT',          email:'dev@co.com',     phone:'+977-9845566778' },
]

const CAT_CFG = {
  EMP:{ icon:'📋', color:'#3b82f6' }, WBP:{ icon:'🤝', color:'#8b5cf6' },
  RCP:{ icon:'💰', color:'#10b981' }, SCP:{ icon:'🛡️', color:'#ef4444' },
  ECA:{ icon:'📅', color:'#f59e0b' }, LWS:{ icon:'🏖️', color:'#06b6d4' },
  WRT:{ icon:'💻', color:'#f97316' }, LDP:{ icon:'🎓', color:'#a855f7' },
}

const STATUS_CFG = {
  draft:            { bg:'#fef9c3', color:'#854d0e', label:'Draft'            },
  pending_approval: { bg:'#dbeafe', color:'#1e40af', label:'Pending Approval' },
  approved:         { bg:'#dcfce7', color:'#15803d', label:'Approved'         },
  rejected:         { bg:'#fee2e2', color:'#dc2626', label:'Rejected'         },
  published:        { bg:'#d1fae5', color:'#065f46', label:'🟢 Published'     },
}

export default function PublishHRPolicyPage() {
  const { navTo } = useApp()
  const [drafts,      setDrafts]      = useState(() => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)||'[]') } catch { return [] } })
  const [selected,    setSelected]    = useState(null)
  const [publishing,  setPublishing]  = useState(false)
  const [rejectNote,  setRejectNote]  = useState('')
  const [showReject,  setShowReject]  = useState(false)
  const [msg,         setMsg]         = useState('')
  const [filterStatus,setFilterStatus]= useState('all')

  const updateDraft = (id, patch) => {
    const updated = drafts.map(d => d.id===id ? {...d,...patch} : d)
    setDrafts(updated)
    localStorage.setItem(DRAFT_KEY, JSON.stringify(updated))
    if (selected?.id===id) setSelected(s=>({...s,...patch}))
  }

  const approve = () => updateDraft(selected.id, { status:'approved', approvedAt:new Date().toISOString() })

  const reject = () => {
    if (!rejectNote.trim()) { alert('Please enter a rejection reason.'); return }
    updateDraft(selected.id, { status:'rejected', rejectionNote:rejectNote, rejectedAt:new Date().toISOString() })
    setShowReject(false); setRejectNote('')
  }

  const publish = async (draft) => {
    setPublishing(true)
    const publishedAt = new Date().toISOString()
    const published   = { ...draft, status:'published', publishedAt, version:'1.0' }

    // 1. Library
    const lib = JSON.parse(localStorage.getItem(LIBRARY_KEY)||'[]').filter(p=>p.id!==draft.id)
    localStorage.setItem(LIBRARY_KEY, JSON.stringify([published, ...lib].slice(0,200)))

    // 2. Implementation tracking
    const impl = JSON.parse(localStorage.getItem(IMPL_KEY)||'[]').filter(p=>p.id!==draft.id)
    impl.unshift({ id:draft.id, title:draft.title, control:draft.control, cat:draft.cat, mandatory:draft.mandatory, publishedAt, audience:draft.audience, steps:{ notify:true, training:false, read:false, ack:false, qa:false, monitor:false } })
    localStorage.setItem(IMPL_KEY, JSON.stringify(impl.slice(0,200)))

    // 3. Initialise reader records for every employee (all unread/unsigned)
    const readers = JSON.parse(localStorage.getItem(READERS_KEY)||'{}')
    readers[draft.id] = EMPLOYEES.reduce((m,e) => { m[e.id] = { name:e.name, dept:e.dept, email:e.email, phone:e.phone, readAt:null, signedAt:null }; return m }, {})
    localStorage.setItem(READERS_KEY, JSON.stringify(readers))

    // 4. Mark draft as published
    updateDraft(draft.id, { status:'published', publishedAt })

    // 5. HRIS Notification bar — all employees
    const notifs = JSON.parse(localStorage.getItem('elogix_hris_notifications')||'[]')
    notifs.unshift({
      id:      `POL-PUB-${Date.now()}`,
      cat:     'Action Required',
      icon:    '📋',
      title:   `New Policy Published: "${draft.title}" — Please Read & Sign`,
      body:    `${draft.audience} · Effective ${draft.effectiveDate||'immediately'} · Digital signature required within 7 days`,
      action:  'HR Policy Library',
      actionId:'hr-policy-library',
      time:    'Just now',
      unread:  true,
    })
    // New joiner auto-notification stored separately
    localStorage.setItem('elogix_new_joiner_policies', JSON.stringify(
      [...(JSON.parse(localStorage.getItem('elogix_new_joiner_policies')||'[]')), draft.id]
    ))
    localStorage.setItem('elogix_hris_notifications', JSON.stringify(notifs.slice(0,100)))

    setPublishing(false)
    setMsg(`✅ "${draft.title}" published successfully! All ${EMPLOYEES.length} employees notified via Email · WhatsApp · Viber · Dashboard.`)
    setTimeout(() => setMsg(''), 5000)
  }

  const filtered = useMemo(() => drafts.filter(d => filterStatus==='all' || d.status===filterStatus), [drafts, filterStatus])
  const pending  = drafts.filter(d=>d.status==='pending_approval').length

  const Card = ({ children }) => (
    <div style={{ background:'#fff', borderRadius:14, padding:24, border:'1px solid #e2e8f0', boxShadow:'0 2px 12px rgba(0,0,0,.05)' }}>{children}</div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, fontFamily:'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ background:G, borderRadius:16, padding:'22px 28px', boxShadow:'0 4px 24px rgba(4,120,87,.3)' }}>
        <div style={{ fontSize:8, color:'rgba(255,255,255,.5)', marginBottom:4, letterSpacing:1, textTransform:'uppercase' }}>Compliance & Risk Management › Compliance Management</div>
        <div style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:-.3 }}>✅ Publish HR Policy</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:4 }}>CEO / CHRO / HR Head review · Approve or reject · Publish to all employees with one click</div>
        <div style={{ display:'flex', gap:10, marginTop:14, flexWrap:'wrap', alignItems:'center' }}>
          {[
            { icon:'📋', label:'Total Drafts',       val:drafts.length },
            { icon:'⏳', label:'Pending Approval',    val:pending, alert:pending>0 },
            { icon:'🟢', label:'Published',           val:drafts.filter(d=>d.status==='published').length },
            { icon:'❌', label:'Rejected',            val:drafts.filter(d=>d.status==='rejected').length },
          ].map((s,i)=>(
            <div key={i} style={{ background:'rgba(255,255,255,.12)', borderRadius:10, padding:'6px 16px' }}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.7)' }}>{s.icon} {s.label}</div>
              <div style={{ fontSize:18, fontWeight:900, color:s.alert&&s.val>0?'#fca5a5':'#fff' }}>{s.val}</div>
            </div>
          ))}
          <button onClick={()=>navTo?.('draft-hr-policy')} style={{ marginLeft:'auto', padding:'8px 16px', borderRadius:10, border:'none', background:'rgba(255,255,255,.2)', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>📝 Create New Draft →</button>
        </div>
        {msg && <div style={{ marginTop:12, fontSize:10, color:'rgba(255,255,255,.95)', fontWeight:700, background:'rgba(255,255,255,.15)', padding:'8px 14px', borderRadius:8 }}>{msg}</div>}
      </div>

      {/* Reject modal */}
      {showReject && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, maxWidth:440, width:'90%', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', marginBottom:6 }}>Reject Policy Draft</div>
            <div style={{ fontSize:10, color:'#64748b', marginBottom:16 }}>"{selected?.title}" — Please provide a reason so the drafter can revise.</div>
            <textarea value={rejectNote} onChange={e=>setRejectNote(e.target.value)} rows={4} placeholder="e.g. Needs more specific provisions, missing Labour Act references, purpose section too vague..."
              style={{ width:'100%', padding:'10px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:11, resize:'none', outline:'none', marginBottom:16, boxSizing:'border-box' }}/>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setShowReject(false)} style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontSize:11, fontWeight:700, cursor:'pointer' }}>Cancel</button>
              <button onClick={reject} style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:'#ef4444', color:'#fff', fontSize:11, fontWeight:800, cursor:'pointer' }}>❌ Reject with Note</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:16 }}>

        {/* Draft list */}
        <div>
          <div style={{ display:'flex', gap:4, marginBottom:10, background:'#f8fafc', borderRadius:10, padding:3 }}>
            {[['all','All'],['pending_approval','Pending'],['approved','Approved'],['published','Published'],['rejected','Rejected']].map(([v,l])=>(
              <button key={v} onClick={()=>setFilterStatus(v)} style={{ flex:1, padding:'5px 4px', borderRadius:8, border:'none', background:filterStatus===v?'#fff':'transparent', color:filterStatus===v?P:'#64748b', fontWeight:filterStatus===v?800:400, fontSize:8, cursor:'pointer', boxShadow:filterStatus===v?'0 1px 3px rgba(0,0,0,.08)':'none' }}>{l}</button>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {filtered.length===0 ? (
              <div style={{ textAlign:'center', padding:32, color:'#94a3b8', background:'#fff', borderRadius:12, border:'1px solid #e2e8f0' }}>
                {filterStatus==='all' ? (
                  <><div style={{ fontSize:28, marginBottom:8 }}>📭</div><div style={{ fontSize:11, fontWeight:600 }}>No drafts yet</div><div style={{ fontSize:9, marginTop:4 }}>Create a policy draft first.</div>
                  <button onClick={()=>navTo?.('draft-hr-policy')} style={{ marginTop:12, padding:'8px 16px', borderRadius:9, border:'none', background:G, color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>📝 Create Draft →</button></>
                ) : <><div style={{ fontSize:24, marginBottom:6 }}>🔍</div><div>No {filterStatus.replace('_',' ')} policies</div></>}
              </div>
            ) : filtered.map(d => {
              const cat = CAT_CFG[d.cat] || { icon:'📄', color:'#7c3aed' }
              const sc  = STATUS_CFG[d.status] || STATUS_CFG.draft
              const isSelected = selected?.id===d.id
              return (
                <div key={d.id} onClick={()=>setSelected(d)} style={{ padding:'12px 16px', borderRadius:12, border:`1.5px solid ${isSelected?P:'#e2e8f0'}`, background:isSelected?`${P}05`:'#fff', cursor:'pointer', transition:'all .2s', boxShadow:isSelected?`0 2px 12px ${P}20`:'0 1px 4px rgba(0,0,0,.04)' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>{cat.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:10, fontWeight:800, color:'#0f172a', lineHeight:1.3 }}>{d.title}</div>
                      <div style={{ fontSize:8, color:'#94a3b8', marginTop:3 }}>{d.control} · {d.audience}</div>
                      <div style={{ marginTop:6 }}>
                        <span style={{ fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:10, background:sc.bg, color:sc.color }}>{sc.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail / action panel */}
        {selected ? (
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:900, color:'#0f172a' }}>{selected.title}</div>
                <div style={{ fontSize:10, color:'#64748b', marginTop:4 }}>{selected.control} · v{selected.version||'1.0'} · {selected.audience} · {selected.company}</div>
                {selected.approver && <div style={{ fontSize:9, color:'#94a3b8', marginTop:2 }}>Requires approval from: <strong>{selected.approver}</strong></div>}
              </div>
              <span style={{ fontSize:9, fontWeight:800, padding:'4px 12px', borderRadius:12, background:STATUS_CFG[selected.status]?.bg, color:STATUS_CFG[selected.status]?.color, flexShrink:0 }}>
                {STATUS_CFG[selected.status]?.label}
              </span>
            </div>

            {/* Meta grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:20 }}>
              {[
                ['Owner',     selected.owner       ],
                ['Effective', selected.effectiveDate],
                ['Review',    selected.reviewCycle  ],
                ['Mandatory', selected.mandatory?'Yes':'No'],
                ['Category',  selected.catName||selected.cat],
                ['Created',   new Date(selected.createdAt||Date.now()).toLocaleDateString('en-GB')],
              ].map(([k,v])=>(
                <div key={k} style={{ background:'#f8fafc', borderRadius:8, padding:'8px 10px' }}>
                  <div style={{ fontSize:8, color:'#94a3b8', marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{v||'—'}</div>
                </div>
              ))}
            </div>

            {/* Tags */}
            {selected.laRefs?.length>0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:9, fontWeight:700, color:'#1e40af', marginBottom:5 }}>⚖️ Nepal Labour Act 2074 References</div>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {selected.laRefs.map(r=><span key={r} style={{ fontSize:7, fontWeight:700, padding:'2px 7px', borderRadius:8, background:'#eff6ff', color:'#1e40af' }}>{r}</span>)}
                </div>
              </div>
            )}
            {selected.linkedModules?.length>0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:9, fontWeight:700, color:'#15803d', marginBottom:5 }}>🔗 Linked HRIS Modules</div>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {selected.linkedModules.map(m=><span key={m} style={{ fontSize:7, fontWeight:700, padding:'2px 7px', borderRadius:8, background:'#f0fdf4', color:'#15803d' }}>{m}</span>)}
                </div>
              </div>
            )}

            {/* Policy content */}
            <div style={{ fontSize:10, fontWeight:700, color:'#374151', marginBottom:8 }}>Policy Content Preview</div>
            <div style={{ maxHeight:300, overflowY:'auto', background:'#fafafa', borderRadius:10, padding:'16px 18px', border:'1px solid #e2e8f0', fontSize:10, lineHeight:1.85, fontFamily:'"Times New Roman",Georgia,serif', whiteSpace:'pre-wrap', color:'#0f172a', marginBottom:20 }}>
              {selected.content || <span style={{ color:'#94a3b8', fontStyle:'italic' }}>No content yet. Please regenerate the policy in the Draft page.</span>}
            </div>

            {/* Rejection note */}
            {selected.status==='rejected' && selected.rejectionNote && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#dc2626', marginBottom:4 }}>❌ Rejection Reason</div>
                <div style={{ fontSize:10, color:'#991b1b' }}>{selected.rejectionNote}</div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {selected.status==='pending_approval' && (
                <>
                  <button onClick={approve} style={{ flex:1, padding:'12px', borderRadius:10, border:'none', background:'#059669', color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>✅ Approve</button>
                  <button onClick={()=>setShowReject(true)} style={{ padding:'12px 20px', borderRadius:10, border:'1px solid #ef4444', background:'#fff', color:'#ef4444', fontSize:12, fontWeight:700, cursor:'pointer' }}>❌ Reject</button>
                </>
              )}
              {(selected.status==='approved'||selected.status==='pending_approval') && (
                <button onClick={()=>publish(selected)} disabled={publishing}
                  style={{ flex:1, padding:'12px', borderRadius:10, border:'none', background:G, color:'#fff', fontSize:12, fontWeight:800, cursor:publishing?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  {publishing
                    ? <><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }}/> Publishing...</>
                    : `🚀 Publish to All ${EMPLOYEES.length} Employees →`}
                </button>
              )}
              {selected.status==='published' && (
                <div style={{ flex:1, padding:'12px', borderRadius:10, background:'#f0fdf4', border:'1px solid #bbf7d0', fontSize:11, fontWeight:700, color:'#15803d', textAlign:'center' }}>
                  🟢 Published · {EMPLOYEES.length} employees notified · In Policy Library
                </div>
              )}
              {selected.status==='rejected' && (
                <button onClick={()=>navTo?.('draft-hr-policy')} style={{ flex:1, padding:'12px', borderRadius:10, border:'none', background:G, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>📝 Revise in Draft →</button>
              )}
            </div>
          </Card>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#fff', borderRadius:14, border:'1px dashed #e2e8f0', minHeight:300, color:'#94a3b8' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>👈</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#374151' }}>Select a draft to review</div>
            <div style={{ fontSize:10, marginTop:4 }}>Choose from the list on the left</div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
