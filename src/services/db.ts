// ¿Por qué IndexedDB y no localStorage?
// localStorage es síncrono y bloquea el hilo principal del navegador.
// Además, tiene un límite de ~5MB y solo almacena strings (debes serializar/deserializar JSON).
// IndexedDB es asíncrono, soporta objetos nativos, índices, y tiene límites de GB.
// Para una app que puede tener cientos de recordatorios con búsqueda por fecha, IndexedDB
// es la única opción sensata. La librería 'idb' envuelve su API en Promises modernas.
//
// ¿Por qué no SQLite (como en React Native)?
// SQLite no existe en el browser. IndexedDB ES el equivalente del browser.
// Para una PWA que corre en el browser, IndexedDB es la solución nativa.

import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { Reminder } from '@/types/reminder'

// DBSchema es una interfaz de 'idb' que tipea la estructura de tu base de datos.
// Sin esto, TypeScript no sabría qué tipo retorna db.get('reminders', id).
// Con esto, db.get('reminders', id) retorna Promise<Reminder | undefined> automáticamente.
interface ButlerDB extends DBSchema {
  reminders: {
    key: string                    // El tipo de la primary key (nuestro id UUID)
    value: Reminder                // El tipo del objeto almacenado
    indexes: {
      'by-datetime': number        // Índice para consultar por fecha — esencial para
                                   // obtener "los próximos recordatorios" ordenados por hora
      'by-status': string          // Índice para filtrar pending/done/dismissed
    }
  }
}

// Constantes separadas para facilitar migraciones futuras.
// Si cambias el nombre de la DB o versión, lo cambias en un solo lugar.
const DB_NAME = 'butler-db'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<ButlerDB> | null = null

// Singleton pattern: una sola conexión a la DB reutilizada por toda la app.
// ¿Por qué singleton? Abrir múltiples conexiones a IndexedDB en paralelo puede
// causar bloqueos de transacciones. Una sola instancia evita ese problema.
async function getDB(): Promise<IDBPDatabase<ButlerDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<ButlerDB>(DB_NAME, DB_VERSION, {
    // upgrade() se llama cuando la DB no existe (primera vez) o cuando
    // DB_VERSION aumenta. Es el equivalente de las "migraciones" en SQL.
    upgrade(db) {
      const store = db.createObjectStore('reminders', {
        keyPath: 'id'    // 'id' es la primary key — IndexedDB la usa para lookups O(log n)
      })

      // Los índices permiten queries eficientes sin escanear todos los registros.
      // Sin el índice 'by-datetime', obtener "recordatorios de esta semana" requeriría
      // cargar TODOS los recordatorios y filtrarlos en JS — O(n) en lugar de O(log n).
      store.createIndex('by-datetime', 'datetime')
      store.createIndex('by-status', 'status')
    }
  })

  return dbInstance
}

// CRUD operations — cada función tiene una sola responsabilidad

export async function saveReminder(reminder: Reminder): Promise<void> {
  const db = await getDB()
  // 'put' hace upsert (insert + update). Si el id ya existe, actualiza.
  // Esto simplifica la lógica: no necesitas saber si estás creando o editando.
  await db.put('reminders', reminder)
}

export async function getReminder(id: string): Promise<Reminder | undefined> {
  const db = await getDB()
  return db.get('reminders', id)
}

export async function getAllReminders(): Promise<Reminder[]> {
  const db = await getDB()
  // getAll() sin argumentos trae todos los registros.
  // El índice 'by-datetime' los ordenaría por fecha si usáramos getAllFromIndex,
  // pero aquí los ordenamos en la capa de UI para mayor flexibilidad.
  return db.getAll('reminders')
}

export async function getPendingReminders(): Promise<Reminder[]> {
  const db = await getDB()
  // IDBKeyRange.only('pending') crea un rango que matchea exactamente 'pending'.
  // Esto usa el índice 'by-status' — no escanea toda la tabla.
  return db.getAllFromIndex('reminders', 'by-status', IDBKeyRange.only('pending'))
}

export async function getUpcomingReminders(fromTimestamp: number): Promise<Reminder[]> {
  const db = await getDB()
  // IDBKeyRange.lowerBound(x) = todos los valores >= x
  // Esto eficientemente trae solo los recordatorios a partir de 'fromTimestamp'.
  // Perfecto para el Service Worker que necesita saber "¿qué notificar ahora?"
  return db.getAllFromIndex(
    'reminders',
    'by-datetime',
    IDBKeyRange.lowerBound(fromTimestamp)
  )
}

export async function updateReminder(id: string, updates: Partial<Reminder>): Promise<void> {
  const db = await getDB()
  const existing = await db.get('reminders', id)
  if (!existing) throw new Error(`Reminder ${id} not found`)
  // Spread operator para merge: preserva todos los campos existentes,
  // sobreescribe solo los que están en 'updates'.
  await db.put('reminders', { ...existing, ...updates })
}

export async function deleteReminder(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('reminders', id)
}

export async function clearAllReminders(): Promise<void> {
  const db = await getDB()
  await db.clear('reminders')
}
