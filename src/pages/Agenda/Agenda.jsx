import { useState, useEffect, useCallback } from 'react'
import { Plus, ChevronLeft, ChevronRight, Clock, User, Scissors, CheckCircle, XCircle, AlertCircle, Trash2, X, Globe, RefreshCw, Wifi, WifiOff, Ban, DollarSign, Pencil, StickyNote, MessageCircle, Coins } from 'lucide-react'
import { ModalConfirm, ModalAlert } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import Skeleton from '../../components/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const ESTADOS = {
  pendiente:  { label: 'Pendiente',  color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 15%, transparent)',   icon: AlertCircle },
  confirmado: { label: 'Confirmado', color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 15%, transparent)',    icon: CheckCircle },
  cancelado:  { label: 'Cancelado',  color: 'var(--danger)', bg: 'color-mix(in srgb, var(--danger) 15%, transparent)',   icon: XCircle     },
}

const ESTADOS_WEB = {
  pendiente:      { label: 'Esperando respuesta',  color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 8%, transparent)',  border: 'color-mix(in srgb, var(--warning) 30%, transparent)',  Icon: Clock       },
  modificado:     { label: 'Esperando OK cliente', color: 'var(--info)', bg: 'color-mix(in srgb, var(--info) 8%, transparent)',  border: 'color-mix(in srgb, var(--info) 30%, transparent)',  Icon: AlertCircle },
  esperando_sena: { label: 'Esperando seña',       color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 8%, transparent)',  border: 'color-mix(in srgb, var(--warning) 30%, transparent)',  Icon: DollarSign  },
  confirmado:     { label: 'Confirmado',           color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 6%, transparent)',  border: 'color-mix(in srgb, var(--success) 20%, transparent)',  Icon: CheckCircle },
  rechazado:      { label: 'Rechazado',            color: 'var(--danger)', bg: 'color-mix(in srgb, var(--danger) 6%, transparent)', border: 'color-mix(in srgb, var(--danger) 20%, transparent)', Icon: XCircle     },
  cancelado:      { label: 'Cancelado',            color: 'var(--text-muted)', bg: 'rgba(113,113,122,0.06)', border: 'rgba(113,113,122,0.2)', Icon: XCircle     },
}

function hoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatFechaLinda(fecha) {
  const [a, m, d] = fecha.split('-')
  return `${d} de ${MESES[parseInt(m)-1]} ${a}`
}

function formatFechaCorta(fecha) {
  if (!fecha) return ''
  const [a, m, d] = fecha.split('-')
  return `${d}/${m}/${a}`
}

function getDiasDelMes(anio, mes) {
  const primerDia = new Date(anio, mes, 1).getDay()
  const totalDias = new Date(anio, mes + 1, 0).getDate()
  const dias = []
  for (let i = 0; i < primerDia; i++) dias.push(null)
  for (let d = 1; d <= totalDias; d++) dias.push(d)
  return dias
}

// Calcula cuántas horas faltan para que venza la seña
function horasRestantes(venceAt) {
  if (!venceAt) return null
  const diff = new Date(venceAt) - new Date()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60))
}

// ── MODAL RESPONDER TURNO WEB ──────────────────────────────────
function ModalResponder({ turno, onConfirm, onCancel }) {
  const [accion, setAccion]            = useState('confirmado')
  const [motivo, setMotivo]            = useState('')
  const [fechaPropuesta, setFechaProp] = useState(turno.fecha || '')
  const [horaPropuesta, setHoraProp]   = useState(turno.hora?.substring(0,5) || '')
  const [loading, setLoading]          = useState(false)

  const handleConfirm = async () => {
    if (accion === 'modificado' && (!fechaPropuesta || !horaPropuesta)) return
    setLoading(true)
    await onConfirm({
      id:              turno.id,
      accion,
      motivo:          motivo.trim() || null,
      fecha_propuesta: accion === 'modificado' ? fechaPropuesta : null,
      hora_propuesta:  accion === 'modificado' ? horaPropuesta  : null,
    })
    setLoading(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
        style={{ background:'var(--bg-card)', border:'1px solid var(--border-soft)', borderRadius:16, padding:28, width:'100%', maxWidth:460 }}>

        <h3 style={{ color:'var(--text-main)', margin:'0 0 4px', fontSize:17 }}>Responder reserva</h3>
        <p style={{ color:'var(--text-muted)', fontSize:13, margin:'0 0 20px' }}>
          <strong style={{ color:'var(--text-main)' }}>{turno.cliente_nombre}</strong>
          {' '}— {formatFechaCorta(turno.fecha)} a las {turno.hora?.substring(0,5)}hs
          {turno.peluquero_nombre && <span style={{ color:'var(--accent-bright)' }}> · {turno.peluquero_nombre}</span>}
        </p>

        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          {[
            { key:'confirmado', label:'Confirmar', Icon: CheckCircle, color:'var(--success)', bg:'color-mix(in srgb, var(--success) 15%, transparent)'  },
            { key:'modificado', label:'Modificar', Icon: Pencil, color:'var(--info)', bg:'color-mix(in srgb, var(--info) 15%, transparent)' },
            { key:'rechazado',  label:'Rechazar',  Icon: XCircle, color:'var(--danger)', bg:'color-mix(in srgb, var(--danger) 15%, transparent)' },
          ].map(op => (
            <button key={op.key} onClick={() => setAccion(op.key)}
              style={{
                flex:1, padding:'10px 6px', borderRadius:10, cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.15s',
                border:`1.5px solid ${accion === op.key ? op.color : 'var(--border-soft)'}`,
                background: accion === op.key ? op.bg : 'transparent',
                color: accion === op.key ? op.color : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
              <op.Icon size={13} /> {op.label}
            </button>
          ))}
        </div>

        {accion === 'modificado' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <div className="form-group" style={{ margin:0 }}>
              <label>Nueva fecha</label>
              <input className="input" type="date" value={fechaPropuesta} onChange={e => setFechaProp(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin:0 }}>
              <label>Nueva hora</label>
              <input className="input" type="time" value={horaPropuesta} onChange={e => setHoraProp(e.target.value)} />
            </div>
          </div>
        )}

        <div className="form-group" style={{ margin:'0 0 20px' }}>
          <label>Motivo <span style={{ color:'var(--text-muted)', fontSize:11 }}>(opcional)</span></label>
          <input className="input" value={motivo} onChange={e => setMotivo(e.target.value)}
            placeholder={
              accion === 'rechazado'  ? 'Ej: No hay disponibilidad ese día' :
              accion === 'modificado' ? 'Ej: Ya tengo un turno a esa hora'  : ''
            }
          />
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={loading} style={{ flex:1 }}>
            {loading ? 'Enviando...' : 'Confirmar y notificar al cliente'}
          </button>
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancelar</button>
        </div>
      </motion.div>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ────────────────────────────────────────
export default function Agenda() {
  const ahora = new Date()
  const [anio, setAnio]             = useState(ahora.getFullYear())
  const [mes, setMes]               = useState(ahora.getMonth())
  const [diaSeleccionado, setDia]   = useState(hoy())
  const [turnosMes, setTurnosMes]   = useState([])
  const [turnosDia, setTurnosDia]   = useState([])
  const [peluqueros, setPeluqueros] = useState([])
  const [servicios, setServicios]   = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm]             = useState({ peluquero_id:'', servicio_id:'', cliente_nombre:'', hora:'', notas:'', estado:'confirmado' })
  const [guardandoTurno, setGuardandoTurno] = useState(false)
  const [modalConfirm, setModalConfirm] = useState(null)
  const [modalAlert, setModalAlert]     = useState(null)

  // Reservas online
  const [turnosWeb, setTurnosWeb]       = useState([])
  const [loadingWeb, setLoadingWeb]     = useState(false)
  const [sinConexion, setSinConexion]   = useState(false)
  const [peluqueriaId, setPeluqueriaId] = useState(null)
  const [senaConfig, setSenaConfig]     = useState({ monto: 0, alias: '', horas: 24 })
  const [turnoResponder, setTurnoResponder] = useState(null)
  const [filtroWeb, setFiltroWeb]       = useState('pendientes')
  const [turnoCancelar, setTurnoCancelar]       = useState(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [diasBloqueados, setDiasBloqueados] = useState([])
  const [motivoBloqueo, setMotivoBloqueo]   = useState('')
  const [modalBloqueo, setModalBloqueo]     = useState(false)
  const [confirmandoSena, setConfirmandoSena] = useState(null)
  const [pendientesCount, setPendientesCount] = useState(0)
  const [senasCount, setSenasCount]           = useState(0)
  const [cargandoDia, setCargandoDia]         = useState(true)

  const confirmar = (msg, fn) => setModalConfirm({ mensaje:msg, onConfirm:fn })
  const toast = useToast()
  const alertar   = (msg, tipo='info') => {
    if (tipo === 'error' || tipo === 'warning') setModalAlert({ mensaje: msg, tipo })
    else toast(msg, tipo)
  }

  const cargarDiasBloqueados = () =>
    window.electronAPI.getDiasBloqueados().then(data => setDiasBloqueados(data || []))

  useEffect(() => {
    window.electronAPI.getPeluqueros().then(setPeluqueros)
    window.electronAPI.getServicios().then(setServicios)
    window.electronAPI.getPeluqueriaConfig().then(cfg => {
      if (cfg?.id) {
        setPeluqueriaId(cfg.id)
        setSenaConfig({
          monto: Number(cfg.sena_monto) || 0,
          alias: cfg.sena_alias || '',
          horas: Number(cfg.sena_horas_vencimiento) || 24,
        })
      }
    })
    window.electronAPI.sincronizarCanceladosWeb()
    window.electronAPI.sincronizarConfirmadosWeb()
    cargarDiasBloqueados()
    const handleTurnoNuevo = (e) => {
      if (e.data?.type === 'turnoWeb:nuevo') {
        setFiltroWeb('pendientes')
        cargarTurnosWeb()
      }
    }
    window.addEventListener('message', handleTurnoNuevo)
    return () => window.removeEventListener('message', handleTurnoNuevo)
  }, [])

  function getRangoMes(a, m) {
    const desde  = `${a}-${String(m+1).padStart(2,'0')}-01`
    const ultimo = new Date(a, m+1, 0).getDate()
    const hasta  = `${a}-${String(m+1).padStart(2,'0')}-${String(ultimo).padStart(2,'0')}`
    return [desde, hasta]
  }

  const cargarMes = useCallback(async () => {
    const [desde, hasta] = getRangoMes(anio, mes)
    setTurnosMes(await window.electronAPI.getTurnosByRango({ desde, hasta }))
  }, [anio, mes])

  const cargarDia = useCallback(async () => {
    setTurnosDia(await window.electronAPI.getTurnosByFecha(diaSeleccionado))
  }, [diaSeleccionado])

  const cargarTurnosWeb = async () => {
    setLoadingWeb(true); setSinConexion(false)
    try {
      await window.electronAPI.sincronizarCanceladosWeb()
      await window.electronAPI.sincronizarConfirmadosWeb()

      // Cargar ambas fuentes en paralelo — completamente independientes
      const [pendientes, senas] = await Promise.all([
        window.electronAPI.getTurnosWebPendientes(),
        window.electronAPI.getTurnosWebSenas(),
      ])

      setPendientesCount((pendientes || []).length)
      setSenasCount((senas || []).length)

      let data
      if (filtroWeb === 'todos') {
        data = await window.electronAPI.getTurnosWebTodos(`${anio}-${String(mes+1).padStart(2,'0')}`)
      } else if (filtroWeb === 'senas') {
        data = senas
      } else {
        data = pendientes
      }

      setTurnosDia(await window.electronAPI.getTurnosByFecha(diaSeleccionado))
      cargarMes()
      setTurnosWeb(data || [])
    } catch { setSinConexion(true) }
    finally  { setLoadingWeb(false) }
  }

  useEffect(() => { cargarMes() }, [cargarMes])
  useEffect(() => {
    setCargandoDia(true)
    cargarDia().finally(() => setCargandoDia(false))
  }, [cargarDia])
  useEffect(() => { if (peluqueriaId) cargarTurnosWeb() }, [peluqueriaId, filtroWeb, anio, mes])

  const irMesAnterior  = () => mes === 0  ? (setMes(11), setAnio(a=>a-1)) : setMes(m=>m-1)
  const irMesSiguiente = () => mes === 11 ? (setMes(0),  setAnio(a=>a+1)) : setMes(m=>m+1)

  const seleccionarDia = (dia) => {
    if (!dia) return
    setDia(`${anio}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`)
    setMostrarForm(false)
  }

  const turnosDelDiaEnMes = (dia) => {
    if (!dia) return []
    const f = `${anio}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
    return turnosMes.filter(t => t.fecha === f && t.estado !== 'cancelado')
  }

  // ── BLOQUEO DE DÍAS ───────────────────────────────────────────
  const estaBloquado = diasBloqueados.some(d => d.fecha === diaSeleccionado)
  const infoBloqueado = diasBloqueados.find(d => d.fecha === diaSeleccionado)

  const bloquearDia = async () => {
    await window.electronAPI.bloquearDia({ fecha: diaSeleccionado, motivo: motivoBloqueo.trim() || null })
    setModalBloqueo(false)
    setMotivoBloqueo('')
    cargarDiasBloqueados()
    alertar('Día bloqueado. Los clientes no podrán reservar ese día.', 'success')
  }

  const desbloquearDia = () => {
    confirmar(`¿Desbloquear el ${formatFechaLinda(diaSeleccionado)}? Los clientes podrán volver a reservar.`, async () => {
      setModalConfirm(null)
      await window.electronAPI.desbloquearDia(diaSeleccionado)
      cargarDiasBloqueados()
      alertar('Día desbloqueado correctamente.', 'success')
    })
  }
  // ─────────────────────────────────────────────────────────────

  const guardarTurno = async () => {
    if (guardandoTurno) return
    if (!form.cliente_nombre.trim()) { alertar('Ingresá el nombre del cliente.','warning'); return }
    if (!form.hora)                  { alertar('Ingresá la hora del turno.','warning');     return }
    if (!form.peluquero_id)          { alertar('Seleccioná un peluquero.','warning');       return }
    setGuardandoTurno(true)
    try {
      await window.electronAPI.createTurno({ ...form, fecha:diaSeleccionado, peluquero_id:Number(form.peluquero_id), servicio_id:form.servicio_id?Number(form.servicio_id):null })
      setForm({ peluquero_id:'', servicio_id:'', cliente_nombre:'', hora:'', notas:'', estado:'confirmado' })
      setMostrarForm(false)
      await cargarMes(); await cargarDia()
    } finally {
      setGuardandoTurno(false)
    }
  }

  const cambiarEstado = async (turno, nuevoEstado) => {
    await window.electronAPI.updateTurnoEstado({ id:turno.id, estado:nuevoEstado })
    await cargarMes(); await cargarDia()
  }

  const eliminarTurno = (turno) => {
    confirmar(`¿Eliminar el turno de ${turno.cliente_nombre}?`, async () => {
      setModalConfirm(null)
      await window.electronAPI.deleteTurno(turno.id)
      await cargarMes(); await cargarDia()
    })
  }

  const responderTurnoWeb = async (payload) => {
    const result = await window.electronAPI.responderTurnoWeb(payload)
    if (result?.ok) {
      setTurnoResponder(null)
      // El turno se actualizó igual, pero si la notificación push no salió
      // hay que decirlo: el cliente no se entera de nada si no.
      if (result.push?.ok === false) {
        alertar('El turno se actualizó, pero no le pudimos avisar al cliente. Escribile por otro medio.', 'warning')
      } else if (result.esperandoSena) {
        alertar(`Seña solicitada. Se le avisó al cliente los datos para pagar $${senaConfig.monto.toLocaleString('es-AR')} al alias ${senaConfig.alias}. El turno pasó a "Señas".`, 'success')
      } else {
        const msgs = { confirmado:'confirmado', modificado:'modificado — el cliente será notificado', rechazado:'rechazado' }
        alertar(`Turno ${msgs[payload.accion]}. Le avisamos al cliente.`, 'success')
      }
      cargarTurnosWeb(); cargarMes(); cargarDia()
    } else {
      alertar('Error al responder: ' + (result?.error || 'Intentá de nuevo.'), 'error')
    }
  }

  const confirmarSenaPagada = (sena) => {
    confirmar(
      `¿Confirmar que recibiste la seña de $${sena.monto?.toLocaleString('es-AR')} de ${sena.cliente_nombre}?\n\nEsto confirmará el turno definitivamente y notificará al cliente.`,
      async () => {
        setModalConfirm(null)
        setConfirmandoSena(sena.id)
        const result = await window.electronAPI.confirmarSena(sena.id)
        setConfirmandoSena(null)
        if (result?.ok) {
          if (result.push?.ok === false) {
            alertar(`Seña confirmada y turno de ${sena.cliente_nombre} agendado, pero no le pudimos avisar al cliente. Escribile por otro medio.`, 'warning')
          } else {
            alertar(`Seña confirmada. Turno de ${sena.cliente_nombre} confirmado y avisado.`, 'success')
          }
          cargarTurnosWeb(); cargarMes(); cargarDia()
        } else {
          alertar('Error al confirmar: ' + (result?.error || 'Intentá de nuevo.'), 'error')
        }
      }
    )
  }

  const dias     = getDiasDelMes(anio, mes)
  const fechaHoy = hoy()
  const dotColor = (ts) => ts.some(t=>t.estado==='pendiente') ? 'var(--warning)' : ts.some(t=>t.estado==='confirmado') ? 'var(--success)' : 'var(--danger)'

  return (
    <div className="page-animation">
      {modalConfirm   && <ModalConfirm mensaje={modalConfirm.mensaje} onConfirm={modalConfirm.onConfirm} onCancel={()=>setModalConfirm(null)} />}
      {modalAlert     && <ModalAlert   mensaje={modalAlert.mensaje}   tipo={modalAlert.tipo}             onClose={()=>setModalAlert(null)} />}
      {turnoResponder && <ModalResponder turno={turnoResponder} onConfirm={responderTurnoWeb} onCancel={()=>setTurnoResponder(null)} />}

      {/* Modal bloqueo de día */}
      {modalBloqueo && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
            style={{ background:'var(--bg-card)', border:'1px solid color-mix(in srgb, var(--danger) 30%, transparent)', borderRadius:16, padding:28, width:'100%', maxWidth:400 }}>
            <h3 style={{ color:'var(--danger)', margin:'0 0 6px', fontSize:17, display:'flex', alignItems:'center', gap:8 }}><Ban size={16} /> Bloquear día</h3>
            <p style={{ color:'var(--text-muted)', fontSize:13, margin:'0 0 20px' }}>
              <strong style={{ color:'var(--text-main)' }}>{formatFechaLinda(diaSeleccionado)}</strong><br/>
              Los clientes <strong>no podrán reservar</strong> en este día.
            </p>
            <div className="form-group" style={{ margin:'0 0 20px' }}>
              <label>Motivo <span style={{ color:'var(--text-muted)', fontSize:11 }}>(opcional)</span></label>
              <input className="input" value={motivoBloqueo} onChange={e => setMotivoBloqueo(e.target.value)}
                placeholder="Ej: Vacaciones, feriado, día libre..." autoFocus />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-primary"
                style={{ flex:1, background:'color-mix(in srgb, var(--danger) 15%, transparent)', borderColor:'color-mix(in srgb, var(--danger) 40%, transparent)', color:'var(--danger)' }}
                onClick={bloquearDia}>
                Confirmar bloqueo
              </button>
              <button className="btn btn-secondary" onClick={() => { setModalBloqueo(false); setMotivoBloqueo('') }}>
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {turnoCancelar && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
            style={{ background:'var(--bg-card)', border:'1px solid color-mix(in srgb, var(--danger) 30%, transparent)', borderRadius:16, padding:28, width:'100%', maxWidth:400 }}>
            <h3 style={{ color:'var(--danger)', margin:'0 0 6px', fontSize:17 }}>Cancelar turno</h3>
            <p style={{ color:'var(--text-muted)', fontSize:13, margin:'0 0 20px' }}>
              <strong style={{ color:'var(--text-main)' }}>{turnoCancelar.cliente_nombre}</strong>
              {' '}— {formatFechaCorta(turnoCancelar.fecha)} a las {turnoCancelar.hora?.substring(0,5)}hs
            </p>
            <div className="form-group" style={{ margin:'0 0 20px' }}>
              <label>Motivo <span style={{ color:'var(--text-muted)', fontSize:11 }}>(opcional)</span></label>
              <input className="input" value={motivoCancelacion}
                onChange={e => setMotivoCancelacion(e.target.value)}
                placeholder="Ej: problema con el horario, día cerrado..." />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-primary"
                style={{ flex:1, background:'color-mix(in srgb, var(--danger) 15%, transparent)', borderColor:'color-mix(in srgb, var(--danger) 40%, transparent)', color:'var(--danger)' }}
                onClick={async () => {
                  const result = await window.electronAPI.responderTurnoWeb({
                    id: turnoCancelar.turno_web_id || turnoCancelar.id, accion: 'cancelado',
                    motivo: motivoCancelacion.trim() || 'Cancelado por la peluquería',
                    fecha_propuesta: null, hora_propuesta: null,
                  })
                  if (result?.ok) {
                    setTurnoCancelar(null); setMotivoCancelacion('')
                    alertar('Turno cancelado. El cliente fue notificado.', 'success')
                    cargarTurnosWeb(); cargarMes(); cargarDia()
                  } else {
                    alertar('Error al cancelar: ' + (result?.error || 'Intentá de nuevo.'), 'error')
                  }
                }}>
                Confirmar cancelación
              </button>
              <button className="btn btn-secondary" onClick={() => setTurnoCancelar(null)}>Volver</button>
            </div>
          </motion.div>
        </div>
      )}

      <h1 className="page-title">Agenda</h1>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.1fr', gap:20, alignItems:'start' }}>

        {/* Calendario */}
        <div className="card" style={{ margin:0, padding:0, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px', borderBottom:'1px solid var(--border-soft)' }}>
            <button className="btn btn-secondary" onClick={irMesAnterior} style={{ padding:'6px 10px' }}><ChevronLeft size={16} /></button>
            <span style={{ fontWeight:700, fontSize:16, color:'var(--text-main)' }}>{MESES[mes]} {anio}</span>
            <button className="btn btn-secondary" onClick={irMesSiguiente} style={{ padding:'6px 10px' }}><ChevronRight size={16} /></button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'10px 16px 4px' }}>
            {DIAS_SEMANA.map(d=>(
              <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:600, color:'var(--text-muted)', paddingBottom:4 }}>{d}</div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, padding:'0 12px 16px' }}>
            {dias.map((dia, i) => {
              if (!dia) return <div key={`e-${i}`} />
              const fd  = `${anio}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
              const tdm = turnosDelDiaEnMes(dia)
              const esH = fd === fechaHoy
              const sel = fd === diaSeleccionado
              const bloqueado = diasBloqueados.some(d => d.fecha === fd)
              return (
                <div key={dia} onClick={()=>seleccionarDia(dia)}
                  style={{ borderRadius:8, padding:'8px 4px 6px', textAlign:'center', cursor:'pointer', transition:'all 0.15s ease', minHeight:52, display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                    background: bloqueado ? 'color-mix(in srgb, var(--danger) 8%, transparent)' : sel?'var(--accent-soft)':esH?'rgba(var(--accent-bright-rgb),0.08)':'transparent',
                    border: bloqueado ? '1px solid color-mix(in srgb, var(--danger) 30%, transparent)' : sel?'1px solid var(--accent)':esH?'1px solid rgba(var(--accent-rgb),0.3)':'1px solid transparent',
                    opacity: bloqueado ? 0.7 : 1,
                  }}>
                  <span style={{ fontSize:13, fontWeight:sel||esH?700:400, color: bloqueado?'var(--danger)':sel?'var(--accent-strong)':esH?'var(--accent-bright)':'var(--text-main)' }}>{dia}</span>
                  {bloqueado
                    ? <Ban size={10} color="var(--danger)" />
                    : tdm.length > 0 && (
                      <div style={{ display:'flex', gap:3, flexWrap:'wrap', justifyContent:'center' }}>
                        {tdm.length<=3
                          ? tdm.map((t,idx)=><div key={idx} style={{ width:6,height:6,borderRadius:'50%',background:ESTADOS[t.estado]?.color||'var(--accent-bright)' }} />)
                          : <><div style={{ width:6,height:6,borderRadius:'50%',background:dotColor(tdm) }} /><span style={{ fontSize:9,color:'var(--text-muted)',lineHeight:1 }}>+{tdm.length}</span></>
                        }
                      </div>
                    )
                  }
                </div>
              )
            })}
          </div>

          <div style={{ padding:'10px 20px 16px', borderTop:'1px solid var(--border-soft)', display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
            {Object.entries(ESTADOS).map(([k,v])=>(
              <div key={k} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-muted)' }}>
                <div style={{ width:8,height:8,borderRadius:'50%',background:v.color }} />{v.label}
              </div>
            ))}
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-muted)' }}>
              <Ban size={9} color="var(--danger)" /> Bloqueado
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="card" style={{ margin:0, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:2 }}>Día seleccionado</div>
              <div style={{ fontWeight:700, fontSize:16, color:'var(--text-main)', textTransform:'capitalize' }}>{formatFechaLinda(diaSeleccionado)}</div>
              {estaBloquado && (
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4, fontSize:12, color:'var(--danger)' }}>
                  <Ban size={11}/> Bloqueado{infoBloqueado?.motivo ? ` — ${infoBloqueado.motivo}` : ''}
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {peluqueriaId && (
                estaBloquado
                  ? <button className="btn btn-secondary" onClick={desbloquearDia}
                      style={{ fontSize:12, color:'var(--success)', borderColor:'color-mix(in srgb, var(--success) 30%, transparent)' }}>
                      <Ban size={13} style={{ marginRight:5 }}/> Desbloquear
                    </button>
                  : <button className="btn btn-secondary" onClick={() => setModalBloqueo(true)}
                      style={{ fontSize:12, color:'var(--danger)', borderColor:'color-mix(in srgb, var(--danger) 30%, transparent)' }}>
                      <Ban size={13} style={{ marginRight:5 }}/> Bloquear día
                    </button>
              )}
              <button className="btn btn-primary" onClick={()=>setMostrarForm(v=>!v)} style={{ fontSize:13 }}>
                <Plus size={15} style={{ marginRight:6 }} />Nuevo turno
              </button>
            </div>
          </div>

          <AnimatePresence>
            {mostrarForm && (
              <motion.div initial={{ opacity:0,y:-12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-12 }} className="card" style={{ margin:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <h4 style={{ color:'var(--accent-bright)', margin:0 }}>Nuevo turno — {formatFechaLinda(diaSeleccionado)}</h4>
                  <button className="btn btn-secondary" onClick={()=>setMostrarForm(false)} style={{ padding:'4px 8px' }}><X size={14} /></button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group" style={{ margin:0 }}>
                    <label>Cliente</label>
                    <input className="input" value={form.cliente_nombre} onChange={e=>setForm({...form,cliente_nombre:e.target.value})} placeholder="Nombre del cliente" />
                  </div>
                  <div className="form-group" style={{ margin:0 }}>
                    <label>Hora</label>
                    <input className="input" type="time" value={form.hora} onChange={e=>setForm({...form,hora:e.target.value})} />
                  </div>
                  <div className="form-group" style={{ margin:0 }}>
                    <label>Peluquero</label>
                    <select className="input" value={form.peluquero_id} onChange={e=>setForm({...form,peluquero_id:e.target.value})}>
                      <option value="">Seleccioná...</option>
                      {peluqueros.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin:0 }}>
                    <label>Servicio <span style={{ color:'var(--text-muted)',fontSize:11 }}>(opcional)</span></label>
                    <select className="input" value={form.servicio_id} onChange={e=>setForm({...form,servicio_id:e.target.value})}>
                      <option value="">Seleccioná...</option>
                      {servicios.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin:0, gridColumn:'1 / -1' }}>
                    <label>Notas <span style={{ color:'var(--text-muted)',fontSize:11 }}>(opcional)</span></label>
                    <input className="input" value={form.notas} onChange={e=>setForm({...form,notas:e.target.value})} placeholder="Ej: cliente nuevo, corte especial..." />
                  </div>
                </div>
                <div style={{ display:'flex', gap:10, marginTop:14 }}>
                  <button className="btn btn-primary" onClick={guardarTurno} disabled={guardandoTurno}>{guardandoTurno ? 'Guardando...' : 'Guardar turno'}</button>
                  <button className="btn btn-secondary" onClick={()=>setMostrarForm(false)} disabled={guardandoTurno}>Cancelar</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="card" style={{ margin:0, padding:0, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border-soft)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:600, fontSize:14, color:'var(--text-main)' }}>Turnos del día</span>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>{turnosDia.length} turno{turnosDia.length!==1?'s':''}</span>
            </div>
            {cargandoDia ? (
              <div style={{ display:'flex', flexDirection:'column' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ padding:'14px 20px', borderBottom: i<3?'1px solid var(--border-soft)':'none', display:'flex', alignItems:'flex-start', gap:14 }}>
                    <Skeleton width={40} height={16} />
                    <div style={{ flex:1 }}>
                      <Skeleton width={140} height={13} style={{ marginBottom:8 }} />
                      <Skeleton width={180} height={11} />
                    </div>
                    <Skeleton width={70} height={22} radius={99} />
                  </div>
                ))}
              </div>
            ) : turnosDia.length === 0 ? (
              <div style={{ padding:'36px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
                {estaBloquado ? <><Ban size={13} style={{ verticalAlign: -2, marginRight: 4 }} /> Este día está bloqueado para reservas web.</> : 'No hay turnos para este día.'}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column' }}>
                {[...turnosDia].sort((a,b)=>a.hora.localeCompare(b.hora)).map((turno,i)=>{
                  const est=ESTADOS[turno.estado]||ESTADOS.pendiente; const EI=est.icon
                  return (
                    <motion.div key={turno.id} initial={{ opacity:0 }} animate={{ opacity:1 }}
                      style={{ padding:'14px 20px', borderBottom:i<turnosDia.length-1?'1px solid var(--border-soft)':'none', display:'flex', alignItems:'flex-start', gap:14 }}>
                      <div style={{ minWidth:48, textAlign:'center', paddingTop:2 }}>
                        <div style={{ fontSize:15, fontWeight:700, color:'var(--accent-bright)' }}>{turno.hora}</div>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <User size={13} color="var(--text-muted)" />
                          <span style={{ fontWeight:600, fontSize:14, color:'var(--text-main)' }}>{turno.cliente_nombre}</span>
                        </div>
                        <div style={{ display:'flex', gap:12, fontSize:12, color:'var(--text-muted)', flexWrap:'wrap' }}>
                          {turno.peluquero_nombre && <span style={{ display:'flex',alignItems:'center',gap:4 }}><User size={11}/> {turno.peluquero_nombre}</span>}
                          {turno.servicio_nombre  && <span style={{ display:'flex',alignItems:'center',gap:4 }}><Scissors size={11}/> {turno.servicio_nombre}</span>}
                        </div>
                        {turno.notas && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4, fontStyle:'italic' }}><StickyNote size={11} style={{ verticalAlign: -1, marginRight: 3 }} /> {turno.notas}</div>}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
                        <div style={{ display:'flex',alignItems:'center',gap:5,background:est.bg,color:est.color,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600 }}>
                          <EI size={11}/>{est.label}
                        </div>
                        <div style={{ display:'flex', gap:4 }}>
                          {Object.entries(ESTADOS).filter(([k])=>k!==turno.estado).map(([k,v])=>(
                            <button key={k} onClick={()=>cambiarEstado(turno,k)} title={`Marcar como ${v.label}`}
                              style={{ background:v.bg,border:`1px solid ${v.color}40`,borderRadius:6,padding:'3px 8px',cursor:'pointer',fontSize:10,color:v.color,fontWeight:600 }}>
                              {v.label}
                            </button>
                          ))}
                          <button className="btn btn-danger" onClick={()=>eliminarTurno(turno)} style={{ padding:'4px 8px' }}><Trash2 size={12}/></button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN 2 — RESERVAS ONLINE */}
      <div style={{ marginTop:36 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Globe size={20} color="var(--accent-bright)" />
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'var(--text-main)' }}>Reservas Online</h2>
            {pendientesCount > 0 && (
              <div style={{ background:'var(--warning)', color:'#000', borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:700 }}>
                {pendientesCount} pendiente{pendientesCount!==1?'s':''}
              </div>
            )}
            {senasCount > 0 && (
              <div style={{ background:'var(--warning)', color:'#000', borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:700 }}>
                {senasCount} seña{senasCount!==1?'s':''}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {peluqueriaId && (
              <div style={{ display:'flex', background:'var(--bg-card)', border:'1px solid var(--border-soft)', borderRadius:8, overflow:'hidden' }}>
                {[
                  { key:'pendientes', label:'Pendientes', badge: pendientesCount },
                  { key:'senas',      label:'Señas',   badge: senasCount      },
                  { key:'todos',      label:MESES[mes],   badge: 0               },
                ].map(f=>(
                  <button key={f.key} onClick={()=>setFiltroWeb(f.key)}
                    style={{ padding:'6px 14px', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.15s', position:'relative',
                      background: filtroWeb===f.key?'var(--accent)':'transparent',
                      color: filtroWeb===f.key?'white':'var(--text-muted)'
                    }}>
                    {f.label}
                    {f.badge > 0 && filtroWeb !== f.key && (
                      <span style={{ marginLeft:5, background: f.key==='senas' ? 'var(--warning)' : 'var(--warning)', color:'#000', borderRadius:20, padding:'1px 6px', fontSize:10, fontWeight:700 }}>
                        {f.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {peluqueriaId && (
              <button className="btn btn-secondary" onClick={cargarTurnosWeb} disabled={loadingWeb} style={{ padding:'6px 10px' }} title="Actualizar">
                <RefreshCw size={15} style={{ animation:loadingWeb?'spin 1s linear infinite':'none' }} />
              </button>
            )}
          </div>
        </div>

        {!peluqueriaId && (
          <div className="card" style={{ margin:0, padding:'40px 20px', textAlign:'center' }}>
            <Globe size={36} color="var(--text-muted)" style={{ marginBottom:12, opacity:0.3 }} />
            <p style={{ color:'var(--text-muted)', fontSize:14, margin:'0 0 6px' }}>La peluquería no está conectada a la web todavía.</p>
            <p style={{ color:'var(--text-muted)', fontSize:12 }}>Configurá la conexión en <strong>Configuración → Reservas Web</strong>.</p>
          </div>
        )}

        {peluqueriaId && sinConexion && (
          <div className="card" style={{ margin:0, padding:'32px 20px', textAlign:'center', borderColor:'color-mix(in srgb, var(--danger) 30%, transparent)', background:'color-mix(in srgb, var(--danger) 4%, transparent)' }}>
            <WifiOff size={32} color="var(--danger)" style={{ marginBottom:10 }} />
            <p style={{ color:'var(--danger)', fontSize:14, margin:'0 0 12px' }}>Sin conexión a internet</p>
            <button className="btn btn-secondary" onClick={cargarTurnosWeb}>Reintentar</button>
          </div>
        )}

        {peluqueriaId && loadingWeb && !sinConexion && (
          <div className="card" style={{ margin:0, padding:'32px 20px', textAlign:'center' }}>
            <RefreshCw size={24} color="var(--text-muted)" style={{ animation:'spin 1s linear infinite', marginBottom:10 }} />
            <p style={{ color:'var(--text-muted)', fontSize:13 }}>Cargando reservas...</p>
          </div>
        )}

        {peluqueriaId && !loadingWeb && !sinConexion && (
          turnosWeb.length === 0 ? (
            <div className="card" style={{ margin:0, padding:'36px 20px', textAlign:'center' }}>
              <Wifi size={32} color="var(--text-muted)" style={{ marginBottom:10, opacity:0.3 }} />
              <p style={{ color:'var(--text-muted)', fontSize:14 }}>
                {filtroWeb==='pendientes' ? 'No hay reservas pendientes de respuesta.' : filtroWeb==='senas' ? 'No hay señas pendientes de confirmación.' : `No hay reservas en ${MESES[mes]}.`}
              </p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:14 }}>
              {turnosWeb.map(turno => {
                // En tab 'senas', turno viene de turnos_senas (tiene .monto, .alias, .vence_at)
                const esSena = filtroWeb === 'senas'
                const est = esSena ? ESTADOS_WEB.esperando_sena : (ESTADOS_WEB[turno.estado] || ESTADOS_WEB.pendiente)
                const { Icon } = est
                const esPendiente = turno.estado === 'pendiente'
                const horas = esSena ? horasRestantes(turno.vence_at) : null
                const vencido = horas !== null && horas <= 0

                return (
                  <motion.div key={turno.id} initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}
                    className="card"
                    style={{ margin:0, padding:0, overflow:'hidden', border:`1px solid ${est.border}`, background:est.bg }}>
                    <div style={{ padding:'12px 16px', borderBottom:`1px solid ${est.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, color:est.color, fontSize:12, fontWeight:600 }}>
                        <Icon size={13}/>{est.label}
                        {esSena && horas !== null && !vencido && (
                          <span style={{ marginLeft:4, fontSize:10, color:'var(--text-muted)', fontWeight:400 }}>
                            · vence en {horas}hs
                          </span>
                        )}
                        {vencido && (
                          <span style={{ marginLeft:4, fontSize:10, color:'var(--danger)', fontWeight:600 }}>· vencida</span>
                        )}
                      </div>
                      <span style={{ fontSize:15, color:'var(--text-main)', fontWeight:600 }}>
                        {formatFechaCorta(turno.fecha)} · {turno.hora?.substring(0,5)}hs
                      </span>
                    </div>
                    <div style={{ padding:'14px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                        <div style={{ width:34,height:34,borderRadius:'50%',background:'var(--accent-soft)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                          <span style={{ color:'var(--accent-bright)',fontWeight:700,fontSize:15 }}>{turno.cliente_nombre?.[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:14, color:'var(--text-main)' }}>{turno.cliente_nombre}</div>
                          <div style={{ fontSize:11, color:'var(--text-muted)' }}>{turno.cliente_email}</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:5, fontSize:12, marginBottom:14 }}>
                        <div style={{ display:'flex', justifyContent:'space-between' }}>
                          <span style={{ color:'var(--text-muted)' }}>Peluquero</span>
                          <span style={{ color:'var(--text-main)', fontWeight:500 }}>{turno.peluquero_nombre}</span>
                        </div>
                        {turno.servicio_nombre && (
                          <div style={{ display:'flex', justifyContent:'space-between' }}>
                            <span style={{ color:'var(--text-muted)' }}>Servicio</span>
                            <span style={{ color:'var(--text-main)' }}>{turno.servicio_nombre}</span>
                          </div>
                        )}
                      </div>

                      {turno.estado === 'modificado' && turno.fecha_propuesta && (
                        <div style={{ background:'color-mix(in srgb, var(--info) 10%, transparent)', border:'1px solid color-mix(in srgb, var(--info) 30%, transparent)', borderRadius:8, padding:'10px 12px', marginBottom:14, fontSize:12 }}>
                          <div style={{ color:'var(--info)', fontWeight:600, marginBottom:5, fontSize:11 }}>⏳ ESPERANDO OK DEL CLIENTE</div>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                            <span style={{ color:'var(--text-muted)' }}>Nueva fecha</span>
                            <span style={{ color:'white', fontWeight:600 }}>{formatFechaCorta(turno.fecha_propuesta)}</span>
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between' }}>
                            <span style={{ color:'var(--text-muted)' }}>Nueva hora</span>
                            <span style={{ color:'white', fontWeight:600 }}>{turno.hora_propuesta?.substring(0,5)}hs</span>
                          </div>
                          {turno.motivo && <div style={{ color:'var(--text-muted)', fontSize:11, marginTop:6, fontStyle:'italic' }}><MessageCircle size={11} style={{ verticalAlign: -1, marginRight: 3 }} /> {turno.motivo}</div>}
                        </div>
                      )}

                      {/* ── PANEL SEÑA ── */}
                      {esSena && (
                        <div style={{
                          background: vencido ? 'color-mix(in srgb, var(--danger) 8%, transparent)' : 'color-mix(in srgb, var(--warning) 10%, transparent)',
                          border: `1px solid ${vencido ? 'color-mix(in srgb, var(--danger) 30%, transparent)' : 'color-mix(in srgb, var(--warning) 35%, transparent)'}`,
                          borderRadius:8, padding:'12px 14px', marginBottom:14, fontSize:12
                        }}>
                          <div style={{ color: vencido ? 'var(--danger)' : 'var(--warning)', fontWeight:700, marginBottom:8, fontSize:11, display:'flex', alignItems:'center', gap:5 }}>
                            <DollarSign size={11} />
                            {vencido ? 'SEÑA VENCIDA — NO PAGÓ' : 'ESPERANDO PAGO DE SEÑA'}
                          </div>
                          {!vencido && (
                            <>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                                <span style={{ color:'var(--text-muted)' }}>Monto</span>
                                <span style={{ color:'white', fontWeight:700 }}>${Number(turno.monto).toLocaleString('es-AR')}</span>
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                                <span style={{ color:'var(--text-muted)' }}>Alias / CBU</span>
                                <span style={{ color:'white', fontWeight:600, fontFamily:'monospace' }}>{turno.alias || '—'}</span>
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between' }}>
                                <span style={{ color:'var(--text-muted)' }}>Vence en</span>
                                <span style={{ color: horas <= 3 ? 'var(--danger)' : 'var(--warning)', fontWeight:600 }}>{horas}hs</span>
                              </div>
                            </>
                          )}
                          {vencido && (
                            <p style={{ color:'var(--text-muted)', fontSize:11, margin:0 }}>
                              El cliente no pagó la seña a tiempo. Podés cancelar el turno.
                            </p>
                          )}
                        </div>
                      )}

                      {(turno.estado==='rechazado'||turno.estado==='cancelado') && turno.motivo && (
                        <div style={{ fontSize:11, color:'var(--text-muted)', fontStyle:'italic', marginBottom:10 }}><MessageCircle size={11} style={{ verticalAlign: -1, marginRight: 3 }} /> {turno.motivo}</div>
                      )}

                      {/* ── ACCIONES ── */}
                      {esPendiente && (
                        <button className="btn btn-primary" onClick={() => setTurnoResponder(turno)}
                          style={{ width:'100%', fontSize:13, justifyContent:'center' }}>
                          Responder →
                        </button>
                      )}

                      {esSena && !vencido && (
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                          <button className="btn btn-primary"
                            onClick={() => confirmarSenaPagada(turno)}
                            disabled={confirmandoSena === turno.id}
                            style={{ width:'100%', fontSize:13, justifyContent:'center', background:'color-mix(in srgb, var(--success) 15%, transparent)', borderColor:'color-mix(in srgb, var(--success) 40%, transparent)', color:'var(--success)' }}>
                            {confirmandoSena === turno.id ? 'Confirmando...' : 'Recibí la seña — Confirmar turno'}
                          </button>
                          <button className="btn btn-secondary"
                            onClick={() => { setTurnoCancelar(turno); setMotivoCancelacion('No se recibió el pago de la seña.') }}
                            style={{ width:'100%', fontSize:12, justifyContent:'center', color:'var(--danger)', borderColor:'color-mix(in srgb, var(--danger) 30%, transparent)' }}>
                            Cancelar (no pagó)
                          </button>
                        </div>
                      )}

                      {esSena && vencido && (
                        <button className="btn btn-secondary"
                          onClick={() => { setTurnoCancelar(turno); setMotivoCancelacion('Seña no recibida a tiempo.') }}
                          style={{ width:'100%', fontSize:12, justifyContent:'center', color:'var(--danger)', borderColor:'color-mix(in srgb, var(--danger) 30%, transparent)' }}>
                          Cancelar turno vencido
                        </button>
                      )}

                      {turno.estado === 'confirmado' && (
                        <button className="btn btn-secondary"
                          onClick={() => { setTurnoCancelar(turno); setMotivoCancelacion('') }}
                          style={{ width:'100%', fontSize:13, justifyContent:'center', color:'var(--danger)', borderColor:'color-mix(in srgb, var(--danger) 40%, transparent)' }}>
                          Cancelar turno
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
