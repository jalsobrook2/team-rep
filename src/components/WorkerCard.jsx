import React from 'react'

export default function WorkerCard({ worker }){
  const initials = (worker.name||'').split(' ').map(s=>s[0]).slice(0,2).join('') || (worker.email?worker.email[0].toUpperCase():'?')
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,padding:8,border:'1px solid #eee',borderRadius:8,marginBottom:8}}>
      <div style={{width:48,height:48,borderRadius:24,display:'flex',alignItems:'center',justifyContent:'center',background:'#06a0db',color:'#fff',fontWeight:800}}>{initials}</div>
      <div style={{flex:1}}>
        <div style={{fontWeight:700}}>{worker.name}</div>
        <div style={{fontSize:13,color:'#666'}}>{worker.email}</div>
        <div style={{fontSize:13,color:'#888'}}>{worker.skills}</div>
        {(worker.timeJoined || worker.createdAt) ? (
          <div style={{fontSize:12,color:'#999',marginTop:6}}>Joined: {new Date(worker.timeJoined || worker.createdAt).toLocaleString()}</div>
        ) : null}
      </div>
      <div>
        <button onClick={()=>{
          const evt = new CustomEvent('message-to', { detail: { id: worker._id } });
          window.dispatchEvent(evt);
          // also request the app to navigate to the dashboard so messaging is visible
          const nav = new CustomEvent('navigate-dashboard'); window.dispatchEvent(nav);
        }}>Message</button>
      </div>
    </div>
  )
}
