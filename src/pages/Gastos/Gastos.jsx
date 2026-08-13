import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, TrendingDown, Users, DollarSign } from 'lucide-react'
import { ModalConfirm, ModalAlert } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import EmptyState from '../../components/EmptyState'
import Skeleton from '../../components/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'

function mesLegible(mes) {
  const [anio, m] = mes.split('-')
  const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${nombres[parseInt(m) - 1]} ${anio}`
}

function hoy() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatFecha(f) {
  if (!f) return ''
  const [a, m, d] = f.split('-')
  return `${d}/${m}/${a}`
}
const fmtMiles = (val) => {
  if (val === '' || val == null) return ''
  const n = Number(String(val).replace(/\./g, ''))
  return isNaN(n) ? '' : n.toLocaleString('es-AR')
}
const parseMiles = (val) => String(val).replace(/\./g, '').replace(/[^0-9]/g, '')

function getRangoMes(mes) {
  const [anio, m] = mes.split('-').map(Number)
  const desde     = `${anio}-${String(m).padStart(2, '0')}-01`
  const ultimoDia = new Date(anio, m, 0).getDate()
  const hasta     = `${anio}-${String(m).padStart(2, '0')}-${ultimoDia}`
  return [desde, hasta]
}

function GastosSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Skeleton width={140} height={16} />
          <Skeleton width={100} height={16} />
        </div>
      ))}
    </div>
  )
}

export default function Gastos() {
  const [resumenMensual, setResumenMensual] = useState([])
  const [cargando, setCargando]             = useState(true)
  const [mesAbierto, setMesAbierto]         = useState(null)
  const [detallesMes, setDetallesMes]       = useState({})   // gastos operativos por mes
  const [pagosMes, setPagosMes]             = useState({})   // pagos peluqueros por mes

  const [mostrarForm, setMostrarForm]       = useState(false)
  const [editando, setEditando]             = useState(null)
  const [guardando, setGuardando]           = useState(false)
  const [form, setForm]                     = useState({ descripcion: '', monto: '', fecha: hoy(), categoria: '' })
  const [modalConfirm, setModalConfirm]     = useState(null)
  const [modalAlert, setModalAlert]         = useState(null)
  const [peluquerosExpandidos, setPeluquerosExpandidos] = useState({})

  const togglePeluqueroExpandido = (key) =>
    setPeluquerosExpandidos(prev => ({ ...prev, [key]: !prev[key] }))

  const confirmar = (mensaje, onConfirm) => setModalConfirm({ mensaje, onConfirm })
  const toast = useToast()
  const alertar   = (mensaje, tipo = 'info') => {
    if (tipo === 'error' || tipo === 'warning') setModalAlert({ mensaje, tipo })
    else toast(mensaje, tipo)
  }

  const cargarResumen = async () => {
    const resumen = await window.electronAPI.getResumenMensualGastos()
    setResumenMensual(resumen)
  }

  useEffect(() => {
    setCargando(true)
    cargarResumen().finally(() => setCargando(false))
  }, [])

  const cargarDetalleMes = async (mes, forceRefresh = false) => {
    if (!forceRefresh && detallesMes[mes] && pagosMes[mes]) return

    const [desde, hasta] = getRangoMes(mes)
    const [gastos, pagos] = await Promise.all([
      window.electronAPI.getGastosByRango({ desde, hasta }),
      window.electronAPI.getPagosByMes(mes),
    ])

    setDetallesMes(prev => ({ ...prev, [mes]: gastos }))
    setPagosMes(prev    => ({ ...prev, [mes]: pagos }))
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
    if (guardando) return
    if (!form.descripcion.trim() || !form.monto || !form.fecha) {
      alertar('Completá descripción, monto y fecha.', 'warning')
      return
    }
    setGuardando(true)
    try {
      if (editando) {
        await window.electronAPI.updateGasto({ ...form, id: editando })
      } else {
        await window.electronAPI.createGasto(form)
      }
      setForm({ descripcion: '', monto: '', fecha: hoy(), categoria: '' })
      setEditando(null)
      setMostrarForm(false)
      setDetallesMes({})
      setPagosMes({})
      await cargarResumen()
      if (mesAbierto) await cargarDetalleMes(mesAbierto, true)
    } finally {
      setGuardando(false)
    }
  }

  const editar = (gasto) => {
    setForm({ descripcion: gasto.descripcion, monto: gasto.monto, fecha: gasto.fecha, categoria: gasto.categoria || '' })
    setEditando(gasto.id)
    setMostrarForm(true)
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const eliminar = (id) => {
    confirmar('¿Eliminar este gasto?', async () => {
      setModalConfirm(null)
      await window.electronAPI.deleteGasto(id)
      setDetallesMes({})
      setPagosMes({})
      await cargarResumen()
      if (mesAbierto) await cargarDetalleMes(mesAbierto, true)
    })
  }

  const eliminarPago = (pago) => {
    confirmar(`¿Eliminar el pago de $${Number(pago.monto).toLocaleString('es-AR')} a ${pago.peluquero_nombre}?`, async () => {
      setModalConfirm(null)
      await window.electronAPI.deletePago(pago.id)
      const mes = mesAbierto
      await cargarDetalleMes(mes, true)
      cargarResumen()
    })
  }

  // ── Estadísticas globales (todos los meses) ──
  const totalGastosGlobal   = resumenMensual.reduce((acc, m) => acc + m.total_gastos, 0)
  const totalPagosGlobal    = resumenMensual.reduce((acc, m) => acc + m.total_pagos, 0)
  const totalEgresosGlobal  = totalGastosGlobal + totalPagosGlobal
  const totalIngresosGlobal = resumenMensual.reduce((acc, m) => acc + (m.total_ingresos || 0), 0)
  const gananciaNeta        = totalIngresosGlobal - totalEgresosGlobal

  return (
    <div className="page-animation">
      {modalConfirm && <ModalConfirm mensaje={modalConfirm.mensaje} onConfirm={modalConfirm.onConfirm} onCancel={() => setModalConfirm(null)} />}
      {modalAlert   && <ModalAlert   mensaje={modalAlert.mensaje}   tipo={modalAlert.tipo}             onClose={() => setModalAlert(null)} />}

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

      {/* Resumen global */}
      {resumenMensual.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
          <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: 'rgba(var(--accent-rgb), 0.12)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
              <DollarSign size={20} color="var(--accent)" />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 3 }}>Total ingresos</div>
              <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 20 }}>${totalIngresosGlobal.toLocaleString('es-AR')}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>total acumulado</div>
            </div>
          </div>
          <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: 'rgba(var(--accent-rgb), 0.12)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
              <TrendingDown size={20} color="var(--accent)" />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 3 }}>Gastos operativos</div>
              <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 20 }}>${totalGastosGlobal.toLocaleString('es-AR')}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>total acumulado</div>
            </div>
          </div>
          <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: 'rgba(var(--accent-rgb), 0.12)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
              <Users size={20} color="var(--accent)" />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 3 }}>Pagos a peluqueros</div>
              <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 20 }}>${totalPagosGlobal.toLocaleString('es-AR')}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>total acumulado</div>
            </div>
          </div>
          <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: 'rgba(var(--accent-rgb), 0.12)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
              <TrendingDown size={20} color="var(--accent)" />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 3 }}>Total egresos</div>
              <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 20 }}>${totalEgresosGlobal.toLocaleString('es-AR')}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>total acumulado</div>
            </div>
          </div>
          <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 14, border: `1px solid ${gananciaNeta >= 0 ? 'color-mix(in srgb, var(--success) 25%, transparent)' : 'color-mix(in srgb, var(--danger) 25%, transparent)'}` }}>
            <div style={{ background: gananciaNeta >= 0 ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'color-mix(in srgb, var(--danger) 12%, transparent)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
              <DollarSign size={20} color={gananciaNeta >= 0 ? 'var(--success)' : 'var(--danger)'} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 3 }}>Ganancia neta</div>
              <div style={{ color: gananciaNeta >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700, fontSize: 20 }}>
                {gananciaNeta >= 0 ? '' : '-'}${Math.abs(gananciaNeta).toLocaleString('es-AR')}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>ingresos − egresos</div>
            </div>
          </div>
        </div>
      )}

      {/* Formulario nuevo/editar gasto */}
      <AnimatePresence>
        {mostrarForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card"
          >
            <h3 style={{ marginBottom: 16, color: 'var(--accent-bright)' }}>
              {editando ? 'Editar gasto' : 'Nuevo gasto operativo'}
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
                  type="text"
                  inputMode="numeric"
                  value={fmtMiles(form.monto)}
                  onChange={e => setForm({ ...form, monto: parseMiles(e.target.value) })}
                  placeholder="Ej: 15.000"
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
                <label>Categoría <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(opcional)</span></label>
                <input
                  className="input"
                  value={form.categoria}
                  onChange={e => setForm({ ...form, categoria: e.target.value })}
                  placeholder="Ej: Servicios, Insumos, Infraestructura..."
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button className="btn btn-primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
              <button className="btn btn-secondary" onClick={() => { setMostrarForm(false); setEditando(null) }} disabled={guardando}>Cancelar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de meses */}
      {cargando ? (
        <GastosSkeleton />
      ) : resumenMensual.length === 0 ? (
        <div className="card">
          <EmptyState icono={<TrendingDown size={30} />} titulo="No hay gastos registrados" texto="Cuando cargues gastos, vas a verlos acá agrupados por mes." padding="24px" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {resumenMensual.map(item => {
            const abierto    = mesAbierto === item.mes
            const detalle    = detallesMes[item.mes] || []
            const pagos      = pagosMes[item.mes]    || []
            const ingresos   = item.total_ingresos   || 0
            const totalG     = item.total_gastos
            const totalP     = item.total_pagos
            const totalEgr   = totalG + totalP
            const ganancia   = ingresos - totalEgr

            return (
              <div key={item.mes} className="card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>

                {/* ── Cabecera del mes ── */}
                <div
                  onClick={() => toggleMes(item.mes)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', cursor: 'pointer' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-main)' }}>
                      {mesLegible(item.mes)}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3, display: 'flex', gap: 12 }}>
                      {item.cantidad_gastos > 0 && (
                        <span>{item.cantidad_gastos} gasto{item.cantidad_gastos !== 1 ? 's' : ''}</span>
                      )}
                      {item.cantidad_pagos > 0 && (
                        <span style={{ color: 'var(--warning)' }}>{item.cantidad_pagos} pago{item.cantidad_pagos !== 1 ? 's' : ''} a peluqueros</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    {totalG > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 1 }}>GASTOS OP.</div>
                        <div style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 14 }}>${totalG.toLocaleString('es-AR')}</div>
                      </div>
                    )}
                    {totalP > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 1 }}>PAGOS PEL.</div>
                        <div style={{ color: 'var(--warning)', fontWeight: 700, fontSize: 14 }}>${totalP.toLocaleString('es-AR')}</div>
                      </div>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 1 }}>EGRESOS</div>
                      <div style={{ color: 'var(--accent-bright)', fontWeight: 700, fontSize: 16 }}>${totalEgr.toLocaleString('es-AR')}</div>
                    </div>
                    {ingresos > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 1 }}>INGRESOS</div>
                        <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 16 }}>${ingresos.toLocaleString('es-AR')}</div>
                      </div>
                    )}
                    {ingresos > 0 && (
                      <div style={{
                        background: ganancia >= 0 ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'color-mix(in srgb, var(--danger) 12%, transparent)',
                        border: `1px solid ${ganancia >= 0 ? 'color-mix(in srgb, var(--success) 30%, transparent)' : 'color-mix(in srgb, var(--danger) 30%, transparent)'}`,
                        borderRadius: 8, padding: '6px 12px', textAlign: 'right'
                      }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 1 }}>GANANCIA</div>
                        <div style={{ color: ganancia >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700, fontSize: 16 }}>
                          {ganancia >= 0 ? '' : '-'}${Math.abs(ganancia).toLocaleString('es-AR')}
                        </div>
                      </div>
                    )}
                    {abierto ? <ChevronUp size={18} color="var(--accent-bright)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </div>
                </div>

                {/* ── Detalle expandible ── */}
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

                        {/* Resumen financiero del mes */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>Ingresos del mes</div>
                            <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 18 }}>${ingresos.toLocaleString('es-AR')}</div>
                          </div>
                          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>Gastos operativos</div>
                            <div style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 18 }}>${totalG.toLocaleString('es-AR')}</div>
                          </div>
                          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>Pagos a peluqueros</div>
                            <div style={{ color: 'var(--warning)', fontWeight: 700, fontSize: 18 }}>${totalP.toLocaleString('es-AR')}</div>
                          </div>
                          <div style={{
                            background: 'var(--bg-main)', borderRadius: 8, padding: '12px 16px', textAlign: 'center',
                            border: `1px solid ${ganancia >= 0 ? 'color-mix(in srgb, var(--success) 30%, transparent)' : 'color-mix(in srgb, var(--danger) 30%, transparent)'}`
                          }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>Ganancia neta</div>
                            <div style={{ color: ganancia >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700, fontSize: 18 }}>
                              {ganancia >= 0 ? '' : '-'}${Math.abs(ganancia).toLocaleString('es-AR')}
                            </div>
                          </div>
                        </div>

                        {/* ── PAGOS A PELUQUEROS ── agrupados por peluquero */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <Users size={15} color="var(--warning)" />
                            <h4 style={{ color: 'var(--warning)', margin: 0, fontSize: 14 }}>
                              Pagos confirmados a peluqueros
                            </h4>
                          </div>

                          {pagos.length === 0 ? (
                            <div style={{
                              border: '1px dashed color-mix(in srgb, var(--warning) 30%, transparent)',
                              borderRadius: 8, padding: '14px 20px',
                              color: 'var(--text-muted)', fontSize: 13, textAlign: 'center'
                            }}>
                              No hay pagos confirmados este mes. Podés confirmarlos desde <strong>Liquidación</strong>.
                            </div>
                          ) : (() => {
                            const agrupados = pagos.reduce((acc, pg) => {
                              const key = String(pg.peluquero_id)
                              if (!acc[key]) acc[key] = { nombre: pg.peluquero_nombre, pagos: [], total: 0 }
                              acc[key].pagos.push(pg)
                              acc[key].total += Number(pg.monto) + Number(pg.propinas_pagadas || 0)
                              return acc
                            }, {})

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {Object.entries(agrupados).map(([pelId, grupo]) => {
                                  const expandKey = `${item.mes}-${pelId}`
                                  const expandido = !!peluquerosExpandidos[expandKey]
                                  return (
                                    <div key={pelId} style={{ border: '1px solid var(--border-soft)', borderRadius: 10, overflow: 'hidden' }}>
                                      <div
                                        onClick={() => togglePeluqueroExpandido(expandKey)}
                                        style={{
                                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                          padding: '12px 16px', cursor: 'pointer', userSelect: 'none',
                                          background: expandido ? 'color-mix(in srgb, var(--warning) 6%, transparent)' : 'var(--bg-main)',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                          <span style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            width: 20, height: 20, borderRadius: '50%',
                                            background: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)',
                                            fontSize: 10, flexShrink: 0,
                                            transition: 'transform 0.2s ease',
                                            transform: expandido ? 'rotate(90deg)' : 'rotate(0deg)',
                                          }}>▶</span>
                                          <span style={{ fontWeight: 700, color: 'var(--warning)', fontSize: 14 }}>{grupo.nombre}</span>
                                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                            {grupo.pagos.length} pago{grupo.pagos.length !== 1 ? 's' : ''}
                                          </span>
                                        </div>
                                        <span style={{ color: 'var(--warning)', fontWeight: 700, fontSize: 15 }}>
                                          ${grupo.total.toLocaleString('es-AR')}
                                        </span>
                                      </div>

                                      <AnimatePresence>
                                        {expandido && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ overflow: 'hidden' }}
                                          >
                                            <table className="table" style={{ borderTop: '1px solid var(--border-soft)' }}>
                                              <thead>
                                                <tr>
                                                  <th>Período cubierto</th>
                                                  <th>Fecha de pago</th>
                                                  <th>Monto</th>
                                                  <th>Notas</th>
                                                  <th></th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {grupo.pagos.map(pg => (
                                                  <tr key={pg.id}>
                                                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                      {formatFecha(pg.desde)} → {formatFecha(pg.hasta)}
                                                    </td>
                                                    <td style={{ color: 'var(--text-muted)' }}>{formatFecha(pg.fecha_pago)}</td>
                                                    <td style={{ color: 'var(--warning)', fontWeight: 700 }}>
                                                      ${(Number(pg.monto) + Number(pg.propinas_pagadas || 0)).toLocaleString('es-AR')}
                                                      {Number(pg.propinas_pagadas) > 0 && (
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                          com ${Number(pg.monto).toLocaleString('es-AR')} + prop ${Number(pg.propinas_pagadas).toLocaleString('es-AR')}
                                                        </div>
                                                      )}
                                                    </td>
                                                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{pg.notas || '—'}</td>
                                                    <td>
                                                      <button className="btn btn-danger" onClick={() => eliminarPago(pg)} style={{ padding: '6px 10px' }}>
                                                        <Trash2 size={13} />
                                                      </button>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })()}
                        </div>

                        {/* ── GASTOS OPERATIVOS ── */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <TrendingDown size={15} color="var(--danger)" />
                            <h4 style={{ color: 'var(--danger)', margin: 0, fontSize: 14 }}>Gastos operativos</h4>
                          </div>

                          {detalle.length === 0 ? (
                            <div style={{
                              border: '1px dashed color-mix(in srgb, var(--danger) 30%, transparent)',
                              borderRadius: 8, padding: '14px 20px',
                              color: 'var(--text-muted)', fontSize: 13, textAlign: 'center'
                            }}>
                              Sin gastos operativos registrados este mes.
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
                                    <td style={{ color: 'var(--text-muted)' }}>{formatFecha(g.fecha)}</td>
                                    <td>{g.descripcion}</td>
                                    <td>
                                      {g.categoria
                                        ? <span style={{ background: 'rgba(var(--accent-bright-rgb), 0.15)', color: 'var(--accent-bright)', padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>{g.categoria}</span>
                                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                      }
                                    </td>
                                    <td style={{ color: 'var(--danger)', fontWeight: 600 }}>
                                      ${Number(g.monto).toLocaleString('es-AR')}
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-secondary" onClick={() => editar(g)}><Pencil size={14} /></button>
                                        <button className="btn btn-danger"    onClick={() => eliminar(g.id)}><Trash2 size={14} /></button>
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
