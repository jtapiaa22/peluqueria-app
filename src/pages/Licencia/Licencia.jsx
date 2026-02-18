import { useState } from 'react'
import { ShieldCheck, ShieldX, Upload } from 'lucide-react'

export default function Licencia({ onActivada }) {
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

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
    } catch (e) {
      setMensaje('Error al cargar el archivo.')
      setCargando(false)
    }
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0f0f0f'
    }}>
      <div style={{
        background: '#1a1a1a', border: '1px solid #2a2a2a',
        borderRadius: 16, padding: 40, width: 420, textAlign: 'center'
      }}>
        <ShieldX size={52} style={{ color: '#f87171', marginBottom: 16 }} />
        <h2 style={{ color: '#f0f0f0', marginBottom: 8 }}>Licencia requerida</h2>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          Tu licencia ha vencido o no está activada.<br />
          Cargá el archivo <strong style={{ color: '#a78bfa' }}>.lic</strong> que te enviamos para continuar.
        </p>
        <button className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15 }} onClick={cargarArchivo} disabled={cargando}>
          <Upload size={16} style={{ marginRight: 8 }} />
          {cargando ? 'Verificando...' : 'Cargar archivo de licencia'}
        </button>
        {mensaje && (
          <p style={{ color: '#f87171', fontSize: 13, marginTop: 16 }}>{mensaje}</p>
        )}
        <p style={{ color: '#333', fontSize: 12, marginTop: 24 }}>
          PeluApp — contactá al soporte para renovar tu licencia
        </p>
      </div>
    </div>
  )
}