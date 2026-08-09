// FILE: src/components/shared/ErrorBoundary.jsx
// Catches any React crash and shows a friendly error screen
// instead of a blank white page
import { Component } from 'react'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[NepHR Pro Error]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ maxWidth:480, textAlign:'center' }}>
          <div style={{ width:72, height:72, borderRadius:20, background:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, margin:'0 auto 20px' }}>⚠️</div>
          <h1 style={{ fontSize:22, fontWeight:900, color:'#0f172a', marginBottom:8 }}>Something went wrong</h1>
          <p style={{ fontSize:13, color:'#64748b', marginBottom:24, lineHeight:1.6 }}>
            NepHR Pro encountered an unexpected error. Your data is safe. Please refresh the page or contact support if the problem persists.
          </p>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={()=>window.location.reload()}
              style={{ padding:'10px 24px', borderRadius:10, border:'none', background:G, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              🔄 Refresh Page
            </button>
            <button onClick={()=>this.setState({hasError:false,error:null})}
              style={{ padding:'10px 24px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              Try Again
            </button>
          </div>
          {this.state.error && (
            <details style={{ marginTop:20, textAlign:'left', background:'#f1f5f9', borderRadius:10, padding:12, fontSize:10, color:'#94a3b8' }}>
              <summary style={{ cursor:'pointer', fontWeight:700, color:'#64748b' }}>Error details</summary>
              <pre style={{ marginTop:8, overflow:'auto', whiteSpace:'pre-wrap' }}>{String(this.state.error)}</pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}
