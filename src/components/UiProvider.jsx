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
        <div className="toast-container" aria-live="polite">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type||'info'}`}>
              {t.message}
            </div>
          ))}
        </div>

        {/* Confirm modal overlay */}
        {confirmState && (
          <div className="confirm-modal" role="dialog" aria-modal="true">
            <div className="confirm-overlay" onClick={() => handleConfirm(false)} />
            <div className="confirm-dialog">
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
