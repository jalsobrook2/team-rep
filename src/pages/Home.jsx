import React from 'react'

export default function Home({ onLoginClick }){
  return (
    <section style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:24}}>
      <div style={{display:'flex',alignItems:'center',gap:12,position:'relative',zIndex:1}}>
        <div className="home-logo">PJ</div>
        <div>
          <h1 style={{margin:0}}>Pocket Jobs</h1>
          <div className="small">Find workers, post jobs, and chat</div>
        </div>
      </div>

      <div className="constrained-560" style={{textAlign:'center',position:'relative',zIndex:1}}>
        <p>Welcome — sign in to access your dashboard, messaging and job management features.</p>
        <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:12}}>
          <button onClick={()=> onLoginClick ? onLoginClick('auth') : window.dispatchEvent(new Event('navigate-dashboard'))}>Login / Register</button>
          <button className="ghost" onClick={()=> window.dispatchEvent(new Event('navigate-dashboard'))}>Explore (no login)</button>
        </div>
      </div>
    </section>
  )
}
