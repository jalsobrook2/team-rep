import React, { useEffect, useState, useRef } from 'react'
import WorkerCard from '../components/WorkerCard'
import Messaging from '../components/Messaging'
import { useToast, useConfirm } from '../components/UiProvider'
import { useAuth } from '../AuthContext'

export default function Dashboard(){
  const toast = useToast()
  const confirm = useConfirm()
  const { authFetch, token, user } = useAuth()
  const [tab, setTab] = useState('workers')
  const [workers, setWorkers] = useState([])
  const [pageInfo, setPageInfo] = useState({page:1,totalPages:1,totalCount:0})
  const [jobs, setJobs] = useState([])
  const [myJobs, setMyJobs] = useState([])
  const [acceptedJobs, setAcceptedJobs] = useState([])
  const [postMsg, setPostMsg] = useState(null)
  const [who, setWho] = useState('Not logged in')

  useEffect(()=>{
    // initialize auth UI and load initial data
    setWho(user || 'Not logged in')
    loadWorkers(1)
    loadJobs()
    loadMyJobs()
    loadAcceptedJobs()
  },[])

  function getCurrentUserId(){
    try{ const p = token ? JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))) : null; return p ? (p.id || p._id || p.sub) : null }catch(e){ return null }
  }

  const [applicantsJobId, setApplicantsJobId] = useState(null)
  const [applicantsList, setApplicantsList] = useState([])
  const [loadingApplicants, setLoadingApplicants] = useState(false)

  function refreshAuthUI(){
    if(token){ try{ const payload = token ? JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))) : null; if(payload) setWho(payload.name || payload.email || payload.id || payload.sub); else setWho('Logged in') }catch(e){ setWho('Logged in') } }
    else setWho('Not logged in')
  }

  async function loadWorkers(page=1, limit=6){
    const res = await authFetch(`/api/workers?page=${page}&limit=${limit}`)
    try{
      const data = await res.json()
      if(res.ok && data.success){
        setWorkers(data.data?.workers || data.workers || [])
        setPageInfo({page: data.data?.page || page, totalPages: data.data?.totalPages || 1, totalCount: data.data?.totalCount || data.count || 0})
      } else { console.error('Failed load workers', data) }
    }catch(e){ console.error('loadWorkers parse error', e) }
  }

  async function loadJobs(){
    const res = await authFetch('/api/jobs?status=open')
    try{
      const data = await res.json()
      if(res.ok && data.success){ setJobs(data.data?.jobs || data.jobs || []) } else { setJobs([]); console.error('loadJobs', data) }
    }catch(e){ console.error('loadJobs', e); setJobs([]) }
  }

  async function loadMyJobs(){
    const res = await authFetch('/api/workers/dashboard')
    try{
      const data = await res.json()
      if(res.ok && data.success){ setMyJobs(data.data?.dashboard?.jobsPosted || []) } else { setMyJobs([]) }
    }catch(e){ console.error('loadMyJobs', e); setMyJobs([]) }
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
      timeDue: form.timeDue.value ? new Date(form.timeDue.value).toISOString() : undefined
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

  // Listen for global message-to events (dispatched by WorkerCard) and switch to Messaging tab
  useEffect(()=>{
    function onMessageTo(e){
      // Open messaging tab when a worker's Message button is clicked
      if(e && e.detail && e.detail.id){
        showTab('messaging')
      }
    }
    window.addEventListener('message-to', onMessageTo)
    return ()=> window.removeEventListener('message-to', onMessageTo)
  },[])

  return (
    <div className="app">
      <div id="userBadge" style={{position:'fixed',left:16,top:16,zIndex:2200,display:'flex',alignItems:'center',gap:8}}>
        <div className="avatar" id="userAvatar" style={{width:36,height:36,borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(180deg,#06a0db,#0082c0)',color:'#fff',fontWeight:800}}>U</div>
        <div id="userName" className="small">{who}</div>
      </div>

      <header>
        <h1 data-testid="dashboard-title">Dashboard</h1>
        <div className="auth-row">
          <div className="small">{who}</div>
        </div>
      </header>

      <nav className="tab-bar" role="tablist" aria-label="Dashboard tabs">
        <button data-testid="tab-workers" className="tab-btn" onClick={() => showTab('workers')}>Workers</button>
        <button data-testid="tab-jobs" className="tab-btn" onClick={() => showTab('jobs')}>Jobs</button>
        <button data-testid="tab-myjobs" className="tab-btn" onClick={() => showTab('myjobs')}>My Jobs</button>
        <button data-testid="tab-accepted" className="tab-btn" onClick={() => showTab('accepted')}>Accepted Jobs</button>
        <button data-testid="tab-post" className="tab-btn" onClick={() => showTab('post')}>Post Job</button>
        <button data-testid="tab-messaging" className="tab-btn" onClick={() => showTab('messaging')}>Messaging</button>
        <button data-testid="tab-about" className="tab-btn" onClick={() => showTab('about')}>About / Help</button>
      </nav>

      <main>
        <section id="workers" className={`panel ${tab==='workers' ? 'active' : ''}`}>
          <h2>Available Workers</h2>
          <p className="small">Showing name, email and skills. Use pagination to load more.</p>
          <div id="workersList" className="list">
            {workers.map(w => <WorkerCard key={w._id} worker={w} />)}
          </div>
          <div id="workersPagination" style={{marginTop:8,display:'flex',gap:8,alignItems:'center'}}>
            <button className="ghost" onClick={()=>loadWorkers(Math.max(1,pageInfo.page-1))} disabled={pageInfo.page<=1}>Prev</button>
            <div className="small">Page {pageInfo.page} / {pageInfo.totalPages} ({pageInfo.totalCount} total)</div>
            <button className="ghost" onClick={()=>loadWorkers(Math.min(pageInfo.totalPages,pageInfo.page+1))} disabled={pageInfo.page>=pageInfo.totalPages}>Next</button>
          </div>
        </section>

        <section id="jobs" className={`panel ${tab==='jobs' ? 'active' : ''}`}>
          <h2 data-testid="jobs-title">Available Jobs</h2>
          <div className="small">Last API error: <span id="lastError" style={{color:'#a00'}}></span></div>
          <div id="jobsList" className="list">
            {jobs.map(j => (
              <div className="card" key={j._id}>
                <strong>{j.title}</strong>
                <div className="small">{j.description}</div>
                <div className="small">Location: {j.location || 'N/A'}</div>
                <div className="small">Offer: ${j.offer || 'N/A'}</div>
                {j.timeDue && <div className="small">Due: {new Date(j.timeDue).toLocaleString()}</div>}
                <div className="small">Status: {j.status || 'N/A'}</div>
                {j.status === 'open' && (
                  <div style={{marginTop:8}}>
                    <button onClick={async ()=>{
                      try{ const res = await authFetch(`/api/jobs/${j._id}/apply`, { method:'POST' }); const data = await res.json(); if(!res.ok || !data.success){ toast(data.error||'Failed to apply','error'); return } toast(data.message || 'Applied','success'); loadJobs(); }catch(e){ toast(e.message,'error') }
                    }}>Apply</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section id="myjobs" className={`panel ${tab==='myjobs' ? 'active' : ''}`}>
          <h2>My Posted Jobs</h2>
          <div id="myJobsList" className="list">
            {myJobs.map(j => (
              <div className="card" key={j._id}>
                <strong>{j.title}</strong>
                <div className="small">{j.description}</div>
                <div className="small">Location: {j.location || 'N/A'}</div>
                <div className="small">Status: {j.status||'N/A'}</div>
                <div className="small">Offer: ${j.offer||'N/A'}</div>
                {j.timeDue && <div className="small">Due: {new Date(j.timeDue).toLocaleString()}</div>}
                <div style={{marginTop:8,display:'flex',gap:8,alignItems:'center'}}>
                  {j.assignedTo ? (
                    <>
                      <div className="small">Assigned: {j.assignedTo.name || j.assignedTo}</div>
                      <button className="ghost" onClick={async ()=>{
                        const ok = await confirm('Remove the assigned worker from this job?')
                        if(!ok) return
                        try{ const res = await authFetch(`/api/jobs/${j._id}/kick`, { method:'POST' }); const data = await res.json(); if(!res.ok || !data.success){ toast(data.error||'Failed to remove worker','error'); return } toast('Worker removed','success'); loadJobs(); loadMyJobs(); loadAcceptedJobs(); }catch(e){ toast(e.message,'error') }
                      }}>Remove worker</button>
                    </>
                  ) : <div className="small">No worker assigned</div> }

                  <button onClick={async ()=>{
                    // toggle applicants modal
                    if(applicantsJobId === j._id){ setApplicantsJobId(null); setApplicantsList([]); return }
                    setLoadingApplicants(true)
                      try{
                      const res = await authFetch(`/api/jobs/${j._id}`);
                      const data = await res.json();
                      if(!res.ok || !data.success){ toast(data.error||'Failed to load applicants','error'); setLoadingApplicants(false); return }
                      const applicants = (data.data && data.data.job && data.data.job.applicants) || []
                      setApplicantsList(applicants)
                      setApplicantsJobId(j._id)
                    }catch(e){ toast(e.message,'error') }
                    setLoadingApplicants(false)
                  }} className="ghost">View applicants</button>
                </div>
                {applicantsJobId === j._id && (
                  <div style={{marginTop:8,borderTop:'1px solid #eee',paddingTop:8}}>
                    <div style={{fontWeight:700,marginBottom:6}}>Applicants</div>
                    {loadingApplicants && <div className="small">Loading…</div>}
                    {!loadingApplicants && applicantsList.length===0 && <div className="small">No applicants</div>}
                    {applicantsList.map(a=> (
                      <div key={a._id || a} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:8,borderRadius:8,background:'#fbfdff',marginTop:6}}>
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
            {acceptedJobs.map(j => (
              <div className="card" key={j._id}>
                <strong>{j.title}</strong>
                <div className="small">{j.description}</div>
                <div className="small">Location: {j.location || 'N/A'}</div>
                <div className="small">Status: {j.status || 'N/A'}</div>
                <div className="small">Offer: ${j.offer || 'N/A'}</div>
                {j.timeDue && <div className="small">Due: {new Date(j.timeDue).toLocaleString()}</div>}
                {j.owner && <div className="small">Owner: {j.owner.name || j.owner.email || j.owner}</div>}
                {j.createdAt && <div className="small">Posted: {new Date(j.createdAt).toLocaleString()}</div>}
                <div style={{marginTop:8}}>
                  <button className="ghost" onClick={async ()=>{
                    const ok = await confirm('Remove yourself from this job? It will be returned to available jobs.')
                    if(!ok) return
                    try{ const res = await authFetch(`/api/jobs/${j._id}/unassign-self`, { method:'POST' }); const data = await res.json(); if(!res.ok || !data.success){ toast(data.error||'Failed to remove yourself','error'); return } toast('Removed from job','success'); loadJobs(); loadAcceptedJobs(); }catch(e){ toast(e.message,'error') }
                  }}>Leave Job</button>
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
          <p>This is a lightweight dashboard for exploring workers, jobs and posting jobs. Designed mobile-first.</p>
        </section>
      </main>
    </div>
  )
}
