// FILE: FamilyDetailsPage.jsx - Family Details (Employee Database)
// Dependent tracking for SSF dependent-family-protection scheme + benefits enrollment

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#831843 0%,#db2777 60%,#f9a8d4 100%)'
const A = '#db2777'

const FAMILY = [
  { id:'f1', name:'Suresh Maharjan', relationship:'Father', dob:'1965-04-10', dependent:true, occupation:'Retired', benefits_enrolled:false, last_verified:'2025-06-17' },
  { id:'f2', name:'Sita Maharjan', relationship:'Mother', dob:'1968-09-22', dependent:true, occupation:'Homemaker', benefits_enrolled:false, last_verified:'2025-06-17' },
  { id:'f3', name:'Rohan Maharjan', relationship:'Spouse', dob:'1995-01-15', dependent:false, occupation:'Software Engineer', benefits_enrolled:true, last_verified:'2025-06-17' },
]

const RELATIONSHIP_ICONS = {Father:'👨',Mother:'👩',Spouse:'💑',Son:'👦',Daughter:'👧',Sibling:'👫'}

export default function FamilyDetailsPage() {
  const [family, setFamily] = useState(FAMILY)

  const [form, setForm] = useState({})
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const dependentCount = family.filter(f=>f.dependent).length
  const benefitsCount = family.filter(f=>f.benefits_enrolled).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="👨‍👩‍👧" title="Family Details"
        breadcrumb="Employee Lifecycle > Employee Records > Employee Database"
        gradient={G}
        stats={[
          {icon:'👨‍👩‍👧',label:'Family Members',value:family.length},
          {icon:'🛡',label:'Dependents',       value:dependentCount},
          {icon:'✅',label:'Benefits Enrolled', value:benefitsCount},
          {icon:'📅',label:'Last Verified',     value:'Jun 2025'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add Family Member"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fdf2f8',border:'1px solid #fbcfe8',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#831843',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Compliance:</strong> Family background recording is mandatory under Labour Act 2074 for SSF dependent family protection scheme administration. Data treated as highly sensitive - limited access to HR/benefits administrators only. Annual verification recommended.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
        {family.map(f=>(
          <LuxCard key={f.id} color={A} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:f.name,impact_links:['Emergency Contact','Benefits Enrollment']}})}}>
            <div style={{padding:'16px 16px 10px',display:'flex',gap:12,alignItems:'flex-start'}}>
              <div style={{width:44,height:44,borderRadius:14,background:`${A}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{RELATIONSHIP_ICONS[f.relationship]||'👤'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{f.name}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{f.relationship} . DOB {f.dob}</div>
              </div>
            </div>
            <div style={{padding:'0 16px 10px',fontSize:10,color:'#64748b'}}>
              <div>Occupation: {f.occupation}</div>
              <div style={{display:'flex',gap:5,marginTop:6}}>
                <span style={{background:f.dependent?'#fdf2f8':'#f8fafc',color:f.dependent?A:'#94a3b8',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{f.dependent?'Dependent':'Non-dependent'}</span>
                <span style={{background:f.benefits_enrolled?'#f0fdf4':'#fffbeb',color:f.benefits_enrolled?'#15803d':'#b45309',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{f.benefits_enrolled?'Benefits ✓':'Not Enrolled'}</span>
              </div>
            </div>
            <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
              <button style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>Edit</button>
              <button style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,cursor:'pointer'}}>Enroll Benefits</button>
            </div>
          </LuxCard>
        ))}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:560,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Add Family Member</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Full Name</label><input type="text" value={form.full_name||''} onChange={e=>setForm(p=>({...p,full_name:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Relationship</label><select value={form.relationship||''} onChange={e=>setForm(p=>({...p,relationship:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['Father','Mother','Spouse','Son','Daughter','Sibling'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Date of Birth</label><input type="date" value={form.date_of_birth||''} onChange={e=>setForm(p=>({...p,date_of_birth:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Occupation</label><input type="text" value={form.occupation||''} onChange={e=>setForm(p=>({...p,occupation:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
              </div>
              <label style={{display:'flex',gap:8,alignItems:'center',marginTop:10,fontSize:12,color:'#374151',cursor:'pointer'}}>
                <input type="checkbox" style={{accentColor:A}}/> Mark as dependent (for SSF dependent family protection)
              </label>
              <AIImpact color={A} lines={['Auto-syncs with SSF dependent family protection scheme.','Marking as dependent enables benefits enrollment.','Used to populate default Emergency Contact suggestions.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Add Family Member</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'✏',label:'Edit',key:'edit'},
        {icon:'🛡',label:'Enroll in Benefits',key:'benefits'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Family Details" columns={['Name','Relationship','Date of Birth','Occupation','Dependent','Benefits Enrolled']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
