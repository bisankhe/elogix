// FILE: InsourcePayrollPage.jsx - Insource Payroll (Payroll & Compensation)
// Direct-employee payroll register: gross-to-net per employee, statutory
// deduction breakdown, batch finalize/lock.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const PAYROLL_REGISTER = [
  { id:'ip1', employee:'Gita Maharjan', dept:'IT', gross_npr:60000, ssf_npr:4092, tds_npr:2100, other_deductions_npr:0, net_npr:53808, status:'finalized', impact_links:['Salary Structure','Tax Setup'] },
  { id:'ip2', employee:'Bikash Shrestha', dept:'IT', gross_npr:55000, ssf_npr:3750, tds_npr:1750, other_deductions_npr:1500, net_npr:48000, status:'finalized', impact_links:[] },
  { id:'ip3', employee:'Maya Pradhan', dept:'Finance', gross_npr:48000, ssf_npr:3300, tds_npr:1200, other_deductions_npr:0, net_npr:43500, status:'pending', impact_links:['Cash Advance'] },
]

const STATUS_CFG = {finalized:{c:'#10b981',bg:'#f0fdf4',label:'Finalized'},pending:{c:'#f59e0b',bg:'#fffbeb',label:'Pending Review'}}

export default function InsourcePayrollPage() {
  const [register, setRegister] = useState(PAYROLL_REGISTER)
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = register.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))
  const totalGross = register.reduce((s,r)=>s+r.gross_npr,0)
  const totalNet = register.reduce((s,r)=>s+r.net_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏢" title="Insource Payroll"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Setup"
        gradient={G}
        stats={[
          {icon:'👥',label:'Direct Employees', value:register.length},
          {icon:'💰',label:'Total Gross',       value:'NPR '+(totalGross/1000).toFixed(0)+'K'},
          {icon:'💵',label:'Total Net Payable', value:'NPR '+(totalNet/1000).toFixed(0)+'K'},
          {icon:'✅',label:'Finalized',          value:register.filter(r=>r.status==='finalized').length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🏢</span>
        <div style={{flex:1,minWidth:220}}><strong>Full Control, In-House:</strong> Direct/permanent staff payroll processed entirely within NepHR Pro - zero third-party hand-off. All appointment letters, remuneration terms, and benefit entitlements stay native to this system per Nepal LA2074.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',marginTop:14}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Employee','Dept','Gross','SSF','TDS','Other Ded.','Net Pay','Status'].map(h=>(
                <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A,whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(r=>{
                const sc = STATUS_CFG[r.status]
                return (
                  <tr key={r.id} style={{borderBottom:'1px solid #f8fafc'}}
                    onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}>
                    <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{r.employee}</td>
                    <td style={{padding:'9px 12px',color:'#64748b',fontSize:10}}>{r.dept}</td>
                    <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{r.gross_npr.toLocaleString()}</td>
                    <td style={{padding:'9px 12px',color:'#ef4444'}}>-{r.ssf_npr.toLocaleString()}</td>
                    <td style={{padding:'9px 12px',color:'#ef4444'}}>-{r.tds_npr.toLocaleString()}</td>
                    <td style={{padding:'9px 12px',color:'#ef4444'}}>{r.other_deductions_npr>0?'-'+r.other_deductions_npr.toLocaleString():'-'}</td>
                    <td style={{padding:'9px 12px',fontWeight:800,color:A}}>{r.net_npr.toLocaleString()}</td>
                    <td style={{padding:'9px 12px'}}><span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Payslip',key:'view'},{icon:'✏',label:'Edit (if pending)',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
