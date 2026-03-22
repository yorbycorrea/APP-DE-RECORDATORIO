// EmptyState — se muestra cuando no hay recordatorios en la vista activa.
// ¿Por qué no simplemente "No hay recordatorios"?
// Un estado vacío bien diseñado reduce la "ansiedad del lienzo en blanco",
// comunica el propósito de la vista, y guía al usuario hacia la acción correcta.
// Es uno de los detalles que más distingue una app amateur de una profesional.

import { motion } from 'framer-motion'

interface Props {
  filter: 'pending' | 'done' | 'all'
}

const CONTENT = {
  pending: {
    icon: '✦',
    title: 'Su agenda está despejada',
    message: 'No tiene recordatorios pendientes. Puede instruirme con un nuevo compromiso arriba.',
  },
  done: {
    icon: '◈',
    title: 'Historial vacío',
    message: 'Los recordatorios completados y descartados aparecerán aquí.',
  },
  all: {
    icon: '◇',
    title: 'Sin registros',
    message: 'Aún no ha creado ningún recordatorio. Permítame ayudarle a comenzar.',
  },
}

export function EmptyState({ filter }: Props) {
  const content = CONTENT[filter]

  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Ornamento central */}
      <motion.div
        style={styles.iconWrapper}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span style={styles.icon}>{content.icon}</span>
      </motion.div>

      <div className="gold-rule" />

      <h3 style={styles.title}>{content.title}</h3>
      <p style={styles.message}>{content.message}</p>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  iconWrapper: {
    width: '64px',
    height: '64px',
    margin: '0 auto 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(201,169,110,0.2)',
    borderRadius: 'var(--radius-xl)',
    background: 'rgba(201,169,110,0.04)',
  },
  icon: {
    fontSize: '24px',
    color: 'var(--color-gold)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '18px',
    fontWeight: 400,
    color: 'var(--color-pearl)',
    marginBottom: '10px',
    fontStyle: 'italic',
  },
  message: {
    fontSize: '13px',
    color: 'var(--color-stone)',
    lineHeight: 1.7,
    maxWidth: '300px',
    margin: '0 auto',
    fontWeight: 300,
  },
}
