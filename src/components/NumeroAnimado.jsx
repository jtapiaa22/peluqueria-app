import { motion, useMotionValue, useTransform, useReducedMotion, animate } from 'framer-motion'
import { useEffect } from 'react'

// Los totales/montos de Dashboard, Caja, Reportes, etc. saltaban de golpe al
// nuevo valor en cada cambio de filtro o al guardar algo. Esto los hace
// "contar" hasta el valor nuevo, igual que ya se anima todo lo interactivo en
// el resto de la app (Modal, Toast).
//
// Nota: es una duración fija (tween), no un spring físico. Un spring recorre
// la distancia a una velocidad que depende de esa distancia — para montos
// grandes (los totales de Dashboard son los más altos de toda la app) eso
// significa pasar por miles de valores intermedios en fracciones de segundo,
// lo que se ve como un parpadeo/vibración en vez de un conteo prolijo. Con
// duración fija, un conteo de 5 y uno de 45.000 tardan lo mismo y se sienten
// igual de tranquilos.
export default function NumeroAnimado({ valor, formatear = (n) => n.toLocaleString('es-AR'), style }) {
  const numero = Number(valor) || 0
  // Arranca en 0, no en el valor final: varias pantallas (Dashboard, Reportes,
  // Caja, Comparaciones) desmontan y vuelven a montar esta tarjeta completa
  // cada vez que recargan datos, así que si arrancara ya en `numero` nunca se
  // vería contar — nacería "parado" en el valor final. Arrancando en 0 se ve
  // el conteo tanto la primera vez que aparece como en cada recarga.
  const motionValue = useMotionValue(0)
  const texto = useTransform(motionValue, (latest) => formatear(Math.round(latest)))
  const prefiereReducido = useReducedMotion()

  useEffect(() => {
    if (prefiereReducido) { motionValue.jump(numero); return }
    const controls = animate(motionValue, numero, { duration: 0.6, ease: [0.23, 1, 0.32, 1] })
    return () => controls.stop()
  }, [numero, prefiereReducido])

  return <motion.span style={style}>{texto}</motion.span>
}
