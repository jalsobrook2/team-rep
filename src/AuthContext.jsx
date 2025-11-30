import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext()

function parseJwt(token){
  try{ const payload = token.split('.')[1]; return JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/'))) }catch(e){ return null }
}

export function AuthProvider({ children }){
  const [token, setToken] = useState(() => localStorage.getItem('accessToken'))
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refreshToken'))
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem('accessToken')
    const p = t ? parseJwt(t) : null
    if (!p) return null
    // prefer a friendly display name: name, then email local-part, then email
    const friendly = p.name || (p.email && p.email.split && p.email.split('@')[0]) || p.email
    return friendly || null
  })

  useEffect(()=>{
    // sync token -> localStorage
    if(token){
      localStorage.setItem('accessToken', token)
      const p = parseJwt(token)
      if(p){
        const friendly = p.name || (p.email && p.email.split && p.email.split('@')[0]) || p.email
        setUser(friendly || 'Logged in')
      } else {
        setUser('Logged in')
      }
    } else {
      localStorage.removeItem('accessToken')
      setUser(null)
    }
  },[token])

  useEffect(()=>{
    if(refreshToken) localStorage.setItem('refreshToken', refreshToken)
    else localStorage.removeItem('refreshToken')
  },[refreshToken])

  const setTokensFromResponse = useCallback((data) => {
    // Accept multiple possible shapes: { accessToken, refreshToken } or data.data.accessToken etc.
    const a = data.accessToken || data.data?.accessToken || data.data?.access_token || data.access_token || data.token || data.data?.token
    const r = data.refreshToken || data.data?.refreshToken || data.data?.refresh_token || data.refresh_token
    if(a) setToken(a)
    if(r) setRefreshToken(r)
  },[])

  async function refreshAccessToken(){
    // Return the new access token string when refresh succeeds, or null on failure
    if(!refreshToken) return null
    try{
      const res = await axios.post('/api/auth/refresh', { refreshToken }, { headers: { 'Content-Type': 'application/json' } })
      const data = res.data
      if(res.status !== 200 || !data.success){
        setToken(null); setRefreshToken(null)
        return null
      }
      // normalize and set
      setTokensFromResponse(data)
      const newAccess = data.accessToken || data.data?.accessToken || data.data?.access_token || data.access_token || data.token || data.data?.token
      return newAccess || null
    }catch(e){
      console.error('refreshAccessToken error', e?.response?.data || e.message)
      setToken(null); setRefreshToken(null)
      return null
    }
  }

  // Wrapper around fetch that injects Authorization and attempts a single refresh+retry on 401
  async function authFetch(input, init={}){
    // keep a minimal fetch-like wrapper but use axios under the hood
    init = init || {}
    init.headers = init.headers ? {...init.headers} : {}
    if(token) init.headers['Authorization'] = 'Bearer '+token
    if(init.body && !init.headers['Content-Type']) init.headers['Content-Type'] = 'application/json'

    const config = {
      url: input,
      method: (init.method || 'GET').toLowerCase(),
      headers: init.headers,
      timeout: init.timeout || 10000
    }
    if(init.body){
      try{ config.data = typeof init.body === 'string' ? JSON.parse(init.body) : init.body }catch(e){ config.data = init.body }
    }

    try{
      const res = await axios(config)
      return { ok: true, status: res.status, json: async ()=> res.data }
    }catch(err){
      const status = err.response?.status
      // attempt single refresh+retry on 401 or 403 (some infra may return 403 for auth failures)
      if(status === 401 || status === 403){
        const refreshed = await refreshAccessToken()
        if(refreshed){
          config.headers = {...config.headers, Authorization: 'Bearer '+refreshed}
          try{
            const retry = await axios(config)
            return { ok: true, status: retry.status, json: async ()=> retry.data }
          }catch(e2){
            return { ok: false, status: e2.response?.status || 0, json: async ()=> e2.response?.data || { error: e2.message } }
          }
        }
      }
      return { ok: false, status: status || 0, json: async ()=> err.response?.data || { error: err.message } }
    }
  }

  async function loginWithCredentials(email,password){
    try{
      const res = await axios.post('/api/auth/login', { email, password }, { headers: { 'Content-Type': 'application/json' } })
      const data = res.data
      if(res.status !== 200 || !data.success) throw new Error(data.error || 'Login failed')
      setTokensFromResponse(data)
      return data
    }catch(e){
      const msg = e.response?.data?.error || e.message || 'Login failed'
      throw new Error(msg)
    }
  }

  async function demoLogin(email){
    try{
      const res = await axios.post('/api/auth/demo-login', { email }, { headers: { 'Content-Type': 'application/json' } })
      const data = res.data
      if(res.status !== 200 || !data.success) throw new Error(data.error || 'Demo login failed')
      setTokensFromResponse(data)
      return data
    }catch(e){
      const msg = e.response?.data?.error || e.message || 'Demo login failed'
      throw new Error(msg)
    }
  }

  async function logout(){
    try{
      // attempt to notify server to revoke refresh token
      await axios.post('/api/auth/logout', { refreshToken }, { headers: { 'Content-Type': 'application/json', ...(token?{'Authorization':'Bearer '+token}:{}) } })
    }catch(e){ /* ignore network errors */ }
    setToken(null)
    setRefreshToken(null)
  }

  const value = { token, refreshToken, user, loginWithCredentials, demoLogin, logout, authFetch, parseJwt }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(){ return useContext(AuthContext) }

export default AuthContext
