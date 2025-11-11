import React, { useEffect, useState } from 'react'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import About from './pages/About'
import Auth from './pages/Auth'
import Contact from './pages/Contact'
import DemoLogin from './components/DemoLogin'
import { useAuth } from './AuthContext'
import { useToast } from './components/UiProvider'
import RequireAuth from './components/RequireAuth'
// Dynamic page removed to match legacy dashboard parity

export default function App(){
  // default to dashboard to mirror legacy experience
  const [tab, setTab] = useState('dashboard')
  const [pendingTarget, setPendingTarget] = useState(null)
  const toast = useToast()

  const { user, logout } = useAuth()
  const who = user || 'Not logged in'

  useEffect(()=>{
    // Navigation / auth requests: support the legacy 'navigate-dashboard'
    // event and a more generic 'request-auth' event used by RequireAuth.
    function handleRequestTarget(target){
      if(user){ setTab(target); return }
      // preserve intended target and notify the user
      setPendingTarget(target)
      toast('Please log in to access the requested page — you will be returned after login', 'info')
      setTab('auth')
    }

    function onNav(){ handleRequestTarget('dashboard') }

    function onRequest(e){
      const target = e && e.detail && e.detail.target ? e.detail.target : 'dashboard'
      handleRequestTarget(target)
    }

    window.addEventListener('navigate-dashboard', onNav)
    window.addEventListener('request-auth', onRequest)
    return ()=>{
      window.removeEventListener('navigate-dashboard', onNav)
      window.removeEventListener('request-auth', onRequest)
    }
  // Re-register listener when `user` changes so the handler uses the latest auth state
  },[user, toast])

  // Listen to explicit URL hash redirects so the app can behave like route guards.
  useEffect(()=>{
    function handleHashChange(){
      const raw = (window.location.hash || '').replace(/^#/, '')
      if(!raw) return
      const [path, qs] = raw.split('?')
      if(path === 'auth'){
        const params = new URLSearchParams(qs)
        const t = params.get('target')
        if(t){
          setPendingTarget(t)
          toast('Please log in to access the requested page — you will be returned after login', 'info')
        }
        setTab('auth')
        return
      }
      if(path === 'dashboard'){
        // If user is authenticated, go to dashboard; otherwise redirect to auth preserving target
        if(user){ setTab('dashboard'); return }
        setPendingTarget('dashboard')
        toast('Please log in to access the requested page — you will be returned after login', 'info')
        setTab('auth')
      }
    }

    // Handle the current hash on mount
    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return ()=> window.removeEventListener('hashchange', handleHashChange)
  },[user, toast])

  function parseJwt(token){
    try{ const payload = token.split('.')[1]; return JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/'))) }catch(e){ return null }
  }
  return (
    <div style={{maxWidth:980,margin:'0 auto',padding:16}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <h1 style={{color:'#06a0db'}}>Pocket Jobs</h1>
          <div className="small">{who}</div>
        </div>
        <nav>
          <button onClick={()=>setTab('home')} style={{marginRight:8}}>Home</button>
          <button onClick={()=>{
            if(user){ setTab('dashboard'); return }
            setPendingTarget('dashboard')
            toast('Please log in to access the Dashboard — you will be returned after login', 'info')
            setTab('auth')
          }} style={{marginRight:8}}>Dashboard</button>
          <button onClick={()=>setTab('about')} style={{marginRight:8}}>About</button>
          <button onClick={()=>setTab('contact')} style={{marginRight:8}}>Contact</button>
          {/* Login/Register moved to the Home page logo area per UX request */}
          <DemoLogin onSuccess={()=>{ if(pendingTarget){ setTab(pendingTarget); setPendingTarget(null) } else { setTab('dashboard') } }} />
          {user && (
            <button onClick={async ()=>{
              await logout()
              setPendingTarget(null)
              setTab('home')
              try{ window.location.hash = '' }catch(e){}
              toast('Logged out','success')
            }} style={{marginLeft:12}}>Logout</button>
          )}
        </nav>
      </header>
      <main style={{marginTop:16}}>
  {tab==='home' && <Home onLoginClick={(target)=>{ if(typeof target==='string') setTab(target); else setTab('auth') }} />}
        {tab==='dashboard' && (
          <RequireAuth target="dashboard">
            <Dashboard />
          </RequireAuth>
        )}
        {tab==='about' && <About />}
        {tab==='contact' && <Contact />}
  {tab==='auth' && <Auth onAuthSuccess={()=>{ if(pendingTarget){ setTab(pendingTarget); setPendingTarget(null); toast('Returning to your previous destination','success') } else { setTab('dashboard') } }} />}
      </main>
    </div>
  )
}

