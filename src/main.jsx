import React from 'react'
import { createRoot } from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { get, set, del } from 'idb-keyval'
import { queryClient } from './lib/queryClient.js'
import { AuthProvider } from './lib/auth.jsx'
import { ErrorBoundary } from './lib/ErrorBoundary.jsx'
import { ReloadPrompt } from './lib/pwa.jsx'
import App from './App.jsx'

// Confirma la PRESENCIA (no el valor) de las env vars de Supabase al arrancar.
console.log(
  '[CoachPro] arranque · supabase env ok:',
  !!import.meta.env.VITE_SUPABASE_URL,
  !!import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Persistencia en IndexedDB: sobrevive cierres de app y guarda las
// mutaciones pausadas (registros de avance hechos sin conexión).
const persister = createAsyncStoragePersister({
  storage: { getItem: get, setItem: set, removeItem: del },
  key: 'coachpro-rq'
})

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
        onSuccess={() => {
          // Al restaurar tras recargar, reintenta lo que quedó en la cola offline.
          queryClient.resumePausedMutations()
        }}
      >
        <AuthProvider>
          <App />
        </AuthProvider>
      </PersistQueryClientProvider>
      <ReloadPrompt />
    </ErrorBoundary>
  </React.StrictMode>
)
