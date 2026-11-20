import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const panel = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // move focus into the dialog
    panel.current?.querySelector('input:not([type=hidden]), select, textarea')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  const width = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg'
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div className="anim-fade fixed inset-0 bg-navy/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={`anim-modal relative my-8 w-full ${width} rounded-2xl border border-line bg-surface shadow-pop`}>
        <header className="flex items-start justify-between gap-4 px-6 pb-0 pt-6">
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm leading-5 text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1.5 -mt-1 rounded-lg p-1.5 text-muted transition-colors hover:bg-navy/[0.06] hover:text-ink">
            <X size={18} />
          </button>
        </header>
        <div className="px-6 py-5">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</footer>}
      </div>
    </div>
  )
}
