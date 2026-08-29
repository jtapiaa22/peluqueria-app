import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ModalAlert, ModalConfirm } from './Modal'
import { Loader2, Sparkles } from 'lucide-react'

export default function Actualizador() {
  const [verificando, setVerificando] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [progreso, setProgreso]       = useState(0)
  const [modalAlert, setModalAlert]   = useState(null)
  const [modalConfirm, setModalConfirm] = useState(null)
  // Versión detectada en el chequeo automático de arranque — antes había que
  // acordarse de tocar "Buscar actualizaciones" vos mismo (o que Jorge te
  // avise por WhatsApp) para enterarte de que hay una nueva.
  const [updateDisponible, setUpdateDisponible] = useState(null)

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

    // Antes, si la descarga fallaba (404, hash que no matchea, etc.) esto se
    // quedaba mostrando "Descargando... 0%" para siempre, sin decir nada.
    window.electronAPI.onDownloadError((data) => {
      setDescargando(false)
      setProgreso(0)
      setModalAlert({
        mensaje: `No se pudo descargar la actualización: ${data.mensaje}`,
        tipo: 'error'
      })
    })

    // Chequeo silencioso al abrir la app: si falla (sin internet, etc.) no
    // molesta con un error — el botón de abajo sigue disponible para
    // verificar a mano cuando quiera.
    window.electronAPI.checkUpdate()
      .then(result => { if (result?.disponible) setUpdateDisponible({ version: result.version }) })
      .catch(() => {})
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

      <div style={{ width: '100%', marginTop: 2 }}>

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

        {updateDisponible && !activo ? (
          <motion.button
            onClick={verificar}
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(var(--danger-rgb), 0.45)',
                '0 0 0 6px rgba(var(--danger-rgb), 0)',
              ],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            style={{
              width: '100%',
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid var(--danger)',
              background: 'color-mix(in srgb, var(--danger) 14%, transparent)',
              color: 'var(--danger)',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <Sparkles size={14} />
            Actualización disponible (v{updateDisponible.version})
          </motion.button>
        ) : (
          <button
            onClick={verificar}
            disabled={activo}
            style={{
              width: '100%',
              padding: '5px 12px',
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
        )}
      </div>
    </>
  )
}
