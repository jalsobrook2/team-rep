import React, { useState } from 'react'
import { useToast } from '../components/UiProvider'
import { useAuth } from '../AuthContext'

export default function Register(){
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [skills,setSkills]=useState('')
  const toast = useToast()
  const auth = useAuth()
  async function submit(e){
    e.preventDefault();
    try{
      const res = await auth.authFetch('/api/workers', { method: 'POST', body: JSON.stringify({ name, email, password, skills }) })
      const data = await res.json()
      if(res.ok && data.success){ toast('Account created','success'); } else { toast(data.error || 'Registration failed','error') }
    }catch(e){ toast(e.message,'error') }
  }
  return (
    <form data-testid="register-form" onSubmit={submit} style={{maxWidth:520}}>
      <input type="hidden" data-testid="register-debug-timestamp" value={Date.now()} />
      <h2>Register</h2>
      <div style={{marginBottom:8}}><label>Name</label><input data-testid="register-name" value={name} onChange={e=>setName(e.target.value)} style={{width:'100%',padding:8}}/></div>
      <div style={{marginBottom:8}}><label>Email</label><input data-testid="register-email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',padding:8}}/></div>
      <div style={{marginBottom:8}}><label>Password</label><input data-testid="register-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',padding:8}}/></div>
      <div style={{marginBottom:8}}><label>Skills</label><input data-testid="register-skills" value={skills} onChange={e=>setSkills(e.target.value)} style={{width:'100%',padding:8}}/></div>
      <div><button data-testid="register-submit" type="submit">Create account</button></div>
    </form>
  )
}
