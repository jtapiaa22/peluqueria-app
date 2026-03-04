import { useState, useEffect } from 'react'
import { ShieldX, Upload, Copy, Check } from 'lucide-react'

export default function Licencia({ onActivada }) {
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [machineId, setMachineId] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    window.electronAPI.getMachineId().then(setMachineId)
  }, [])

  const copiar = () => {
    navigator.clipboard.writeText(machineId)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const cargarArchivo = async () => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.lic'
      input.onchange = async (e) => {
        const archivo = e.target.files[0]
        if (!archivo) return
        setCargando(true)
        const resultado = await window.electronAPI.cargarLicencia(archivo.path)
        setCargando(false)
        if (resultado.valida) {
          onActivada()
        } else {
          setMensaje(resultado.mensaje)
        }
      }
      input.click()
    } catch {
      setMensaje('Error al cargar el archivo.')
      setCargando(false)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:16, padding:32 }}>
      <ShieldX size={48} color="#ef4444" />
      <h2 style={{ color:'white', fontSize:20, fontWeight:'bold' }}>Licencia no activada</h2>
      <p style={{ color:'#a1a1aa', textAlign:'center' }}>
        Enviá tu <strong style={{ color:'white' }}>ID de máquina</strong> junto al pago para recibir tu licencia.
      </p>

      {/* ID de máquina */}
      <div style={{ background:'#18181b', border:'1px solid #3f3f46', borderRadius:8, padding:'10px 14px', display:'flex', alignItems:'center', gap:10, maxWidth:480, width:'100%' }}>
        <code style={{ color:'#a78bfa', fontSize:12, flex:1, wordBreak:'break-all' }}>{machineId || 'Cargando...'}</code>
        <button onClick={copiar} style={{ background:'none', border:'none', cursor:'pointer', color: copiado ? '#4ade80' : '#71717a' }}>
          {copiado ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      <button onClick={cargarArchivo} disabled={cargando} style={{ background:'#7c3aed', color:'white', border:'none', borderRadius:8, padding:'10px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
        <Upload size={16} />
        {cargando ? 'Verificando...' : 'Cargar licencia (.lic)'}
      </button>

      {mensaje && <p style={{ color:'#f87171', fontSize:13 }}>{mensaje}</p>}
      <p style={{ color:'#52525b', fontSize:12 }}>PeluApp — contactá al soporte para activar tu licencia</p>
    </div>
  )
}
