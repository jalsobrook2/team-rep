import React, { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)
const ConfirmContext = createContext(null)

export function UiProvider({ children }){
  const [toasts, setToasts] = useState([])
  const idRef = useRef(1)

  const addToast = useCallback((message, type='info', timeout=3600) => {
    const id = idRef.current++
    setToasts(t => [...t, { id, message, type }])
    setTimeout(()=> setToasts(t => t.filter(x => x.id !== id)), timeout)
    return id
  }, [])

  const removeToast = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), [])

  // simple confirm implementation using a single active modal
  const [confirmState, setConfirmState] = useState(null)
  const openConfirm = useCallback((message, title) => {
    return new Promise(resolve => {
      setConfirmState({ message, title, resolve })
    })
  }, [])

  const handleConfirm = useCallback((ok) => {
    if(confirmState && typeof confirmState.resolve === 'function') confirmState.resolve(ok)
    setConfirmState(null)
  }, [confirmState])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      <ConfirmContext.Provider value={{ openConfirm }}>
        {children}

        {/* Toast container (top-right) */}
        <div id="toast-container" aria-live="polite" style={{ position:'fixed', right:16, top:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type||'info'}`} style={{ padding:'10px 12px', borderRadius:10, boxShadow:'0 8px 20px rgba(12,30,40,0.12)', maxWidth:360, fontWeight:700 }}>
              {t.message}
            </div>
          ))}
        </div>

        {/* Confirm modal overlay */}
        {confirmState && (
          <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10000 }}>
            <div style={{ position:'absolute', inset:0, background:'rgba(2,8,12,0.35)' }} onClick={() => handleConfirm(false)} />
            <div style={{ background:'#fff', borderRadius:12, padding:20, maxWidth:520, width:'90%', boxShadow:'0 20px 60px rgba(2,8,12,0.24)', zIndex:10001 }}>
              {confirmState.title ? <h3 style={{marginTop:0}}>{confirmState.title}</h3> : null}
              <div style={{marginTop:8, marginBottom:18}}>{confirmState.message}</div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button className="ghost" onClick={() => handleConfirm(false)}>Cancel</button>
                <button onClick={() => handleConfirm(true)}>Confirm</button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  )
}

export function useToast(){
  const ctx = useContext(ToastContext)
  if(!ctx) throw new Error('useToast must be used within UiProvider')
  return ctx.addToast
}

export function useConfirm(){
  const ctx = useContext(ConfirmContext)
  if(!ctx) throw new Error('useConfirm must be used within UiProvider')
  return ctx.openConfirm
}

export default UiProvider
