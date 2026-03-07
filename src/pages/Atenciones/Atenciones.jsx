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
  monto_transferencia: ''
}

export default function Atenciones() {
  const [atenciones, setAtenciones]     = useState([])
  const [peluqueros, setPeluqueros]     = useState([])
  const [servicios, setServicios]       = useState([])
  const [mostrarForm, setMostrarForm]   = useState(false)
  const [detalle, setDetalle]           = useState(null)
  const [fechaFiltro, setFechaFiltro]   = useState(hoy())
  const [cajaAbierta, setCajaAbierta]   = useState(null)
  const [editando, setEditando]         = useState(null)
  const [modalConfirm, setModalConfirm] = useState(null)
  const [modalAlert, setModalAlert]     = useState(null)
  const [form, setForm]                 = useState(formVacio)

  const confirmar = (mensaje, onConfirm) => setModalConfirm({ mensaje, onConfirm })
  const alertar   = (mensaje, tipo = 'info') => setModalAlert({ mensaje, tipo })

  const cargar = async () => {
    const data = await window.electronAPI.getAtencionesByFecha(fechaFiltro)
    setAtenciones(data)
  }
  const verificarCaja = async () => {
    const caja = await window.electronAPI.getCajaAbierta()
    setCajaAbierta(caja)
  }

  useEffect(() => {
    window.electronAPI.getPeluqueros().then(setPeluqueros)
    window.electronAPI.getServicios().then(setServicios)
    verificarCaja()
  }, [])

  useEffect(() => { cargar() }, [fechaFiltro])

  const onServicioChange = (e) => {
    const id = e.target.value
    const servicio = servicios.find(s => s.id == id)
    setForm({ ...form, servicio_id: id, precio_cobrado: servicio ? servicio.precio : '' })
  }

  const onMetodoPagoChange = (e) => {
    setForm({ ...form, metodo_pago: e.target.value, nombre_transferencia: '', monto_efectivo: '', monto_transferencia: '' })
  }

  const abrirFormNuevo = () => {
    setEditando(null)
    setForm(formVacio)
    setMostrarForm(true)
  }

  const abrirFormEditar = (a) => {
    setEditando(a.id)
    setForm({
      peluquero_id:         String(a.peluquero_id),
      servicio_id:          String(a.servicio_id),
      precio_cobrado:       a.precio_cobrado,
      metodo_pago:          a.metodo_pago,
      nombre_transferencia: a.nombre_transferencia || '',
      monto_efectivo:       a.monto_efectivo       || '',
      monto_transferencia:  a.monto_transferencia  || ''
    })
    setMostrarForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const guardar = async () => {
    if (!form.peluquero_id || !form.servicio_id) {
      alertar('Por favor completá todos los campos obligatorios.', 'warning')
      return
    }

    if (form.metodo_pago === 'mixto') {
      if (!form.monto_efectivo || !form.monto_transferencia) {
        alertar('Ingresá ambos montos para el pago mixto.', 'warning')
        return
      }
      if (!form.nombre_transferencia.trim()) {
        alertar('Ingresá el nombre o alias de quien transfiere.', 'warning')
        return
      }
    } else {
      if (!form.precio_cobrado) {
        alertar('Ingresá el precio cobrado.', 'warning')
        return
      }
      if (form.metodo_pago === 'transferencia' && !form.nombre_transferencia.trim()) {
        alertar('Ingresá el nombre o alias de quien transfiere.', 'warning')
        return
      }
    }

    if (editando) {
      await window.electronAPI.updateAtencion({
        ...form,
        id: editando,
        fecha: atenciones.find(a => a.id === editando)?.fecha || hoy(),
        hora:  atenciones.find(a => a.id === editando)?.hora  || horaActual()
      })
      alertar('Atención actualizada correctamente.', 'success')
    } else {
      await window.electronAPI.createAtencion({
        ...form,
        fecha: hoy(),
        hora:  horaActual()
      })
    }

    setForm(formVacio)
    setEditando(null)
    setMostrarForm(false)
    cargar()
  }

  const eliminar = (id) => {
    confirmar('¿Eliminar esta atención?', async () => {
      setModalConfirm(null)
      await window.electronAPI.deleteAtencion(id)
      cargar()
    })
  }

  const totalDia = atenciones.reduce((acc, a) => acc + Number(a.precio_cobrado), 0)

  const BadgePago = ({ a }) => {
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
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          >
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 14, padding: 30, width: 400, position: 'relative' }}>
              <button onClick={() => setDetalle(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
              <h3 style={{ color: '#a78bfa', marginBottom: 20 }}>Detalle de atención</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['Peluquero',      detalle.peluquero_nombre],
                  ['Servicio',       detalle.servicio_nombre],
                  ['Precio cobrado', `$${Number(detalle.precio_cobrado).toLocaleString('es-AR')}`],
                  ['Horario',        `${detalle.hora}hs`],
                  ['Fecha',          detalle.fecha],
                ].map(([label, valor]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ color: 'var(--text-main)' }}>{valor}</span>
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Método de pago</span>
                  <BadgePago a={detalle} />
                </div>

                {detalle.metodo_pago === 'mixto' && (
                  <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Efectivo</span>
                      <span style={{ color: '#4ade80', fontWeight: 600 }}>${Number(detalle.monto_efectivo).toLocaleString('es-AR')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Transferencia</span>
                      <span style={{ color: '#c084fc', fontWeight: 600 }}>${Number(detalle.monto_transferencia).toLocaleString('es-AR')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Transferido por</span>
                      <span style={{ color: '#c084fc', fontWeight: 600 }}>{detalle.nombre_transferencia || '-'}</span>
                    </div>
                  </div>
                )}

                {detalle.metodo_pago === 'transferencia' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-soft)', paddingTop: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Transferido por</span>
                    <span style={{ color: '#c084fc', fontWeight: 600 }}>{detalle.nombre_transferencia || '-'}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Atenciones</h1>
        {cajaAbierta && (
          <button className="btn btn-primary" onClick={abrirFormNuevo}>
            <Plus size={16} style={{ marginRight: 6 }} /> Registrar
          </button>
        )}
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
                  <select className="input" value={form.servicio_id} onChange={onServicioChange}>
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
                  </select>
                </div>

                {form.metodo_pago !== 'mixto' && (
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

      {/* ── FILTRO + TOTAL ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: 'var(--text-muted)', fontSize: 14 }}>Ver día</label>
          <input className="input" type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} style={{ width: 'auto' }} />
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: '8px 18px', fontSize: 15 }}>
          Total del día: <strong style={{ color: '#a78bfa' }}>${totalDia.toLocaleString('es-AR')}</strong>
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
                <td>{a.servicio_nombre}</td>
                <td>${Number(a.precio_cobrado).toLocaleString('es-AR')}</td>
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
