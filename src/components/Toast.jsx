import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'

const ToastContext = createContext(null)

const ESTILOS = {
  success: { color: '#4ade80', border: 'rgba(74, 222, 128, 0.4)',  Icono: CheckCircle2 },
  warning: { color: '#fbbf24', border: 'rgba(251, 191, 36, 0.4)',  Icono: AlertTriangle },
  error:   { color: '#f87171', border: 'rgba(248, 113, 113, 0.4)', Icono: XCircle },
  info:    { color: '#60a5fa', border: 'rgba(96, 165, 250, 0.4)',  Icono: Info },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const quitar = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const toast = useCallback((mensaje, tipo = 'success', duracion = 2800) => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, mensaje, tipo }])
    setTimeout(() => quitar(id), duracion)
  }, [quitar])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 3000,
        display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none',
      }}>
        <AnimatePresence>
          {toasts.map(t => {
            const e = ESTILOS[t.tipo] || ESTILOS.info
            const Icono = e.Icono
            return (
              <motion.div key={t.id}
                initial={{ opacity: 0, x: 40, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.9 }}
                transition={{ type: 'spring', duration: 0.4, bounce: 0.25 }}
                onClick={() => quitar(t.id)}
                style={{
                  pointerEvents: 'auto', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--bg-card)', border: `1px solid ${e.border}`,
                  borderLeft: `3px solid ${e.color}`,
                  borderRadius: 10, padding: '12px 16px', minWidth: 240, maxWidth: 360,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                }}>
                <Icono size={18} color={e.color} style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-main)', fontSize: 14, fontWeight: 500 }}>{t.mensaje}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext) || (() => {})
}
