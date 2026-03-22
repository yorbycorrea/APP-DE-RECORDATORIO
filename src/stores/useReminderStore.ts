// ¿Por qué Zustand y no Redux, Context API o useState?
//
// useState: funciona para estado local de un componente, pero si necesitas
//   compartir recordatorios entre Header, Timeline, y ReminderCard (todos en
//   diferentes ramas del árbol de componentes), tendrías "prop drilling" —
//   pasar props a través de 5 niveles de componentes. Muy feo.
//
// Context API: resuelve el prop drilling pero cualquier cambio en el contexto
//   re-renderiza TODOS los componentes que lo consumen, aunque no usen el dato
//   que cambió. En una lista de 50 recordatorios, esto causa jank visible.
//
// Redux: excelente para apps grandes, pero requiere boilerplate enorme
//   (actions, reducers, selectors, middleware). Para una app de recordatorios
//   es francamente un cañón para matar una mosca.
//
// Zustand: estado global reactivo, cero boilerplate, re-renders selectivos
//   (solo los componentes que acceden al dato que cambió se re-renderizan).
//   Perfecto para esta escala de app.

import { create } from 'zustand'
import type { Reminder, NewReminder, ReminderUpdate } from '@/types/reminder'
import {
  getAllReminders,
  saveReminder,
  updateReminder as dbUpdateReminder,
  deleteReminder as dbDeleteReminder
} from '@/services/db'
import {
  scheduleNotification,
  cancelScheduledNotification,
  rescheduleAllPending
} from '@/services/notifications'
import { generateId } from '@/utils/parseDate'

interface ReminderStore {
  // ── Estado ──────────────────────────────────────────────────────
  reminders: Reminder[]
  isLoading: boolean
  error: string | null

  // ── Acciones ─────────────────────────────────────────────────────
  loadReminders: () => Promise<void>
  addReminder: (data: NewReminder) => Promise<void>
  updateReminder: (id: string, updates: ReminderUpdate) => Promise<void>
  deleteReminder: (id: string) => Promise<void>
  markDone: (id: string) => Promise<void>
  markDismissed: (id: string) => Promise<void>

  // ── Selectores computados ─────────────────────────────────────────
  // ¿Por qué getters en el store y no selectors externos?
  // La lógica de filtrado pertenece al dominio de "reminders", no a la UI.
  // Si cambia cómo se determina si un recordatorio es "urgente", lo cambias
  // en un solo lugar, no en cada componente que lo usa.
  getPending: () => Reminder[]
  getUpcoming: (hours?: number) => Reminder[]
  getOverdue: () => Reminder[]
}

export const useReminderStore = create<ReminderStore>((set, get) => ({
  reminders: [],
  isLoading: false,
  error: null,

  loadReminders: async () => {
    set({ isLoading: true, error: null })
    try {
      const reminders = await getAllReminders()
      // Ordenar por datetime: los más próximos primero
      const sorted = reminders.sort((a, b) => a.datetime - b.datetime)
      set({ reminders: sorted, isLoading: false })
      // Reschedular notificaciones para los pendientes
      // (por si el browser se cerró y se perdieron los timers)
      await rescheduleAllPending(sorted)
    } catch (err) {
      set({ error: 'Error al cargar recordatorios', isLoading: false })
    }
  },

  addReminder: async (data: NewReminder) => {
    const newReminder: Reminder = {
      ...data,
      id: generateId(),
      createdAt: Date.now(),
      status: 'pending'
    }

    // Optimistic update: actualiza la UI ANTES de esperar la DB.
    // ¿Por qué optimistic? IndexedDB es asíncrona. Si esperamos la DB para
    // mostrar el recordatorio, el usuario verá un delay de ~20ms que se siente
    // como lag. Con optimistic update, la UI responde instantáneamente.
    // Si la DB falla (rarísimo en local), revertimos el estado.
    set(state => ({
      reminders: [...state.reminders, newReminder].sort((a, b) => a.datetime - b.datetime)
    }))

    try {
      await saveReminder(newReminder)
      await scheduleNotification(newReminder)
    } catch (err) {
      // Revertir si falla
      set(state => ({
        reminders: state.reminders.filter(r => r.id !== newReminder.id),
        error: 'Error al guardar recordatorio'
      }))
    }
  },

  updateReminder: async (id: string, updates: ReminderUpdate) => {
    const previous = get().reminders.find(r => r.id === id)
    if (!previous) return

    const updated = { ...previous, ...updates }

    // Optimistic update
    set(state => ({
      reminders: state.reminders
        .map(r => r.id === id ? updated : r)
        .sort((a, b) => a.datetime - b.datetime)
    }))

    try {
      await dbUpdateReminder(id, updates)
      // Si cambió la fecha, reprogramar la notificación
      if (updates.datetime !== undefined) {
        await cancelScheduledNotification(id)
        await scheduleNotification(updated)
      }
    } catch (err) {
      // Revertir
      set(state => ({
        reminders: state.reminders.map(r => r.id === id ? previous : r),
        error: 'Error al actualizar recordatorio'
      }))
    }
  },

  deleteReminder: async (id: string) => {
    const previous = get().reminders.find(r => r.id === id)

    // Optimistic delete
    set(state => ({ reminders: state.reminders.filter(r => r.id !== id) }))

    try {
      await cancelScheduledNotification(id)
      await dbDeleteReminder(id)
    } catch (err) {
      // Revertir
      if (previous) {
        set(state => ({
          reminders: [...state.reminders, previous].sort((a, b) => a.datetime - b.datetime),
          error: 'Error al eliminar recordatorio'
        }))
      }
    }
  },

  markDone: async (id: string) => {
    await get().updateReminder(id, { status: 'done' })
    await cancelScheduledNotification(id)
  },

  markDismissed: async (id: string) => {
    await get().updateReminder(id, { status: 'dismissed' })
    await cancelScheduledNotification(id)
  },

  // Selectores — estos son funciones puras que derivan estado
  // ¿Por qué funciones y no valores en el estado?
  // Si guardáramos getPending como un array en el estado, tendríamos que
  // sincronizarlo manualmente cada vez que cambia reminders. Con funciones,
  // SIEMPRE derivamos del estado actual → imposible de desincronizar.
  getPending: () => get().reminders.filter(r => r.status === 'pending'),

  getUpcoming: (hours = 24) => {
    const now = Date.now()
    const limit = now + hours * 3_600_000
    return get().reminders.filter(
      r => r.status === 'pending' && r.datetime >= now && r.datetime <= limit
    )
  },

  getOverdue: () => {
    const now = Date.now()
    return get().reminders.filter(
      r => r.status === 'pending' && r.datetime < now
    )
  }
}))
