import { useEffect } from 'react'
import { useToastStore } from '../../store/toast.store'
import { cn } from '../../lib/utils'

/* `.toast` / `.toast.bad` are the platform's notification styles
   (index.html:139-141). The original showed one at a time; the stack keeps
   that look while allowing a burst not to swallow earlier messages. */
export function ToastHost() {
  const { messages, dismiss } = useToastStore()

  useEffect(() => {
    const timers = messages.map((m) => setTimeout(() => dismiss(m.id), 4000))
    return () => timers.forEach(clearTimeout)
  }, [messages, dismiss])

  if (messages.length === 0) return null

  return (
    <div className="toast-stack">
      {messages.map((m) => (
        <div key={m.id} className={cn('toast', m.isError && 'bad')}>{m.text}</div>
      ))}
    </div>
  )
}
