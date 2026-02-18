import { useState, useEffect } from 'react'
import { Plus, Trash2, Eye, X } from 'lucide-react'
import { ModalConfirm, ModalAlert } from '../../components/Modal'

export default function Atenciones() {
  const [atenciones, setAtenciones] = useState([])
  const [peluqueros, setPeluqueros] = useState([])
  const [servicios, setServicios] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [fechaFiltro, setFechaFiltro] = useState(hoy())
  const [cajaAbierta, setCajaAbierta] = useState(null)
  const [modalConfirm, setModalConfirm] = useState(null)
  const [modalAlert, setModalAlert] = useState(null)
  const [form, setForm] = useState({
    peluquero_id: '',
    servicio_id: '',
    precio_cobrado: '',
    metodo_pago: 'efectivo',
    nombre_transferencia: ''
  })

  function hoy() {
    return new Date().toISOString().split('T')[0]
  }

  function horaActual() {
    return new Date().toTimeString().split(' ')[0].slice(0, 5)
  }

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
    setForm({ ...form, metodo_pago: e.target.value, nombre_transferencia: '' })
  }

  const guardar = async () => {
    if (!form.peluquero_id || !form.servicio_id || !form.precio_cobrado) {
      alertar('Por favor completá todos los campos obligatorios.', 'warning')
      return
    }
    if (form.metodo_pago === 'transferencia' && !form.nombre_transferencia.trim()) {
      alertar('Por favor ingresá el nombre o alias de quien transfiere.', 'warning')
      return
    }
    await window.electronAPI.createAtencion({
      ...form,
      fecha: hoy(),
      hora: horaActual()
    })
    setForm({ peluquero_id: '', servicio_id: '', precio_cobrado: '', metodo_pago: 'efectivo', nombre_transferencia: '' })
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

  return (
    <div>
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

      {detalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14, padding: 30, width: 380, position: 'relative' }}>
            <button onClick={() => setDetalle(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>
              <X size={20} />
            </button>
            <h3 style={{ color: '#a78bfa', marginBottom: 20 }}>Detalle de atención</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#888' }}>Peluquero</span><span>{detalle.peluquero_nombre}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#888' }}>Servicio</span><span>{detalle.servicio_nombre}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#888' }}>Precio cobrado</span><span>${Number(detalle.precio_cobrado).toLocaleString('es-AR')}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#888' }}>Método de pago</span><span className={`badge badge-${detalle.metodo_pago}`}>{detalle.metodo_pago}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#888' }}>Horario</span><span>{detalle.hora}hs</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#888' }}>Fecha</span><span>{detalle.fecha}</span></div>
              {detalle.metodo_pago === 'transferencia' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #2a2a2a', paddingTop: 12, marginTop: 4 }}>
                  <span style={{ color: '#888' }}>Transferido por</span>
                  <span style={{ color: '#c084fc', fontWeight: 600 }}>{detalle.nombre_transferencia || '-'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Atenciones</h1>
        {cajaAbierta && (
          <button className="btn btn-primary" onClick={() => setMostrarForm(!mostrarForm)}>
            <Plus size={16} style={{ marginRight: 6 }} />Registrar
          </button>
        )}
      </div>

      {!cajaAbierta && (
        <div style={{ background: '#2d1a00', border: '1px solid #92400e', borderRadius: 10, padding: '16px 20px', marginBottom: 24, color: '#fbbf24', fontSize: 14 }}>
          ⚠️ No hay una caja abierta. Para registrar atenciones, primero abrí la caja desde el módulo <strong>Caja</strong>.
        </div>
      )}

      {cajaAbierta && (
        <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: 10, padding: '12px 20px', marginBottom: 20, color: '#4ade80', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          ✅ Caja abierta desde las <strong>{cajaAbierta.hora_apertura}hs</strong> — {cajaAbierta.fecha}
        </div>
      )}

      {mostrarForm && cajaAbierta && (
        <div className="card">
          <h3 style={{ marginBottom: 16, color: '#a78bfa' }}>Nueva atención</h3>
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
                {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} - ${Number(s.precio).toLocaleString('es-AR')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Precio cobrado ($)</label>
              <input className="input" type="number" value={form.precio_cobrado} onChange={e => setForm({ ...form, precio_cobrado: e.target.value })} placeholder="Se completa automático" />
            </div>
            <div className="form-group">
              <label>Método de pago</label>
              <select className="input" value={form.metodo_pago} onChange={onMetodoPagoChange}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
            {form.metodo_pago === 'transferencia' && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Nombre / Alias de quien transfiere</label>
                <input className="input" value={form.nombre_transferencia} onChange={e => setForm({ ...form, nombre_transferencia: e.target.value })} placeholder="Ej: juan.perez o nombre del cliente" />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button className="btn btn-primary" onClick={guardar}>Guardar</button>
            <button className="btn btn-secondary" onClick={() => setMostrarForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: '#aaa', fontSize: 14 }}>Ver día:</label>
          <input className="input" type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} style={{ width: 'auto' }} />
        </div>
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 18px', fontSize: 15 }}>
          Total del día: <strong style={{ color: '#a78bfa' }}>${totalDia.toLocaleString('es-AR')}</strong>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Peluquero</th><th>Servicio</th><th>Precio</th><th>Pago</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {atenciones.map(a => (
              <tr key={a.id}>
                <td>{a.peluquero_nombre}</td>
                <td>{a.servicio_nombre}</td>
                <td>${Number(a.precio_cobrado).toLocaleString('es-AR')}</td>
                <td><span className={`badge badge-${a.metodo_pago}`}>{a.metodo_pago}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => setDetalle(a)}><Eye size={14} /></button>
                    <button className="btn btn-danger" onClick={() => eliminar(a.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {atenciones.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#555', padding: 30 }}>No hay atenciones registradas para este día</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}