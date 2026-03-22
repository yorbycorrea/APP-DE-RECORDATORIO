// ¿Por qué un archivo de tipos separado?
// TypeScript comparte tipos entre el código del cliente (React), el Service Worker,
// y los servicios de DB. Si los tipos vivieran dentro de un componente, no podrías
// importarlos desde el SW sin arrastrar dependencias de React.
// Separar tipos es el patrón "Single Source of Truth" para interfaces.

export type ReminderStatus = 'pending' | 'done' | 'dismissed'

// ¿Por qué 'pending' | 'done' | 'dismissed' y no un booleano isCompleted?
// Un booleano solo captura dos estados. Necesitamos tres:
// - pending: el recordatorio aún no llegó o llegó pero no se actuó
// - done: el usuario marcó la tarea como completada (la realizó)
// - dismissed: el usuario descartó la notificación sin completar (la ignoró)
// Esta distinción permite mostrar estadísticas y análisis de productividad en el futuro.

export type ReminderPriority = 'low' | 'medium' | 'high'

export interface Reminder {
  id: string           // UUID v4 generado en el cliente — sin backend, no hay auto-increment
  title: string        // El texto del recordatorio tal como lo escribió el usuario
  datetime: number     // Timestamp en milisegundos (Date.now()). ¿Por qué number y no Date?
                       // Los objetos Date no se serializan bien en IndexedDB ni JSON.
                       // Un number es primitivo, inmutable, y comparable con > < ===
  createdAt: number    // Cuándo se creó el recordatorio (para ordenar en timeline)
  status: ReminderStatus
  priority: ReminderPriority
  notes?: string       // Notas adicionales opcionales (el ? hace el campo opcional en TS)
  notificationId?: string // ID de la notificación programada (para cancelarla si se edita)
}

// ¿Por qué NewReminder omite 'id', 'createdAt', 'status', 'notificationId'?
// Cuando el usuario crea un recordatorio, solo ingresa título, fecha y prioridad.
// El resto (id, createdAt, status) son campos calculados por la app, no por el usuario.
// Usar Omit<> en lugar de redefinir la interfaz garantiza que si cambia Reminder,
// NewReminder se actualiza automáticamente (DRY — Don't Repeat Yourself).
export type NewReminder = Omit<Reminder, 'id' | 'createdAt' | 'status' | 'notificationId'>

// Tipo para actualizaciones parciales — cuando el usuario marca como 'done',
// solo envías { status: 'done' }, no el objeto completo.
// Partial<> hace todos los campos opcionales. Pick<> selecciona solo los que
// tiene sentido actualizar (no deberías poder cambiar el 'id' de un recordatorio).
export type ReminderUpdate = Partial<Pick<Reminder, 'title' | 'datetime' | 'status' | 'priority' | 'notes'>>
