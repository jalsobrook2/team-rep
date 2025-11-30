import React, { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { useToast } from '../components/UiProvider'

// Haversine helper (km)
function distanceKm(lat1, lon1, lat2, lon2){
  const toRad = d => d * Math.PI / 180
  if([lat1,lon1,lat2,lon2].some(v => typeof v !== 'number' || Number.isNaN(v))) return null
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export default function Profile(){
  const { authFetch, token, parseJwt } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [worker, setWorker] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [rawResponse, setRawResponse] = useState(null)
  const [lastLoadedAt, setLastLoadedAt] = useState(null)
  const [editingSkills, setEditingSkills] = useState(false)
  const [skillsDraft, setSkillsDraft] = useState('')
  const [editingContact, setEditingContact] = useState(false)
  const [contactDraftEmail, setContactDraftEmail] = useState('')
  const [contactDraftPhone, setContactDraftPhone] = useState('')
  const [showReviews, setShowReviews] = useState(false)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviews, setReviews] = useState(null)

  // Expose a manual reload so user can trigger and see server response in UI
  async function reloadProfile(){
    // If a specific workerId is requested via hash (e.g. #profile?workerId=...), load that worker instead
    const rawHash = (window.location.hash || '').replace(/^#/, '')
    const qs = rawHash.split('?')[1] || ''
    const params = new URLSearchParams(qs)
    const viewWorkerId = params.get('workerId')

    // viewing another worker does not require the current user's token
    if(!token && !viewWorkerId) return
    setLoading(true)
    setErrorMsg(null)
    try{
      let res, data
      if(viewWorkerId){
        // fetch the public worker profile endpoint (no auth required)
        try{
          res = await authFetch(`/api/workers/${viewWorkerId}`)
        }catch(e){
          // authFetch may fail for anonymous users; fallback to window.fetch
          const raw = await fetch(`/api/workers/${viewWorkerId}`)
          const blob = await raw.text()
          try{ data = JSON.parse(blob) }catch(err){ data = null }
          res = { ok: raw.ok, status: raw.status }
        }
        if(!data) data = await (res.json ? res.json().catch(()=>null) : data)
      } else {
        res = await authFetch('/api/workers/dashboard')
        data = await res.json().catch(()=>null)
      }
      console.debug('[Profile.reload] /api/workers/dashboard', { ok: res.ok, status: res.status, data })
      setRawResponse({ ok: res.ok, status: res.status, data })
      setLastLoadedAt(new Date().toISOString())

      const payload = (data && data.data) ? data.data : (data || null)
      const workerObj = payload?.worker || data?.worker || payload?.user || data?.user || null
      const dashboardObj = payload?.dashboard || data?.dashboard || payload?.data?.dashboard || null

      if ((data && data.success) || (res.ok && (workerObj || dashboardObj))) {
        const normalizedWorker = workerObj ? ({ ...workerObj, _id: workerObj._id || workerObj.id || workerObj.id_str || null }) : null
        const normalizedDashboard = dashboardObj ? ({
          jobsPosted: Array.isArray(dashboardObj.jobsPosted) ? dashboardObj.jobsPosted : (dashboardObj.jobsPosted? [dashboardObj.jobsPosted]: []),
          jobsOthersPosted: Array.isArray(dashboardObj.jobsOthersPosted) ? dashboardObj.jobsOthersPosted : (dashboardObj.jobsOthersPosted? [dashboardObj.jobsOthersPosted]: []),
          jobsAccepted: Array.isArray(dashboardObj.jobsAccepted) ? dashboardObj.jobsAccepted : (dashboardObj.jobsAccepted? [dashboardObj.jobsAccepted]: []),
          messageRequests: Array.isArray(dashboardObj.messageRequests) ? dashboardObj.messageRequests : (dashboardObj.messageRequests? [dashboardObj.messageRequests]: []),
          recentConversations: Array.isArray(dashboardObj.recentConversations) ? dashboardObj.recentConversations : (dashboardObj.recentConversations? [dashboardObj.recentConversations]: [])
        }) : null

        setWorker(normalizedWorker)
        setDashboard(normalizedDashboard)
      } else {
        const msg = data && (data.error || data.message) ? (data.error || data.message) : `Request failed (${res.status})`
        setErrorMsg(msg)
        console.warn('[Profile.reload] dashboard load failed', msg, { res, data })
        toast(msg, 'error')

        if(!viewWorkerId){
          try{
            const rawToken = localStorage.getItem('accessToken') || token
            if(rawToken){
              console.debug('[Profile.reload] attempting direct fetch fallback with localStorage token')
              const direct = await fetch('/api/workers/dashboard', { headers: { 'Authorization': 'Bearer '+rawToken } })
              const directData = await direct.json().catch(()=>null)
              console.debug('[Profile.reload] direct fetch result', { ok: direct.ok, status: direct.status, directData })
              setRawResponse(prev => ({ ...prev, directOk: direct.ok, directStatus: direct.status, directData }))
              if(direct.ok && directData && directData.success){
                setWorker(directData.data?.worker || directData.worker || null)
                setDashboard(directData.data?.dashboard || directData.dashboard || null)
                setErrorMsg(null)
                return
              }
            }
          }catch(directErr){ console.warn('[Profile.reload] direct fetch fallback failed', directErr) }
        }

        try{
          const p = parseJwt ? parseJwt(token) : null
          if(p) setWorker({ name: p.name || (p.email && p.email.split && p.email.split('@')[0]) || p.email, email: p.email })
        }catch(e){}
      }
    }catch(e){ console.error('[Profile.reload] fetch error', e); toast(e.message || 'Failed to load profile','error') }
    setLoading(false)
  }

  useEffect(()=>{ reloadProfile() }, [token])

  // Viewer position for approximate distance (only requested when viewing another worker)
  const [viewerPosition, setViewerPosition] = useState(null)
  useEffect(()=>{
    // if viewing another worker and a coarse location is available, try to get user's position
    const rawHash = (window.location.hash || '').replace(/^#/, '')
    const qs = rawHash.split('?')[1] || ''
    const params = new URLSearchParams(qs)
    const viewWorkerId = params.get('workerId')
    const tokenPayload = parseJwt ? parseJwt(token) : null
    const isOwner = tokenPayload && worker && (String(tokenPayload.id || tokenPayload._id || tokenPayload.sub) === String(worker._id))
    if(viewWorkerId && !isOwner && worker && worker.locationCoordsCoarse && navigator && navigator.geolocation){
      try{
        navigator.geolocation.getCurrentPosition(p=>{
          setViewerPosition({ lat: p.coords.latitude, lng: p.coords.longitude })
        }, ()=>{}, { enableHighAccuracy:false, timeout:8000 })
      }catch(e){}
    }
  }, [worker, token, parseJwt])

  if(!token) return <div className="card">Please sign in to view your profile.</div>
  // Best-effort display name: prefer server worker, then rawResponse, then token
  const tokenPayload = parseJwt ? parseJwt(token) : null
  const displayName = worker?.name || rawResponse?.data?.worker?.name || rawResponse?.directData?.worker?.name || tokenPayload?.name || (tokenPayload?.email && tokenPayload.email.split && tokenPayload.email.split('@')[0]) || worker?.email || ''

  const isOwner = tokenPayload && worker && (String(tokenPayload.id || tokenPayload._id || tokenPayload.sub) === String(worker._id))
  let approxDistanceLabel = null
  try{
    if(!isOwner && worker && worker.locationCoordsCoarse && viewerPosition){
      const [clng, clat] = worker.locationCoordsCoarse.coordinates.map(Number)
      const d = distanceKm(viewerPosition.lat, viewerPosition.lng, clat, clng)
      if(d !== null){
        const coarse = d < 1 ? '<1' : Math.max(1, Math.round(d/5)*5)
        approxDistanceLabel = d < 1 ? '<1 km' : `~${coarse} km away`
      }
    }
  }catch(e){}

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <h2>My Profile {displayName ? `— ${displayName}` : ''}</h2>
        <div>
          <button onClick={reloadProfile} style={{marginLeft:8}}>Reload</button>
          {worker && worker._id && !isOwner && (
            <button onClick={()=>{
              try{
                // First navigate to the dashboard so the Dashboard component mounts.
                window.dispatchEvent(new CustomEvent('navigate-dashboard'));
                // Defer the message-to event slightly so Dashboard/Messaging can attach listeners.
                setTimeout(()=>{
                  try{ window.dispatchEvent(new CustomEvent('message-to', { detail: { id: worker._id } })) }catch(e){}
                }, 80)
              }catch(e){ /* ignore */ }
            }} style={{marginLeft:8}} className="ghost">Message</button>
          )}
          {lastLoadedAt && <span className="small" style={{marginLeft:12}}>Last: {new Date(lastLoadedAt).toLocaleTimeString()}</span>}
        </div>
      </div>
      {loading && <div className="small">Loading…</div>}
      {!loading && !worker && <div className="small">No profile data</div>}
      {!loading && errorMsg && <div className="small" style={{color:'#a00',marginTop:8}}>Error: {errorMsg}</div>}
      {!loading && worker && (
        <div>
          <div className="card">
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div className="avatar avatar-lg">{(worker.name||'U').slice(0,2)}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:18}}>{worker.name || worker.email || 'Unnamed'}</div>
                    <div className="small">{worker.email || ''}</div>
                    {worker.location && <div className="small">Location: {worker.location}</div>}
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div className="small">Joined: {worker.timeJoined ? new Date(worker.timeJoined).toLocaleDateString() : (worker.createdAt ? new Date(worker.createdAt).toLocaleDateString() : 'N/A')}</div>
                    <div className="small">Last updated: {worker.updatedAt ? new Date(worker.updatedAt).toLocaleDateString() : '—'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontWeight:700}}>Skills</div>
                  {!editingSkills && <button onClick={()=>{ setSkillsDraft(worker.skills || ''); setEditingSkills(true) }} style={{fontSize:12}}>Edit</button>}
                </div>
                {!editingSkills && <div className="small">{worker.skills || 'Not provided'}</div>}
                {editingSkills && (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <textarea value={skillsDraft} onChange={e=>setSkillsDraft(e.target.value)} style={{minHeight:60,padding:8}} />
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={async ()=>{
                        if(!worker || !worker._id){ toast('No worker id available','error'); return }
                        setLoading(true)
                        try{
                          const res = await authFetch(`/api/workers/${worker._id}`, { method: 'PUT', body: JSON.stringify({ skills: skillsDraft }) })
                          const data = await res.json()
                          if(res.ok && data.success){
                            toast('Skills updated','success')
                            const updated = data.worker || data.data?.worker || null
                            if(updated){ setWorker(prev=> ({ ...prev, ...updated })) }
                            else { reloadProfile() }
                            setEditingSkills(false)
                          } else { toast(data.error || 'Failed to update skills','error') }
                        }catch(e){ toast(e.message || 'Update failed','error') }
                        setLoading(false)
                      }}>Save</button>
                      <button onClick={()=>{ setEditingSkills(false); setSkillsDraft('') }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontWeight:700}}>Contact</div>
                  {!editingContact && <button onClick={()=>{ setContactDraftEmail(worker.email||''); setContactDraftPhone(worker.phone||''); setEditingContact(true) }} style={{fontSize:12}}>Edit</button>}
                </div>
                {!editingContact && (
                  <div>
                    <div className="small">Email: {worker.email || '—'}</div>
                    <div className="small">Phone: {worker.phone || '—'}</div>
                  </div>
                )}
                {editingContact && (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <input value={contactDraftEmail} onChange={e=>setContactDraftEmail(e.target.value)} placeholder="Email" style={{padding:8}} />
                    <input value={contactDraftPhone} onChange={e=>setContactDraftPhone(e.target.value)} placeholder="Phone" style={{padding:8}} />
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={async ()=>{
                        if(!worker || !worker._id){ toast('No worker id available','error'); return }
                        setLoading(true)
                        try{
                          const res = await authFetch(`/api/workers/${worker._id}`, { method: 'PUT', body: JSON.stringify({ email: contactDraftEmail, phone: contactDraftPhone }) })
                          const data = await res.json()
                          if(res.ok && data.success){
                            toast('Contact updated','success')
                            const updated = data.worker || data.data?.worker || null
                            if(updated){ setWorker(prev=> ({ ...prev, ...updated })) }
                            else { reloadProfile() }
                            setEditingContact(false)
                          } else { toast(data.error || 'Failed to update contact','error') }
                        }catch(e){ toast(e.message || 'Update failed','error') }
                        setLoading(false)
                      }}>Save</button>
                      <button onClick={()=>{ setEditingContact(false); setContactDraftEmail(''); setContactDraftPhone('') }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div style={{fontWeight:700}}>Coordinates</div>
                <div className="small">
                  {isOwner && worker.locationCoords && Array.isArray(worker.locationCoords.coordinates) ? `${worker.locationCoords.coordinates[1].toFixed(6)}, ${worker.locationCoords.coordinates[0].toFixed(6)}` : (
                    approxDistanceLabel || (worker.location || 'Not set')
                  )}
                </div>
                <div style={{marginTop:8}}>
                  <button onClick={async ()=>{
                    if(!worker || !worker._id){ toast('No worker id available','error'); return }
                    if(!navigator.geolocation){ toast('Geolocation not supported in this browser','error'); return }
                    try{
                      setLoading(true)
                      navigator.geolocation.getCurrentPosition(async (pos)=>{
                        const lat = pos.coords.latitude
                        const lng = pos.coords.longitude
                        try{
                          const res = await authFetch(`/api/workers/${worker._id}`, { method: 'PUT', body: JSON.stringify({ lat, lng, location: worker.location || 'Current location' }) })
                          const data = await res.json()
                          if(res.ok && data.success){ 
                            toast('Coordinates updated','success'); 
                            // If server returned updated worker, apply it immediately to UI to avoid stale reads
                            const updated = data.worker || data.data?.worker || null
                            if(updated){
                              const normalizedWorker = {
                                ...updated,
                                _id: updated._id || updated.id || updated._id_str || updated.id_str || worker._id
                              }
                              // ensure locationCoords shape
                              if(normalizedWorker.locationCoords && Array.isArray(normalizedWorker.locationCoords.coordinates)){
                                // convert strings to numbers if necessary
                                normalizedWorker.locationCoords.coordinates = normalizedWorker.locationCoords.coordinates.map(c => typeof c === 'string' ? parseFloat(c) : c)
                              }
                              setWorker(normalizedWorker)
                            } else {
                              // fallback to full reload
                              reloadProfile();
                            }
                          } else { toast(data.error || 'Failed to update coordinates','error') }
                        }catch(e){ toast(e.message || 'Update failed','error') }
                        setLoading(false)
                      }, (err)=>{ toast('Failed to get position: '+(err && err.message), 'error'); setLoading(false) }, { enableHighAccuracy:true, timeout:10000 })
                    }catch(e){ setLoading(false); toast(e.message || 'Geolocation error','error') }
                  }} style={{marginTop:6}}>Set my coordinates</button>
                </div>
              </div>
              <div>
                <div style={{fontWeight:700}}>Counts</div>
                <div className="small">Posted jobs: {dashboard?.jobsPosted?.length ?? (Array.isArray(worker.postedJobs) ? worker.postedJobs.length : 0)}</div>
                <div className="small">Accepted jobs: {dashboard?.jobsAccepted?.length ?? (Array.isArray(worker.acceptedJobs) ? worker.acceptedJobs.length : 0)}</div>
              </div>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontWeight:700}}>Reviews</div>
                  <button className="ghost" onClick={async ()=>{
                    // toggle and load reviews on first open
                    const next = !showReviews
                    setShowReviews(next)
                    if(next && !reviews){
                      if(!worker || !worker._id){ toast('No worker id available','error'); return }
                      setReviewsLoading(true)
                      try{
                        // prefer authFetch for cookie/token-aware requests
                        let res
                        try{
                          res = await authFetch(`/api/workers/${worker._id}/reviews`)
                        }catch(e){
                          // fallback to direct fetch with localStorage token
                          const tk = localStorage.getItem('accessToken')
                          res = await fetch(`/api/workers/${worker._id}/reviews`, { headers: tk ? { Authorization: 'Bearer '+tk } : {} })
                        }
                        const data = await res.json().catch(()=>null)
                        if(res.ok && data && (data.success || data.reviews)){
                          // support different payload shapes
                          const list = data.reviews || data.data?.reviews || (data.data? data.data : null) || []
                          setReviews(Array.isArray(list) ? list : [])
                        }else{
                          toast((data && (data.error||data.message)) || `Failed to load reviews (${res.status})`, 'error')
                        }
                      }catch(e){ toast(e.message || 'Failed to load reviews','error') }
                      setReviewsLoading(false)
                    }
                  }}>{showReviews ? 'Hide' : 'View'}</button>
                </div>
                {!showReviews && <div className="small">{worker?.avgRating ? `Avg: ${Number(worker.avgRating).toFixed(1)} ⭐ — ${worker.reviewCount || 0} reviews` : 'No reviews yet'}</div>}
                {showReviews && (
                  <div style={{marginTop:8}}>
                    {reviewsLoading && <div className="small">Loading reviews…</div>}
                    {!reviewsLoading && reviews && reviews.length===0 && <div className="small">No reviews yet</div>}
                    {!reviewsLoading && reviews && reviews.length>0 && (
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        <div style={{fontWeight:700}}>Average: {worker?.avgRating ? Number(worker.avgRating).toFixed(1) : ( (reviews.reduce((s,r)=>s+(r.rating||0),0)/reviews.length).toFixed(1) )} ⭐ — {reviews.length} reviews</div>
                        {reviews.map((r,i)=> (
                          <div key={`review-${i}`} style={{padding:8,borderBottom:'1px solid #f0f0f0'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                              <div style={{fontWeight:700}}>{(r.reviewer && (r.reviewer.name || r.reviewer.email)) || 'Anonymous'}</div>
                              <div className="small">{r.rating || '—'} ⭐</div>
                            </div>
                            {r.comment && <div className="small" style={{marginTop:6}}>{r.comment}</div>}
                            <div className="small" style={{marginTop:6,color:'#666'}}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {dashboard && (
            <div style={{marginTop:12}}>
              <div style={{fontWeight:800,marginBottom:8}}>Your Jobs</div>
              <div className="card">
                <div style={{fontWeight:700}}>Posted</div>
                {dashboard.jobsPosted && dashboard.jobsPosted.length===0 && <div className="small">No posted jobs</div>}
                {dashboard.jobsPosted && dashboard.jobsPosted.map((j, i) => (
                  <div key={`posted-${j._id || j.id}-${i}`} style={{padding:8,borderBottom:'1px solid #f0f0f0'}}>
                    <div style={{fontWeight:700}}>{j.title}</div>
                    <div className="small">{j.location || ''} — ${j.offer || 'N/A'}</div>
                  </div>
                ))}

                <div style={{height:12}} />
                <div style={{fontWeight:700}}>Accepted</div>
                {dashboard.jobsAccepted && dashboard.jobsAccepted.length===0 && <div className="small">No accepted jobs</div>}
                {dashboard.jobsAccepted && dashboard.jobsAccepted.map((j, i) => (
                  <div key={`accepted-${j._id || j.id}-${i}`} style={{padding:8,borderBottom:'1px solid #f0f0f0'}}>
                    <div style={{fontWeight:700}}>{j.title}</div>
                    <div className="small">{j.location || ''} — ${j.offer || 'N/A'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Debug output removed for production/dev cleanliness */}
    </div>
  )
}
