import { motion } from "framer-motion";

export function ModalConfirm({ mensaje, onConfirm, onCancel }) {
  return (
    <motion.div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: 14,
          padding: 30,
          width: 380
        }}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <p style={{ color: '#f0f0f0', marginBottom: 24 }}>
          {mensaje}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}


export function ModalAlert({ mensaje, tipo = 'info', onClose }) {
  const colores = {
    success: { bg: '#052e16', border: '#166534', color: '#4ade80', icono: '✅' },
    warning: { bg: '#2d1a00', border: '#92400e', color: '#fbbf24', icono: '⚠️' },
    error: { bg: '#2d0000', border: '#991b1b', color: '#f87171', icono: '❌' },
    info: { bg: '#0f172a', border: '#1e3a5f', color: '#60a5fa', icono: 'ℹ️' },
  }
  const c = colores[tipo]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    }}>
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: 30, width: 380 }}>
        <p style={{ color: c.color, fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>
          {c.icono} {mensaje}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>Aceptar</button>
        </div>
      </div>
    </div>
  )
}

