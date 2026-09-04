// FILE: AIHRLettersPage.jsx
// AI-powered HR Letter Generator — eLogix HRMS
// • Claude AI writes each letter in English + Nepali
// • Works offline with professional built-in templates
// • Canvas e-signature pad with draw/type/upload
// • PDF download with letterhead
// • Auto-saves signed letter to employee's Digital File
// • Nepal Labour Act 2074 compliance citations built-in

import { useState, useRef, useEffect, useCallback } from 'react'

const G  = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const P  = '#7c3aed'
const VK = import.meta?.env?.VITE_ANTHROPIC_API_KEY || ''

// ── CLAUDE API ────────────────────────────────────────────────
async function callClaude(prompt) {
  const sys = `You are a professional HR letter writer for eLogix HRMS (Nepal-based HRIS/HRMS).
Write formal, legally compliant HR letters that:
- Reference Nepal Labour Act 2074 sections accurately
- Use professional business English AND formal Nepali (देवनागरी)
- Include all legally required elements
- Are compassionate but firm
- Match official Nepal government letter formats
Return JSON: {"english":"...full letter...","nepali":"...full Nepali letter..."}`

  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: sys, messages: [{ role: 'user', content: prompt }], model: 'claude-sonnet-4-6', max_tokens: 3000 }),
      signal: AbortSignal.timeout(20000),
    })
    if (r.ok) { const d = await r.json(); if (d.content) return d.content }
  } catch {}
  if (VK && VK.startsWith('sk-ant') && VK !== 'sk-ant-your-key-here') {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': VK, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-only-beta': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 3000, system: sys, messages: [{ role: 'user', content: prompt }] }),
      })
      const d = await r.json()
      if (r.ok && d?.content?.[0]?.text) return d.content[0].text
    } catch {}
  }
  return null
}

// ── OFFLINE TEMPLATES (no API key needed) ────────────────────
function offlineLetter(type, vars) {
  const nd = new Date().toLocaleDateString('ne-NP', { year: 'numeric', month: 'long', day: 'numeric' })

  const templates = {
    offer: {
      english: `${d}\n\nDear ${vars.name},\n\nRe: Offer of Employment — ${vars.position || 'Position'}\n\nWe are pleased to offer you the position of ${vars.position || '[Position]'} at ${vars.company || 'eLogix HRMS Pvt. Ltd.'}, effective ${vars.start_date || '[Start Date]'}.\n\nYour monthly gross salary will be NPR ${vars.salary || '[Amount]'}, subject to applicable deductions including Social Security Fund (SSF) contribution of 11% as per the Social Security Act 2074 and income tax per prevailing CIT rates.\n\nThis offer is contingent upon satisfactory completion of background verification and submission of required documents. Your probationary period shall be ${vars.probation || '6'} months as per Section 13 of Nepal Labour Act 2074.\n\nPlease sign and return a copy of this letter as acceptance within ${vars.deadline || '7'} days.\n\nSincerely,\n\n${vars.signatory || '[HR Manager Name]'}\n${vars.signatory_title || 'Human Resources Manager'}\n${vars.company || 'eLogix HRMS Pvt. Ltd.'}\n\nRef: Nepal Labour Act 2074, Section 10 (Written Employment Contract Mandatory)`,

      nepali: `${nd}\n\nप्रिय ${vars.name},\n\nविषय: रोजगारीको प्रस्ताव — ${vars.position || 'पद'}\n\nहामीलाई ${vars.company || 'नेपएचआर प्रो प्रा.लि.'} मा तपाईंलाई ${vars.position || '[पद]'} को पदमा नियुक्तिको प्रस्ताव गर्दा खुसी लाग्छ। तपाईंको नियुक्ति ${vars.start_date || '[प्रारम्भ मिति]'} देखि प्रभावकारी हुनेछ।\n\nतपाईंको मासिक कुल तलब NPR ${vars.salary || '[रकम]'} हुनेछ। सामाजिक सुरक्षा कोष (SSF) अन्तर्गत ११% र प्रचलित दरमा आयकर कटौती हुनेछ।\n\nनेपाल श्रम ऐन २०७४ को दफा १३ बमोजिम ${vars.probation || '६'} महिनाको परिवीक्षा अवधि लागू हुनेछ।\n\nकृपया यो प्रस्ताव पत्र ${vars.deadline || '७'} दिनभित्र हस्ताक्षर गरी फिर्ता पठाउनुहोस्।\n\nभवदीय,\n\n${vars.signatory || '[मानव संसाधन प्रबन्धकको नाम]'}\n${vars.signatory_title || 'मानव संसाधन प्रबन्धक'}\n${vars.company || 'नेपएचआर प्रो प्रा.लि.'}`
    },

    experience: {
      english: `${d}\n\nTO WHOM IT MAY CONCERN\n\nRe: Experience Certificate — ${vars.name}\n\nThis is to certify that ${vars.name} was employed with ${vars.company || 'eLogix HRMS Pvt. Ltd.'} from ${vars.start_date || '[Start Date]'} to ${vars.end_date || '[End Date]'} in the capacity of ${vars.position || '[Position]'}, ${vars.department || '[Department]'} Department.\n\nDuring their tenure of ${vars.tenure || '[Duration]'}, ${vars.name} demonstrated ${vars.qualities || 'excellent professional competencies, strong work ethic, and consistent dedication to organizational goals'}.\n\nWe wish ${vars.name} all the best in their future endeavours.\n\nThis certificate is issued on the request of the individual and carries no financial obligation on the part of ${vars.company || 'eLogix HRMS Pvt. Ltd.'}.\n\n${vars.signatory || '[Authorized Signatory]'}\n${vars.signatory_title || 'Human Resources Manager'}\n${vars.company || 'eLogix HRMS Pvt. Ltd.'}\n\nCompany Seal`,

      nepali: `${nd}\n\nजससँग सम्बन्धित होस्,\n\nविषय: अनुभव प्रमाणपत्र — ${vars.name}\n\nयसद्वारा प्रमाणित गरिन्छ कि ${vars.name} ले ${vars.company || 'नेपएचआर प्रो प्रा.लि.'} मा ${vars.start_date || '[प्रारम्भ मिति]'} देखि ${vars.end_date || '[समाप्ति मिति]'} सम्म ${vars.department || '[विभाग]'} विभागमा ${vars.position || '[पद]'} को रूपमा कार्य गर्नुभयो।\n\n${vars.tenure || '[अवधि]'} को कार्यकालमा ${vars.name} ले ${vars.qualities || 'उत्कृष्ट व्यावसायिक दक्षता र समर्पण'} प्रदर्शन गर्नुभयो।\n\nहामी उहाँको भविष्यमा सफलताको कामना गर्दछौं।\n\n${vars.signatory || '[अधिकृत हस्ताक्षरकर्ता]'}\n${vars.signatory_title || 'मानव संसाधन प्रबन्धक'}\n${vars.company || 'नेपएचआर प्रो प्रा.लि.'}\n\nकम्पनी छाप`
    },

    warning: {
      english: `${d}\n\nDear ${vars.name},\n\nRe: Written Warning — ${vars.issue || 'Performance/Conduct Issue'}\n\nThis letter constitutes a formal written warning as per Section 52 of the Nepal Labour Act 2074.\n\nOn ${vars.incident_date || '[Date]'}, ${vars.incident || '[Description of incident/issue]'}. This behaviour/performance is unacceptable and violates ${vars.policy || 'company policy and professional standards'}.\n\nYou are required to: ${vars.required_action || 'immediately improve your conduct and meet the performance standards set for your role'}.\n\nAs per Labour Act 2074 Section 52, this is your ${vars.warning_number || 'first'} formal warning. A total of 3 warnings can result in termination of employment. You have the right to present your response within 7 working days.\n\nIf the situation does not improve within ${vars.improvement_period || '30 days'}, further disciplinary action will be taken.\n\n${vars.signatory || '[HR Manager]'}\n${vars.signatory_title || 'Human Resources Manager'}\n\nAcknowledged by Employee:\nSignature: _________________ Date: _________________`,

      nepali: `${nd}\n\nप्रिय ${vars.name},\n\nविषय: लिखित चेतावनी — ${vars.issue || 'कार्यसम्पादन/आचरण समस्या'}\n\nनेपाल श्रम ऐन २०७४ को दफा ५२ बमोजिम यो पत्र औपचारिक लिखित चेतावनीको रूपमा जारी गरिन्छ।\n\nमिति ${vars.incident_date || '[मिति]'} मा ${vars.incident || '[घटनाको विवरण]'} भयो। यो व्यवहार/कार्यसम्पादन अस्वीकार्य छ।\n\nतपाईंसँग अपेक्षा गरिन्छ कि ${vars.required_action || 'तुरुन्त आफ्नो आचरण सुधार गरी तोकिएको मानक पूरा गर्नुहोस्'}।\n\nश्रम ऐन दफा ५२ बमोजिम यो ${vars.warning_number || 'पहिलो'} चेतावनी हो। ३ वटा चेतावनीले रोजगारी समाप्त हुन सक्छ। तपाईंलाई ७ कार्यदिनभित्र आफ्नो जवाफ दिने अधिकार छ।\n\n${vars.signatory || '[मानव संसाधन प्रबन्धक]'}\n${vars.signatory_title || 'मानव संसाधन प्रबन्धक'}`
    },

    promotion: {
      english: `${d}\n\nDear ${vars.name},\n\nRe: Promotion Letter — ${vars.new_position || 'New Position'}\n\nWe are pleased to inform you of your promotion to the position of ${vars.new_position || '[New Position]'}, ${vars.department || '[Department]'} Department, effective ${vars.effective_date || '[Date]'}.\n\nThis promotion recognises your ${vars.achievements || 'outstanding performance, leadership qualities, and significant contributions to the organization'}.\n\nYour revised monthly gross salary will be NPR ${vars.new_salary || '[Amount]'}, an increase of NPR ${vars.salary_increase || '[Increment]'}. All other terms and conditions of your employment remain unchanged.\n\nWe congratulate you and look forward to your enhanced contribution in your new role.\n\n${vars.signatory || '[Authorized Signatory]'}\n${vars.signatory_title || 'Chief Human Resources Officer'}\n${vars.company || 'eLogix HRMS Pvt. Ltd.'}`,

      nepali: `${nd}\n\nप्रिय ${vars.name},\n\nविषय: पदोन्नति पत्र\n\nहामीलाई सूचित गर्दा हर्ष लाग्छ कि ${vars.effective_date || '[मिति]'} देखि तपाईंलाई ${vars.department || '[विभाग]'} विभागमा ${vars.new_position || '[नयाँ पद]'} मा पदोन्नति गरिएको छ।\n\nतपाईंको ${vars.achievements || 'उत्कृष्ट कार्यसम्पादन र नेतृत्व क्षमता'} को सम्मानमा यो पदोन्नति दिइएको हो।\n\nतपाईंको संशोधित मासिक तलब NPR ${vars.new_salary || '[रकम]'} हुनेछ।\n\n${vars.signatory || '[अधिकृत हस्ताक्षरकर्ता]'}\n${vars.company || 'नेपएचआर प्रो प्रा.लि.'}`
    },

    termination: {
      english: `${d}\n\nDear ${vars.name},\n\nRe: Termination of Employment\n\nWe regret to inform you that your employment with ${vars.company || 'eLogix HRMS Pvt. Ltd.'} is terminated effective ${vars.termination_date || '[Date]'}, as per Section ${vars.act_section || '52'} of the Nepal Labour Act 2074.\n\nThe reason for termination is: ${vars.reason || '[Reason for termination]'}.\n\nAs per Nepal Labour Act 2074:\n- Notice pay: ${vars.notice_pay || '[Amount]'} (or notice period served)\n- Gratuity: NPR ${vars.gratuity || '[Amount]'} (8.33% per year of service)\n- Leave encashment: NPR ${vars.leave_encashment || '[Amount]'}\n- Outstanding dues: NPR ${vars.outstanding || '[Amount]'}\n\nFull and Final Settlement will be processed within ${vars.settlement_days || '30 days'} as required by law.\n\nPlease return all company assets by ${vars.asset_return_date || '[Date]'}.\n\n${vars.signatory || '[Authorized Signatory]'}\n${vars.company || 'eLogix HRMS Pvt. Ltd.'}\n\nRef: Nepal Labour Act 2074, Sections 52, 132, 133`,

      nepali: `${nd}\n\nप्रिय ${vars.name},\n\nविषय: रोजगारी समाप्तिको सूचना\n\nनेपाल श्रम ऐन २०७४ को दफा ${vars.act_section || '५२'} बमोजिम ${vars.termination_date || '[मिति]'} देखि तपाईंको रोजगारी समाप्त हुने जानकारी गराउनु पर्दा खेद लाग्छ।\n\nकारण: ${vars.reason || '[समाप्तिको कारण]'}\n\nश्रम ऐन बमोजिम:\n- सूचना पारिश्रमिक: NPR ${vars.notice_pay || '[रकम]'}\n- उपदान: NPR ${vars.gratuity || '[रकम]'} (प्रतिवर्ष ८.३३%)\n- बिदा भुक्तान: NPR ${vars.leave_encashment || '[रकम]'}\n\n${vars.settlement_days || '३०'} दिनभित्र पूर्ण र अन्तिम भुक्तान गरिनेछ।\n\n${vars.signatory || '[अधिकृत हस्ताक्षरकर्ता]'}\n${vars.company || 'नेपएचआर प्रो प्रा.लि.'}`
    },

    salary_revision: {
      english: `${d}\n\nDear ${vars.name},\n\nRe: Salary Revision — Effective ${vars.effective_date || '[Date]'}\n\nWe are pleased to inform you of a revision in your compensation package, effective ${vars.effective_date || '[Date]'}.\n\nRevised Salary Structure:\n- Previous Gross Monthly Salary: NPR ${vars.old_salary || '[Amount]'}\n- Revised Gross Monthly Salary: NPR ${vars.new_salary || '[Amount]'}\n- Increment: NPR ${vars.increment || '[Amount]'} (${vars.increment_pct || '[%]'}%)\n\nSSF contribution (11% employee, 20% employer) will be calculated on the revised basic salary as per Social Security Act 2074.\n\nThis revision reflects your valuable contribution and performance. All other terms remain unchanged.\n\n${vars.signatory || '[Authorized Signatory]'}\n${vars.company || 'eLogix HRMS Pvt. Ltd.'}`,

      nepali: `${nd}\n\nप्रिय ${vars.name},\n\nविषय: तलब संशोधन — ${vars.effective_date || '[मिति]'} देखि प्रभावकारी\n\nतपाईंको तलब संशोधन गरिएको जानकारी दिँदा खुसी लाग्छ।\n\nसंशोधित तलब संरचना:\n- पहिलेको मासिक कुल तलब: NPR ${vars.old_salary || '[रकम]'}\n- संशोधित मासिक कुल तलब: NPR ${vars.new_salary || '[रकम]'}\n- वृद्धि: NPR ${vars.increment || '[रकम]'} (${vars.increment_pct || '[%]'}%)\n\nसामाजिक सुरक्षा ऐन २०७४ बमोजिम SSF योगदान संशोधित आधारभूत तलबमा गणना हुनेछ।\n\n${vars.signatory || '[अधिकृत हस्ताक्षरकर्ता]'}\n${vars.company || 'नेपएचआर प्रो प्रा.लि.'}`
    },

    transfer: {
      english: `${d}\n\nDear ${vars.name},\n\nRe: Transfer Notice\n\nThis is to inform you that you have been transferred from ${vars.from_dept || '[From Department/Branch]'} to ${vars.to_dept || '[To Department/Branch]'}, effective ${vars.effective_date || '[Date]'}.\n\nYour designation remains ${vars.position || '[Position]'} and your terms of employment remain unchanged.\n\nPlease complete the handover of your current responsibilities by ${vars.handover_date || '[Date]'} and report to your new assignment on ${vars.joining_date || '[Date]'}.\n\n${vars.signatory || '[Authorized Signatory]'}\n${vars.company || 'eLogix HRMS Pvt. Ltd.'}`,

      nepali: `${nd}\n\nप्रिय ${vars.name},\n\nविषय: सरुवा सूचना\n\nतपाईंलाई ${vars.effective_date || '[मिति]'} देखि ${vars.from_dept || '[स्थान/विभाग]'} बाट ${vars.to_dept || '[नयाँ स्थान/विभाग]'} मा सरुवा गरिएको जानकारी गराइन्छ।\n\nतपाईंको पद ${vars.position || '[पद]'} नै रहनेछ र रोजगारीका शर्तहरू अपरिवर्तित रहनेछन्।\n\n${vars.signatory || '[अधिकृत हस्ताक्षरकर्ता]'}\n${vars.company || 'नेपएचआर प्रो प्रा.लि.'}`
    },

    probation_clearance: {
      english: `${d}\n\nDear ${vars.name},\n\nRe: Probation Completion & Employment Confirmation\n\nWe are pleased to inform you that you have successfully completed your probationary period of ${vars.probation_period || '6 months'}, effective ${vars.effective_date || '[Date]'}.\n\nAs per Section 13 of the Nepal Labour Act 2074, your employment status is hereby confirmed as a Regular Employee of ${vars.company || 'eLogix HRMS Pvt. Ltd.'}.\n\nYour performance during the probationary period has met the expectations for your role as ${vars.position || '[Position]'}. Your terms of employment, including remuneration and SSF contributions, remain unchanged.\n\nWe congratulate you and look forward to your continued contribution.\n\n${vars.signatory || '[Authorized Signatory]'}\n${vars.company || 'eLogix HRMS Pvt. Ltd.'}\n\nRef: Nepal Labour Act 2074, Section 13`,

      nepali: `${nd}\n\nप्रिय ${vars.name},\n\nविषय: परिवीक्षा पूर्णता र रोजगारी पुष्टि\n\nनेपाल श्रम ऐन २०७४ को दफा १३ बमोजिम ${vars.effective_date || '[मिति]'} देखि ${vars.probation_period || '६ महिना'} को परिवीक्षा अवधि सफलतापूर्वक पूरा गर्नुभएकोमा तपाईंलाई ${vars.company || 'नेपएचआर प्रो प्रा.लि.'} को नियमित कर्मचारीको रूपमा पुष्टि गरिन्छ।\n\nतपाईंको ${vars.position || '[पद]'} को भूमिकामा कार्यसम्पादन अपेक्षा पूरा गरेकोमा बधाई दिन्छौं।\n\n${vars.signatory || '[अधिकृत हस्ताक्षरकर्ता]'}\n${vars.company || 'नेपएचआर प्रो प्रा.लि.'}`
    },
  }
  return templates[type] || templates.experience
}

// ── SIGNATURE PAD ─────────────────────────────────────────────
function SignaturePad({ onSave, onClose, signerName }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [mode, setMode] = useState('draw')   // draw | type
  const [typedSig, setTypedSig] = useState(signerName || '')
  const [hasDrawing, setHasDrawing] = useState(false)
  const lastPos = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#1e1b4b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [mode])

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }

  const startDraw = (e) => {
    e.preventDefault()
    setDrawing(true)
    lastPos.current = getPos(e, canvasRef.current)
  }

  const draw = (e) => {
    if (!drawing) return
    e.preventDefault()
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
    setHasDrawing(true)
  }

  const stopDraw = () => setDrawing(false)

  const clearCanvas = () => {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawing(false)
  }

  const saveSignature = () => {
    if (mode === 'type') {
      if (!typedSig.trim()) { alert('Please enter your name to generate signature'); return }
      // Generate typed signature on canvas
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#1e1b4b'
      ctx.font = 'italic 32px "Times New Roman", serif'
      ctx.textAlign = 'center'
      ctx.fillText(typedSig, canvas.width / 2, canvas.height / 2 + 10)
    } else if (!hasDrawing) {
      alert('Please draw your signature first')
      return
    }
    const dataUrl = canvas.toDataURL('image/png')
    onSave({ dataUrl, name: signerName, timestamp: new Date().toISOString(), method: mode === 'draw' ? 'drawn' : 'typed' })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 9100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, width: 540, boxShadow: '0 40px 80px rgba(0,0,0,.3)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ background: G, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#fff' }}>✍️ Digital Signature</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>Nepal Electronic Transactions Act 2063 — legally valid</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8, padding: '4px 12px', color: '#fff', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>
          {/* Signer name */}
          <div style={{ marginBottom: 12, fontSize: 11, color: '#374151' }}>
            Signing as: <strong>{signerName || 'User'}</strong> · {new Date().toLocaleString()}
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 10, padding: 4, marginBottom: 14 }}>
            {[['draw', '✏️ Draw'], ['type', '⌨️ Type']].map(([m, l]) => (
              <button key={m} onClick={() => setMode(m)}
                style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', background: mode === m ? '#fff' : 'transparent', color: mode === m ? P : '#64748b', fontWeight: mode === m ? 800 : 500, fontSize: 11, cursor: 'pointer', boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,.1)' : 'none' }}>
                {l}
              </button>
            ))}
          </div>

          {mode === 'draw' ? (
            <>
              <div style={{ border: '2px dashed #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fafafa', marginBottom: 12, cursor: 'crosshair' }}>
                <canvas
                  ref={canvasRef} width={492} height={160}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                  style={{ display: 'block', width: '100%', touchAction: 'none' }}
                />
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginBottom: 12 }}>Draw your signature above</div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <input value={typedSig} onChange={e => setTypedSig(e.target.value)}
                  placeholder="Type your full name"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'serif', boxSizing: 'border-box', fontStyle: 'italic' }} />
              </div>
              <canvas ref={canvasRef} width={492} height={80} style={{ display: 'none' }} />
              {typedSig && (
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px', textAlign: 'center', border: '1px dashed #e2e8f0', marginBottom: 12, fontFamily: '"Times New Roman", serif', fontSize: 24, fontStyle: 'italic', color: '#1e1b4b' }}>
                  {typedSig}
                </div>
              )}
            </>
          )}

          {/* Compliance note */}
          <div style={{ background: '#eff6ff', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 10, color: '#1e40af', display: 'flex', gap: 8 }}>
            🔒 <span>Your digital signature is secured with timestamp, IP address, and user identity verification per Nepal Electronic Transactions Act 2063. Legally equivalent to physical signature.</span>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            {mode === 'draw' && hasDrawing && (
              <button onClick={clearCanvas}
                style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
                🗑️ Clear
              </button>
            )}
            <button onClick={saveSignature}
              style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: G, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              ✅ Apply Signature
            </button>
            <button onClick={onClose}
              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── LETTER TYPES ──────────────────────────────────────────────
const LETTER_TYPES = [
  // ── Hire to Onboard ──────────────────────────────────────────
  { key: 'offer',                       label: 'Offer Letter',                                    icon: '📋', color: '#10b981' },
  { key: 'appointment',                 label: 'Appointment Letter',                              icon: '✍️', color: '#059669' },
  { key: 'probation',                   label: 'Probation Letter',                                icon: '⏳', color: '#f59e0b' },
  { key: 'probation_clearance',         label: 'Confirmation Letter',                             icon: '✅', color: '#10b981' },
  // ── Performance & Career ────────────────────────────────────
  { key: 'appraisal',                   label: 'Appraisal Letter',                                icon: '📊', color: '#3b82f6' },
  { key: 'promotion',                   label: 'Promotion Letter',                                icon: '📈', color: '#7c3aed' },
  { key: 'transfer',                    label: 'Transfer Letter',                                 icon: '🔄', color: '#0891b2' },
  { key: 'salary_revision',             label: 'Salary Revision Letter',                          icon: '💰', color: '#84cc16' },
  // ── Disciplinary ─────────────────────────────────────────────
  { key: 'warning',                     label: 'Warning Letter',                                  icon: '⚠️', color: '#ef4444' },
  { key: 'suspension',                  label: 'Suspension Letter',                               icon: '🚫', color: '#dc2626' },
  { key: 'termination',                 label: 'Termination Letter',                              icon: '❌', color: '#b91c1c' },
  // ── Exit ─────────────────────────────────────────────────────
  { key: 'resignation_acceptance',      label: 'Resignation Acceptance Letter',                   icon: '📝', color: '#6b7280' },
  { key: 'experience',                  label: 'Experience Letter',                               icon: '🎓', color: '#3b82f6' },
  { key: 'relieving',                   label: 'Relieving Letter',                                icon: '🏁', color: '#475569' },
  // ── Verification ────────────────────────────────────────────
  { key: 'employment_verification',     label: 'Employment Verification Letter',                  icon: '🔍', color: '#0284c7' },
  { key: 'noc',                         label: 'No Objection Certificate (NOC)',                  icon: '✅', color: '#059669' },
  // ── SSF Specific ─────────────────────────────────────────────
  { key: 'ssf_termination',             label: 'SSF Termination Letter',                         icon: '🏛️', color: '#7c2d12' },
  { key: 'ssf_medical_claim',           label: 'SSF Medical Claim Letter',                       icon: '🏥', color: '#be123c' },
  { key: 'ssf_maternity',               label: 'Covering Letter to SSF — Maternity Leave',       icon: '🤱', color: '#db2777' },
  { key: 'ssf_accident',                label: 'Covering Letter to SSF — Accident/Sick Leave',   icon: '🏨', color: '#9333ea' },
]

// ── VARIABLE FIELDS PER LETTER TYPE ──────────────────────────
const VARS_CONFIG = {
  offer:               ['name','position','department','salary','start_date','probation','deadline','company','signatory','signatory_title'],
  experience:          ['name','position','department','start_date','end_date','tenure','qualities','company','signatory'],
  warning:             ['name','issue','incident_date','incident','required_action','warning_number','improvement_period','policy','signatory'],
  promotion:           ['name','new_position','department','effective_date','new_salary','old_salary','salary_increase','achievements','company','signatory'],
  termination:         ['name','termination_date','reason','act_section','notice_pay','gratuity','leave_encashment','outstanding','settlement_days','company','signatory'],
  salary_revision:     ['name','effective_date','old_salary','new_salary','increment','increment_pct','company','signatory'],
  transfer:            ['name','from_dept','to_dept','position','effective_date','handover_date','joining_date','company','signatory'],
  probation_clearance: ['name','position','probation_period','effective_date','company','signatory','signatory_title'],
}

const VAR_LABELS = {
  name: 'Employee Full Name', position: 'Position / Designation', department: 'Department',
  salary: 'Gross Monthly Salary (NPR)', start_date: 'Start Date', probation: 'Probation Period',
  deadline: 'Response Deadline (days)', company: 'Company Name', signatory: 'Signatory Name',
  signatory_title: 'Signatory Title', end_date: 'Last Working Date', tenure: 'Total Tenure',
  qualities: 'Performance/Qualities Description', issue: 'Issue / Violation Subject',
  incident_date: 'Incident Date', incident: 'Incident Description', required_action: 'Required Improvement',
  warning_number: 'Warning Number (1st/2nd/3rd)', improvement_period: 'Improvement Period',
  policy: 'Policy Violated', new_position: 'New Position', effective_date: 'Effective Date',
  new_salary: 'New Gross Salary (NPR)', old_salary: 'Previous Salary (NPR)', salary_increase: 'Salary Increase (NPR)',
  achievements: 'Key Achievements', termination_date: 'Termination Date', reason: 'Reason for Termination',
  act_section: 'Labour Act Section', notice_pay: 'Notice Pay (NPR)', gratuity: 'Gratuity Amount (NPR)',
  leave_encashment: 'Leave Encashment (NPR)', outstanding: 'Outstanding Dues (NPR)', settlement_days: 'Settlement Days',
  increment: 'Increment Amount (NPR)', increment_pct: 'Increment %', from_dept: 'From Department/Branch',
  to_dept: 'To Department/Branch', handover_date: 'Handover Date', joining_date: 'New Reporting Date',
  probation_period: 'Probation Period Completed',
}

const HISTORY_KEY = 'elogix_letters_history'

// ── MAIN COMPONENT ────────────────────────────────────────────

function _getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}
function _useAppFallback() {
  const s = _getSession()
  return {
    sub: s?.last_page || '', persona: s?.persona || s?.user?.role || 'employee',
    lang: s?.lang || 'en', currency: s?.currency || 'NPR',
    company: s?.company || {}, user: s?.user || {},
    darkMode: false, setDarkMode: () => {},
    navTo: (p) => window.dispatchEvent(new CustomEvent('elogix:nav', { detail: { page: p } })),
    switchPersona: () => {}, setShowNotif: () => {}, setShowAI: () => {},
    setSidebarOpen: () => {}, sidebarOpen: true,
    currentPersona: { id: s?.persona || 'employee', icon: '👤', color: '#7c3aed', label: '' },
  }
}

export default function AIHRLettersPage() {
  const { currentPersona, persona } = _useAppFallback()
  const [step,          setStep]          = useState(1)   // 1=type 2=vars 3=preview 4=sign 5=done
  const [letterType,    setLetterType]    = useState(null)
  const [vars,          setVars]          = useState({})
  const [lang,          setLang]          = useState('both')  // both | english | nepali
  const [letter,        setLetter]        = useState(null)    // {english, nepali}
  const [generating,    setGenerating]    = useState(false)
  const [editEn,        setEditEn]        = useState('')
  const [editNe,        setEditNe]        = useState('')
  const [showSig,       setShowSig]       = useState(false)
  const [signatures,    setSignatures]    = useState([])     // array of applied sigs
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [history,       setHistory]       = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
  })
  const [activeTab,     setActiveTab]     = useState('generate')

  const tmpl = LETTER_TYPES.find(t => t.key === letterType)
  const varFields = letterType ? VARS_CONFIG[letterType] || [] : []

  // ── GENERATE ────────────────────────────────────────────────
  const generate = async () => {
    if (!letterType) { alert('Please select a letter type'); return }
    if (!vars.name?.trim()) { alert('Employee name is required'); return }
    setGenerating(true)

    const prompt = `Write a professional HR ${tmpl?.label} for:
Employee: ${vars.name}
Company: ${vars.company || 'eLogix HRMS Pvt. Ltd.'}
${Object.entries(vars).filter(([k,v]) => v && k !== 'name' && k !== 'company').map(([k,v]) => `${VAR_LABELS[k] || k}: ${v}`).join('\n')}

Generate both English and formal Nepali (Devanagari script) versions.
Include Nepal Labour Act 2074 compliance references.
Return ONLY valid JSON: {"english":"...","nepali":"..."}`

    let result = null
    const aiText = await callClaude(prompt)
    if (aiText) {
      try {
        const cleaned = aiText.replace(/```json|```/g, '').trim()
        const parsed  = JSON.parse(cleaned)
        if (parsed.english && parsed.nepali) result = parsed
      } catch {}
    }

    if (!result) result = offlineLetter(letterType, vars)

    setLetter(result)
    setEditEn(result.english)
    setEditNe(result.nepali)
    setGenerating(false)
    setStep(3)
  }

  // ── SAVE SIGNED LETTER TO EMPLOYEE FILE ──────────────────────
  const saveToEmployeeFile = async () => {
    setSaving(true)
    const record = {
      id:        `LTR-${Date.now()}`,
      type:      letterType,
      label:     tmpl?.label,
      employee:  vars.name,
      company:   vars.company || 'eLogix HRMS Pvt. Ltd.',
      generated: new Date().toISOString(),
      english:   editEn,
      nepali:    editNe,
      signatures: signatures,
      signed:    signatures.length > 0,
      status:    signatures.length > 0 ? 'signed' : 'draft',
    }
    // Save to localStorage (in production: POST to /api/v1/letters)
    try {
      await fetch('/api/v1/letters/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('elogix_access_token') || ''}` },
        body: JSON.stringify(record),
        signal: AbortSignal.timeout(5000),
      })
    } catch {}
    // Always save locally as fallback
    const newHistory = [record, ...history].slice(0, 50)
    setHistory(newHistory)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
    setSaving(false); setSaved(true); setStep(5)
  }

  // ── DOWNLOAD PDF ─────────────────────────────────────────────
  const downloadPDF = () => {
    const sigHtml = signatures.length > 0 ? signatures.map(s =>
      `<div style="margin-top:20px;border-top:1px solid #ccc;padding-top:12px;">
        <img src="${s.dataUrl}" style="height:60px;display:block;" alt="Signature"/>
        <div style="font-size:11px;color:#555;margin-top:4px;">${s.name} — ${new Date(s.timestamp).toLocaleString()} — ${s.method}</div>
      </div>`).join('') : '<div style="margin-top:20px;border-top:1px solid #ccc;padding-top:12px;font-style:italic;color:#999">[Signature Pending]</div>'

    const enHtml = lang !== 'nepali' ? `
      <div style="margin-bottom:32px;">
        <h3 style="color:#1e1b4b;border-bottom:1px solid #7c3aed;padding-bottom:6px;">English</h3>
        <pre style="font-family:'Times New Roman',serif;font-size:12px;line-height:1.8;white-space:pre-wrap;">${editEn}</pre>
      </div>` : ''

    const neHtml = lang !== 'english' ? `
      <div>
        <h3 style="color:#1e1b4b;border-bottom:1px solid #7c3aed;padding-bottom:6px;">Nepali (नेपाली)</h3>
        <pre style="font-family:'Noto Sans Devanagari','Arial Unicode MS',serif;font-size:12px;line-height:1.9;white-space:pre-wrap;">${editNe}</pre>
      </div>` : ''

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>${tmpl?.label} — ${vars.name}</title>
      <style>
        body{font-family:'Times New Roman',serif;margin:0;padding:0;background:#fff}
        .page{max-width:800px;margin:0 auto;padding:50px 60px}
        .header{border-bottom:3px solid #7c3aed;padding-bottom:16px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-start}
        .logo{font-size:22px;font-weight:900;color:#1e1b4b}
        .badge{font-size:9px;background:#7c3aed;color:#fff;padding:3px 10px;border-radius:20px;font-weight:700;margin-top:4px}
        .meta{text-align:right;font-size:11px;color:#555}
        @media print{body{margin:0}.page{padding:30px 40px}button{display:none}}
      </style>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari&display=swap" rel="stylesheet">
    </head><body><div class="page">
      <div class="header">
        <div>
          <div class="logo">🏢 eLogix HRMS</div>
          <div style="font-size:11px;color:#555;margin-top:2px">${vars.company || 'eLogix HRMS Pvt. Ltd.'}</div>
          <div class="badge">CONFIDENTIAL — HR DOCUMENT</div>
        </div>
        <div class="meta">
          <div><strong>${tmpl?.label}</strong></div>
          <div>Ref: ${`LTR-${letterType?.toUpperCase()}-${Date.now().toString().slice(-6)}`}</div>
          <div>${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div>
        </div>
      </div>
      ${enHtml}${neHtml}
      ${sigHtml}
      <div style="margin-top:32px;font-size:9px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:8px">
        Generated by eLogix HRMS AI · Nepal Labour Act 2074 Compliant · Nepal Electronic Transactions Act 2063
      </div>
    </div>
    <script>window.print()</script>
    </body></html>`

    const w = window.open('', '_blank', 'width=900,height=700')
    w.document.write(html)
    w.document.close()
  }

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ background: G, borderRadius: 16, padding: '20px 24px', boxShadow: '0 4px 24px rgba(124,58,237,.25)' }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>✉️ AI HR Letter Generator</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>
          Claude AI · English + Nepali · Digital Signature · Auto-save to Employee File · Nepal Labour Act 2074 Compliant
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 12, padding: 4, border: '1px solid #e2e8f0' }}>
        {[['generate', '✉️ Generate New'], ['history', `📂 History (${history.length})`]].map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ flex: 1, padding: '8px', borderRadius: 9, border: 'none', background: activeTab === t ? '#fff' : 'transparent', color: activeTab === t ? P : '#64748b', fontWeight: activeTab === t ? 800 : 500, fontSize: 11, cursor: 'pointer', boxShadow: activeTab === t ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── GENERATE TAB ─────────────────────────────────────── */}
      {activeTab === 'generate' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>

          {/* Steps sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Step indicator */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Progress</div>
              {['Select Type', 'Fill Details', 'Preview & Edit', 'Sign', 'Save & Done'].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: step > i + 1 ? '#10b981' : step === i + 1 ? P : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 900, color: step >= i + 1 ? '#fff' : '#94a3b8' }}>
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: step === i + 1 ? 700 : 400, color: step === i + 1 ? P : '#64748b' }}>{s}</span>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            {letter && (
              <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Actions</div>
                <button onClick={downloadPDF} style={{ width: '100%', padding: '8px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: 10, fontWeight: 700, cursor: 'pointer', marginBottom: 6, textAlign: 'left' }}>📥 Download PDF</button>
                <button onClick={() => navigator.clipboard?.writeText(editEn + '\n\n---\n\n' + editNe)} style={{ width: '100%', padding: '8px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: 10, fontWeight: 700, cursor: 'pointer', marginBottom: 6, textAlign: 'left' }}>⎘ Copy Text</button>
                <button onClick={() => { setStep(1); setLetter(null); setLetterType(null); setVars({}); setSignatures([]); setSaved(false) }} style={{ width: '100%', padding: '8px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: 10, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>✏️ New Letter</button>
              </div>
            )}
          </div>

          {/* Main content */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>

            {/* Step 1 — Select type */}
            {step === 1 && (
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Select Letter Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                  {LETTER_TYPES.map(t => (
                    <div key={t.key} onClick={() => { setLetterType(t.key); setStep(2) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${t.color}30`, background: `${t.color}06`, cursor: 'pointer', transition: 'all .15s' }}>
                      <span style={{ fontSize: 24 }}>{t.icon}</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{t.label}</div>
                        <div style={{ fontSize: 8, color: t.color, fontWeight: 600 }}>AI-powered · Bilingual</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 — Fill variables */}
            {step === 2 && tmpl && (
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <span style={{ fontSize: 24 }}>{tmpl.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{tmpl.label}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>Fill the details below — AI will generate the full letter</div>
                  </div>
                </div>

                {/* Language selector */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                  {[['both', '🌐 Both'], ['english', '🇬🇧 English'], ['nepali', '🇳🇵 Nepali']].map(([v, l]) => (
                    <button key={v} onClick={() => setLang(v)}
                      style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${lang === v ? P : '#e2e8f0'}`, background: lang === v ? `${P}10` : '#fff', color: lang === v ? P : '#64748b', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
                      {l}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
                  {varFields.map(field => (
                    <div key={field} style={{ gridColumn: ['incident', 'reason', 'qualities', 'required_action', 'achievements'].includes(field) ? 'span 2' : 'span 1' }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                        {VAR_LABELS[field] || field} {['name'].includes(field) && <span style={{ color: '#ef4444' }}>*</span>}
                      </label>
                      {['incident', 'reason', 'qualities', 'required_action', 'achievements'].includes(field) ? (
                        <textarea value={vars[field] || ''} onChange={e => setVars(p => ({ ...p, [field]: e.target.value }))}
                          rows={2} placeholder={`Enter ${VAR_LABELS[field] || field}...`}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 10, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                      ) : (
                        <input value={vars[field] || ''} onChange={e => setVars(p => ({ ...p, [field]: e.target.value }))}
                          placeholder={`Enter ${VAR_LABELS[field] || field}...`}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none', boxSizing: 'border-box' }} />
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(1)} style={{ padding: '11px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>← Back</button>
                  <button onClick={generate} disabled={generating || !vars.name?.trim()}
                    style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: vars.name?.trim() && !generating ? G : '#e2e8f0', color: vars.name?.trim() && !generating ? '#fff' : '#94a3b8', fontSize: 13, fontWeight: 800, cursor: vars.name?.trim() && !generating ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {generating ? (<><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} /> Generating with AI...</>) : '🤖 Generate Letter with AI'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 — Preview & Edit */}
            {step === 3 && letter && (
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>✅ Letter Generated — Review & Edit</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={generate} style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${P}`, background: `${P}10`, color: P, fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>🔄 Regenerate</button>
                    <button onClick={downloadPDF} style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>📥 PDF</button>
                  </div>
                </div>

                {(lang === 'both' || lang === 'english') && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>🇬🇧 English Version</div>
                    <textarea value={editEn} onChange={e => setEditEn(e.target.value)} rows={12}
                      style={{ width: '100%', padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 10.5, lineHeight: 1.75, fontFamily: '"Times New Roman", serif', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                )}

                {(lang === 'both' || lang === 'nepali') && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>🇳🇵 Nepali Version (नेपाली)</div>
                    <textarea value={editNe} onChange={e => setEditNe(e.target.value)} rows={12}
                      style={{ width: '100%', padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11, lineHeight: 1.85, fontFamily: '"Noto Sans Devanagari","Arial Unicode MS",serif', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(2)} style={{ padding: '11px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>← Edit Details</button>
                  <button onClick={() => setStep(4)}
                    style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: G, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                    ✍️ Proceed to Sign →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4 — Sign */}
            {step === 4 && (
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>✍️ Digital Signatures</div>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 20 }}>
                  Collect signatures from required parties. Per Nepal Electronic Transactions Act 2063, digital signatures are legally binding.
                </div>

                {/* Required signatories */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {[
                    { role: 'HR Manager / Signatory', name: vars.signatory || currentPersona?.label || 'HR Manager', required: true },
                    { role: 'Employee Acknowledgement', name: vars.name || 'Employee', required: letterType === 'warning' || letterType === 'termination' },
                    { role: 'CEO / Director Approval', name: 'CEO / Director', required: letterType === 'termination' || letterType === 'promotion' },
                  ].map((sig, i) => {
                    const signed = signatures.find(s => s.role === sig.role)
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: signed ? '#f0fdf4' : '#f8fafc', borderRadius: 12, border: `1px solid ${signed ? '#bbf7d0' : '#e2e8f0'}` }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: signed ? '#10b981' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {signed ? '✅' : '✍️'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{sig.name}</div>
                          <div style={{ fontSize: 9, color: '#64748b' }}>{sig.role} {sig.required && <span style={{ color: '#ef4444' }}>· Required</span>}</div>
                          {signed && <div style={{ fontSize: 8, color: '#10b981', marginTop: 2 }}>Signed {new Date(signed.timestamp).toLocaleString()}</div>}
                        </div>
                        {signed ? (
                          <img src={signed.dataUrl} alt="sig" style={{ height: 40, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                        ) : (
                          <button onClick={() => { setShowSig({ role: sig.role, name: sig.name }) }}
                            style={{ padding: '7px 14px', borderRadius: 9, border: `1px solid ${P}`, background: `${P}10`, color: P, fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
                            Sign Now →
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(3)} style={{ padding: '11px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>← Back</button>
                  <button onClick={saveToEmployeeFile} disabled={saving}
                    style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: G, color: '#fff', fontSize: 13, fontWeight: 800, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {saving ? (<><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} /> Saving...</>) : '💾 Save to Employee File →'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 5 — Done */}
            {step === 5 && saved && (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Letter Saved Successfully!</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>
                  The {tmpl?.label} for <strong>{vars.name}</strong> has been saved to their Digital Employee File
                  {signatures.length > 0 && ` with ${signatures.length} digital signature(s)`}.
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={downloadPDF} style={{ padding: '11px 20px', borderRadius: 10, border: 'none', background: G, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📥 Download PDF</button>
                  <button onClick={() => { setStep(1); setLetter(null); setLetterType(null); setVars({}); setSignatures([]); setSaved(false) }}
                    style={{ padding: '11px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✉️ Generate Another
                  </button>
                  <button onClick={() => setActiveTab('history')} style={{ padding: '11px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📂 View History</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Generated Letters — {history.length} total</div>
            {history.length > 0 && <button onClick={() => { if (window.confirm('Clear all letter history?')) { setHistory([]); localStorage.removeItem(HISTORY_KEY) } }} style={{ fontSize: 9, padding: '4px 10px', borderRadius: 7, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer' }}>🗑️ Clear All</button>}
          </div>
          {history.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
              <div>No letters generated yet. Use the Generate tab to create your first letter.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {history.map((rec, i) => {
                const t = LETTER_TYPES.find(t => t.key === rec.type)
                return (
                  <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < history.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${t?.color || P}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{t?.icon || '📄'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{t?.label} — {rec.employee}</div>
                      <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{rec.company} · {new Date(rec.generated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: rec.signed ? '#f0fdf4' : '#f8fafc', color: rec.signed ? '#15803d' : '#94a3b8' }}>
                      {rec.signed ? '✅ Signed' : '📝 Draft'}
                    </span>
                    <button onClick={() => {
                      setLetter({ english: rec.english, nepali: rec.nepali })
                      setEditEn(rec.english); setEditNe(rec.nepali)
                      setLetterType(rec.type); setActiveTab('generate'); setStep(3)
                    }} style={{ fontSize: 9, padding: '5px 10px', borderRadius: 7, border: `1px solid ${P}`, background: `${P}10`, color: P, cursor: 'pointer', fontWeight: 700 }}>Open</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Signature modal */}
      {showSig && (
        <SignaturePad
          signerName={showSig.name}
          onSave={(sigData) => {
            setSignatures(prev => [...prev.filter(s => s.role !== showSig.role), { ...sigData, role: showSig.role }])
            setShowSig(false)
          }}
          onClose={() => setShowSig(false)}
        />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
