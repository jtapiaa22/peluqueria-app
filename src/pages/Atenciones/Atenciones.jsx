import { useState, useEffect } from 'react'
import { Plus, Trash2, Eye, Pencil, X } from 'lucide-react'
import { ModalConfirm, ModalAlert } from '../../components/Modal'
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

export default function Atenciones() {
  const [atenciones, setAtenciones] = useState([])
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
  const alertar = (mensaje, tipo = 'info') => setModalAlert({ mensaje, tipo })

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

  useEffect(() => { cargar() }, [fechaFiltro])

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
      // Sin validaciones adicionales — solo se registra el peluquero
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

  // Los vales no suman al total del día (no se cobran en caja)
  const totalDia = atenciones
    .filter(a => a.metodo_pago !== 'vale')
    .reduce((acc, a) => acc + Number(a.precio_cobrado), 0)

  const valesHoy = atenciones.filter(a => a.metodo_pago === 'vale').length


  const BadgePago = ({ a }) => {
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
          <span style={{ background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>
            Transf. ${Number(a.monto_transferencia || 0).toLocaleString('es-AR')}
          </span>
        </div>
      )
    }
    return (
      <span style={{
        background: a.metodo_pago === 'efectivo' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(192, 132, 252, 0.15)',
        color: a.metodo_pago === 'efectivo' ? '#4ade80' : '#c084fc',
        padding: '2px 10px', borderRadius: 99, fontSize: 12
      }}>
        {a.metodo_pago}
      </span>
    )
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
              <h3 style={{ color: '#a78bfa', marginBottom: 20 }}>Detalle de atención</h3>
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
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>${Number(detalle.precio_cobrado).toLocaleString('es-AR')}</span>
                  </div>
                )}
                {detalle.propina_efectivo > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Propina (Efectivo)</span>
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>${Number(detalle.propina_efectivo).toLocaleString('es-AR')}</span>
                  </div>
                )}
                {detalle.propina_transferencia > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Propina (Transferencia)</span>
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>${Number(detalle.propina_transferencia).toLocaleString('es-AR')}</span>
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
              <h3 style={{ marginBottom: 16, color: '#a78bfa' }}>
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
                  <select className="input" value={form.metodo_pago} onChange={onMetodoPagoChange}>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="mixto">Mixto (efectivo + transferencia)</option>
                    <option value="vale">Vale</option>
                  </select>
                </div>

                {form.metodo_pago !== 'mixto' && form.metodo_pago !== 'vale' && (
                  <div className="form-group">
                    <label>Precio cobrado</label>
                    <input
                      className="input" type="number"
                      value={form.precio_cobrado}
                      onChange={e => setForm({ ...form, precio_cobrado: e.target.value })}
                      placeholder="Se completa automático"
                    />
                  </div>
                )}

                {form.metodo_pago === 'vale' && (
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#fbbf24' }}>
                    💳 Vale: no suma en caja. Solo se registra el peluquero.
                  </div>
                )}

                {form.metodo_pago !== 'vale' && (
                  <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Propina <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(opcional)</span></label>
                      <input
                        className="input" type="number" step="100"
                        value={form.propina}
                        onChange={e => setForm({ ...form, propina: e.target.value })}
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
                            background: form.propina_tipo === 'transferencia' ? 'rgba(192, 132, 252, 0.18)' : 'var(--bg-main)',
                            color: form.propina_tipo === 'transferencia' ? '#c084fc' : 'var(--text-muted)',
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
                        <input className="input" type="number" value={form.monto_efectivo}
                          onChange={e => setForm({ ...form, monto_efectivo: e.target.value })}
                          placeholder="Ej: 3000" />
                      </div>
                      <div className="form-group">
                        <label>Monto en transferencia</label>
                        <input className="input" type="number" value={form.monto_transferencia}
                          onChange={e => setForm({ ...form, monto_transferencia: e.target.value })}
                          placeholder="Ej: 2000" />
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
                            <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: 18 }}>
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
                    gridColumn: '1 / -1', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)',
                    borderRadius: 10, padding: '12px 18px', textAlign: 'center', marginTop: 10
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total General</div>
                    <div style={{ fontSize: 28, color: '#a78bfa', fontWeight: 700, lineHeight: 1 }}>
                      {valesDetalle.reduce((acc, v) => acc + v.cantidad, 0)}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FILTRO + TOTAL ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: 'var(--text-muted)', fontSize: 14 }}>Ver día</label>
          <input className="input" type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} style={{ width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {valesHoy > 0 && (
            <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: '#fbbf24' }}>
              🎫 {valesHoy} vale{valesHoy > 1 ? 's' : ''} hoy
            </div>
          )}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: '8px 18px', fontSize: 15 }}>
            Total del día: <strong style={{ color: '#a78bfa' }}>${totalDia.toLocaleString('es-AR')}</strong>
          </div>
        </div>
      </div>

      {/* ── TABLA ── */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Peluquero</th>
              <th>Servicio</th>
              <th>Precio</th>
              <th>Pago</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {atenciones.map(a => (
              <tr key={a.id}>
                <td>{a.peluquero_nombre}</td>
                <td>{a.metodo_pago === 'vale' ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>—</span> : a.servicio_nombre}</td>
                <td>{a.metodo_pago === 'vale' ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>—</span> : `$${Number(a.precio_cobrado).toLocaleString('es-AR')}`}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <BadgePago a={a} />
                    {(Number(a.propina_efectivo || 0) > 0 || Number(a.propina_transferencia || 0) > 0) && (
                      <span style={{ background: 'rgba(72, 4, 128, 0.56)', color: '#000000ff', padding: '2px 8px', borderRadius: 99, fontSize: 15, fontWeight: 600 }}>
                        💰
                      </span>
                    )}
                  </div>
                </td>
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
            ))}
            {atenciones.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>No hay atenciones registradas para este día</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
