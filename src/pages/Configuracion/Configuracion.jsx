import { useState, useEffect } from 'react'
import { ModalAlert } from '../../components/Modal'
import { Upload, Sun, Moon, Globe, Link, Copy, Check, RefreshCw, Wifi, Clock, Pencil, HardDrive, Palette, DollarSign, CalendarDays, Shield, Lock, Unlock, Eye, EyeOff, Trash2 } from 'lucide-react'

const HORAS_DISPONIBLES = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00',
]
const DIAS = [
  { num: 1, label: 'Lun' }, { num: 2, label: 'Mar' }, { num: 3, label: 'Mié' },
  { num: 4, label: 'Jue' }, { num: 5, label: 'Vie' }, { num: 6, label: 'Sáb' },
  { num: 0, label: 'Dom' },
]

const HORARIO_DEFAULT = {
  bloques: [
    { activo: true, inicio: '09:00', fin: '13:00' },
    { activo: false, inicio: '17:00', fin: '20:00' },
  ],
  intervalo: 30,
  dias: [1, 2, 3, 4, 5, 6],
  modo: 'normal',
  fecha_unica: null,
}

export default function Configuracion({ onNombreChange, onLogoChange, tema, onToggleTema }) {
  const [seccion, setSeccion] = useState('apariencia')
  const [nombreInput, setNombreInput] = useState('')
  const [logoPreview, setLogoPreview] = useState(null)
  const [modalAlert, setModalAlert] = useState(null)
  const [backups, setBackups] = useState([])
  const [webConfig, setWebConfig] = useState({ id: '', nombre: '', email: '' })
  const [webPaso, setWebPaso] = useState('cargando')
  const [webForm, setWebForm] = useState({ nombre: '', email: '' })
  const [webVincularId, setWebVincularId] = useState('')
  const [webModo, setWebModo] = useState('registrar')
  const [webLoading, setWebLoading] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResultado, setSyncResultado] = useState(null)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nuevoNombreWeb, setNuevoNombreWeb] = useState('')
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [horario, setHorario] = useState(HORARIO_DEFAULT)
  const [horarioLoading, setHorarioLoading] = useState(false)
  const [horarioGuardado, setHorarioGuardado] = useState(false)
  const [backupNubeLoading, setBackupNubeLoading] = useState(false)
  const [restoreNubeLoading, setRestoreNubeLoading] = useState(false)
  const [ultimoBackupNube, setUltimoBackupNube] = useState(null)
  const [confirmandoRestore, setConfirmandoRestore] = useState(false)
  const [mostrarRestoreModal, setMostrarRestoreModal] = useState(false)
  const [restoreAutoLoading, setRestoreAutoLoading] = useState(false)

  // ── SEÑA ──
  const [senaMonto, setSenaMonto] = useState('')
  const [senaAlias, setSenaAlias] = useState('')
  const [senaHoras, setSenaHoras] = useState('24')
  const [senaLoading, setSenaLoading] = useState(false)
  const [senaGuardada, setSenaGuardada] = useState(false)

  // ── SEGURIDAD ──
  const SECCIONES_PROTEGIBLES = [
    { key: 'password_dashboard', label: 'Dashboard', icono: '📊' },
    { key: 'password_agenda', label: 'Agenda', icono: '📅' },
    { key: 'password_peluqueros', label: 'Peluqueros', icono: '👥' },
    { key: 'password_servicios', label: 'Servicios', icono: '✂️' },
    { key: 'password_atenciones', label: 'Atenciones', icono: '📋' },
    { key: 'password_reportes', label: 'Reportes', icono: '📈' },
    { key: 'password_caja', label: 'Caja', icono: '💰' },
    { key: 'password_liquidacion', label: 'Liquidación', icono: '🔒' },
    { key: 'password_gastos', label: 'Gastos', icono: '📉' },
  ]
  const PREGUNTAS_SEGURIDAD = [
    '¿Nombre de tu primera mascota?',
    '¿En qué ciudad naciste?',
    '¿Cuál es tu comida favorita?',
    '¿Nombre de tu mejor amigo/a de la infancia?',
    '¿Cuál fue tu primer auto o moto?',
    '¿Cómo se llama tu mamá?',
  ]
  const [passwordsSecciones, setPasswordsSecciones] = useState({})
  const [editandoPassword, setEditandoPassword] = useState(null)
  const [passFormSeg, setPassFormSeg] = useState({ nueva: '', repetir: '' })
  const [showPassSeg, setShowPassSeg] = useState(false)

  // Master password state
  const [maestraCargando, setMaestraCargando] = useState(true)
  const [tieneMaestra, setTieneMaestra] = useState(false)
  const [seguridadDesbloqueada, setSeguridadDesbloqueada] = useState(false)
  const [maestraInput, setMaestraInput] = useState('')
  const [maestraError, setMaestraError] = useState('')
  const [showMaestraInput, setShowMaestraInput] = useState(false)

  // Setup master password (first time)
  const [setupMaestra, setSetupMaestra] = useState({ pass: '', repetir: '', pregunta: '', respuesta: '' })
  const [showSetupPass, setShowSetupPass] = useState(false)

  // Recovery flow
  const [modoRecuperacion, setModoRecuperacion] = useState(false)
  const [preguntaActual, setPreguntaActual] = useState('')
  const [respuestaInput, setRespuestaInput] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [recoveryExito, setRecoveryExito] = useState(false)
  const [nuevaMaestraRecovery, setNuevaMaestraRecovery] = useState({ pass: '', repetir: '' })
  const [showRecoveryPass, setShowRecoveryPass] = useState(false)

  const cargarEstadoMaestra = async () => {
    setMaestraCargando(true)
    const val = await window.electronAPI.getConfig('password_maestra')
    setTieneMaestra(!!(val?.valor))
    setMaestraCargando(false)
  }

  const cargarPasswordsSecciones = async () => {
    const result = {}
    for (const s of SECCIONES_PROTEGIBLES) {
      const val = await window.electronAPI.getConfig(s.key)
      result[s.key] = !!(val?.valor)
    }
    setPasswordsSecciones(result)
  }

  const desbloquearMaestra = async () => {
    if (!maestraInput.trim()) return
    const result = await window.electronAPI.getConfig('password_maestra')
    if (result && result.valor === maestraInput) {
      setSeguridadDesbloqueada(true)
      setMaestraInput('')
      setMaestraError('')
      setShowMaestraInput(false)
    } else {
      setMaestraError('Contraseña maestra incorrecta.')
      setMaestraInput('')
    }
  }

  const crearMaestra = async () => {
    if (!setupMaestra.pass.trim()) {
      setModalAlert({ mensaje: 'Ingresá una contraseña maestra.', tipo: 'warning' }); return
    }
    if (setupMaestra.pass !== setupMaestra.repetir) {
      setModalAlert({ mensaje: 'Las contraseñas no coinciden.', tipo: 'error' }); return
    }
    if (!setupMaestra.pregunta) {
      setModalAlert({ mensaje: 'Elegí una pregunta de seguridad.', tipo: 'warning' }); return
    }
    if (!setupMaestra.respuesta.trim()) {
      setModalAlert({ mensaje: 'Ingresá la respuesta a la pregunta de seguridad.', tipo: 'warning' }); return
    }
    await window.electronAPI.setConfig({ clave: 'password_maestra', valor: setupMaestra.pass })
    await window.electronAPI.setConfig({ clave: 'pregunta_seguridad', valor: setupMaestra.pregunta })
    await window.electronAPI.setConfig({ clave: 'respuesta_seguridad', valor: setupMaestra.respuesta.trim().toLowerCase() })
    setTieneMaestra(true)
    setSeguridadDesbloqueada(true)
    setSetupMaestra({ pass: '', repetir: '', pregunta: '', respuesta: '' })
    setShowSetupPass(false)
    setModalAlert({ mensaje: '✅ Contraseña maestra creada. Ya podés proteger las secciones.', tipo: 'success' })
  }

  const iniciarRecuperacion = async () => {
    const preg = await window.electronAPI.getConfig('pregunta_seguridad')
    if (!preg?.valor) {
      setModalAlert({ mensaje: 'No hay pregunta de seguridad configurada. Contactá al soporte.', tipo: 'error' })
      return
    }
    setPreguntaActual(preg.valor)
    setModoRecuperacion(true)
    setRecoveryError('')
    setRecoveryExito(false)
    setRespuestaInput('')
    setNuevaMaestraRecovery({ pass: '', repetir: '' })
    setShowRecoveryPass(false)
  }

  const verificarRespuesta = async () => {
    if (!respuestaInput.trim()) return
    const resp = await window.electronAPI.getConfig('respuesta_seguridad')
    if (resp && resp.valor === respuestaInput.trim().toLowerCase()) {
      setRecoveryExito(true)
      setRecoveryError('')
    } else {
      setRecoveryError('Respuesta incorrecta.')
      setRespuestaInput('')
    }
  }

  const guardarNuevaMaestra = async () => {
    if (!nuevaMaestraRecovery.pass.trim()) {
      setModalAlert({ mensaje: 'Ingresá la nueva contraseña maestra.', tipo: 'warning' }); return
    }
    if (nuevaMaestraRecovery.pass !== nuevaMaestraRecovery.repetir) {
      setModalAlert({ mensaje: 'Las contraseñas no coinciden.', tipo: 'error' }); return
    }
    await window.electronAPI.setConfig({ clave: 'password_maestra', valor: nuevaMaestraRecovery.pass })
    setSeguridadDesbloqueada(true)
    setModoRecuperacion(false)
    setRecoveryExito(false)
    setNuevaMaestraRecovery({ pass: '', repetir: '' })
    setShowRecoveryPass(false)
    setModalAlert({ mensaje: '✅ Contraseña maestra actualizada.', tipo: 'success' })
  }

  const guardarPasswordSeccion = async (key) => {
    if (!passFormSeg.nueva.trim()) {
      setModalAlert({ mensaje: 'Ingresá una contraseña.', tipo: 'warning' }); return
    }
    if (passFormSeg.nueva !== passFormSeg.repetir) {
      setModalAlert({ mensaje: 'Las contraseñas no coinciden.', tipo: 'error' }); return
    }
    await window.electronAPI.setConfig({ clave: key, valor: passFormSeg.nueva })
    setModalAlert({ mensaje: '✅ Contraseña configurada correctamente.', tipo: 'success' })
    setEditandoPassword(null)
    setPassFormSeg({ nueva: '', repetir: '' })
    setShowPassSeg(false)
    await cargarPasswordsSecciones()
  }

  const quitarPasswordSeccion = async (key) => {
    await window.electronAPI.setConfig({ clave: key, valor: '' })
    setModalAlert({ mensaje: '✅ Contraseña eliminada. La sección ya no está protegida.', tipo: 'success' })
    await cargarPasswordsSecciones()
  }

  const webLink = webConfig.id ? `https://servicio-turno-web-peluapp.xyz/?p=${webConfig.id}` : ''

  useEffect(() => {
    window.electronAPI.getNombreApp().then(n => setNombreInput(n))
    window.electronAPI.listarBackups().then(setBackups)
    window.electronAPI.getLogo().then(logo => { if (logo) setLogoPreview(logo) })
    window.electronAPI.getUltimoBackupNube().then(ts => setUltimoBackupNube(ts))
    cargarWebConfig()
    cargarPasswordsSecciones()
    cargarEstadoMaestra()
  }, [])

  const cargarWebConfig = async () => {
    const cfg = await window.electronAPI.getPeluqueriaConfig()
    setWebConfig(cfg || { id: '', nombre: '', email: '' })
    setWebPaso(cfg?.id ? 'configurado' : 'sin_config')
    if (cfg?.horario) setHorario({ ...HORARIO_DEFAULT, ...cfg.horario })
    if (cfg?.nombre) setNuevoNombreWeb(cfg.nombre)
    if (cfg?.sena_monto) setSenaMonto(cfg.sena_monto)
    if (cfg?.sena_alias) setSenaAlias(cfg.sena_alias)
    if (cfg?.sena_horas_vencimiento) setSenaHoras(cfg.sena_horas_vencimiento)
  }

  const guardarNombre = async () => {
    if (!nombreInput.trim()) return
    await window.electronAPI.setNombreApp(nombreInput.trim())
    if (onNombreChange) onNombreChange(nombreInput.trim())
    setModalAlert({ mensaje: 'Nombre actualizado correctamente.', tipo: 'success' })
  }

  const subirLogo = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = async (e) => {
      const archivo = e.target.files[0]; if (!archivo) return
      const result = await window.electronAPI.setLogo(archivo.path)
      if (result.ok) {
        const logoData = await window.electronAPI.getLogo()
        setLogoPreview(logoData)
        if (onLogoChange) onLogoChange(logoData)
        setModalAlert({ mensaje: 'Logo actualizado.', tipo: 'success' })
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
    setModalAlert({ mensaje: 'Logo eliminado.', tipo: 'success' })
  }

  const registrarPeluqueria = async () => {
    if (!webForm.nombre.trim() || !webForm.email.trim()) {
      setModalAlert({ mensaje: 'Completá nombre y email.', tipo: 'warning' }); return
    }
    setWebLoading(true)
    const result = await window.electronAPI.registrarPeluqueria(webForm)
    setWebLoading(false)
    if (result?.ok) {
      await cargarWebConfig()
      setModalAlert({ mensaje: result.yaExistia ? '✅ ID recuperado. Esta peluquería ya estaba registrada.' : '✅ ¡Peluquería registrada! Ya podés compartir tu link.', tipo: 'success' })
      // Chequear si hay backup en la nube
      const backup = await window.electronAPI.existeBackupNube()
      if (backup?.existe) setMostrarRestoreModal(true)
    } else {
      setModalAlert({ mensaje: 'Error: ' + (result?.error || 'Intentá de nuevo.'), tipo: 'error' })
    }
  }

  const vincularPeluqueria = async () => {
    if (!webVincularId.trim()) { setModalAlert({ mensaje: 'Pegá el ID de tu peluquería.', tipo: 'warning' }); return }
    setWebLoading(true)
    const result = await window.electronAPI.vincularPeluqueria({ peluqueriaId: webVincularId.trim() })
    setWebLoading(false)
    if (result?.ok) {
      await cargarWebConfig()
      setModalAlert({ mensaje: '✅ Peluquería vinculada correctamente.', tipo: 'success' })
      // Chequear si hay backup en la nube
      const backup = await window.electronAPI.existeBackupNube()
      if (backup?.existe) setMostrarRestoreModal(true)
    } else {
      setModalAlert({ mensaje: 'Error: ' + (result?.error || 'ID no encontrado.'), tipo: 'error' })
    }
  }

  const copiarLink = async () => {
    await navigator.clipboard.writeText(webLink)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 2000)
  }

  const sincronizar = async () => {
    setSyncLoading(true); setSyncResultado(null)
    const result = await window.electronAPI.sincronizarPeluqueria()
    setSyncLoading(false)
    setSyncResultado(result?.ok
      ? { ok: true, msg: `✅ Sincronizado: ${result.peluqueros} peluqueros, ${result.servicios} servicios.` }
      : { ok: false, msg: '❌ Error al sincronizar. Revisá la conexión.' }
    )
  }

  const guardarNombreWeb = async () => {
    if (!nuevoNombreWeb.trim()) return
    setGuardandoNombre(true)
    await window.electronAPI.actualizarNombreWeb(nuevoNombreWeb.trim())
    setGuardandoNombre(false)
    setEditandoNombre(false)
    setWebConfig(c => ({ ...c, nombre: nuevoNombreWeb.trim() }))
  }

  const toggleDia = (num) => {
    setHorario(h => ({
      ...h,
      dias: h.dias.includes(num) ? h.dias.filter(d => d !== num) : [...h.dias, num]
    }))
  }

  const guardarHorario = async () => {
    const bloquesActivos = horario.bloques.filter(b => b.activo)
    if (horario.modo === 'fecha_unica') {
      if (!horario.fecha_unica) { setModalAlert({ mensaje: 'Seleccioná una fecha.', tipo: 'warning' }); return }
    } else {
      if (horario.dias.length === 0) { setModalAlert({ mensaje: 'Seleccioná al menos un día.', tipo: 'warning' }); return }
    }
    if (bloquesActivos.length === 0) { setModalAlert({ mensaje: 'Activá al menos un bloque horario.', tipo: 'warning' }); return }
    setHorarioLoading(true)
    const result = await window.electronAPI.actualizarHorario(horario)
    setHorarioLoading(false)
    if (result?.ok) {
      setHorarioGuardado(true)
      setTimeout(() => setHorarioGuardado(false), 2500)
    }
    else { setModalAlert({ mensaje: 'Error al guardar: ' + (result.error || 'Intentá de nuevo.'), tipo: 'error' }) }
  }

  const guardarSena = async () => {
    const monto = Number(senaMonto)
    if (monto > 0 && !senaAlias.trim()) {
      setModalAlert({ mensaje: 'Si configurás un monto de seña, tenés que ingresar el alias o CBU.', tipo: 'warning' })
      return
    }
    setSenaLoading(true)
    const result = await window.electronAPI.guardarSena({
      sena_monto: monto || 0,
      sena_alias: senaAlias.trim(),
      sena_horas_vencimiento: Number(senaHoras) || 24,
    })
    setSenaLoading(false)
    if (result?.ok) {
      setSenaGuardada(true)
      setTimeout(() => setSenaGuardada(false), 2500)
    } else {
      setModalAlert({ mensaje: 'Error al guardar seña: ' + (result?.error || 'Intentá de nuevo.'), tipo: 'error' })
    }
  }

  // ── Nav items ──────────────────────────────────────────────────────────────
  const seccionesProtegidas = Object.values(passwordsSecciones).filter(Boolean).length
  const navItems = [
    { id: 'apariencia', label: 'Apariencia', icono: <Palette size={16} /> },
    {
      id: 'seguridad', label: 'Seguridad', icono: <Shield size={16} />,
      badge: seccionesProtegidas > 0 ? String(seccionesProtegidas) : null, badgeColor: '#a78bfa'
    },
    { id: 'backups', label: 'Backups', icono: <HardDrive size={16} /> },
    {
      id: 'web', label: 'Web y Backup', icono: <Globe size={16} />,
      badge: webPaso === 'configurado' ? '●' : null, badgeColor: '#4ade80'
    },
    ...(webPaso === 'configurado' ? [
      { id: 'horario', label: 'Horario web', icono: <Clock size={16} /> },
      { id: 'sena', label: 'Seña', icono: <DollarSign size={16} /> },
    ] : []),
  ]

  return (
    <div className="page-animation">
      {modalAlert && <ModalAlert mensaje={modalAlert.mensaje} tipo={modalAlert.tipo} onClose={() => setModalAlert(null)} />}

      {/* Modal: backup encontrado en la nube */}
      {mostrarRestoreModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-soft)',
            borderRadius: 16, padding: '32px 28px', maxWidth: 440, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>☁️</div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 18, marginBottom: 8 }}>
                Backup encontrado en la nube
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
                Encontramos un backup anterior de esta peluquería. ¿Querés restaurar tus datos o empezar de cero?
              </p>
            </div>

            <div style={{
              background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)',
              borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 13,
              color: 'var(--text-muted)', lineHeight: 1.6,
            }}>
              <strong style={{ color: '#c4b5fd' }}>Restaurar</strong> va a reemplazar los datos actuales con los del backup (peluqueros, servicios, atenciones, gastos, cierres, etc.).<br /><br />
              <strong style={{ color: '#c4b5fd' }}>Empezar de cero</strong> va a mantener la base actual vacía y subir una nueva a la nube.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-primary"
                disabled={restoreAutoLoading}
                onClick={async () => {
                  setRestoreAutoLoading(true)
                  const result = await window.electronAPI.restaurarDesdeNube()
                  setRestoreAutoLoading(false)
                  setMostrarRestoreModal(false)
                  if (result.ok) {
                    setModalAlert({ mensaje: `✅ Datos restaurados: ${result.peluqueros || 0} peluqueros, ${result.servicios || 0} servicios, ${result.atenciones} atenciones, ${result.gastos} gastos, ${result.cierres} cierres.`, tipo: 'success' })
                    await cargarWebConfig()
                  } else {
                    setModalAlert({ mensaje: 'Error al restaurar: ' + result.error, tipo: 'error' })
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 20px' }}>
                {restoreAutoLoading
                  ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Restaurando...</>
                  : '⬇️ Restaurar mis datos'}
              </button>

              <button className="btn btn-secondary"
                disabled={restoreAutoLoading}
                onClick={async () => {
                  setMostrarRestoreModal(false)
                  await window.electronAPI.syncBackupNube()
                  setModalAlert({ mensaje: 'Base nueva creada. El backup anterior fue reemplazado.', tipo: 'success' })
                }}
                style={{ width: '100%', padding: '12px 20px' }}>
                🆕 Empezar de cero
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="page-title">Configuración</h1>

      <div style={{ display: 'flex', gap: 0, minHeight: 500 }}>

        {/* ── SIDEBAR ── */}
        <div style={{
          width: 200, flexShrink: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-soft)',
          borderRadius: '12px 0 0 12px',
          padding: '8px 0',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setSeccion(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', border: 'none', cursor: 'pointer',
                borderRadius: 8, margin: '0 8px',
                background: seccion === item.id ? 'rgba(124,58,237,0.15)' : 'transparent',
                color: seccion === item.id ? '#c4b5fd' : 'var(--text-muted)',
                fontWeight: seccion === item.id ? 600 : 400,
                fontSize: 13, transition: 'all 0.15s',
                textAlign: 'left',
              }}>
              <span style={{ color: seccion === item.id ? '#a78bfa' : 'var(--text-muted)', flexShrink: 0 }}>{item.icono}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && <span style={{ fontSize: 10, color: item.badgeColor }}>{item.badge}</span>}
            </button>
          ))}
        </div>

        {/* ── CONTENIDO ── */}
        <div style={{
          flex: 1,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-soft)',
          borderLeft: 'none',
          borderRadius: '0 12px 12px 0',
          padding: '28px 32px',
          minWidth: 0,
        }}>

          {/* ── APARIENCIA ── */}
          {seccion === 'apariencia' && (
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>Apariencia</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>Personalizá cómo se ve la app.</p>

              {/* Tema */}
              <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 24, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 4 }}>Tema de color</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {tema === 'dark' ? 'Modo oscuro activo. Cambiá a claro si preferís fondo blanco.' : 'Modo claro activo. Cambiá a oscuro para reducir el brillo.'}
                    </div>
                  </div>
                  <button onClick={onToggleTema}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent-soft)', border: '1px solid var(--border-primary)', borderRadius: 99, padding: '9px 18px', cursor: 'pointer', color: tema === 'dark' ? '#c4b5fd' : '#6d28d9', fontWeight: 600, fontSize: 13, flexShrink: 0, marginLeft: 16 }}>
                    {tema === 'dark' ? <><Moon size={15} /> Oscuro</> : <><Sun size={15} /> Claro</>}
                  </button>
                </div>
              </div>

              {/* Nombre app */}
              <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 24, marginBottom: 24 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 4 }}>Nombre de la barbería</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 14 }}>Aparece en el sidebar de la app de escritorio.</div>
                <div style={{ display: 'flex', gap: 10, maxWidth: 380 }}>
                  <input className="input" value={nombreInput} onChange={e => setNombreInput(e.target.value)}
                    placeholder="Ej: Barbería El Jefe" onKeyDown={e => e.key === 'Enter' && guardarNombre()}
                    style={{ flex: 1 }} />
                  <button className="btn btn-primary" onClick={guardarNombre} style={{ flexShrink: 0 }}>Guardar</button>
                </div>
              </div>

              {/* Logo */}
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 4 }}>Logo de la barbería</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>Aparece en el sidebar. Recomendado: imagen cuadrada PNG.</div>
                {logoPreview && (
                  <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <img src={logoPreview} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border-soft)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ color: '#4ade80', fontSize: 12 }}>✅ Logo cargado</span>
                      <button className="btn btn-danger" onClick={quitarLogo} style={{ fontSize: 12, padding: '5px 12px' }}>Quitar logo</button>
                    </div>
                  </div>
                )}
                <button className="btn btn-secondary" onClick={subirLogo}>
                  <Upload size={13} style={{ marginRight: 6 }} />
                  {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                </button>
              </div>
            </div>
          )}

          {/* ── SEGURIDAD ── */}
          {seccion === 'seguridad' && (
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>Seguridad</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
                Protegé con contraseña las secciones que no querés que otros vean.
              </p>

              {/* ── CARGANDO ── */}
              {maestraCargando && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite', marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
                  Cargando...
                </div>
              )}

              {/* ── SETUP: primera vez, crear contraseña maestra ── */}
              {!maestraCargando && !tieneMaestra && (
                <div style={{ maxWidth: 420 }}>
                  <div style={{
                    background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)',
                    borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13,
                    color: 'var(--text-muted)', lineHeight: 1.6,
                  }}>
                    <Shield size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: '#a78bfa' }} />
                    Para proteger las secciones, primero tenés que crear una <strong style={{ color: '#c4b5fd' }}>contraseña maestra</strong>. Es la clave que te va a pedir cada vez que quieras gestionar las contraseñas.
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: 13 }}>Contraseña maestra</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input"
                        type={showSetupPass ? 'text' : 'password'}
                        value={setupMaestra.pass}
                        onChange={e => setSetupMaestra({ ...setupMaestra, pass: e.target.value })}
                        placeholder="••••••••"
                        autoFocus
                        style={{ paddingRight: 40 }}
                      />
                      <button type="button" onClick={() => setShowSetupPass(!showSetupPass)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                        {showSetupPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: 13 }}>Repetir contraseña maestra</label>
                    <input className="input" type={showSetupPass ? 'text' : 'password'} value={setupMaestra.repetir}
                      onChange={e => setSetupMaestra({ ...setupMaestra, repetir: e.target.value })} placeholder="••••••••" />
                  </div>
                  {setupMaestra.pass && setupMaestra.repetir && setupMaestra.pass !== setupMaestra.repetir && (
                    <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>Las contraseñas no coinciden.</div>
                  )}

                  <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 20, marginTop: 20 }}>
                    <div className="form-group">
                      <label style={{ fontSize: 13 }}>Pregunta de seguridad</label>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 8 }}>Por si olvidás la contraseña maestra.</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {PREGUNTAS_SEGURIDAD.map(p => (
                          <button key={p} onClick={() => setSetupMaestra({ ...setupMaestra, pregunta: p })}
                            style={{
                              padding: '9px 14px', borderRadius: 8, border: '1px solid',
                              fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                              borderColor: setupMaestra.pregunta === p ? '#a78bfa' : 'var(--border-soft)',
                              background: setupMaestra.pregunta === p ? 'rgba(167,139,250,0.12)' : 'transparent',
                              color: setupMaestra.pregunta === p ? '#c4b5fd' : 'var(--text-muted)',
                              fontWeight: setupMaestra.pregunta === p ? 600 : 400,
                            }}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {setupMaestra.pregunta && (
                      <div className="form-group">
                        <label style={{ fontSize: 13 }}>Tu respuesta</label>
                        <input className="input" value={setupMaestra.respuesta}
                          onChange={e => setSetupMaestra({ ...setupMaestra, respuesta: e.target.value })}
                          placeholder="Tu respuesta..." />
                        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>No importan mayúsculas/minúsculas.</div>
                      </div>
                    )}
                  </div>

                  <button className="btn btn-primary" onClick={crearMaestra} style={{ marginTop: 16, width: '100%' }}>
                    🔐 Crear contraseña maestra
                  </button>
                </div>
              )}

              {/* ── LOCK: pedir contraseña maestra para entrar ── */}
              {!maestraCargando && tieneMaestra && !seguridadDesbloqueada && !modoRecuperacion && (
                <div style={{ maxWidth: 380, margin: '30px auto' }}>
                  <div className="card" style={{ textAlign: 'center' }}>
                    <Lock size={40} style={{ color: '#a78bfa', marginBottom: 16 }} />
                    <h3 style={{ color: 'var(--text-main)', marginBottom: 8 }}>Contraseña maestra</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                      Ingresá la contraseña maestra para gestionar las contraseñas de las secciones.
                    </p>
                    <div className="form-group" style={{ textAlign: 'left' }}>
                      <label>Contraseña</label>
                      <div style={{ position: 'relative' }}>
                        <input className="input" type={showMaestraInput ? 'text' : 'password'} value={maestraInput}
                          onChange={e => { setMaestraInput(e.target.value); setMaestraError('') }}
                          onKeyDown={e => e.key === 'Enter' && desbloquearMaestra()}
                          placeholder="••••••••" autoFocus style={{ paddingRight: 40 }} />
                        <button type="button" onClick={() => setShowMaestraInput(!showMaestraInput)}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                          {showMaestraInput ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    {maestraError && (
                      <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, color: '#f87171', fontSize: 13, textAlign: 'left' }}>
                        {maestraError}
                      </div>
                    )}
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: 4 }} onClick={desbloquearMaestra}>
                      Ingresar
                    </button>
                    <button onClick={iniciarRecuperacion}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: 12, marginTop: 16, textDecoration: 'underline' }}>
                      Olvidé mi contraseña maestra
                    </button>
                  </div>
                </div>
              )}

              {/* ── RECOVERY: pregunta de seguridad ── */}
              {!maestraCargando && tieneMaestra && !seguridadDesbloqueada && modoRecuperacion && (
                <div style={{ maxWidth: 420, margin: '20px auto' }}>
                  <div className="card">
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>🔑</div>
                      <h3 style={{ color: 'var(--text-main)', marginBottom: 6 }}>Recuperar contraseña maestra</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Respondé la pregunta de seguridad para crear una nueva.</p>
                    </div>

                    {!recoveryExito ? (
                      <>
                        <div style={{
                          background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)',
                          borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 14,
                          color: '#c4b5fd', fontWeight: 600, textAlign: 'center',
                        }}>
                          {preguntaActual}
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: 13 }}>Tu respuesta</label>
                          <input className="input" value={respuestaInput}
                            onChange={e => { setRespuestaInput(e.target.value); setRecoveryError('') }}
                            onKeyDown={e => e.key === 'Enter' && verificarRespuesta()}
                            placeholder="Escribí tu respuesta..." autoFocus />
                          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>No importan mayúsculas/minúsculas.</div>
                        </div>
                        {recoveryError && (
                          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, color: '#f87171', fontSize: 13 }}>
                            {recoveryError}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button className="btn btn-primary" onClick={verificarRespuesta} style={{ flex: 1 }}>Verificar</button>
                          <button className="btn btn-secondary" onClick={() => { setModoRecuperacion(false); setRespuestaInput(''); setRecoveryError('') }}>Cancelar</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, color: '#4ade80', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                          ✅ Respuesta correcta. Creá tu nueva contraseña maestra.
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: 13 }}>Nueva contraseña maestra</label>
                          <div style={{ position: 'relative' }}>
                            <input className="input" type={showRecoveryPass ? 'text' : 'password'} value={nuevaMaestraRecovery.pass}
                              onChange={e => setNuevaMaestraRecovery({ ...nuevaMaestraRecovery, pass: e.target.value })}
                              placeholder="••••••••" autoFocus style={{ paddingRight: 40 }} />
                            <button type="button" onClick={() => setShowRecoveryPass(!showRecoveryPass)}
                              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                              {showRecoveryPass ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: 13 }}>Repetir nueva contraseña</label>
                          <input className="input" type={showRecoveryPass ? 'text' : 'password'} value={nuevaMaestraRecovery.repetir}
                            onChange={e => setNuevaMaestraRecovery({ ...nuevaMaestraRecovery, repetir: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && guardarNuevaMaestra()}
                            placeholder="••••••••" />
                        </div>
                        {nuevaMaestraRecovery.pass && nuevaMaestraRecovery.repetir && nuevaMaestraRecovery.pass !== nuevaMaestraRecovery.repetir && (
                          <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>Las contraseñas no coinciden.</div>
                        )}
                        <button className="btn btn-primary" onClick={guardarNuevaMaestra} style={{ width: '100%' }}>
                          Guardar nueva contraseña maestra
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── DESBLOQUEADO: lista de secciones protegibles ── */}
              {!maestraCargando && tieneMaestra && seguridadDesbloqueada && (
                <div>
                  <div style={{
                    background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
                    borderRadius: 10, padding: '10px 16px', marginBottom: 24, fontSize: 13,
                    color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span><Unlock size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />Contraseña maestra verificada</span>
                    <button onClick={() => { setSeguridadDesbloqueada(false); setMaestraInput('') }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: 12, fontWeight: 600 }}>
                      <Lock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Bloquear
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {SECCIONES_PROTEGIBLES.map((s, idx) => {
                      const tienePass = passwordsSecciones[s.key]
                      const editando = editandoPassword === s.key
                      return (
                        <div key={s.key} style={{
                          borderBottom: idx < SECCIONES_PROTEGIBLES.length - 1 ? '1px solid var(--border-soft)' : 'none',
                          padding: '16px 0',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 18 }}>{s.icono}</span>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14 }}>{s.label}</div>
                                <div style={{ fontSize: 12, color: tienePass ? '#4ade80' : 'var(--text-muted)', marginTop: 2 }}>
                                  {tienePass
                                    ? <><Lock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Protegido con contraseña</>
                                    : <><Unlock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Sin contraseña</>
                                  }
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-secondary"
                                onClick={() => {
                                  if (editando) {
                                    setEditandoPassword(null)
                                    setPassFormSeg({ nueva: '', repetir: '' })
                                    setShowPassSeg(false)
                                  } else {
                                    setEditandoPassword(s.key)
                                    setPassFormSeg({ nueva: '', repetir: '' })
                                    setShowPassSeg(false)
                                  }
                                }}
                                style={{ fontSize: 12, padding: '6px 14px' }}>
                                {editando ? 'Cancelar' : tienePass ? 'Cambiar' : 'Poner contraseña'}
                              </button>
                              {tienePass && !editando && (
                                <button className="btn btn-secondary"
                                  onClick={() => quitarPasswordSeccion(s.key)}
                                  title="Quitar contraseña"
                                  style={{ fontSize: 12, padding: '6px 10px', color: '#f87171' }}>
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>

                          {editando && (
                            <div style={{
                              marginTop: 14, padding: '16px 18px',
                              background: 'var(--bg-main)', border: '1px solid var(--border-soft)',
                              borderRadius: 10,
                            }}>
                              <div style={{ maxWidth: 320 }}>
                                <div className="form-group">
                                  <label style={{ fontSize: 13 }}>Nueva contraseña</label>
                                  <div style={{ position: 'relative' }}>
                                    <input className="input" type={showPassSeg ? 'text' : 'password'}
                                      value={passFormSeg.nueva}
                                      onChange={e => setPassFormSeg({ ...passFormSeg, nueva: e.target.value })}
                                      placeholder="••••••••" autoFocus style={{ paddingRight: 40 }} />
                                    <button type="button" onClick={() => setShowPassSeg(!showPassSeg)}
                                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                                      {showPassSeg ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                  </div>
                                </div>
                                <div className="form-group">
                                  <label style={{ fontSize: 13 }}>Repetir contraseña</label>
                                  <input className="input" type={showPassSeg ? 'text' : 'password'}
                                    value={passFormSeg.repetir}
                                    onChange={e => setPassFormSeg({ ...passFormSeg, repetir: e.target.value })}
                                    onKeyDown={e => e.key === 'Enter' && guardarPasswordSeccion(s.key)}
                                    placeholder="••••••••" />
                                </div>
                                {passFormSeg.nueva && passFormSeg.repetir && passFormSeg.nueva !== passFormSeg.repetir && (
                                  <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>Las contraseñas no coinciden.</div>
                                )}
                                <button className="btn btn-primary" onClick={() => guardarPasswordSeccion(s.key)} style={{ fontSize: 13 }}>
                                  {tienePass ? 'Actualizar contraseña' : 'Guardar contraseña'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BACKUPS ── */}
          {seccion === 'backups' && (
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>Backups automáticos</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>Se genera uno automáticamente al abrir la app. Se conservan los últimos 7.</p>

              <button className="btn btn-secondary" onClick={() => window.electronAPI.abrirCarpetaBackup()}>
                Abrir carpeta de backups
              </button>

              {backups.length > 0 ? (
                <table className="table" style={{ marginTop: 20 }}>
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
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 20 }}>Todavía no hay backups generados.</p>
              )}

              {/* ── BACKUP EN LA NUBE ── */}
              <div style={{ marginTop: 32, borderTop: '1px solid var(--border-soft)', paddingTop: 28 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 15, marginBottom: 4 }}>☁️ Backup en la nube</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 6 }}>
                  Subí tus datos a la nube para recuperarlos si cambiás de PC o formateás.
                  {webPaso !== 'configurado' && <strong style={{ color: '#f59e0b' }}> Requiere estar registrado en "Web y Backup".</strong>}
                </p>
                {ultimoBackupNube && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>
                    Último backup: <strong style={{ color: 'var(--text-main)' }}>{new Date(ultimoBackupNube).toLocaleString('es-AR')}</strong>
                  </p>
                )}

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" disabled={backupNubeLoading || webPaso !== 'configurado'}
                    onClick={async () => {
                      setBackupNubeLoading(true)
                      const result = await window.electronAPI.syncBackupNube()
                      setBackupNubeLoading(false)
                      if (result.ok) {
                        setUltimoBackupNube(new Date().toISOString())
                        setModalAlert({ mensaje: `✅ Backup subido: ${result.peluqueros || 0} peluqueros, ${result.servicios || 0} servicios, ${result.atenciones} atenciones, ${result.gastos} gastos, ${result.cierres} cierres.`, tipo: 'success' })
                      } else {
                        setModalAlert({ mensaje: 'Error al hacer backup: ' + result.error, tipo: 'error' })
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {backupNubeLoading
                      ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Subiendo...</>
                      : '☁️ Subir backup ahora'}
                  </button>

                  <button className="btn btn-secondary" disabled={restoreNubeLoading || webPaso !== 'configurado'}
                    onClick={() => setConfirmandoRestore(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {restoreNubeLoading
                      ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Restaurando...</>
                      : '⬇️ Restaurar desde la nube'}
                  </button>
                </div>

                {/* Confirmación in-app (reemplaza window.confirm) */}
                {confirmandoRestore && (
                  <div style={{
                    marginTop: 16, padding: '18px 20px',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 12,
                  }}>
                    <div style={{ fontWeight: 700, color: '#f87171', fontSize: 14, marginBottom: 8 }}>⚠️ ¿Estás seguro?</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
                      Esto va a <strong style={{ color: '#f87171' }}>reemplazar todos tus datos locales</strong> (peluqueros, servicios, atenciones, gastos, pagos y cierres) con los del último backup en la nube.
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-danger"
                        disabled={restoreNubeLoading}
                        onClick={async () => {
                          setConfirmandoRestore(false)
                          setRestoreNubeLoading(true)
                          const result = await window.electronAPI.restaurarDesdeNube()
                          setRestoreNubeLoading(false)
                          if (result.ok) {
                            setModalAlert({ mensaje: `✅ Datos restaurados: ${result.peluqueros || 0} peluqueros, ${result.servicios || 0} servicios, ${result.atenciones} atenciones, ${result.gastos} gastos, ${result.cierres} cierres.`, tipo: 'success' })
                          } else {
                            setModalAlert({ mensaje: 'Error al restaurar: ' + result.error, tipo: 'error' })
                          }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        Sí, restaurar todo
                      </button>
                      <button className="btn btn-secondary"
                        onClick={() => setConfirmandoRestore(false)}
                        style={{ fontSize: 13 }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── RESERVAS WEB ── */}
          {seccion === 'web' && (
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>Reservas Web</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>Conectá esta app a la web para que tus clientes puedan reservar turnos online.</p>

              {webPaso === 'cargando' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
                  <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Cargando...
                </div>
              )}

              {webPaso === 'sin_config' && (
                <div>
                  <div style={{ display: 'flex', background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 8, overflow: 'hidden', marginBottom: 24, maxWidth: 280 }}>
                    {[{ key: 'registrar', label: 'Registrar nueva' }, { key: 'vincular', label: 'Ya tengo ID' }].map(op => (
                      <button key={op.key} onClick={() => setWebModo(op.key)}
                        style={{
                          flex: 1, padding: '9px 12px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                          background: webModo === op.key ? 'var(--accent)' : 'transparent',
                          color: webModo === op.key ? 'white' : 'var(--text-muted)'
                        }}>
                        {op.label}
                      </button>
                    ))}
                  </div>

                  {webModo === 'registrar' && (
                    <div style={{ maxWidth: 420 }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
                        Registrá esta peluquería para obtener tu link de reservas.<br />
                        <strong style={{ color: '#a78bfa' }}>Si ya registraste con este email, se recuperará el ID existente automáticamente.</strong>
                      </p>
                      <div className="form-group">
                        <label>Nombre de la peluquería</label>
                        <input className="input" value={webForm.nombre} onChange={e => setWebForm({ ...webForm, nombre: e.target.value })} placeholder="Ej: Barbería El Jefe" />
                      </div>
                      <div className="form-group">
                        <label>Email de contacto</label>
                        <input className="input" type="email" value={webForm.email} onChange={e => setWebForm({ ...webForm, email: e.target.value })} placeholder="tu@email.com" />
                      </div>
                      <button className="btn btn-primary" onClick={registrarPeluqueria} disabled={webLoading}>
                        {webLoading ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Registrando...</> : '🌐 Registrar y obtener link'}
                      </button>
                    </div>
                  )}

                  {webModo === 'vincular' && (
                    <div style={{ maxWidth: 420 }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px' }}>Si ya registraste esta peluquería en otra PC, pegá el ID para vincular esta instalación.</p>
                      <div className="form-group">
                        <label>ID de la peluquería</label>
                        <input className="input" value={webVincularId} onChange={e => setWebVincularId(e.target.value)}
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style={{ fontFamily: 'monospace', fontSize: 12 }} />
                      </div>
                      <button className="btn btn-primary" onClick={vincularPeluqueria} disabled={webLoading}>
                        {webLoading ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Vinculando...</> : '🔗 Vincular'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {webPaso === 'configurado' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                  {/* Estado conectado */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 10, padding: '10px 16px' }}>
                    <Wifi size={15} color="#4ade80" />
                    <span style={{ color: '#4ade80', fontWeight: 600, fontSize: 13 }}>Conectado a la web</span>
                  </div>

                  {/* Nombre editable */}
                  <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 20 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 4 }}>Nombre en la web</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>Este nombre lo ven tus clientes en la página de reservas.</div>
                    {editandoNombre ? (
                      <div style={{ display: 'flex', gap: 8, maxWidth: 380 }}>
                        <input className="input" value={nuevoNombreWeb} onChange={e => setNuevoNombreWeb(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && guardarNombreWeb()} style={{ flex: 1 }} autoFocus />
                        <button className="btn btn-primary" onClick={guardarNombreWeb} disabled={guardandoNombre}
                          style={{ padding: '0 14px' }}>
                          {guardandoNombre ? '...' : <Check size={14} />}
                        </button>
                        <button className="btn btn-secondary" onClick={() => { setEditandoNombre(false); setNuevoNombreWeb(webConfig.nombre) }}
                          style={{ padding: '0 12px' }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 15 }}>{webConfig.nombre}</span>
                        <button onClick={() => setEditandoNombre(true)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', padding: 4, borderRadius: 6 }}>
                          <Pencil size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ID + link */}
                  <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>ID de tu peluquería</label>
                      <input className="input" readOnly value={webConfig.id}
                        style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>Guardá este ID para vincular otras PCs.</span>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Link size={13} /> Link para compartir</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input className="input" readOnly value={webLink} style={{ fontSize: 12, color: '#a78bfa', flex: 1 }} />
                        <button className="btn btn-secondary" onClick={copiarLink} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {linkCopiado ? <><Check size={14} color="#4ade80" /> Copiado</> : <><Copy size={14} /> Copiar</>}
                        </button>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>Compartí por WhatsApp, Instagram o donde quieras.</span>
                    </div>
                  </div>

                  {/* Sincronizar */}
                  <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 20 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 4 }}>Sincronizar datos</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>Subí peluqueros, servicios y turnos. Hacelo cada vez que agregues algo nuevo.</div>
                    <button className="btn btn-secondary" onClick={sincronizar} disabled={syncLoading}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <RefreshCw size={14} style={{ animation: syncLoading ? 'spin 1s linear infinite' : 'none' }} />
                      {syncLoading ? 'Sincronizando...' : 'Sincronizar con la web'}
                    </button>
                    {syncResultado && (
                      <span style={{ fontSize: 12, color: syncResultado.ok ? '#4ade80' : '#f87171', marginTop: 10, display: 'block' }}>
                        {syncResultado.msg}
                      </span>
                    )}
                  </div>

                  {/* Desvincular */}
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 4 }}>Desvincular</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 12px' }}>
                      Para conectar otra peluquería, desvinculá la actual. Los datos web no se borran.
                    </p>
                    <button className="btn btn-secondary"
                      onClick={() => {
                        setWebConfig({ id: '', nombre: '', email: '' }); setWebPaso('sin_config'); setWebModo('vincular')
                        window.electronAPI.setConfig({ clave: 'peluqueria_id', valor: '' })
                        window.electronAPI.setConfig({ clave: 'peluqueria_nombre', valor: '' })
                        window.electronAPI.setConfig({ clave: 'peluqueria_email', valor: '' })
                      }}
                      style={{ fontSize: 13 }}>
                      Desvincular esta peluquería
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── HORARIO ── */}
          {seccion === 'horario' && webPaso === 'configurado' && (
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>Horario de atención web</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>Configurá qué días y horarios van a ver tus clientes al reservar online.</p>

              {/* Modo */}
              <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 24, marginBottom: 24 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 12 }}>Modo de disponibilidad</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { val: 'normal', label: '📅 Días de la semana', desc: 'Lun, Mar, Mié...' },
                    { val: 'fecha_unica', label: '📌 Día específico', desc: 'Solo una fecha' },
                  ].map(({ val, label, desc }) => (
                    <button key={val}
                      onClick={() => setHorario(h => ({ ...h, modo: val }))}
                      style={{
                        flex: 1, padding: '14px 16px', borderRadius: 10,
                        border: '1px solid',
                        cursor: 'pointer', transition: 'all 0.15s',
                        textAlign: 'left',
                        borderColor: (horario.modo || 'normal') === val ? '#7c3aed' : 'var(--border-soft)',
                        background: (horario.modo || 'normal') === val ? 'rgba(124,58,237,0.12)' : 'transparent',
                      }}>
                      <div style={{
                        fontWeight: 600, fontSize: 13, marginBottom: 2,
                        color: (horario.modo || 'normal') === val ? '#c4b5fd' : 'var(--text-main)',
                      }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Días (modo normal) */}
              {(horario.modo || 'normal') === 'normal' && (
                <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 24, marginBottom: 24 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 12 }}>Días de atención</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {DIAS.map(({ num, label }) => (
                      <button key={num} onClick={() => toggleDia(num)}
                        style={{
                          padding: '7px 16px', borderRadius: 8, border: '1px solid',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                          borderColor: horario.dias.includes(num) ? '#7c3aed' : 'var(--border-soft)',
                          background: horario.dias.includes(num) ? 'rgba(124,58,237,0.2)' : 'transparent',
                          color: horario.dias.includes(num) ? '#c4b5fd' : 'var(--text-muted)',
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fecha específica (modo fecha_unica) */}
              {horario.modo === 'fecha_unica' && (
                <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 24, marginBottom: 24 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 4 }}>Fecha disponible</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
                    Los clientes solo van a poder sacar turno para este día.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CalendarDays size={18} style={{ color: '#a78bfa', flexShrink: 0 }} />
                    <input
                      type="date"
                      className="input"
                      value={horario.fecha_unica || ''}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setHorario(h => ({ ...h, fecha_unica: e.target.value || null }))}
                      style={{ maxWidth: 220, fontSize: 14, fontWeight: 600 }}
                    />
                  </div>
                  {horario.fecha_unica && (
                    <div style={{ marginTop: 10, fontSize: 12, color: '#4ade80' }}>
                      ✅ Solo se mostrarán turnos para el <strong>
                        {new Date(horario.fecha_unica + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* Bloques */}
              <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 24, marginBottom: 24 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 12 }}>Bloques horarios</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
                  {horario.bloques.map((bloque, idx) => (
                    <div key={idx} style={{
                      border: '1px solid', borderRadius: 10, padding: '14px 16px',
                      borderColor: bloque.activo ? '#7c3aed' : 'var(--border-soft)',
                      background: bloque.activo ? 'rgba(124,58,237,0.06)' : 'var(--bg-main)',
                      transition: 'all 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: bloque.activo ? 14 : 0 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: bloque.activo ? '#c4b5fd' : 'var(--text-muted)' }}>
                          {idx === 0 ? '🌅 Bloque mañana' : '🌆 Bloque tarde'}
                        </span>
                        <button onClick={() => setHorario(h => ({ ...h, bloques: h.bloques.map((b, i) => i === idx ? { ...b, activo: !b.activo } : b) }))}
                          style={{
                            width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                            background: bloque.activo ? '#7c3aed' : 'var(--border-soft)'
                          }}>
                          <span style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'all 0.2s', left: bloque.activo ? 21 : 3 }} />
                        </button>
                      </div>
                      {bloque.activo && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>Apertura</label>
                            <select className="input" value={bloque.inicio}
                              onChange={e => setHorario(h => ({ ...h, bloques: h.bloques.map((b, i) => i === idx ? { ...b, inicio: e.target.value } : b) }))}
                              style={{ cursor: 'pointer' }}>
                              {HORAS_DISPONIBLES.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>Cierre</label>
                            <select className="input" value={bloque.fin}
                              onChange={e => setHorario(h => ({ ...h, bloques: h.bloques.map((b, i) => i === idx ? { ...b, fin: e.target.value } : b) }))}
                              style={{ cursor: 'pointer' }}>
                              {HORAS_DISPONIBLES.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Intervalo */}
              <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 24, marginBottom: 24 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 12 }}>Intervalo entre turnos</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ val: 30, label: '30 min' }, { val: 60, label: '1 hora' }].map(({ val, label }) => (
                    <button key={val} onClick={() => setHorario(h => ({ ...h, intervalo: val }))}
                      style={{
                        padding: '8px 22px', borderRadius: 8, border: '1px solid',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                        borderColor: horario.intervalo === val ? '#7c3aed' : 'var(--border-soft)',
                        background: horario.intervalo === val ? 'rgba(124,58,237,0.2)' : 'transparent',
                        color: horario.intervalo === val ? '#c4b5fd' : 'var(--text-muted)',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview + Guardar */}
              {horario.bloques.some(b => b.activo) && (
                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  {(horario.modo || 'normal') === 'fecha_unica' ? (
                    <>
                      📌 Solo el <strong style={{ color: '#c4b5fd' }}>
                        {horario.fecha_unica
                          ? new Date(horario.fecha_unica + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
                          : '(sin fecha)'}
                      </strong>, cada <strong style={{ color: 'var(--text-main)' }}>{horario.intervalo} min</strong>:<br />
                    </>
                  ) : (
                    <>
                      📅 <strong style={{ color: '#c4b5fd' }}>{DIAS.filter(d => horario.dias.includes(d.num)).map(d => d.label).join(', ') || '—'}</strong>, cada <strong style={{ color: 'var(--text-main)' }}>{horario.intervalo} min</strong>:<br />
                    </>
                  )}
                  {horario.bloques.filter(b => b.activo).map((b, i) => (
                    <span key={i}>{i > 0 && ' · '}<strong style={{ color: 'var(--text-main)' }}>{b.inicio}</strong> a <strong style={{ color: 'var(--text-main)' }}>{b.fin}</strong></span>
                  ))}
                </div>
              )}
              <button className="btn btn-primary" onClick={guardarHorario} disabled={horarioLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {horarioLoading
                  ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
                  : horarioGuardado ? <><Check size={14} color="#4ade80" /> ¡Guardado!</>
                    : '💾 Guardar horario'}
              </button>
            </div>
          )}

          {/* ── SEÑA ── */}
          {seccion === 'sena' && webPaso === 'configurado' && (
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>Seña para reservas web</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
                Cuando un cliente pide turno y vos lo confirmás, se le pedirá que pague una seña por transferencia antes de que el turno quede definitivo.
                Dejá el monto en 0 para desactivar las señas.
              </p>

              {/* Monto */}
              <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 24, marginBottom: 24 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 4 }}>Monto de la seña</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>En pesos. Dejá en 0 para no cobrar seña.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 260 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 18, fontWeight: 700 }}>$</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="500"
                    value={senaMonto}
                    onChange={e => setSenaMonto(e.target.value)}
                    placeholder="Ej: 5000"
                    style={{ flex: 1, fontSize: 16, fontWeight: 600 }}
                  />
                </div>
                {Number(senaMonto) > 0 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#4ade80' }}>
                    ✅ Se pedirá seña de <strong>${Number(senaMonto).toLocaleString('es-AR')}</strong> al confirmar cada turno.
                  </div>
                )}
                {(!senaMonto || Number(senaMonto) === 0) && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                    ℹ️ Señas desactivadas — los turnos se confirman directamente.
                  </div>
                )}
              </div>

              {/* Alias / CBU */}
              <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 24, marginBottom: 24 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 4 }}>Alias o CBU para recibir la seña</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
                  Este alias o CBU le aparecerá al cliente en el email de instrucciones de pago.
                </div>
                <input
                  className="input"
                  value={senaAlias}
                  onChange={e => setSenaAlias(e.target.value)}
                  placeholder="Ej: barberia.eljefe o 0000003100..."
                  style={{ maxWidth: 380, fontFamily: 'monospace', fontSize: 13 }}
                />
              </div>

              {/* Horas de vencimiento */}
              <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 24, marginBottom: 24 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14, marginBottom: 4 }}>Tiempo límite para pagar</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
                  Si el cliente no paga en este tiempo, el turno se cancela automáticamente.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { val: '12', label: '12 hs' },
                    { val: '24', label: '24 hs' },
                    { val: '48', label: '48 hs' },
                  ].map(({ val, label }) => (
                    <button key={val} onClick={() => setSenaHoras(val)}
                      style={{
                        padding: '8px 22px', borderRadius: 8, border: '1px solid',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                        borderColor: senaHoras === val ? '#fb923c' : 'var(--border-soft)',
                        background: senaHoras === val ? 'rgba(251,146,60,0.15)' : 'transparent',
                        color: senaHoras === val ? '#fb923c' : 'var(--text-muted)',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {Number(senaMonto) > 0 && senaAlias.trim() && (
                <div style={{
                  background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.25)',
                  borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13,
                  color: 'var(--text-muted)', lineHeight: 1.8
                }}>
                  <div style={{ color: '#fb923c', fontWeight: 700, marginBottom: 6, fontSize: 12 }}>💸 PREVIEW — LO QUE VE EL CLIENTE EN EL EMAIL</div>
                  <div>Tu turno está pre-confirmado.</div>
                  <div>Transferí <strong style={{ color: 'var(--text-main)' }}>${Number(senaMonto).toLocaleString('es-AR')}</strong> al alias <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{senaAlias}</strong> para confirmarlo definitivamente.</div>
                  <div>Tenés <strong style={{ color: '#fb923c' }}>{senaHoras} horas</strong> para pagar, o el turno se cancelará automáticamente.</div>
                </div>
              )}

              {/* Guardar */}
              <button className="btn btn-primary" onClick={guardarSena} disabled={senaLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {senaLoading
                  ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
                  : senaGuardada ? <><Check size={14} color="#4ade80" /> ¡Guardado!</>
                    : '💾 Guardar configuración de seña'}
              </button>
            </div>
          )}

        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
