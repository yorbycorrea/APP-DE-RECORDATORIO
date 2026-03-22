// ReminderCard — La pieza central de la UI.
// Cada recordatorio es una "tarjeta" con información jerárquica clara:
// 1. Título (lo más importante)
// 2. Fecha/hora y tiempo relativo
// 3. Prioridad (señal visual de color)
// 4. Acciones (completar, descartar, eliminar)
//
// ¿Por qué jerarquía visual y no toda la info al mismo nivel?
// La cognición humana procesa información mejor cuando hay una jerarquía
// clara. Si todo tiene el mismo peso visual, el cerebro tarda más en extraer
// lo importante. El diseño guía los ojos: título → fecha → acción.

import { motion } from 'framer-motion'
import { Check, X, Trash2, Clock, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { useReminderStore } from '@/stores/useReminderStore'
import { formatDateTime, formatRelativeTime } from '@/utils/parseDate'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { Reminder } from '@/types/reminder'

interface Props {
  reminder: Reminder
  // index se usa para escalonar las animaciones de entrada
  // (el primer card aparece antes que el segundo, etc.)
  index: number
}

export function ReminderCard({ reminder, index }: Props) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { markDone, markDismissed, deleteReminder } = useReminderStore()
  const isMobile = useIsMobile()
  // En móvil los botones son siempre visibles (no hay hover) y más grandes
  const btnSize = isMobile ? 36 : 28

  const isOverdue = reminder.status === 'pending' && reminder.datetime < Date.now()
  const isDone = reminder.status === 'done'
  const isDismissed = reminder.status === 'dismissed'
  const isCompleted = isDone || isDismissed

  const handleDelete = async () => {
    setIsDeleting(true)
    // Pequeño delay para que la animación de salida se vea completa
    setTimeout(() => deleteReminder(reminder.id), 300)
  }

  const priorityConfig = PRIORITY_CONFIG[reminder.priority]

  return (
    // AnimatePresence en el padre (ReminderList) maneja la animación de salida.
    // Aquí manejamos la de entrada y el hover state.
    <motion.div
      layout                          // Anima el reordenamiento cuando cambia la lista
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{
        opacity: isDeleting ? 0 : 1,
        y: isDeleting ? -10 : 0,
        scale: isDeleting ? 0.95 : 1
      }}
      exit={{ opacity: 0, x: -20, scale: 0.96 }}
      transition={{
        duration: 0.35,
        delay: index * 0.05,           // Stagger: cada card aparece 50ms después del anterior
        ease: [0.4, 0, 0.2, 1]
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        ...styles.card,
        ...(isCompleted ? styles.cardCompleted : {}),
        ...(isOverdue && !isCompleted ? styles.cardOverdue : {}),
        ...(isHovered && !isCompleted ? styles.cardHovered : {}),
      }}
    >
      {/* Acento de prioridad — línea vertical de color a la izquierda */}
      <div
        style={{
          ...styles.priorityAccent,
          background: isCompleted ? 'var(--color-mist)' : priorityConfig.color,
          opacity: isCompleted ? 0.3 : 1,
        }}
      />

      {/* Contenido principal */}
      <div style={styles.content}>
        {/* Fila superior: título + indicador de vencido */}
        <div style={styles.titleRow}>
          {isOverdue && !isCompleted && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AlertTriangle
                size={13}
                style={{ color: '#e74c3c', flexShrink: 0, marginTop: '2px' }}
                strokeWidth={2}
              />
            </motion.div>
          )}
          <h3 style={{
            ...styles.title,
            ...(isCompleted ? styles.titleCompleted : {}),
            ...(isOverdue && !isCompleted ? styles.titleOverdue : {})
          }}>
            {reminder.title}
          </h3>
        </div>

        {/* Fila inferior: fecha + tiempo relativo */}
        <div style={styles.metaRow}>
          <Clock size={11} strokeWidth={1.5} style={{ color: 'var(--color-ash)', flexShrink: 0 }} />
          <span style={styles.datetime}>{formatDateTime(reminder.datetime)}</span>
          <span style={styles.separator}>·</span>
          <span style={{
            ...styles.relative,
            color: isOverdue && !isCompleted ? '#e74c3c' : 'var(--color-ash)'
          }}>
            {formatRelativeTime(reminder.datetime)}
          </span>
          {/* Badge de prioridad solo si es alta */}
          {reminder.priority === 'high' && !isCompleted && (
            <span style={styles.highPriorityBadge}>urgente</span>
          )}
        </div>

        {/* Notas opcionales */}
        {reminder.notes && (
          <p style={styles.notes}>{reminder.notes}</p>
        )}
      </div>

      {/* Acciones — visibles siempre en mobile, en hover en desktop */}
      <motion.div
        style={styles.actions}
        animate={{ opacity: isMobile || isHovered || isCompleted ? 1 : 0.3 }}
        transition={{ duration: 0.15 }}
      >
        {!isCompleted ? (
          <>
            <motion.button
              style={{ ...styles.actionBtn, ...styles.actionDone, width: btnSize, height: btnSize }}
              onClick={() => markDone(reminder.id)}
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(30,132,73,0.3)' }}
              whileTap={{ scale: 0.9 }}
              title="Marcar como completado"
            >
              <Check size={isMobile ? 15 : 13} strokeWidth={2.5} />
            </motion.button>

            <motion.button
              style={{ ...styles.actionBtn, ...styles.actionDismiss, width: btnSize, height: btnSize }}
              onClick={() => markDismissed(reminder.id)}
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(201,169,110,0.2)' }}
              whileTap={{ scale: 0.9 }}
              title="Descartar"
            >
              <X size={isMobile ? 15 : 13} strokeWidth={2.5} />
            </motion.button>
          </>
        ) : (
          /* Badge de estado */
          <span style={{
            ...styles.statusBadge,
            ...(isDone ? styles.statusDone : styles.statusDismissed)
          }}>
            {isDone ? 'Listo' : 'Descartado'}
          </span>
        )}

        <motion.button
          style={{ ...styles.actionBtn, ...styles.actionDelete, width: btnSize, height: btnSize }}
          onClick={handleDelete}
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(192,57,43,0.2)' }}
          whileTap={{ scale: 0.9 }}
          title="Eliminar"
        >
          <Trash2 size={12} strokeWidth={2} />
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

const PRIORITY_CONFIG = {
  low:    { color: '#2ecc71', label: 'Baja' },
  medium: { color: 'var(--color-gold)', label: 'Media' },
  high:   { color: '#e74c3c', label: 'Alta' },
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    alignItems: 'stretch',
    gap: '14px',
    background: 'var(--color-obsidian)',
    border: '1px solid var(--color-slate)',
    borderRadius: 'var(--radius-lg)',
    padding: '0',
    overflow: 'hidden',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
  },
  cardHovered: {
    borderColor: 'rgba(201,169,110,0.25)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,169,110,0.1)',
  },
  cardCompleted: {
    opacity: 0.55,
    borderColor: 'var(--color-slate)',
  },
  cardOverdue: {
    borderColor: 'rgba(192,57,43,0.3)',
    boxShadow: '0 0 0 1px rgba(192,57,43,0.1)',
  },
  priorityAccent: {
    width: '3px',
    flexShrink: 0,
    borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)',
    minHeight: '60px',
  },
  content: {
    flex: 1,
    padding: '14px 4px 14px 0',
    minWidth: 0,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 400,
    color: 'var(--color-cream)',
    fontFamily: 'var(--font-body)',
    lineHeight: 1.4,
    margin: 0,
  },
  titleCompleted: {
    textDecoration: 'line-through',
    color: 'var(--color-ash)',
  },
  titleOverdue: {
    color: '#f0c0bc',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginTop: '5px',
    flexWrap: 'wrap',
  },
  datetime: {
    fontSize: '11px',
    color: 'var(--color-stone)',
    fontWeight: 300,
  },
  separator: {
    color: 'var(--color-ash)',
    fontSize: '11px',
  },
  relative: {
    fontSize: '11px',
    fontWeight: 400,
  },
  highPriorityBadge: {
    fontSize: '9px',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    background: 'rgba(192,57,43,0.15)',
    color: '#e74c3c',
    padding: '1px 6px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid rgba(192,57,43,0.3)',
  },
  notes: {
    fontSize: '12px',
    color: 'var(--color-stone)',
    marginTop: '6px',
    fontStyle: 'italic',
    lineHeight: 1.4,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '10px 12px 10px 0',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  actionBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    border: '1px solid var(--color-slate)',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  actionDone:    { color: '#2ecc71', borderColor: 'rgba(30,132,73,0.3)' },
  actionDismiss: { color: 'var(--color-gold)', borderColor: 'rgba(201,169,110,0.3)' },
  actionDelete:  { color: '#e74c3c', borderColor: 'rgba(192,57,43,0.3)' },
  statusBadge: {
    fontSize: '10px',
    padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
    letterSpacing: '0.04em',
    fontWeight: 500,
  },
  statusDone: {
    background: 'rgba(30,132,73,0.15)',
    color: '#2ecc71',
    border: '1px solid rgba(30,132,73,0.3)',
  },
  statusDismissed: {
    background: 'rgba(74,74,85,0.3)',
    color: 'var(--color-stone)',
    border: '1px solid var(--color-mist)',
  },
}
