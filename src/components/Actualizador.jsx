import { useState, useEffect } from 'react'
import { ModalAlert, ModalConfirm } from './Modal'
import { Loader2 } from 'lucide-react'

export default function Actualizador() {
  const [verificando, setVerificando] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [progreso, setProgreso]       = useState(0)
  const [modalAlert, setModalAlert]   = useState(null)
  const [modalConfirm, setModalConfirm] = useState(null)

  useEffect(() => {
    window.electronAPI.onDownloadProgress((data) => {
      setProgreso(data.percent)
    })

    window.electronAPI.onDownloadComplete(() => {
      setDescargando(false)
      setProgreso(100)
      setModalAlert({
        mensaje: 'Descarga completa. La app se reiniciará automáticamente para instalar la actualización.',
        tipo: 'info'
      })
    })
  }, [])

  const verificar = async () => {
    try {
      setVerificando(true)
      const result = await window.electronAPI.checkUpdate()

      if (result.disponible) {
        setModalConfirm({
          mensaje: `Hay una nueva versión disponible (v${result.version}). ¿Querés descargar e instalar ahora?`,
          onConfirm: async () => {
            setModalConfirm(null)
            setDescargando(true)
            setProgreso(0)
            await window.electronAPI.downloadUpdate()
          }
        })
      } else {
        setModalAlert({ mensaje: 'Ya tenés la última versión instalada.', tipo: 'success' })
      }
    } catch (e) {
      setModalAlert({ mensaje: 'No se pudo verificar actualizaciones. Revisá tu conexión.', tipo: 'error' })
    } finally {
      setVerificando(false)
    }
  }

  const activo = verificando || descargando

  return (
    <>
      {modalAlert && (
        <ModalAlert
          mensaje={modalAlert.mensaje}
          tipo={modalAlert.tipo}
          onClose={() => setModalAlert(null)}
        />
      )}
      {modalConfirm && (
        <ModalConfirm
          mensaje={modalConfirm.mensaje}
          onConfirm={modalConfirm.onConfirm}
          onCancel={() => setModalConfirm(null)}
        />
      )}

      <div style={{ width: '100%', marginTop: 6 }}>

        {/* Barra de progreso */}
        {descargando && (
          <div style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: 'var(--text-muted)',
              fontSize: 12,
              marginBottom: 4
            }}>
              <span>Descargando actualización...</span>
              <span>{progreso}%</span>
            </div>
            <div style={{
              width: '100%',
              height: 6,
              background: 'var(--border-soft)',
              borderRadius: 99,
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progreso}%`,
                height: '100%',
                background: 'var(--accent)',
                borderRadius: 99,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        <button
          onClick={verificar}
          disabled={activo}
          style={{
            width: '100%',
            padding: '7px 12px',
            borderRadius: 20,
            border: '1px solid var(--border-primary)',
            background: activo ? 'var(--bg-main)' : 'var(--accent-soft)',
            color: activo ? 'var(--text-muted)' : 'var(--accent-strong)',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: activo ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {activo && <Loader2 size={16} className="spin" />}
          {descargando
            ? `Descargando... ${progreso}%`
            : verificando
              ? 'Verificando actualizaciones...'
              : 'Buscar actualizaciones'
          }
        </button>
      </div>
    </>
  )
}
