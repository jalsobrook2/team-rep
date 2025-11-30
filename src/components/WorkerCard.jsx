import React, { useState } from 'react'

export default function WorkerCard({ worker, onSelectKeyword }){
  const initials = (worker.name||'').split(' ').map(s=>s[0]).slice(0,2).join('') || (worker.email?worker.email[0].toUpperCase():'?')
  const [showReviews, setShowReviews] = useState(false)
  const [reviews, setReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const fetchReviews = async () => {
    setLoadingReviews(true)
    try{
      const res = await fetch(`/api/workers/${worker._id}/reviews`)
      const data = await res.json()
      if(res.ok && data.success){
        setReviews(data.data?.reviews || data.reviews || [])
      } else {
        setReviews([])
      }
    }catch(e){ setReviews([]) }
    setLoadingReviews(false)
  }

  const submitReview = async (e) => {
    e.preventDefault()
    const token = (()=>{try{ return window.localStorage.getItem('accessToken') }catch(e){return null}})()
    if(!token){ alert('Please sign in to submit a review'); return }
    setSubmitting(true)
    try{
      const res = await fetch(`/api/workers/${worker._id}/reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ rating, comment }) })
      const data = await res.json()
      if(!res.ok || !data.success){ alert(data.error || 'Failed to submit review'); setSubmitting(false); return }
      setComment('')
      setRating(5)
      // refresh list
      await fetchReviews()
    }catch(e){ alert(e.message || 'Failed to submit review') }
    setSubmitting(false)
  }

  return (
    <div className="card worker-card">
      <div className="worker-avatar">{initials}</div>
      <div className="worker-card-body">
        <div className="worker-name">
          <button className="keyword-link" onClick={()=>{
            try{
              const id = worker._id || worker.id || worker
              window.location.hash = `profile?workerId=${id}`
            }catch(e){ /* ignore */ }
          }}>{worker.name}</button>
        </div>
        <div className="worker-email">{worker.email}</div>
        <div className="worker-skills">
          {onSelectKeyword ? (
            (worker.skills || '').split(/[,;|]/).map((s, i) => { const sk = s.trim(); return sk ? <button key={`sk-${i}`} className="skill-tag" onClick={()=>onSelectKeyword(sk)}>{sk}</button> : null })
          ) : (
            worker.skills
          )}
        </div>
        {typeof worker.distanceKm !== 'undefined' && worker.distanceKm !== null ? (
          <div className="worker-distance">Distance: {Math.round(Number(worker.distanceKm))} km</div>
        ) : null}
        {(worker.timeJoined || worker.createdAt) ? (
          <div className="worker-joined">Joined: {new Date(worker.timeJoined || worker.createdAt).toLocaleString()}</div>
        ) : null}
        {/* show average rating if available on worker object */}
        {worker.avgRating ? (
          <div className="worker-rating">Rating: {worker.avgRating} / 5 ({worker.reviewCount||0})</div>
        ) : null}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>{
            const evt = new CustomEvent('message-to', { detail: { id: worker._id } });
            window.dispatchEvent(evt);
            const nav = new CustomEvent('navigate-dashboard'); window.dispatchEvent(nav);
          }}>Message</button>
          <button onClick={async ()=>{
            const next = !showReviews
            setShowReviews(next)
            if(next) await fetchReviews()
          }}>{showReviews ? 'Hide Reviews' : 'Reviews'}</button>
        </div>

        {showReviews && (
          <div style={{marginTop:8,border:'1px solid #eee',padding:8,borderRadius:6,background:'#fafafa',minWidth:260}}>
            {loadingReviews ? <div className="small">Loading reviews…</div> : (
              <div>
                <div style={{fontWeight:700,marginBottom:6}}>Reviews</div>
                {reviews.length===0 && <div className="small">No reviews yet</div>}
                {reviews.map((r, i) => (
                  <div key={`rev-${i}`} style={{padding:8,borderBottom:i<reviews.length-1?'1px solid #eee':'none'}}>
                    <div style={{fontWeight:700}}>{r.reviewer && (r.reviewer.name || r.reviewer.email) ? (r.reviewer.name || r.reviewer.email) : 'Anonymous'}</div>
                    <div className="small">{r.rating} / 5</div>
                    {r.comment ? <div style={{marginTop:6}}>{r.comment}</div> : null}
                    <div className="small" style={{color:'#666',marginTop:6}}>{new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{marginTop:8,borderTop:'1px solid #eee',paddingTop:8}}>
              <form onSubmit={submitReview}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <label className="small">Your rating</label>
                  <select value={rating} onChange={e=>setRating(Number(e.target.value))}>
                    <option value={5}>5</option>
                    <option value={4}>4</option>
                    <option value={3}>3</option>
                    <option value={2}>2</option>
                    <option value={1}>1</option>
                  </select>
                </div>
                <div style={{marginTop:8}}>
                  <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Optional comment" rows={3} style={{width:'100%'}} />
                </div>
                <div style={{marginTop:8,display:'flex',gap:8}}>
                  <button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Review'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
