import React, { useEffect, useState, useRef } from 'react'
import WorkerCard from '../components/WorkerCard'
import Messaging from '../components/Messaging'
import { useToast, useConfirm } from '../components/UiProvider'
import { useAuth } from '../AuthContext'
import { fetchJobsNear } from '../utils/geoApi'

export default function Dashboard(){
  const toast = useToast()
  const confirm = useConfirm()
  const { authFetch, token, user, parseJwt, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)
  const [tab, setTab] = useState('workers')
  const [workers, setWorkers] = useState([])
  const [pageInfo, setPageInfo] = useState({page:1,totalPages:1,totalCount:0})
  const [jobs, setJobs] = useState([])
  const [myJobs, setMyJobs] = useState([])
  const [acceptedJobs, setAcceptedJobs] = useState([])
  const [radiusKm, setRadiusKm] = useState(() => {
    try{ const v = localStorage.getItem('pj_radius_km'); return v ? Number(v) : 50 }catch(e){ return 50 }
  })
  const [jobSearch, setJobSearch] = useState('')
  const [debouncedJobSearch, setDebouncedJobSearch] = useState('')
  const [workerSearch, setWorkerSearch] = useState('')
  const [debouncedWorkerSearch, setDebouncedWorkerSearch] = useState('')
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [lastError, setLastError] = useState(null)
  const [postMsg, setPostMsg] = useState(null)
  const [who, setWho] = useState('Not logged in')
  const [loadingName, setLoadingName] = useState(false)
  const [appliedJobIds, setAppliedJobIds] = useState(() => new Set())
  const [acceptingJobIds, setAcceptingJobIds] = useState(() => new Set())
  const [viewingJobId, setViewingJobId] = useState(null)

  useEffect(()=>{
    // initialize auth UI and load initial data; re-run when token or user changes (login/logout)
    // Prefer server-provided friendly name; if not available yet derive a safe fallback from token
    if (token) {
      setLoadingName(true)
      try{
        const p = parseJwt ? parseJwt(token) : null
        const fallback = (p && (p.name || (p.email && p.email.split && p.email.split('@')[0]) || p.email)) || 'Logged in'
        setWho(fallback)
      }catch(e){ setWho('Logged in') }
    } else {
      setWho('Not logged in')
    }
    loadWorkers(1)
    // attempt to show nearby jobs automatically
    try{ fetchNearby() }catch(e){ loadJobs() }
    // Defer loading 'My Jobs' and 'Accepted Jobs' until the user selects those tabs
    // to improve initial page load performance. They will be loaded when tab changes.
  },[token, user])

  // debounce job search input for smoother typing
  useEffect(()=>{
    const t = setTimeout(()=> setDebouncedJobSearch((jobSearch||'').trim().toLowerCase()), 250)
    return ()=> clearTimeout(t)
  }, [jobSearch])

  // debounce worker search input
  useEffect(()=>{
    const t = setTimeout(()=> setDebouncedWorkerSearch((workerSearch||'').trim().toLowerCase()), 250)
    return ()=> clearTimeout(t)
  }, [workerSearch])

  // close user menu when clicking outside
  useEffect(()=>{
    function onDoc(e){
      if(!userMenuRef.current) return
      if(!userMenuRef.current.contains(e.target)) setShowUserMenu(false)
    }
    document.addEventListener('click', onDoc)
    return ()=> document.removeEventListener('click', onDoc)
  },[])

  // Manual refresh helper used by Refresh button
  function refreshDashboard(){
    setLastError(null)
    loadWorkers(1)
    // refresh nearby results if possible
    try{ fetchNearby() }catch(e){ loadJobs() }
    loadMyJobs()
    loadAcceptedJobs()
  }

  function getCurrentUserId(){
    try{ const p = token ? JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))) : null; return p ? (p.id || p._id || p.sub) : null }catch(e){ return null }
  }

  // Normalize id-like values (ObjectId objects or strings) into stable string ids
  function idToString(idOrObj){
    try{
      if(!idOrObj) return null
      const candidate = idOrObj._id || idOrObj
      if(candidate && typeof candidate.toString === 'function') return candidate.toString()
      return String(candidate)
    }catch(e){ return String(idOrObj) }
  }

  const [applicantsJobId, setApplicantsJobId] = useState(null)
  const [applicantsList, setApplicantsList] = useState([])
  const [loadingApplicants, setLoadingApplicants] = useState(false)

  function refreshAuthUI(){
    if(token){ try{ const payload = token ? JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))) : null; if(payload) setWho(payload.name || payload.email || payload.id || payload.sub); else setWho('Logged in') }catch(e){ setWho('Logged in') } }
    else setWho('Not logged in')
  }

  async function loadWorkers(page=1, limit=6, lat=null, lng=null, radius=null){
    let url = `/api/workers?page=${page}&limit=${limit}`
    if (lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      url += `&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
      // When radius is 500 (rightmost), treat as unlimited and omit radiusKm
      if (radius !== null && !Number.isNaN(radius) && Number(radius) < 500) url += `&radiusKm=${encodeURIComponent(radius)}`
    }
    const res = await authFetch(url)
    try{
      const data = await res.json()
      if(res.ok && data.success){
        setWorkers(data.data?.workers || data.workers || [])
        setPageInfo({page: data.data?.page || page, totalPages: data.data?.totalPages || 1, totalCount: data.data?.totalCount || data.count || 0})
      } else { console.error('Failed load workers', data) }
    }catch(e){ console.error('loadWorkers parse error', e) }
  }

  async function showNearbyWorkers(){
    setLastError(null)
    setNearbyLoading(true)
    try{
      if (!(navigator && navigator.geolocation)) throw new Error('Geolocation not supported')
      const pos = await new Promise((resolve, reject)=>{
        const timer = setTimeout(()=>reject(new Error('Geolocation timeout')), 8000)
        navigator.geolocation.getCurrentPosition(p=>{ clearTimeout(timer); resolve(p) }, err=>{ clearTimeout(timer); reject(err) }, { enableHighAccuracy:false, timeout:8000 })
      })
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      await loadWorkers(1, 6, lat, lng, radiusKm)
    }catch(err){
      console.warn('showNearbyWorkers error', err)
      const msg = err && err.message ? err.message : String(err)
      setLastError(msg)
    }
    setNearbyLoading(false)
  }

  async function loadJobs(){
    // Try to use browser geolocation and the nearby endpoint if possible.
    // Fallback to the regular jobs listing when geolocation not available or request fails.
    try{
      if (navigator && navigator.geolocation) {
        const geo = await new Promise((resolve, reject)=>{
          const timer = setTimeout(()=>reject(new Error('Geolocation timeout')), 5000)
          navigator.geolocation.getCurrentPosition(pos => { clearTimeout(timer); resolve(pos) }, err => { clearTimeout(timer); reject(err) }, { enableHighAccuracy: false, timeout: 5000 })
        })
        const lat = geo.coords.latitude
        const lng = geo.coords.longitude
        try{
          const nearby = await fetchJobsNear(authFetch, lat, lng, radiusKm)
          setJobs(nearby)
          return
        }catch(err){ console.warn('Nearby jobs fetch failed, falling back', err.message) }
      }
    }catch(e){ console.warn('Geolocation unavailable or denied', e && e.message)}

    // If user is signed-in and has profile coords on server, prefer the
    // authenticated nearby endpoint (server will fallback to worker profile coords).
    if (token) {
      try {
        setLastError(null)
        let res
        // Treat 500 as unlimited: call the general jobs listing so server will
        // use profile coords or return all jobs rather than filtering by 500km
        if (Number(radiusKm) >= 500) {
          res = await authFetch('/api/jobs?status=open')
        } else {
          res = await authFetch(`/api/jobs/near?radiusKm=${encodeURIComponent(radiusKm)}`)
        }
        const data = await res.json()
        if (res.ok && data.success) {
          const loaded = data.data?.jobs || data.jobs || []
          setJobs(loaded)
          // initialize appliedJobIds for jobs already showing the current user in applicants
          try{
            const cur = getCurrentUserId()
            if(cur){
              const initial = new Set(Array.from(appliedJobIds))
              loaded.forEach(j => {
                if (j.applicants && Array.isArray(j.applicants)){
                        if(j.applicants.some(a => idToString(a) === idToString(cur) )){
                          initial.add(idToString(j._id))
                  }
                }
              })
              setAppliedJobIds(initial)
            }
          }catch(e){}
          return
        }
        console.warn('Authenticated nearby failed, falling back to listing', data)
      } catch (err) {
        console.warn('Authenticated nearby fetch error, falling back', err && err.message)
      }
    }

    // Final fallback: regular listing
    setLastError(null)
    const res = await authFetch('/api/jobs?status=open')
    try{
      const data = await res.json()
      if(res.ok && data.success){
        const loaded = data.data?.jobs || data.jobs || []
        setJobs(loaded)
        // initialize appliedJobIds for jobs already showing the current user in applicants
        try{
          const cur = getCurrentUserId()
          if(cur){
            const initial = new Set(Array.from(appliedJobIds))
            loaded.forEach(j => {
              if (j.applicants && Array.isArray(j.applicants)){
                  if(j.applicants.some(a => idToString(a) === idToString(cur) )){
                    initial.add(idToString(j._id))
                  }
              }
            })
            setAppliedJobIds(initial)
          }
        }catch(e){}
      } else { setJobs([]); console.error('loadJobs', data); setLastError(data.error || 'Failed to load jobs') }
    }catch(e){ console.error('loadJobs', e); setJobs([]); setLastError(e.message) }
  }

  async function fetchNearby() {
    setLastError(null)
    setNearbyLoading(true)
    try{
      if (!(navigator && navigator.geolocation)) throw new Error('Geolocation not supported')
      const pos = await new Promise((resolve, reject)=>{
        const timer = setTimeout(()=>reject(new Error('Geolocation timeout')), 8000)
        navigator.geolocation.getCurrentPosition(p=>{ clearTimeout(timer); resolve(p) }, err=>{ clearTimeout(timer); reject(err) }, { enableHighAccuracy:false, timeout:8000 })
      })
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const nearby = await fetchJobsNear(authFetch, lat, lng, radiusKm)
      setJobs(nearby)
    }catch(err){
      console.warn('fetchNearby error', err);
      const msg = err && err.message ? err.message : String(err)
      // Suppress auth-related messages (401/403) to avoid noisy UI when user is anonymous
      if (/401|403|Unauthorized|Authorization header missing/i.test(msg)) {
        setLastError(null)
        // Fallback to anonymous listing and show friendly notice
        try{ await loadJobs(); toast('Showing public listings — sign in for personalized results','info') }catch(e){ /* ignore */ }
      } else {
        setLastError(msg)
        // Fallback to anonymous listing and show friendly notice
        try{ await loadJobs(); toast('Showing public listings due to an error — sign in for personalized results','info') }catch(e){ /* ignore */ }
      }
    }
    setNearbyLoading(false)
  }

  function clearNearby() {
    setLastError(null)
    loadJobs()
  }

  async function loadMyJobs(){
    let res = null
    try{
      res = await authFetch('/api/workers/dashboard')
      const data = await (res && res.json ? res.json() : Promise.resolve({}))
      if(res && res.ok && data && data.success){
        setMyJobs(data.data?.dashboard?.jobsPosted || [])
        // Prefer showing the worker's name in the top-left badge when available
        try{
          const name = data.data?.worker?.name || data.data?.worker?.email
          if(name) setWho(name)
        }catch(e){}
      } else {
        setMyJobs([])
        // If the dashboard call failed due to auth, attempt no-op fallback display
        try{ if(res && (res.status===401 || res.status===403)) setWho('Not logged in') }catch(e){}
      }
    }catch(e){ console.error('loadMyJobs', e); setMyJobs([]) }
    finally{
      // always clear loading indicator so UI doesn't stay stuck
      setLoadingName(false)
    }
  }

  async function loadAcceptedJobs(){
    const res = await authFetch('/api/workers/dashboard')
    try{
      const data = await res.json()
      if(res.ok && data.success){ setAcceptedJobs(data.data?.dashboard?.jobsAccepted || []) } else { setAcceptedJobs([]) }
    }catch(e){ console.error('loadAcceptedJobs', e); setAcceptedJobs([]) }
  }

  async function postJob(e){
    e.preventDefault()
    setPostMsg(null)
    const form = e.target
    const payload = {
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      location: form.location.value.trim(),
      offer: parseFloat(form.offer.value),
      timeDue: form.timeDue.value ? new Date(form.timeDue.value).toISOString() : undefined,
      // Recurrence fields
      recurring: {
        enabled: !!form.recurring_enabled.checked,
        frequency: form.recurring_frequency.value || null,
        interval: form.recurring_interval.value ? Number(form.recurring_interval.value) : 1,
        endDate: form.recurring_end.value ? new Date(form.recurring_end.value).toISOString() : null
      }
    }
    try{
  const res = await authFetch('/api/jobs', { method:'POST', body: JSON.stringify(payload) })
      const data = await res.json()
      if(!res.ok || !data.success){ setPostMsg({ type:'error', text: data.error || 'Failed to create' }); return }
      setPostMsg({ type:'success', text: data.data?.message || 'Job created' })
      form.reset()
      loadJobs(); loadMyJobs()
    }catch(err){ setPostMsg({ type:'error', text: err.message }) }
  }

  function showTab(name){ setTab(name); if(name==='workers') loadWorkers(); if(name==='jobs') loadJobs(); if(name==='myjobs') loadMyJobs(); if(name==='accepted') loadAcceptedJobs(); }

  // calendar state for Schedule tab
  const [scheduleWeekStart, setScheduleWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay(); // 0 (Sun) - 6
    // Start week on Monday
    const offset = (day + 6) % 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - offset)
    monday.setHours(0,0,0,0)
    return monday
  })

  function addWeeks(d, n){ const r = new Date(d); r.setDate(r.getDate() + n*7); return r }
  function prevWeek(){ setScheduleWeekStart(s => addWeeks(s, -1)) }
  function nextWeek(){ setScheduleWeekStart(s => addWeeks(s, 1)) }

  function getWeekDays(start){ const days = []; for(let i=0;i<7;i++){ const d = new Date(start); d.setDate(start.getDate()+i); days.push(d) } return days }

  function jobsForDay(day){ try{ return (acceptedJobs||[]).filter(j => {
      const when = j.timeDue ? new Date(j.timeDue) : (j.createdAt ? new Date(j.createdAt) : null)
      if(!when) return false
      return when.getFullYear()===day.getFullYear() && when.getMonth()===day.getMonth() && when.getDate()===day.getDate()
    }) }catch(e){ return [] } }

  // Listen for global message-to events (dispatched by WorkerCard) and switch to Messaging tab
  useEffect(()=>{
    function onMessageTo(e){
      // Open messaging tab when a worker's Message button is clicked
      if(e && e.detail && e.detail.id){
        showTab('messaging')
      }
    }
    window.addEventListener('message-to', onMessageTo)
    function onDashboardOpen(e){
      try{
        const panel = e && e.detail && e.detail.panel ? e.detail.panel : null
        const jobId = e && e.detail && (e.detail.jobId || e.detail.id) ? (e.detail.jobId || e.detail.id) : null
        if(panel) showTab(panel)
        // If a jobId was provided, switch to accepted jobs and mark it for viewing
        if(jobId){
          showTab('accepted')
          setViewingJobId(jobId)
        }
      }catch(err){}
    }
    window.addEventListener('dashboard-open', onDashboardOpen)
    return ()=>{
      window.removeEventListener('message-to', onMessageTo)
      window.removeEventListener('dashboard-open', onDashboardOpen)
    }
  },[])

  // When viewingJobId is set, attempt to scroll the matching accepted job into view
  useEffect(()=>{
    if(!viewingJobId) return
    const idStr = String(viewingJobId)
    // Small timeout to allow the Accepted tab to become active and DOM to render
    const t = setTimeout(()=>{
      try{
        const el = document.querySelector(`#acceptedJobsList .card[key\`accepted-${idStr}-0\`]`)
      }catch(e){}
      try{
        // Try a few selectors to be robust to different key/id shapes
        const byKey = document.querySelector(`[key='accepted-${idStr}-0']`)
        if(byKey && byKey.scrollIntoView) return byKey.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }catch(e){}
      try{
        const elId = document.getElementById(`accepted-${idStr}`)
        if(elId && elId.scrollIntoView) elId.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }catch(e){}
    }, 120)
    return ()=> clearTimeout(t)
  },[viewingJobId])

  return (
    <div className="app">
      <div id="userBadge" ref={userMenuRef}>
        <button aria-haspopup="true" aria-expanded={showUserMenu} onClick={(e)=>{ e.stopPropagation(); setShowUserMenu(s=>!s) }} style={{border:0,background:'transparent',padding:0,cursor:'pointer'}}>
          <div className="avatar" id="userAvatar">{(who||'U').slice(0,1).toUpperCase()}</div>
        </button>
        <div id="userName" className="small">{(token && loadingName) ? 'Loading…' : who}</div>
        {showUserMenu && (
          <div className="user-menu">
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <button className="ghost" onClick={()=>{ setShowUserMenu(false); window.dispatchEvent(new CustomEvent('navigate-profile')) }}>View Profile</button>
              <button className="ghost" onClick={async ()=>{ setShowUserMenu(false); try{ await logout(); window.dispatchEvent(new CustomEvent('navigate-dashboard')); window.location.hash = ''; }catch(e){} }}>Logout</button>
            </div>
          </div>
        )}
      </div>

      <header>
        <h1 data-testid="dashboard-title">Dashboard</h1>
        <div className="auth-row">
          <div className="small">{(token && loadingName) ? 'Loading…' : who}</div>
        </div>
      </header>

      <nav className="tab-bar" role="tablist" aria-label="Dashboard tabs">
        <button data-testid="tab-workers" className="tab-btn" onClick={() => showTab('workers')}>Workers</button>
        <button data-testid="tab-jobs" className="tab-btn" onClick={() => showTab('jobs')}>Jobs</button>
        <button data-testid="tab-myjobs" className="tab-btn" onClick={() => showTab('myjobs')}>My Jobs</button>
        <button data-testid="tab-accepted" className="tab-btn" onClick={() => showTab('accepted')}>Accepted Jobs</button>
        <button data-testid="tab-schedule" className="tab-btn" onClick={() => showTab('schedule')}>Schedule</button>
        <button data-testid="tab-post" className="tab-btn" onClick={() => showTab('post')}>Post Job</button>
        <button data-testid="tab-messaging" className="tab-btn" onClick={() => showTab('messaging')}>Messaging</button>
        
      </nav>

      <main>
        <section id="workers" className={`panel ${tab==='workers' ? 'active' : ''}`}>
          <h2>Available Workers</h2>
          <p className="small">Showing name, email and skills. Use pagination to load more.</p>
          <div className="controls-row">
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <label className="small" htmlFor="workersRadiusInput">Radius</label>
              <input id="workersRadiusInput" className="range-input" type="range" min={1} max={500} value={radiusKm} onChange={e=>{ const v = Number(e.target.value||0); setRadiusKm(v); try{ localStorage.setItem('pj_radius_km', String(v)) }catch(e){} }} />
              <div className="small small-value">{radiusKm >= 500 ? '500+' : radiusKm} km</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={showNearbyWorkers} disabled={nearbyLoading}>{nearbyLoading ? 'Searching…' : 'Show Nearby Workers'}</button>
              <button className="ghost" onClick={()=>{ setLastError(null); loadWorkers(1) }}>Clear Nearby</button>
            </div>
            <div className="job-search" style={{marginLeft:16}}>
              <input aria-label="Search workers" placeholder="Search name or skills" value={workerSearch} onChange={e=>setWorkerSearch(e.target.value)} />
              {workerSearch && <button className="ghost" onClick={()=>{ setWorkerSearch(''); setDebouncedWorkerSearch('') }}>Clear</button>}
            </div>
          </div>
          <div id="workersList" className="list">
            {(() => {
              const q = debouncedWorkerSearch || ''
              const filtered = (!q) ? workers : workers.filter(w => {
                try{
                  const n = (w.name || '').toString().toLowerCase()
                  const s = (w.skills || '').toString().toLowerCase()
                  return n.includes(q) || s.includes(q)
                }catch(e){ return false }
              })
              return filtered.map(w => (
                <WorkerCard key={w._id} worker={w} onSelectKeyword={(kw)=>{ try{ setWorkerSearch(kw); setDebouncedWorkerSearch((kw||'').toLowerCase()) }catch(e){} }} />
              ))
            })()}
          </div>
          <div id="workersPagination" style={{marginTop:8,display:'flex',gap:8,alignItems:'center'}}>
            <button className="ghost" onClick={()=>loadWorkers(Math.max(1,pageInfo.page-1))} disabled={pageInfo.page<=1}>Prev</button>
            <div className="small">Page {pageInfo.page} / {pageInfo.totalPages} ({pageInfo.totalCount} total)</div>
            <button className="ghost" onClick={()=>loadWorkers(Math.min(pageInfo.totalPages,pageInfo.page+1))} disabled={pageInfo.page>=pageInfo.totalPages}>Next</button>
          </div>
        </section>

        <section id="jobs" className={`panel ${tab==='jobs' ? 'active' : ''}`}>
          <h2 data-testid="jobs-title">Available Jobs</h2>
          <div className="controls-row">
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <label className="small" htmlFor="radiusInput">Radius</label>
              <input id="radiusInput" className="range-input" type="range" min={1} max={500} value={radiusKm} onChange={e=>{ const v = Number(e.target.value||0); setRadiusKm(v); try{ localStorage.setItem('pj_radius_km', String(v)) }catch(e){} }} />
              <div className="small small-value">{radiusKm >= 500 ? '500+' : radiusKm} km</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={fetchNearby} disabled={nearbyLoading}>{nearbyLoading ? 'Searching…' : 'Show Nearby'}</button>
              <button className="ghost" onClick={clearNearby}>Clear Nearby</button>
              <button className="ghost" onClick={refreshDashboard}>Refresh</button>
            </div>
            <div className="job-search">
              <input aria-label="Search jobs" placeholder="Search title or description" value={jobSearch} onChange={e=>setJobSearch(e.target.value)} />
              {jobSearch && <button className="ghost" onClick={()=>{ setJobSearch(''); setDebouncedJobSearch('') }}>Clear</button>}
            </div>
            
          </div>
          <div id="jobsList" className="list">
            {(() => {
              const q = debouncedJobSearch || ''
              const filtered = (!q) ? jobs : jobs.filter(j => {
                try{
                  const t = (j.title || '').toString().toLowerCase()
                  const d = (j.description || '').toString().toLowerCase()
                  return t.includes(q) || d.includes(q)
                }catch(e){ return false }
              })
              return filtered.map((j, i) => (
              <div className="card" key={`job-${j._id || j.id}-${i}`}>
                <strong>{j.title}</strong>
                <div className="small">{j.description}</div>
                <div className="small">Location: {j.location || 'N/A'}</div>
                {typeof j.distanceKm !== 'undefined' && (
                  <div className="small">Distance: {Number(j.distanceKm).toFixed(1)} km</div>
                )}
                <div className="small">Offer: ${j.offer || 'N/A'}</div>
                {j.timeDue && <div className="small">Due: {new Date(j.timeDue).toLocaleString()}</div>}
                {j.recurring && j.recurring.enabled && (
                  <div className="small">Recurring: every {j.recurring.interval || 1} {j.recurring.frequency}{j.recurring.interval>1? 's':''}{j.recurring.endDate ? ` until ${new Date(j.recurring.endDate).toLocaleDateString()}` : ''}</div>
                )}
                <div className="small">Status: {j.status || 'N/A'}</div>
                {j.status === 'open' && (
                  <div style={{marginTop:8}}>
                    <button disabled={j.status !== 'open' || appliedJobIds.has(idToString(j._id))} onClick={async ()=>{
                      // Optimistic: mark as applied immediately
                      setAppliedJobIds(prev => { const s = new Set(prev); s.add(idToString(j._id)); return s })
                      try{
                        const res = await authFetch(`/api/jobs/${j._id}/apply`, { method:'POST' });
                        const data = await res.json();
                        if(!res.ok || !data.success){
                          // rollback optimistic add
                          setAppliedJobIds(prev => { const s = new Set(prev); s.delete(idToString(j._id)); return s })
                          toast(data.error||'Failed to apply','error');
                          return
                        }
                        toast(data.message || 'Applied','success');
                        // reload lists to reflect authoritative state
                        loadJobs();
                        loadMyJobs();
                      }catch(e){
                        // rollback on error
                        setAppliedJobIds(prev => { const s = new Set(prev); s.delete(idToString(j._id)); return s })
                        toast(e.message,'error')
                      }
                    }}>Apply</button>

                    {/* Accept button for signed-in workers (self-assign) */}
                    {token && (() => {
                      try {
                        const ownerId = j.owner ? (typeof j.owner === 'string' ? j.owner : (j.owner._id || j.owner)) : null;
                        const current = getCurrentUserId();
                        if (!current) return null;
                        if (ownerId && ownerId.toString() === current.toString()) return null; // owner cannot accept
                        return (
                          <button style={{marginLeft:8}} disabled={acceptingJobIds.has(idToString(j._id))} onClick={async ()=>{
                            const ok = await confirm('Accept this job? This will assign it to you.');
                            if(!ok) return;
                            // optimistic UI: mark as accepting and update local jobs/acceptedJobs
                              setAcceptingJobIds(prev => { const s = new Set(prev); s.add(idToString(j._id)); return s })
                              const current = getCurrentUserId()
                              const prevJobs = jobs
                              // create optimistic job object
                              const optimisticJob = Object.assign({}, j, { status: 'assigned', assignedTo: { _id: idToString(current), name: 'You' } })
                              setJobs(prev => prev.map(p => idToString(p._id) === idToString(j._id) ? optimisticJob : p))
                              setAcceptedJobs(prev => {
                                if(prev.some(x => idToString(x._id) === idToString(j._id))) return prev
                                return [...prev, optimisticJob]
                              })
                            try{
                              const res = await authFetch(`/api/jobs/${j._id}/accept`, { method: 'POST' });
                              const data = await res.json();
                              if(!res.ok || !data.success){
                                // rollback optimistic
                                setJobs(prevJobs)
                                setAcceptedJobs(prev => prev.filter(x => idToString(x._id) !== idToString(j._id)))
                                toast(data.error || 'Failed to accept','error')
                                setAcceptingJobIds(prev => { const s = new Set(prev); s.delete(idToString(j._id)); return s })
                                return
                              }
                              toast(data.message || 'Accepted','success')
                              // authoritative refresh
                              loadJobs(); loadAcceptedJobs(); loadMyJobs();
                            }catch(err){
                              // rollback optimistic
                              setJobs(prevJobs)
                              setAcceptedJobs(prev => prev.filter(x => idToString(x._id) !== idToString(j._id)))
                              setAcceptingJobIds(prev => { const s = new Set(prev); s.delete(idToString(j._id)); return s })
                              toast(err.message,'error')
                            }
                          }}>Accept</button>
                        )
                      } catch (e) {
                        return null;
                      }
                    })()}
                  </div>
                )}
              </div>
            ))
          })()}
          </div>
        </section>

        <section id="myjobs" className={`panel ${tab==='myjobs' ? 'active' : ''}`}>
          <h2>My Posted Jobs</h2>
          <div id="myJobsList" className="list">
            {myJobs.map((j, i) => (
              <div className="card" key={`myjob-${j._id || j.id}-${i}`}>
                <strong>{j.title}</strong>
                <div className="small">{j.description}</div>
                <div className="small">Location: {j.location || 'N/A'}</div>
                <div className="small">Status: {j.status||'N/A'}</div>
                <div className="small">Offer: ${j.offer||'N/A'}</div>
                {j.timeDue && <div className="small">Due: {new Date(j.timeDue).toLocaleString()}</div>}
                {j.recurring && j.recurring.enabled && (
                  <div className="small">Recurring: every {j.recurring.interval || 1} {j.recurring.frequency}{j.recurring.interval>1? 's':''}{j.recurring.endDate ? ` until ${new Date(j.recurring.endDate).toLocaleDateString()}` : ''}</div>
                )}
                <div className="controls-row" style={{marginTop:8}}>
                  {j.assignedTo ? (
                    <>
                      <div className="small">Assigned: {j.assignedTo.name || j.assignedTo}</div>
                      <div style={{display:'flex',gap:8}}>
                        <button className="ghost" onClick={async ()=>{
                          const ok = await confirm('Remove the assigned worker from this job?')
                          if(!ok) return
                          try{ const res = await authFetch(`/api/jobs/${j._id}/kick`, { method:'POST' }); const data = await res.json(); if(!res.ok || !data.success){ toast(data.error||'Failed to remove worker','error'); return } toast('Worker removed','success'); loadJobs(); loadMyJobs(); loadAcceptedJobs(); }catch(e){ toast(e.message,'error') }
                        }}>Remove worker</button>
                        <button className="ghost" onClick={()=>{
                          try{
                            const assignedId = idToString(j.assignedTo._id || j.assignedTo)
                            // navigate to profile page showing this worker
                            window.location.hash = `profile?workerId=${assignedId}`
                          }catch(e){ toast('Failed to open profile','error') }
                        }}>View profile</button>
                      </div>
                    </>
                  ) : <div className="small">No worker assigned</div> }

                  <button onClick={async ()=>{
                    // toggle applicants modal
                    if(applicantsJobId === idToString(j._id)){ setApplicantsJobId(null); setApplicantsList([]); return }
                    setLoadingApplicants(true)
                      try{
                      const res = await authFetch(`/api/jobs/${j._id}`);
                      const data = await res.json();
                      if(!res.ok || !data.success){ toast(data.error||'Failed to load applicants','error'); setLoadingApplicants(false); return }
                      const applicants = (data.data && data.data.job && data.data.job.applicants) || []
                      setApplicantsList(applicants)
                      setApplicantsJobId(idToString(j._id))
                    }catch(e){ toast(e.message,'error') }
                    setLoadingApplicants(false)
                  }} className="ghost">View applicants</button>
                </div>
                {applicantsJobId === idToString(j._id) && (
                  <div style={{marginTop:8,borderTop:'1px solid #eee',paddingTop:8}}>
                    <div style={{fontWeight:700,marginBottom:6}}>Applicants</div>
                    {loadingApplicants && <div className="small">Loading…</div>}
                    {!loadingApplicants && applicantsList.length===0 && <div className="small">No applicants</div>}
                    {applicantsList.map((a, ai)=> (
                      <div key={`applicant-${a._id || a}-${ai}`} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:8,borderRadius:8,background:'#fbfdff',marginTop:6}}>
                        <div>
                          <div style={{fontWeight:800}}>{a.name || a}</div>
                          <div className="small">{a.email || ''}</div>
                        </div>
                        <div>
                          <button onClick={async ()=>{
                            const ok = await confirm(`Assign ${a.name||a.email||a} to this job?`)
                            if(!ok) return
                            try{ const res = await authFetch(`/api/jobs/${j._id}/assign`, { method:'POST', body: JSON.stringify({ workerId: a._id || a }) }); const data = await res.json(); if(!res.ok || !data.success){ toast(data.error||'Failed to assign','error'); return } toast('Worker assigned','success'); loadJobs(); loadMyJobs(); loadAcceptedJobs(); setApplicantsJobId(null); setApplicantsList([]); }catch(e){ toast(e.message,'error') }
                          }}>Assign</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section id="accepted" className={`panel ${tab==='accepted' ? 'active' : ''}`}>
          <h2>Accepted Jobs</h2>
          <p className="small">Jobs you've accepted to work on. Shows description, location, offer, owner and timestamps.</p>
          <div id="acceptedJobsList" className="list">
            {acceptedJobs.map((j, i) => (
              <div id={`accepted-${j._id || j.id || i}`} className="card" key={`accepted-${j._id || j.id}-${i}`} data-jobid={j._id || j.id}>
                <strong>{j.title}</strong>
                <div className="small">{j.description}</div>
                <div className="small">Location: {j.location || 'N/A'}</div>
                <div className="small">Status: {j.status || 'N/A'}</div>
                <div className="small">Offer: ${j.offer || 'N/A'}</div>
                {j.timeDue && <div className="small">Due: {new Date(j.timeDue).toLocaleString()}</div>}
                {j.recurring && j.recurring.enabled && (
                  <div className="small">Recurring: every {j.recurring.interval || 1} {j.recurring.frequency}{j.recurring.interval>1? 's':''}{j.recurring.endDate ? ` until ${new Date(j.recurring.endDate).toLocaleDateString()}` : ''}</div>
                )}
                {j.owner && <div className="small">Owner: {j.owner.name || j.owner.email || j.owner}</div>}
                {j.createdAt && <div className="small">Posted: {new Date(j.createdAt).toLocaleString()}</div>}
                <div style={{marginTop:8}}>
                  <button className="ghost" onClick={async ()=>{
                    const ok = await confirm('Remove yourself from this job? It will be returned to available jobs.')
                    if(!ok) return
                    try{ const res = await authFetch(`/api/jobs/${j._id}/unassign-self`, { method:'POST' }); const data = await res.json(); if(!res.ok || !data.success){ toast(data.error||'Failed to remove yourself','error'); return } toast('Removed from job','success'); loadJobs(); loadAcceptedJobs(); }catch(e){ toast(e.message,'error') }
                  }}>Leave Job</button>
                  <button className="ghost" style={{marginLeft:8}} onClick={()=>{ try{ window.dispatchEvent(new CustomEvent('navigate-dashboard')); setTimeout(()=>{ try{ window.dispatchEvent(new CustomEvent('dashboard-open', { detail: { panel: 'accepted', jobId: j._id || j.id } })) }catch(e){} }, 80) }catch(e){} }}>View job</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="schedule" className={`panel ${tab==='schedule' ? 'active' : ''}`}>
          <h2>Schedule (week view)</h2>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button className="ghost" onClick={prevWeek}>Prev week</button>
              <button className="ghost" onClick={nextWeek}>Next week</button>
              <div className="small">Week of {scheduleWeekStart.toLocaleDateString()}</div>
            </div>
            <div className="small">Showing accepted jobs placed into days by their due date (or posted date)</div>
          </div>

          <div className="schedule-week">
            {getWeekDays(scheduleWeekStart).map((day, idx) => (
              <div className="schedule-day" key={`day-${idx}`}>
                <div className="schedule-day-header">{day.toLocaleDateString(undefined,{weekday:'short', month:'short', day:'numeric'})}</div>
                <div className="schedule-day-body">
                  {jobsForDay(day).length===0 && <div className="small">No accepted jobs</div>}
                  {jobsForDay(day).map((j, i) => (
                    <div className="event-card" key={`ev-${j._id||j.id||i}`}>
                      <div style={{fontWeight:700}}>{j.title}</div>
                      <div className="small">{j.location || 'N/A'} — {j.owner && (j.owner.name || j.owner.email) ? (j.owner.name || j.owner.email) : ''}</div>
                      {j.timeDue && <div className="small">Due: {new Date(j.timeDue).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>}
                      <div style={{marginTop:6}}>
                        <button className="ghost" onClick={()=>{ try{ window.dispatchEvent(new CustomEvent('navigate-dashboard')); setTimeout(()=>{ try{ window.dispatchEvent(new CustomEvent('dashboard-open', { detail: { panel: 'accepted', jobId: j._id || j.id } })) }catch(e){} }, 80) }catch(e){} }}>View job</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="post" className={`panel ${tab==='post' ? 'active' : ''}`}>
          <h2 data-testid="post-title">Post a Job</h2>
          <form id="postJobForm" data-testid="post-job-form" onSubmit={postJob}>
            <label htmlFor="title">Title</label>
            <input data-testid="post-title-input" id="title" name="title" required maxLength={100} />

            <label htmlFor="description">Description</label>
            <textarea data-testid="post-description-input" id="description" name="description" rows={4} required maxLength={1000}></textarea>

            <label htmlFor="location">Location</label>
            <input data-testid="post-location-input" id="location" name="location" required maxLength={200} />

            <div className="row">
              <div className="col">
                <label htmlFor="offer">Offer (USD)</label>
                <input data-testid="post-offer-input" id="offer" name="offer" type="number" step="0.01" required min="1" />
              </div>
              <div className="col">
                <label htmlFor="timeDue">Due (optional)</label>
                <input id="timeDue" name="timeDue" type="datetime-local" />
              </div>
            </div>

            <div style={{marginTop:8}}>
              <label htmlFor="recurring-enabled">
                <input id="recurring-enabled" name="recurring_enabled" type="checkbox" /> Recurring job
              </label>
              <div style={{display:'flex',gap:8,marginTop:6,alignItems:'center'}}>
                <label className="small">Frequency</label>
                <select id="recurring-frequency" name="recurring_frequency" defaultValue="weekly">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <label className="small">Interval</label>
                <input id="recurring-interval" name="recurring_interval" type="number" defaultValue={1} min={1} style={{width:64}} />
                <label className="small">End (optional)</label>
                <input id="recurring-end" name="recurring_end" type="date" />
              </div>
            </div>

            <button data-testid="post-submit" type="submit">Create Job</button>
            <div id="postJobMsg">{postMsg ? <div className={`msg ${postMsg.type==='success'?'success':'error'}`}>{postMsg.text}</div> : null}</div>
          </form>
        </section>

        <section id="messaging" className={`panel ${tab==='messaging' ? 'active' : ''}`}>
          <h2>Messaging</h2>
          <Messaging />
        </section>

        <section id="about" className={`panel ${tab==='about' ? 'active' : ''}`}>
          <h2>About & Help</h2>
          <div>
            <p className="constrained-760">Pocket Jobs is a lightweight marketplace for short local work: find nearby workers, post jobs, and message candidates directly. The app focuses on quick discovery and privacy-friendly location features.</p>
            <p style={{fontWeight:700}}>Quick tips</p>
            <ul>
              <li>Browse <strong>Workers</strong> to see available helpers. Use the radius slider and <em>Show Nearby Workers</em> to find people close to you.</li>
              <li>Open <strong>Jobs</strong> to view nearby gigs; the slider controls search radius for job listings as well.</li>
              <li>Click a worker's <em>Message</em> button to start a private conversation.</li>
              <li>Use <strong>Post Job</strong> to create a new job — include a short location and offer.</li>
              <li>Visit <strong>View Profile</strong> (top-left avatar) to edit your skills, phone, or set your approximate location. Location precision is reduced for privacy.</li>
              <li>If you just want to try the app, use <em>Demo Login</em> from the login screen to sign in without creating an account.</li>
            </ul>
            <p style={{color:'#666'}}>If something isn't working, try refreshing the dashboard. For developer/debug info, check the browser console and server logs.</p>
          </div>
        </section>
      </main>
    </div>
  )
}
