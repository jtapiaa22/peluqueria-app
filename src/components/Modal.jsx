import { motion } from "framer-motion"
import { CircleCheck, TriangleAlert, CircleX, Info } from 'lucide-react'

const SPRING = { type: 'spring', duration: 0.35, bounce: 0.18 }
const EASE_OUT = { duration: 0.18, ease: [0.23, 1, 0.32, 1] }

export function ModalConfirm({ mensaje, onConfirm, onCancel }) {
  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          borderRadius: 14, padding: 30, width: 380,
        }}
        initial={{ scale: 0.95, opacity: 0, y: 8 }}
        animate={{ scale: 1,    opacity: 1, y: 0 }}
        exit={{    scale: 0.95, opacity: 0, y: 4 }}
        transition={SPRING}
      >
        <p style={{ color: 'var(--text-main)', marginBottom: 24, lineHeight: 1.55 }}>
          {mensaje}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary"   onClick={onConfirm}>Confirmar</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function ModalAlert({ mensaje, tipo = 'info', onClose }) {
  const colores = {
    success: { bg: 'color-mix(in srgb, var(--success) 10%, transparent)',  border: 'color-mix(in srgb, var(--success) 35%, transparent)',  color: 'var(--success)', Icono: CircleCheck },
    warning: { bg: 'color-mix(in srgb, var(--warning) 10%, transparent)',  border: 'color-mix(in srgb, var(--warning) 35%, transparent)',  color: 'var(--warning)', Icono: TriangleAlert },
    error:   { bg: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: 'color-mix(in srgb, var(--danger) 35%, transparent)', color: 'var(--danger)', Icono: CircleX },
    info:    { bg: 'color-mix(in srgb, var(--info) 10%, transparent)',  border: 'color-mix(in srgb, var(--info) 35%, transparent)',  color: 'var(--info)', Icono: Info },
  }
  const c = colores[tipo]

  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: 30, width: 380 }}
        initial={{ scale: 0.95, opacity: 0, y: 8 }}
        animate={{ scale: 1,    opacity: 1, y: 0 }}
        exit={{    scale: 0.95, opacity: 0, y: 4 }}
        transition={SPRING}
      >
        <p style={{ color: c.color, fontSize: 15, marginBottom: 24, lineHeight: 1.55, display: 'flex', alignItems: 'center', gap: 10 }}>
          <c.Icono size={20} style={{ flexShrink: 0 }} /> {mensaje}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>Aceptar</button>
        </div>
      </motion.div>
    </motion.div>
  )
}
