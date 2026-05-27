import { useState, useEffect } from 'react'
import { Lock, ShieldCheck } from 'lucide-react'

export default function PasswordGate({ configKey, titulo, desbloqueado, onDesbloquear, onBloquear, children }) {
  const [tienePassword, setTienePassword] = useState(null) // null = cargando
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

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

  // Tiene contraseña y está desbloqueado → mostrar contenido + botón bloquear
  if (desbloqueado) {
    return (
      <div style={{ position: 'relative', height: '100%' }}>
        {/* Botón flotante para volver a bloquear */}
        <button
          onClick={onBloquear}
          title="Bloquear sección"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 900,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: 99,
            background: 'rgba(124,58,237,0.15)',
            border: '1px solid rgba(124,58,237,0.35)',
            color: '#a78bfa', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.15)' }}
        >
          <Lock size={13} />
          Bloquear
        </button>
        {children}
      </div>
    )
  }

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
    }
  }

  return (
    <div>
      <h1 className="page-title">{titulo}</h1>
      <div style={{ maxWidth: 380, margin: '60px auto' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <Lock size={40} style={{ color: '#a78bfa', marginBottom: 16 }} />
          <h3 style={{ color: 'var(--text-main)', marginBottom: 8 }}>Sección protegida</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
            Ingresá la contraseña para acceder a <strong style={{ color: '#c4b5fd' }}>{titulo}</strong>.
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
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: 8, padding: '8px 12px', marginBottom: 12,
              color: '#f87171', fontSize: 13, textAlign: 'left',
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
        </div>
      </div>
    </div>
  )
}
