import React from 'react'

export default function Home({ onLoginClick }){
  return (
    <section style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:24}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:64,height:64,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:12,background:'linear-gradient(180deg,#06a0db,#0082c0)',color:'#fff',fontWeight:800,fontSize:20}}>PJ</div>
        <div>
          <h1 style={{margin:0}}>Pocket Jobs</h1>
          <div className="small">Find workers, post jobs, and chat</div>
        </div>
      </div>

      <div style={{maxWidth:560,textAlign:'center'}}>
        <p>Welcome — sign in to access your dashboard, messaging and job management features.</p>
        <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:12}}>
          <button onClick={()=> onLoginClick ? onLoginClick('auth') : window.dispatchEvent(new Event('navigate-dashboard'))}>Login / Register</button>
          <button className="ghost" onClick={()=> window.dispatchEvent(new Event('navigate-dashboard'))}>Explore (no login)</button>
        </div>
      </div>
    </section>
  )
}
