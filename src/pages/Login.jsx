import React, { useState } from 'react'
import { useToast } from '../components/UiProvider'
import { useAuth } from '../AuthContext'

export default function Login(){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const toast = useToast()
  const { loginWithCredentials } = useAuth()

  async function submit(e){
    e.preventDefault();
    try{
      const data = await loginWithCredentials(email, password)
      // loginWithCredentials throws on failure, so we reach here on success
      toast('Logged in successfully','success')
    }catch(e){
      toast(e.message || 'Login failed','error')
    }
  }

  return (
    <form data-testid="login-form" onSubmit={submit} className="form-constrained-420">
      <h2>Login</h2>
      <div style={{marginBottom:8}}>
        <label>Email</label>
        <input data-testid="login-email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',padding:8}}/>
      </div>
      <div style={{marginBottom:8}}>
        <label>Password</label>
        <input data-testid="login-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',padding:8}}/>
      </div>
      <div><button data-testid="login-submit" type="submit">Login</button></div>
    </form>
  )
}
