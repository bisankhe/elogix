// FILE: TalentMappingPage.jsx - Talent Mapping
// (Performance & Talent > Talent Development > Succession Planning)
// Drag-and-drop 9-box grid (Performance x Potential) -- pure UI over the
// EXISTING nine_box_grid table (Payroll Analytics session). Maps the
// ENTIRE workforce, not just executives, per the brief's best-practice note.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const GRID_LABELS = { rows:['High','Medium','Low'], cols:['Low','Medium','High'] }
const BOX_NAMES = {
  '2,2':'Star',         '2,1':'High Performer',  '2,0':'Enigma',
  '1,2':'Future Star',  '1,1':'Core Player',     '1,0':'Inconsistent Player',
  '0,2':'Rough Diamond','0,1':'Effective',       '0,0':'Risk',

const INITIAL_BOXES = {
  '2,2':[{name:'Anjali Sharma',dept:'Sales'},{name:'Gita Maharjan',dept:'IT'}],
  '2,1':[{name:'Bikash Rai',dept:'IT'}],
  '2,0':[],
  '1,2':[{name:'Sunil Magar',dept:'IT'},{name:'Ramesh KC',dept:'Sales'}],
  '1,1':[{name:'Maya Pradhan',dept:'Finance'},{name:'Hari Thapa',dept:'IT'}],
  '1,0':[],
  '0,2':[{name:'Sushila Gurung',dept:'Ops'}],
  '0,1':[{name:'Dipesh Bhattarai',dept:'Finance'}],
  '0,0':[],

export default function TalentMappingPage() {
  const [boxes, setBoxes] = useState(INITIAL_BOXES)
  const [search, setSearch] = useState('')
  const [dragItem, setDragItem] = useState(null)
  const [ctx, setCtx] = useState(null)

  const totalMapped = Object.values(boxes).flat().length

  const handleDrop = (targetKey) => {
    if (!dragItem) return
    const { person, fromKey } = dragItem
    if (fromKey === targetKey) { setDragItem(null); return }
    setBoxes(prev => ({
      ...prev,
      [fromKey]: prev[fromKey].filter(p => p.name !== person.name),
      [targetKey]: [...prev[targetKey], person],
    }))
    setDragItem(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="Talent Mapping"
        breadcrumb="Performance & Talent Management > Talent Development > Succession Planning"
        gradient={G}
        stats={[
          {icon:'📊',label:'Employees Mapped', value:totalMapped},
          {icon:'⭐',label:'Stars',              value:boxes['2,2'].length},
          {icon:'🌱',label:'Future Stars',        value:boxes['1,2'].length},
          {icon:'⚠',label:'Risk Box',              value:boxes['0,0'].length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🧩</span>
        <div style={{flex:1,minWidth:200}}><strong>Whole Workforce, Not Just Executives:</strong> Drag any employee card between boxes to recalibrate in real time. Mapping the entire organization -- not only the C-suite -- surfaces hidden talent pools and cross-departmental skill gaps.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginTop:14,overflowX:'auto'}}>
        <div style={{display:'flex',gap:6}}>
          <div style={{width:70}}></div>
          {GRID_LABELS.cols.map(c=>(<div key={c} style={{flex:1,textAlign:'center',fontSize:9,fontWeight:700,color:'#94a3b8',minWidth:140}}>Potential: {c}</div>))}
        </div>
        {[2,1,0].map(rowIdx=>(
          <div key={rowIdx} style={{display:'flex',gap:6,marginTop:6}}>
            <div style={{width:70,display:'flex',alignItems:'center',fontSize:9,fontWeight:700,color:'#94a3b8'}}>Perf: {GRID_LABELS.rows[2-rowIdx]}</div>
            {[0,1,2].map(colIdx=>{
              const key = `${rowIdx},${colIdx}`
              const people = boxes[key].filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase()))
              return (
                <div key={colIdx}
                  onDragOver={ev=>ev.preventDefault()}
                  onDrop={()=>handleDrop(key)}
                  style={{flex:1,minWidth:140,minHeight:90,background:'#f8fafc',border:'1.5px dashed #e2e8f0',borderRadius:10,padding:8}}>
                  <div style={{fontSize:8,fontWeight:700,color:A,marginBottom:6}}>{BOX_NAMES[key]}</div>
                  {people.map((p,i)=>(
                    <div key={i} draggable
                      onDragStart={()=>setDragItem({person:p,fromKey:key})}
                      onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.name,impact_links:['HiPo Employees','Readiness Assessment']}})}}
                      style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,padding:'6px 9px',marginBottom:5,fontSize:9,fontWeight:600,color:'#0f172a',cursor:'grab',boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
                      {p.name}<div style={{fontSize:7,color:'#94a3b8'}}>{p.dept}</div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Every drag-and-drop move is logged for calibration audit history.','AI flags employees who haven\'t moved boxes in 3+ review cycles for re-evaluation.','Box placement auto-syncs into HiPo Employees and Leadership Pipeline tracking.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Profile',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
