import { useState, useEffect, useRef } from 'react'
import { ShieldX, Upload, Copy, Check, Wifi, Loader2 } from 'lucide-react'

const POLL_MS = 6000

const inputStyle = {
  width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-soft)',
  borderRadius: 8, padding: '9px 12px', color: 'var(--text-main)', fontSize: 13,
  boxSizing: 'border-box',
}

const labelStyle = {
  color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6,
  display: 'block',
}

export default function Licencia({ onActivada }) {
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [machineId, setMachineId] = useState('')
  const [copiado, setCopiado] = useState(false)

  const [modo, setModo] = useState('archivo') // 'archivo' | 'remoto-form' | 'remoto-esperando'
  const [remoto, setRemoto] = useState({ peluqueria: '', nombreContacto: '', contacto: '', telefono: '' })
  const [loadingRemoto, setLoadingRemoto] = useState(false)
  const [errorRemoto, setErrorRemoto] = useState('')
  const pollRef = useRef(null)

  useEffect(() => {
    window.electronAPI.getMachineId().then(setMachineId)
  }, [])

  useEffect(() => {
    Promise.all([
      window.electronAPI.getConfig('remoto_peluqueria'),
      window.electronAPI.getConfig('remoto_nombre_contacto'),
      window.electronAPI.getConfig('remoto_contacto'),
      window.electronAPI.getConfig('remoto_telefono'),
      window.electronAPI.getConfig('peluqueria_nombre'),
    ]).then(([peluqueria, nombreContacto, contacto, telefono, peluqueriaNombre]) => {
      setRemoto(r => ({
        peluqueria: peluqueria?.valor || peluqueriaNombre?.valor || r.peluqueria,
        nombreContacto: nombreContacto?.valor || r.nombreContacto,
        contacto: contacto?.valor || r.contacto,
        telefono: telefono?.valor || r.telefono,
      }))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const copiar = () => {
    navigator.clipboard.writeText(machineId)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const cargarArchivo = async () => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.lic'
      input.onchange = async (e) => {
        const archivo = e.target.files[0]
        if (!archivo) return
        setCargando(true)
        const resultado = await window.electronAPI.cargarLicencia(archivo.path)
        setCargando(false)
        if (resultado.valida) {
          onActivada()
        } else {
          setMensaje(resultado.mensaje)
        }
      }
      input.click()
    } catch {
      setMensaje('Error al cargar el archivo.')
      setCargando(false)
    }
  }

  const detenerPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  const enviarSolicitudRemota = async () => {
    if (!remoto.peluqueria.trim() || !remoto.contacto.trim()) {
      setErrorRemoto('Completá al menos el nombre de la peluquería y el correo')
      return
    }
    setLoadingRemoto(true)
    setErrorRemoto('')
    try {
      const resultado = await window.electronAPI.solicitarLicenciaRemota({
        peluqueria: remoto.peluqueria.trim(),
        nombreContacto: remoto.nombreContacto.trim() || undefined,
        contacto: remoto.contacto.trim(),
        telefono: remoto.telefono.trim() || undefined,
      })
      if (!resultado.success) {
        setErrorRemoto(resultado.error || 'No se pudo enviar la solicitud')
        return
      }
      window.electronAPI.setConfig({ clave: 'remoto_peluqueria', valor: remoto.peluqueria.trim() }).catch(() => {})
      window.electronAPI.setConfig({ clave: 'remoto_nombre_contacto', valor: remoto.nombreContacto.trim() }).catch(() => {})
      window.electronAPI.setConfig({ clave: 'remoto_contacto', valor: remoto.contacto.trim() }).catch(() => {})
      window.electronAPI.setConfig({ clave: 'remoto_telefono', valor: remoto.telefono.trim() }).catch(() => {})
      setModo('remoto-esperando')
      iniciarPolling()
    } catch {
      setErrorRemoto('No se pudo conectar. Revisá tu conexión a internet.')
    } finally {
      setLoadingRemoto(false)
    }
  }

  const iniciarPolling = () => {
    detenerPolling()
    pollRef.current = setInterval(async () => {
      try {
        const resultado = await window.electronAPI.consultarLicenciaRemota()
        if (resultado.valida) {
          detenerPolling()
          onActivada()
        } else if (!resultado.pendiente) {
          detenerPolling()
          setErrorRemoto(resultado.mensaje || 'La solicitud fue rechazada.')
          setModo('remoto-form')
        }
      } catch {
        // Sin conexión momentánea: se reintenta en el próximo tick, no se corta el polling.
      }
    }, POLL_MS)
  }

  const cancelarEspera = () => {
    detenerPolling()
    setModo('remoto-form')
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', padding: 32, background: 'var(--bg-main)',
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-soft)',
        borderRadius: 16, padding: '40px 36px', maxWidth: 460, width: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}>

        {/* Ícono */}
        <div style={{
          background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
          borderRadius: 99, padding: 16,
        }}>
          <ShieldX size={36} color="var(--danger)" />
        </div>

        {/* Título */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text-main)', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
            Licencia no activada
          </h2>
          {modo === 'archivo' && (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Enviá tu <strong style={{ color: 'var(--text-main)' }}>ID de máquina</strong> junto
              al pago para recibir tu archivo de licencia.
            </p>
          )}
          {modo === 'remoto-form' && (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Completá estos datos y nosotros activamos la licencia de forma remota, sin que tengas
              que cargar ningún archivo.
            </p>
          )}
        </div>

        {/* ID de máquina */}
        {modo !== 'remoto-esperando' && (
          <div style={{ width: '100%' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              ID de tu máquina
            </div>
            <div style={{
              background: 'var(--bg-main)', border: '1px solid var(--border-soft)',
              borderRadius: 8, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <code style={{ color: 'var(--accent-bright)', fontSize: 12, flex: 1, wordBreak: 'break-all', lineHeight: 1.5 }}>
                {machineId || 'Cargando...'}
              </code>
              <button
                onClick={copiar}
                title={copiado ? 'Copiado' : 'Copiar ID'}
                style={{
                  background: copiado ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'var(--bg-card)',
                  border: `1px solid ${copiado ? 'color-mix(in srgb, var(--success) 30%, transparent)' : 'var(--border-soft)'}`,
                  borderRadius: 6, padding: '6px 8px', cursor: 'pointer',
                  color: copiado ? 'var(--success)' : 'var(--text-muted)',
                  flexShrink: 0, display: 'flex', alignItems: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {copiado ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        )}

        {modo === 'archivo' && (
          <>
            <button
              onClick={cargarArchivo}
              disabled={cargando}
              style={{
                width: '100%', background: 'var(--accent)', color: 'white', border: 'none',
                borderRadius: 10, padding: '12px 20px', cursor: cargando ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 14, fontWeight: 600, opacity: cargando ? 0.7 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <Upload size={16} />
              {cargando ? 'Verificando...' : 'Cargar licencia (.lic)'}
            </button>

            {mensaje && (
              <div style={{
                width: '100%', background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
                borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13, textAlign: 'center',
              }}>
                {mensaje}
              </div>
            )}

            <button
              onClick={() => setModo('remoto-form')}
              style={{
                width: '100%', background: 'none', border: 'none', color: 'var(--accent-bright)',
                fontSize: 13, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6,
              }}
            >
              <Wifi size={14} />
              ¿Tenés wifi? Activar remotamente
            </button>
          </>
        )}

        {modo === 'remoto-form' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {errorRemoto && (
              <div style={{
                background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
                borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13,
              }}>
                {errorRemoto}
              </div>
            )}

            <div>
              <label style={labelStyle}>Nombre de la peluquería *</label>
              <input style={inputStyle} value={remoto.peluqueria} placeholder="Ej: Barberia ..."
                onChange={e => setRemoto(r => ({ ...r, peluqueria: e.target.value }))} />
            </div>

            <div>
              <label style={labelStyle}>Nombre de la persona</label>
              <input style={inputStyle} value={remoto.nombreContacto} placeholder="Ej: Jorge Messi"
                onChange={e => setRemoto(r => ({ ...r, nombreContacto: e.target.value }))} />
            </div>

            <div>
              <label style={labelStyle}>Correo *</label>
              <input style={inputStyle} type="email" value={remoto.contacto} placeholder="TuCorreo@gmail.com"
                onChange={e => setRemoto(r => ({ ...r, contacto: e.target.value }))} />
            </div>

            <div>
              <label style={labelStyle}>Teléfono / WhatsApp</label>
              <input style={inputStyle} type="tel" value={remoto.telefono} placeholder="+54 9 11 1234-5678"
                onChange={e => setRemoto(r => ({ ...r, telefono: e.target.value }))} />
            </div>

            <button
              onClick={enviarSolicitudRemota}
              disabled={loadingRemoto}
              style={{
                width: '100%', background: 'var(--accent)', color: 'white', border: 'none',
                borderRadius: 10, padding: '12px 20px', cursor: loadingRemoto ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 600, opacity: loadingRemoto ? 0.7 : 1,
              }}
            >
              {loadingRemoto ? 'Enviando...' : 'Enviar solicitud'}
            </button>

            <button
              onClick={() => setModo('archivo')}
              style={{
                width: '100%', background: 'none', border: 'none', color: 'var(--text-muted)',
                fontSize: 13, cursor: 'pointer', padding: 4,
              }}
            >
              ← Volver a activar con archivo
            </button>
          </div>
        )}

        {modo === 'remoto-esperando' && (
          <div style={{ width: '100%', textAlign: 'center', padding: '4px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Loader2 size={32} color="var(--accent-bright)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <p style={{ color: 'var(--text-main)', fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>
              Esperando activación remota…
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px' }}>
              Ya enviamos tus datos. En cuanto activemos la licencia desde nuestro lado, la app
              arranca sola — dejá esta pantalla abierta.
            </p>
            <button
              onClick={cancelarEspera}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                fontSize: 13, cursor: 'pointer', padding: 4,
              }}
            >
              Cancelar y volver
            </button>
            <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
          </div>
        )}

        {/* Footer */}
        <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0, textAlign: 'center' }}>
          PeluApp — contactá al soporte para activar tu licencia
        </p>
      </div>
    </div>
  )
}
