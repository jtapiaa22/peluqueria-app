import { useState } from 'react'
import { ModalAlert, ModalConfirm } from './Modal'

export default function Actualizador() {
  const [verificando, setVerificando] = useState(false)
  const [modalAlert, setModalAlert] = useState(null)
  const [modalConfirm, setModalConfirm] = useState(null)

  const verificar = async () => {
    setVerificando(true)
    try {
      const result = await window.electronAPI.checkUpdate()
      setVerificando(false)
      if (result.disponible) {
        setModalConfirm({
          mensaje: `Hay una nueva versión disponible (v${result.version}). ¿Querés descargar e instalar ahora?`,
          onConfirm: async () => {
            setModalConfirm(null)
            await window.electronAPI.downloadUpdate()
            setModalAlert({ mensaje: 'Descargando actualización... La app se reiniciará automáticamente.', tipo: 'info' })
          }
        })
      } else {
        setModalAlert({ mensaje: 'Ya tenés la última versión instalada.', tipo: 'success' })
      }
    } catch (e) {
      setVerificando(false)
      setModalAlert({ mensaje: 'No se pudo verificar actualizaciones. Revisá tu conexión.', tipo: 'error' })
    }
  }

  return (
    <>
      {modalAlert && <ModalAlert mensaje={modalAlert.mensaje} tipo={modalAlert.tipo} onClose={() => setModalAlert(null)} />}
      {modalConfirm && <ModalConfirm mensaje={modalConfirm.mensaje} onConfirm={modalConfirm.onConfirm} onCancel={() => setModalConfirm(null)} />}
      <button
        className="btn btn-secondary"
        onClick={verificar}
        disabled={verificando}
        style={{ width: '100%', marginTop: 8, fontSize: 12, padding: '7px 14px', opacity: verificando ? 0.6 : 1 }}
      >
        {verificando ? 'Verificando...' : 'Comprobar actualizaciones'}
      </button>
    </>
  )
}