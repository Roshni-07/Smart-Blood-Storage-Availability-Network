import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)
const STYLE = {
  ok: { icon: CheckCircle2, color: 'text-ok' },
  crit: { icon: AlertCircle, color: 'text-crit' },
  info: { icon: Info, color: 'text-navy' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((t) => [...t.slice(-3), { id, ...toast }])
    setTimeout(() => dismiss(id), toast.duration ?? 5000)
  }, [dismiss])

  const api = useMemo(() => ({
    success: (title, description) => push({ tone: 'ok', title, description }),
    error: (title, description) => push({ tone: 'crit', title, description, duration: 8000 }),
    info: (title, description) => push({ tone: 'info', title, description }),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[calc(100vw-2.5rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const { icon: Icon, color } = STYLE[t.tone]
          return (
            <div key={t.id} role="status" className="anim-toast pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-pop">
              <Icon size={18} className={`mt-0.5 shrink-0 ${color}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{t.title}</p>
                {t.description && <p className="mt-0.5 break-words text-[13px] leading-5 text-muted">{t.description}</p>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="rounded p-0.5 text-muted hover:text-ink">
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
