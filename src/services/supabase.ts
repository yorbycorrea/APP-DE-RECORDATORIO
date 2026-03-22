// ¿Por qué un archivo separado para el cliente de Supabase?
// El cliente de Supabase es una instancia singleton que maneja la conexión,
// la sesión del usuario, y el token JWT. Si lo instanciaras en múltiples
// archivos, tendrías múltiples conexiones y estados de sesión desincronizados.
// Un solo archivo exporta UNA instancia que toda la app comparte.
//
// ¿Por qué variables de entorno (import.meta.env) y no hardcodear las keys?
// Las keys de Supabase en el frontend son "públicas" (anon key) pero aun así
// NO deben estar en el código fuente porque:
// 1. El código fuente va a GitHub → las keys quedan expuestas públicamente
// 2. Para rotar keys solo cambias el .env, sin tocar código
// 3. En producción usarías keys diferentes a las de desarrollo
//
// ¿Por qué VITE_ como prefijo?
// Vite solo expone al browser las variables que empiezan con VITE_.
// Las demás permanecen en el servidor de build y no llegan al bundle.
// Esto evita filtrar variables de servidor (como DATABASE_URL) al cliente.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. ' +
    'Crea un archivo .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY'
  )
}

// ¿Qué hace createClient internamente?
// 1. Configura el cliente HTTP para llamadas a la API REST de Supabase
// 2. Inicializa el sistema de autenticación con persistencia en localStorage
//    (la sesión sobrevive recargas de página automáticamente)
// 3. Configura el cliente de tiempo real (WebSockets) para subscripciones
//
// La opción auth.persistSession: true (default) guarda el JWT en localStorage.
// Cuando el usuario recarga la página, Supabase recupera la sesión automáticamente
// sin necesidad de volver a hacer login.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,    // Renueva el JWT antes de que expire (cada ~1h)
    detectSessionInUrl: true   // Necesario para el magic link y OAuth callbacks
  }
})

// Exportamos los tipos de Supabase para uso en otros archivos
export type { User, Session, AuthError } from '@supabase/supabase-js'
