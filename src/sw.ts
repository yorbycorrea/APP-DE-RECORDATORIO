/// <reference lib="webworker" />
// La directiva de arriba le dice a TypeScript que este archivo se ejecuta en
// el contexto de un Service Worker (no en el browser normal). Sin esto,
// TypeScript no reconocería 'self', 'clients', 'skipWaiting()', etc.

// ¿Por qué src/sw.ts y no public/sw.js?
// Al tenerlo en /src, TypeScript lo tipea y Vite lo compila.
// vite-plugin-pwa con strategy 'injectManifest' toma este archivo,
// inyecta el precache manifest de Workbox, y lo coloca en /sw.js (output).
// Un SW en /public sería JS puro sin types, sin imports, sin compilación.

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

// clientsClaim() hace que el SW toma control de todas las pestañas existentes
// inmediatamente, sin esperar a que las recarguen.
// Sin esto, el nuevo SW esperaría hasta que el usuario cierre y reabra el tab.
clientsClaim()

// skipWaiting() + clientsClaim() = actualización instantánea del SW.
// Cuando hay una nueva versión del SW, se instala inmediatamente en lugar de
// esperar en estado "waiting".
self.skipWaiting()

// precacheAndRoute inyecta el manifest generado por Workbox.
// El __WB_MANIFEST es reemplazado en build time por la lista de assets a cachear
// (index.html, JS, CSS, íconos, etc.). Esto permite que la app funcione OFFLINE.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ══════════════════════════════════════════════════════════════════
// SISTEMA DE NOTIFICACIONES EN EL SERVICE WORKER
// ══════════════════════════════════════════════════════════════════

// Mapa de timers activos — id del reminder → setTimeout handle
// ¿Por qué un Map y no un Set o un array?
// Necesitamos buscar por id para cancelar timers específicos cuando el usuario
// edita o elimina un recordatorio. Map tiene lookup O(1) por key.
const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>()

// Escuchamos mensajes del hilo principal (la app React)
// El protocolo de mensajes que implementamos:
// - SCHEDULE_NOTIFICATION: programar una notificación futura
// - CANCEL_NOTIFICATION: cancelar una programada
// - HEARTBEAT: mantener vivo el SW
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { type } = event.data

  if (type === 'SCHEDULE_NOTIFICATION') {
    const { reminder } = event.data
    scheduleInSW(reminder)
  }

  if (type === 'CANCEL_NOTIFICATION') {
    const { reminderId } = event.data
    cancelInSW(reminderId)
  }

  if (type === 'HEARTBEAT') {
    // El heartbeat mantiene el SW activo. Sin esto, el browser lo terminaría
    // después de ~30 segundos de inactividad, perdiendo todos los timers.
    // Solo recibir el mensaje es suficiente para "despertar" al SW.
  }
})

function scheduleInSW(reminder: { id: string; datetime: number; title: string; priority: string; notes?: string }) {
  // Cancelar timer previo para este reminder (por si fue re-programado)
  cancelInSW(reminder.id)

  const delay = reminder.datetime - Date.now()

  // No programar si ya pasó
  if (delay <= 0) return

  // setTimeout en el SW — funciona aunque el tab esté cerrado (mientras el browser esté abierto)
  // LIMITACIÓN: Si el browser se cierra ANTES de que el timer dispare, se pierde.
  // Para notificaciones garantizadas con browser cerrado necesitarías Firebase Cloud Messaging.
  const timerId = setTimeout(async () => {
    scheduledTimers.delete(reminder.id)
    await fireNotification(reminder)
  }, delay)

  scheduledTimers.set(reminder.id, timerId)
}

function cancelInSW(reminderId: string) {
  const timerId = scheduledTimers.get(reminderId)
  if (timerId !== undefined) {
    clearTimeout(timerId)
    scheduledTimers.delete(reminderId)
  }
}

async function fireNotification(reminder: { id: string; title: string; priority: string; notes?: string }) {
  const priorityEmoji: Record<string, string> = {
    high: '🔴',
    medium: '🟡',
    low: '🔵'
  }

  try {
    await self.registration.showNotification(
      `${priorityEmoji[reminder.priority] ?? '◆'} ${reminder.title}`,
      {
        body: reminder.notes || 'Su mayordomo le recuerda este compromiso.',
        icon: '/icons/icon-192.svg',
        badge: '/icons/icon-192.svg',
        tag: reminder.id,
        requireInteraction: reminder.priority === 'high',
        data: {
          reminderId: reminder.id,
          url: '/'
        },
        actions: [
          { action: 'done',    title: '✓ Completado' },
          { action: 'dismiss', title: '✗ Descartar'  }
        ]
      } as NotificationOptions
    )
  } catch (error) {
    console.error('SW: Error al mostrar notificación', error)
  }
}

// Manejar clics en notificaciones
// ¿Por qué en el SW y no en la app React?
// Las notificaciones pueden ser clickeadas cuando la app NO está abierta.
// El SW siempre está disponible para manejar estos eventos.
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const reminderId = event.notification.data?.reminderId
  const action = event.action // 'done', 'dismiss', o '' (click en el cuerpo)

  if (action === 'done' || action === 'dismiss') {
    // Enviar mensaje a todos los tabs abiertos de la app
    // para que actualicen el estado en React/Zustand/IndexedDB
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: action === 'done' ? 'MARK_DONE' : 'MARK_DISMISSED',
            reminderId
          })
        })
      })
    )
  }

  // Al hacer click en la notificación: abrir o enfocar la app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Si ya hay un tab abierto, lo enfocamos en lugar de abrir uno nuevo
        const existing = clients.find(c => c.url.includes(self.registration.scope))
        if (existing) {
          return existing.focus()
        }
        // Si no hay tab abierto, abrimos la app
        return self.clients.openWindow('/')
      })
  )
})

// Manejar cierre de notificaciones (el usuario la deslizó para cerrar)
self.addEventListener('notificationclose', (event: NotificationEvent) => {
  const reminderId = event.notification.data?.reminderId
  if (reminderId) {
    // Opcional: enviar evento de analytics o actualizar estado a 'dismissed'
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'NOTIFICATION_CLOSED', reminderId })
      })
    })
  }
})

// Push event — para cuando en el futuro se implemente Firebase Cloud Messaging
// Por ahora lo registramos vacío para que el SW esté preparado
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icons/icon-192.svg',
        data: data,
      })
    )
  } catch {
    // Si el payload no es JSON válido, ignoramos
  }
})
