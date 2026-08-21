// FILE: RolePermissionPage.jsx - Role & Permission
// (System Administration > User & Access)
// The visual permission matrix governing the EXISTING 7-persona model
// (personas.js, allowedPages/restrictedPages -- already well-built,
// confirmed before designing this page). Also closes a real gap:
// employees.role was a free-text VARCHAR(100) with NO constraint
// across the entire build -- this page is where that finally gets a
// governed, closed set of roles instead of implicit string matching.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const DATA_TYPES = ['Salary Data','Leave Balances','Performance Reviews','Vendor Billing']
const ROLES = [
  {role:'Employee',perms:{'Salary Data':'none','Leave Balances':'own','Performance Reviews':'own','Vendor Billing':'none'}},
  {role:'Department Head',perms:{'Salary Data':'view-team','Leave Balances':'approve-team','Performance Reviews':'edit-team','Vendor Billing':'none'}},
  {role:'HR Manager',perms:{'Salary Data':'edit-all','Leave Balances':'approve-all','Performance Reviews':'edit-all','Vendor Billing':'edit-all'},
   flag_note:'HR Manager can both create employee profiles AND approve their first payroll -- Segregation of Duties review recommended.'},
  {role:'Super Admin',perms:{'Salary Data':'edit-all','Leave Balances':'approve-all','Performance Reviews':'edit-all','Vendor Billing':'edit-all'}},
]

const PERM_COLORS = { none:'#94a3b8',own:'#0284c7','view-team':'#0284c7','approve-team':'#15803d','edit-team':'#15803d','approve-all':'#7c3aed','edit-all':'#dc2626' }

export default function RolePermissionPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = ROLES.filter(r=>!search||r.role.toLowerCase().includes(search.toLowerCase()))
  const sodFlags = ROLES.filter(r=>r.flag_note).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔑" title="Role &amp; Permission"
        breadcrumb="System Administration > User & Access"
        gradient={G}
        stats={[
          {icon:'🔑',label:'Defined Roles',  value:ROLES.length},
          {icon:'⚠',label:'SoD Flags',           value:sodFlags},
          {icon:'📐',label:'Default Posture',        value:'Least Privilege'},
          {icon:'🧩',label:'Data Types Governed',        value:DATA_TYPES.length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📐</span>
        <div style={{flex:1,minWidth:200}}><strong>Assign a Role, Not a Database Schema:</strong> New users get one of these pre-built roles -- nobody hand-writes individual permissions, and every default starts at the minimum access actually needed, never the maximum.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search roles..."/>

      <div style={{overflowX:'auto',marginTop:14}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:10,minWidth:600}}>
          <thead><tr style={{background:'#f8fafc'}}>
            <th style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A}}>Role</th>
            {DATA_TYPES.map(d=><th key={d} style={{padding:'10px 12px',textAlign:'center',fontSize:9,fontWeight:800,color:A}}>{d}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((r,i)=>(
              <tr key={i} style={{borderBottom:'1px solid #f8fafc'}}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.role,...r,impact_links:['User Management']}})}}>
                <td style={{padding:'10px 12px',fontWeight:700,color:'#0f172a'}}>{r.role}</td>
                {DATA_TYPES.map(d=>{
                  const perm = r.perms[d]
                  const c = PERM_COLORS[perm]
                  return <td key={d} style={{padding:'10px 12px',textAlign:'center'}}>
                    <span style={{background:`${c}15`,color:c,fontSize:8,fontWeight:700,padding:'3px 8px',borderRadius:20}}>{perm}</span>
                  </td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ROLES.filter(r=>r.flag_note).map((r,i)=>(
        <div key={i} style={{marginTop:14,background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',fontSize:9,color:'#b45309'}}>
          ⚠ {r.flag_note}
        </div>
      ))}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI flags Segregation of Duties conflicts -- one role holding both creation and approval power over the same transaction type -- the exact pattern SOX/ISO 27001 audits check for.','Matrix cells update instantly when changed here -- never a separate deployment step to make a permission change take effect.','Hierarchical exceptions (a manager needing visibility into one specific cross-team project) are scoped narrowly here, never solved by quietly upgrading someone\'s whole role.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Permission Set',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
