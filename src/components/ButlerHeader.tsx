// ¿Por qué un componente ButlerHeader separado?
// El header contiene la "personalidad" de la app — el logo, el saludo del mayordomo,
// y el estado de las notificaciones. Es suficientemente complejo para justificar
// su propio archivo, y al separarlo, el componente App.tsx queda más limpio.

import { motion } from 'framer-motion'
import { Bell, BellOff, Crown } from 'lucide-react'
import { getNotificationPermission, requestNotificationPermission } from '@/services/notifications'
import { useState, useEffect } from 'react'
import { useReminderStore } from '@/stores/useReminderStore'

export function ButlerHeader() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const pending = useReminderStore(state => state.getPending())
  const overdue = useReminderStore(state => state.getOverdue())

  useEffect(() => {
    setPermission(getNotificationPermission())
  }, [])

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
  }

  // El saludo cambia según la hora del día — pequeño detalle que hace la app
  // sentirse "viva" y personalizada, como un mayordomo real.
  const greeting = getTimeGreeting()

  return (
    <header style={styles.header}>
      {/* Línea decorativa superior */}
      <div style={styles.topBorder} />

      <div style={styles.inner}>
        {/* Logo y título */}
        <motion.div
          style={styles.brand}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <div style={styles.logoWrapper}>
            {/* Ícono de corona — símbolo de servicio de élite */}
            <Crown size={18} strokeWidth={1.5} style={{ color: 'var(--color-gold)' }} />
          </div>
          <div>
            <h1 style={styles.title}>Butler</h1>
            <p style={styles.subtitle}>Mayordomo Digital</p>
          </div>
        </motion.div>

        {/* Stats de recordatorios */}
        <motion.div
          style={styles.stats}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {overdue.length > 0 && (
            <div style={{ ...styles.badge, ...styles.badgeDanger }}>
              {overdue.length} vencido{overdue.length !== 1 ? 's' : ''}
            </div>
          )}
          {pending.length > 0 && (
            <div style={{ ...styles.badge, ...styles.badgePending }}>
              {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
            </div>
          )}
        </motion.div>

        {/* Control de notificaciones */}
        <motion.button
          style={{
            ...styles.notifButton,
            ...(permission === 'granted' ? styles.notifGranted : styles.notifDefault)
          }}
          onClick={handleRequestPermission}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={
            permission === 'granted'
              ? 'Notificaciones activas'
              : 'Activar notificaciones'
          }
        >
          {permission === 'granted'
            ? <Bell size={16} strokeWidth={1.5} />
            : <BellOff size={16} strokeWidth={1.5} />
          }
        </motion.button>
      </div>

      {/* Saludo del mayordomo */}
      <motion.div
        style={styles.greeting}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <span style={styles.greetingLabel}>
          {greeting}, estoy a su disposición.
        </span>
      </motion.div>

      {/* Línea decorativa inferior */}
      <div style={styles.bottomBorder} />
    </header>
  )
}

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    backgroundColor: 'rgba(6, 6, 8, 0.85)',
    borderBottom: '1px solid rgba(201, 169, 110, 0.1)',
  },
  topBorder: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(201, 169, 110, 0.4), transparent)',
  },
  inner: {
    maxWidth: '680px',
    margin: '0 auto',
    padding: '16px 20px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
  },
  logoWrapper: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, rgba(201,169,110,0.15), rgba(201,169,110,0.05))',
    border: '1px solid rgba(201,169,110,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--color-cream)',
    letterSpacing: '0.02em',
    lineHeight: 1,
  },
  subtitle: {
    fontSize: '10px',
    fontWeight: 300,
    color: 'var(--color-gold)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    marginTop: '2px',
  },
  stats: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  badge: {
    padding: '3px 10px',
    borderRadius: 'var(--radius-full)',
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.02em',
  },
  badgeDanger: {
    background: 'rgba(192,57,43,0.2)',
    color: '#e74c3c',
    border: '1px solid rgba(192,57,43,0.3)',
  },
  badgePending: {
    background: 'rgba(201,169,110,0.12)',
    color: 'var(--color-gold)',
    border: '1px solid rgba(201,169,110,0.2)',
  },
  notifButton: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: '1px solid var(--color-slate)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--transition-fast)',
    flexShrink: 0,
  },
  notifGranted: {
    background: 'rgba(201,169,110,0.1)',
    border: '1px solid rgba(201,169,110,0.3)',
    color: 'var(--color-gold)',
  },
  notifDefault: {
    background: 'var(--color-obsidian)',
    color: 'var(--color-stone)',
  },
  greeting: {
    maxWidth: '680px',
    margin: '0 auto',
    padding: '0 20px 12px',
  },
  greetingLabel: {
    fontSize: '12px',
    color: 'var(--color-stone)',
    fontStyle: 'italic',
    fontFamily: 'var(--font-display)',
  },
  bottomBorder: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(201, 169, 110, 0.08), transparent)',
  },
}
