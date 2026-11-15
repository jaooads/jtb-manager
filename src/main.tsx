import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { App } from './app/App'
import { AuthProvider } from './features/auth/AuthProvider'
import { PwaUpdatePrompt } from './components/shared/PwaUpdatePrompt'
import { OfflineBanner } from './components/shared/OfflineBanner'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthProvider>
          <App />
          <OfflineBanner />
          <PwaUpdatePrompt />
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  </StrictMode>,
)
