import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function OfflineBanner() {
  const online = useOnlineStatus()

  if (online) return null
  return <div role="status" className="fixed inset-x-0 top-0 z-[60] flex min-h-10 items-center justify-center gap-2 bg-raised px-4 py-2 text-center text-xs text-gold-soft shadow-lg"><WifiOff className="size-4 shrink-0" />Você está offline. Consultas e alterações ficam indisponíveis até a conexão voltar.</div>
}
