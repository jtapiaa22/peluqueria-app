import { useState, useEffect } from 'react'
import { ArrowUp, ArrowDown, Minus, GitCompare, User } from 'lucide-react'
import Skeleton from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'

function mesActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function mesAnterior() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
// "YYYY-MM" -> { desde: "YYYY-MM-01", hasta: "YYYY-MM-<último día>" }
function rangoDelMes(mes) {
  const [year, month] = mes.split('-').map(Number)
  const ultimoDia = new Date(year, month, 0).getDate()
  return {
    desde: `${mes}-01`,
    hasta: `${mes}-${String(ultimoDia).padStart(2, '0')}`,
  }
}
function nombreMes(mes) {
  const [year, month] = mes.split('-').map(Number)
  const d = new Date(year, month - 1, 1)
  const txt = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

// Calcula las métricas de un período a partir de sus atenciones y gastos
function calcularMetricas(atenciones, gastos) {
  const atencionesReales = atenciones.filter(a => a.metodo_pago !== 'vale')
  const ingresos = atencionesReales.reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
  const propinas = atenciones.reduce((acc, a) => acc + (Number(a.propina_efectivo) || 0) + (Number(a.propina_transferencia) || 0), 0)
  const totalGastos = gastos.reduce((acc, g) => acc + Number(g.monto), 0)
  const cantidadAtenciones = atenciones.length
  const ticketPromedio = atencionesReales.length > 0 ? ingresos / atencionesReales.length : 0

  const porPeluquero = atenciones.reduce((acc, a) => {
    if (a.metodo_pago === 'vale') return acc
    if (!acc[a.peluquero_nombre]) acc[a.peluquero_nombre] = 0
    acc[a.peluquero_nombre] += Number(a.precio_cobrado)
    return acc
  }, {})

  return {
    ingresos, propinas, totalGastos, cantidadAtenciones, ticketPromedio,
    gananciaNeta: ingresos + propinas - totalGastos,
    porPeluquero,
  }
}

function variacion(valorA, valorB) {
  if (valorB === 0) return valorA === 0 ? 0 : 100
  return ((valorA - valorB) / Math.abs(valorB)) * 100
}

function Delta({ actual, anterior }) {
  const pct = variacion(actual, anterior)
  const subio = pct > 0.05
  const bajo = pct < -0.05
  const color = subio ? 'var(--success)' : bajo ? 'var(--danger)' : 'var(--text-muted)'
  const Icono = subio ? ArrowUp : bajo ? ArrowDown : Minus
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, color, fontSize: 12, fontWeight: 600 }}>
      <Icono size={12} />
      {Math.abs(pct).toFixed(1)}%
    </div>
  )
}

function TarjetaComparativa({ titulo, valorA, valorB, labelA, labelB, esMoneda = true, colorA = 'var(--text-main)', colorB = 'var(--text-soft)' }) {
  const fmt = v => esMoneda ? `$${Math.round(v).toLocaleString('es-AR')}` : Math.round(v).toLocaleString('es-AR')
  return (
    <div className="card" style={{ margin: 0 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>{titulo}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{labelA}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: colorA }}>{fmt(valorA)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{labelB}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: colorB }}>{fmt(valorB)}</div>
        </div>
      </div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
        <Delta actual={valorA} anterior={valorB} />
      </div>
    </div>
  )
}

function ComparacionesSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card" style={{ margin: 0 }}>
          <Skeleton width="60%" height={12} style={{ marginBottom: 12 }} />
          <Skeleton width="80%" height={22} style={{ marginBottom: 8 }} />
          <Skeleton width="50%" height={14} />
        </div>
      ))}
    </div>
  )
}

export default function Comparaciones() {
  const [mesA, setMesA] = useState(mesActual())
  const [mesB, setMesB] = useState(mesAnterior())
  const [cargando, setCargando] = useState(true)
  const [metricasA, setMetricasA] = useState(null)
  const [metricasB, setMetricasB] = useState(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const rA = rangoDelMes(mesA)
      const rB = rangoDelMes(mesB)
      const [atA, gA, atB, gB] = await Promise.all([
        window.electronAPI.getAtencionesByRango(rA),
        window.electronAPI.getGastosByRango(rA),
        window.electronAPI.getAtencionesByRango(rB),
        window.electronAPI.getGastosByRango(rB),
      ])
      setMetricasA(calcularMetricas(atA, gA))
      setMetricasB(calcularMetricas(atB, gB))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const labelA = nombreMes(mesA)
  const labelB = nombreMes(mesB)

  const peluquerosTodos = metricasA && metricasB
    ? Array.from(new Set([...Object.keys(metricasA.porPeluquero), ...Object.keys(metricasB.porPeluquero)]))
        .sort((x, y) => (metricasA.porPeluquero[y] || 0) - (metricasA.porPeluquero[x] || 0))
    : []

  const sinDatos = metricasA && metricasB && metricasA.cantidadAtenciones === 0 && metricasB.cantidadAtenciones === 0

  return (
    <div className="page-animation" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* HEADER fijo */}
      <div style={{ flexShrink: 0, paddingBottom: 14, marginBottom: 16, borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Comparaciones Mensuales</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: 'var(--text-muted)', fontSize: 14 }}>Mes:</label>
          <input className="input" type="month" value={mesA} onChange={e => setMesA(e.target.value)} style={{ width: 'auto' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>vs.</span>
          <input className="input" type="month" value={mesB} onChange={e => setMesB(e.target.value)} style={{ width: 'auto' }} />
          <button className="btn btn-primary" onClick={cargar}>Comparar</button>
        </div>
      </div>

      {/* ÁREA SCROLLEABLE */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {cargando && <ComparacionesSkeleton />}

        {!cargando && metricasA && metricasB && (
          <div className="stagger-sections">

            {sinDatos && (
              <EmptyState
                icono={<GitCompare size={32} />}
                titulo="Sin datos para comparar"
                texto={`No hay atenciones registradas ni en ${labelA} ni en ${labelB}.`}
              />
            )}

            {!sinDatos && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
                  <TarjetaComparativa titulo="Ingresos" valorA={metricasA.ingresos} valorB={metricasB.ingresos} labelA={labelA} labelB={labelB} />
                  <TarjetaComparativa titulo="Propinas" valorA={metricasA.propinas} valorB={metricasB.propinas} labelA={labelA} labelB={labelB} />
                  <TarjetaComparativa titulo="Ganancia neta (ingresos + propinas − gastos)" valorA={metricasA.gananciaNeta} valorB={metricasB.gananciaNeta} labelA={labelA} labelB={labelB} />
                  <TarjetaComparativa titulo="Gastos" valorA={metricasA.totalGastos} valorB={metricasB.totalGastos} labelA={labelA} labelB={labelB} />
                  <TarjetaComparativa titulo="Cantidad de atenciones" valorA={metricasA.cantidadAtenciones} valorB={metricasB.cantidadAtenciones} labelA={labelA} labelB={labelB} esMoneda={false} />
                  <TarjetaComparativa titulo="Ticket promedio" valorA={metricasA.ticketPromedio} valorB={metricasB.ticketPromedio} labelA={labelA} labelB={labelB} />
                </div>

                <div className="card" style={{ marginBottom: 16 }}>
                  <h3 style={{ marginBottom: 16, color: 'var(--accent-bright)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={16} /> Por peluquero
                  </h3>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Peluquero</th>
                        <th>{labelA}</th>
                        <th>{labelB}</th>
                        <th>Variación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {peluquerosTodos.map(nombre => {
                        const valA = metricasA.porPeluquero[nombre] || 0
                        const valB = metricasB.porPeluquero[nombre] || 0
                        return (
                          <tr key={nombre}>
                            <td style={{ color: 'var(--accent-bright)', fontWeight: 600 }}>{nombre}</td>
                            <td>${valA.toLocaleString('es-AR')}</td>
                            <td style={{ color: 'var(--text-muted)' }}>${valB.toLocaleString('es-AR')}</td>
                            <td><Delta actual={valA} anterior={valB} /></td>
                          </tr>
                        )
                      })}
                      {peluquerosTodos.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Sin datos</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
