import { useState, useEffect } from 'react'
import { Plus, Trash2, Eye, Pencil, X } from 'lucide-react'
import { ModalConfirm, ModalAlert } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import Skeleton from '../../components/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'

function hoy() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
function horaActual() {
  return new Date().toTimeString().split(' ')[0].slice(0, 5)
}

const formVacio = {
  peluquero_id: '',
  servicio_id: '',
  precio_cobrado: '',
  metodo_pago: 'efectivo',
  nombre_transferencia: '',
  monto_efectivo: '',
  monto_transferencia: '',
  propina: '',
  propina_tipo: 'efectivo'
}

const MESES_NOMBRE = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const formatMes = (mes) => {
  const [anio, m] = mes.split('-')
  return `${MESES_NOMBRE[parseInt(m) - 1]} ${anio}`
}
const formatFechaFormateada = (f) => {
  if (!f) return ''
  const [y, m, d] = f.split('-').map(Number)
  return `${d} ${MESES_NOMBRE[m - 1]} ${y}`
}

function BadgePago({ a }) {
  if (a.metodo_pago === 'vale') {
    return (
      <span style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', padding: '2px 10px', borderRadius: 99, fontSize: 12 }}>
        Vale
      </span>
    )
  }
  if (a.metodo_pago === 'mixto') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>
          Efectivo ${Number(a.monto_efectivo || 0).toLocaleString('es-AR')}
        </span>
        <span style={{ background: 'rgba(var(--accent-2-rgb), 0.15)', color: 'var(--accent-2)', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>
          Transf. ${Number(a.monto_transferencia || 0).toLocaleString('es-AR')}
        </span>
      </div>
    )
  }
  return (
    <span style={{
      background: a.metodo_pago === 'efectivo' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(var(--accent-2-rgb), 0.15)',
      color: a.metodo_pago === 'efectivo' ? '#4ade80' : 'var(--accent-2)',
      padding: '2px 10px', borderRadius: 99, fontSize: 12
    }}>
      {a.metodo_pago}
    </span>
  )
}
const fmtMiles = (val) => {
  if (val === '' || val == null) return ''
  const n = Number(String(val).replace(/\./g, ''))
  return isNaN(n) ? '' : n.toLocaleString('es-AR')
}
const parseMiles = (val) => String(val).replace(/\./g, '').replace(/[^0-9]/g, '')

export default function Atenciones() {
  const [atenciones, setAtenciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [peluqueros, setPeluqueros] = useState([])
  const [servicios, setServicios] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [fechaFiltro, setFechaFiltro] = useState(hoy())
  const [cajaAbierta, setCajaAbierta] = useState(null)
  const [editando, setEditando] = useState(null)
  const [modalConfirm, setModalConfirm] = useState(null)
  const [modalAlert, setModalAlert] = useState(null)
  const [form, setForm] = useState(formVacio)
  const [mostrarVales, setMostrarVales] = useState(false)
  const [periodoAbierto, setPeriodoAbierto] = useState(null)
  const [periodos, setPeriodos] = useState([])
  const [valesPeriodoActivo, setValesPeriodoActivo] = useState([])
  const [detallePeriodo, setDetallePeriodo] = useState(null)
  const [valesDetalle, setValesDetalle] = useState([])

  const confirmar = (mensaje, onConfirm) => setModalConfirm({ mensaje, onConfirm })
  const toast = useToast()
  const alertar = (mensaje, tipo = 'info') => {
    if (tipo === 'error' || tipo === 'warning') setModalAlert({ mensaje, tipo })
    else toast(mensaje, tipo)
  }

  const cargar = async () => {
    const data = await window.electronAPI.getAtencionesByFecha(fechaFiltro)
    setAtenciones(data)
  }
  const verificarCaja = async () => {
    const caja = await window.electronAPI.getCajaAbierta()
    setCajaAbierta(caja)
  }
  const cargarPeriodosVales = async () => {
    const abierto = await window.electronAPI.getPeriodoValesAbierto()
    setPeriodoAbierto(abierto)
    const todos = await window.electronAPI.getPeriodosVales()
    setPeriodos(todos)
    if (abierto) {
      const valesAct = await window.electronAPI.getValesPorPeriodo(abierto)
      setValesPeriodoActivo(valesAct)
    } else {
      setValesPeriodoActivo([])
    }
  }

  const abrirPeriodo = async () => {
    confirmar('¿Abrir nuevo periodo de vales desde este momento?', async () => {
      setModalConfirm(null)
      await window.electronAPI.abrirPeriodoVales({ fecha_apertura: hoy(), hora_apertura: horaActual() })
      cargarPeriodosVales()
      alertar('Periodo de vales abierto correctamente', 'success')
    })
  }

  const cerrarPeriodo = async () => {
    confirmar('¿Cerrar el periodo actual de vales?', async () => {
      setModalConfirm(null)
      await window.electronAPI.cerrarPeriodoVales({ id: periodoAbierto.id, fecha_cierre: hoy(), hora_cierre: horaActual() })
      cargarPeriodosVales()
      alertar('Periodo de vales cerrado correctamente', 'success')
    })
  }

  const verDetallePeriodo = async (p) => {
    const vales = await window.electronAPI.getValesPorPeriodo(p)
    setDetallePeriodo(p)
    setValesDetalle(vales)
  }

  useEffect(() => {
    window.electronAPI.getPeluqueros().then(setPeluqueros)
    window.electronAPI.getServicios().then(setServicios)
    verificarCaja()
    cargarPeriodosVales()
  }, [])

  useEffect(() => {
    setCargando(true)
    cargar().finally(() => setCargando(false))
  }, [fechaFiltro])

  const onServicioChange = (e) => {
    const id = e.target.value
    const servicio = servicios.find(s => s.id == id)
    setForm({ ...form, servicio_id: id, precio_cobrado: servicio ? servicio.precio : '' })
  }

  const onMetodoPagoChange = (e) => {
    const metodo = e.target.value
    if (metodo === 'vale') {
      setForm({ ...form, metodo_pago: 'vale', servicio_id: '', precio_cobrado: '', nombre_transferencia: '', monto_efectivo: '', monto_transferencia: '' })
    } else {
      setForm({ ...form, metodo_pago: metodo, nombre_transferencia: '', monto_efectivo: '', monto_transferencia: '' })
    }
  }

  const abrirFormNuevo = () => {
    setEditando(null)
    setForm(formVacio)
    setMostrarForm(true)
  }

  const abrirFormEditar = (a) => {
    setEditando(a.id)
    const propEf = Number(a.propina_efectivo || 0)
    const propTr = Number(a.propina_transferencia || 0)
    setForm({
      peluquero_id: String(a.peluquero_id),
      servicio_id: a.servicio_id ? String(a.servicio_id) : '',
      precio_cobrado: a.precio_cobrado,
      metodo_pago: a.metodo_pago,
      nombre_transferencia: a.nombre_transferencia || '',
      monto_efectivo: a.monto_efectivo || '',
      monto_transferencia: a.monto_transferencia || '',
      propina: propEf > 0 ? String(propEf) : propTr > 0 ? String(propTr) : '',
      propina_tipo: propTr > 0 && propEf === 0 ? 'transferencia' : 'efectivo'
    })
    setMostrarForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const guardar = async () => {
    if (!form.peluquero_id) {
      alertar('Seleccioná el peluquero.', 'warning')
      return
    }

    if (form.metodo_pago === 'vale') {
      // No se puede registrar un vale sin el contador de vales abierto: los vales se
      // cuentan por el rango de fecha/hora del período, así que un vale cargado sin
      // período abierto quedaría fuera de todo conteo. Se permite re-guardar un vale
      // que ya existía (edición), pero no crear uno nuevo ni convertir a vale.
      const eraVale = editando && atenciones.find(a => a.id === editando)?.metodo_pago === 'vale'
      if (!periodoAbierto && !eraVale) {
        alertar('El contador de vales está cerrado. Abrí el "Control de Vales" antes de registrar un vale; si no, no se va a contabilizar para ningún peluquero.', 'error')
        return
      }
    } else if (form.metodo_pago === 'mixto') {
      if (!form.servicio_id) { alertar('Seleccioná el servicio.', 'warning'); return }
      if (!form.monto_efectivo || !form.monto_transferencia) {
        alertar('Ingresá ambos montos para el pago mixto.', 'warning')
        return
      }
      if (!form.nombre_transferencia.trim()) {
        alertar('Ingresá el nombre o alias de quien transfiere.', 'warning')
        return
      }
    } else {
      if (!form.servicio_id) { alertar('Seleccioná el servicio.', 'warning'); return }
      if (!form.precio_cobrado) {
        alertar('Ingresá el precio cobrado.', 'warning')
        return
      }
      if (form.metodo_pago === 'transferencia' && !form.nombre_transferencia.trim()) {
        alertar('Ingresá el nombre o alias de quien transfiere.', 'warning')
        return
      }
    }

    const propMonto = Number(form.propina || 0)
    const datosAtencion = {
      ...form,
      propina: propMonto,
      propina_efectivo: form.propina_tipo === 'efectivo' ? propMonto : 0,
      propina_transferencia: form.propina_tipo === 'transferencia' ? propMonto : 0,
    }

    if (editando) {
      await window.electronAPI.updateAtencion({
        ...datosAtencion,
        id: editando,
        fecha: atenciones.find(a => a.id === editando)?.fecha || hoy(),
        hora: atenciones.find(a => a.id === editando)?.hora || horaActual()
      })
      alertar('Atención actualizada correctamente.', 'success')
    } else {
      await window.electronAPI.createAtencion({
        ...datosAtencion,
        fecha: hoy(),
        hora: horaActual()
      })
    }

    setForm(formVacio)
    setEditando(null)
    setMostrarForm(false)
    cargar()
    cargarPeriodosVales()
  }

  const eliminar = (id) => {
    confirmar('¿Eliminar esta atención?', async () => {
      setModalConfirm(null)
      await window.electronAPI.deleteAtencion(id)
      cargar()
      cargarPeriodosVales()
    })
  }

  const atencionesReales = atenciones.filter(a => a.metodo_pago !== 'vale')
  const valesHoy         = atenciones.filter(a => a.metodo_pago === 'vale').length
  const totalDia         = atencionesReales.reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
  const totalEfectivoDia = atencionesReales.reduce((acc, a) => acc + Number(a.monto_efectivo || 0), 0)
  const totalTransfDia   = atencionesReales.reduce((acc, a) => acc + Number(a.monto_transferencia || 0), 0)
  const totalPropinasDia = atenciones.reduce((acc, a) => acc + Number(a.propina_efectivo || 0) + Number(a.propina_transferencia || 0), 0)

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

      {/* ── MODAL DETALLE ── */}
      <AnimatePresence>
        {detalle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420, position: 'relative' }}>
              <button onClick={() => setDetalle(null)}
                style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
              <h3 style={{ color: 'var(--accent-bright)', marginBottom: 20 }}>Detalle de atención</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Peluquero</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{detalle.peluquero_nombre}</span>
                </div>
                {detalle.metodo_pago !== 'vale' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Servicio</span>
                    <span style={{ color: 'var(--text-main)' }}>{detalle.servicio_nombre}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Método de pago</span>
                  <BadgePago a={detalle} />
                </div>
                {detalle.metodo_pago !== 'vale' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Precio cobrado</span>
                    <span style={{ color: 'var(--accent-bright)', fontWeight: 700 }}>${Number(detalle.precio_cobrado).toLocaleString('es-AR')}</span>
                  </div>
                )}
                {detalle.propina_efectivo > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Propina (Efectivo)</span>
                    <span style={{ color: 'var(--accent-bright)', fontWeight: 700 }}>${Number(detalle.propina_efectivo).toLocaleString('es-AR')}</span>
                  </div>
                )}
                {detalle.propina_transferencia > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Propina (Transferencia)</span>
                    <span style={{ color: 'var(--accent-bright)', fontWeight: 700 }}>${Number(detalle.propina_transferencia).toLocaleString('es-AR')}</span>
                  </div>
                )}
                {detalle.nombre_transferencia && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Transferencia de</span>
                    <span style={{ color: 'var(--text-main)' }}>{detalle.nombre_transferencia}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Fecha y hora</span>
                  <span style={{ color: 'var(--text-main)' }}>{detalle.fecha} {detalle.hora}hs</span>
                </div>
                {detalle.metodo_pago === 'vale' && (
                  <div style={{ marginTop: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#fbbf24' }}>
                    💳 Atención por vale — no impacta en caja ni balances.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Atenciones</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setMostrarVales(v => !v)}>
            🎫 Control de Vales
          </button>
          {cajaAbierta && (
            <button className="btn btn-primary" onClick={abrirFormNuevo}>
              <Plus size={16} style={{ marginRight: 6 }} /> Registrar
            </button>
          )}
        </div>
      </div>

      {/* Aviso caja cerrada */}
      {!cajaAbierta && (
        <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: 10, padding: '16px 20px', marginBottom: 24, color: '#fbbf24', fontSize: 14 }}>
          No hay una caja abierta. Para registrar atenciones, primero abrí la caja desde el módulo <strong>Caja</strong>.
        </div>
      )}

      {/* Aviso caja abierta */}
      {cajaAbierta && (
        <div style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: 10, padding: '12px 20px', marginBottom: 20, color: '#4ade80', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          Caja abierta desde las <strong>{cajaAbierta.hora_apertura}hs</strong>
        </div>
      )}

      {/* ── FORMULARIO ── */}
      <AnimatePresence>
        {mostrarForm && cajaAbierta && (
          <motion.div
            className="form-container"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="card">
              <h3 style={{ marginBottom: 16, color: 'var(--accent-bright)' }}>
                {editando ? 'Editar atención' : 'Nueva atención'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label>Peluquero</label>
                  <select className="input" value={form.peluquero_id} onChange={e => setForm({ ...form, peluquero_id: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {peluqueros.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Servicio</label>
                  <select
                    className="input"
                    value={form.servicio_id}
                    onChange={onServicioChange}
                    disabled={form.metodo_pago === 'vale'}
                    style={{ opacity: form.metodo_pago === 'vale' ? 0.4 : 1 }}
                  >
                    <option value="">Seleccionar...</option>
                    {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} — ${Number(s.precio).toLocaleString('es-AR')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Método de pago</label>
                  <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
                    {[
                      { value: 'efectivo',      label: 'Efectivo',      color: '#4ade80',  bg: 'rgba(74,222,128,0.18)'   },
                      { value: 'transferencia', label: 'Transferencia', color: 'var(--accent-2)',  bg: 'rgba(var(--accent-2-rgb),0.18)'  },
                      { value: 'mixto',         label: 'Mixto',         color: '#fbbf24',  bg: 'rgba(251,191,36,0.18)'   },
                      { value: 'vale',          label: 'Vale 🎫',       color: '#fb923c',  bg: 'rgba(251,146,60,0.18)'   },
                    ].map((op, i) => (
                      <button
                        key={op.value}
                        type="button"
                        onClick={() => onMetodoPagoChange({ target: { value: op.value } })}
                        style={{
                          flex: 1, padding: '10px 0', fontSize: 12, border: 'none', cursor: 'pointer',
                          borderLeft: i > 0 ? '1px solid var(--border-soft)' : 'none',
                          background: form.metodo_pago === op.value ? op.bg : 'var(--bg-main)',
                          color: form.metodo_pago === op.value ? op.color : 'var(--text-muted)',
                          fontWeight: form.metodo_pago === op.value ? 700 : 400,
                          transition: 'background 0.15s, color 0.15s',
                        }}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                {form.metodo_pago !== 'mixto' && form.metodo_pago !== 'vale' && (
                  <div className="form-group">
                    <label>Precio cobrado</label>
                    <input
                      className="input" type="text" inputMode="numeric"
                      value={fmtMiles(form.precio_cobrado)}
                      onChange={e => setForm({ ...form, precio_cobrado: parseMiles(e.target.value) })}
                      placeholder="Se completa automático"
                    />
                  </div>
                )}

                {form.metodo_pago === 'vale' && (
                  periodoAbierto ? (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#fbbf24' }}>
                      💳 Vale: no suma en caja. Solo se registra el peluquero.
                      <span style={{ color: 'var(--text-muted)' }}>· Contador abierto desde el {formatFechaFormateada(periodoAbierto.fecha_apertura)} a las {periodoAbierto.hora_apertura}hs</span>
                    </div>
                  ) : (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.35)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#f87171' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 320px' }}>
                        ⚠️ El contador de vales está <strong>cerrado</strong>. Si registrás un vale ahora, no se va a contabilizar para ningún peluquero.
                      </span>
                      <button type="button" className="btn btn-primary" onClick={abrirPeriodo} style={{ whiteSpace: 'nowrap' }}>
                        🎫 Abrir contador de vales
                      </button>
                    </div>
                  )
                )}

                {form.metodo_pago !== 'vale' && (
                  <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Propina <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(opcional)</span></label>
                      <input
                        className="input" type="text" inputMode="numeric"
                        value={fmtMiles(form.propina)}
                        onChange={e => setForm({ ...form, propina: parseMiles(e.target.value) })}
                        placeholder="Ej: 500"
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11, marginBottom: 6, display: 'block' }}>Tipo de propina</label>
                      <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, propina_tipo: 'efectivo' })}
                          style={{
                            flex: 1, padding: '10px 20px', fontSize: 13, border: 'none', cursor: 'pointer',
                            background: form.propina_tipo === 'efectivo' ? 'rgba(74, 222, 128, 0.18)' : 'var(--bg-main)',
                            color: form.propina_tipo === 'efectivo' ? '#4ade80' : 'var(--text-muted)',
                            fontWeight: form.propina_tipo === 'efectivo' ? 700 : 400,
                          }}
                        >
                          Efectivo
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, propina_tipo: 'transferencia' })}
                          style={{
                            flex: 1, padding: '10px 20px', fontSize: 13, border: 'none', cursor: 'pointer',
                            borderLeft: '1px solid var(--border-soft)',
                            background: form.propina_tipo === 'transferencia' ? 'rgba(var(--accent-2-rgb), 0.18)' : 'var(--bg-main)',
                            color: form.propina_tipo === 'transferencia' ? 'var(--accent-2)' : 'var(--text-muted)',
                            fontWeight: form.propina_tipo === 'transferencia' ? 700 : 400,
                          }}
                        >
                          Transferencia
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {form.metodo_pago === 'transferencia' && (
                    <motion.div className="form-group" style={{ gridColumn: '1 / -1' }}
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <label>Nombre / Alias de quien transfiere</label>
                      <input className="input" value={form.nombre_transferencia}
                        onChange={e => setForm({ ...form, nombre_transferencia: e.target.value })}
                        placeholder="Ej: juan.perez" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {form.metodo_pago === 'mixto' && (
                    <motion.div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <div className="form-group">
                        <label>Monto en efectivo</label>
                        <input className="input" type="text" inputMode="numeric" value={fmtMiles(form.monto_efectivo)}
                          onChange={e => setForm({ ...form, monto_efectivo: parseMiles(e.target.value) })}
                          placeholder="Ej: 3.000" />
                      </div>
                      <div className="form-group">
                        <label>Monto en transferencia</label>
                        <input className="input" type="text" inputMode="numeric" value={fmtMiles(form.monto_transferencia)}
                          onChange={e => setForm({ ...form, monto_transferencia: parseMiles(e.target.value) })}
                          placeholder="Ej: 2.000" />
                      </div>
                      <div className="form-group">
                        <label>Nombre / Alias de quien transfiere</label>
                        <input className="input" value={form.nombre_transferencia}
                          onChange={e => setForm({ ...form, nombre_transferencia: e.target.value })}
                          placeholder="Ej: juan.perez" />
                      </div>
                      {(form.monto_efectivo || form.monto_transferencia) && (
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', borderRadius: 8, padding: '0 16px' }}>
                          <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Total calculado</div>
                            <div style={{ color: 'var(--accent-bright)', fontWeight: 700, fontSize: 18 }}>
                              ${(Number(form.monto_efectivo || 0) + Number(form.monto_transferencia || 0)).toLocaleString('es-AR')}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button className="btn btn-primary" onClick={guardar}>
                  {editando ? 'Guardar cambios' : 'Guardar'}
                </button>
                <button className="btn btn-secondary" onClick={() => { setMostrarForm(false); setEditando(null); setForm(formVacio) }}>
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PANEL CONTROL DE VALES ── */}
      <AnimatePresence>
        {mostrarVales && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ marginBottom: 20 }}
          >
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ color: '#fbbf24', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  🎫 Control de Vales
                </h3>
              </div>

              {/* Estado Periodo Actual */}
              <div style={{
                background: periodoAbierto ? 'rgba(74, 222, 128, 0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${periodoAbierto ? 'rgba(74, 222, 128, 0.3)' : 'var(--border)'}`,
                borderRadius: 12, padding: '20px', marginBottom: 24
              }}>
                {periodoAbierto ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                        🟢 PERIODO ABIERTO
                      </div>
                      <div style={{ fontSize: 15, color: 'var(--text-main)', marginBottom: 8 }}>
                        {formatFechaFormateada(periodoAbierto.fecha_apertura)} a las {periodoAbierto.hora_apertura}hs
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {valesPeriodoActivo.length === 0 ? (
                          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin vales todavía.</span>
                        ) : (
                          valesPeriodoActivo.map(v => (
                            <div key={v.peluquero_nombre} style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                              <strong style={{ color: 'var(--text-main)' }}>{v.peluquero_nombre}</strong>: {v.cantidad} vales
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <button className="btn btn-secondary" style={{ color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)' }} onClick={cerrarPeriodo}>
                      Cerrar Periodo
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                      No hay ningún periodo de vales abierto en este momento.
                    </div>
                    <button className="btn btn-primary" onClick={abrirPeriodo}>
                      Abrir Nuevo Periodo
                    </button>
                  </div>
                )}
              </div>

              {/* Historial de Periodos */}
              <h4 style={{ color: 'var(--text-main)', fontSize: 14, marginBottom: 12 }}>Historial de Periodos</h4>
              {periodos.filter(p => p.estado === 'cerrada').length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay periodos cerrados en el historial.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {periodos.filter(p => p.estado === 'cerrada').map(p => (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'var(--bg-main)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)'
                    }}>
                      <div>
                        <div style={{ fontSize: 14, color: 'var(--text-main)', fontWeight: 600 }}>
                          {formatFechaFormateada(p.fecha_apertura)} a {formatFechaFormateada(p.fecha_cierre)}
                        </div>
                      </div>
                      <button className="btn btn-secondary" onClick={() => verDetallePeriodo(p)}>
                        <Eye size={14} style={{ marginRight: 6 }} /> Ver detalle
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DETALLE DE PERIODO */}
      <AnimatePresence>
        {detallePeriodo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420, position: 'relative' }}>
              <button onClick={() => setDetallePeriodo(null)}
                style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
              <h3 style={{ color: '#fbbf24', marginBottom: 10 }}>Resumen del Periodo</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
                Desde el {formatFechaFormateada(detallePeriodo.fecha_apertura)} a las {detallePeriodo.hora_apertura}hs<br />
                hasta el {formatFechaFormateada(detallePeriodo.fecha_cierre)} a las {detallePeriodo.hora_cierre}hs
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
                {valesDetalle.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: 13 }}>No se registraron vales en este periodo.</div>
                ) : (
                  valesDetalle.map(v => (
                    <div key={v.peluquero_nombre} style={{
                      background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
                      borderRadius: 10, padding: '12px 18px', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.peluquero_nombre}</div>
                      <div style={{ fontSize: 28, color: '#fbbf24', fontWeight: 700, lineHeight: 1 }}>{v.cantidad}</div>
                    </div>
                  ))
                )}
                {valesDetalle.length > 1 && (
                  <div style={{
                    gridColumn: '1 / -1', background: 'rgba(var(--accent-bright-rgb),0.08)', border: '1px solid rgba(var(--accent-bright-rgb),0.3)',
                    borderRadius: 10, padding: '12px 18px', textAlign: 'center', marginTop: 10
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total General</div>
                    <div style={{ fontSize: 28, color: 'var(--accent-bright)', fontWeight: 700, lineHeight: 1 }}>
                      {valesDetalle.reduce((acc, v) => acc + v.cantidad, 0)}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FILTRO + RESUMEN ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: 'var(--text-muted)', fontSize: 14 }}>Ver día</label>
          <input className="input" type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} style={{ width: 'auto' }} />
        </div>
        {valesHoy > 0 && (
          <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 10, padding: '6px 14px', fontSize: 13, color: '#fbbf24' }}>
            🎫 {valesHoy} vale{valesHoy > 1 ? 's' : ''} hoy
          </div>
        )}
      </div>

      {/* Strip totales del día */}
      {atenciones.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Total</span>
            <span style={{ color: 'var(--accent-bright)', fontWeight: 700, fontSize: 15 }}>${totalDia.toLocaleString('es-AR')}</span>
          </div>
          {totalEfectivoDia > 0 && (
            <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Efectivo</span>
              <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 15 }}>${totalEfectivoDia.toLocaleString('es-AR')}</span>
            </div>
          )}
          {totalTransfDia > 0 && (
            <div style={{ background: 'rgba(var(--accent-2-rgb),0.08)', border: '1px solid rgba(var(--accent-2-rgb),0.2)', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Transferencia</span>
              <span style={{ color: 'var(--accent-2)', fontWeight: 700, fontSize: 15 }}>${totalTransfDia.toLocaleString('es-AR')}</span>
            </div>
          )}
          {totalPropinasDia > 0 && (
            <div style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Propinas</span>
              <span style={{ color: '#facc15', fontWeight: 700, fontSize: 15 }}>${totalPropinasDia.toLocaleString('es-AR')}</span>
            </div>
          )}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Atenciones</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 15 }}>{atenciones.length}</span>
          </div>
        </div>
      )}

      {/* ── TABLA ── */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Peluquero</th>
              <th>Servicio</th>
              <th>Precio</th>
              <th>Propina</th>
              <th>Pago</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando && Array.from({ length: 6 }).map((_, i) => (
              <tr key={`sk-${i}`}>
                <td><Skeleton width={38} height={12} /></td>
                <td><Skeleton width="70%" height={14} /></td>
                <td><Skeleton width="60%" height={14} /></td>
                <td><Skeleton width={60} height={14} /></td>
                <td><Skeleton width={54} height={20} radius={99} /></td>
                <td><Skeleton width={64} height={20} radius={99} /></td>
                <td><Skeleton width={90} height={28} radius={8} /></td>
              </tr>
            ))}
            {!cargando && atenciones.map(a => {
              const propTotal = Number(a.propina_efectivo || 0) + Number(a.propina_transferencia || 0)
              return (
                <tr key={a.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{a.hora}hs</td>
                  <td style={{ fontWeight: 600 }}>{a.peluquero_nombre}</td>
                  <td>{a.metodo_pago === 'vale' ? <span style={{ color: '#fbbf24', fontStyle: 'italic', fontSize: 12 }}>🎫 Vale</span> : a.servicio_nombre}</td>
                  <td style={{ color: a.metodo_pago === 'vale' ? 'var(--text-muted)' : '#4ade80', fontWeight: 600 }}>
                    {a.metodo_pago === 'vale' ? '—' : `$${Number(a.precio_cobrado).toLocaleString('es-AR')}`}
                  </td>
                  <td>
                    {propTotal > 0
                      ? <span style={{ background: 'rgba(250,204,21,0.15)', color: '#facc15', padding: '2px 9px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
                          ${propTotal.toLocaleString('es-AR')}
                        </span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </td>
                  <td><BadgePago a={a} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary" onClick={() => setDetalle(a)} title="Ver detalle">
                        <Eye size={14} />
                      </button>
                      {cajaAbierta && (
                        <button className="btn btn-secondary" onClick={() => abrirFormEditar(a)} title="Editar">
                          <Pencil size={14} />
                        </button>
                      )}
                      <button className="btn btn-danger" onClick={() => eliminar(a.id)} title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!cargando && atenciones.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>No hay atenciones registradas para este día</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
