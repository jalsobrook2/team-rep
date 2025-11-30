import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../AuthContext'

export default function DemoLogin({ onSuccess }){
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(null)
  const [error, setError] = useState(null)
  const rootRef = useRef(null)

  const demos = [
    { name: 'Demo User', email: 'demo@pocketjob.test', password: 'Demo123!' },
    { name: 'Alice Demo', email: 'alice@demo.test', password: 'Alice123!' },
    { name: 'Bob Demo', email: 'bob@demo.test', password: 'Bob123!' }
  ]

  useEffect(()=>{
    function onDoc(e){
      if(rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return ()=> document.removeEventListener('mousedown', onDoc)
  },[])

  async function doLogin(item){
    setError(null)
    setLoadingEmail(item.email)
    try{
      await auth.demoLogin(item.email)
      setLoadingEmail(null)
      setOpen(false)
      if(typeof onSuccess === 'function') onSuccess()
    }catch(e){ setError(e.message || String(e)); setLoadingEmail(null) }
  }

  return (
    <div ref={rootRef} style={{display:'inline-block',position:'relative'}}>
      <button data-testid="demo-login-toggle" className="demo-btn" onClick={()=>setOpen(s=>!s)} aria-haspopup="true" aria-expanded={open}>
        Demo login ▾
      </button>

      {open && (
        <div className="demo-popup" role="menu" aria-label="Demo accounts">
          {demos.map(d => (
            <button data-testid={`demo-item-${d.email}`} key={d.email} className="demo-item" onClick={()=>doLogin(d)} disabled={!!loadingEmail}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                <div style={{textAlign:'left'}}>
                  <div style={{fontWeight:800}}>{d.name}</div>
                  <div className="small" style={{opacity:0.9}}>{d.email}</div>
                </div>
                <div className="demo-item-right">
                  {loadingEmail===d.email ? 'Signing in…' : 'Use'}
                </div>
              </div>
            </button>
          ))}
          {error && <div style={{color:'#a00',padding:8}}>{String(error)}</div>}
        </div>
      )}
    </div>
  )
}
