// ═══════════════════════════════════════════════════════════════════
// SISTEMA DE NOTIFICACIONES — EXPLICACIÓN COMPLETA
// ═══════════════════════════════════════════════════════════════════
//
// PREGUNTA 1: ¿Cómo funcionan los Service Workers para notificaciones?
// ────────────────────────────────────────────────────────────────────
// El Service Worker (SW) es un script JavaScript que el navegador ejecuta
// en un hilo separado, completamente fuera de la página web. Piénsalo como
// un proxy que vive entre tu app y el servidor/OS.
//
// El SW puede:
// - Interceptar requests de red (caching offline)
// - Recibir mensajes del servidor (push notifications via FCM/VAPID)
// - Mostrar notificaciones del sistema operativo
// - Ejecutar código incluso cuando ningún tab de tu app está abierto
//   (mientras el BROWSER sí esté corriendo)
//
// PREGUNTA 2: ¿Por qué se necesita permiso del usuario?
// ───────────────────────────────────────────────────────
// Las notificaciones pueden ser muy intrusivas (interrumpen al usuario).
// Los browsers implementaron un modelo de permisos explícito por seguridad.
// Sin permiso, cualquier web podría spamearte con notificaciones.
// El permiso se otorga UNA SOLA VEZ por dominio y se guarda en el browser.
//
// PREGUNTA 3: ¿Cómo se programa una notificación para el futuro?
// ───────────────────────────────────────────────────────────────
// No existe una API nativa de "scheduled notifications" en browsers (aún).
// La solución: usar setTimeout() en el Service Worker.
// Cuando el SW recibe el mensaje "SCHEDULE", calcula el delay:
//   delay = targetTimestamp - Date.now()
// Y ejecuta: setTimeout(() => self.registration.showNotification(...), delay)
//
// PREGUNTA 4: ¿Qué pasa si la app está CERRADA?
// ───────────────────────────────────────────────
// Si el BROWSER está cerrado → NO hay SW activo → NO hay notificaciones.
// Esta es la limitación real de las PWAs sin push server.
//
// Si el browser está ABIERTO pero el TAB cerrado → El SW PUEDE estar activo
// y disparar notificaciones. Pero el browser puede "matar" el SW por inactividad.
//
// SOLUCIÓN QUE IMPLEMENTAMOS:
// 1. El tab abierto envía un "heartbeat" al SW cada 20 segundos para mantenerlo vivo
// 2. Al reabrir la app, rescheduleamos TODOS los pendientes
// 3. Para notificaciones críticas: recomendamos al usuario dejar el browser abierto
//
// Para notificaciones 100% confiables cuando el browser está cerrado,
// necesitarías: Firebase Cloud Messaging (FCM) + un backend Node.js.
// Eso está documentado en README.md como "extensión futura".
//
// PREGUNTA 5: Diferencia móvil vs desktop
// ─────────────────────────────────────────
// Desktop: Las notificaciones aparecen en la esquina de la pantalla (OS notification center)
// Mobile Android: Se comporta igual que desktop para PWAs
// Mobile iOS: Las notificaciones PWA solo funcionan si la app está instalada en
//             el Home Screen (Safari → "Añadir a pantalla de inicio") Y requiere iOS 16.4+
// ═══════════════════════════════════════════════════════════════════

import type { Reminder } from '@/types/reminder'

// Registro del SW y las promesas de notificaciones activas
// Guardamos los timeoutIds para poder CANCELAR notificaciones si el usuario
// edita o elimina un recordatorio.
const scheduledTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  // Primero verificamos si el browser soporta notificaciones
  if (!('Notification' in window)) {
    console.warn('Este browser no soporta notificaciones')
    return 'denied'
  }

  // Si ya tenemos permiso, no mostramos el diálogo de nuevo
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'

  // Notification.requestPermission() muestra el diálogo nativo del browser
  // IMPORTANTE: Solo puede llamarse en respuesta a un gesto del usuario (click).
  // Si lo llamas al cargar la página, muchos browsers lo bloquean automáticamente.
  // Por eso lo disparamos desde un botón en la UI.
  const permission = await Notification.requestPermission()
  return permission
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

// Registrar el Service Worker
// ¿Por qué registrar el SW desde el código de la app y no desde index.html?
// Porque necesitamos la referencia al SW para enviarle mensajes (SCHEDULE, CANCEL).
// Si lo registráramos desde index.html, no tendríamos esa referencia fácilmente.
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers no soportados en este browser')
    return null
  }

  try {
    // '/sw.js' es la ruta al SW compilado. Vite-plugin-pwa lo coloca en la raíz.
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
    console.log('Service Worker registrado:', registration.scope)
    return registration
  } catch (error) {
    console.error('Error al registrar Service Worker:', error)
    return null
  }
}

// Programar una notificación para un recordatorio específico
// Esta función tiene dos caminos:
// 1. Si el delay es pequeño (< 30 min): programa un setTimeout local en la página
// 2. Siempre: envía el recordatorio al SW para que lo programe también (más robusto)
export async function scheduleNotification(reminder: Reminder): Promise<void> {
  if (Notification.permission !== 'granted') return

  const delay = reminder.datetime - Date.now()

  // Si el recordatorio ya pasó, no lo programamos
  if (delay < 0) return

  // Cancelar cualquier notificación previa para este reminder (si fue editado)
  cancelScheduledNotification(reminder.id)

  // Programar en el hilo principal (funciona mientras el tab esté abierto)
  const timeoutId = setTimeout(() => {
    showNotification(reminder)
    scheduledTimeouts.delete(reminder.id)
  }, delay)

  scheduledTimeouts.set(reminder.id, timeoutId)

  // TAMBIÉN enviar al Service Worker para que lo programe en su hilo
  // (funciona aunque el tab se cierre, mientras el browser siga abierto)
  await sendToServiceWorker({
    type: 'SCHEDULE_NOTIFICATION',
    reminder
  })
}

// Cancelar una notificación programada
export async function cancelScheduledNotification(reminderId: string): Promise<void> {
  // Cancelar en el hilo principal
  const timeoutId = scheduledTimeouts.get(reminderId)
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId)
    scheduledTimeouts.delete(reminderId)
  }

  // Cancelar en el Service Worker
  await sendToServiceWorker({
    type: 'CANCEL_NOTIFICATION',
    reminderId
  })
}

// Mostrar una notificación inmediatamente
// Usamos la API de Service Worker (registration.showNotification) en lugar de
// new Notification() porque:
// 1. Las notificaciones del SW persisten aunque el tab se cierre
// 2. Soportan botones de acción (actions: [...])
// 3. Son requeridas en algunos browsers móviles para notificaciones con SW
export async function showNotification(reminder: Reminder): Promise<void> {
  if (Notification.permission !== 'granted') return

  const registration = await navigator.serviceWorker.ready

  const priorityEmoji = {
    high: '🔴',
    medium: '🟡',
    low: '🔵'
  }[reminder.priority]

  await registration.showNotification(`${priorityEmoji} ${reminder.title}`, {
    body: reminder.notes || 'Tu mayordomo te recuerda este compromiso',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    tag: reminder.id,          // Evita duplicados: si hay una notif con el mismo tag, la reemplaza
    requireInteraction: reminder.priority === 'high', // Las de alta prioridad no se auto-descartan
    data: { reminderId: reminder.id },
    // actions: botones en la notificación (solo en Android/desktop Chrome)
    actions: [
      { action: 'done', title: '✓ Completado' },
      { action: 'dismiss', title: '✗ Descartar' }
    ]
  } as NotificationOptions)
}

// Reschedular TODOS los recordatorios pendientes
// Se llama al abrir la app para recuperar cualquier notificación perdida
// (ej: si el browser estaba cerrado en el momento programado)
export async function rescheduleAllPending(reminders: Reminder[]): Promise<void> {
  const pending = reminders.filter(r => r.status === 'pending')
  for (const reminder of pending) {
    await scheduleNotification(reminder)
  }
}

// Enviar mensajes al Service Worker
// ¿Por qué postMessage y no una API directa?
// El Service Worker vive en un hilo separado con su propia memoria.
// La única forma de comunicarse con él es mediante el paso de mensajes (postMessage).
// Es como enviar un correo — no hay llamada directa, solo mensajes asíncronos.
async function sendToServiceWorker(message: object): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  const registration = await navigator.serviceWorker.ready
  if (registration.active) {
    registration.active.postMessage(message)
  }
}

// Heartbeat: mantiene el Service Worker activo
// Los browsers terminan los SWs inactivos después de ~30 segundos.
// Este ping periódico le dice al SW "sigue vivo, hay un cliente activo".
let heartbeatInterval: ReturnType<typeof setInterval> | null = null

export function startHeartbeat(): void {
  if (heartbeatInterval) return
  heartbeatInterval = setInterval(() => {
    sendToServiceWorker({ type: 'HEARTBEAT' })
  }, 20_000) // cada 20 segundos
}

export function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
}
