import React, { useState } from 'react'

import { useAuth } from '../AuthContext'
import { useToast } from '../components/UiProvider'

function LoginForm({onLogin}){
  const auth = useAuth()
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const toast = useToast()
  async function submit(e){
    e.preventDefault();
    try{
      await auth.loginWithCredentials(email,password)
      onLogin && onLogin()
  }catch(err){ toast(err.message || 'Login failed','error') }
  }
  return (
    <form data-testid="auth-login-form" onSubmit={submit} className="form-constrained-420">
      <h3 style={{marginTop:0}}>Login</h3>
      <div style={{marginBottom:8}}><label>Email</label><input data-testid="auth-login-email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',padding:8}}/></div>
      <div style={{marginBottom:8}}><label>Password</label><input data-testid="auth-login-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',padding:8}}/></div>
      <div><button data-testid="auth-login-submit" type="submit">Login</button></div>
    </form>
  )
}

function RegisterForm(){
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [skills,setSkills]=useState('')
  const toast = useToast()
  const auth = useAuth()
  async function submit(e){
    e.preventDefault();
    try{
      const res = await auth.authFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password, skills }) })
      const data = await res.json()
      if(res.ok && data.success){ toast('Account created','success'); } else { toast(data.error || 'Registration failed','error') }
  }catch(e){ toast(e.message || 'Registration failed','error') }
  }
  return (
    <form data-testid="auth-register-form" onSubmit={submit} className="form-constrained-520">
      <h3 style={{marginTop:0}}>Register</h3>
      <div style={{marginBottom:8}}><label>Name</label><input data-testid="auth-register-name" value={name} onChange={e=>setName(e.target.value)} style={{width:'100%',padding:8}}/></div>
      <div style={{marginBottom:8}}><label>Email</label><input data-testid="auth-register-email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',padding:8}}/></div>
      <div style={{marginBottom:8}}><label>Password</label><input data-testid="auth-register-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',padding:8}}/></div>
      <div style={{marginBottom:8}}><label>Skills</label><input data-testid="auth-register-skills" value={skills} onChange={e=>setSkills(e.target.value)} style={{width:'100%',padding:8}}/></div>
      <div><button data-testid="auth-register-submit" type="submit">Create account</button></div>
    </form>
  )
}

export default function Auth({ onAuthSuccess }){
  const [mode,setMode] = useState('login')
  return (
    <div style={{display:'flex',gap:18,alignItems:'flex-start',flexWrap:'wrap'}}>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        <div style={{display:'flex',gap:8}}>
          <button data-testid="auth-tab-login" className={`tab-btn ${mode==='login'?'active':''}`} onClick={()=>setMode('login')}>Login</button>
          <button data-testid="auth-tab-register" className={`tab-btn ${mode==='register'?'active':''}`} onClick={()=>setMode('register')}>Register</button>
        </div>
        <div style={{marginTop:12}}>
          {mode==='login' ? <LoginForm onLogin={onAuthSuccess}/> : <RegisterForm />}
        </div>
      </div>
      <div className="auth-side">
        <div className="card">
          <h3 style={{marginTop:0}}>Why create an account?</h3>
          <p className="small">Register to message workers, post jobs, and track your activity. Demo account is available automatically.</p>
        </div>
      </div>
    </div>
  )
}
