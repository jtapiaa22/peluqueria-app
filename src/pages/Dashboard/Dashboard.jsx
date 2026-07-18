import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Scissors, Box, TrendingUp, Calendar, Sparkles, Clock, CalendarDays, Award, ArrowUpRight, ArrowDownRight, Target } from 'lucide-react'
import Skeleton from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'

function fechaLegible(fecha) {
  const [, mes, dia] = fecha.split('-')
  return `${dia}/${mes}`
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function mesActual() {
  const d = new Date()
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`
}

const DIAS_SEMANA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const DIAS_CORTO  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function diasEnMes(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

// Franja horaria a partir de la hora (0-23). "Noche" agrupa 20-23 y la madrugada (0-5).
// Usar franjas en vez de una hora exacta es mucho más estable cuando hay pocos datos.
function franjaDeHora(h) {
  if (h >= 6 && h <= 12) return 'mañana'
  if (h >= 13 && h <= 15) return 'mediodia'
  if (h >= 16 && h <= 19) return 'tarde'
  return 'noche'
}
const FRANJA_LABEL = { 'mañana': 'Mañana', 'mediodia': 'Mediodía', 'tarde': 'Tarde', 'noche': 'Noche' }
const FRANJA_FRASE = { 'mañana': 'la mañana', 'mediodia': 'el mediodía', 'tarde': 'la tarde', 'noche': 'la noche' }

// Paleta de tonos para los insights (usa las variables de la paleta activa)
const TONOS = {
  verde:   { c: '#4ade80',              bg: 'rgba(74, 222, 128, 0.15)' },
  rojo:    { c: '#f87171',              bg: 'rgba(248, 113, 113, 0.15)' },
  amber:   { c: '#fbbf24',              bg: 'rgba(251, 191, 36, 0.15)' },
  accent:  { c: 'var(--accent-bright)', bg: 'rgba(var(--accent-bright-rgb), 0.15)' },
  accent2: { c: 'var(--accent-2)',      bg: 'rgba(var(--accent-2-rgb), 0.15)' },
}

function DashboardSkeleton() {
  return (
    <div className="page-animation">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Skeleton width={160} height={28} />
        <Skeleton width={180} height={14} />
      </div>

      {/* 5 tarjetas de stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 16 }}>
            <Skeleton width={46} height={46} radius={10} />
            <div style={{ flex: 1 }}>
              <Skeleton width="60%" height={11} style={{ marginBottom: 8 }} />
              <Skeleton width="85%" height={20} style={{ marginBottom: 8 }} />
              <Skeleton width="50%" height={10} />
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico + top peluqueros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ margin: 0 }}>
          <Skeleton width={180} height={14} style={{ marginBottom: 20 }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
            {[45, 70, 55, 90, 60, 80, 50].map((h, i) => (
              <Skeleton key={i} height={`${h}%`} radius={4} style={{ flex: 1 }} />
            ))}
          </div>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <Skeleton width={200} height={14} style={{ marginBottom: 20 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Skeleton width={120} height={12} />
                  <Skeleton width={70} height={12} />
                </div>
                <Skeleton height={5} radius={99} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
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

  if (cargando) return <DashboardSkeleton />


  const propinasHoy = data.atencionesHoy.reduce((a, x) => a + Number(x.propina_efectivo || 0) + Number(x.propina_transferencia || 0), 0)
  const maxTotalDia = Math.max(...data.ingresosPorDia.map(d => d.total + d.propinas), 1)

  // Comparativa mes vs mes (mismo tramo del mes anterior)
  const variacionMes = data.totalMesAnterior > 0
    ? ((data.totalMes - data.totalMesAnterior) / data.totalMesAnterior) * 100
    : null
  const topServicios = data.topServicios || []

  // ── Métricas "inteligentes" derivadas ──
  const hoyDate     = new Date()
  const diaActual   = hoyDate.getDate()
  const totalDiasMes = diasEnMes(hoyDate)
  const proyeccionMes = diaActual > 0 ? Math.round((data.totalMes / diaActual) * totalDiasMes) : 0

  // Mejor día de la semana (por promedio facturado por día)
  const diaSemanaData = (data.porDiaSemana || []).map(d => ({
    ...d, promedio: d.dias > 0 ? d.total / d.dias : 0,
  }))
  const maxPromDia = Math.max(...diaSemanaData.map(d => d.promedio), 0)
  const mejorDia = diaSemanaData.length
    ? diaSemanaData.reduce((a, b) => (b.promedio > a.promedio ? b : a))
    : null

  // Franja horaria más activa (más estable que una hora exacta con pocos datos)
  const franjasAcc = { 'mañana': 0, 'mediodia': 0, 'tarde': 0, 'noche': 0 }
  for (const x of (data.porHora || [])) {
    franjasAcc[franjaDeHora(x.hora)] += x.cantidad
  }
  const totalFranjas = Object.values(franjasAcc).reduce((a, b) => a + b, 0)
  const franjaPico = totalFranjas > 0
    ? Object.entries(franjasAcc).reduce((a, b) => (b[1] > a[1] ? b : a)) // [clave, cantidad]
    : null

  const servicioEstrella = topServicios[0] || null

  // Construir los insights (solo los que tienen datos válidos)
  const insights = []
  if (variacionMes !== null) {
    const sube = variacionMes >= 0
    insights.push({
      tono: sube ? 'verde' : 'rojo',
      icono: sube ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />,
      titulo: 'Comparado con el mes pasado',
      texto: `Vas ${Math.abs(variacionMes).toFixed(0)}% ${sube ? 'arriba' : 'abajo'} del mismo tramo de ${MESES[(hoyDate.getMonth() + 11) % 12]}.`,
    })
  }
  if (data.totalMes > 0 && diaActual < totalDiasMes) {
    insights.push({
      tono: 'accent',
      icono: <TrendingUp size={18} />,
      titulo: 'Proyección de cierre',
      texto: `A este ritmo, ${MESES[hoyDate.getMonth()]} cerraría en ~$${proyeccionMes.toLocaleString('es-AR')}.`,
    })
  }
  if (mejorDia && mejorDia.promedio > 0) {
    insights.push({
      tono: 'accent2',
      icono: <CalendarDays size={18} />,
      titulo: 'Tu mejor día',
      texto: `Los ${DIAS_SEMANA[mejorDia.dow].toLowerCase()} suelen ser los más fuertes (promedio $${Math.round(mejorDia.promedio).toLocaleString('es-AR')}).`,
    })
  }
  if (franjaPico) {
    insights.push({
      tono: 'amber',
      icono: <Clock size={18} />,
      titulo: 'Franja más activa',
      texto: `La mayor actividad se concentra en ${FRANJA_FRASE[franjaPico[0]]} (${franjaPico[1]} atenciones en tu historial).`,
    })
  }
  if (servicioEstrella) {
    insights.push({
      tono: 'accent',
      icono: <Award size={18} />,
      titulo: 'Servicio estrella',
      texto: `"${servicioEstrella.nombre}" es lo que más factura este mes ($${Number(servicioEstrella.total).toLocaleString('es-AR')}).`,
    })
  }
  if (data.ticketPromedioMes > 0) {
    insights.push({
      tono: 'verde',
      icono: <Target size={18} />,
      titulo: 'Ticket promedio',
      texto: `Cada atención deja en promedio $${Number(data.ticketPromedioMes).toLocaleString('es-AR')} este mes.`,
    })
  }

  return (
    <div className="page-animation">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Dashboard</h1>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* ── CARDS SUPERIORES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>

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
            {propinasHoy > 0 && (
              <div style={{ color: '#fbbf24', fontSize: 11, marginTop: 2 }}>
                Propinas: ${propinasHoy.toLocaleString('es-AR')}
              </div>
            )}
          </div>
        </div>

        {/* Atenciones hoy */}
        <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'rgba(var(--accent-2-rgb), 0.15)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
            <Scissors size={22} color="var(--accent-2)" />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Atenciones hoy</div>
            <div style={{ color: 'var(--accent-2)', fontWeight: 700, fontSize: 22 }}>
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
          <div style={{ background: 'rgba(var(--accent-bright-rgb), 0.15)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
            <TrendingUp size={22} color="var(--accent-bright)" />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Promedio 7 días</div>
            <div style={{ color: 'var(--accent-bright)', fontWeight: 700, fontSize: 22 }}>
              ${Math.round(data.ingresosPorDia.reduce((acc, d) => acc + d.total, 0) / 7).toLocaleString('es-AR')}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>por día</div>
          </div>
        </div>

        {/* Total del mes */}
        <div className="card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'rgba(var(--accent-2-rgb), 0.15)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
            <Calendar size={22} color="var(--accent-2)" />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Total {mesActual()}</div>
            <div style={{ color: 'var(--accent-2)', fontWeight: 700, fontSize: 22 }}>
              ${data.totalMes.toLocaleString('es-AR')}
            </div>
            {variacionMes !== null && (
              <div style={{ color: variacionMes >= 0 ? '#4ade80' : '#f87171', fontSize: 11, marginTop: 2, fontWeight: 600 }}>
                {variacionMes >= 0 ? '▲' : '▼'} {Math.abs(variacionMes).toFixed(0)}% vs mes anterior
              </div>
            )}
            {data.propinasMes > 0 && (
              <div style={{ color: '#fbbf24', fontSize: 11, marginTop: 2 }}>
                Propinas: ${data.propinasMes.toLocaleString('es-AR')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RESUMEN INTELIGENTE ── */}
      {insights.length > 0 && (
        <div className="card" style={{ margin: 0, marginBottom: 16 }}>
          <h3 style={{ color: 'var(--accent-bright)', margin: '0 0 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} /> Resumen inteligente
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {insights.map((ins, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                style={{ background: 'var(--bg-main)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}
              >
                <div style={{ background: TONOS[ins.tono].bg, color: TONOS[ins.tono].c, borderRadius: 8, padding: 8, flexShrink: 0, display: 'flex' }}>
                  {ins.icono}
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3 }}>{ins.titulo}</div>
                  <div style={{ color: 'var(--text-main)', fontSize: 13, lineHeight: 1.45 }}>{ins.texto}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── GRÁFICO + TOP PELUQUEROS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Gráfico últimos 7 días — barras apiladas */}
        <div className="card" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ color: 'var(--accent-bright)', margin: 0, fontSize: 14 }}>Ingresos — últimos 7 días</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#6b21a8' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Ingresos</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#fbbf24' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Propinas</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
            {data.ingresosPorDia.map((d, i) => {
              const totalBarra = d.total + d.propinas
              const alturaPx   = maxTotalDia > 0 ? Math.max((totalBarra / maxTotalDia) * 120, totalBarra > 0 ? 4 : 0) : 0
              const alturaIng  = totalBarra > 0 ? (d.total / totalBarra) * alturaPx : 0
              const alturaProp = totalBarra > 0 ? (d.propinas / totalBarra) * alturaPx : 0
              const esHoy      = d.fecha === data.fechaHoy
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  {totalBarra > 0 && (
                    <div style={{ color: esHoy ? '#4ade80' : 'var(--text-muted)', fontSize: 10, whiteSpace: 'nowrap' }}>
                      ${totalBarra.toLocaleString('es-AR')}
                    </div>
                  )}
                  <motion.div
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%', transformOrigin: 'bottom' }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    transition={{ type: 'spring', duration: 0.5, bounce: 0.1, delay: i * 0.05 }}
                  >
                    {d.propinas > 0 && (
                      <div style={{
                        width: '100%',
                        height: alturaProp,
                        background: '#fbbf24',
                        borderRadius: '4px 4px 0 0',
                        minHeight: 3
                      }} />
                    )}
                    {d.total > 0 && (
                      <div style={{
                        width: '100%',
                        height: alturaIng,
                        background: esHoy
                          ? 'linear-gradient(to top, #4ade80, #86efac)'
                          : 'linear-gradient(to top, var(--accent-hover), var(--accent-bright))',
                        borderRadius: d.propinas > 0 ? '0' : '4px 4px 0 0',
                        minHeight: 4
                      }} />
                    )}
                  </motion.div>
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
          <h3 style={{ color: 'var(--accent-bright)', marginBottom: 16, fontSize: 14 }}>
            Top peluqueros — {mesActual()}
          </h3>
          {data.topPeluqueros.length === 0 ? (
            <EmptyState
              icono={<Scissors size={28} />}
              titulo="Sin datos este mes"
              texto="Cuando cargues atenciones, vas a ver acá el ranking de peluqueros."
              padding="30px 0"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.topPeluqueros.map((p, i) => {
                const maxTotal = data.topPeluqueros[0].total
                const pct      = Math.round((p.total / maxTotal) * 100)
                const colores  = ['#4ade80', 'var(--accent-bright)', 'var(--accent-2)', '#fbbf24', '#fb923c']
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
                      <motion.div
                        style={{ height: '100%', background: colores[i], borderRadius: 99 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ type: 'spring', duration: 0.6, bounce: 0.1, delay: i * 0.08 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── TOP SERVICIOS + RITMO SEMANAL ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Top servicios del mes */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ color: 'var(--accent-bright)', marginBottom: 16, fontSize: 14 }}>
            Top servicios — {mesActual()}
          </h3>
          {topServicios.length === 0 ? (
            <EmptyState
              icono={<Scissors size={28} />}
              titulo="Sin datos este mes"
              texto="Cuando cargues atenciones, vas a ver acá los servicios que más facturan."
              padding="30px 0"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topServicios.map((s, i) => {
                const maxTotal = topServicios[0].total || 1
                const pct      = Math.round((s.total / maxTotal) * 100)
                const colores  = ['var(--accent-bright)', 'var(--accent-2)', '#4ade80', '#fbbf24', '#fb923c']
                return (
                  <div key={s.nombre + i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: colores[i], fontWeight: 700, fontSize: 13 }}>#{i + 1}</span>
                        <span style={{ color: 'var(--text-main)', fontSize: 13 }}>{s.nombre}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: colores[i], fontWeight: 700, fontSize: 13 }}>
                          ${Number(s.total).toLocaleString('es-AR')}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>
                          {s.cantidad}×
                        </span>
                      </div>
                    </div>
                    <div style={{ background: 'var(--border-soft)', borderRadius: 99, height: 5 }}>
                      <motion.div
                        style={{ height: '100%', background: colores[i], borderRadius: 99 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ type: 'spring', duration: 0.6, bounce: 0.1, delay: i * 0.08 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Ritmo de la semana (día de semana + hora pico) */}
        <div className="card" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: 'var(--accent-bright)', margin: 0, fontSize: 14 }}>Ritmo de la semana</h3>
            {franjaPico && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fbbf24', fontSize: 12, fontWeight: 600 }}>
                <Clock size={13} /> Pico: {FRANJA_LABEL[franjaPico[0]]}
              </div>
            )}
          </div>
          {maxPromDia <= 0 ? (
            <EmptyState
              icono={<CalendarDays size={28} />}
              titulo="Sin historial aún"
              texto="A medida que cargues atenciones vas a ver qué días rinden más."
              padding="20px 0"
            />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                {[0, 1, 2, 3, 4, 5, 6].map(dow => {
                  const d       = diaSemanaData.find(x => x.dow === dow) || { promedio: 0, atenciones: 0 }
                  const alturaPx = maxPromDia > 0 ? Math.max((d.promedio / maxPromDia) * 100, d.promedio > 0 ? 6 : 0) : 0
                  const esMejor = mejorDia && mejorDia.dow === dow && d.promedio > 0
                  return (
                    <div key={dow} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }} title={`${DIAS_SEMANA[dow]}: promedio $${Math.round(d.promedio).toLocaleString('es-AR')} · ${d.atenciones} atenciones`}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                        <motion.div
                          style={{
                            width: '100%',
                            background: esMejor
                              ? 'linear-gradient(to top, var(--accent-hover), var(--accent-bright))'
                              : 'var(--border-primary)',
                            borderRadius: '4px 4px 0 0',
                          }}
                          initial={{ height: 0 }}
                          animate={{ height: alturaPx }}
                          transition={{ type: 'spring', duration: 0.5, bounce: 0.15, delay: dow * 0.04 }}
                        />
                      </div>
                      <div style={{ color: esMejor ? 'var(--accent-bright)' : 'var(--text-muted)', fontSize: 11, fontWeight: esMejor ? 700 : 400 }}>
                        {DIAS_CORTO[dow]}
                      </div>
                    </div>
                  )
                })}
              </div>
              {mejorDia && mejorDia.promedio > 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 12, textAlign: 'center' }}>
                  Promedio facturado por día de la semana
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── ÚLTIMO CIERRE ── */}
      {data.ultimoCierre && (
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ color: 'var(--accent-bright)', marginBottom: 16, fontSize: 14 }}>Último cierre de caja</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {[
              { label: 'Fecha',         valor: data.ultimoCierre.fecha,                                                     color: 'var(--text-main)' },
              { label: 'Apertura',      valor: `${data.ultimoCierre.hora_apertura}hs`,                                      color: 'var(--text-main)' },
              { label: 'Cierre',        valor: `${data.ultimoCierre.hora_cierre}hs`,                                        color: 'var(--text-main)' },
              { label: 'Efectivo',      valor: `$${Number(data.ultimoCierre.total_efectivo).toLocaleString('es-AR')}`,      color: '#4ade80'          },
              { label: 'Transferencia', valor: `$${Number(data.ultimoCierre.total_transferencia).toLocaleString('es-AR')}`, color: 'var(--accent-2)'          },
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
