import React, { useEffect } from 'react'
import { useAuth } from '../AuthContext'

// RequireAuth: small wrapper that ensures a user is authenticated before
// rendering children. If not authenticated it dispatches a global
// 'request-auth' CustomEvent with an optional target so the app can
// switch to the auth tab and remember the intended destination.
export default function RequireAuth({ children, target = 'dashboard' }){
  const { user } = useAuth()

  useEffect(()=>{
    if(!user){
      const ev = new CustomEvent('request-auth', { detail: { target } })
      // fire-and-forget: App.jsx listens for this and will show the Auth tab
      window.dispatchEvent(ev)
      // Also set an explicit URL hash so the app behaves like a route redirect/guard.
      // Tests or other listeners can observe location.hash changes as a deterministic redirect.
      try{
        const q = target ? `?target=${encodeURIComponent(target)}` : ''
        window.location.hash = `auth${q}`
      }catch(e){ /* no-op if environment blocks location modifications */ }
    }
  },[user,target])

  if(!user) return null
  return <>{children}</>
}
