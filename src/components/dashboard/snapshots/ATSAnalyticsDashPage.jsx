// ATSAnalyticsDashPage.jsx - Comprehensive Analytics & Predictive Intelligence
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const METRICS = {
  hiring: { time_to_hire:18, time_to_fill:32, cost_per_hire:45000, offer_acceptance:88, quality_of_hire:82, candidate_nps:74 },
  pipeline: { total_applications:342, screened:284, shortlisted:47, interviewed:28, offered:8, hired:6, rejected:288, withdrawn:48 },
  sources: [
    { name:'LinkedIn',    apps:142, hires:8, quality:82, cost:12000, conversion:'5.6%', color:'#0077b5' },
    { name:'Company Portal', apps:68, hires:6, quality:91, cost:0,    conversion:'8.8%', color:'#059669' },
    { name:'Indeed',     apps:54,  hires:4, quality:74, cost:8000,  conversion:'7.4%', color:'#2164f3' },
    { name:'MeroJob',    apps:38,  hires:3, quality:76, cost:3000,  conversion:'7.9%', color:'#c0392b' },
    { name:'Referrals',  apps:22,  hires:4, quality:94, cost:5000,  conversion:'18.2%',color:'#f59e0b' },
    { name:'Facebook',   apps:18,  hires:1, quality:68, cost:2000,  conversion:'5.6%', color:'#1877f2' },
  ],
  diversity: { gender_m:58, gender_f:40, gender_o:2, shortlist_m:55, shortlist_f:43, shortlist_o:2 },
  monthly: [
    { month:'Bhadra',  apps:42, hires:3 },{ month:'Ashwin',apps:58,hires:4 },{ month:'Kartik',apps:71,hires:6 },
    { month:'Mangsir', apps:88, hires:8 },{ month:'Poush',  apps:65,hires:5 },{ month:'Magh',  apps:18,hires:2 },
  ],
  fraud: [
    { candidate:'Sunita Rai',     flag:'Fake work experience detected',        severity:'High',   date:'2081-08-20', status:'Under Review' },
    { candidate:'Unknown User',   flag:'Same IP as 3 other applications',      severity:'Medium', date:'2081-08-22', status:'Flagged' },
    { candidate:'Bikram Thapa',   flag:'Video authenticity score: 42% (Low)',   severity:'High',   date:'2081-08-24', status:'Rejected' },
    { candidate:'Pradeep Khadka', flag:'CV content matches online template 91%',severity:'Low',   date:'2081-08-25', status:'Monitoring' },
  ],
  predictive: {
    time_to_hire_forecast: 16,
    best_source_next_q: 'LinkedIn + Employee Referrals',
    attrition_risk: 'Low (2 hires show early churn signals)',
    headcount_gap: 'Technology dept understaff risk in 90 days',
    salary_market: 'React Developer market rate up 12% YoY',
  }
}

function MiniBar({ val, max, color = '#3b82f6', height = 6 }) {
  return (
    <div style={{ height, background: '#f1f5f9', borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ width: Math.round(val / max * 100) + '%', height: '100%', background: color, borderRadius: height / 2 }} />
    </div>
  )
}

export default function ATSAnalyticsDashPage() {
  const { navigate } = useApp()
  const [tab, setTab] = useState('overview')
  const [dateRange, setDateRange] = useState('Last 6 Months')

  const convRate = Math.round(METRICS.pipeline.hired / METRICS.pipeline.total_applications * 100 * 10) / 10

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e40af)', borderRadius: 14, padding: '16px 22px', marginBottom: 16, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Analytics & Predictive Intelligence</h2>
          <p style={{ margin: '3px 0 0', fontSize: 10, opacity: .8 }}>Hiring metrics · Source ROI · Diversity · Predictive forecasts · AI fraud detection</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: 9, outline: 'none' }}>
            {['Last 30 Days','Last 3 Months','Last 6 Months','This FY 2081'].map(r => <option key={r} style={{ color: '#000' }}>{r}</option>)}
          </select>
          <button onClick={() => alert('Exporting PDF report...')} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.3)', background: 'transparent', color: '#fff', fontSize: 9, cursor: 'pointer' }}>Export PDF</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['overview','Overview'],['funnel','Hiring Funnel'],['sources','Source ROI'],['diversity','Diversity'],['predictive','Predictive AI'],['fraud','Fraud Detection']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 14px', borderRadius: 9, background: tab === t ? '#1e40af' : '#fff', color: tab === t ? '#fff' : '#475569', fontSize: 9, fontWeight: tab === t ? 800 : 400, cursor: 'pointer', border: tab !== t ? '1px solid #e2e8f0' : 'none' }}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { l:'Time to Hire', v:METRICS.hiring.time_to_hire+'d', sub:'vs 24d benchmark', c:'#059669', trend:'↓ 6d better' },
              { l:'Time to Fill', v:METRICS.hiring.time_to_fill+'d', sub:'from JD to joining', c:'#3b82f6', trend:'↓ 8d better' },
              { l:'Cost per Hire', v:'NPR '+METRICS.hiring.cost_per_hire.toLocaleString(), sub:'all sources avg', c:'#f59e0b', trend:'↓ 15% YoY' },
              { l:'Offer Acceptance', v:METRICS.hiring.offer_acceptance+'%', sub:'of offers accepted', c:'#059669', trend:'↑ 4% vs last q' },
              { l:'Quality of Hire', v:METRICS.hiring.quality_of_hire+'%', sub:'manager satisfaction', c:'#8b5cf6', trend:'↑ 3% vs last q' },
              { l:'Candidate NPS', v:METRICS.hiring.candidate_nps, sub:'candidate experience', c:'#0891b2', trend:'↑ from 68' },
            ].map((s,i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{s.l}</div>
                <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 1 }}>{s.sub}</div>
                <div style={{ fontSize: 8, color: s.c, fontWeight: 700, marginTop: 4 }}>{s.trend}</div>
              </div>
            ))}
          </div>

          {/* Monthly trend chart */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #f1f5f9', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>Monthly Applications vs Hires</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 140 }}>
              {METRICS.monthly.map((m, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 110 }}>
                    <div style={{ width: 16, background: '#bfdbfe', borderRadius: '3px 3px 0 0', height: Math.round(m.apps / 90 * 100) + '%' }} />
                    <div style={{ width: 16, background: '#059669', borderRadius: '3px 3px 0 0', height: Math.round(m.hires / 10 * 100) + '%' }} />
                  </div>
                  <div style={{ fontSize: 8, color: '#94a3b8', textAlign: 'center' }}>{m.month}</div>
                  <div style={{ fontSize: 7, color: '#64748b' }}>{m.apps}/{m.hires}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><div style={{ width: 12, height: 12, background: '#bfdbfe', borderRadius: 2 }} /><span style={{ fontSize: 8, color: '#64748b' }}>Applications</span></div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><div style={{ width: 12, height: 12, background: '#059669', borderRadius: 2 }} /><span style={{ fontSize: 8, color: '#64748b' }}>Hires</span></div>
            </div>
          </div>

          {/* AI Insight */}
          <div style={{ background: 'linear-gradient(135deg,#eff6ff,#f5f3ff)', borderRadius: 12, padding: 16, border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1e40af', marginBottom: 8 }}>🤖 AI Strategic Insights</div>
            {['LinkedIn is your highest-converting source (18.2% referrals beat all). Increase LinkedIn Recruiter budget by NPR 25K/month.',
              'Technology department is at 78% capacity. Recommend raising 2 more requisitions before end of quarter.',
              'Candidate drop-off peaks at the Written Exam stage (34% abandon). Recommend reducing exam time from 90 to 60 minutes.',
              'Average time-to-hire has improved 25% since AI screening was introduced in Bhadra.'].map((ins, i) => (
              <div key={i} style={{ fontSize: 9, color: '#334155', padding: '5px 0', display: 'flex', gap: 6, borderBottom: i < 3 ? '1px solid rgba(0,0,0,.05)' : 'none' }}>
                <span style={{ color: '#1e40af', flexShrink: 0 }}>⚡</span>{ins}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'funnel' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Recruitment Funnel — {dateRange}</div>
            {[
              { s:'Total Applications', v:METRICS.pipeline.total_applications, c:'#3b82f6' },
              { s:'AI Screened & Eligible', v:METRICS.pipeline.screened, c:'#8b5cf6', drop:Math.round((1-METRICS.pipeline.screened/METRICS.pipeline.total_applications)*100) },
              { s:'Shortlisted (CV Score)', v:METRICS.pipeline.shortlisted, c:'#0891b2', drop:Math.round((1-METRICS.pipeline.shortlisted/METRICS.pipeline.screened)*100) },
              { s:'Interviewed (Written+Video)', v:METRICS.pipeline.interviewed, c:'#f59e0b', drop:Math.round((1-METRICS.pipeline.interviewed/METRICS.pipeline.shortlisted)*100) },
              { s:'Offered', v:METRICS.pipeline.offered, c:'#10b981', drop:Math.round((1-METRICS.pipeline.offered/METRICS.pipeline.interviewed)*100) },
              { s:'Hired', v:METRICS.pipeline.hired, c:'#059669', drop:Math.round((1-METRICS.pipeline.hired/METRICS.pipeline.offered)*100) },
            ].map((s, i, arr) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600, color: '#374151' }}>{s.s}</span>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {s.drop !== undefined && <span style={{ fontSize: 8, color: '#ef4444' }}>-{s.drop}% drop</span>}
                    <span style={{ fontWeight: 900, color: s.c, fontSize: 14 }}>{s.v}</span>
                  </div>
                </div>
                <MiniBar val={s.v} max={METRICS.pipeline.total_applications} color={s.c} height={12} />
              </div>
            ))}
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#f0fdf4', borderRadius: 9, border: '1px solid #bbf7d0', fontSize: 9, color: '#065f46' }}>
              Overall conversion: {convRate}% · Industry benchmark: 1.5-2.5%
            </div>
          </div>
          <div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Stage Drop-Off Analysis</div>
              {[['Application → Screen','17%','Low'],['Screen → Shortlist','83%','High ⚠️'],['Shortlist → Interview','40%','Medium'],['Interview → Offer','71%','Medium'],['Offer → Hire','25%','High ⚠️']].map(([s,v,sev]) => (
                <div key={s} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, padding: '5px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ color: '#64748b' }}>{s}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ color: sev.includes('High') ? '#ef4444' : sev.includes('Medium') ? '#f59e0b' : '#059669', fontWeight: 700 }}>{v} drop</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Disposition Breakdown</div>
              {[{ l:'Hired', v:METRICS.pipeline.hired, c:'#059669' },{ l:'Rejected', v:METRICS.pipeline.rejected, c:'#ef4444' },{ l:'Withdrawn', v:METRICS.pipeline.withdrawn, c:'#f59e0b' }].map(s => (
                <div key={s.l} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 3 }}>
                    <span style={{ color: '#64748b' }}>{s.l}</span><span style={{ fontWeight: 700, color: s.c }}>{s.v}</span>
                  </div>
                  <MiniBar val={s.v} max={METRICS.pipeline.total_applications} color={s.c} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'sources' && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>Source ROI & Channel Performance</div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ background: '#1e3a5f', color: '#fff', display: 'grid', gridTemplateColumns: '150px 80px 60px 80px 80px 90px 100px', padding: '10px 14px', fontSize: 9, fontWeight: 700, gap: 8 }}>
              {['Source','Applications','Hires','Quality%','Cost(NPR)','Conversion','ROI Score'].map(h => <div key={h} style={{ textAlign: h !== 'Source' ? 'center' : 'left' }}>{h}</div>)}
            </div>
            {METRICS.sources.map((s, i) => {
              const roi = s.hires > 0 ? Math.round(s.quality * s.hires / (s.cost / 10000 + 1)) : 0
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '150px 80px 60px 80px 80px 90px 100px', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc', gap: 8, alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#0f172a' }}>{s.name}</span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#334155' }}>{s.apps}</div>
                  <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 900, color: s.hires >= 4 ? '#059669' : '#f59e0b' }}>{s.hires}</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: s.quality >= 80 ? '#059669' : '#f59e0b' }}>{s.quality}%</div>
                    <MiniBar val={s.quality} max={100} color={s.quality >= 80 ? '#059669' : '#f59e0b'} height={4} />
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 10, color: s.cost === 0 ? '#059669' : '#374151', fontWeight: s.cost === 0 ? 700 : 400 }}>{s.cost === 0 ? 'Free' : 'NPR '+s.cost.toLocaleString()}</div>
                  <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: parseFloat(s.conversion) >= 8 ? '#059669' : '#f59e0b' }}>{s.conversion}</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: roi >= 60 ? '#059669' : roi >= 30 ? '#f59e0b' : '#ef4444' }}>{roi}/100</div>
                    <MiniBar val={roi} max={100} color={roi >= 60 ? '#059669' : roi >= 30 ? '#f59e0b' : '#ef4444'} height={4} />
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ background: '#fffbeb', borderRadius: 10, padding: '10px 14px', border: '1px solid #fde68a', marginTop: 12, fontSize: 9, color: '#92400e' }}>
            AI Recommendation: Referral hires show 94% quality and 18.2% conversion at only NPR 5,000/hire — your best channel. Consider launching a formal Employee Referral Programme.
          </div>
        </div>
      )}

      {tab === 'diversity' && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>Diversity & Inclusion Analytics</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[['All Applicants', METRICS.diversity.gender_m, METRICS.diversity.gender_f, METRICS.diversity.gender_o],['Shortlisted', METRICS.diversity.shortlist_m, METRICS.diversity.shortlist_f, METRICS.diversity.shortlist_o]].map(([title, m, f, o]) => (
              <div key={title} style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>{title} — Gender Distribution</div>
                {[['Male', m, '#3b82f6'],['Female', f, '#ec4899'],['Other/Not Specified', o, '#8b5cf6']].map(([l,v,c]) => (
                  <div key={l} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 4 }}>
                      <span style={{ color: '#374151' }}>{l}</span>
                      <span style={{ fontWeight: 700, color: c }}>{v}%</span>
                    </div>
                    <MiniBar val={v} max={100} color={c} height={8} />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 14, border: '1px solid #bbf7d0', marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#065f46', marginBottom: 8 }}>AI Bias Detection — Screening Review</div>
            {['No gender bias detected in AI CV screening stage','Shortlist gender ratio tracks within 5% of applicant pool — within acceptable range','Age-neutral screening confirmed — no age-based rejection patterns','Salary offers within 2% variance across gender groups'].map((s, i) => (
              <div key={i} style={{ fontSize: 9, color: '#374151', padding: '3px 0', display: 'flex', gap: 6 }}>
                <span style={{ color: '#10b981' }}>✓</span>{s}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'predictive' && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>Predictive Analytics — AI Forecasts</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { icon:'⏱', title:'Predicted Time-to-Hire', value:'16 days', detail:'2 days faster than current avg', c:'#059669' },
              { icon:'🎯', title:'Best Source Next Quarter', value:'LinkedIn + Referrals', detail:'Projected 22% conversion rate', c:'#1e40af' },
              { icon:'⚠️', title:'Attrition Risk', value:'2 High-Risk Hires', detail:'Show early churn signals (<90 days)', c:'#f59e0b' },
              { icon:'📊', title:'Headcount Gap Alert', value:'Tech Team (-3 by Q4)', detail:'Based on current growth trajectory', c:'#ef4444' },
              { icon:'💰', title:'Market Salary Trend', value:'React Dev +12% YoY', detail:'Recommend budget revision for Q4', c:'#8b5cf6' },
              { icon:'📅', title:'Peak Hiring Window', value:'Bhadra-Mangsir', detail:'Historically 68% of annual hires', c:'#0891b2' },
            ].map((c, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 16, border: `1px solid ${c.c}20` }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{c.icon}</div>
                <div style={{ fontSize: 9, color: '#64748b', marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: c.c, marginBottom: 3 }}>{c.value}</div>
                <div style={{ fontSize: 8, color: '#94a3b8', lineHeight: 1.4 }}>{c.detail}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>90-Day Hiring Forecast</div>
            <div style={{ display: 'flex', gap: 0, marginBottom: 8 }}>
              {['Month 1 (Bhadra)','Month 2 (Ashwin)','Month 3 (Kartik)'].map((m, i) => (
                <div key={i} style={{ flex: 1, padding: '12px', background: i % 2 === 0 ? '#f8fafc' : '#fff', borderRadius: i === 0 ? '8px 0 0 8px' : i === 2 ? '0 8px 8px 0' : 0, border: '1px solid #f1f5f9', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#64748b', marginBottom: 6 }}>{m}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#1e40af' }}>{8 + i * 4} apps</div>
                  <div style={{ fontSize: 10, color: '#059669', fontWeight: 700 }}>{1 + i} projected hires</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'fraud' && (
        <div>
          <div style={{ background: '#fef2f2', borderRadius: 10, padding: '10px 14px', border: '1px solid #fecaca', marginBottom: 14, fontSize: 10, color: '#dc2626', fontWeight: 700 }}>
            AI Fraud Detection Active — {METRICS.fraud.length} flags detected this cycle. AI continuously monitors for fake credentials, bot applications, and video authenticity.
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Fraud & Anomaly Detection Log</div>
          {METRICS.fraud.map((f, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 8, border: `1.5px solid ${f.severity === 'High' ? '#fecaca' : f.severity === 'Medium' ? '#fed7aa' : '#fef9c3'}` }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: f.severity === 'High' ? '#fef2f2' : f.severity === 'Medium' ? '#fff7ed' : '#fffbeb', border: `2px solid ${f.severity === 'High' ? '#ef4444' : f.severity === 'Medium' ? '#f97316' : '#f59e0b'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {f.severity === 'High' ? '🚨' : f.severity === 'Medium' ? '⚠️' : '🔍'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>{f.candidate}</span>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: f.severity === 'High' ? '#fef2f2' : f.severity === 'Medium' ? '#fff7ed' : '#fffbeb', color: f.severity === 'High' ? '#dc2626' : f.severity === 'Medium' ? '#c2410c' : '#92400e' }}>{f.severity} Risk</span>
                    <span style={{ fontSize: 8, padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569' }}>{f.status}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#374151', marginBottom: 2 }}>{f.flag}</div>
                  <div style={{ fontSize: 8, color: '#94a3b8' }}>Detected: {f.date}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#ef4444', color: '#fff', fontSize: 8, cursor: 'pointer' }}>Reject</button>
                  <button style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 8, cursor: 'pointer' }}>Review</button>
                </div>
              </div>
            </div>
          ))}
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>AI Detection Methods Active</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['Resume content plagiarism check (91%+ similarity = flag)','Work experience verification cross-reference','Video face authenticity & deepfake detection','IP address deduplication (bot/proxy detection)','Response timing analysis (copy-paste detection)','Metadata analysis on uploaded documents'].map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, fontSize: 9, color: '#334155' }}>
                  <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>{m}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
