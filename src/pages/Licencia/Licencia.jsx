import { useState, useEffect } from 'react'
import { ShieldX, Upload, Copy, Check } from 'lucide-react'

export default function Licencia({ onActivada }) {
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [machineId, setMachineId] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    window.electronAPI.getMachineId().then(setMachineId)
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
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 99, padding: 16,
        }}>
          <ShieldX size={36} color="#ef4444" />
        </div>

        {/* Título */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text-main)', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
            Licencia no activada
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Enviá tu <strong style={{ color: 'var(--text-main)' }}>ID de máquina</strong> junto
            al pago para recibir tu archivo de licencia.
          </p>
        </div>

        {/* ID de máquina */}
        <div style={{ width: '100%' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            ID de tu máquina
          </div>
          <div style={{
            background: 'var(--bg-main)', border: '1px solid var(--border-soft)',
            borderRadius: 8, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <code style={{ color: '#a78bfa', fontSize: 12, flex: 1, wordBreak: 'break-all', lineHeight: 1.5 }}>
              {machineId || 'Cargando...'}
            </code>
            <button
              onClick={copiar}
              title={copiado ? 'Copiado' : 'Copiar ID'}
              style={{
                background: copiado ? 'rgba(74,222,128,0.1)' : 'var(--bg-card)',
                border: `1px solid ${copiado ? 'rgba(74,222,128,0.3)' : 'var(--border-soft)'}`,
                borderRadius: 6, padding: '6px 8px', cursor: 'pointer',
                color: copiado ? '#4ade80' : 'var(--text-muted)',
                flexShrink: 0, display: 'flex', alignItems: 'center',
                transition: 'all 0.2s',
              }}
            >
              {copiado ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        </div>

        {/* Botón cargar */}
        <button
          onClick={cargarArchivo}
          disabled={cargando}
          style={{
            width: '100%', background: '#7c3aed', color: 'white', border: 'none',
            borderRadius: 10, padding: '12px 20px', cursor: cargando ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 14, fontWeight: 600, opacity: cargando ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          <Upload size={16} />
          {cargando ? 'Verificando...' : 'Cargar licencia (.lic)'}
        </button>

        {/* Error */}
        {mensaje && (
          <div style={{
            width: '100%', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13, textAlign: 'center',
          }}>
            {mensaje}
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
