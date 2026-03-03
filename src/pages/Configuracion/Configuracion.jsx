import { useState, useEffect } from 'react'
import { ModalAlert } from '../../components/Modal'
import { Upload, Sun, Moon, Globe, Link, Copy, Check, RefreshCw, Wifi } from 'lucide-react'

export default function Configuracion({ onNombreChange, onLogoChange, tema, onToggleTema }) {
  const [nombreInput, setNombreInput] = useState('')
  const [logoPreview, setLogoPreview] = useState(null)
  const [modalAlert, setModalAlert]   = useState(null)
  const [backups, setBackups]         = useState([])

  // Reservas web
  const [webConfig, setWebConfig]           = useState({ id: '', nombre: '', email: '' })
  const [webPaso, setWebPaso]               = useState('cargando') // 'cargando' | 'sin_config' | 'configurado'
  const [webForm, setWebForm]               = useState({ nombre: '', email: '' })
  const [webVincularId, setWebVincularId]   = useState('')
  const [webModo, setWebModo]               = useState('registrar') // 'registrar' | 'vincular'
  const [webLoading, setWebLoading]         = useState(false)
  const [linkCopiado, setLinkCopiado]       = useState(false)
  const [syncLoading, setSyncLoading]       = useState(false)
  const [syncResultado, setSyncResultado]   = useState(null)

  const webLink = webConfig.id
    ? `https://peluapp-web-6g23.vercel.app/?p=${webConfig.id}`
    : ''

  useEffect(() => {
    window.electronAPI.getNombreApp().then(nombre => setNombreInput(nombre))
    window.electronAPI.listarBackups().then(setBackups)
    window.electronAPI.getLogo().then(logo => { if (logo) setLogoPreview(logo) })
    cargarWebConfig()
  }, [])

  const cargarWebConfig = async () => {
    const cfg = await window.electronAPI.getPeluqueriaConfig()
    setWebConfig(cfg || { id: '', nombre: '', email: '' })
    setWebPaso(cfg?.id ? 'configurado' : 'sin_config')
  }

  const guardarNombre = async () => {
    if (!nombreInput.trim()) return
    const nombreFinal = nombreInput.trim()
    await window.electronAPI.setNombreApp(nombreFinal)
    if (onNombreChange) onNombreChange(nombreFinal)
    setModalAlert({ mensaje: 'Nombre actualizado correctamente.', tipo: 'success' })
  }

  const subirLogo = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const archivo = e.target.files[0]
      if (!archivo) return
      const result = await window.electronAPI.setLogo(archivo.path)
      if (result.ok) {
        const logoData = await window.electronAPI.getLogo()
        setLogoPreview(logoData)
        if (onLogoChange) onLogoChange(logoData)
        setModalAlert({ mensaje: 'Logo actualizado correctamente.', tipo: 'success' })
      } else {
        setModalAlert({ mensaje: 'Error al subir el logo.', tipo: 'error' })
      }
    }
    input.click()
  }

  const quitarLogo = async () => {
    await window.electronAPI.setLogo(null)
    setLogoPreview(null)
    if (onLogoChange) onLogoChange(null)
    setModalAlert({ mensaje: 'Logo eliminado correctamente.', tipo: 'success' })
  }

  const registrarPeluqueria = async () => {
    if (!webForm.nombre.trim()) { setModalAlert({ mensaje: 'Ingresá el nombre de la peluquería.', tipo: 'warning' }); return }
    if (!webForm.email.trim() || !webForm.email.includes('@')) { setModalAlert({ mensaje: 'Ingresá un email válido.', tipo: 'warning' }); return }
    setWebLoading(true)
    const result = await window.electronAPI.registrarPeluqueria({ nombre: webForm.nombre.trim(), email: webForm.email.trim() })
    if (result.ok) {
      await cargarWebConfig()
      setModalAlert({ mensaje: '¡Peluquería registrada! Ya podés compartir el link con tus clientes.', tipo: 'success' })
    } else {
      setModalAlert({ mensaje: 'Error al registrar: ' + (result.error || 'Intentá de nuevo.'), tipo: 'error' })
    }
    setWebLoading(false)
  }

  const vincularPeluqueria = async () => {
    if (!webVincularId.trim()) { setModalAlert({ mensaje: 'Ingresá el ID de la peluquería.', tipo: 'warning' }); return }
    setWebLoading(true)
    const result = await window.electronAPI.vincularPeluqueria({ peluqueriaId: webVincularId.trim() })
    if (result.ok) {
      await cargarWebConfig()
      setModalAlert({ mensaje: 'Peluquería vinculada correctamente.', tipo: 'success' })
    } else {
      setModalAlert({ mensaje: 'Error al vincular: ' + (result.error || 'ID no encontrado.'), tipo: 'error' })
    }
    setWebLoading(false)
  }

  const sincronizar = async () => {
    setSyncLoading(true)
    setSyncResultado(null)

    const result = await window.electronAPI.sincronizarPeluqueria()
    setSyncLoading(false)

    if (result.ok) {
      setSyncResultado({
        ok: true,
        msg: `✅ Sincronizado: ${result.peluqueros} peluqueros, ${result.servicios} servicios, ${result.turnos} turnos`
      })
    } else {
      setSyncResultado({ ok: false, msg: '❌ Error: ' + result.error })
    }

    setTimeout(() => setSyncResultado(null), 5000)
  }


  const copiarLink = () => {
    navigator.clipboard.writeText(webLink)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 2000)
  }

  return (
    <div className="page-animation">
      {modalAlert && (
        <ModalAlert mensaje={modalAlert.mensaje} tipo={modalAlert.tipo} onClose={() => setModalAlert(null)} />
      )}

      <h1 className="page-title">Configuración</h1>

      {/* ── APARIENCIA ── */}
      <div className="card" style={{ maxWidth: 500 }}>
        <h3 style={{ color: '#a78bfa', marginBottom: 16 }}>Apariencia</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-main)' }}>
              {tema === 'dark' ? 'Modo oscuro' : 'Modo claro'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {tema === 'dark' ? 'Cambiá a modo claro si preferís fondo blanco.' : 'Cambiá a modo oscuro para reducir el brillo.'}
            </div>
          </div>
          <button onClick={onToggleTema}
            style={{ display:'flex', alignItems:'center', gap:8, background:'var(--accent-soft)', border:'1px solid var(--border-primary)', borderRadius:99, padding:'8px 16px', cursor:'pointer', color:tema==='dark'?'#c4b5fd':'#6d28d9', fontWeight:600, fontSize:14, transition:'all 0.2s ease' }}>
            {tema === 'dark' ? <><Moon size={16} /> Oscuro</> : <><Sun size={16} /> Claro</>}
          </button>
        </div>
      </div>

      {/* ── NOMBRE ── */}
      <div className="card" style={{ maxWidth: 500 }}>
        <h3 style={{ color: '#a78bfa', marginBottom: 16 }}>Nombre de la barbería</h3>
        <div className="form-group">
          <label>Nombre que aparece en el sidebar</label>
          <input className="input" value={nombreInput} onChange={e => setNombreInput(e.target.value)} placeholder="Ej: Barbería El Jefe" />
        </div>
        <button className="btn btn-primary" onClick={guardarNombre}>Guardar</button>
      </div>

      {/* ── LOGO ── */}
      <div className="card" style={{ maxWidth: 500 }}>
        <h3 style={{ color: '#a78bfa', marginBottom: 8 }}>Logo de la barbería</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
          Aparece en el sidebar en lugar del ícono de tijeras. Recomendado: imagen cuadrada PNG.
        </p>
        {logoPreview && (
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src={logoPreview} style={{ width:64, height:64, borderRadius:10, objectFit:'cover', border:'1px solid var(--border-soft)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: '#4ade80', fontSize: 13 }}>✅ Logo cargado</span>
              <button className="btn btn-danger" onClick={quitarLogo} style={{ fontSize:12, padding:'6px 12px' }}>Quitar logo</button>
            </div>
          </div>
        )}
        <button className="btn btn-secondary" onClick={subirLogo}>
          <Upload size={14} style={{ marginRight: 8 }} />
          {logoPreview ? 'Cambiar logo' : 'Subir logo'}
        </button>
      </div>

      {/* ── BACKUPS ── */}
      <div className="card" style={{ maxWidth: 500 }}>
        <h3 style={{ color: '#a78bfa', marginBottom: 8 }}>Backups automáticos</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          Se genera uno automáticamente cada vez que abrís la app. Se conservan los últimos 7.
        </p>
        <button className="btn btn-secondary" onClick={() => window.electronAPI.abrirCarpetaBackup()}>
          Abrir carpeta de backups
        </button>
        {backups.length > 0 && (
          <table className="table" style={{ marginTop: 16 }}>
            <thead><tr><th>Archivo</th><th>Fecha</th></tr></thead>
            <tbody>
              {backups.map(b => (
                <tr key={b.nombre}>
                  <td style={{ fontSize: 12, color: 'var(--text-soft)' }}>{b.nombre}</td>
                  <td style={{ fontSize: 12 }}>{b.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── RESERVAS WEB ── */}
      <div className="card" style={{ maxWidth: 500 }}>
        <h3 style={{ color: '#a78bfa', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={18} /> Reservas Web
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
          Conectá esta app a la web para que tus clientes puedan reservar turnos online.
        </p>

        {/* CARGANDO */}
        {webPaso === 'cargando' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
            <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Cargando...
          </div>
        )}

        {/* SIN CONFIGURAR */}
        {webPaso === 'sin_config' && (
          <div>
            {/* Selector registrar / vincular */}
            <div style={{ display: 'flex', background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 8, overflow: 'hidden', marginBottom: 20, maxWidth: 300 }}>
              {[
                { key: 'registrar', label: 'Registrar nueva' },
                { key: 'vincular',  label: 'Ya tengo ID'     },
              ].map(op => (
                <button key={op.key} onClick={() => setWebModo(op.key)}
                  style={{ flex:1, padding:'8px 12px', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.15s',
                    background: webModo===op.key ? 'var(--accent)' : 'transparent',
                    color: webModo===op.key ? 'white' : 'var(--text-muted)'
                  }}>
                  {op.label}
                </button>
              ))}
            </div>

            {/* Formulario registrar */}
            {webModo === 'registrar' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
                  Registrá esta peluquería en el sistema. Se generará un ID único y un link para compartir con tus clientes.
                </p>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Nombre de la peluquería</label>
                  <input className="input" value={webForm.nombre} onChange={e => setWebForm({ ...webForm, nombre: e.target.value })}
                    placeholder="Ej: Barbería El Jefe" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Email de contacto</label>
                  <input className="input" type="email" value={webForm.email} onChange={e => setWebForm({ ...webForm, email: e.target.value })}
                    placeholder="tu@email.com" />
                </div>
                <button className="btn btn-primary" onClick={registrarPeluqueria} disabled={webLoading}>
                  {webLoading ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }} /> Registrando...</> : '🌐 Registrar y obtener link'}
                </button>
              </div>
            )}

            {/* Formulario vincular */}
            {webModo === 'vincular' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
                  Si ya registraste esta peluquería en otra PC, pegá el ID para vincular esta instalación.
                </p>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>ID de la peluquería</label>
                  <input className="input" value={webVincularId} onChange={e => setWebVincularId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style={{ fontFamily:'monospace', fontSize:12 }} />
                </div>
                <button className="btn btn-primary" onClick={vincularPeluqueria} disabled={webLoading}>
                  {webLoading ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }} /> Vinculando...</> : '🔗 Vincular'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* CONFIGURADO */}
        {webPaso === 'configurado' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Estado conectado */}
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:10, padding:'10px 14px' }}>
              <Wifi size={16} color="#4ade80" />
              <span style={{ color:'#4ade80', fontWeight:600, fontSize:13 }}>Conectado a la web</span>
              <span style={{ color:'var(--text-muted)', fontSize:12, marginLeft:4 }}>— {webConfig.nombre}</span>
            </div>

            {/* Botón sincronizar */}
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <button className="btn btn-secondary" onClick={sincronizar} disabled={syncLoading}
                style={{ display:'flex', alignItems:'center', gap:7, fontSize:13 }}>
                <RefreshCw size={14} style={{ animation:syncLoading?'spin 1s linear infinite':'none' }} />
                {syncLoading ? 'Sincronizando...' : 'Sincronizar datos con la web'}
              </button>
              {syncResultado && (
                <span style={{ fontSize:12, color: syncResultado.ok ? '#4ade80' : '#f87171' }}>
                  {syncResultado.msg}
                </span>
              )}
            </div>
            <p style={{ color:'var(--text-muted)', fontSize:11, margin:'-8px 0 0' }}>
              Sube tus peluqueros, servicios y turnos manuales a la web. Hacelo cada vez que agregues algo nuevo.
            </p>

            {/* ID */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>ID de tu peluquería</label>
              <input className="input" readOnly value={webConfig.id}
                style={{ fontFamily:'monospace', fontSize:11, color:'var(--text-muted)', cursor:'text' }} />
              <span style={{ fontSize:11, color:'var(--text-muted)', marginTop:4, display:'block' }}>
                Guardá este ID para vincular otras PCs con la misma instalación.
              </span>
            </div>

            {/* Link para compartir */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Link size={13} /> Link para compartir con tus clientes
              </label>
              <div style={{ display:'flex', gap:8 }}>
                <input className="input" readOnly value={webLink}
                  style={{ fontSize:12, color:'#a78bfa', cursor:'text', flex:1 }} />
                <button className="btn btn-secondary" onClick={copiarLink} style={{ flexShrink:0, gap:6 }}>
                  {linkCopiado ? <><Check size={14} color="#4ade80" /> Copiado</> : <><Copy size={14} /> Copiar</>}
                </button>
              </div>
              <span style={{ fontSize:11, color:'var(--text-muted)', marginTop:4, display:'block' }}>
                Compartí este link por WhatsApp, Instagram o donde quieras. Cada cliente puede reservar desde ahí.
              </span>
            </div>

            {/* Botón desvincular */}
            <div style={{ paddingTop: 4, borderTop: '1px solid var(--border-soft)' }}>
              <p style={{ color:'var(--text-muted)', fontSize:12, margin:'0 0 10px' }}>
                Si querés conectar otra peluquería a esta PC, podés desvincular la actual. Los datos de la web no se borran.
              </p>
              <button className="btn btn-secondary"
                onClick={() => {
                  setWebConfig({ id:'', nombre:'', email:'' })
                  setWebPaso('sin_config')
                  setWebModo('vincular')
                  window.electronAPI.setConfig({ clave:'peluqueria_id',    valor:'' })
                  window.electronAPI.setConfig({ clave:'peluqueria_nombre', valor:'' })
                  window.electronAPI.setConfig({ clave:'peluqueria_email',  valor:'' })
                }}
                style={{ fontSize:12 }}>
                Desvincular esta peluquería
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
