// FILE: OutsourceAttendanceReportPage.jsx — Vendor Employee Attendance
// Vendor/Outsource company: view, edit, print, export attendance + generate invoice directly
import { useState, useEffect } from 'react'
import { PageHeader, SearchBar, ExcelModal, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const VENDORS = ['ShieldGuard Nepal','CleanPro Services','TechStaff Solutions','NepCatering Services']
const MONTHS  = ['June 2026','May 2026','April 2026','March 2026']

const DATA = [
  {id:'a1',emp_id:'OUT-001',name:'Ramesh Shrestha',  vendor:'ShieldGuard Nepal',   role:'Security Guard',    shift:'Night',  dept:'HQ Gate 1',     present:26,absent:0,late:1,half:0,ot:3,  att_pct:100},
  {id:'a2',emp_id:'OUT-002',name:'Sita Tamang',       vendor:'CleanPro Services',   role:'Housekeeping',      shift:'Day',    dept:'All Floors',     present:24,absent:2,late:3,half:0,ot:0,  att_pct:92},
  {id:'a3',emp_id:'OUT-003',name:'Bikash Rai',        vendor:'TechStaff Solutions', role:'IT Helpdesk L1',    shift:'Day',    dept:'IT Helpdesk',    present:23,absent:3,late:5,half:1,ot:0,  att_pct:88},
  {id:'a4',emp_id:'OUT-004',name:'Priya Gurung',      vendor:'ShieldGuard Nepal',   role:'Security Guard',    shift:'Day',    dept:'HQ Parking',     present:25,absent:1,late:2,half:0,ot:4,  att_pct:96},
  {id:'a5',emp_id:'OUT-005',name:'Hari Thapa',        vendor:'NepCatering Services',role:'Kitchen Staff',     shift:'Day',    dept:'HQ Cafeteria',   present:21,absent:5,late:4,half:2,ot:0,  att_pct:81},
  {id:'a6',emp_id:'SG-006', name:'Deepak Karki',      vendor:'ShieldGuard Nepal',   role:'Sr Security Guard', shift:'Day',    dept:'HQ Lobby',       present:26,absent:0,late:0,half:0,ot:8,  att_pct:100},
  {id:'a7',emp_id:'CP-007', name:'Mina Shrestha',     vendor:'CleanPro Services',   role:'Housekeeping',      shift:'Day',    dept:'Floor 2-3',      present:25,absent:1,late:1,half:1,ot:0,  att_pct:96},
]

const RATE_PER_DAY = {'ShieldGuard Nepal':710,'CleanPro Services':635,'TechStaff Solutions':847,'NepCatering Services':580}

ces':615}


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

export default function OutsourceAttendanceReportPage() {
  const ctx = useCompanyCtx()  // Tenant scope

  const [vendor,    setVendor]    = useState('all')
  const [month,     setMonth]     = useState('June 2026')
  const [search,    setSearch]    = useState('')
  const [editId,    setEditId]    = useState(null)
  const [editRow,   setEditRow]   = useState(null)
  const [data,      setData]      = useState(DATA)
  const [showExcel, setShowExcel] = useState(false)
  const [showInvoice,setShowInvoice]=useState(false)
  const [invVendor, setInvVendor] = useState(null)
  const [ctx,       setCtx]       = useState(null)
  const [msg,       setMsg]       = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = data.filter(e=>
    (vendor==='all'||e.vendor===vendor) &&
    (!search||e.name.toLowerCase().includes(search.toLowerCase())||e.emp_id.toLowerCase().includes(search.toLowerCase()))
  )

  const startEdit = (row) => { setEditId(row.id); setEditRow({...row}) }
  const saveEdit = () => {
    setData(prev=>prev.map(e=>e.id===editId?{...editRow,att_pct:Math.round(editRow.present/26*100)}:e))
    setEditId(null); setEditRow(null)
    notify('✅ Attendance record updated')

  const generateInvoiceFor = (v) => {
    setInvVendor(v)
    setShowInvoice(true)

  const printAttendance = () => {
    notify('🖨️ Sending to printer — '+filtered.length+' records for '+month)

  // Summary by vendor
  const vendorSummary = VENDORS.map(v => {
    const workers = filtered.filter(e=>e.vendor===v)
    if (!workers.length) return null
    const totalDays = workers.reduce((s,e)=>s+e.present,0)
    const rate = RATE_PER_DAY[v]||700
    const gross = totalDays * rate
    return { vendor:v, workers:workers.length, totalDays, gross, rate }
  }).filter(Boolean)

  const filteredForInvoice = invVendor ? data.filter(e=>e.vendor===invVendor) : []
  const invoiceDays  = filteredForInvoice.reduce((s,e)=>s+e.present,0)
  const invoiceRate  = invVendor ? (RATE_PER_DAY[invVendor]||700) : 0
  const invoiceGross = invoiceDays * invoiceRate
  const invoiceTDS   = Math.round(invoiceGross * 0.015)
  const invoiceVAT   = Math.round(invoiceGross * 0.13)
  const invoiceNet   = invoiceGross + invoiceVAT - invoiceTDS

  const attColor = p => p>=95?'#10b981':p>=85?'#f59e0b':'#ef4444'

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="📋" title="Vendor Employee Attendance"
        breadcrumb="Organization Management > Insource & Outsource > Vendor Employee Attendance"
        gradient={G}
        stats={[
          {icon:'👷',label:'Workers Tracked',  value:filtered.length},
          {icon:'📊',label:'Avg Attendance',   value:filtered.length?Math.round(filtered.reduce((s,e)=>s+e.att_pct,0)/filtered.length)+'%':'—'},
          {icon:'💰',label:'Billable Days',     value:filtered.reduce((s,e)=>s+e.present,0)},
          {icon:'⏰',label:'OT Hours',          value:filtered.reduce((s,e)=>s+e.ot,0)+'h'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)'}}>{msg}</div>}

      {/* Filters + actions */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or ID..."/>
        <select value={vendor} onChange={e=>setVendor(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,background:'#fff',outline:'none'}}>
          <option value="all">All Companies</option>
          {VENDORS.map(v=><option key={v} value={v}>{v}</option>)}
        </select>
        <select value={month} onChange={e=>setMonth(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,background:'#fff',outline:'none'}}>
          {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={printAttendance} style={{padding:'9px 16px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>🖨️ Print</button>
        <button onClick={()=>setShowExcel(true)} style={{padding:'9px 16px',borderRadius:9,border:'none',background:'#f59e0b',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📤 Export Excel</button>
      </div>

      {/* Per-vendor invoice buttons */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {vendorSummary.map(v=>(
          <button key={v.vendor} onClick={()=>generateInvoiceFor(v.vendor)}
            style={{padding:'8px 14px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',gap:6,alignItems:'center'}}>
            🧾 Generate Invoice — {v.vendor.split(' ')[0]} ({v.workers} staff, {v.totalDays} days, NPR {(v.gross/1000).toFixed(0)}K)
          </button>
        ))}
      </div>

      {/* Attendance table */}
      <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
        <div style={{background:'linear-gradient(135deg,#f0fdf4,#fff)',padding:'12px 18px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:13,fontWeight:800,color:A}}>Attendance Register — {month}</div>
          <div style={{fontSize:10,color:'#64748b'}}>Working Days: 26 · {filtered.length} employees shown</div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:10,minWidth:700}}>
            <thead><tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
              {['EMP ID','Name','Vendor','Department','Shift','Present','Absent','Late','Half Day','OT hrs','Att %','Action'].map(h=>(
                <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:700,color:A,whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((e,i)=>{
                const isEditing = editId===e.id
                const row = isEditing ? editRow : e
                return (
                  <tr key={e.id} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.name,...e}})}}
                    style={{borderBottom:'1px solid #f1f5f9',background:i%2?'#fafafa':'#fff'}}>
                    <td style={{padding:'8px 12px',color:'#3b82f6',fontWeight:700}}>{e.emp_id}</td>
                    <td style={{padding:'8px 12px',fontWeight:700}}>{e.name}</td>
                    <td style={{padding:'8px 12px',color:'#64748b',fontSize:9}}>{e.vendor.split(' ')[0]}</td>
                    <td style={{padding:'8px 12px',color:'#64748b',fontSize:9}}>{e.dept}</td>
                    <td style={{padding:'8px 12px'}}><span style={{background:'#eef2ff',color:'#3730a3',fontSize:8,fontWeight:600,padding:'2px 7px',borderRadius:20}}>{e.shift}</span></td>
                    {['present','absent','late','half','ot'].map(field=>(
                      <td key={field} style={{padding:'8px 12px',textAlign:'center'}}>
                        {isEditing
                          ? <input type="number" value={row[field]} onChange={ev=>setEditRow(p=>({...p,[field]:+ev.target.value}))}
                              style={{width:40,padding:'3px 6px',borderRadius:6,border:'1px solid '+A,fontSize:10,textAlign:'center'}}/>
                          : <span style={{fontWeight:700,color:field==='present'?'#10b981':field==='absent'&&e.absent>0?'#ef4444':field==='late'&&e.late>2?'#f59e0b':'#64748b'}}>{e[field]}</span>}
                      </td>
                    ))}
                    <td style={{padding:'8px 12px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{flex:1,height:5,background:'#f1f5f9',borderRadius:3,overflow:'hidden',minWidth:40}}>
                          <div style={{width:row.att_pct+'%',height:'100%',background:attColor(row.att_pct),borderRadius:3}}/>
                        </div>
                        <span style={{fontSize:10,fontWeight:700,color:attColor(row.att_pct),width:32}}>{row.att_pct}%</span>
                      </div>
                    </td>
                    <td style={{padding:'8px 12px'}}>
                      <div style={{display:'flex',gap:4}}>
                        {isEditing
                          ? <><button onClick={saveEdit} style={{padding:'4px 10px',borderRadius:6,border:'none',background:A,color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer'}}>Save</button>
                               <button onClick={()=>{setEditId(null);setEditRow(null)}} style={{padding:'4px 8px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',fontSize:8,cursor:'pointer'}}>✕</button></>
                          : <button onClick={()=>startEdit(e)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',fontSize:8,cursor:'pointer'}}>✏️ Edit</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot><tr style={{background:'linear-gradient(135deg,#f0fdf4,#fff)',borderTop:'2px solid #e2e8f0'}}>
              <td colSpan={5} style={{padding:'10px 12px',fontWeight:700,color:A,fontSize:11}}>TOTALS / AVERAGES</td>
              {['present','absent','late','half','ot'].map(f=>(
                <td key={f} style={{padding:'10px 12px',textAlign:'center',fontWeight:900,color:f==='present'?'#10b981':f==='absent'?'#ef4444':'#64748b'}}>
                  {filtered.reduce((s,e)=>s+(e[f]||0),0)}
                </td>
              ))}
              <td style={{padding:'10px 12px',fontWeight:900,color:A}}>{filtered.length?Math.round(filtered.reduce((s,e)=>s+e.att_pct,0)/filtered.length):0}% avg</td>
              <td/>
            </tr></tfoot>
          </table>
        </div>
      </div>

      {/* INVOICE MODAL */}
      {showInvoice && invVendor && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowInvoice(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:520,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>🧾 Generate Invoice — {invVendor}</div>
              <div style={{fontSize:10,opacity:.8,marginTop:2}}>{month} · {filteredForInvoice.length} employees</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                {[['Invoice No','INV-'+invVendor.split(' ')[0].toUpperCase().slice(0,2)+'-'+month.split(' ').join('-').toUpperCase()],
                  ['Period',month],['Workers',filteredForInvoice.length],['Total Days Worked',invoiceDays],
                  ['Rate/Day (NPR)',invoiceRate],['Gross Amount','NPR '+invoiceGross.toLocaleString()],
                  ['TDS 1.5% (deducted)','NPR -'+invoiceTDS.toLocaleString()],
                  ['VAT 13% (added)','NPR +'+invoiceVAT.toLocaleString()]
                ].map(([k,v])=>(
                  <div key={k} style={{background:'#f8fafc',borderRadius:8,padding:'8px 12px'}}>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700,marginBottom:2}}>{k}</div>
                    <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'14px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#065f46'}}>NET PAYABLE TO COMPANY</div>
                <div style={{fontSize:22,fontWeight:900,color:A}}>NPR {invoiceNet.toLocaleString()}</div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{notify('✅ Invoice generated and sent to Finance for NPR '+invoiceNet.toLocaleString());setShowInvoice(false)}}
                  style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>🧾 Submit Invoice to Company</button>
                <button onClick={()=>{notify('🖨️ Printing invoice...');setShowInvoice(false)}} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>🖨️ Print</button>
                <button onClick={()=>setShowInvoice(false)} style={{padding:'11px 14px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>✕</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[{icon:'✏️',label:'Edit Attendance',key:'edit'},{icon:'🧾',label:'Generate Invoice',key:'invoice'},{icon:'🖨️',label:'Print Record',key:'print'},{icon:'📤',label:'Export',key:'export'}]} onAction={(k,item)=>{if(k==='edit')startEdit(item);if(k==='invoice')generateInvoiceFor(item.vendor)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Vendor Employee Attendance" columns={['EMP ID','Name','Vendor','Dept','Shift','Present','Absent','Late','Half Day','OT Hours','Att%','Month']} onClose={()=>setShowExcel(false)} onImport={(f)=>notify('Imported: '+f.name)}/>}
    </div>
  )
