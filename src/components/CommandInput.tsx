// ¿Por qué "CommandInput" y no "AddReminderForm"?
// El nombre refleja la metáfora de la app: le estás dando una instrucción
// a tu mayordomo, no llenando un formulario.
// Esta distinción de nomenclatura ayuda a mantener la coherencia conceptual
// a lo largo del código y mejora la DX (Developer Experience).

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Calendar, AlertCircle } from 'lucide-react'
import { parseReminderText, formatDateTime } from '@/utils/parseDate'
import { useReminderStore } from '@/stores/useReminderStore'
import type { ReminderPriority } from '@/types/reminder'

// ¿Por qué los estilos son objetos React.CSSProperties y no clases CSS?
// Para componentes muy interactivos con estados dinámicos (el input cambia de
// apariencia según si está activo, tiene error, tiene fecha parseada, etc.),
// los objetos de estilo son más explícitos y fáciles de seguir que clases CSS
// condicionales. Sin embargo, para estilos estáticos usamos CSS global (index.css).

export function CommandInput() {
  const [value, setValue] = useState('')
  const [priority, setPriority] = useState<ReminderPriority>('medium')
  const [isFocused, setIsFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const addReminder = useReminderStore(state => state.addReminder)

  // Parseamos en tiempo real mientras el usuario escribe.
  // ¿Por qué en tiempo real y no solo al hacer submit?
  // El feedback inmediato es fundamental en UX. Si el usuario escribe
  // "Llamar médico mañana" y ve "Mañana, 09:00" aparecer debajo del input,
  // sabe que la app entendió la fecha sin tener que adivinar.
  const parsed = value.trim() ? parseReminderText(value) : null

  const handleSubmit = useCallback(async () => {
    if (!parsed || !parsed.date || !parsed.taskText) return

    setIsSubmitting(true)
    try {
      await addReminder({
        title: parsed.taskText,
        datetime: parsed.date.getTime(),
        priority,
        notes: ''
      })
      setValue('')
      setPriority('medium')
      // Focus de vuelta al input para entrada rápida de múltiples recordatorios
      inputRef.current?.focus()
    } finally {
      setIsSubmitting(false)
    }
  }, [parsed, priority, addReminder])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter para enviar — respeta el comportamiento natural de textarea
    // donde Enter simple hace salto de línea
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const hasValidDate = parsed?.date && parsed.date > new Date()
  const hasExpiredDate = parsed?.date && parsed.date <= new Date()

  return (
    <div style={styles.container}>
      {/* Label con efecto "mayordomo esperando instrucciones" */}
      <motion.label
        style={styles.label}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Indique su recordatorio
      </motion.label>

      {/* Input principal */}
      <motion.div
        style={{
          ...styles.inputWrapper,
          ...(isFocused ? styles.inputWrapperFocused : {}),
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        {/* Borde dorado animado al hacer focus */}
        <AnimatePresence>
          {isFocused && (
            <motion.div
              style={styles.focusBorder}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ scaleX: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>

        {/* El textarea en lugar de input permite mensajes más largos y se redimensiona */}
        <textarea
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder='Ej: "Llamar al médico el 25 de marzo a las 10am"'
          style={styles.textarea}
          rows={2}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Botón de envío */}
        <motion.button
          onClick={handleSubmit}
          disabled={!hasValidDate || isSubmitting}
          style={{
            ...styles.sendButton,
            ...(hasValidDate && !isSubmitting ? styles.sendButtonActive : styles.sendButtonDisabled)
          }}
          whileHover={hasValidDate ? { scale: 1.05 } : {}}
          whileTap={hasValidDate ? { scale: 0.95 } : {}}
          title="Enviar (Ctrl + Enter)"
        >
          {isSubmitting ? (
            <motion.div
              style={styles.spinner}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <Send size={16} strokeWidth={2} />
          )}
        </motion.button>
      </motion.div>

      {/* Selector de prioridad */}
      <motion.div
        style={styles.priorityRow}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <span style={styles.priorityLabel}>Prioridad:</span>
        {(['low', 'medium', 'high'] as ReminderPriority[]).map(p => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            style={{
              ...styles.priorityChip,
              ...(priority === p ? styles[`priorityChip${p.charAt(0).toUpperCase() + p.slice(1)}` as keyof typeof styles] : {})
            }}
          >
            {PRIORITY_LABELS[p]}
          </button>
        ))}
      </motion.div>

      {/* Preview de fecha parseada — feedback en tiempo real */}
      <AnimatePresence mode="wait">
        {parsed && parsed.date && (
          <motion.div
            key={parsed.dateText}
            style={{
              ...styles.preview,
              ...(hasExpiredDate ? styles.previewExpired : styles.previewValid)
            }}
            initial={{ opacity: 0, height: 0, y: -5 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {hasExpiredDate ? (
              <AlertCircle size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
            ) : (
              <Calendar size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
            )}
            <span>
              {hasExpiredDate
                ? 'Esa fecha ya pasó'
                : formatDateTime(parsed.date.getTime())
              }
            </span>
            {parsed.taskText && parsed.taskText !== value.trim() && (
              <span style={styles.previewTask}>— "{parsed.taskText}"</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sugerencias de ejemplo */}
      {!value && (
        <motion.div
          style={styles.hints}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1 }}
        >
          {HINTS.map((hint, i) => (
            <button
              key={i}
              style={styles.hintChip}
              onClick={() => {
                setValue(hint)
                inputRef.current?.focus()
              }}
            >
              {hint}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  )
}

const PRIORITY_LABELS: Record<ReminderPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta'
}

const HINTS = [
  'Reunión con el equipo mañana a las 9am',
  'Pagar factura el próximo lunes',
  'Llamar al médico en 2 días a las 3pm',
]

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px 20px',
    maxWidth: '680px',
    margin: '0 auto',
    width: '100%',
  },
  label: {
    display: 'block',
    fontFamily: 'var(--font-display)',
    fontSize: '13px',
    color: 'var(--color-stone)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '10px',
  },
  inputWrapper: {
    position: 'relative',
    background: 'var(--color-obsidian)',
    border: '1px solid var(--color-slate)',
    borderRadius: 'var(--radius-lg)',
    padding: '2px',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    borderColor: 'rgba(201,169,110,0.4)',
    boxShadow: '0 0 0 3px rgba(201,169,110,0.08)',
  },
  focusBorder: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: '1px',
    background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)',
    transformOrigin: 'center',
  },
  textarea: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--color-cream)',
    fontSize: '15px',
    lineHeight: 1.6,
    padding: '14px 52px 14px 18px',
    resize: 'none',
    fontFamily: 'var(--font-body)',
    fontWeight: 300,
  },
  sendButton: {
    position: 'absolute',
    right: '10px',
    bottom: '10px',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--transition-fast)',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
  },
  sendButtonActive: {
    background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-deep))',
    color: '#0a0a0a',
    boxShadow: '0 2px 12px rgba(201,169,110,0.4)',
  },
  sendButtonDisabled: {
    background: 'var(--color-slate)',
    color: 'var(--color-ash)',
    cursor: 'not-allowed',
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(0,0,0,0.2)',
    borderTopColor: '#0a0a0a',
    borderRadius: '50%',
  },
  priorityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
    flexWrap: 'wrap',
  },
  priorityLabel: {
    fontSize: '12px',
    color: 'var(--color-stone)',
    letterSpacing: '0.05em',
  },
  priorityChip: {
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    fontSize: '12px',
    border: '1px solid var(--color-slate)',
    background: 'transparent',
    color: 'var(--color-stone)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    fontFamily: 'var(--font-body)',
  },
  priorityChipLow:    { background: 'rgba(30,132,73,0.15)',   color: '#2ecc71',               borderColor: 'rgba(30,132,73,0.4)'   },
  priorityChipMedium: { background: 'rgba(201,169,110,0.15)', color: 'var(--color-gold)',      borderColor: 'rgba(201,169,110,0.4)' },
  priorityChipHigh:   { background: 'rgba(192,57,43,0.15)',   color: '#e74c3c',               borderColor: 'rgba(192,57,43,0.4)'   },
  preview: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '10px',
    padding: '8px 14px',
    borderRadius: 'var(--radius-md)',
    fontSize: '12px',
    overflow: 'hidden',
  },
  previewValid: {
    background: 'rgba(201,169,110,0.08)',
    color: 'var(--color-gold)',
    border: '1px solid rgba(201,169,110,0.2)',
  },
  previewExpired: {
    background: 'rgba(192,57,43,0.08)',
    color: '#e74c3c',
    border: '1px solid rgba(192,57,43,0.2)',
  },
  previewTask: {
    color: 'var(--color-stone)',
    marginLeft: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  hints: {
    display: 'flex',
    gap: '6px',
    marginTop: '14px',
    flexWrap: 'wrap',
  },
  hintChip: {
    padding: '5px 12px',
    borderRadius: 'var(--radius-full)',
    fontSize: '11px',
    border: '1px dashed var(--color-mist)',
    background: 'transparent',
    color: 'var(--color-ash)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    fontFamily: 'var(--font-body)',
    fontStyle: 'italic',
  },
}
