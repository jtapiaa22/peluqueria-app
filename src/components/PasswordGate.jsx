import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { Lock, ShieldCheck } from 'lucide-react'

// Shake corto al rechazar la contraseña — misma sacudida que usan iOS/macOS
// en sus pantallas de clave, para que el rechazo se sienta, no solo se lea.
const shake = (controls) => controls.start({ x: [0, -10, 10, -8, 8, -4, 4, 0], transition: { duration: 0.4, ease: 'easeInOut' } })

export default function PasswordGate({ configKey, titulo, desbloqueado, onDesbloquear, onBloquear, children }) {
  const [tienePassword, setTienePassword] = useState(null) // null = cargando
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const shakeControls = useAnimationControls()

  useEffect(() => {
    window.electronAPI.getConfig(configKey).then(result => {
      const tiene = !!(result?.valor)
      setTienePassword(tiene)
      if (!tiene && onDesbloquear) onDesbloquear()
    })
  }, [configKey])

  // Cargando
  if (tienePassword === null) return null

  // No tiene contraseña → mostrar directo
  if (!tienePassword) return children

  // Tiene contraseña y está bloqueado → pantalla de lock
  const desbloquear = async () => {
    if (!password.trim()) return
    const result = await window.electronAPI.getConfig(configKey)
    if (result && result.valor === password) {
      setPassword('')
      setError('')
      if (onDesbloquear) onDesbloquear()
    } else {
      setError('Contraseña incorrecta.')
      setPassword('')
      shake(shakeControls)
    }
  }

  return (
    // Sin mode="wait": las dos pantallas se cruzan superpuestas (una encima de
    // la otra, con position:absolute) en vez de esperar a que una termine de
    // irse para recién ahí mostrar la otra — eso era lo que dejaba un
    // instante en blanco al bloquear.
    <div style={{ position: 'relative', height: '100%' }}>
    <AnimatePresence>
      {desbloqueado ? (
        // Tiene contraseña y está desbloqueado → mostrar contenido + botón bloquear.
        // initial={false}: al desbloquear aparece ya al toque, sin fundido — así
        // no hay un hueco en blanco justo antes de que los números empiecen a
        // contar. El fundido de salida (exit) sí queda, para cuando se aprieta
        // "Bloquear".
        <motion.div key="desbloqueado" style={{ position: 'absolute', inset: 0, height: '100%' }}
          initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
          {/* Botón flotante para volver a bloquear */}
          <button
            onClick={onBloquear}
            title="Bloquear sección"
            style={{
              position: 'fixed', bottom: 24, right: 24, zIndex: 900,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 99,
              background: 'rgba(var(--accent-rgb),0.15)',
              border: '1px solid rgba(var(--accent-rgb),0.35)',
              color: 'var(--accent-bright)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.15)' }}
          >
            <Lock size={13} />
            Bloquear
          </button>
          {children}
        </motion.div>
      ) : (
        // Sin exit: al ingresar bien la contraseña esta pantalla se saca al
        // toque (no hay nada que animar de salida), así "mode='wait'" no
        // frena a la de contenido esperando un fundido que no queremos ver acá.
        <motion.div key="bloqueado" style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
          <h1 className="page-title">{titulo}</h1>
          <div style={{ maxWidth: 380, margin: '60px auto' }}>
            <motion.div className="card" style={{ textAlign: 'center' }} animate={shakeControls}>
              <Lock size={40} style={{ color: 'var(--accent-bright)', marginBottom: 16 }} />
              <h3 style={{ color: 'var(--text-main)', marginBottom: 8 }}>Sección protegida</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                Ingresá la contraseña para acceder a <strong style={{ color: 'var(--accent-strong)' }}>{titulo}</strong>.
              </p>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label>Contraseña</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && desbloquear()}
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              {error && (
                <div style={{
                  background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
                  borderRadius: 8, padding: '8px 12px', marginBottom: 12,
                  color: 'var(--danger)', fontSize: 13, textAlign: 'left',
                }}>
                  {error}
                </div>
              )}
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 4 }} onClick={desbloquear}>
                Ingresar
              </button>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 16, lineHeight: 1.5 }}>
                <ShieldCheck size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Si olvidaste la contraseña, podés cambiarla desde <strong>Configuración → Seguridad</strong>.
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  )
}
