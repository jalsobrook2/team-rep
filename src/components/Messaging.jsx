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
  const [body, setBody] = useState('')
  const [convo, setConvo] = useState([])
  const [conversations, setConversations] = useState([])
  const [loadingInbox, setLoadingInbox] = useState(false)
  const [activeOtherId, setActiveOtherId] = useState(null)
  const convRef = useRef(null)
  const lastRequestedRef = useRef(null)

  useEffect(()=>{
    function onMessageTo(e){
      const id = e?.detail?.id
      if(id){
        if(DEBUG) console.debug('[Messaging] message-to event, id=', id)
        setReceiver(id)
        // open the conversation if id looks like an ObjectId (user action -> manual)
        if(isValidObjectId(id)) openConversation(id, { manual: true })
      }
    }
    window.addEventListener('message-to', onMessageTo)
    // initial load
    if(DEBUG) console.debug('[Messaging] initial loadInbox()')
    loadInbox()
    return ()=> window.removeEventListener('message-to', onMessageTo)
  },[])

  // load conversations (inbox) and preserve activeOtherId if set
  async function loadInbox(){
    setLoadingInbox(true)
    try{
      if(DEBUG) console.debug('[Messaging] loadInbox start')
      const res = await authFetch('/api/messages/conversations')
      const data = await res.json()
      if(res.ok && data.success){
        // Normalize otherId to string so click handlers and openConversation receive a string id
        const convs = (data.data || []).map(c => ({ ...c, otherId: c.otherId ? String(c.otherId) : c.otherId }))
        if(DEBUG) console.debug('[Messaging] loadInbox got conversations:', convs.map(x=>x.otherId))
        setConversations(convs)
        // if we have an active conversation, keep it selected and refresh its messages
        if(activeOtherId){
          // try to keep currently open convo messages intact and re-fetch in background
          if(DEBUG) console.debug('[Messaging] loadInbox will refresh activeOtherId=', activeOtherId)
          // background refresh should not override a user's manual selection
          openConversation(activeOtherId, { markRead:false, manual: false })
        }
      } else {
        console.warn('Failed to load inbox', data)
        setConversations([])
      }
    }catch(e){ console.error('loadInbox', e); setConversations([]) }
    setLoadingInbox(false)
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

  return (
    <div style={{display:'flex',gap:12}}>
      <div id="conversationsList" className="left-col">
        <div className="card" style={{marginBottom:12}}>
          <div style={{fontWeight:700,marginBottom:8}}>Conversations</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {loadingInbox && <div className="small">Loading…</div>}
            {!loadingInbox && conversations.length===0 && <div className="small">No conversations</div>}
            {conversations.map((c, idx)=>{
              // ensure we always have a stable string id to use as key and comparison
              const rawOther = c.otherId || (c.sender && c.sender._id) || (c.receiver && c.receiver._id) || null
              const otherId = rawOther ? String(rawOther) : `conv-${idx}`
              const name = c.otherName || (c.sender && c.sender.name) || otherId
              const preview = c.lastMsg?.content ? (c.lastMsg.content.length>80? c.lastMsg.content.slice(0,80)+'…' : c.lastMsg.content) : ''
              const unread = c.unreadCount || 0
              const active = otherId && activeOtherId && otherId === activeOtherId
              return (
                <div key={otherId} onClick={()=>{ if(DEBUG) console.debug('[Messaging] click conversation', otherId); openConversation(otherId, { manual: true }) }} className={`card ${active? 'active':''}`} style={{cursor:'pointer'}}>
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
      </div>

      <div className="chat-right" style={{flex:1,display:'flex',flexDirection:'column'}}>
        <div className="card" style={{marginBottom:12}}>
          <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
            <div style={{flex:'0 0 220px'}}>
              <label htmlFor="msgReceiver" style={{fontWeight:700}}>Receiver ID</label>
              <input id="msgReceiver" value={receiver} onChange={e=>setReceiver(e.target.value)} style={{width:'100%',padding:8,borderRadius:8}} placeholder="Worker id (optional)" aria-label="Receiver id" />
              <div id="msgReceiverHint" className="small" style={{marginTop:6,color:'#666'}}>Paste a 24-char worker id to message directly.</div>
            </div>
            <div style={{flex:1}}>
              <label htmlFor="msgBody" style={{fontWeight:700}}>Message</label>
              <textarea id="msgBody" value={body} onChange={e=>setBody(e.target.value)} rows={3} style={{width:'100%',padding:8,borderRadius:8}} />
            </div>
            <div style={{flex:'0 0 120px',display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
              <button id="sendMsgBtn" onClick={sendMessage} style={{marginTop:20}}>Send Message</button>
              <div id="msgStatus" style={{minHeight:18,marginTop:8}} />
            </div>
          </div>
        </div>

        <div id="conversationView" ref={convRef} className="card" style={{flex:1,minHeight:200,maxHeight:'56vh',overflowY:'auto',padding:12,background:'#fff',borderRadius:12,border:'1px solid #eee'}}>
          {convo.map(m=>{
              const senderId = m.sender && (m.sender._id || m.sender)
              const fromMe = senderId && token && (()=>{ try{ const p = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); return (p.id||p._id||p.sub) === senderId || (p.id||p._id||p.sub) === (senderId._id?senderId._id:senderId) }catch(e){return false} })()
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
