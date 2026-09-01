import { useEffect } from 'react'
import { useToastStore } from '../../store/toast.store'
import { cn } from '../../lib/utils'

export function ToastHost() {
  const { messages, dismiss } = useToastStore()

  useEffect(() => {
    const timers = messages.map((m) => setTimeout(() => dismiss(m.id), 4000))
    return () => timers.forEach(clearTimeout)
  }, [messages, dismiss])

  if (messages.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {messages.map((m) => (
        <div
          key={m.id}
          className={cn(
            'rounded-md px-4 py-2 text-sm text-white shadow-lg',
            m.isError ? 'bg-red-600' : 'bg-slate-900',
          )}
        >
          {m.text}
        </div>
      ))}
    </div>
  )
}
