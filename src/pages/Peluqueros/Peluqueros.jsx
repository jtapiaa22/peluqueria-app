import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, CalendarOff, ChevronDown, ChevronUp, X, DollarSign, Users } from 'lucide-react'
import { ModalConfirm, ModalAlert } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import EmptyState from '../../components/EmptyState'
import Skeleton from '../../components/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'

function formatFecha(f) {
  if (!f) return ''
  const [y, m, d] = f.split('-').map(Number)
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d} ${meses[m-1]} ${y}`
}

const fmtMiles = (val) => {
  if (val === '' || val == null) return ''
  const n = Number(String(val).replace(/\./g, ''))
  return isNaN(n) ? '' : n.toLocaleString('es-AR')
}
const parseMiles = (val) => String(val).replace(/\./g, '').replace(/[^0-9]/g, '')

function estaActivo(desde, hasta) {
  const hoy = new Date().toISOString().substring(0, 10)
  return desde <= hoy && hoy <= hasta
}

export default function Peluqueros() {
  const [peluqueros, setPeluqueros]     = useState([])
  const [bloqueos, setBloqueos]         = useState({})
  const [form, setForm]                 = useState({ nombre: '', comision: '', porcentaje_propina: '100' })
  const [editando, setEditando]         = useState(null)
  const [mostrarForm, setMostrarForm]   = useState(false)
  const [modalConfirm, setModalConfirm] = useState(null)
  const [modalAlert, setModalAlert]     = useState(null)
  const [sincState, setSincState]       = useState(null)
  const [cargando, setCargando]         = useState(true)
  const [bloqueoAbierto, setBloqueoAbierto] = useState(null)
  const [formBloqueo, setFormBloqueo]       = useState({ desde: '', hasta: '', motivo: '' })
  const [guardandoBloqueo, setGuardandoBloqueo] = useState(false)

  // Tramos de comisión
  const [tramos, setTramos]             = useState({}) // { [peluquero_id]: [{monto_desde, monto_pago}] }
  const [tramosAbierto, setTramosAbierto] = useState(null)
  const [tramosEdit, setTramosEdit]       = useState([]) // tramos editables del panel abierto
  const [guardandoTramos, setGuardandoTramos] = useState(false)

  const confirmar = (mensaje, onConfirm) => setModalConfirm({ mensaje, onConfirm })
  const toast = useToast()
  const alertar   = (mensaje, tipo = 'info') => {
    if (tipo === 'error' || tipo === 'warning') setModalAlert({ mensaje, tipo })
    else toast(mensaje, tipo)
  }

  const cargar = async () => {
    const data = await window.electronAPI.getPeluqueros()
    setPeluqueros(data)
    const todos = await window.electronAPI.getBloqueosPeluquero()
    const agrupados = {}
    for (const b of (todos || [])) {
      if (!agrupados[b.peluquero_id]) agrupados[b.peluquero_id] = []
      agrupados[b.peluquero_id].push(b)
    }
    setBloqueos(agrupados)
    const todosTramos = await window.electronAPI.getAllTramosComision()
    const agrupadosT = {}
    for (const t of (todosTramos || [])) {
      if (!agrupadosT[t.peluquero_id]) agrupadosT[t.peluquero_id] = []
      agrupadosT[t.peluquero_id].push(t)
    }
    setTramos(agrupadosT)
  }

  useEffect(() => {
    setCargando(true)
    cargar().finally(() => setCargando(false))
  }, [])

  const guardar = async () => {
    if (!form.nombre.trim()) { alertar('Por favor ingresá el nombre del peluquero.', 'warning'); return }
    setSincState('syncing')
    if (editando) {
      await window.electronAPI.updatePeluquero({ ...form, id: editando })
    } else {
      await window.electronAPI.createPeluquero(form)
    }
    setForm({ nombre: '', comision: '', porcentaje_propina: '100' })
    setEditando(null)
    setMostrarForm(false)
    cargar()
    setSincState('ok')
    setTimeout(() => setSincState(null), 3000)
  }

  const editar = (p) => {
    setForm({ nombre: p.nombre, comision: p.comision, porcentaje_propina: p.porcentaje_propina != null ? String(p.porcentaje_propina) : '100' })
    setEditando(p.id)
    setMostrarForm(true)
    setBloqueoAbierto(null)
  }

  const eliminar = (id) => {
    confirmar('¿Dar de baja este peluquero?', async () => {
      setModalConfirm(null)
      await window.electronAPI.deletePeluquero(id)
      cargar()
    })
  }

  const toggleBloqueoPanel = (id) => {
    setBloqueoAbierto(prev => prev === id ? null : id)
    setFormBloqueo({ desde: '', hasta: '', motivo: '' })
  }

  const guardarBloqueo = async (peluqueroId) => {
    const { desde, hasta, motivo } = formBloqueo
    if (!desde || !hasta) { alertar('Ingresá fecha de inicio y fin.', 'warning'); return }
    if (desde > hasta) { alertar('La fecha de inicio debe ser anterior a la de fin.', 'warning'); return }
    setGuardandoBloqueo(true)
    await window.electronAPI.crearBloqueoPeluquero({ peluquero_id: peluqueroId, desde, hasta, motivo })
    setFormBloqueo({ desde: '', hasta: '', motivo: '' })
    setGuardandoBloqueo(false)
    cargar()
  }

  const eliminarBloqueo = (id) => {
    confirmar('¿Eliminar este período de ausencia?', async () => {
      setModalConfirm(null)
      await window.electronAPI.eliminarBloqueoPeluquero(id)
      cargar()
    })
  }

  const abrirTramosPanel = (peluqueroId) => {
    if (tramosAbierto === peluqueroId) {
      setTramosAbierto(null)
      setTramosEdit([])
      return
    }
    setTramosAbierto(peluqueroId)
    setBloqueoAbierto(null)
    const tramosP = (tramos[peluqueroId] || []).map(t => ({ monto_desde: String(t.monto_desde), monto_pago: String(t.monto_pago) }))
    setTramosEdit(tramosP)
  }

  const agregarFilaTramo = () => {
    setTramosEdit(prev => [...prev, { monto_desde: '', monto_pago: '' }])
  }

  const actualizarFilaTramo = (i, campo, valor) => {
    setTramosEdit(prev => prev.map((t, idx) => idx === i ? { ...t, [campo]: valor } : t))
  }

  const eliminarFilaTramo = (i) => {
    setTramosEdit(prev => prev.filter((_, idx) => idx !== i))
  }

  const guardarTramos = async (peluqueroId) => {
    for (const t of tramosEdit) {
      if (!t.monto_desde || !t.monto_pago || isNaN(Number(t.monto_desde)) || isNaN(Number(t.monto_pago))) {
        alertar('Completá todos los campos con valores numéricos.', 'warning')
        return
      }
    }
    setGuardandoTramos(true)
    await window.electronAPI.saveTramosComision({ peluquero_id: peluqueroId, tramos: tramosEdit })
    await cargar()
    setGuardandoTramos(false)
    alertar('Tabla de pagos guardada correctamente.', 'success')
  }

  return (
    <div className="page-animation">
      {modalConfirm && (
        <ModalConfirm
          mensaje={modalConfirm.mensaje}
          onConfirm={modalConfirm.onConfirm}
          onCancel={() => setModalConfirm(null)}
        />
      )}
      {modalAlert && (
        <ModalAlert
          mensaje={modalAlert.mensaje}
          tipo={modalAlert.tipo}
          onClose={() => setModalAlert(null)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title">Peluqueros</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {sincState && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
              color: sincState === 'ok' ? '#4ade80' : sincState === 'error' ? '#f87171' : 'var(--accent-bright)',
            }}>
              <RefreshCw size={13} style={{ animation: sincState === 'syncing' ? 'spin 1s linear infinite' : 'none' }} />
              {sincState === 'syncing' ? 'Sincronizando...' : sincState === 'ok' ? '✓ Sincronizado' : 'Error al sincronizar'}
            </div>
          )}
          <button className="btn btn-primary" onClick={() => {
            setMostrarForm(!mostrarForm); setEditando(null)
            setForm({ nombre: '', comision: '', porcentaje_propina: '100' }); setBloqueoAbierto(null)
          }}>
            <Plus size={16} style={{ marginRight: 6 }} />Agregar
          </button>
        </div>
      </div>

      {/* Formulario nuevo/editar */}
      <AnimatePresence>
        {mostrarForm && (
          <motion.div className="card"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
          >
            <h3 style={{ marginBottom: 16, color: 'var(--accent-bright)' }}>
              {editando ? 'Editar peluquero' : 'Nuevo peluquero'}
            </h3>
            <div className="form-group">
              <label>Nombre</label>
              <input className="input" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre completo" />
            </div>
            <div className="form-group">
              <label>Comisión (%)</label>
              <input className="input" type="number" value={form.comision}
                onChange={e => setForm({ ...form, comision: e.target.value })} placeholder="Ej: 50" />
            </div>
            <div className="form-group">
              <label>% Propinas para el peluquero</label>
              <input className="input" type="number" min="0" max="100" value={form.porcentaje_propina}
                onChange={e => setForm({ ...form, porcentaje_propina: e.target.value })} placeholder="Ej: 100" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button className="btn btn-primary" onClick={guardar}>Guardar</button>
              <button className="btn btn-secondary" onClick={() => setMostrarForm(false)}>Cancelar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de peluqueros como cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {cargando && Array.from({ length: 4 }).map((_, i) => (
          <div key={`sk-${i}`} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <Skeleton width={160} height={16} style={{ marginBottom: 10 }} />
              <Skeleton width={220} height={12} />
            </div>
            <Skeleton width={90} height={32} radius={8} />
          </div>
        ))}

        {!cargando && peluqueros.length === 0 && (
          <div className="card">
            <EmptyState icono={<Users size={30} />} titulo="No hay peluqueros registrados" texto="Agregá el primero con el botón de arriba." padding="20px" />
          </div>
        )}

        {!cargando && peluqueros.map(p => {
          const bloqueosP     = bloqueos[p.id] || []
          const tramosP       = tramos[p.id] || []
          const hoy           = new Date().toISOString().substring(0, 10)
          const bloqueoActivo  = bloqueosP.find(b => b.desde <= hoy && hoy <= b.hasta)
          const panelAbierto   = bloqueoAbierto === p.id
          const tramosPanel    = tramosAbierto === p.id

          return (
            <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>

              {/* Fila principal */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: bloqueoActivo ? 'rgba(251,191,36,0.15)' : 'rgba(var(--accent-rgb),0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 17, fontWeight: 700,
                    color: bloqueoActivo ? '#fbbf24' : 'var(--accent-bright)',
                  }}>
                    {p.nombre[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>{p.nombre}</span>
                      {bloqueoActivo && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap',
                          background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)'
                        }}>
                          🏖 Ausente · vuelve {formatFecha(bloqueoActivo.hasta)}
                        </span>
                      )}
                      {tramosP.length > 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap',
                          background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)'
                        }}>
                          💲 {tramosP.length} rango{tramosP.length !== 1 ? 's' : ''} de pago
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Comisión: {p.comision}%
                      {(p.porcentaje_propina != null && Number(p.porcentaje_propina) !== 100) && (
                        <span style={{ color: '#fb923c', marginLeft: 6 }}>· propina {p.porcentaje_propina}%</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setBloqueoAbierto(null); abrirTramosPanel(p.id) }}
                    title="Configurar pago por servicio"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      color: tramosPanel ? '#4ade80' : undefined,
                      borderColor: tramosPanel ? 'rgba(74,222,128,0.4)' : undefined
                    }}
                  >
                    <DollarSign size={14} />
                    Pago por servicio
                    {tramosPanel ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setTramosAbierto(null); toggleBloqueoPanel(p.id) }}
                    title="Gestionar ausencias"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      color: panelAbierto ? 'var(--accent-bright)' : undefined,
                      borderColor: panelAbierto ? 'rgba(var(--accent-rgb),0.5)' : undefined
                    }}
                  >
                    <CalendarOff size={14} />
                    Ausencias
                    {bloqueosP.length > 0 && (
                      <span style={{
                        background: bloqueoActivo ? '#fbbf24' : '#52525b',
                        color: bloqueoActivo ? '#000' : '#fff',
                        borderRadius: 99, fontSize: 10, fontWeight: 700,
                        padding: '1px 5px', minWidth: 16, textAlign: 'center'
                      }}>{bloqueosP.length}</span>
                    )}
                    {panelAbierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  <button className="btn btn-secondary" onClick={() => editar(p)} title="Editar"><Pencil size={14} /></button>
                  <button className="btn btn-danger" onClick={() => eliminar(p.id)} title="Eliminar"><Trash2 size={14} /></button>
                </div>
              </div>

              {/* Panel TRAMOS de comisión */}
              <AnimatePresence>
                {tramosPanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ borderTop: '1px solid var(--border)', background: 'rgba(74,222,128,0.02)', padding: '16px 18px' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                        💲 Pago por servicio
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                        Indicá cuánto cobra el peluquero según el precio del servicio.
                        Por ejemplo: si el corte sale $12.000, le pagás $7.500.
                        Si no configurás nada, se usa el % de comisión general.
                      </p>

                      {/* Tabla de tramos */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                        {/* Header */}
                        {tramosEdit.length > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, paddingBottom: 4 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Precio del servicio ($)</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Se le paga al peluquero ($)</span>
                            <span />
                          </div>
                        )}
                        {tramosEdit.map((t, i) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                            <input
                              className="input"
                              type="text"
                              inputMode="numeric"
                              value={fmtMiles(t.monto_desde)}
                              onChange={e => actualizarFilaTramo(i, 'monto_desde', parseMiles(e.target.value))}
                              placeholder="Ej: 12.000"
                              style={{ fontSize: 13 }}
                            />
                            <input
                              className="input"
                              type="text"
                              inputMode="numeric"
                              value={fmtMiles(t.monto_pago)}
                              onChange={e => actualizarFilaTramo(i, 'monto_pago', parseMiles(e.target.value))}
                              placeholder="Ej: 7.500"
                              style={{ fontSize: 13 }}
                            />
                            <button
                              onClick={() => eliminarFilaTramo(i)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 6, borderRadius: 6 }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        {tramosEdit.length === 0 && (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                            Sin tabla de pagos configurada. Se aplica el % de comisión general.
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={agregarFilaTramo} style={{ fontSize: 12 }}>
                          <Plus size={13} style={{ marginRight: 4 }} />Agregar rango
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => guardarTramos(p.id)}
                          disabled={guardandoTramos}
                          style={{ fontSize: 12 }}
                        >
                          {guardandoTramos ? 'Guardando...' : '✓ Guardar'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Panel de ausencias desplegable */}
              <AnimatePresence>
                {panelAbierto && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      borderTop: '1px solid var(--border)',
                      background: 'rgba(var(--accent-rgb),0.03)',
                      padding: '16px 18px',
                    }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-bright)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
                        🏖 Ausencias / Vacaciones
                      </p>

                      {/* Bloqueos existentes */}
                      {bloqueosP.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                          {bloqueosP.map(b => {
                            const activo = estaActivo(b.desde, b.hasta)
                            return (
                              <div key={b.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: activo ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${activo ? 'rgba(251,191,36,0.25)' : 'var(--border)'}`,
                                borderRadius: 10, padding: '10px 14px'
                              }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: activo ? '#fbbf24' : 'var(--text-primary)' }}>
                                    📅 {formatFecha(b.desde)} → {formatFecha(b.hasta)}
                                    {activo && <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.7, fontWeight: 400 }}>● Activo ahora</span>}
                                  </div>
                                  {b.motivo && (
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                                      💬 {b.motivo}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => eliminarBloqueo(b.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', padding: 6, borderRadius: 6 }}
                                  title="Eliminar ausencia"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Formulario nueva ausencia */}
                      <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px dashed var(--border)',
                        borderRadius: 10, padding: '14px 16px'
                      }}>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                          Agregar período de ausencia:
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: 11 }}>Desde</label>
                            <input className="input" type="date" value={formBloqueo.desde}
                              onChange={e => setFormBloqueo(f => ({ ...f, desde: e.target.value }))}
                              style={{ fontSize: 13 }} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: 11 }}>Hasta</label>
                            <input className="input" type="date" value={formBloqueo.hasta}
                              onChange={e => setFormBloqueo(f => ({ ...f, hasta: e.target.value }))}
                              style={{ fontSize: 13 }} />
                          </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: 11 }}>Motivo <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label>
                          <input className="input" placeholder="Ej: Vacaciones, Viaje, Enfermedad..."
                            value={formBloqueo.motivo}
                            onChange={e => setFormBloqueo(f => ({ ...f, motivo: e.target.value }))}
                            style={{ fontSize: 13 }} />
                        </div>
                        <button className="btn btn-primary"
                          onClick={() => guardarBloqueo(p.id)}
                          disabled={guardandoBloqueo || !formBloqueo.desde || !formBloqueo.hasta}
                          style={{ fontSize: 13 }}
                        >
                          {guardandoBloqueo ? 'Guardando...' : '+ Agregar ausencia'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
