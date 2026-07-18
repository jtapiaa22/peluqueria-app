import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Scissors, User, Clock, Calendar, Award, DollarSign } from 'lucide-react'
import Skeleton from '../../components/Skeleton'

function hoy() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
function primerDiaMes() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function ReportesSkeleton() {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', margin: 0 }}>
            <Skeleton width="60%" height={12} style={{ margin: '0 auto 10px' }} />
            <Skeleton width="75%" height={22} style={{ margin: '0 auto' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
            <Skeleton width={40} height={40} radius={10} />
            <div style={{ flex: 1 }}>
              <Skeleton width="70%" height={11} style={{ marginBottom: 8 }} />
              <Skeleton width="55%" height={16} />
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <Skeleton width={220} height={16} style={{ marginBottom: 20 }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
            <Skeleton width="34%" height={14} />
            <Skeleton width="22%" height={14} />
            <Skeleton width="18%" height={14} />
            <Skeleton width="18%" height={14} />
          </div>
        ))}
      </div>
    </>
  )
}

export default function Reportes() {
  const [atenciones, setAtenciones] = useState([])
  const [desde, setDesde] = useState(primerDiaMes())
  const [hasta, setHasta] = useState(hoy())
  const [cargando, setCargando] = useState(true)

  const cargar = async () => {
    const data = await window.electronAPI.getAtencionesByRango({ desde, hasta })
    setAtenciones(data)
  }

  useEffect(() => {
    setCargando(true)
    cargar().finally(() => setCargando(false))
  }, [desde, hasta])

  // Separar vales de atenciones reales
  const atencionesReales = atenciones.filter(a => a.metodo_pago !== 'vale')
  const vales = atenciones.filter(a => a.metodo_pago === 'vale')

  const sinDatos = atenciones.length === 0

  // Totales de ingresos (solo reales)
  const totalGeneral = atencionesReales.reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
  const totalEfectivo = atencionesReales.reduce((acc, a) => acc + Number(a.monto_efectivo || 0), 0)
  const totalTransferencia = atencionesReales.reduce((acc, a) => acc + Number(a.monto_transferencia || 0), 0)

  // 📌 Propinas
  const totalPropinasEfectivo = atenciones.reduce((acc, a) => acc + (Number(a.propina_efectivo) || 0), 0)
  const totalPropinasTransferencia = atenciones.reduce((acc, a) => acc + (Number(a.propina_transferencia) || 0), 0)
  const totalPropinas = totalPropinasEfectivo + totalPropinasTransferencia

  // Resumen por peluquero (con propinas)
  const resumenPorPeluquero = atenciones.reduce((acc, a) => {
    if (!acc[a.peluquero_nombre]) acc[a.peluquero_nombre] = { total: 0, atenciones: 0, vales: 0, propinas: 0, propinas_efectivo: 0, propinas_transferencia: 0 }
    if (a.metodo_pago === 'vale') {
      acc[a.peluquero_nombre].vales += 1
    } else {
      acc[a.peluquero_nombre].total += Number(a.precio_cobrado)
      acc[a.peluquero_nombre].atenciones += 1
      acc[a.peluquero_nombre].propinas += (Number(a.propina_efectivo || 0) + Number(a.propina_transferencia || 0))
      acc[a.peluquero_nombre].propinas_efectivo += Number(a.propina_efectivo || 0)
      acc[a.peluquero_nombre].propinas_transferencia += Number(a.propina_transferencia || 0)
    }
    return acc
  }, {})

  // Resumen por servicio (excluye vales)
  const resumenPorServicio = atencionesReales.reduce((acc, a) => {
    const nombre = a.servicio_nombre || 'Sin nombre'
    if (!acc[nombre]) acc[nombre] = { total: 0, cantidad: 0 }
    acc[nombre].total += Number(a.precio_cobrado)
    acc[nombre].cantidad += 1
    return acc
  }, {})

  // Estadísticas de día y hora
  const porDiaSemana = atenciones.reduce((acc, a) => {
    const dia = new Date(a.fecha + 'T00:00:00').getDay()
    acc[dia] = (acc[dia] || 0) + 1
    return acc
  }, {})
  const diaMasActivo = Object.entries(porDiaSemana).sort((a, b) => b[1] - a[1])[0]

  const porHora = atenciones.reduce((acc, a) => {
    const hora = a.hora ? parseInt(a.hora.split(':')[0]) : null
    if (hora !== null) acc[hora] = (acc[hora] || 0) + 1
    return acc
  }, {})
  const horaPico = Object.entries(porHora).sort((a, b) => b[1] - a[1])[0]

  // Top por ingresos y por propinas
  const peluqueroTopIngresos = Object.entries(resumenPorPeluquero).sort((a, b) => b[1].total - a[1].total)[0]
  const peluqueroTopPropinas = Object.entries(resumenPorPeluquero).sort((a, b) => b[1].propinas - a[1].propinas)[0]
  const servicioTop = Object.entries(resumenPorServicio).sort((a, b) => b[1].cantidad - a[1].cantidad)[0]

  // Servicios por peluquero (solo reales)
  const serviciosPorPeluquero = atencionesReales.reduce((acc, a) => {
    const servNombre = a.servicio_nombre || 'Sin nombre'
    if (!acc[a.peluquero_nombre]) acc[a.peluquero_nombre] = {}
    if (!acc[a.peluquero_nombre][servNombre]) acc[a.peluquero_nombre][servNombre] = { cantidad: 0, total: 0 }
    acc[a.peluquero_nombre][servNombre].cantidad++
    acc[a.peluquero_nombre][servNombre].total += Number(a.precio_cobrado)
    return acc
  }, {})

  // Vales por peluquero (para mostrar en tabla expandible)
  const valesPorPeluquero = vales.reduce((acc, a) => {
    acc[a.peluquero_nombre] = (acc[a.peluquero_nombre] || 0) + 1
    return acc
  }, {})

  // Ingresos y propinas por fecha
  const ingresosPorFecha = atencionesReales.reduce((acc, a) => {
    acc[a.fecha] = (acc[a.fecha] || 0) + Number(a.precio_cobrado)
    return acc
  }, {})
  const propinasPorFecha = atenciones.reduce((acc, a) => {
    acc[a.fecha] = (acc[a.fecha] || 0) + (Number(a.propina_efectivo) || 0) + (Number(a.propina_transferencia) || 0)
    return acc
  }, {})
  const todasFechas  = new Set([...Object.keys(ingresosPorFecha), ...Object.keys(propinasPorFecha)])
  const diasOrdenados = Array.from(todasFechas).sort()
  const maxTotalDia  = Math.max(...diasOrdenados.map(f => (ingresosPorFecha[f] || 0) + (propinasPorFecha[f] || 0)), 1)

  // Métodos de pago
  const cantEfectivo = atenciones.filter(a => a.metodo_pago === 'efectivo').length
  const cantTransferencia = atenciones.filter(a => a.metodo_pago === 'transferencia').length
  const cantMixto = atenciones.filter(a => a.metodo_pago === 'mixto').length
  const cantVale = vales.length
  const totalMetodos = atenciones.length || 1

  // Estado para expandir filas de servicios por peluquero
  const [peluquerosAbiertos, setPeluquerosAbiertos] = useState({})
  const togglePeluquero = (nombre) => setPeluquerosAbiertos(prev => ({ ...prev, [nombre]: !prev[nombre] }))

  return (
    <div className="page-animation" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* HEADER fijo */}
      <div style={{ flexShrink: 0, paddingBottom: 14, marginBottom: 16, borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Reportes</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: 'var(--text-muted)', fontSize: 14 }}>Desde:</label>
          <input className="input" type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 'auto' }} />
          <label style={{ color: 'var(--text-muted)', fontSize: 14 }}>Hasta:</label>
          <input className="input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 'auto' }} />
          <button className="btn btn-primary" onClick={cargar}>Buscar</button>
        </div>
      </div>

      {/* ÁREA SCROLLEABLE */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

      {cargando && <ReportesSkeleton />}
      {!cargando && <>

      {sinDatos && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '16px 20px', marginBottom: 24, color: 'var(--text-muted)', fontSize: 14, textAlign: 'center' }}>
          No hay atenciones registradas en el rango seleccionado.
        </div>
      )}

      {/* ── TARJETAS RESUMEN ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>Total efectivo</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f58f1a' }}>${totalEfectivo.toLocaleString('es-AR')}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>Total transferencias</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-2)' }}>${totalTransferencia.toLocaleString('es-AR')}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>Total general (cortes)</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-bright)' }}>${totalGeneral.toLocaleString('es-AR')}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>{atencionesReales.length} cortes</div>
        </div>
        <div className="card" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>💰 Propinas</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#facc15' }}>${totalPropinas.toLocaleString('es-AR')}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            <div style={{ color: '#4ade80', fontSize: 11 }}>Ef: ${totalPropinasEfectivo.toLocaleString('es-AR')}</div>
            <div style={{ color: 'var(--accent-2)', fontSize: 11 }}>Tr: ${totalPropinasTransferencia.toLocaleString('es-AR')}</div>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 6 }}>Total + propinas</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#4ade80' }}>${(totalGeneral + totalPropinas).toLocaleString('es-AR')}</div>
        </div>
      </div>

      {/* ── ESTADÍSTICAS DESTACADAS ── */}
      {!sinDatos && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>

          <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: 'rgba(96, 165, 250, 0.15)', borderRadius: 10, padding: 10, flexShrink: 0 }}>
              <Calendar size={20} color="#60a5fa" />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 3 }}>DÍA MÁS ACTIVO</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>
                {diaMasActivo ? DIAS[diaMasActivo[0]] : '-'}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                {diaMasActivo ? `${diaMasActivo[1]} atenciones` : ''}
              </div>
            </div>
          </div>

          <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: 'rgba(251, 146, 60, 0.15)', borderRadius: 10, padding: 10, flexShrink: 0 }}>
              <Clock size={20} color="#fb923c" />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 3 }}>HORA PICO</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>
                {horaPico ? `${horaPico[0]}:00 - ${horaPico[0]}:59hs` : '-'}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                {horaPico ? `${horaPico[1]} atenciones` : ''}
              </div>
            </div>
          </div>

          <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: 'rgba(74, 222, 128, 0.15)', borderRadius: 10, padding: 10, flexShrink: 0 }}>
              <Award size={20} color="#4ade80" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 3 }}>PELUQUERO TOP (ingresos)</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {peluqueroTopIngresos ? peluqueroTopIngresos[0] : '-'}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                {peluqueroTopIngresos ? `$${peluqueroTopIngresos[1].total.toLocaleString('es-AR')}` : ''}
              </div>
            </div>
          </div>

          {/* Ranking de propinas */}
          <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: 'rgba(250,204,21,0.15)', borderRadius: 10, padding: 10, flexShrink: 0 }}>
              <DollarSign size={20} color="#facc15" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 3 }}>MÁS PROPINAS</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {peluqueroTopPropinas ? peluqueroTopPropinas[0] : '-'}
              </div>
              <div style={{ color: '#facc15', fontSize: 11 }}>
                {peluqueroTopPropinas ? `$${peluqueroTopPropinas[1].propinas.toLocaleString('es-AR')}` : ''}
              </div>
            </div>
          </div>

          {/* ranking de servicio TOP */}
          <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: 'rgba(var(--accent-bright-rgb), 0.15)', borderRadius: 10, padding: 10, flexShrink: 0 }}>
              <Scissors size={20} color="var(--accent-bright)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 3 }}>SERVICIO TOP</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {servicioTop ? servicioTop[0] : '-'}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                {servicioTop ? `${servicioTop[1].cantidad} veces` : ''}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── TABLAS POR PELUQUERO Y SERVICIO (con columna Propinas) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>

        {/* ── TABLA ÚNICA: PELUQUEROS CON DESGLOSE EXPANDIBLE ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16, color: 'var(--accent-bright)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} /> Rendimiento por peluquero
          </h3>
          <table className="table">
            <thead>
              <tr>
                <th>Peluquero</th>
                <th>Cortes</th>
                <th>Vales 🎫</th>
                <th>Total Propinas</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(resumenPorPeluquero)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([nombre, data]) => {
                  const abierto = !!peluquerosAbiertos[nombre]
                  // Obtener servicios y vales de este peluquero
                  const servicios = serviciosPorPeluquero[nombre] || {}
                  const valesPeluq = valesPorPeluquero[nombre] || 0
                  const totalServicios = Object.values(servicios).reduce((s, d) => s + d.cantidad, 0)
                  const totalMontoServicios = Object.values(servicios).reduce((s, d) => s + d.total, 0)

                  return (
                    <React.Fragment key={nombre}>
                      {/* Fila principal del peluquero (clickeable) */}
                      <tr
                        onClick={() => togglePeluquero(nombre)}
                        style={{
                          cursor: 'pointer',
                          background: abierto ? 'rgba(var(--accent-rgb),0.10)' : 'rgba(var(--accent-rgb),0.04)',
                          transition: 'background 0.2s ease',
                          userSelect: 'none',
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 22, height: 22, borderRadius: '50%',
                              background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent-bright)',
                              fontSize: 11, flexShrink: 0,
                              transition: 'transform 0.2s ease',
                              transform: abierto ? 'rotate(90deg)' : 'rotate(0deg)',
                            }}>▶</span>
                            <span style={{ color: 'var(--accent-bright)', fontWeight: 700, fontSize: 14 }}>{nombre}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{data.atenciones}</td>
                        <td style={{ color: data.vales > 0 ? '#fbbf24' : 'var(--text-muted)', textAlign: 'center' }}>
                          {data.vales > 0 ? data.vales : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ color: '#facc15', fontWeight: 600 }}>${data.propinas.toLocaleString('es-AR')}</div>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 2, fontSize: 11 }}>
                            {data.propinas_efectivo > 0 && <span style={{ color: '#4ade80' }}>E: ${data.propinas_efectivo.toLocaleString('es-AR')}</span>}
                            {data.propinas_transferencia > 0 && <span style={{ color: 'var(--accent-2)' }}>T: ${data.propinas_transferencia.toLocaleString('es-AR')}</span>}
                          </div>
                        </td>
                        <td style={{ color: '#4ade80', fontWeight: 600, textAlign: 'center' }}>${data.total.toLocaleString('es-AR')}</td>
                      </tr>

                      {/* Filas expandibles: servicios y vales */}
                      <AnimatePresence>
                        {abierto && (
                          <tr>
                            <td colSpan={6} style={{ padding: 0, background: 'rgba(var(--accent-rgb),0.02)' }}>
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ overflow: 'hidden' }}
                              >
                                <table className="table" style={{ width: '100%', marginTop: 12, borderCollapse: 'separate', borderSpacing: 0, border: '1px solid var(--border-soft)', borderRadius: 10, overflow: 'hidden', fontSize: 13 }}>
                                  <thead>
                                    <tr style={{ background: 'rgba(72, 236, 99, 0.05)' }}>
                                      <th style={{ textAlign: 'center', width: '40%' }}>Servicio</th>
                                      <th style={{ textAlign: 'center' }}>Cantidad</th>
                                      <th style={{ textAlign: 'center' }}>Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(servicios)
                                      .sort((a, b) => b[1].cantidad - a[1].cantidad)
                                      .map(([servicio, servData]) => (
                                        <tr key={servicio}>
                                          <td style={{ textAlign: 'center', color: 'var(--text-main)', fontSize: 14 }}>
                                            {servicio}
                                          </td>
                                          <td style={{ textAlign: 'center' }}>{servData.cantidad}</td>
                                          <td style={{ color: '#4ade80', fontWeight: 600, textAlign: 'center' }}>
                                            ${servData.total.toLocaleString('es-AR')}
                                          </td>
                                        </tr>
                                      ))}
                                    {valesPeluq > 0 && (
                                      <tr style={{ background: 'rgba(251,191,36,0.04)' }}>
                                        <td style={{ paddingLeft: 48, color: '#fbbf24', fontStyle: 'italic' }}>
                                          🎫 Vale (no genera ingreso)
                                        </td>
                                        <td style={{ textAlign: 'center', color: '#fbbf24', fontWeight: 600 }}>{valesPeluq}</td>
                                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>—</td>

                                      </tr>
                                    )}
                                    {Object.keys(servicios).length === 0 && valesPeluq === 0 && (
                                      <tr>
                                        <td colSpan={4} style={{ paddingLeft: 48, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                          No hay servicios registrados para este peluquero en el período.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  )
                })}
              {Object.keys(resumenPorPeluquero).length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                    Sin datos en el período seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Tabla por servicio */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginBottom: 16, color: 'var(--accent-bright)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Scissors size={16} /> Por servicio
          </h3>
          <table className="table">
            <thead>
              <tr><th>Servicio</th><th>Cantidad</th><th>Total</th><th>% del total</th></tr>
            </thead>
            <tbody>
              {Object.entries(resumenPorServicio)
                .sort((a, b) => b[1].cantidad - a[1].cantidad)
                .map(([nombre, data]) => (
                  <tr key={nombre}>
                    <td>{nombre}</td>
                    <td>{data.cantidad}</td>
                    <td style={{ color: '#4ade80', fontWeight: 600 }}>${data.total.toLocaleString('es-AR')}</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {atencionesReales.length > 0
                        ? `${((data.cantidad / atencionesReales.length) * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              {Object.keys(resumenPorServicio).length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* ── ACTIVIDAD POR DÍA DE LA SEMANA Y MÉTODOS DE PAGO ── */}
      {!sinDatos && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ marginBottom: 20, color: 'var(--accent-bright)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} /> Actividad por día de la semana
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DIAS.map((nombre, i) => {
                const cant = porDiaSemana[i] || 0
                const max = Math.max(...Object.values(porDiaSemana), 1)
                const pct = (cant / max) * 100
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 80, fontSize: 12, color: cant > 0 ? 'var(--text-main)' : 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                      {nombre}
                    </div>
                    <div style={{ flex: 1, background: 'var(--border-soft)', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: `rgba(var(--accent-bright-rgb), ${pct > 0 ? 0.25 + (pct / 100) * 0.75 : 0})`,
                        borderRadius: 4,
                        transition: 'width 0.5s cubic-bezier(0.23, 1, 0.32, 1)'
                      }} />
                    </div>
                    <div style={{ width: 28, fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{cant}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ marginBottom: 20, color: 'var(--accent-bright)' }}>Métodos de pago</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Efectivo', cant: cantEfectivo, color: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)' },
                { label: 'Transferencia', cant: cantTransferencia, color: 'var(--accent-2)', bg: 'rgba(var(--accent-2-rgb), 0.15)' },
                { label: 'Mixto', cant: cantMixto, color: '#facc15', bg: 'rgba(250, 204, 21, 0.15)' },
                { label: 'Vale 🎫', cant: cantVale, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
              ].filter(m => m.cant > 0).map(({ label, cant, color, bg }) => {
                const pct = ((cant / totalMetodos) * 100).toFixed(1)
                return (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ background: bg, color, padding: '2px 10px', borderRadius: 99, fontSize: 12 }}>{label}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{cant} — {pct}%</span>
                    </div>
                    <div style={{ background: 'var(--border-soft)', borderRadius: 4, height: 8 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <h3 style={{ marginTop: 28, marginBottom: 16, color: 'var(--accent-bright)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} /> Distribución horaria
            </h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
              {Array.from({ length: 13 }, (_, i) => i + 8).map(hora => {
                const cant = porHora[hora] || 0
                const max = Math.max(...Object.values(porHora), 1)
                const h = Math.max((cant / max) * 60, cant > 0 ? 4 : 0)
                return (
                  <div key={hora} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{
                      width: '100%', height: h,
                      background: `rgba(var(--accent-bright-rgb), ${cant > 0 ? 0.2 + (cant / max) * 0.8 : 0})`,
                      borderRadius: '3px 3px 0 0'
                    }} />
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{hora}h</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── INGRESOS + PROPINAS POR DÍA (apiladas) ── */}
      {!sinDatos && diasOrdenados.length > 1 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: 'var(--accent-bright)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} /> Ingresos y propinas por día
            </h3>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#6b21a8' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Ingresos</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#facc15' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Propinas</span>
              </div>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, minWidth: diasOrdenados.length * 44, height: 110 }}>
              {diasOrdenados.map((fecha, i) => {
                const ingreso  = ingresosPorFecha[fecha]  || 0
                const propina  = propinasPorFecha[fecha]  || 0
                const totalBar = ingreso + propina
                const alturaPx   = maxTotalDia > 0 ? Math.max((totalBar / maxTotalDia) * 80, totalBar > 0 ? 4 : 0) : 0
                const alturaIng  = totalBar > 0 ? (ingreso  / totalBar) * alturaPx : 0
                const alturaProp = totalBar > 0 ? (propina  / totalBar) * alturaPx : 0
                const opacidad   = maxTotalDia > 0 ? 0.3 + (totalBar / maxTotalDia) * 0.7 : 0.3
                return (
                  <div key={fecha} style={{ flex: 1, minWidth: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    {totalBar > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>${(totalBar / 1000).toFixed(0)}k</div>
                    )}
                    <motion.div
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%', transformOrigin: 'bottom' }}
                      initial={{ scaleY: 0, opacity: 0 }}
                      animate={{ scaleY: 1, opacity: 1 }}
                      transition={{ type: 'spring', duration: 0.5, bounce: 0.1, delay: i * 0.02 }}
                    >
                      {propina > 0 && (
                        <div title={`Propinas: $${propina.toLocaleString('es-AR')}`} style={{
                          width: '100%', height: alturaProp,
                          background: '#facc15',
                          borderRadius: '4px 4px 0 0',
                          minHeight: 3,
                          cursor: 'default'
                        }} />
                      )}
                      {ingreso > 0 && (
                        <div title={`Ingresos: $${ingreso.toLocaleString('es-AR')}`} style={{
                          width: '100%', height: alturaIng,
                          background: `rgba(var(--accent-bright-rgb), ${opacidad})`,
                          borderRadius: propina > 0 ? '0' : '4px 4px 0 0',
                          minHeight: 4,
                          cursor: 'default'
                        }} />
                      )}
                    </motion.div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', transform: 'rotate(-45deg)', transformOrigin: 'top left', marginTop: 6, whiteSpace: 'nowrap' }}>
                      {fecha.slice(5)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      </>}
      </div>{/* fin área scrolleable */}
    </div>
  )
}