import { useEffect, useState } from 'react'

export function useTheme() {
  const [tema, setTema] = useState(() => {
    return localStorage.getItem('tema') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    localStorage.setItem('tema', tema)
  }, [tema])

  const toggleTema = () => setTema(t => t === 'dark' ? 'light' : 'dark')

  return { tema, toggleTema }
}
