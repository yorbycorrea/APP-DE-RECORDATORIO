// ReminderList organiza y filtra los recordatorios.
// ¿Por qué separar List de Card?
// Single Responsibility Principle: Card sabe cómo MOSTRAR un recordatorio,
// List sabe cómo ORGANIZAR múltiples recordatorios (filtros, ordenamiento,
// secciones). Mezclarlos haría ambos componentes más difíciles de mantener.

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useReminderStore } from '@/stores/useReminderStore'
import { ReminderCard } from './ReminderCard'
import { EmptyState } from './EmptyState'

type FilterTab = 'pending' | 'done' | 'all'

export function ReminderList() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('pending')
  const reminders = useReminderStore(state => state.reminders)
  const isLoading = useReminderStore(state => state.isLoading)

  const filtered = reminders.filter(r => {
    if (activeFilter === 'pending') return r.status === 'pending'
    if (activeFilter === 'done') return r.status === 'done' || r.status === 'dismissed'
    return true
  })

  // Agrupar por sección temporal para el tab "pending"
  const overdueItems = filtered.filter(r => r.status === 'pending' && r.datetime < Date.now())
  const upcomingItems = filtered.filter(r => r.status === 'pending' && r.datetime >= Date.now())

  const counts = {
    pending: reminders.filter(r => r.status === 'pending').length,
    done: reminders.filter(r => r.status === 'done' || r.status === 'dismissed').length,
    all: reminders.length,
  }

  return (
    <div style={styles.container}>
      {/* Tabs de filtro */}
      <div style={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as FilterTab)}
            style={{
              ...styles.tab,
              ...(activeFilter === tab.id ? styles.tabActive : {})
            }}
          >
            {tab.label}
            {counts[tab.id as FilterTab] > 0 && (
              <span style={{
                ...styles.tabCount,
                ...(activeFilter === tab.id ? styles.tabCountActive : {})
              }}>
                {counts[tab.id as FilterTab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Línea divisoria elegante */}
      <div style={styles.divider} />

      {/* Loading skeleton */}
      {isLoading && (
        <div style={styles.skeletons}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '70px', borderRadius: '18px' }} />
          ))}
        </div>
      )}

      {/* Lista animada de recordatorios */}
      {!isLoading && (
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState filter={activeFilter} />
            </motion.div>
          ) : (
            <div style={styles.listWrapper}>
              {/* Sección: Vencidos (solo en tab pending) */}
              {activeFilter === 'pending' && overdueItems.length > 0 && (
                <div style={styles.section}>
                  <SectionHeader
                    label="Vencidos"
                    color="#e74c3c"
                    count={overdueItems.length}
                  />
                  {overdueItems.map((r, i) => (
                    <ReminderCard key={r.id} reminder={r} index={i} />
                  ))}
                </div>
              )}

              {/* Sección: Próximos (tab pending) */}
              {activeFilter === 'pending' && upcomingItems.length > 0 && (
                <div style={styles.section}>
                  {overdueItems.length > 0 && (
                    <SectionHeader label="Próximos" color="var(--color-gold)" count={upcomingItems.length} />
                  )}
                  {upcomingItems.map((r, i) => (
                    <ReminderCard key={r.id} reminder={r} index={overdueItems.length + i} />
                  ))}
                </div>
              )}

              {/* Vista flat para "Completados" y "Todos" */}
              {activeFilter !== 'pending' &&
                filtered.map((r, i) => (
                  <ReminderCard key={r.id} reminder={r} index={i} />
                ))
              }
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}

function SectionHeader({ label, color, count }: { label: string; color: string; count: number }) {
  return (
    <div style={styles.sectionHeader}>
      <div style={{ ...styles.sectionDot, background: color }} />
      <span style={{ ...styles.sectionLabel, color }}>{label}</span>
      <span style={styles.sectionCount}>{count}</span>
      <div style={styles.sectionLine} />
    </div>
  )
}

const TABS = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'done',    label: 'Completados' },
  { id: 'all',     label: 'Todos' },
]

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '680px',
    margin: '0 auto',
    padding: '0 20px 100px',
    width: '100%',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '16px',
  },
  tab: {
    padding: '7px 16px',
    borderRadius: 'var(--radius-full)',
    fontSize: '13px',
    fontWeight: 400,
    color: 'var(--color-stone)',
    background: 'transparent',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'var(--font-body)',
  },
  tabActive: {
    background: 'rgba(201,169,110,0.1)',
    color: 'var(--color-gold)',
    border: '1px solid rgba(201,169,110,0.25)',
  },
  tabCount: {
    fontSize: '11px',
    padding: '1px 6px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--color-slate)',
    color: 'var(--color-stone)',
  },
  tabCountActive: {
    background: 'rgba(201,169,110,0.2)',
    color: 'var(--color-gold)',
  },
  divider: {
    height: '1px',
    background: 'linear-gradient(90deg, var(--color-slate), transparent)',
    marginBottom: '20px',
  },
  skeletons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  listWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '8px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  sectionDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  sectionCount: {
    fontSize: '11px',
    color: 'var(--color-ash)',
    flexShrink: 0,
  },
  sectionLine: {
    flex: 1,
    height: '1px',
    background: 'var(--color-slate)',
  },
}
