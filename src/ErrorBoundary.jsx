import React from 'react'
import * as Sentry from '@sentry/react'

export default class ErrorBoundary extends React.Component {
  constructor(props){
    super(props)
    this.state = { error: null, info: null, eventId: null }
  }

  componentDidCatch(error, info){
    // Save error for display
    this.setState({ error, info })
    // Also log to console for developers
    console.error('ErrorBoundary caught:', error, info)
    
    // Report to Sentry if available
    try {
      Sentry.withScope((scope) => {
        scope.setExtra('componentStack', info.componentStack);
        const eventId = Sentry.captureException(error);
        this.setState({ eventId });
      });
    } catch (e) {
      // Sentry not available
    }
  }

  render(){
    if(this.state.error){
      return (
        <div style={{padding:20,maxWidth:900,margin:'40px auto',background:'#fff6f6',border:'1px solid #f2c2c2',borderRadius:12}}>
          <h2 style={{marginTop:0,color:'#a00'}}>Application error</h2>
          <div style={{color:'#333'}}>An error occurred while rendering the app. The console will contain details.</div>
          <pre style={{whiteSpace:'pre-wrap',marginTop:12,color:'#600'}}>{this.state.error && this.state.error.toString()}</pre>
          <details style={{marginTop:12,color:'#444'}}>
            <summary>Show stack</summary>
            <pre style={{whiteSpace:'pre-wrap'}}>{this.state.info && this.state.info.componentStack}</pre>
          </details>
          {this.state.eventId && (
            <div style={{marginTop:16}}>
              <button 
                onClick={() => Sentry.showReportDialog({ eventId: this.state.eventId })}
                style={{padding:'10px 20px',borderRadius:8,background:'#06a0db',color:'#fff',border:'none',cursor:'pointer'}}
              >
                Report Feedback
              </button>
            </div>
          )}
          <button 
            onClick={() => window.location.reload()} 
            style={{marginTop:16,padding:'10px 20px',borderRadius:8,background:'#073044',color:'#fff',border:'none',cursor:'pointer'}}
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
