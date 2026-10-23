import { useEffect, useRef, type ReactNode } from 'react'

/** Modal that is a bottom sheet on phones and a centred dialog on wider screens. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onCancel={onClose}>
      <div className="stack">
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="✕" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
