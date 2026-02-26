import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { ModalConfirm, ModalAlert } from '../../components/Modal'
import { motion, AnimatePresence } from 'framer-motion'

function mesLegible(mes) {
  const [anio, m] = mes.split('-')
  const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${nombres[parseInt(m) - 1]} ${anio}`
}

function hoy() {
  return new Date().toISOString().split('T')[0]
}

export default function Gastos() {
  const [resumenMensual, setResumenMensual] = useState([])
  const [mesAbierto, setMesAbierto]         = useState(null)
  const [detallesMes, setDetallesMes]       = useState({})
  const [comisionesMes, setComisionesMes]   = useState({})
  const [peluqueros, setPeluqueros]         = useState([])
  const [mostrarForm, setMostrarForm]       = useState(false)
  const [editando, setEditando]             = useState(null)
  const [form, setForm]                     = useState({ descripcion: '', monto: '', fecha: hoy(), categoria: '' })
  const [modalConfirm, setModalConfirm]     = useState(null)
  const [modalAlert, setModalAlert]         = useState(null)

  const confirmar = (mensaje, onConfirm) => setModalConfirm({ mensaje, onConfirm })
  const alertar   = (mensaje, tipo = 'info') => setModalAlert({ mensaje, tipo })

  const cargarResumen = async () => {
    const [resumen, pels] = await Promise.all([
      window.electronAPI.getResumenMensualGastos(),
      window.electronAPI.getPeluqueros()
    ])
    setResumenMensual(resumen)
    setPeluqueros(pels)
  }

  useEffect(() => { cargarResumen() }, [])

  const getRangoMes = (mes) => {
    const [anio, m] = mes.split('-').map(Number)
    const desde     = `${anio}-${String(m).padStart(2, '0')}-01`
    const ultimoDia = new Date(anio, m, 0).getDate()
    const hasta     = `${anio}-${String(m).padStart(2, '0')}-${ultimoDia}`
    return [desde, hasta]
  }

  const cargarDetalleMes = async (mes) => {
    if (detallesMes[mes]) return

    const [desde, hasta] = getRangoMes(mes)
    const [gastos, atenciones] = await Promise.all([
      window.electronAPI.getGastosByRango({ desde, hasta }),
      window.electronAPI.getAtencionesByRango({ desde, hasta })
    ])

    const comisionesPorPeluquero = peluqueros.map(p => {
      const atencionesP   = atenciones.filter(a => a.peluquero_id === p.id)
      const totalGenerado = atencionesP.reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
      const montoComision = totalGenerado * (Number(p.comision) / 100)
      return { nombre: p.nombre, comision: p.comision, totalGenerado, montoComision, cantidad: atencionesP.length }
    }).filter(p => p.cantidad > 0)

    const totalComisiones = comisionesPorPeluquero.reduce((acc, p) => acc + p.montoComision, 0)
    const totalIngresos   = atenciones.reduce((acc, a) => acc + Number(a.precio_cobrado), 0)

    setDetallesMes(prev  => ({ ...prev,  [mes]: gastos }))
    setComisionesMes(prev => ({ ...prev, [mes]: { comisionesPorPeluquero, totalComisiones, totalIngresos } }))
  }

  const toggleMes = async (mes) => {
    if (mesAbierto === mes) {
      setMesAbierto(null)
    } else {
      setMesAbierto(mes)
      await cargarDetalleMes(mes)
    }
  }

  const guardar = async () => {
    if (!form.descripcion.trim() || !form.monto || !form.fecha) {
      alertar('Por favor completá descripción, monto y fecha.', 'warning')
      return
    }
    if (editando) {
      await window.electronAPI.updateGasto({ ...form, id: editando })
    } else {
      await window.electronAPI.createGasto(form)
    }
    setForm({ descripcion: '', monto: '', fecha: hoy(), categoria: '' })
    setEditando(null)
    setMostrarForm(false)
    setDetallesMes({})
    setComisionesMes({})
    cargarResumen()
  }

  const editar = (gasto) => {
    setForm({
      descripcion: gasto.descripcion,
      monto:       gasto.monto,
      fecha:       gasto.fecha,
      categoria:   gasto.categoria || ''
    })
    setEditando(gasto.id)
    setMostrarForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const eliminar = (id) => {
    confirmar('¿Eliminar este gasto?', async () => {
      setModalConfirm(null)
      await window.electronAPI.deleteGasto(id)
      setDetallesMes({})
      setComisionesMes({})
      cargarResumen()
    })
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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Gastos</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setMostrarForm(!mostrarForm)
            setEditando(null)
            setForm({ descripcion: '', monto: '', fecha: hoy(), categoria: '' })
          }}
        >
          <Plus size={16} style={{ marginRight: 6 }} />
          Registrar gasto
        </button>
      </div>

      {/* Formulario */}
      <AnimatePresence>
        {mostrarForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card"
          >
            <h3 style={{ marginBottom: 16, color: '#a78bfa' }}>
              {editando ? 'Editar gasto' : 'Nuevo gasto'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Descripción</label>
                <input
                  className="input"
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Ej: Luz, Alquiler, Tinte, etc."
                />
              </div>
              <div className="form-group">
                <label>Monto</label>
                <input
                  className="input"
                  type="number"
                  value={form.monto}
                  onChange={e => setForm({ ...form, monto: e.target.value })}
                  placeholder="Ej: 15000"
                />
              </div>
              <div className="form-group">
                <label>Fecha</label>
                <input
                  className="input"
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm({ ...form, fecha: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>
                  Categoría <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(opcional)</span>
                </label>
                <input
                  className="input"
                  value={form.categoria}
                  onChange={e => setForm({ ...form, categoria: e.target.value })}
                  placeholder="Ej: Servicios, Insumos, Infraestructura..."
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button className="btn btn-primary" onClick={guardar}>Guardar</button>
              <button className="btn btn-secondary" onClick={() => setMostrarForm(false)}>Cancelar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de meses */}
      {resumenMensual.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
          No hay gastos registrados todavía.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {resumenMensual.map(item => {
            const abierto         = mesAbierto === item.mes
            const detalle         = detallesMes[item.mes] || []
            const comData         = comisionesMes[item.mes]
            const totalGastos     = Number(item.total_gastos)
            const totalComisiones = comData?.totalComisiones || 0
            const totalIngresos   = comData?.totalIngresos   || 0
            const totalEgresos    = totalGastos + totalComisiones
            const gananciaNeta    = totalIngresos - totalEgresos

            return (
              <div key={item.mes} className="card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>

                {/* Cabecera del mes */}
                <div
                  onClick={() => toggleMes(item.mes)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', cursor: 'pointer' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-main)' }}>
                      {mesLegible(item.mes)}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
                      {item.cantidad} gasto{item.cantidad !== 1 ? 's' : ''} registrado{item.cantidad !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>TOTAL GASTOS</div>
                      <div style={{ color: '#f87171', fontWeight: 700, fontSize: 18 }}>
                        ${totalGastos.toLocaleString('es-AR')}
                      </div>
                    </div>
                    {abierto ? <ChevronUp size={18} color="#a78bfa" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </div>
                </div>

                {/* Detalle expandible */}
                <AnimatePresence>
                  {abierto && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: 'hidden', borderTop: '1px solid var(--border-soft)' }}
                    >
                      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

                        {/* Resumen del mes */}
                        {comData && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                            <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Ingresos del mes</div>
                              <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 18 }}>
                                ${totalIngresos.toLocaleString('es-AR')}
                              </div>
                            </div>
                            <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Gastos registrados</div>
                              <div style={{ color: '#f87171', fontWeight: 700, fontSize: 18 }}>
                                ${totalGastos.toLocaleString('es-AR')}
                              </div>
                            </div>
                            <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Comisiones pagadas</div>
                              <div style={{ color: '#fb923c', fontWeight: 700, fontSize: 18 }}>
                                ${totalComisiones.toLocaleString('es-AR')}
                              </div>
                            </div>
                            <div style={{
                              background: 'var(--bg-main)', borderRadius: 8, padding: '12px 16px', textAlign: 'center',
                              border: `1px solid ${gananciaNeta >= 0 ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`
                            }}>
                              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Ganancia neta</div>
                              <div style={{ color: gananciaNeta >= 0 ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: 18 }}>
                                ${gananciaNeta.toLocaleString('es-AR')}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Comisiones por peluquero */}
                        {comData?.comisionesPorPeluquero?.length > 0 && (
                          <div>
                            <h4 style={{ color: '#a78bfa', marginBottom: 12, fontSize: 14 }}>
                              Comisiones pagadas a peluqueros
                            </h4>
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Peluquero</th>
                                  <th>Atenciones</th>
                                  <th>Total generado</th>
                                  <th>Comisión</th>
                                  <th>Monto a pagar</th>
                                </tr>
                              </thead>
                              <tbody>
                                {comData.comisionesPorPeluquero.map(p => (
                                  <tr key={p.nombre}>
                                    <td>{p.nombre}</td>
                                    <td>{p.cantidad}</td>
                                    <td style={{ color: '#4ade80' }}>${p.totalGenerado.toLocaleString('es-AR')}</td>
                                    <td>{p.comision}%</td>
                                    <td style={{ color: '#fb923c', fontWeight: 600 }}>${p.montoComision.toLocaleString('es-AR')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Gastos del mes */}
                        <div>
                          <h4 style={{ color: '#a78bfa', marginBottom: 12, fontSize: 14 }}>
                            Gastos registrados
                          </h4>
                          {detalle.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                              Sin gastos para este mes.
                            </div>
                          ) : (
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Fecha</th>
                                  <th>Descripción</th>
                                  <th>Categoría</th>
                                  <th>Monto</th>
                                  <th>Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detalle.map(g => (
                                  <tr key={g.id}>
                                    <td style={{ color: 'var(--text-muted)' }}>{g.fecha}</td>
                                    <td>{g.descripcion}</td>
                                    <td>
                                      {g.categoria
                                        ? <span style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>{g.categoria}</span>
                                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                      }
                                    </td>
                                    <td style={{ color: '#f87171', fontWeight: 600 }}>
                                      ${Number(g.monto).toLocaleString('es-AR')}
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-secondary" onClick={() => editar(g)}>
                                          <Pencil size={14} />
                                        </button>
                                        <button className="btn btn-danger" onClick={() => eliminar(g.id)}>
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
