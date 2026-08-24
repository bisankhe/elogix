// FILE: src/components/dashboard/snapshots/MasterDatabasePage.jsx
// eLogix HRMS — Master Database (12 Tabs)
// Path: Employee Lifecycle > Recruitment & Hiring > Recruitment Management > Master Database
// Tabs: Dashboard|Branch Wise|Pending|Gender Wise|AON Wise|Client Wise|
//       Position Wise|MDB|Inactive|3rd Month|2nd Month|Last Month
// Right+bottom scrollbar, inline editable cells, right-click context menu
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect, useRef, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend, ResponsiveContainer } from 'recharts'

// ── Session ───────────────────────────────────────────────────────────
function getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} }
  catch(_e){ return {} }
}

// ── Constants ─────────────────────────────────────────────────────────
const G = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#0ea5e9 100%)'
const COLORS = ['#0369a1','#0891b2','#7c3aed','#059669','#d97706','#dc2626','#db2777','#0f172a','#64748b','#16a34a','#9333ea','#c2410c']

function statusStyle(s) {
  return (s==='Active'||s==='active')
    ? {bg:'#dcfce7',color:'#166534',border:'#bbf7d0'}
    : {bg:'#fee2e2',color:'#991b1b',border:'#fecaca'}
}

// ── Storage keys ──────────────────────────────────────────────────────
const KEY_MDB      = 'elogix_mdb_active'
const KEY_INACTIVE = 'elogix_mdb_inactive'

// ── Real data from Excel ──────────────────────────────────────────────
const INITIAL_MDB = [
  {sn:'1',emp_code:'E00001',client_emp_code:'VIA-3011',citizen_no:'60482125',name:'Pramesh Yadav',gender:'Male',status:'Active',dept:'FT',position:'Fiber Assistant Supervisor',supervisor:'',client:'Konnect Solutions Pvt. Ltd. (Abasar Nepal)',branch:'Birgunj',email:'',contact:'9804217092',dof_bs:'2074-08-18',dof_ad:'2017-12-04',tenure_days:'3183',aon_group:'4 years +',bank_account:'09805080059312',ssf:'20780317401',remarks:'VIA-3011'},
  {sn:'2',emp_code:'E00002',client_emp_code:'VIA-3013',citizen_no:'341001/91',name:'Aijajul Hak Miya',gender:'Male',status:'Active',dept:'CRO',position:'CRO Back',supervisor:'',client:'Konnect Solutions Pvt. Ltd. (Abasar Nepal)',branch:'Birgunj',email:'',contact:'9801227634',dof_bs:'2074-08-25',dof_ad:'2017-12-11',tenure_days:'3176',aon_group:'4 years +',bank_account:'09805080060080',ssf:'20780317340',remarks:'VIA-3013'},
  {sn:'3',emp_code:'E00003',client_emp_code:'via-2020',citizen_no:'06-06-73-00469',name:'Sunil Kumar Chaudhary',gender:'Male',status:'Active',dept:'CRO',position:'CRO',supervisor:'',client:'Konnect Solutions Pvt. Ltd. (Abasar Nepal)',branch:'Biratnagar',email:'',contact:'9801906756',dof_bs:'2074-11-26',dof_ad:'2018-03-10',tenure_days:'3087',aon_group:'4 years +',bank_account:'09705080030939',ssf:'20780317435',remarks:'via-2020'},
  {sn:'4',emp_code:'E00004',client_emp_code:'VIA-3025',citizen_no:'78-02-79-11695',name:'Roshan Kumar Mandal',gender:'Male',status:'Active',dept:'CRO',position:'CRO',supervisor:'',client:'Konnect Solutions Pvt. Ltd. (Abasar Nepal)',branch:'Birgunj',email:'',contact:'9806070097',dof_bs:'2074-10-16',dof_ad:'2018-01-01',tenure_days:'3154',aon_group:'4 years +',bank_account:'09805080059561',ssf:'20780317468',remarks:'VIA-3025'},
  {sn:'5',emp_code:'E00005',client_emp_code:'VIA-2019',citizen_no:'46-01-73-23571',name:'Bijay Kumar Sah',gender:'Male',status:'Active',dept:'CRO',position:'CRO',supervisor:'',client:'Konnect Solutions Pvt. Ltd. (Abasar Nepal)',branch:'Janakpur',email:'',contact:'9819975073',dof_bs:'2074-10-25',dof_ad:'2018-01-09',tenure_days:'3146',aon_group:'4 years +',bank_account:'09205080028979',ssf:'20780317442',remarks:'VIA-2019'},
  {sn:'6',emp_code:'E00006',client_emp_code:'VIA-3026',citizen_no:'78-02-78-08316',name:'Manmohan Kumar Sah',gender:'Male',status:'Active',dept:'FT',position:'Fiber Technician',supervisor:'',client:'Konnect Solutions Pvt. Ltd. (Abasar Nepal)',branch:'Birgunj',email:'',contact:'9808580581',dof_bs:'2074-10-16',dof_ad:'2018-01-01',tenure_days:'3154',aon_group:'4 years +',bank_account:'09805080059540',ssf:'20780317402',remarks:'VIA-3026'},
  {sn:'7',emp_code:'E00007',client_emp_code:'VIA-3009',citizen_no:'',name:'Naresh Kumar Mahato',gender:'Male',status:'Active',dept:'FT',position:'Fiber Assistant Supervisor',supervisor:'',client:'Konnect Solutions Pvt. Ltd. (Abasar Nepal)',branch:'Itahari',email:'',contact:'9819209399',dof_bs:'2074-08-10',dof_ad:'2017-11-26',tenure_days:'3191',aon_group:'4 years +',bank_account:'09104380060081',ssf:'20780317348',remarks:'VIA-3009'},
  {sn:'8',emp_code:'E00008',client_emp_code:'VIA-3010',citizen_no:'55-01-74-17090',name:'Shivam Chaudhary',gender:'Male',status:'Active',dept:'FT',position:'Fiber Technician',supervisor:'',client:'Konnect Solutions Pvt. Ltd. (Abasar Nepal)',branch:'Itahari',email:'',contact:'9806618444',dof_bs:'2074-08-10',dof_ad:'2017-11-26',tenure_days:'3191',aon_group:'4 years +',bank_account:'09104380060085',ssf:'20780317351',remarks:'VIA-3010'},
  {sn:'9',emp_code:'E00009',client_emp_code:'VIA-3006',citizen_no:'',name:'Niraj Kumar Sah',gender:'Male',status:'Active',dept:'FT',position:'Fiber Technician',supervisor:'',client:'Konnect Solutions Pvt. Ltd. (Abasar Nepal)',branch:'Birgunj',email:'',contact:'9814531823',dof_bs:'2074-06-23',dof_ad:'2017-10-09',tenure_days:'3239',aon_group:'4 years +',bank_account:'09805080057611',ssf:'20780317338',remarks:'VIA-3006'},
  {sn:'10',emp_code:'E00010',client_emp_code:'VIA-3004',citizen_no:'',name:'Sandeep Mahato',gender:'Male',status:'Active',dept:'CRO',position:'CRO Back',supervisor:'',client:'Konnect Solutions Pvt. Ltd. (Abasar Nepal)',branch:'Birgunj',email:'',contact:'9802122221',dof_bs:'2074-06-23',dof_ad:'2017-10-09',tenure_days:'3239',aon_group:'4 years +',bank_account:'09805080057589',ssf:'20780317326',remarks:'VIA-3004'},
]

const INITIAL_INACTIVE = [
  {sn:'10',emp_code:'',client_emp_code:'',citizen_no:'_',name:'Aasha Limbu',gender:'Female',status:'Inactive',dept:'',position:'',supervisor:'',client:'Vianet Communication Limited',branch:'Dharan',email:'',contact:'9841424344',dof_bs:'2079-04-10',dof_ad:'2022-07-26',tenure_days:'618',aon_group:'1-2 Years',bank_account:'10905300250207',ssf:'20790413148',last_working_month:''},
  {sn:'3',emp_code:'',client_emp_code:'',citizen_no:'-',name:'Amar Bahadur Thapa Magar',gender:'',status:'Inactive',dept:'',position:'',supervisor:'',client:'Vianet Communication Limited',branch:'Tandi',email:'',contact:'9841424345',dof_bs:'2080-07-20',dof_ad:'2023-11-06',tenure_days:'150',aon_group:'3-6 Months',bank_account:'-',ssf:'20801010835',last_working_month:''},
  {sn:'8',emp_code:'FT-0006',client_emp_code:'',citizen_no:'46-01-79-07226',name:'Arpan Pariyar',gender:'',status:'Inactive',dept:'FT',position:'',supervisor:'',client:'Vianet Communication Limited',branch:'Pokhara',email:'skylyneensevyn@gmail.com',contact:'9841424346',dof_bs:'2080-08-17',dof_ad:'2023-12-03',tenure_days:'123',aon_group:'3-6 Months',bank_account:'09505300250313',ssf:'20801084781',last_working_month:''},
  {sn:'5',emp_code:'',client_emp_code:'',citizen_no:'',name:'Bikash Tamang',gender:'Male',status:'Inactive',dept:'',position:'',supervisor:'',client:'Vianet Communication Limited',branch:'Pokhara',email:'',contact:'9841424347',dof_bs:'2079-09-05',dof_ad:'2022-12-21',tenure_days:'435',aon_group:'1-2 Years',bank_account:'',ssf:'',last_working_month:'2081-04'},
  {sn:'6',emp_code:'',client_emp_code:'',citizen_no:'',name:'Sunita Rai',gender:'Female',status:'Inactive',dept:'CRO',position:'CRO',supervisor:'',client:'Konnect Solutions Pvt. Ltd. (Abasar Nepal)',branch:'Biratnagar',email:'',contact:'9841424348',dof_bs:'2080-03-15',dof_ad:'2023-06-29',tenure_days:'72',aon_group:'1-3 Months',bank_account:'',ssf:'',last_working_month:'2081-05'},
]

// ── Summary data from Excel ───────────────────────────────────────────
const BRANCH_DATA = [
  {branch:'Chabahil - Kathmandu',count:53},{branch:'Lalitpur',count:38},{branch:'Pokhara',count:36},
  {branch:'Bhaktapur',count:35},{branch:'Chitwan',count:31},{branch:'Birgunj',count:29},
  {branch:'Itahari',count:22},{branch:'Janakpur',count:20},{branch:'Panipokhari',count:14},
  {branch:'Butwal',count:14},{branch:'Biratnagar',count:13},{branch:'Damak',count:12},
  {branch:'Chabahill',count:12},{branch:'Simara',count:11},{branch:'Lamahi',count:11},
  {branch:'Bardibas',count:10},{branch:'Birtamode',count:10},{branch:'Dharan',count:10},
  {branch:'Bhairahawa',count:9},{branch:'Kavre-Banepa',count:9},{branch:'Tandi',count:8},
  {branch:'Kalanki - KTM',count:7},{branch:'Lahan',count:7},{branch:'Head office',count:7},
  {branch:'Hetauda',count:6},{branch:'Inaruwa',count:6},{branch:'Parwanipur',count:6},
  {branch:'Barahathawa',count:5},{branch:'Ghorahi-Dang',count:5},{branch:'Lekhnath',count:5},
]
const AON_DATA = [
  {aon:'1-3 Months',count:93},{aon:'3-6 Months',count:111},{aon:'6-12 Months',count:166},
  {aon:'1-2 Years',count:89},{aon:'2-4 years',count:45},{aon:'4 years +',count:23},
]
const POSITION_DATA = [
  {pos:'FT',count:114},{pos:'CRO',count:59},{pos:'ARE',count:29},{pos:'CRO Front',count:27},
  {pos:'FD',count:24},{pos:'TSE',count:15},{pos:'FAS',count:15},{pos:'DV',count:13},
  {pos:'L1',count:10},{pos:'HD',count:5},{pos:'HRA',count:5},{pos:'Sales',count:5},
  {pos:'ONM',count:4},{pos:'BCC',count:3},{pos:'IBU',count:2},{pos:'IT',count:2},
]

// ── Column definitions ────────────────────────────────────────────────
const MDB_COLS = [
  {key:'sn',label:'S.N.',w:48},{key:'emp_code',label:'Emp Code',w:88},
  {key:'client_emp_code',label:'Client Emp Code',w:120},{key:'citizen_no',label:'Citizen No.',w:118},
  {key:'name',label:'Name of Employee',w:170},{key:'gender',label:'Gender',w:68,type:'select',options:['Male','Female','Other']},
  {key:'status',label:'Status',w:78,type:'select',options:['Active','Inactive']},
  {key:'dept',label:'Dept',w:68},{key:'position',label:'Position',w:160},
  {key:'client',label:'Client',w:200},{key:'branch',label:'Branch',w:130},
  {key:'email',label:'Email',w:155},{key:'contact',label:'Contact',w:108},
  {key:'dof_bs',label:'DOF (BS)',w:98},{key:'dof_ad',label:'DOF (AD)',w:98},
  {key:'tenure_days',label:'Tenure Days',w:98},
  {key:'aon_group',label:'AON Group',w:98,type:'select',options:['1-3 Months','3-6 Months','6-12 Months','1-2 Years','2-4 years','4 years +']},
  {key:'bank_account',label:'Bank Account',w:138},{key:'ssf',label:'SSF',w:118},
  {key:'remarks',label:'Remarks',w:118},
]
const INACTIVE_COLS = [
  ...MDB_COLS.filter(c=>c.key!=='remarks'),
  {key:'last_working_month',label:'Last Working Month',w:138},
]

// ── load/save ─────────────────────────────────────────────────────────
function loadRows(key, fallback) {
  try { const s=localStorage.getItem(key); return s?JSON.parse(s):fallback }
  catch(_e){ return fallback }
}

// ── Inline Cell ───────────────────────────────────────────────────────
function MDBCell({value,col,onChange,isEditing,onStart,onEnd}) {
  const [loc,setLoc]=useState(value)
  const ref=useRef(null)
  useEffect(()=>setLoc(value),[value])
  useEffect(()=>{if(isEditing&&ref.current)ref.current.focus()},[isEditing])
  const commit=()=>{onChange(loc);onEnd()}
  const ss={padding:'5px 7px',fontSize:11,border:'none',background:'transparent',
    outline:'none',fontFamily:'inherit',width:'100%',boxSizing:'border-box',color:'#0f172a'}
  if (!isEditing) {
    if (col.key==='status') {
      const st=statusStyle(value)
      return <div onDoubleClick={onStart} style={{padding:'3px 6px'}}>
        {value?<span style={{background:st.bg,color:st.color,border:`1px solid ${st.border}`,
          fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,whiteSpace:'nowrap'}}>{value}</span>
        :<span style={{color:'#d1d5db',fontSize:10}}>—</span>}
      </div>
    }
    return <div onDoubleClick={onStart} style={{padding:'3px 6px',fontSize:11,cursor:'default',
      color:value?'#0f172a':'#d1d5db',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
      {value||'—'}
    </div>
  }
  if (col.type==='select') return <select ref={ref} value={loc}
    onChange={e=>setLoc(e.target.value)} onBlur={commit}
    style={{...ss,cursor:'pointer',background:'#fffbe6',border:'1px solid #fbbf24',borderRadius:4}}>
    <option value="">—</option>{(col.options||[]).map(o=><option key={o}>{o}</option>)}
  </select>
  return <input ref={ref} value={loc} onChange={e=>setLoc(e.target.value)}
    onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')commit();if(e.key==='Escape'){setLoc(value);onEnd()}}}
    style={{...ss,background:'#fffbe6',border:'1px solid #fbbf24',borderRadius:4}}/>
}

// ── Context Menu ──────────────────────────────────────────────────────
function MDBCtxMenu({x,y,onClose,onAddBelow,onDel,onSave,onClear}) {
  const ref=useRef(null)
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))onClose()}
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])
  const items=[
    {icon:'💾',label:'Save',action:onSave,c:'#16a34a'},
    {icon:'➕',label:'Add Row Below',action:onAddBelow},
    null,
    {icon:'⬜',label:'Clear Cell',action:onClear},
    {icon:'🗑️',label:'Delete Row',action:onDel,c:'#dc2626'},
  ]
  return <div ref={ref} style={{position:'fixed',left:x,top:y,zIndex:99999,background:'#fff',
    border:'1px solid #e2e8f0',borderRadius:10,boxShadow:'0 8px 32px rgba(0,0,0,.2)',
    minWidth:180,overflow:'hidden',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
    {items.map((item,i)=>item===null
      ?<div key={i} style={{height:1,background:'#f1f5f9',margin:'2px 0'}}/>
      :<button key={i} onClick={()=>{item.action?.();onClose()}}
        style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'9px 14px',
          border:'none',background:'transparent',fontSize:12,cursor:'pointer',
          color:item.c||'#374151',textAlign:'left'}}
        onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        <span style={{fontSize:15}}>{item.icon}</span>{item.label}
      </button>
    )}
  </div>
}

// ── DataTable (reusable for all data tabs) ────────────────────────────
function DataTable({rows,cols,storageKey,onUpdate,readOnly=false}) {
  const [editing,setEditing]=useState(null)
  const [ctx,setCtx]=useState(null)
  const [search,setSearch]=useState('')
  const [filterBranch,setFilterBranch]=useState('')
  const [filterClient,setFilterClient]=useState('')
  const [toast,setToast]=useState('')

  const notify=m=>{setToast(m);setTimeout(()=>setToast(''),2800)}
  const save=data=>{
    try{localStorage.setItem(storageKey,JSON.stringify(data??rows));notify('✅ Saved')}
    catch(_e){notify('❌ Save failed')}
  }
  const updateCell=(ri,k,v)=>{
    const next=rows.map((r,i)=>i===ri?{...r,[k]:v}:r)
    onUpdate(next); save(next)
  }
  const addRow=ri=>{
    const nr=cols.reduce((a,c)=>({...a,[c.key]:''}),{})
    nr.sn=String(rows.length+1); nr.status='Active'
    const next=[...rows]; next.splice(ri+1,0,nr); onUpdate(next)
    notify('➕ Row added')
  }
  const delRow=ri=>{
    if(!window.confirm('Delete this row?'))return
    const next=rows.filter((_,i)=>i!==ri); onUpdate(next); notify('🗑️ Deleted')
  }
  const exportCSV=()=>{
    const h=cols.map(c=>`"${c.label}"`).join(',')
    const b=filtered.map(r=>cols.map(c=>`"${(r[c.key]||'').replace(/"/g,'""')}"`).join(','))
    const a=document.createElement('a')
    a.href=URL.createObjectURL(new Blob(['\uFEFF'+[h,...b].join('\n')],{type:'text/csv'}))
    a.download=`${storageKey}_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    notify('📤 Exported CSV')
  }
  const importCSV=()=>{
    const inp=document.createElement('input'); inp.type='file'; inp.accept='.csv'
    inp.onchange=e=>{
      const file=e.target.files[0]; if(!file)return
      const reader=new FileReader()
      reader.onload=ev=>{
        try{
          const lines=ev.target.result.replace(/\r/g,'').split('\n').filter(Boolean)
          const hdrs=lines[0].split(',').map(h=>h.replace(/"/g,'').trim())
          const nr=lines.slice(1).map((line,i)=>{
            const vals=line.split(',').map(v=>v.replace(/^"|"$/g,'').trim())
            const row={sn:String(i+1)}
            hdrs.forEach((h,j)=>{const c=cols.find(x=>x.label===h||x.key===h);if(c)row[c.key]=vals[j]||''})
            return row
          })
          if(window.confirm(`Import ${nr.length} rows?`)){
            const next=[...rows,...nr]; onUpdate(next); save(next)
            notify(`✅ Imported ${nr.length} rows`)
          }
        } catch(_e){notify('❌ Import failed')}
      }
      reader.readAsText(file,'UTF-8')
    }
    inp.click()
  }

  const branches=useMemo(()=>[...new Set(rows.map(r=>r.branch||'').filter(Boolean))].sort(),[rows])
  const clients =useMemo(()=>[...new Set(rows.map(r=>r.client||'').filter(Boolean))].sort(),[rows])

  const filtered=useMemo(()=>{
    const q=search.toLowerCase()
    return rows.filter(r=>{
      const ms=!q||cols.some(c=>(r[c.key]||'').toLowerCase().includes(q))
      const mb=!filterBranch||r.branch===filterBranch
      const mc=!filterClient||r.client===filterClient
      return ms&&mb&&mc
    })
  },[rows,search,filterBranch,filterClient])

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Toast */}
      {toast&&<div style={{position:'fixed',bottom:20,right:20,zIndex:99999,
        background:toast.startsWith('❌')?'#fef2f2':'#f0fdf4',
        border:`1px solid ${toast.startsWith('❌')?'#fecaca':'#bbf7d0'}`,
        borderRadius:10,padding:'10px 18px',fontSize:12,fontWeight:600,
        color:toast.startsWith('❌')?'#dc2626':'#065f46',
        boxShadow:'0 4px 16px rgba(0,0,0,.12)'}}>
        {toast}
      </div>}
      {ctx&&<MDBCtxMenu x={ctx.x} y={ctx.y} onClose={()=>setCtx(null)}
        onAddBelow={()=>addRow(ctx.ri)} onDel={()=>delRow(ctx.ri)}
        onSave={()=>save()} onClear={()=>updateCell(ctx.ri,ctx.k,'')}/>}

      {/* Toolbar */}
      <div style={{display:'flex',gap:6,alignItems:'center',padding:'9px 14px',
        background:'#fff',borderBottom:'1px solid #e2e8f0',flexWrap:'wrap',flexShrink:0}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search name, code, branch..."
          style={{padding:'6px 12px',borderRadius:8,border:'1px solid #e2e8f0',
            fontSize:12,outline:'none',width:240,fontFamily:'inherit'}}/>
        <select value={filterBranch} onChange={e=>setFilterBranch(e.target.value)}
          style={{padding:'6px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:12,fontFamily:'inherit'}}>
          <option value="">All Branches</option>
          {branches.map(b=><option key={b}>{b}</option>)}
        </select>
        <select value={filterClient} onChange={e=>setFilterClient(e.target.value)}
          style={{padding:'6px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:12,fontFamily:'inherit'}}>
          <option value="">All Clients</option>
          {clients.map(c=><option key={c}>{c}</option>)}
        </select>
        {(search||filterBranch||filterClient)&&<button onClick={()=>{setSearch('');setFilterBranch('');setFilterClient('')}}
          style={{padding:'6px 12px',borderRadius:8,border:'1px solid #fecaca',background:'#fef2f2',
            color:'#dc2626',fontSize:11,cursor:'pointer',fontWeight:600}}>✕ Clear</button>}
        <span style={{fontSize:11,color:'#64748b'}}>{filtered.length}/{rows.length} records</span>
        <div style={{marginLeft:'auto',display:'flex',gap:5}}>
          {!readOnly&&[
            ['💾 Save',()=>save(),'#16a34a'],['➕ Add',()=>addRow(rows.length-1),'#0891b2'],
            ['📥 Import',importCSV,'#7c3aed'],
          ].map(([l,a,c])=><button key={l} onClick={a}
            style={{padding:'6px 12px',borderRadius:7,border:'none',background:c,
              color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>{l}</button>)}
          {[['📤 Export',exportCSV,'#0369a1'],['🖨️ Print',()=>window.print(),'#374151']]
            .map(([l,a,c])=><button key={l} onClick={a}
              style={{padding:'6px 12px',borderRadius:7,border:'none',background:c,
                color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>{l}</button>)}
        </div>
      </div>

      {/* Table with RIGHT + BOTTOM scrollbar */}
      <div style={{flex:1,overflowX:'auto',overflowY:'auto',
        scrollbarWidth:'thin',scrollbarColor:'#94a3b8 #f1f5f9',
        WebkitOverflowScrolling:'touch'}}>
        <table style={{borderCollapse:'collapse',fontSize:11,background:'#fff',
          width:'max-content',minWidth:'100%'}}>
          <thead>
            <tr style={{background:G,color:'#fff'}}>
              {cols.map(c=><th key={c.key}
                style={{padding:'9px 8px',textAlign:'left',fontWeight:700,fontSize:10,
                  whiteSpace:'nowrap',width:c.w||90,minWidth:c.w||90,
                  position:'sticky',top:0,background:'inherit',zIndex:5,
                  borderRight:'1px solid rgba(255,255,255,.15)',letterSpacing:.3}}>
                {c.label}
              </th>)}
              {!readOnly&&<th style={{padding:'9px 8px',fontWeight:700,fontSize:10,
                position:'sticky',top:0,background:G,zIndex:5,width:80}}>
                Actions
              </th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row,ri)=>{
              const realIdx=rows.indexOf(row)
              return <tr key={ri}
                style={{borderBottom:'1px solid #f1f5f9',background:ri%2===0?'#fff':'#fafafa'}}
                onMouseEnter={e=>e.currentTarget.style.background='#f0f9ff'}
                onMouseLeave={e=>e.currentTarget.style.background=ri%2===0?'#fff':'#fafafa'}>
                {cols.map(col=>{
                  const isEd=editing?.ri===realIdx&&editing?.k===col.key
                  return <td key={col.key}
                    style={{padding:'1px',verticalAlign:'middle',
                      minWidth:col.w||90,maxWidth:col.w||90,
                      borderRight:'1px solid #f1f5f9',overflow:'hidden',
                      background:isEd?'#fffbe6':undefined}}
                    onContextMenu={e=>{e.preventDefault();setEditing(null);
                      setCtx({x:e.clientX,y:e.clientY,ri:realIdx,k:col.key})}}>
                    <MDBCell value={row[col.key]||''} col={col}
                      onChange={v=>updateCell(realIdx,col.key,v)}
                      isEditing={isEd}
                      onStart={()=>!readOnly&&setEditing({ri:realIdx,k:col.key})}
                      onEnd={()=>setEditing(null)}/>
                  </td>
                })}
                {!readOnly&&<td style={{padding:'3px 6px',whiteSpace:'nowrap',borderLeft:'1px solid #f1f5f9'}}>
                  <div style={{display:'flex',gap:3}}>
                    <button onClick={()=>save()} title="Save"
                      style={{padding:'2px 7px',borderRadius:5,border:'1px solid #bbf7d0',
                        background:'#f0fdf4',color:'#166534',fontSize:10,cursor:'pointer'}}>💾</button>
                    <button onClick={()=>delRow(realIdx)} title="Delete"
                      style={{padding:'2px 7px',borderRadius:5,border:'1px solid #fecaca',
                        background:'#fef2f2',color:'#dc2626',fontSize:10,cursor:'pointer'}}>🗑️</button>
                  </div>
                </td>}
              </tr>
            })}
            {filtered.length===0&&<tr><td colSpan={cols.length+(readOnly?0:1)}
              style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
              <div style={{fontSize:36}}>🔍</div>
              <div style={{fontSize:14,fontWeight:600,marginTop:8}}>No records found</div>
            </td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{padding:'5px 14px',background:'#f8fafc',borderTop:'1px solid #e2e8f0',
        fontSize:10,color:'#94a3b8',flexShrink:0}}>
        💡 Double-click any cell to edit · Right-click for context menu
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────
function DashboardTab({mdb,inactive}) {
  const active=mdb.filter(r=>r.status==='Active').length
  const konnect=mdb.filter(r=>r.client?.includes('Konnect')).length
  const vianet=mdb.filter(r=>r.client?.includes('Vianet')).length
  const male=mdb.filter(r=>r.gender==='Male').length
  const female=mdb.filter(r=>r.gender==='Female').length
  const withBank=mdb.filter(r=>r.bank_account&&r.bank_account!=='-'&&r.bank_account!=='').length
  const withSSF=mdb.filter(r=>r.ssf&&r.ssf!=='-'&&r.ssf!=='').length

  const KPIs=[
    {label:'Total Active Staff',value:527,icon:'👥',color:'#0369a1',bg:'#dbeafe'},
    {label:'Total Inactive',value:210,icon:'❌',color:'#dc2626',bg:'#fee2e2'},
    {label:'Konnect (Abasar)',value:270,icon:'🏢',color:'#7c3aed',bg:'#f3e8ff'},
    {label:'Vianet Staff',value:257,icon:'📡',color:'#0891b2',bg:'#cffafe'},
    {label:'Male Staff',value:398,icon:'👨',color:'#059669',bg:'#dcfce7'},
    {label:'Female Staff',value:86,icon:'👩',color:'#d97706',bg:'#fef9c3'},
    {label:'Bank Accounts',value:478,icon:'🏦',color:'#16a34a',bg:'#dcfce7'},
    {label:'SSF Registered',value:476,icon:'🛡️',color:'#6b21a8',bg:'#f3e8ff'},
  ]
  return <div style={{overflowY:'auto',overflowX:'hidden',height:'100%',padding:'18px 20px',
    scrollbarWidth:'thin',scrollbarColor:'#94a3b8 #f1f5f9'}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10,marginBottom:20}}>
      {KPIs.map(k=><div key={k.label} style={{background:'#fff',borderRadius:12,padding:'14px 16px',
        border:'1px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:42,height:42,borderRadius:10,background:k.bg,flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{k.icon}</div>
          <div>
            <div style={{fontSize:24,fontWeight:900,color:k.color,lineHeight:1}}>{k.value}</div>
            <div style={{fontSize:10,color:'#64748b',marginTop:3}}>{k.label}</div>
          </div>
        </div>
      </div>)}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
      <div style={{background:'#fff',borderRadius:12,padding:'16px',border:'1px solid #e2e8f0'}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>👥 Staff by Client</div>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={[{name:'Konnect (Abasar)',value:270},{name:'Vianet',value:257}]}
              dataKey="value" cx="50%" cy="50%" outerRadius={65}
              label={({name,value})=>`${value}`}>
              <MDBCell fill="#0369a1"/><MDBCell fill="#0891b2"/>
            </Pie><Legend/><Tooltip/>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:'16px',border:'1px solid #e2e8f0'}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>⏱️ AON Distribution</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={AON_DATA} layout="vertical" margin={{left:5}}>
            <XAxis type="number" tick={{fontSize:9}}/>
            <YAxis dataKey="aon" type="category" tick={{fontSize:9}} width={70}/>
            <Tooltip/>
            <Bar dataKey="count" radius={[0,4,4,0]}>
              {AON_DATA.map((_,i)=><MDBCell key={i} fill={COLORS[i]}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div style={{background:'#fff',borderRadius:12,padding:'16px',border:'1px solid #e2e8f0'}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>🏢 Top 15 Branches</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={BRANCH_DATA.slice(0,15)} margin={{bottom:50}}>
          <XAxis dataKey="branch" tick={{fontSize:8}} angle={-40} textAnchor="end" interval={0}/>
          <YAxis tick={{fontSize:9}}/><Tooltip/>
          <Bar dataKey="count" radius={[4,4,0,0]}>
            {BRANCH_DATA.slice(0,15).map((_,i)=><MDBCell key={i} fill={COLORS[i%COLORS.length]}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
}

// ── Summary card tab ──────────────────────────────────────────────────
function SummaryTab({title,data,lk,vk,chartType='bar'}) {
  const total=data.reduce((a,d)=>a+(Number(d[vk])||0),0)
  return <div style={{overflowY:'auto',height:'100%',padding:'18px 20px',
    scrollbarWidth:'thin',scrollbarColor:'#94a3b8 #f1f5f9'}}>
    <div style={{display:'grid',gridTemplateColumns:'400px 1fr',gap:14}}>
      <div style={{background:'#fff',borderRadius:12,padding:'16px',border:'1px solid #e2e8f0',overflowY:'auto',maxHeight:'calc(100vh - 200px)'}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>{title}</div>
        <div style={{fontSize:11,color:'#64748b',marginBottom:12}}>Grand Total: <strong>{total}</strong></div>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead><tr style={{background:'#f8fafc'}}>
            <th style={{padding:'7px 10px',textAlign:'left',fontSize:10,color:'#64748b',fontWeight:600}}>
              {lk.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
            </th>
            <th style={{padding:'7px 10px',textAlign:'center',fontSize:10,color:'#64748b',fontWeight:600}}>Count</th>
            <th style={{padding:'7px 10px',textAlign:'center',fontSize:10,color:'#64748b',fontWeight:600}}>Share</th>
          </tr></thead>
          <tbody>{data.map((d,i)=>{
            const pct=Math.round((Number(d[vk])||0)/total*100)
            return <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
              <td style={{padding:'7px 10px',fontWeight:500}}>{d[lk]}</td>
              <td style={{padding:'7px 10px',textAlign:'center',fontWeight:700,color:COLORS[i%COLORS.length]}}>{d[vk]}</td>
              <td style={{padding:'7px 10px'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{flex:1,height:5,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:COLORS[i%COLORS.length],borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:10,color:'#64748b',minWidth:28}}>{pct}%</span>
                </div>
              </td>
            </tr>
          })}</tbody>
          <tfoot><tr style={{background:'#f0f9ff',borderTop:'2px solid #bfdbfe'}}>
            <td style={{padding:'7px 10px',fontWeight:700}}>Grand Total</td>
            <td style={{padding:'7px 10px',textAlign:'center',fontWeight:900,color:'#0369a1'}}>{total}</td>
            <td style={{padding:'7px 10px',textAlign:'center',fontWeight:700}}>100%</td>
          </tr></tfoot>
        </table>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:'16px',border:'1px solid #e2e8f0'}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>{title} — Chart</div>
        <ResponsiveContainer width="100%" height={Math.min(data.length*22+80,380)}>
          {chartType==='pie'
            ?<PieChart><Pie data={data.map(d=>({name:d[lk],value:Number(d[vk])||0}))}
                dataKey="value" cx="50%" cy="50%" outerRadius={110}
                label={({name,value,percent})=>`${name}: ${value} (${(percent*100).toFixed(0)}%)`}>
                {data.map((_,i)=><MDBCell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Pie><Tooltip/></PieChart>
            :<BarChart data={data.slice(0,25).map(d=>({name:String(d[lk]),count:Number(d[vk])||0}))}
                layout="vertical" margin={{left:10,right:30}}>
                <XAxis type="number" tick={{fontSize:10}}/>
                <YAxis dataKey="name" type="category" tick={{fontSize:9}} width={90}/>
                <Tooltip/><Bar dataKey="count" radius={[0,4,4,0]}>
                  {data.slice(0,25).map((_,i)=><MDBCell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Bar>
              </BarChart>
          }
        </ResponsiveContainer>
      </div>
    </div>
  </div>
}

// ── Pending Tab ───────────────────────────────────────────────────────
function PendingTab({mdb}) {
  const active=mdb.filter(r=>r.status==='Active')
  const noBank=active.filter(r=>!r.bank_account||r.bank_account==='-'||r.bank_account==='')
  const noSSF=active.filter(r=>!r.ssf||r.ssf==='-'||r.ssf==='')
  const stats=[
    {l:'Total Active Staff',v:527,icon:'👥',c:'#0369a1'},
    {l:'Bank Account Created',v:478,icon:'🏦',c:'#16a34a'},
    {l:'Bank Account Pending',v:0,icon:'⏳',c:'#dc2626'},
    {l:'SSF Registered',v:476,icon:'🛡️',c:'#16a34a'},
    {l:'SSF Pending',v:2,icon:'⏳',c:'#dc2626'},
  ]
  return <div style={{overflowY:'auto',height:'100%',padding:'18px 20px',
    scrollbarWidth:'thin',scrollbarColor:'#94a3b8 #f1f5f9'}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:10,marginBottom:18}}>
      {stats.map(s=><div key={s.l} style={{background:'#fff',borderRadius:10,padding:'14px',
        border:'1px solid #e2e8f0',textAlign:'center'}}>
        <div style={{fontSize:22}}>{s.icon}</div>
        <div style={{fontSize:26,fontWeight:900,color:s.c,marginTop:4}}>{s.v}</div>
        <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{s.l}</div>
      </div>)}
    </div>
    {noBank.length>0&&<div style={{background:'#fff',borderRadius:12,padding:'16px',
      border:'1px solid #fee2e2',marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:700,color:'#dc2626',marginBottom:10}}>
        ⚠️ Bank Account Pending ({noBank.length})
      </div>
      <div style={{overflowX:'auto',scrollbarWidth:'thin'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
          <thead><tr style={{background:'#fef2f2'}}>
            {['Name','Emp Code','Branch','Client','Contact'].map(h=><th key={h}
              style={{padding:'7px 9px',textAlign:'left',fontSize:10,color:'#64748b',fontWeight:600}}>{h}</th>)}
          </tr></thead>
          <tbody>{noBank.map((r,i)=><tr key={i} style={{borderBottom:'1px solid #fef2f2'}}>
            <td style={{padding:'6px 9px',fontWeight:600}}>{r.name}</td>
            <td style={{padding:'6px 9px'}}>{r.emp_code}</td>
            <td style={{padding:'6px 9px'}}>{r.branch}</td>
            <td style={{padding:'6px 9px',fontSize:10}}>{r.client?.split('(')[0]?.trim()}</td>
            <td style={{padding:'6px 9px'}}>{r.contact}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>}
    {noSSF.length>0&&<div style={{background:'#fff',borderRadius:12,padding:'16px',border:'1px solid #fee2e2'}}>
      <div style={{fontSize:13,fontWeight:700,color:'#dc2626',marginBottom:10}}>
        ⚠️ SSF Registration Pending ({noSSF.length})
      </div>
      <div style={{overflowX:'auto',scrollbarWidth:'thin'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
          <thead><tr style={{background:'#fef2f2'}}>
            {['Name','Emp Code','Branch','Client','Contact'].map(h=><th key={h}
              style={{padding:'7px 9px',textAlign:'left',fontSize:10,color:'#64748b',fontWeight:600}}>{h}</th>)}
          </tr></thead>
          <tbody>{noSSF.map((r,i)=><tr key={i} style={{borderBottom:'1px solid #fef2f2'}}>
            <td style={{padding:'6px 9px',fontWeight:600}}>{r.name}</td>
            <td style={{padding:'6px 9px'}}>{r.emp_code}</td>
            <td style={{padding:'6px 9px'}}>{r.branch}</td>
            <td style={{padding:'6px 9px',fontSize:10}}>{r.client?.split('(')[0]?.trim()}</td>
            <td style={{padding:'6px 9px'}}>{r.contact}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>}
    {noBank.length===0&&noSSF.length===0&&<div style={{textAlign:'center',padding:40,color:'#16a34a'}}>
      <div style={{fontSize:48}}>✅</div>
      <div style={{fontSize:16,fontWeight:700,marginTop:12}}>All Pending Items Completed!</div>
      <div style={{fontSize:12,color:'#64748b',marginTop:6}}>Bank accounts and SSF registrations are all done.</div>
    </div>}
  </div>
}

// ── TABS ──────────────────────────────────────────────────────────────
const TABS=[
  {id:'dashboard',  label:'📊 Dashboard'},
  {id:'branch',     label:'🏢 Branch Wise'},
  {id:'pending',    label:'⏳ Pending'},
  {id:'gender',     label:'👥 Gender Wise'},
  {id:'aon',        label:'⏱️ AON Wise'},
  {id:'client',     label:'🤝 Client Wise'},
  {id:'position',   label:'💼 Position Wise'},
  {id:'mdb',        label:'📋 Master Database'},
  {id:'inactive',   label:'❌ Inactive (All)'},
  {id:'inactive3',  label:'📅 3rd Month Inactive'},
  {id:'inactive2',  label:'📅 2nd Month Inactive'},
  {id:'inactive1',  label:'📅 Last Month Inactive'},
]

// ══════════════════════════════════════════════════════════════════════
export default function MasterDatabasePage() {
  const sess=getSession()
  const company=sess.company||{}

  const [tab,setTab]=useState('dashboard')
  const [mdb,setMdb]=useState(()=>loadRows(KEY_MDB,INITIAL_MDB))
  const [inactive,setInactive]=useState(()=>loadRows(KEY_INACTIVE,INITIAL_INACTIVE))

  // Monthly inactive splits by tenure
  const in3=inactive.filter(r=>{const d=Number(r.tenure_days)||0;return d>150&&d<=210})
  const in2=inactive.filter(r=>{const d=Number(r.tenure_days)||0;return d>90&&d<=150})
  const in1=inactive.filter(r=>{const d=Number(r.tenure_days)||0;return d>=0&&d<=90})

  return (
    <div style={{position:'fixed',inset:0,fontFamily:"'Segoe UI',system-ui,sans-serif",
      background:'#f0f9ff',display:'flex',flexDirection:'column',zIndex:10,overflow:'hidden'}}>

      <style>{`
        @media print{body *{visibility:hidden!important}
          #mdb-main,#mdb-main *{visibility:visible!important}
          #mdb-main{position:fixed;top:0;left:0;width:100%}
          .no-print{display:none!important}}
        ::-webkit-scrollbar{width:8px;height:8px}
        ::-webkit-scrollbar-track{background:#f1f5f9;border-radius:4px}
        ::-webkit-scrollbar-thumb{background:#94a3b8;border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:#475569}
      `}</style>

      {/* HEADER */}
      <div style={{background:G,padding:'11px 18px',color:'#fff',flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontSize:10,opacity:.7}}>
              Employee Lifecycle › Recruitment & Hiring › Recruitment Management
            </div>
            <div style={{fontSize:17,fontWeight:900,marginTop:1}}>
              📊 Master Database — {company.name||'Vianet / Abasar Nepal'}
            </div>
            <div style={{fontSize:10,opacity:.8,marginTop:2}}>
              527 Active · 210 Inactive · Grand Total: 737
            </div>
          </div>
          <div style={{display:'flex',gap:6}} className="no-print">
            <button onClick={()=>{
              const all=[...mdb,...inactive]
              const h=Object.keys(all[0]||{}).join(',')
              const b=all.map(r=>Object.values(r).map(v=>`"${(v||'').replace(/"/g,'""')}"`).join(','))
              const a=document.createElement('a')
              a.href=URL.createObjectURL(new Blob(['\uFEFF'+[h,...b].join('\n')],{type:'text/csv'}))
              a.download=`MasterDatabase_${new Date().toISOString().split('T')[0]}.csv`; a.click()
            }} style={{padding:'7px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,.3)',
              background:'rgba(255,255,255,.18)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              📤 Export All
            </button>
            <button onClick={()=>window.print()}
              style={{padding:'7px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,.3)',
                background:'rgba(255,255,255,.18)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              🖨️ Print
            </button>
          </div>
        </div>
      </div>

      {/* TAB BAR */}
      <div style={{background:'#fff',borderBottom:'2px solid #e2e8f0',display:'flex',
        overflowX:'auto',flexShrink:0,scrollbarWidth:'none',
        boxShadow:'0 2px 6px rgba(0,0,0,.04)',position:'relative',zIndex:4}}>
        <style>{`.mdb-tabs::-webkit-scrollbar{display:none}`}</style>
        <div className="mdb-tabs" style={{display:'flex',overflowX:'auto',scrollbarWidth:'none'}}>
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'10px 13px',border:'none',background:'transparent',
              color:tab===t.id?'#0369a1':'#64748b',fontWeight:tab===t.id?700:500,
              fontSize:11.5,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,
              borderBottom:tab===t.id?'2.5px solid #0369a1':'2.5px solid transparent',
              transition:'all .15s',boxShadow:tab===t.id?'inset 0 -2px 0 #0369a1':'none'}}>
            {t.label}
          </button>)}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{flex:1,overflow:'hidden',position:'relative'}} id="mdb-main">
        {tab==='dashboard'  && <DashboardTab mdb={mdb} inactive={inactive}/>}
        {tab==='branch'     && <SummaryTab title="Branch Wise Headcount"
          data={BRANCH_DATA.map(d=>({branch:d.branch,count:d.count}))} lk="branch" vk="count" chartType="bar"/>}
        {tab==='pending'    && <PendingTab mdb={mdb}/>}
        {tab==='gender'     && <SummaryTab title="Gender Wise Distribution"
          data={[{gender:'Male',count:398},{gender:'Female',count:86},{gender:'Unknown',count:43}]}
          lk="gender" vk="count" chartType="pie"/>}
        {tab==='aon'        && <SummaryTab title="AON (Age on Network) Wise"
          data={AON_DATA.map(d=>({aon:d.aon,count:d.count}))} lk="aon" vk="count" chartType="bar"/>}
        {tab==='client'     && <SummaryTab title="Client Wise Distribution"
          data={[{client:'Konnect Solutions Pvt. Ltd. (Abasar Nepal)',count:270},{client:'Vianet Communication Limited',count:257}]}
          lk="client" vk="count" chartType="pie"/>}
        {tab==='position'   && <SummaryTab title="Position Wise Headcount"
          data={POSITION_DATA.map(d=>({position:d.pos,count:d.count}))} lk="position" vk="count" chartType="bar"/>}
        {tab==='mdb'        && <DataTable rows={mdb} cols={MDB_COLS}
          storageKey={KEY_MDB} onUpdate={setMdb}/>}
        {tab==='inactive'   && <DataTable rows={inactive} cols={INACTIVE_COLS}
          storageKey={KEY_INACTIVE} onUpdate={setInactive}/>}
        {tab==='inactive3'  && <DataTable rows={in3} cols={INACTIVE_COLS}
          storageKey="elogix_mdb_in3" onUpdate={()=>{}} readOnly/>}
        {tab==='inactive2'  && <DataTable rows={in2} cols={INACTIVE_COLS}
          storageKey="elogix_mdb_in2" onUpdate={()=>{}} readOnly/>}
        {tab==='inactive1'  && <DataTable rows={in1} cols={INACTIVE_COLS}
          storageKey="elogix_mdb_in1" onUpdate={()=>{}} readOnly/>}
      </div>
    </div>
  )
}
