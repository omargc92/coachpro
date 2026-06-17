import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/auth.jsx'
import { ErrorBoundary } from './lib/ErrorBoundary.jsx'
import App from './App.jsx'

// Confirma la PRESENCIA (no el valor) de las env vars de Supabase al arrancar.
console.log(
  '[CoachPro] arranque · supabase env ok:',
  !!import.meta.env.VITE_SUPABASE_URL,
  !!import.meta.env.VITE_SUPABASE_ANON_KEY
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 }
  }
})

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
