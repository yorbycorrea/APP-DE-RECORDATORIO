// ¿Por qué este archivo existe?
// Parsear lenguaje natural para fechas es un problema EXTREMADAMENTE complejo.
// "el próximo lunes", "mañana a las 3pm", "en 2 horas", "25 de marzo a las 10am"...
// Escribir esto desde cero tomaría semanas y tendría bugs infinitos.
// chrono-node resuelve este problema con soporte para múltiples idiomas incluyendo español.
//
// ¿Por qué chrono-node y no date-fns o dayjs?
// date-fns y dayjs son librerías de FORMATEO y MANIPULACIÓN de fechas.
// chrono-node es una librería de PARSING de lenguaje natural.
// Son herramientas diferentes para problemas diferentes.

import * as chrono from 'chrono-node'

export interface ParseResult {
  date: Date | null
  text: string        // El texto original del usuario
  dateText: string    // La parte del texto que se interpretó como fecha (ej: "el 25 de marzo")
  taskText: string    // La parte que es la tarea en sí (ej: "Llamar al médico")
  confidence: 'high' | 'low'
}

export function parseReminderText(input: string): ParseResult {
  const trimmed = input.trim()

  // chrono.es.parse() parsea en español.
  // El segundo argumento es la fecha de referencia para frases relativas como "mañana".
  // El tercer argumento { forwardDate: true } garantiza que "el lunes" signifique
  // el PRÓXIMO lunes, no el pasado. Sin esto, si hoy es martes,
  // "el lunes" podría interpretarse como ayer.
  const results = chrono.es.parse(trimmed, new Date(), { forwardDate: true })

  if (results.length === 0) {
    return {
      date: null,
      text: trimmed,
      dateText: '',
      taskText: trimmed,
      confidence: 'low'
    }
  }

  // Tomamos el primer resultado (el más prominente en el texto)
  const result = results[0]
  const parsedDate = result.date()

  // Extraemos el texto de la tarea eliminando la parte de fecha del input original.
  // result.index = posición donde empieza la fecha en el string
  // result.text = el substring que chrono identificó como fecha
  const beforeDate = trimmed.slice(0, result.index).trim()
  const afterDate = trimmed.slice(result.index + result.text.length).trim()

  // La tarea es todo EXCEPTO la parte de fecha
  // Ejemplo: "Llamar al médico el 25 de marzo a las 10am"
  // beforeDate = "Llamar al médico"
  // result.text = "el 25 de marzo a las 10am"
  // afterDate = ""
  // taskText = "Llamar al médico"
  const taskText = [beforeDate, afterDate].filter(Boolean).join(' ').trim()

  return {
    date: parsedDate,
    text: trimmed,
    dateText: result.text,
    taskText: taskText || trimmed,
    confidence: parsedDate ? 'high' : 'low'
  }
}

// Formatear una fecha de forma elegante para mostrar en la UI
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const timeStr = date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })

  // Fechas cercanas se muestran de forma relativa (hoy, mañana)
  // para reducir carga cognitiva en el usuario
  if (isSameDay(date, now)) {
    return `Hoy, ${timeStr}`
  }
  if (isSameDay(date, tomorrow)) {
    return `Mañana, ${timeStr}`
  }

  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatRelativeTime(timestamp: number): string {
  const diff = timestamp - Date.now()
  const abs = Math.abs(diff)

  if (abs < 60_000) return 'ahora mismo'
  if (abs < 3_600_000) {
    const mins = Math.round(abs / 60_000)
    return diff > 0 ? `en ${mins} min` : `hace ${mins} min`
  }
  if (abs < 86_400_000) {
    const hours = Math.round(abs / 3_600_000)
    return diff > 0 ? `en ${hours}h` : `hace ${hours}h`
  }
  const days = Math.round(abs / 86_400_000)
  return diff > 0 ? `en ${days}d` : `hace ${days}d`
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Genera un UUID v4 para identificar recordatorios.
// ¿Por qué crypto.randomUUID() y no Math.random()?
// crypto.randomUUID() usa el generador criptográficamente seguro del OS.
// Math.random() puede colisionar en teoría (probabilidad baja pero no cero).
// crypto.randomUUID() está disponible en todos los browsers modernos.
export function generateId(): string {
  return crypto.randomUUID()
}
