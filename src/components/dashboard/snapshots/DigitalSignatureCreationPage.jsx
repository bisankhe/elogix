// FILE: DigitalSignatureCreationPage.jsx — Digital Signature Creation
// Employee creates own signature: Draw | Upload | Type
// Used for: NDA, Employment Contract, Offer Acceptance, HR Letters
import { useState, useRef, useEffect } from 'react'

const G = 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#3b82f6 100%)'
const A = '#1e3a5f'

const EXISTING = [
  { id:'s1', emp_id:'EMP-0142', name:'Gita Maharjan', method:'drawn', created:'2025-06-13', docs_signed:5, active:true },
  { id:'s2', emp_id:'EMP-0141', name:'Sunita Rai', method:'typed', created:'2025-06-15', docs_signed:2, active:true },
  { id:'s3', emp_id:'EMP-0098', name:'John Williams', method:'uploaded', created:'2025-05-22', docs_signed:8, active:true },
]

export default function DigitalSignatureCreationPage() {
  const [mode, setMode] = useState('create') // 'create' | 'list'
  const [method, setMethod] = useState('draw') // 'draw' | 'type' | 'upload'
  const [typedName, setTypedName] = useState('')
  const [typedFont, setTypedFont] = useState('cursive')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [saved, setSaved] = useState(null)
  const [msg, setMsg] = useState('')
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  useEffect(()=>{
    if (method==='draw'&&canvasRef.current) {
      const canvas = canvasRef.current
      canvas.width = canvas.offsetWidth
      canvas.height = 140
      const ctx = canvas.getContext('2d')
      ctx.strokeStyle = '#1e3a5f'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctxRef.current = ctx
    }
  }, [method])

  const startDraw = (e) => {
    if (!ctxRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.touches?.[0]||e).clientX - rect.left
    const y = (e.touches?.[0]||e).clientY - rect.top
    ctxRef.current.beginPath()
    ctxRef.current.moveTo(x, y)
    setIsDrawing(true)
  }
  const draw = (e) => {
    if (!isDrawing||!ctxRef.current) return
    e.preventDefault()
    ctxRef.current.lineTo(x, y)
    ctxRef.current.stroke()
  }
  const endDraw = () => setIsDrawing(false)
  const clearCanvas = () => {
    if (!ctxRef.current||!canvasRef.current) return
    ctxRef.current.clearRect(0,0,canvasRef.current.width,canvasRef.current.height)
  }

  const saveSignature = () => {
    if (method==='draw'&&canvasRef.current) {
      const data = canvasRef.current.toDataURL()
      setSaved({method:'drawn',data})
      notify('✅ Signature saved! Used for: NDA, Contracts, Offer Letters, HR Forms.')
    } else if (method==='type'&&typedName) {
      setSaved({method:'typed',data:typedName,font:typedFont})
      notify('✅ Typed signature saved as: '+typedName)
    } else if (method==='upload'&&uploadedFile) {
      setSaved({method:'uploaded',data:uploadedFile.name})
      notify('✅ Signature uploaded from: '+uploadedFile.name)
    } else {
      notify('⚠️ Please create your signature first')
    }
  }

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:G,borderRadius:14,padding:'18px 24px',marginBottom:16,color:'#fff'}}>
        <div style={{fontSize:18,fontWeight:900}}>✍️ Digital Signature Creation</div>
        <div style={{fontSize:11,opacity:.8,marginTop:3}}>Your digital signature is used for NDA, Employment Contract, Offer Acceptance, and all HR letters. Nepal: Electronic Transactions Act 2063 — legally valid.</div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{msg}</div>}

      <div style={{display:'flex',gap:2,background:'#f1f5f9',padding:4,borderRadius:12,marginBottom:16,width:'fit-content'}}>
        {[['create','✍️ Create My Signature'],['list','📋 All Signatures']].map(([k,l])=>(
          <button key={k} onClick={()=>setMode(k)} style={{padding:'9px 20px',borderRadius:9,border:'none',cursor:'pointer',fontSize:11,background:mode===k?'#fff':'transparent',color:mode===k?A:'#64748b',fontWeight:mode===k?700:400,boxShadow:mode===k?'0 1px 4px rgba(0,0,0,.1)':'none'}}>{l}</button>
        ))}
      </div>

      {mode==='create'&&(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'24px'}}>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:10}}>Choose Signature Method</div>
            <div style={{display:'flex',gap:8}}>
              {[['draw','✏️ Draw Signature','Freehand with mouse or touch'],
                ['type','⌨️ Type Your Name','Choose from signature fonts'],
                ['upload','📎 Upload Existing','Attach your saved signature image']].map(([k,l,d])=>(
                <div key={k} onClick={()=>setMethod(k)}
                  style={{flex:1,padding:'14px 12px',borderRadius:12,border:`2px solid ${method===k?A:'#e2e8f0'}`,background:method===k?`${A}08`:'#fff',cursor:'pointer',textAlign:'center'}}>
                  <div style={{fontSize:18,marginBottom:6}}>{l.split(' ')[0]}</div>
                  <div style={{fontSize:10,fontWeight:700,color:method===k?A:'#374151'}}>{l.split(' ').slice(1).join(' ')}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{d}</div>
                </div>
              ))}
            </div>
          </div>

          {method==='draw'&&(
            <div>
              <div style={{fontSize:10,fontWeight:700,color:'#374151',marginBottom:6}}>Draw your signature below:</div>
              <div style={{border:'2px solid #e2e8f0',borderRadius:12,background:'#f8fafc',position:'relative',userSelect:'none'}}>
                <canvas ref={canvasRef} style={{display:'block',width:'100%',height:140,cursor:'crosshair',touchAction:'none'}}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}/>
                <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',pointerEvents:'none',color:'#e2e8f0',fontSize:12}}>
                  Sign here →
                </div>
              </div>
              <div style={{display:'flex',gap:8,marginTop:8}}>
                <button onClick={clearCanvas} style={{padding:'7px 16px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,cursor:'pointer'}}>🗑️ Clear</button>
              </div>
            </div>
          )}

          {method==='type'&&(
            <div>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Type Your Full Name</label>
                <input value={typedName} onChange={e=>setTypedName(e.target.value)} placeholder="Your Name"
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
              </div>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>Choose Font Style</label>
                <div style={{display:'flex',gap:8}}>
                  {['cursive','Georgia, serif','Palatino, serif'].map(f=>(
                    <button key={f} onClick={()=>setTypedFont(f)} style={{flex:1,padding:'8px',borderRadius:9,border:`2px solid ${typedFont===f?A:'#e2e8f0'}`,background:typedFont===f?`${A}08`:'#fff',cursor:'pointer'}}>
                      <span style={{fontFamily:f,fontSize:16,color:'#1e293b'}}>{typedName||'Preview'}</span>
                    </button>
                  ))}
                </div>
              </div>
              {typedName&&(
                <div style={{border:'2px solid #e2e8f0',borderRadius:12,background:'#f8fafc',padding:'24px',textAlign:'center'}}>
                  <span style={{fontFamily:typedFont,fontSize:32,color:'#1e293b'}}>{typedName}</span>
                </div>
              )}
            </div>
          )}

          {method==='upload'&&(
            <div>
              <div style={{border:'2px dashed #e2e8f0',borderRadius:12,padding:'32px',textAlign:'center',background:'#f8fafc',cursor:'pointer',position:'relative'}}
                onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();setUploadedFile(e.dataTransfer.files[0])}}>
                <div style={{fontSize:32,marginBottom:8}}>📎</div>
                <div style={{fontSize:11,color:'#64748b'}}>{uploadedFile?'✅ '+uploadedFile.name:'Drag & Drop or Click to Upload Signature Image'}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>PNG, JPG or SVG — transparent background preferred</div>
                <input type="file" accept="image/*" onChange={e=>setUploadedFile(e.target.files[0])} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}}/>
              </div>
            </div>
          )}

          {saved&&(
            <div style={{marginTop:14,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'12px 16px',fontSize:11,color:'#065f46'}}>
              ✅ <strong>Signature Saved ({saved.method})</strong> — Will be used for: NDA, Employment Contract, Offer Acceptance, HR Letters, Exit Forms
            </div>
          )}

          <div style={{display:'flex',gap:10,marginTop:16}}>
            <button onClick={saveSignature} style={{flex:1,padding:'12px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>💾 Save My Digital Signature</button>
          </div>
        </div>
      )}

      {mode==='list'&&(
        <div style={{display:'grid',gap:10}}>
          {EXISTING.map(s=>(
            <div key={s.id} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 18px',display:'flex',gap:14,alignItems:'center'}}>
              <div style={{width:60,height:40,borderRadius:8,background:'#f8fafc',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>✍️</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{s.name} <span style={{fontSize:10,color:'#94a3b8'}}>{s.emp_id}</span></div>
                <div style={{fontSize:10,color:'#64748b'}}>Method: {s.method} · Created: {s.created} · {s.docs_signed} documents signed</div>
              </div>
              <span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>✅ Active</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
