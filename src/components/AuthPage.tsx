// AuthPage — La pantalla de login/registro con estética del mayordomo.
// ¿Por qué un componente "Page" en lugar de un modal?
// El login es un estado completamente diferente de la app — el usuario NO debe
// ver la lista de recordatorios mientras no está autenticado. Una página completa
// deja claro que se requiere autenticación antes de continuar.
// Un modal sobre la app principal filtraría información y daría falsa sensación
// de acceso.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Crown, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'

type AuthMode = 'signin' | 'signup'

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [signUpDone, setSignUpDone] = useState(false)

  const { signIn, signUp, signInWithGoogle, signInWithGitHub, isLoading, error, clearError } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    if (mode === 'signin') {
      await signIn(email, password)
    } else {
      await signUp(email, password)
      // Si no hubo error, mostrar mensaje de confirmación
      if (!useAuthStore.getState().error) {
        setSignUpDone(true)
      }
    }
  }

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    clearError()
    setSignUpDone(false)
  }

  return (
    <div style={styles.page}>
      {/* Fondo con gradiente sutil */}
      <div style={styles.bgGradient} />

      <motion.div
        style={styles.card}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Header del mayordomo */}
        <div style={styles.header}>
          <motion.div
            style={styles.logoWrapper}
            animate={{ boxShadow: ['0 0 10px rgba(201,169,110,0.2)', '0 0 25px rgba(201,169,110,0.4)', '0 0 10px rgba(201,169,110,0.2)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Crown size={22} strokeWidth={1.5} style={{ color: 'var(--color-gold)' }} />
          </motion.div>

          <h1 style={styles.title}>Butler</h1>
          <p style={styles.subtitle}>Mayordomo Digital</p>

          <div className="gold-rule" style={{ margin: '16px auto' }} />

          <p style={styles.tagline}>
            {mode === 'signin'
              ? 'Bienvenido de regreso, señor.'
              : 'Es un honor tenerle como nuevo cliente.'
            }
          </p>
        </div>

        {/* Tabs signin / signup */}
        <div style={styles.tabs}>
          {(['signin', 'signup'] as AuthMode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{ ...styles.tab, ...(mode === m ? styles.tabActive : {}) }}
            >
              {m === 'signin' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        {/* Mensaje de confirmación de registro */}
        <AnimatePresence mode="wait">
          {signUpDone ? (
            <motion.div
              key="confirm"
              style={styles.successBox}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#2ecc71' }}>
                ✓ Registro exitoso. Revise su correo electrónico y confirme su cuenta para continuar.
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              style={styles.form}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Campo Email */}
              <div style={styles.fieldWrapper}>
                <label style={styles.label}>Correo electrónico</label>
                <div style={styles.inputWrapper}>
                  <Mail size={15} strokeWidth={1.5} style={styles.inputIcon} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError() }}
                    placeholder="correo@ejemplo.com"
                    style={styles.input}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div style={styles.fieldWrapper}>
                <label style={styles.label}>Contraseña</label>
                <div style={styles.inputWrapper}>
                  <Lock size={15} strokeWidth={1.5} style={styles.inputIcon} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearError() }}
                    placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
                    style={{ ...styles.input, paddingRight: '44px' }}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                    minLength={6}
                  />
                  {/* Toggle visibilidad contraseña */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={styles.eyeButton}
                    tabIndex={-1}
                  >
                    {showPassword
                      ? <EyeOff size={14} strokeWidth={1.5} />
                      : <Eye size={14} strokeWidth={1.5} />
                    }
                  </button>
                </div>
              </div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    style={styles.errorMsg}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={isLoading || !email || !password}
                style={{
                  ...styles.submitBtn,
                  ...(isLoading || !email || !password ? styles.submitBtnDisabled : {})
                }}
                whileHover={!isLoading ? { scale: 1.01 } : {}}
                whileTap={!isLoading ? { scale: 0.99 } : {}}
              >
                {isLoading ? (
                  <motion.div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 size={16} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Un momento...</span>
                  </motion.div>
                ) : (
                  mode === 'signin' ? 'Entrar' : 'Crear cuenta'
                )}
              </motion.button>

              {/* Divider */}
              <div style={styles.divider}>
                <div style={styles.dividerLine} />
                <span style={styles.dividerText}>o continúa con</span>
                <div style={styles.dividerLine} />
              </div>

              {/* Google OAuth */}
              <motion.button
                type="button"
                onClick={signInWithGoogle}
                disabled={isLoading}
                style={{
                  ...styles.oauthBtn,
                  ...(isLoading ? { opacity: 0.6, cursor: 'not-allowed' } : {})
                }}
                whileHover={!isLoading ? { scale: 1.01, borderColor: 'rgba(201,169,110,0.3)', background: '#1a1a1f' } : {}}
                whileTap={!isLoading ? { scale: 0.99 } : {}}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                <span>Continuar con Google</span>
              </motion.button>

              {/* GitHub OAuth */}
              <motion.button
                type="button"
                onClick={signInWithGitHub}
                disabled={isLoading}
                style={{
                  ...styles.oauthBtn,
                  ...(isLoading ? { opacity: 0.6, cursor: 'not-allowed' } : {})
                }}
                whileHover={!isLoading ? { scale: 1.01, borderColor: 'rgba(201,169,110,0.3)', background: '#1a1a1f' } : {}}
                whileTap={!isLoading ? { scale: 0.99 } : {}}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                <span>Continuar con GitHub</span>
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Footer */}
        <p style={styles.footer}>
          Butler · Mayordomo Digital
        </p>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: var(--color-ash); }
        input:focus { outline: none; }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGradient: {
    position: 'fixed',
    inset: 0,
    background: `
      radial-gradient(ellipse at 30% 40%, rgba(201,169,110,0.06) 0%, transparent 55%),
      radial-gradient(ellipse at 75% 70%, rgba(201,169,110,0.04) 0%, transparent 50%)
    `,
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'var(--color-obsidian)',
    border: '1px solid rgba(201,169,110,0.2)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px 32px 28px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,169,110,0.08)',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logoWrapper: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, rgba(201,169,110,0.15), rgba(201,169,110,0.05))',
    border: '1px solid rgba(201,169,110,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 14px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '28px',
    fontWeight: 600,
    color: 'var(--color-cream)',
    letterSpacing: '0.04em',
    lineHeight: 1,
  },
  subtitle: {
    fontSize: '11px',
    fontWeight: 300,
    color: 'var(--color-gold)',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    marginTop: '4px',
  },
  tagline: {
    fontFamily: 'var(--font-display)',
    fontSize: '14px',
    fontStyle: 'italic',
    color: 'var(--color-stone)',
    lineHeight: 1.5,
  },
  tabs: {
    display: 'flex',
    background: 'var(--color-graphite)',
    borderRadius: 'var(--radius-md)',
    padding: '3px',
    marginBottom: '24px',
    border: '1px solid var(--color-slate)',
  },
  tab: {
    flex: 1,
    padding: '8px',
    borderRadius: '9px',
    fontSize: '13px',
    fontWeight: 400,
    color: 'var(--color-stone)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    fontFamily: 'var(--font-body)',
  },
  tabActive: {
    background: 'rgba(201,169,110,0.12)',
    color: 'var(--color-gold)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fieldWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    color: 'var(--color-stone)',
    letterSpacing: '0.05em',
    fontWeight: 400,
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '13px',
    color: 'var(--color-ash)',
    pointerEvents: 'none',
    flexShrink: 0,
  } as React.CSSProperties,
  input: {
    width: '100%',
    background: 'var(--color-graphite)',
    border: '1px solid var(--color-slate)',
    borderRadius: 'var(--radius-md)',
    padding: '11px 14px 11px 40px',
    color: 'var(--color-cream)',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    fontWeight: 300,
    transition: 'border-color var(--transition-fast)',
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    background: 'transparent',
    border: 'none',
    color: 'var(--color-ash)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
  } as React.CSSProperties,
  errorMsg: {
    fontSize: '12px',
    color: '#e74c3c',
    background: 'rgba(192,57,43,0.1)',
    border: '1px solid rgba(192,57,43,0.25)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 12px',
    lineHeight: 1.5,
    overflow: 'hidden',
  },
  successBox: {
    background: 'rgba(30,132,73,0.1)',
    border: '1px solid rgba(30,132,73,0.3)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    marginBottom: '8px',
  },
  submitBtn: {
    padding: '13px',
    borderRadius: 'var(--radius-md)',
    background: 'linear-gradient(135deg, var(--color-gold), #a07820)',
    color: '#0a0a0a',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    letterSpacing: '0.03em',
    transition: 'all var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(201,169,110,0.3)',
    marginTop: '4px',
  },
  submitBtnDisabled: {
    background: 'var(--color-slate)',
    color: 'var(--color-ash)',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '4px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'var(--color-slate)',
  },
  dividerText: {
    fontSize: '11px',
    color: 'var(--color-ash)',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap' as const,
  },
  oauthBtn: {
    width: '100%',
    padding: '11px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-graphite)',
    border: '1px solid var(--color-slate)',
    color: 'var(--color-pearl)',
    fontSize: '14px',
    fontWeight: 400,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all var(--transition-fast)',
  },
  footer: {
    textAlign: 'center',
    fontSize: '11px',
    color: 'var(--color-ash)',
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    marginTop: '24px',
    letterSpacing: '0.05em',
  },
}
