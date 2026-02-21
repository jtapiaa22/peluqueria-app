import { useState, useEffect } from 'react'
import { ModalAlert } from '../../components/Modal'
import { Upload } from 'lucide-react'

export default function Configuracion({ onNombreChange, onLogoChange }) {
  const [nombreGuardado, setNombreGuardado] = useState('')
  const [nombreInput, setNombreInput] = useState('')
  const [logoPreview, setLogoPreview] = useState(null)
  const [modalAlert, setModalAlert] = useState(null)

  useEffect(() => {
    window.electronAPI.getNombreApp().then(setNombreGuardado)
    window.electronAPI.getLogo().then(logo => {
      if (logo) setLogoPreview(logo)
    })
  }, [])

  const guardarNombre = async () => {
    if (!nombreInput.trim()) return
    const nombreFinal = nombreInput.trim()
    await window.electronAPI.setNombreApp(nombreFinal)
    if (onNombreChange) onNombreChange(nombreFinal)

    setNombreInput('')
    setModalAlert({ mensaje: 'Nombre actualizado correctamente.', tipo: 'success' })
    }


  const subirLogo = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const archivo = e.target.files[0]
      if (!archivo) return
      const result = await window.electronAPI.setLogo(archivo.path)
      if (result.ok) {
        const logoData = await window.electronAPI.getLogo()
        setLogoPreview(logoData)
        if (onLogoChange) onLogoChange(logoData)
        setModalAlert({ mensaje: 'Logo actualizado correctamente.', tipo: 'success' })
      } else {
        setModalAlert({ mensaje: 'Error al subir el logo.', tipo: 'error' })
      }
    }
    input.click()
  }

  const quitarLogo = async () => {
    await window.electronAPI.setLogo(null)
    setLogoPreview(null)
    if (onLogoChange) onLogoChange(null)
    setModalAlert({ mensaje: 'Logo eliminado correctamente.', tipo: 'success' })
  }

  return (
    <div className='page-animation'>
      {modalAlert && (
        <ModalAlert mensaje={modalAlert.mensaje} tipo={modalAlert.tipo} onClose={() => setModalAlert(null)} />
      )}
      <h1 className="page-title">Configuración</h1>

      <div className="card" style={{ maxWidth: 500 }}>
        <h3 style={{ color: '#a78bfa', marginBottom: 16 }}>Nombre de la barbería</h3>
        <div className="form-group">
          <label>Nombre que aparece en el sidebar</label>
          <input
            className="input"
            value={nombreInput}
            onChange={e => setNombreInput(e.target.value)}
            placeholder="Ej: Barbería El Jefe"
          />

        </div>
        <button className="btn btn-primary" onClick={guardarNombre}>Guardar</button>
      </div>

      <div className="card" style={{ maxWidth: 500 }}>
        <h3 style={{ color: '#a78bfa', marginBottom: 8 }}>Logo de la barbería</h3>
        <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
          Aparece en el sidebar en lugar del ícono de tijeras. Recomendado: imagen cuadrada PNG.
        </p>

        {logoPreview && (
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <img
              src={logoPreview}
              style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', border: '1px solid #2a2a2a' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: '#4ade80', fontSize: 13 }}>✅ Logo cargado</span>
              <button className="btn btn-danger" onClick={quitarLogo} style={{ fontSize: 12, padding: '6px 12px' }}>
                Quitar logo
              </button>
            </div>
          </div>
        )}

        <button className="btn btn-secondary" onClick={subirLogo}>
          <Upload size={14} style={{ marginRight: 8 }} />
          {logoPreview ? 'Cambiar logo' : 'Subir logo'}
        </button>
      </div>
    </div>
  )
}