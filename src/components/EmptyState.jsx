// Estado vacío reutilizable: ícono opcional + título + texto de ayuda.
export default function EmptyState({ icono, titulo, texto, padding = '48px 24px' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding, textAlign: 'center', color: 'var(--text-muted)',
    }}>
      {icono && <div style={{ opacity: 0.35, marginBottom: 14 }}>{icono}</div>}
      {titulo && <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 6 }}>{titulo}</div>}
      {texto && <div style={{ fontSize: 13, maxWidth: 320, lineHeight: 1.5 }}>{texto}</div>}
    </div>
  )
}
