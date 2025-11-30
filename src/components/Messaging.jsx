import React, { useEffect, useRef, useState } from 'react'
import { useToast } from './UiProvider'
import { useAuth } from '../AuthContext'

// authFetch is provided by AuthContext and injects Authorization & handles refresh
// import it via useAuth below

function isValidObjectId(id){
  // Accept either a 24-hex ObjectId or any non-empty string id — be permissive for client-side UX
  return typeof id === 'string' && (id.length === 24 && /^[a-fA-F0-9]{24}$/.test(id) || id.length > 0)
}

export default function Messaging(){
  const toast = useToast()
  const { authFetch, token } = useAuth()
  const DEBUG = !!localStorage.getItem('MESSAGING_DEBUG')
  const [receiver, setReceiver] = useState('')
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotalPages, setUsersTotalPages] = useState(1)
  const [body, setBody] = useState('')
  const [convo, setConvo] = useState([])
  const [conversations, setConversations] = useState([])
  const [loadingInbox, setLoadingInbox] = useState(false)
  const [activeOtherId, setActiveOtherId] = useState(null)
  const convRef = useRef(null)
  const lastRequestedRef = useRef(null)
  const receiverRef = useRef(null)

  useEffect(()=>{
    function onMessageTo(e){
      const id = e?.detail?.id
      if(DEBUG) console.debug('[Messaging] message-to event, id=', id)
      if(id){
        setReceiver(id)
        if(isValidObjectId(id)) openConversation(id, { manual: true })
      }
    }
    // listen for cross-component events that request opening a conversation
    if(typeof window !== 'undefined' && window.addEventListener){
      window.addEventListener('message-to', onMessageTo)
    }
    // attempt to trigger initial inbox load if helper exists (safe-guard)
    try{ if(typeof loadInbox === 'function') loadInbox() }catch(e){}
    return ()=>{ try{ if(typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('message-to', onMessageTo) }catch(e){} }
  }, [])

  // load users for the Find pane, supports pagination and optional geo-sorted results
  async function loadUsers(page = 1, append = false){
    setUsersLoading(true)
    try{
      let url = `/api/workers?page=${page}&limit=10`
      try{
        if(navigator && navigator.geolocation){
          const pos = await new Promise((resolve, reject)=>{
            const timer = setTimeout(()=>reject(new Error('Geolocation timeout')), 4000)
            navigator.geolocation.getCurrentPosition(p=>{ clearTimeout(timer); resolve(p) }, err=>{ clearTimeout(timer); reject(err) }, { enableHighAccuracy:false, timeout:4000 })
          })
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          url = `/api/workers?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&page=${page}&limit=10`
        }
      }catch(e){ /* ignore geolocation errors and fall back to unsorted list */ }

      const res = await authFetch(url)
      const data = await res.json()
      if(res.ok && data.success){
        const rawList = data.data?.workers || data.workers || []
        // hide obvious test/sample workers from the messaging "Find" UI but keep seeded demo accounts
        // NOTE: avoid using CommonJS `require` in the browser bundle; implement a small, safe filter here
        function filterVisibleWorkers(arr){
          if(!Array.isArray(arr)) return []
          return arr.filter(u=>{
            const email = (u.email||'').toLowerCase()
            const name = (u.name||'').toLowerCase()
            // hide entries that explicitly look like samples
            if(email.includes('sample') || email.includes('sample-') || name.includes('sample')) return false
            // keep everything else (including seeded demo accounts like demo@pocketjob.test)
            return true
          })
        }
        const list = filterVisibleWorkers(rawList)
        if(DEBUG) console.debug('[Messaging] loadUsers response', { url, status: res.status, count: list.length, page: data.page, totalPages: data.totalPages })
        const mapped = list.map(u=>({ _id: u._id || u.id, name: u.name || (u.email||'').split('@')[0], email: u.email || '', distanceKm: u.distanceKm || null }))
        if(append){
          setUsers(prev => {
            const ids = new Set(prev.map(x=>String(x._id)))
            return [...prev, ...mapped.filter(m=>!ids.has(String(m._id)))]
          })
        } else {
          setUsers(mapped)
        }
        const respPage = (data && (data.data?.page ?? data.page)) || page
        const respTotalPages = (data && (data.data?.totalPages ?? data.totalPages)) || 1
        setUsersPage(respPage)
        setUsersTotalPages(respTotalPages)
      } else {
        console.warn('[Messaging] loadUsers failed', { url, ok: res.ok, status: res.status, data })
        if(!append) setUsers([])
      }
    }catch(e){ console.error('loadUsers', e); if(!append) setUsers([]) }
    setUsersLoading(false)
  }

  function loadMoreUsers(){
    const next = Math.min(usersPage + 1, usersTotalPages || usersPage + 1)
    if(next <= usersPage) return
    loadUsers(next, true)
  }

  async function openConversation(otherId, opts={ markRead:true }){
    // Accept either string ids or ObjectId-like objects by coercing to string when possible
    if(!otherId) { setConvo([]); setActiveOtherId(null); return }
    const idStr = (typeof otherId === 'string') ? otherId : (otherId && otherId.toString ? otherId.toString() : null)
    if(!idStr){ setConvo([]); setActiveOtherId(null); return }
  if(DEBUG) console.debug('[Messaging] openConversation request otherId=', otherId, 'idStr=', idStr, 'opts=', opts)
  // If this is a user-initiated action, mark it as the last requested convo so
  // background refreshes won't stomp the user's selection.
  const isManual = !!(opts && opts.manual)
  if(isManual){
    lastRequestedRef.current = idStr
    setActiveOtherId(idStr)
    setReceiver(idStr)
  }

    // load messages
    try{
      const res = await authFetch(`/api/messages/conversation/${idStr}`)
      const data = await res.json()
      if(res.ok && data.success){
        // If this wasn't a manual request, only set the active conversation
        // after we know the fetch succeeded and it's not been superseded.
        if(!isManual){
          // If the user selected another convo in the meantime, abort.
          if(lastRequestedRef.current && lastRequestedRef.current !== idStr){
            if(DEBUG) console.debug('[Messaging] background fetch aborted because manual selection exists', lastRequestedRef.current, idStr)
            return
          }
          setActiveOtherId(idStr)
          setReceiver(idStr)
        }
        setConvo(data.data || [])
        // after loading messages, optionally mark read
        if(opts.markRead){
          try{ if(DEBUG) console.debug('[Messaging] mark as read ->', idStr); await authFetch(`/api/messages/conversation/${idStr}/read`, { method:'POST' }) }catch(e){}
          // refresh inbox to pick up updated unread counts
          loadInbox()
        }
        // If the user selected another conversation since this request started,
        // don't overwrite the UI with older/stale data. This is checked above
        // for background requests; for manual requests it's safe to proceed.
        // scroll to bottom after a tick
        setTimeout(()=>{ if(convRef.current) convRef.current.scrollTop = convRef.current.scrollHeight }, 120)
      } else {
        console.warn('openConversation failed', data)
        setConvo([])
      }
    }catch(e){ console.error('openConversation', e); setConvo([]) }
  }
  
  // load inbox/conversations for the left pane (component-scope)
  async function loadInbox(){
    setLoadingInbox(true)
    try{
      const res = await authFetch('/api/messages/conversations')
      const data = await res.json()
      if(res.ok && data && data.success){
        setConversations(Array.isArray(data.data) ? data.data : (data.data || []))
      } else {
        // If unauthorized, silently clear conversations (likely not logged in)
        if(res.status === 401){ if(DEBUG) console.debug('[Messaging] loadInbox unauthorized', data); setConversations([]); setLoadingInbox(false); return }
        // Only show verbose warning in debug mode to avoid noisy console during normal use
        if(DEBUG) console.warn('[Messaging] loadInbox failed', { status: res.status, data })
        setConversations([])
      }
    }catch(e){ console.error('loadInbox', e); setConversations([]) }
    setLoadingInbox(false)
  }

  async function sendMessage(){
    const to = receiver?.trim()
    const content = body?.trim()
  if(!to || !content) return toast('Receiver and message required', 'error')
    // don't strictly validate id format client-side — let server respond if id doesn't exist
    try{
      const res = await authFetch('/api/messages', { method:'POST', body: JSON.stringify({ receiverId: to, content }) })
      const data = await res.json()
      if(res.ok && data.success){
        setBody('')
        // if the sent message belongs to the currently open conversation, reload it
        if(activeOtherId && activeOtherId === to) openConversation(to)
        // in case conversation wasn't open, ensure inbox refresh shows the conversation
        loadInbox()
        } else {
        toast(data.error || 'Failed to send', 'error')
      }
    }catch(e){ toast(e.message || 'Failed to send', 'error') }
  }

  // reply send (from reply row)
  async function sendReply(){
    if(!activeOtherId) return toast('Select a conversation first', 'error')
    if(!body || !body.trim()) return
    setReceiver(activeOtherId)
    await sendMessage()
  }

  function selectUser(u){
    try{
      const id = String(u._id || u.id)
      setReceiver(id)
      openConversation(id, { manual: true })
      // Give the layout a tick then scroll/focus the receiver display so user sees it's selected
      setTimeout(()=>{
        try{
          if(receiverRef.current){ receiverRef.current.scrollIntoView({ behavior:'smooth', block: 'center' }); receiverRef.current.focus() }
        }catch(e){}
      }, 60)
    }catch(e){ console.error('selectUser', e) }
  }

  // Compute deduplicated, sorted conversations outside of JSX to avoid IIFE-in-JSX parse issues
  const uniqConversations = (()=>{
    const arr = Array.isArray(conversations) ? [...conversations] : []
    arr.sort((a,b)=>{
      const ta = a.lastMsg && a.lastMsg.createdAt ? new Date(a.lastMsg.createdAt).getTime() : 0
      const tb = b.lastMsg && b.lastMsg.createdAt ? new Date(b.lastMsg.createdAt).getTime() : 0
      return tb - ta
    })
    const seen = new Set()
    const uniq = []
    arr.forEach((c)=>{
      const rawOther = c.otherId || (c.sender && c.sender._id) || (c.receiver && c.receiver._id) || null
      const otherId = rawOther ? String(rawOther) : null
      if(otherId){ if(seen.has(otherId)) return; seen.add(otherId); }
      uniq.push(c)
    })
    return uniq
  })()

  // Decode token once to determine current user id for message ownership checks
  let tokenUserId = null
  try{
    if(token){ const p = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); tokenUserId = p.id || p._id || p.sub }
  }catch(e){ tokenUserId = null }

  // On mount: load users and inbox; refresh inbox periodically
  useEffect(()=>{
    loadUsers(1)
    loadInbox()
    const iv = setInterval(()=>{ try{ loadInbox() }catch(e){} }, 30000)
    return ()=> clearInterval(iv)
  }, [])

  return (
    <div className="messaging-root">
      <div id="conversationsList" className="left-col">
        <div className="card" style={{marginBottom:12}}>
          <div style={{fontWeight:700,marginBottom:8}}>Conversations</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {loadingInbox && <div className="small">Loading…</div>}
            {!loadingInbox && conversations.length===0 && <div className="small">No conversations</div>}
            {uniqConversations.map((c, idx)=>{
              const rawOther = c.otherId || (c.sender && c.sender._id) || (c.receiver && c.receiver._id) || null
              const otherId = rawOther ? String(rawOther) : `conv-${idx}`
              const name = c.otherName || (c.sender && c.sender.name) || otherId
              const preview = c.lastMsg?.content ? (c.lastMsg.content.length>80? c.lastMsg.content.slice(0,80)+'…' : c.lastMsg.content) : ''
              const unread = c.unreadCount || 0
              const active = otherId && activeOtherId && otherId === activeOtherId
              return (
                <div key={`conv-${otherId}-${idx}`} onClick={()=>{ if(DEBUG) console.debug('[Messaging] click conversation', otherId); openConversation(otherId, { manual: true }) }} className={`card ${active? 'active':''}`} style={{cursor:'pointer'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontWeight:700}}>{name}</div>
                      <div style={{fontSize:13,color:'#666'}}>{otherId}</div>
                    </div>
                    {unread ? <div style={{background:'#06a0db',color:'#fff',padding:'6px 8px',borderRadius:999,fontWeight:800}}>{unread}</div> : null}
                  </div>
                  <div style={{fontSize:13,color:'#444',marginTop:8}}>{preview}</div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="card">
          <div style={{fontWeight:700,marginBottom:8}}>Find a user</div>
          <input placeholder="Search name or email" value={userSearch} onChange={e=>setUserSearch(e.target.value)} style={{width:'100%',padding:8,borderRadius:8,marginBottom:8}} />
          {usersLoading && <div className="small">Loading users…</div>}
          {!usersLoading && users.length===0 && <div className="small">No users found</div>}
          {!usersLoading && users.filter(u=>{
            const q = (userSearch||'').toLowerCase().trim()
            if(!q) return true
            return (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q) || (u._id||'').toLowerCase().includes(q)
          }).map(u=> (
            <div key={u._id} onClick={()=>selectUser(u)} className="card" style={{cursor:'pointer',marginBottom:6}}>
              <div style={{fontWeight:700}}>{u.name || u.email || u._id}</div>
              <div className="small" style={{color:'#666'}}>{u.email || u._id}</div>
            </div>
          ))}
          {(usersTotalPages >= 1) && (
            <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:8,marginTop:8}}>
              <button className="ghost" aria-label="Previous page" onClick={()=>{ if(usersPage>1) loadUsers(usersPage-1, false) }} disabled={usersLoading || usersPage<=1}>&larr;</button>
              <div className="small">Page <strong style={{margin:'0 6px'}}>{usersPage}</strong> of <strong>{usersTotalPages}</strong></div>
              <button className="ghost" aria-label="Next page" onClick={()=>{ if(usersPage<usersTotalPages) loadUsers(usersPage+1, false) }} disabled={usersLoading || usersPage>=usersTotalPages}>&rarr;</button>
            </div>
          )}
          {/* legacy larger pagination removed; compact arrows remain above */}
        </div>
      </div>

      <div className="chat-right" style={{flex:1,display:'flex',flexDirection:'column'}}>
        <div className="card" style={{marginBottom:12}}>
          <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
            <div className="msg-side">
              <label htmlFor="msgReceiver" style={{fontWeight:700}}>Receiver</label>
              <div ref={receiverRef} tabIndex={-1} style={{width:'100%',padding:8,borderRadius:8,background:'#fff',border:'1px solid #ddd'}}>
                {(() => {
                  const sel = users.find(u=>String(u._id) === String(receiver))
                  if(sel) return (<div><div style={{fontWeight:700}}>{sel.name}</div><div className="small" style={{color:'#666'}}>{sel.email || sel._id}</div></div>)
                  if(receiver) return (<div className="small" style={{color:'#666'}}>{receiver}</div>)
                  return (<div className="small" style={{color:'#666'}}>No receiver selected — pick from the list on the left</div>)
                })()}
              </div>
              <div id="msgReceiverHint" className="small" style={{marginTop:6,color:'#666'}}>Search users on the left and click one to select.</div>
            </div>
            <div style={{flex:1}}>
              <label htmlFor="msgBody" style={{fontWeight:700}}>Message</label>
              <textarea id="msgBody" value={body} onChange={e=>setBody(e.target.value)} rows={3} style={{width:'100%',padding:8,borderRadius:8}} />
            </div>
            <div className="msg-controls">
              <button id="sendMsgBtn" onClick={sendMessage} style={{marginTop:20}}>Send Message</button>
              <div id="msgStatus" style={{minHeight:18,marginTop:8}} />
            </div>
          </div>
        </div>

        <div id="conversationView" ref={convRef} className="card" style={{flex:1,minHeight:200,maxHeight:'56vh',overflowY:'auto',padding:12,background:'#fff',borderRadius:12,border:'1px solid #eee'}}>
            {convo.map(m=>{
              const senderId = m.sender && (m.sender._id || m.sender)
              const normalizedSenderId = senderId ? (senderId._id ? String(senderId._id) : String(senderId)) : null
              const fromMe = tokenUserId && normalizedSenderId && String(tokenUserId) === normalizedSenderId
            return (
              <div key={m._id} className={`msg ${fromMe? 'success':''}`} style={{marginBottom:10,padding:10,borderRadius:10,background: fromMe? '#ecfff8' : '#f7f9fb',border: '1px solid rgba(0,0,0,0.02)'}}>
                <div style={{fontWeight:700}}>{m.sender?.name || m.sender?.email || (fromMe? 'You' : 'Unknown')}</div>
                <div style={{marginTop:6}}>{m.content}</div>
                <div style={{fontSize:12,color:'#666',marginTop:6}}>{new Date(m.createdAt).toLocaleString()}</div>
              </div>
            )
          })}
        </div>

        <div id="replyRow" className="reply-row" style={{position:'sticky',bottom:0,background:'linear-gradient(180deg,#fff,#f9fbfd)',padding:8,marginTop:8,borderTop:'1px solid rgba(15,45,60,0.03)',borderRadius:8}}>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input id="replyInput" value={body} onChange={e=>setBody(e.target.value)} placeholder="Write a message" style={{flex:1,padding:10,borderRadius:10,border:'1px solid #ddd'}} />
            <button id="sendReplyBtn" onClick={sendReply}>Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}

