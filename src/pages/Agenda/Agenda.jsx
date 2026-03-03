import { useState, useEffect, useCallback } from 'react'
import { Plus, ChevronLeft, ChevronRight, Clock, User, Scissors, CheckCircle, XCircle, AlertCircle, Trash2, X, Globe, RefreshCw, Wifi, WifiOff, Ban } from 'lucide-react'
import { ModalConfirm, ModalAlert } from '../../components/Modal'
import { motion, AnimatePresence } from 'framer-motion'

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const ESTADOS = {
  pendiente:  { label: 'Pendiente',  color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',   icon: AlertCircle },
  confirmado: { label: 'Confirmado', color: '#4ade80', bg: 'rgba(74,222,128,0.15)',    icon: CheckCircle },
  cancelado:  { label: 'Cancelado',  color: '#f87171', bg: 'rgba(248,113,113,0.15)',   icon: XCircle     },
}

const ESTADOS_WEB = {
  pendiente:  { label: 'Esperando respuesta',  color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.3)',  Icon: Clock       },
  modificado: { label: 'Esperando OK cliente', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.3)',  Icon: AlertCircle },
  confirmado: { label: 'Confirmado',           color: '#4ade80', bg: 'rgba(74,222,128,0.06)',  border: 'rgba(74,222,128,0.2)',  Icon: CheckCircle },
  rechazado:  { label: 'Rechazado',            color: '#f87171', bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.2)', Icon: XCircle     },
  cancelado:  { label: 'Cancelado',            color: '#71717a', bg: 'rgba(113,113,122,0.06)', border: 'rgba(113,113,122,0.2)', Icon: XCircle     },
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
          {turno.peluquero_nombre && <span style={{ color:'#a78bfa' }}> · {turno.peluquero_nombre}</span>}
        </p>

        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          {[
            { key:'confirmado', label:'✓ Confirmar', color:'#4ade80', bg:'rgba(74,222,128,0.15)'  },
            { key:'modificado', label:'✏️ Modificar', color:'#60a5fa', bg:'rgba(96,165,250,0.15)' },
            { key:'rechazado',  label:'✗ Rechazar',  color:'#f87171', bg:'rgba(248,113,113,0.15)' },
          ].map(op => (
            <button key={op.key} onClick={() => setAccion(op.key)}
              style={{
                flex:1, padding:'10px 6px', borderRadius:10, cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.15s',
                border:`1.5px solid ${accion === op.key ? op.color : 'var(--border-soft)'}`,
                background: accion === op.key ? op.bg : 'transparent',
                color: accion === op.key ? op.color : 'var(--text-muted)',
              }}>
              {op.label}
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
  const [form, setForm]             = useState({ peluquero_id:'', servicio_id:'', cliente_nombre:'', hora:'', notas:'', estado:'pendiente' })
  const [modalConfirm, setModalConfirm] = useState(null)
  const [modalAlert, setModalAlert]     = useState(null)

  // Reservas online
  const [turnosWeb, setTurnosWeb]       = useState([])
  const [loadingWeb, setLoadingWeb]     = useState(false)
  const [sinConexion, setSinConexion]   = useState(false)
  const [peluqueriaId, setPeluqueriaId] = useState(null)
  const [turnoResponder, setTurnoResponder] = useState(null)
  const [filtroWeb, setFiltroWeb]       = useState('pendientes')
  const [turnoCancelar, setTurnoCancelar]       = useState(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [diasBloqueados, setDiasBloqueados] = useState([])
  const [motivoBloqueo, setMotivoBloqueo]   = useState('')
  const [modalBloqueo, setModalBloqueo]     = useState(false)

  const confirmar = (msg, fn) => setModalConfirm({ mensaje:msg, onConfirm:fn })
  const alertar   = (msg, tipo='info') => setModalAlert({ mensaje:msg, tipo })

  const cargarDiasBloqueados = () =>
    window.electronAPI.getDiasBloqueados().then(data => setDiasBloqueados(data || []))

  useEffect(() => {
    window.electronAPI.getPeluqueros().then(setPeluqueros)
    window.electronAPI.getServicios().then(setServicios)
    window.electronAPI.getPeluqueriaConfig().then(cfg => { if (cfg?.id) setPeluqueriaId(cfg.id) })
    window.electronAPI.sincronizarCanceladosWeb()
    window.electronAPI.sincronizarConfirmadosWeb()
    cargarDiasBloqueados()
    // Escuchar notificación de turno nuevo → refrescar lista
    // Escuchar turno nuevo via postMessage
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
      const data = filtroWeb === 'pendientes'
        ? await window.electronAPI.getTurnosWebPendientes()
        : await window.electronAPI.getTurnosWebTodos(`${anio}-${String(mes+1).padStart(2,'0')}`)
      setTurnosDia(await window.electronAPI.getTurnosByFecha(diaSeleccionado))
      cargarMes()
      setTurnosWeb(data || [])
    } catch { setSinConexion(true) }
    finally  { setLoadingWeb(false) }
  }

  useEffect(() => { cargarMes() }, [cargarMes])
  useEffect(() => { cargarDia() }, [cargarDia])
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
    return turnosMes.filter(t => t.fecha === f)
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
    if (!form.cliente_nombre.trim()) { alertar('Ingresá el nombre del cliente.','warning'); return }
    if (!form.hora)                  { alertar('Ingresá la hora del turno.','warning');     return }
    if (!form.peluquero_id)          { alertar('Seleccioná un peluquero.','warning');       return }
    await window.electronAPI.createTurno({ ...form, fecha:diaSeleccionado, peluquero_id:Number(form.peluquero_id), servicio_id:form.servicio_id?Number(form.servicio_id):null })
    setForm({ peluquero_id:'', servicio_id:'', cliente_nombre:'', hora:'', notas:'', estado:'pendiente' })
    setMostrarForm(false)
    await cargarMes(); await cargarDia()
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
      const msgs = { confirmado:'confirmado ✓', modificado:'modificado — el cliente será notificado', rechazado:'rechazado' }
      alertar(`Turno ${msgs[payload.accion]}. Email enviado al cliente.`, 'success')
      cargarTurnosWeb(); cargarMes(); cargarDia()
    } else {
      alertar('Error al responder: ' + (result?.error || 'Intentá de nuevo.'), 'error')
    }
  }

  const dias     = getDiasDelMes(anio, mes)
  const fechaHoy = hoy()
  const dotColor = (ts) => ts.some(t=>t.estado==='pendiente') ? '#fbbf24' : ts.some(t=>t.estado==='confirmado') ? '#4ade80' : '#f87171'
  const pendientesCount = turnosWeb.filter(t => t.estado==='pendiente'||t.estado==='modificado').length

  return (
    <div className="page-animation">
      {modalConfirm   && <ModalConfirm mensaje={modalConfirm.mensaje} onConfirm={modalConfirm.onConfirm} onCancel={()=>setModalConfirm(null)} />}
      {modalAlert     && <ModalAlert   mensaje={modalAlert.mensaje}   tipo={modalAlert.tipo}             onClose={()=>setModalAlert(null)} />}
      {turnoResponder && <ModalResponder turno={turnoResponder} onConfirm={responderTurnoWeb} onCancel={()=>setTurnoResponder(null)} />}

      {/* Modal bloqueo de día */}
      {modalBloqueo && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
            style={{ background:'var(--bg-card)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:16, padding:28, width:'100%', maxWidth:400 }}>
            <h3 style={{ color:'#f87171', margin:'0 0 6px', fontSize:17 }}>🚫 Bloquear día</h3>
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
                style={{ flex:1, background:'rgba(248,113,113,0.15)', borderColor:'rgba(248,113,113,0.4)', color:'#f87171' }}
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
            style={{ background:'var(--bg-card)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:16, padding:28, width:'100%', maxWidth:400 }}>
            <h3 style={{ color:'#f87171', margin:'0 0 6px', fontSize:17 }}>Cancelar turno</h3>
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
                style={{ flex:1, background:'rgba(248,113,113,0.15)', borderColor:'rgba(248,113,113,0.4)', color:'#f87171' }}
                onClick={async () => {
                  const result = await window.electronAPI.responderTurnoWeb({
                    id: turnoCancelar.id, accion: 'cancelado',
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
                    background: bloqueado ? 'rgba(248,113,113,0.08)' : sel?'var(--accent-soft)':esH?'rgba(167,139,250,0.08)':'transparent',
                    border: bloqueado ? '1px solid rgba(248,113,113,0.3)' : sel?'1px solid var(--accent)':esH?'1px solid rgba(124,58,237,0.3)':'1px solid transparent',
                    opacity: bloqueado ? 0.7 : 1,
                  }}>
                  <span style={{ fontSize:13, fontWeight:sel||esH?700:400, color: bloqueado?'#f87171':sel?'#c4b5fd':esH?'#a78bfa':'var(--text-main)' }}>{dia}</span>
                  {bloqueado
                    ? <Ban size={10} color="#f87171" />
                    : tdm.length > 0 && (
                      <div style={{ display:'flex', gap:3, flexWrap:'wrap', justifyContent:'center' }}>
                        {tdm.length<=3
                          ? tdm.map((t,idx)=><div key={idx} style={{ width:6,height:6,borderRadius:'50%',background:ESTADOS[t.estado]?.color||'#a78bfa' }} />)
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
              <Ban size={9} color="#f87171" /> Bloqueado
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
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4, fontSize:12, color:'#f87171' }}>
                  <Ban size={11}/> Bloqueado{infoBloqueado?.motivo ? ` — ${infoBloqueado.motivo}` : ''}
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {/* Botón bloquear / desbloquear */}
              {peluqueriaId && (
                estaBloquado
                  ? <button className="btn btn-secondary" onClick={desbloquearDia}
                      style={{ fontSize:12, color:'#4ade80', borderColor:'rgba(74,222,128,0.3)' }}>
                      <Ban size={13} style={{ marginRight:5 }}/> Desbloquear
                    </button>
                  : <button className="btn btn-secondary" onClick={() => setModalBloqueo(true)}
                      style={{ fontSize:12, color:'#f87171', borderColor:'rgba(248,113,113,0.3)' }}>
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
                  <h4 style={{ color:'#a78bfa', margin:0 }}>Nuevo turno — {formatFechaLinda(diaSeleccionado)}</h4>
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
                  <button className="btn btn-primary" onClick={guardarTurno}>Guardar turno</button>
                  <button className="btn btn-secondary" onClick={()=>setMostrarForm(false)}>Cancelar</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="card" style={{ margin:0, padding:0, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border-soft)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:600, fontSize:14, color:'var(--text-main)' }}>Turnos del día</span>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>{turnosDia.length} turno{turnosDia.length!==1?'s':''}</span>
            </div>
            {turnosDia.length === 0 ? (
              <div style={{ padding:'36px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
                {estaBloquado ? '🚫 Este día está bloqueado para reservas web.' : 'No hay turnos para este día.'}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column' }}>
                {[...turnosDia].sort((a,b)=>a.hora.localeCompare(b.hora)).map((turno,i)=>{
                  const est=ESTADOS[turno.estado]||ESTADOS.pendiente; const EI=est.icon
                  return (
                    <motion.div key={turno.id} initial={{ opacity:0 }} animate={{ opacity:1 }}
                      style={{ padding:'14px 20px', borderBottom:i<turnosDia.length-1?'1px solid var(--border-soft)':'none', display:'flex', alignItems:'flex-start', gap:14 }}>
                      <div style={{ minWidth:48, textAlign:'center', paddingTop:2 }}>
                        <div style={{ fontSize:15, fontWeight:700, color:'#a78bfa' }}>{turno.hora}</div>
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
                        {turno.notas && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4, fontStyle:'italic' }}>📝 {turno.notas}</div>}
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
            <Globe size={20} color="#a78bfa" />
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'var(--text-main)' }}>Reservas Online</h2>
            {pendientesCount > 0 && (
              <div style={{ background:'#fbbf24', color:'#000', borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:700 }}>
                {pendientesCount} pendiente{pendientesCount!==1?'s':''}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {peluqueriaId && (
              <div style={{ display:'flex', background:'var(--bg-card)', border:'1px solid var(--border-soft)', borderRadius:8, overflow:'hidden' }}>
                {[
                  { key:'pendientes', label:'Pendientes' },
                  { key:'todos',      label:MESES[mes]   },
                ].map(f=>(
                  <button key={f.key} onClick={()=>setFiltroWeb(f.key)}
                    style={{ padding:'6px 14px', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.15s',
                      background: filtroWeb===f.key?'var(--accent)':'transparent',
                      color: filtroWeb===f.key?'white':'var(--text-muted)'
                    }}>
                    {f.label}
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
          <div className="card" style={{ margin:0, padding:'32px 20px', textAlign:'center', borderColor:'rgba(248,113,113,0.3)', background:'rgba(248,113,113,0.04)' }}>
            <WifiOff size={32} color="#f87171" style={{ marginBottom:10 }} />
            <p style={{ color:'#f87171', fontSize:14, margin:'0 0 12px' }}>Sin conexión a internet</p>
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
                {filtroWeb==='pendientes' ? 'No hay reservas pendientes de respuesta.' : `No hay reservas en ${MESES[mes]}.`}
              </p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:14 }}>
              {turnosWeb.map(turno => {
                const est = ESTADOS_WEB[turno.estado] || ESTADOS_WEB.pendiente
                const { Icon } = est
                const esPendiente = turno.estado === 'pendiente'
                return (
                  <motion.div key={turno.id} initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}
                    className="card"
                    style={{ margin:0, padding:0, overflow:'hidden', border:`1px solid ${est.border}`, background:est.bg }}>
                    <div style={{ padding:'12px 16px', borderBottom:`1px solid ${est.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, color:est.color, fontSize:12, fontWeight:600 }}>
                        <Icon size={13}/>{est.label}
                      </div>
                      <span style={{ fontSize:15, color:'var(--text-main)', fontWeight:600 }}>
                        {formatFechaCorta(turno.fecha)} · {turno.hora?.substring(0,5)}hs
                      </span>
                    </div>
                    <div style={{ padding:'14px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                        <div style={{ width:34,height:34,borderRadius:'50%',background:'var(--accent-soft)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                          <span style={{ color:'#a78bfa',fontWeight:700,fontSize:15 }}>{turno.cliente_nombre?.[0]?.toUpperCase()}</span>
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
                        <div style={{ background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.3)', borderRadius:8, padding:'10px 12px', marginBottom:14, fontSize:12 }}>
                          <div style={{ color:'#60a5fa', fontWeight:600, marginBottom:5, fontSize:11 }}>⏳ ESPERANDO OK DEL CLIENTE</div>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                            <span style={{ color:'var(--text-muted)' }}>Nueva fecha</span>
                            <span style={{ color:'white', fontWeight:600 }}>{formatFechaCorta(turno.fecha_propuesta)}</span>
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between' }}>
                            <span style={{ color:'var(--text-muted)' }}>Nueva hora</span>
                            <span style={{ color:'white', fontWeight:600 }}>{turno.hora_propuesta?.substring(0,5)}hs</span>
                          </div>
                          {turno.motivo && <div style={{ color:'var(--text-muted)', fontSize:11, marginTop:6, fontStyle:'italic' }}>💬 {turno.motivo}</div>}
                        </div>
                      )}
                      {(turno.estado==='rechazado'||turno.estado==='cancelado') && turno.motivo && (
                        <div style={{ fontSize:11, color:'var(--text-muted)', fontStyle:'italic', marginBottom:10 }}>💬 {turno.motivo}</div>
                      )}
                      {esPendiente && (
                        <button className="btn btn-primary" onClick={() => setTurnoResponder(turno)}
                          style={{ width:'100%', fontSize:13, justifyContent:'center' }}>
                          Responder →
                        </button>
                      )}
                      {turno.estado === 'confirmado' && (
                        <button className="btn btn-secondary"
                          onClick={() => { setTurnoCancelar(turno); setMotivoCancelacion('') }}
                          style={{ width:'100%', fontSize:13, justifyContent:'center', color:'#f87171', borderColor:'rgba(248,113,113,0.4)' }}>
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
