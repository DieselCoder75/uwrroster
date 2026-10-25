import { useEffect, useState } from 'react'

/** Whether the browser thinks it has a network connection. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

/**
 * Waits for a Firestore write while online. Offline, the write is already kept on the device and is sent
 * when the connection returns, so there is no need to keep a dialog open waiting for it.
 */
export function whenSaved(write: Promise<unknown>): Promise<void> {
  if (navigator.onLine) return write.then(() => undefined)
  write.catch((e: unknown) => console.error('Saving failed after reconnecting', e))
  return Promise.resolve()
}
