// NotificationBanner — se muestra SOLO si el usuario no ha concedido permiso aún.
// ¿Por qué no pedimos el permiso automáticamente al cargar la app?
// Los browsers bloquean Notification.requestPermission() si no viene de un
// gesto del usuario (click). Además, pedir permisos sin contexto es una dark pattern —
// el usuario no sabe por qué se los estás pidiendo y tiende a rechazar.
// Esta baner aparece después de que el usuario ya creó un recordatorio,
// cuando el propósito es obvio ("necesito notificarte cuando llegue la hora").

import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getNotificationPermission, requestNotificationPermission } from '@/services/notifications'

export function NotificationBanner() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setPermission(getNotificationPermission())
    // Recordar si ya fue dismissed en esta sesión
    const wasDismissed = sessionStorage.getItem('notif-banner-dismissed') === 'true'
    setDismissed(wasDismissed)
  }, [])

  const handleActivate = async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
  }

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('notif-banner-dismissed', 'true')
  }

  const shouldShow = !dismissed && permission === 'default'

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          style={styles.banner}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div style={styles.inner}>
            <div style={styles.iconWrapper}>
              <Bell size={14} strokeWidth={1.5} style={{ color: 'var(--color-gold)' }} />
            </div>
            <p style={styles.text}>
              Active las notificaciones para que pueda avisarle en el momento preciso.
            </p>
            <button style={styles.activateBtn} onClick={handleActivate}>
              Activar
            </button>
            <button style={styles.dismissBtn} onClick={handleDismiss}>
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    background: 'rgba(201,169,110,0.06)',
    borderBottom: '1px solid rgba(201,169,110,0.15)',
    overflow: 'hidden',
  },
  inner: {
    maxWidth: '680px',
    margin: '0 auto',
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconWrapper: {
    flexShrink: 0,
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'rgba(201,169,110,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontSize: '12px',
    color: 'var(--color-stone)',
    lineHeight: 1.5,
  },
  activateBtn: {
    padding: '5px 14px',
    borderRadius: 'var(--radius-full)',
    background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-deep))',
    color: '#0a0a0a',
    fontSize: '12px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    letterSpacing: '0.02em',
    flexShrink: 0,
  },
  dismissBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    background: 'transparent',
    border: 'none',
    color: 'var(--color-ash)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
}
