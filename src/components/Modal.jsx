import { motion } from "framer-motion"

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
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          borderRadius: 14,
          padding: 30,
          width: 380
        }}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <p style={{ color: 'var(--text-main)', marginBottom: 24 }}>
          {mensaje}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={onConfirm}>Confirmar</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function ModalAlert({ mensaje, tipo = 'info', onClose }) {
  const colores = {
    success: { bg: 'rgba(74, 222, 128, 0.1)',  border: 'rgba(74, 222, 128, 0.35)',  color: '#4ade80', icono: '✅' },
    warning: { bg: 'rgba(251, 191, 36, 0.1)',  border: 'rgba(251, 191, 36, 0.35)',  color: '#fbbf24', icono: '⚠️' },
    error:   { bg: 'rgba(248, 113, 113, 0.1)', border: 'rgba(248, 113, 113, 0.35)', color: '#f87171', icono: '❌' },
    info:    { bg: 'rgba(96, 165, 250, 0.1)',  border: 'rgba(96, 165, 250, 0.35)',  color: '#60a5fa', icono: 'ℹ️' },
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
