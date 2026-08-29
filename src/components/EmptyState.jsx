import { motion } from 'framer-motion'

// Estado vacío reutilizable: ícono opcional + título + texto de ayuda.
export default function EmptyState({ icono, titulo, texto, padding = '48px 24px' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding, textAlign: 'center', color: 'var(--text-muted)',
      }}>
      {icono && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.35, scale: 1 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.3, delay: 0.05 }}
          style={{ marginBottom: 14 }}>
          {icono}
        </motion.div>
      )}
      {titulo && <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 6 }}>{titulo}</div>}
      {texto && <div style={{ fontSize: 13, maxWidth: 320, lineHeight: 1.5 }}>{texto}</div>}
    </motion.div>
  )
}
