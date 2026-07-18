// Bloque gris con animación "shimmer" para estados de carga.
// La animación se detiene sola con prefers-reduced-motion (regla global en index.css).
export default function Skeleton({ width = '100%', height = 16, radius = 8, style }) {
  return (
    <span
      className="skeleton"
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
    />
  )
}
