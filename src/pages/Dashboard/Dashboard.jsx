import { useState, useEffect } from 'react'
import { DollarSign, Scissors, Box, TrendingUp } from 'lucide-react'

function fechaLegible(fecha) {
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}`
}

function mesActual() {
  const d = new Date()
  const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${nombres[d.getMonth()]} ${d.getFullYear()}`
}

export default function Dashboard() {
  const [data, setData]         = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    window.electronAPI.getDashboard().then(res => {
      setData(res)
      setCargando(false)
    })
  }, [])

  if (cargando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      Cargando...
    </div>
  )

  const maxIngreso = Math.max(...data.ingresosPorDia.map(d => d.total), 1)

  return (
    <div className="page-animation">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Dashboard</h1>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* ── CARDS SUPERIORES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>

        {/* Total del día */}
        <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'rgba(74, 222, 128, 0.15)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
            <DollarSign size={22} color="#4ade80" />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Total hoy</div>
            <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 22 }}>
              ${data.totalHoy.toLocaleString('es-AR')}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
              Ef: ${data.efectivoHoy.toLocaleString('es-AR')} · Tr: ${data.transferenciaHoy.toLocaleString('es-AR')}
            </div>
          </div>
        </div>

        {/* Atenciones hoy */}
        <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'rgba(192, 132, 252, 0.15)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
            <Scissors size={22} color="#c084fc" />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Atenciones hoy</div>
            <div style={{ color: '#c084fc', fontWeight: 700, fontSize: 22 }}>
              {data.atencionesHoy.length}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
              {data.atencionesHoy.filter(a => a.metodo_pago === 'efectivo').length} ef · {data.atencionesHoy.filter(a => a.metodo_pago === 'transferencia').length} tr
            </div>
          </div>
        </div>

        {/* Estado de caja */}
        <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: data.cajaAbierta ? 'rgba(74, 222, 128, 0.15)' : 'rgba(251, 191, 36, 0.15)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
            <Box size={22} color={data.cajaAbierta ? '#4ade80' : '#fbbf24'} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Caja</div>
            <div style={{ color: data.cajaAbierta ? '#4ade80' : '#fbbf24', fontWeight: 700, fontSize: 16 }}>
              {data.cajaAbierta ? 'Abierta' : 'Cerrada'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
              {data.cajaAbierta
                ? `Desde las ${data.cajaAbierta.hora_apertura}hs`
                : data.ultimoCierre
                  ? `Último cierre: ${data.ultimoCierre.fecha}`
                  : 'Sin cierres registrados'
              }
            </div>
          </div>
        </div>

        {/* Promedio 7 días */}
        <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'rgba(167, 139, 250, 0.15)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
            <TrendingUp size={22} color="#a78bfa" />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Promedio 7 días</div>
            <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: 22 }}>
              ${Math.round(data.ingresosPorDia.reduce((acc, d) => acc + d.total, 0) / 7).toLocaleString('es-AR')}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>por día</div>
          </div>
        </div>
      </div>

      {/* ── GRÁFICO + TOP PELUQUEROS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Gráfico últimos 7 días */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ color: '#a78bfa', marginBottom: 20, fontSize: 14 }}>Ingresos — últimos 7 días</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
            {data.ingresosPorDia.map((d, i) => {
              const altura = maxIngreso > 0 ? Math.max((d.total / maxIngreso) * 120, d.total > 0 ? 4 : 0) : 0
              const esHoy  = d.fecha === data.fechaHoy
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  {d.total > 0 && (
                    <div style={{ color: esHoy ? '#4ade80' : 'var(--text-muted)', fontSize: 10, whiteSpace: 'nowrap' }}>
                      ${d.total.toLocaleString('es-AR')}
                    </div>
                  )}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                    <div style={{
                      width: '100%',
                      height: altura,
                      background: esHoy
                        ? 'linear-gradient(to top, #4ade80, #86efac)'
                        : 'linear-gradient(to top, #3b0764, #6b21a8)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                      minHeight: d.total > 0 ? 4 : 0
                    }} />
                  </div>
                  <div style={{ color: esHoy ? '#4ade80' : 'var(--text-muted)', fontSize: 11, fontWeight: esHoy ? 700 : 400 }}>
                    {fechaLegible(d.fecha)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top peluqueros del mes */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ color: '#a78bfa', marginBottom: 16, fontSize: 14 }}>
            Top peluqueros — {mesActual()}
          </h3>
          {data.topPeluqueros.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
              Sin datos este mes
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.topPeluqueros.map((p, i) => {
                const maxTotal = data.topPeluqueros[0].total
                const pct      = Math.round((p.total / maxTotal) * 100)
                const colores  = ['#4ade80', '#a78bfa', '#c084fc', '#fbbf24', '#fb923c']
                return (
                  <div key={p.nombre}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: colores[i], fontWeight: 700, fontSize: 13 }}>#{i + 1}</span>
                        <span style={{ color: 'var(--text-main)', fontSize: 13 }}>{p.nombre}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: colores[i], fontWeight: 700, fontSize: 13 }}>
                          ${Number(p.total).toLocaleString('es-AR')}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>
                          {p.atenciones} at.
                        </span>
                      </div>
                    </div>
                    <div style={{ background: 'var(--border-soft)', borderRadius: 99, height: 5 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: colores[i], borderRadius: 99, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── ÚLTIMO CIERRE ── */}
      {data.ultimoCierre && (
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ color: '#a78bfa', marginBottom: 16, fontSize: 14 }}>Último cierre de caja</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {[
              { label: 'Fecha',         valor: data.ultimoCierre.fecha,                                                     color: 'var(--text-main)' },
              { label: 'Apertura',      valor: `${data.ultimoCierre.hora_apertura}hs`,                                      color: 'var(--text-main)' },
              { label: 'Cierre',        valor: `${data.ultimoCierre.hora_cierre}hs`,                                        color: 'var(--text-main)' },
              { label: 'Efectivo',      valor: `$${Number(data.ultimoCierre.total_efectivo).toLocaleString('es-AR')}`,      color: '#4ade80'          },
              { label: 'Transferencia', valor: `$${Number(data.ultimoCierre.total_transferencia).toLocaleString('es-AR')}`, color: '#c084fc'          },
            ].map(({ label, valor, color }) => (
              <div key={label} style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 6 }}>{label}</div>
                <div style={{ color, fontWeight: 600, fontSize: 15 }}>{valor}</div>
              </div>
            ))}
          </div>
          {data.ultimoCierre.observaciones && (
            <div style={{ marginTop: 12, color: 'var(--text-soft)', fontSize: 13 }}>
              📝 {data.ultimoCierre.observaciones}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
