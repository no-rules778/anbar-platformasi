import { useEffect } from 'react'
import { touchSession } from '../api/session.api'
import { signOut } from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'
import { useToastStore } from '../store/toast.store'

const HEARTBEAT_MS = 60 * 1000

export function useHeartbeat(enabled: boolean) {
  const reset = useAuthStore((s) => s.reset)
  const show = useToastStore((s) => s.show)

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(async () => {
      const res = await touchSession()
      if (res && res.alive === false) {
        clearInterval(id)
        show('Bu sessiya başqa cihazdan bağlanıb. Yenidən daxil olun.', true)
        setTimeout(async () => {
          await signOut()
          reset()
        }, 1500)
      }
    }, HEARTBEAT_MS)
    return () => clearInterval(id)
  }, [enabled, reset, show])
}
