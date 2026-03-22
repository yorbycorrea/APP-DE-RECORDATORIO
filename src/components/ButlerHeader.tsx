import { motion } from 'framer-motion'
import { Bell, BellOff, Crown, LogOut } from 'lucide-react'
import { getNotificationPermission, requestNotificationPermission } from '@/services/notifications'
import { useState, useEffect } from 'react'
import { useReminderStore } from '@/stores/useReminderStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { User } from '@supabase/supabase-js'

// Extrae el nombre a mostrar del objeto User de Supabase.
// El campo varía según el proveedor de auth:
// - Google OAuth  → user_metadata.full_name
// - GitHub OAuth  → user_metadata.full_name o user_metadata.user_name
// - Email/password → no hay nombre, usamos la parte antes del @
function getDisplayName(user: User): { full: string; first: string } {
  const meta = user.user_metadata
  const full =
    meta?.full_name ||
    meta?.name ||
    meta?.user_name ||
    user.email?.split('@')[0] ||
    'Usuario'
  const first = full.split(' ')[0]
  return { full, first }
}

// Obtiene la URL del avatar si el usuario inició con OAuth (Google/GitHub).
// Si no hay avatar, retorna null y mostramos las iniciales.
function getAvatarUrl(user: User): string | null {
  return user.user_metadata?.avatar_url || user.user_metadata?.picture || null
}

// Genera las iniciales del nombre para el avatar fallback.
function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

export function ButlerHeader() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const pending = useReminderStore(state => state.getPending())
  const overdue  = useReminderStore(state => state.getOverdue())
  const { user, signOut } = useAuthStore()
  const isMobile = useIsMobile()

  useEffect(() => {
    setPermission(getNotificationPermission())
  }, [])

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
  }

  const greeting    = getTimeGreeting()
  const displayName = user ? getDisplayName(user) : null
  const avatarUrl   = user ? getAvatarUrl(user) : null
  const initials    = displayName ? getInitials(displayName.full) : '?'

  return (
    <header style={styles.header}>
      <div style={styles.topBorder} />

      {/* ── Fila principal ── */}
      <div style={{ ...styles.inner, padding: isMobile ? '10px 16px 8px' : '14px 20px 10px' }}>

        {/* Logo Butler */}
        <motion.div
          style={styles.brand}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div style={styles.logoWrapper}>
            <Crown size={16} strokeWidth={1.5} style={{ color: 'var(--color-gold)' }} />
          </div>
          <div>
            <h1 style={{ ...styles.title, fontSize: isMobile ? '17px' : '19px' }}>Butler</h1>
            {!isMobile && <p style={styles.subtitle}>Mayordomo Digital</p>}
          </div>
        </motion.div>

        {/* Stats badges — solo desktop */}
        {!isMobile && (
          <motion.div style={styles.stats} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
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
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Notificaciones */}
        <motion.button
          style={{ ...styles.iconBtn, ...(permission === 'granted' ? styles.notifGranted : styles.notifDefault) }}
          onClick={handleRequestPermission}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={permission === 'granted' ? 'Notificaciones activas' : 'Activar notificaciones'}
        >
          {permission === 'granted'
            ? <Bell size={15} strokeWidth={1.5} />
            : <BellOff size={15} strokeWidth={1.5} />
          }
        </motion.button>

        {/* Logout */}
        {user && (
          <motion.button
            style={styles.iconBtn}
            onClick={signOut}
            whileHover={{ scale: 1.05, borderColor: 'rgba(192,57,43,0.4)', color: '#e74c3c' }}
            whileTap={{ scale: 0.95 }}
            title="Cerrar sesión"
          >
            <LogOut size={15} strokeWidth={1.5} />
          </motion.button>
        )}
      </div>

      {/* ── Sección de bienvenida al usuario ── */}
      {user && displayName && (
        <motion.div
          style={{ ...styles.userSection, padding: isMobile ? '0 16px 14px' : '0 20px 16px' }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          {/* Avatar */}
          <div style={styles.avatarWrapper}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName.full}
                style={styles.avatarImg}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div style={styles.avatarInitials}>
                {initials}
              </div>
            )}
            {/* Indicador de sesión activa */}
            <div style={styles.onlineDot} />
          </div>

          {/* Texto de bienvenida */}
          <div style={styles.userInfo}>
            <div style={styles.greetingRow}>
              <span style={styles.greetingWord}>{greeting}, </span>
              <span style={styles.userName}>{displayName.first}</span>
              <span style={styles.greetingPunct}>.</span>
            </div>
            <p style={styles.greetingSub}>
              {isMobile
                ? pending.length > 0
                  ? `${pending.length} recordatorio${pending.length !== 1 ? 's' : ''} pendiente${pending.length !== 1 ? 's' : ''}`
                  : 'Su agenda está despejada'
                : 'Estoy a su disposición para servirle.'
              }
            </p>
          </div>
        </motion.div>
      )}

      <div style={styles.bottomBorder} />
    </header>
  )
}

function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    backgroundColor: 'rgba(6, 6, 8, 0.88)',
    borderBottom: '1px solid rgba(201, 169, 110, 0.1)',
  },
  topBorder: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.5), transparent)',
  },
  inner: {
    maxWidth: '680px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    flexShrink: 0,
  },
  logoWrapper: {
    width: '32px',
    height: '32px',
    borderRadius: '9px',
    background: 'linear-gradient(135deg, rgba(201,169,110,0.18), rgba(201,169,110,0.05))',
    border: '1px solid rgba(201,169,110,0.28)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    color: 'var(--color-cream)',
    letterSpacing: '0.02em',
    lineHeight: 1,
  },
  subtitle: {
    fontSize: '9px',
    fontWeight: 300,
    color: 'var(--color-gold)',
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    marginTop: '2px',
  },
  stats: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    marginLeft: '4px',
  },
  badge: {
    padding: '3px 10px',
    borderRadius: 'var(--radius-full)',
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.02em',
  },
  badgeDanger: {
    background: 'rgba(192,57,43,0.18)',
    color: '#e74c3c',
    border: '1px solid rgba(192,57,43,0.3)',
  },
  badgePending: {
    background: 'rgba(201,169,110,0.1)',
    color: 'var(--color-gold)',
    border: '1px solid rgba(201,169,110,0.2)',
  },
  iconBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '9px',
    border: '1px solid var(--color-slate)',
    background: 'var(--color-obsidian)',
    color: 'var(--color-stone)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    flexShrink: 0,
  },
  notifGranted: {
    background: 'rgba(201,169,110,0.08)',
    borderColor: 'rgba(201,169,110,0.3)',
    color: 'var(--color-gold)',
  },
  notifDefault: {},

  // ── User section ──────────────────────────────────────────────
  userSection: {
    maxWidth: '680px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatarWrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  avatarImg: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    border: '2px solid rgba(201,169,110,0.35)',
    display: 'block',
  },
  avatarInitials: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(201,169,110,0.25), rgba(201,169,110,0.08))',
    border: '2px solid rgba(201,169,110,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-gold)',
    fontFamily: 'var(--font-display)',
    letterSpacing: '0.05em',
  },
  onlineDot: {
    position: 'absolute',
    bottom: '1px',
    right: '1px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#2ecc71',
    border: '2px solid rgba(6,6,8,0.9)',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    minWidth: 0,
  },
  greetingRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0px',
    flexWrap: 'wrap' as const,
  },
  greetingWord: {
    fontSize: '14px',
    color: 'var(--color-stone)',
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
  },
  userName: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-cream)',
    fontFamily: 'var(--font-display)',
    letterSpacing: '0.01em',
    marginLeft: '4px',
  },
  greetingPunct: {
    fontSize: '16px',
    color: 'var(--color-gold)',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
  },
  greetingSub: {
    fontSize: '11px',
    color: 'var(--color-ash)',
    fontWeight: 300,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  bottomBorder: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.08), transparent)',
  },
}
