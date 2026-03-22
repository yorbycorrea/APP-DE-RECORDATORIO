// App.tsx — El componente raíz. Orquesta la inicialización y el layout general.
// ¿Por qué tan pequeño?
// Buen diseño de componentes significa que App.tsx no contiene lógica de negocio,
// solo composición. Si App.tsx tiene más de ~80 líneas, es señal de que algo
// debería estar en un componente hijo.

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ButlerHeader } from '@/components/ButlerHeader'
import { CommandInput } from '@/components/CommandInput'
import { ReminderList } from '@/components/ReminderList'
import { NotificationBanner } from '@/components/NotificationBanner'
import { AuthPage } from '@/components/AuthPage'
import { useReminderStore } from '@/stores/useReminderStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { registerServiceWorker, startHeartbeat } from '@/services/notifications'

// ¿Por qué importamos navigator.serviceWorker aquí y no en un hook separado?
// La inicialización del SW es un efecto de "setup" que ocurre UNA sola vez
// al montar la app. No tiene estado que necesite compartirse entre componentes.
// Un hook lo haría más complejo sin beneficio real.

export function App() {
  const loadReminders = useReminderStore(state => state.loadReminders)
  const { user, isLoading: authLoading, initialize } = useAuthStore()

  // Inicializar auth al montar: recupera sesión guardada en localStorage
  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    // Inicialización en paralelo — no bloqueamos el render por ninguna de estas
    const init = async () => {
      // 1. Cargar recordatorios de IndexedDB → actualiza el store → re-render con datos
      await loadReminders()

      // 2. Registrar el Service Worker (asíncrono, no bloquea nada)
      await registerServiceWorker()

      // 3. Iniciar heartbeat para mantener el SW vivo (solo si el browser lo soporta)
      startHeartbeat()
    }

    init()

    // Escuchar mensajes del Service Worker (cuando el usuario hace click en una notificación)
    const handleSWMessage = (event: MessageEvent) => {
      const store = useReminderStore.getState()
      if (event.data.type === 'MARK_DONE') {
        store.markDone(event.data.reminderId)
      }
      if (event.data.type === 'MARK_DISMISSED') {
        store.markDismissed(event.data.reminderId)
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage)
    }

    // Cleanup: remover el listener cuando App desmonta (aunque en práctica nunca desmonta)
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage)
      }
    }
  }, [loadReminders])

  // Pantalla de carga mientras Supabase verifica la sesión guardada.
  // ¿Por qué no mostrar directamente la AuthPage?
  // Supabase tarda ~200ms en leer localStorage y verificar el token.
  // Sin este estado de carga, el usuario logueado vería el login brevemente
  // antes de ser redirigido a la app — un flash desagradable (FOUC de auth).
  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ fontSize: '13px', color: 'var(--color-stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic', letterSpacing: '0.08em' }}
        >
          Un momento...
        </motion.div>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {!user ? (
        // No autenticado → mostrar AuthPage
        <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <AuthPage />
        </motion.div>
      ) : (
        // Autenticado → mostrar la app completa
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}
        >
          <ButlerHeader />
          <NotificationBanner />

          <main style={{ flex: 1 }}>
            <CommandInput />

            <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 20px' }}>
              <div style={{
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.15), transparent)',
                marginBottom: '24px',
              }} />
            </div>

            <ReminderList />
          </main>

          <footer style={footerStyle}>
            <span>Butler · Tu Mayordomo Digital</span>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const footerStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '20px',
  fontSize: '11px',
  color: 'var(--color-ash)',
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
  letterSpacing: '0.05em',
  borderTop: '1px solid var(--color-slate)',
}
