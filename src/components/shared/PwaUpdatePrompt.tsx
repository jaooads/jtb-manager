import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return <div role="status" className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-gold/30 bg-raised p-4 shadow-2xl lg:bottom-6"><p className="text-sm font-semibold">Uma nova versão está disponível.</p><div className="mt-3 flex gap-2"><button onClick={() => updateServiceWorker(true)} className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-ink">Atualizar</button><button onClick={() => setNeedRefresh(false)} className="rounded-lg px-4 py-2 text-sm text-muted">Depois</button></div></div>
}
