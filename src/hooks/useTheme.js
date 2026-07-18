import { useEffect, useState } from 'react'

export const PALETAS_VALIDAS = ['turquesa', 'violeta', 'esmeralda', 'rosa', 'ambar']

export function useTheme() {
  const [tema, setTema] = useState(() => {
    return localStorage.getItem('tema') || 'dark'
  })

  const [paleta, setPaleta] = useState(() => {
    const guardada = localStorage.getItem('paleta')
    return PALETAS_VALIDAS.includes(guardada) ? guardada : 'turquesa'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    localStorage.setItem('tema', tema)
  }, [tema])

  useEffect(() => {
    document.documentElement.setAttribute('data-palette', paleta)
    localStorage.setItem('paleta', paleta)
  }, [paleta])

  const toggleTema = () => setTema(t => t === 'dark' ? 'light' : 'dark')
  const cambiarPaleta = (p) => { if (PALETAS_VALIDAS.includes(p)) setPaleta(p) }

  return { tema, toggleTema, paleta, cambiarPaleta }
}
