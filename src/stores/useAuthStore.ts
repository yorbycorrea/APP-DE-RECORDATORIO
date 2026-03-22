// ¿Por qué un store separado para auth y no meterlo en useReminderStore?
// Auth y Reminders son dominios completamente distintos.
// Auth responde a "¿quién eres?" — Reminders responde a "¿qué tienes pendiente?".
// Mezclarlos crearía un store gigante difícil de mantener, y haría que
// cualquier componente que solo necesite saber "¿está logueado?" cargue
// también toda la lógica de recordatorios.
// Separados, cada store tiene una sola razón para cambiar (SRP).

import { create } from 'zustand'
import { supabase } from '@/services/supabase'
import type { User, Session, AuthError } from '@/services/supabase'

interface AuthStore {
  // ── Estado ──────────────────────────────────────────────────────
  user: User | null          // null = no autenticado
  session: Session | null    // Contiene el JWT y metadatos de la sesión
  isLoading: boolean         // true mientras verificamos la sesión inicial
  error: string | null

  // ── Acciones ─────────────────────────────────────────────────────
  initialize: () => Promise<void>    // Verificar sesión existente al arrancar
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: true,    // Empieza en true — aún no sabemos si hay sesión guardada
  error: null,

  // initialize() se llama UNA vez al montar la app.
  // ¿Por qué es necesario?
  // Cuando el usuario recarga la página, React empieza desde cero.
  // Supabase tiene la sesión guardada en localStorage, pero React no lo sabe.
  // Esta función le pregunta a Supabase "¿hay sesión activa?" y sincroniza el estado.
  initialize: async () => {
    try {
      // getSession() lee el JWT de localStorage y lo verifica con el servidor
      const { data: { session } } = await supabase.auth.getSession()
      set({
        session,
        user: session?.user ?? null,
        isLoading: false
      })
    } catch {
      set({ isLoading: false })
    }

    // onAuthStateChange escucha TODOS los cambios de auth en tiempo real:
    // - Sign in / Sign up exitoso
    // - Sign out
    // - Token refresh automático
    // - Expiración de sesión
    // ¿Por qué dentro de initialize() y no en un useEffect de React?
    // El listener necesita estar activo durante toda la vida de la app,
    // independientemente de qué componente esté montado. El store de Zustand
    // vive fuera del ciclo de vida de React — es el lugar correcto.
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
        error: null
      })
    })
  },

  signUp: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      // Si signUp requiere verificación de email, user será null hasta que confirme.
      // onAuthStateChange actualizará el estado automáticamente cuando confirme.
    } catch (err) {
      set({ error: getAuthErrorMessage(err as AuthError), isLoading: false })
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // onAuthStateChange actualizará user y session automáticamente
    } catch (err) {
      set({ error: getAuthErrorMessage(err as AuthError), isLoading: false })
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null })
    try {
      // signInWithOAuth redirige al usuario a la página de Google.
      // ¿Por qué redirectTo?
      // Después de que Google autentica al usuario, Supabase necesita saber
      // a dónde redirigir de vuelta. En desarrollo es localhost, en producción
      // es tu dominio de Vercel. window.location.origin lo detecta automáticamente.
      // Esta URL TAMBIÉN debe estar registrada en:
      // 1. Supabase → Authentication → URL Configuration → Redirect URLs
      // 2. Google Cloud Console → OAuth → Authorized redirect URIs
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // Siempre muestra el selector de cuenta de Google
          }
        }
      })
      if (error) throw error
      // Si no hay error, el browser fue redirigido a Google.
      // onAuthStateChange manejará el estado cuando Google redirija de vuelta.
    } catch (err) {
      set({ error: getAuthErrorMessage(err as AuthError), isLoading: false })
    }
  },

  signInWithGitHub: async () => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin,
        }
      })
      if (error) throw error
    } catch (err) {
      set({ error: getAuthErrorMessage(err as AuthError), isLoading: false })
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      // onAuthStateChange pondrá user y session en null automáticamente
    } catch (err) {
      set({ error: getAuthErrorMessage(err as AuthError), isLoading: false })
    }
  },

  clearError: () => set({ error: null })
}))

// Traduce los códigos de error de Supabase a mensajes legibles en español.
// ¿Por qué aquí y no en el componente?
// La lógica de "este código de error significa este mensaje" es de negocio,
// no de presentación. Si cambias el idioma, cambias aquí — no en cada componente.
function getAuthErrorMessage(error: AuthError): string {
  const messages: Record<string, string> = {
    'Invalid login credentials':       'Correo o contraseña incorrectos',
    'Email not confirmed':             'Confirma tu correo electrónico antes de iniciar sesión',
    'User already registered':         'Ya existe una cuenta con ese correo',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
    'Unable to validate email address: invalid format': 'El formato del correo no es válido',
    'Email rate limit exceeded':       'Demasiados intentos. Espera unos minutos.',
    'signup_disabled':                 'El registro está temporalmente deshabilitado',
  }
  return messages[error.message] ?? error.message ?? 'Error desconocido. Intenta de nuevo.'
}
