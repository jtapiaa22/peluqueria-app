import { useState, useEffect } from 'react'
import { CheckCircle, ChevronDown, ChevronUp, Trash2, Users, Ticket, BarChart2, ClipboardList } from 'lucide-react'
import { ModalAlert, ModalConfirm } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import EmptyState from '../../components/EmptyState'
import Skeleton from '../../components/Skeleton'
import NumeroAnimado from '../../components/NumeroAnimado'
import { usePDF } from '../../hooks/usePDF'
import { motion, AnimatePresence } from 'framer-motion'

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

function LiquidacionSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0 }}>
          <div style={{ flex: 1 }}>
            <Skeleton width={150} height={16} style={{ marginBottom: 10 }} />
            <Skeleton width={200} height={12} />
          </div>
          <Skeleton width={110} height={32} radius={8} />
        </div>
      ))}
    </>
  )
}

export default function Liquidacion() {
  const [peluqueros, setPeluqueros] = useState([])
  const [atenciones, setAtenciones] = useState([])
  const [desde, setDesde] = useState(primerDiaMes())
  const [hasta, setHasta] = useState(hoy())
  const [modalAlert, setModalAlert] = useState(null)
  const [modalConfirm, setModalConfirm] = useState(null)
  const [cargando, setCargando] = useState(true)

  const [panelPago, setPanelPago] = useState(null)
  const [formPago, setFormPago] = useState({ fecha_pago: hoy(), notas: '', montoManual: '', propinasManual: '' })
  const [pagosExistentes, setPagosExistentes] = useState([])
  const [historialPagos, setHistorialPagos] = useState([])
  const [tramosComision, setTramosComision] = useState({})

  const { generarReporte } = usePDF()
  const toast = useToast()
  const alertar = (mensaje, tipo = 'info') => {
    if (tipo === 'error' || tipo === 'warning') setModalAlert({ mensaje, tipo })
    else toast(mensaje, tipo)
  }
  const confirmar = (mensaje, onConfirm) => setModalConfirm({ mensaje, onConfirm })

  const cargarDatos = async () => {
    const [p, a, todosTramos] = await Promise.all([
      window.electronAPI.getPeluqueros(),
      window.electronAPI.getAtencionesByRango({ desde, hasta }),
      window.electronAPI.getAllTramosComision()
    ])
    setPeluqueros(p)
    setAtenciones(a)
    const agrupadosT = {}
    for (const t of (todosTramos || [])) {
      if (!agrupadosT[t.peluquero_id]) agrupadosT[t.peluquero_id] = []
      agrupadosT[t.peluquero_id].push(t)
    }
    setTramosComision(agrupadosT)
    // Cargar pagos de TODOS los peluqueros para mostrar estado de pago sin abrir panel
    const pagosXTodos = await Promise.all(
      p.map(pel => window.electronAPI.getPagosByPeluqueroYRango({ peluquero_id: pel.id, desde, hasta }))
    )
    setPagosExistentes(pagosXTodos.flat())
  }

  useEffect(() => {
    setCargando(true)
    cargarDatos().finally(() => setCargando(false))
  }, [desde, hasta])

  const cargarPagosExistentes = async (peluqueroId) => {
    const pagos = await window.electronAPI.getPagosByPeluqueroYRango({ peluquero_id: peluqueroId, desde, hasta })
    setPagosExistentes(prev => [...prev.filter(p => p.peluquero_id != peluqueroId), ...pagos])
  }

  const cargarHistorial = async (peluqueroId) => {
    const pagos = await window.electronAPI.getAllPagosByPeluquero(peluqueroId)
    setHistorialPagos(pagos)
  }

  const abrirPanelPago = async (peluqueroId) => {
    if (panelPago === peluqueroId) {
      setPanelPago(null)
      return
    }
    setPanelPago(peluqueroId)
    setFormPago({ fecha_pago: hoy(), notas: '', montoManual: '', propinasManual: '' })
    await Promise.all([cargarPagosExistentes(peluqueroId), cargarHistorial(peluqueroId)])
  }

  const ejecutarPago = async (peluquero) => {
    if (!formPago.fecha_pago) {
      alertar('Indicá la fecha de pago.', 'warning')
      return
    }
    const liq = getLiquidacionPeluquero(peluquero.id)
    if (liq.montoComision <= 0 && !formPago.montoManual) {
      alertar('Este peluquero no tiene monto a pagar en el período.', 'warning')
      return
    }
    const pendiente = liq.montoComision - liq.totalPagado
    const montoFinal = formPago.montoManual !== '' ? Number(formPago.montoManual) : Math.max(0, pendiente)

    if (montoFinal <= 0) {
      alertar('El monto a pagar debe ser mayor a $0.', 'warning')
      return
    }

    // Las propinas a entregar ahora son independientes del monto de comisión: por defecto se sugieren
    // todas las pendientes, pero en un pago parcial de comisión se pueden dejar en $0 o en otro valor.
    const propinasFinal = formPago.propinasManual !== '' ? Number(formPago.propinasManual) : liq.propinasRestantes

    const totalConPropinas = montoFinal + propinasFinal
    const msgPago = propinasFinal > 0
      ? `¿Confirmar pago a ${peluquero.nombre}?\nComisión $${montoFinal.toLocaleString('es-AR')} + propinas $${propinasFinal.toLocaleString('es-AR')} = $${totalConPropinas.toLocaleString('es-AR')} total a entregar.`
      : `¿Confirmar pago de $${montoFinal.toLocaleString('es-AR')} a ${peluquero.nombre}?`
    confirmar(
      msgPago,
      async () => {
        setModalConfirm(null)
        await window.electronAPI.createPago({
          peluquero_id: peluquero.id,
          peluquero_nombre: peluquero.nombre,
          desde,
          hasta,
          monto: montoFinal,
          propinas_pagadas: propinasFinal,
          fecha_pago: formPago.fecha_pago,
          notas: formPago.notas
        })
        const msgOk = propinasFinal > 0
          ? `Pago registrado a ${peluquero.nombre} — comisión $${montoFinal.toLocaleString('es-AR')} + propinas $${propinasFinal.toLocaleString('es-AR')} = $${(montoFinal + propinasFinal).toLocaleString('es-AR')} total`
          : `Pago registrado a ${peluquero.nombre}`
        alertar(msgOk, 'success')
        await Promise.all([cargarPagosExistentes(peluquero.id), cargarHistorial(peluquero.id)])
      }
    )
  }

  const eliminarPago = (pago) => {
    confirmar(`¿Eliminar el pago de $${Number(pago.monto).toLocaleString('es-AR')} a ${pago.peluquero_nombre}?`, async () => {
      setModalConfirm(null)
      await window.electronAPI.deletePago(pago.id)
      await Promise.all([cargarPagosExistentes(pago.peluquero_id), cargarHistorial(pago.peluquero_id)])
    })
  }

  const getLiquidacionPeluquero = (peluqueroId) => {
    const atencionesP = atenciones.filter(a => a.peluquero_id == peluqueroId)
    // Separar vales: no generan ingreso ni comisión
    const atencionesReales = atencionesP.filter(a => a.metodo_pago !== 'vale')
    const cantVales = atencionesP.filter(a => a.metodo_pago === 'vale').length

    const totalGenerado = atencionesReales.reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
    const totalPropinasEfectivo = atencionesP.reduce((acc, a) => acc + Number(a.propina_efectivo || 0), 0)
    const totalPropinasTransferencia = atencionesP.reduce((acc, a) => acc + Number(a.propina_transferencia || 0), 0)
    const totalPropinas = totalPropinasEfectivo + totalPropinasTransferencia
    const peluquero = peluqueros.find(p => p.id == peluqueroId)

    const tramosP = (tramosComision[peluqueroId] || []).slice().sort((a, b) => Number(a.monto_desde) - Number(b.monto_desde))
    const usaTramos = tramosP.length > 0
    const comision = peluquero ? Number(peluquero.comision) : 0
    const porcentajePropina = peluquero && peluquero.porcentaje_propina != null ? Number(peluquero.porcentaje_propina) : 100
    const propinasAPagar = Math.round(totalPropinas * (porcentajePropina / 100))

    let montoComision = 0
    const desglose = []

    if (usaTramos) {
      for (const a of atencionesReales) {
        const precio = Number(a.precio_cobrado)
        let tramoMatch = tramosP.find(t => Number(t.monto_desde) === precio)
        if (!tramoMatch) {
          const candidatos = tramosP.filter(t => Number(t.monto_desde) <= precio)
          tramoMatch = candidatos.length ? candidatos[candidatos.length - 1] : null
        }
        const pago = tramoMatch
          ? Number(tramoMatch.monto_pago)
          : (precio * comision) / 100
        montoComision += pago
        desglose.push({
          servicio: a.servicio_nombre || 'Sin nombre',
          precio,
          pago,
          propina_efectivo: Number(a.propina_efectivo || 0),
          propina_transferencia: Number(a.propina_transferencia || 0),
          propina: Number(a.propina_efectivo || 0) + Number(a.propina_transferencia || 0),
          usóTramo: !!tramoMatch,
          esVale: false
        })
      }
    } else {
      montoComision = (totalGenerado * comision) / 100
    }

    const pagosDelPeluquero = pagosExistentes.filter(pg => pg.peluquero_id == peluqueroId)
    const totalPagado = pagosDelPeluquero.reduce((acc, pg) => acc + Number(pg.monto), 0)
    const propinasPagadas = pagosDelPeluquero.reduce((acc, pg) => acc + Number(pg.propinas_pagadas || 0), 0)
    const propinasRestantes = Math.max(0, propinasAPagar - propinasPagadas)

    return {
      totalGenerado,
      comision,
      montoComision,
      cantidad: atencionesReales.length,
      cantVales,
      totalPagado,
      usaTramos,
      tramosP,
      desglose,
      totalPropinas,
      totalPropinasEfectivo,
      totalPropinasTransferencia,
      porcentajePropina,
      propinasAPagar,
      propinasPagadas,
      propinasRestantes
    }
  }

  const peluquerosConDatos = peluqueros.map(p => ({
    ...p,
    ...getLiquidacionPeluquero(p.id)
  }))

  const totalGeneralPeriodo = peluquerosConDatos.reduce((acc, p) => acc + p.totalGenerado, 0)
  const totalComisiones = peluquerosConDatos.reduce((acc, p) => acc + p.montoComision, 0)
  const totalPropinas = peluquerosConDatos.reduce((acc, p) => acc + p.totalPropinas, 0)



  const exportarPDF = async () => {
    await generarReporte({
      titulo: 'Liquidación de comisiones',
      subtitulo: `Período: ${desde} al ${hasta}`,
      columnas: ['Peluquero', 'Cortes', 'Vales', 'Total generado', 'Comisión %', 'A pagar'],
      filas: peluquerosConDatos.map(p => [
        p.nombre,
        String(p.cantidad),
        p.cantVales > 0 ? `${p.cantVales} vale${p.cantVales > 1 ? 's' : ''}` : '—',
        `$${p.totalGenerado.toLocaleString('es-AR')}`,
        `${p.comision}%`,
        `$${p.montoComision.toLocaleString('es-AR')}`
      ]),
      totales: [
        { label: 'Total generado en el período', valor: `$${totalGeneralPeriodo.toLocaleString('es-AR')}`, color: [74, 222, 128] },
        { label: 'Total a pagar en comisiones', valor: `$${totalComisiones.toLocaleString('es-AR')}`, color: [248, 113, 113] },
      ],
      nombreArchivo: `liquidacion_${desde}_${hasta}.pdf`
    })
  }

  // ── Vista principal ──
  return (
    <div className="page-animation" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {modalAlert && <ModalAlert mensaje={modalAlert.mensaje} tipo={modalAlert.tipo} onClose={() => setModalAlert(null)} />}
      {modalConfirm && <ModalConfirm mensaje={modalConfirm.mensaje} onConfirm={modalConfirm.onConfirm} onCancel={() => setModalConfirm(null)} />}

      {/* SECCIÓN FIJA: header + filtro */}
      <div style={{ flexShrink: 0, paddingBottom: 14, marginBottom: 16, borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h1 className="page-title" style={{ margin: 0 }}>Liquidación</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={exportarPDF}>Exportar PDF</button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: 'var(--text-muted)', fontSize: 14 }}>Período:</label>
          <input className="input" type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 'auto' }} />
          <label style={{ color: 'var(--text-muted)', fontSize: 14 }}>hasta</label>
          <input className="input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 'auto' }} />
          <button className="btn btn-primary" onClick={cargarDatos}>Buscar</button>
        </div>
      </div>

      {/* ÁREA SCROLLEABLE: cards resumen + lista de peluqueros */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Total generado en el período</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--success)', whiteSpace: 'nowrap' }}>$<NumeroAnimado valor={totalGeneralPeriodo} /></div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>no incluye vales</div>
        </div>
        <div className="card" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Total + Propinas</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--success)', whiteSpace: 'nowrap' }}>$<NumeroAnimado valor={totalGeneralPeriodo + totalPropinas} /></div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>no incluye vales</div>
        </div>
        <div className="card" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Total a pagar en comisiones</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--danger)', whiteSpace: 'nowrap' }}>$<NumeroAnimado valor={totalComisiones} /></div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {cargando ? (
          <LiquidacionSkeleton />
        ) : peluquerosConDatos.length === 0 ? (
          <div className="card">
            <EmptyState icono={<Users size={30} />} titulo="No hay datos para liquidar" texto="No hay peluqueros con atenciones en el período seleccionado." padding="24px" />
          </div>
        ) : (
          peluquerosConDatos.map(p => {
            const panelAbierto  = panelPago === p.id
            const pendiente     = p.montoComision - p.totalPagado
            const pagadoEste    = pagosExistentes.filter(pg => pg.peluquero_id == p.id)
            const totalPagadoPeriodo = pagadoEste.reduce((acc, pg) => acc + Number(pg.monto) + Number(pg.propinas_pagadas || 0), 0)
            const totalDeuda    = p.montoComision + p.propinasAPagar
            const estadoPago    = totalDeuda === 0 ? null
              : totalPagadoPeriodo >= totalDeuda ? 'pagado'
              : totalPagadoPeriodo > 0 ? 'parcial'
              : 'pendiente'

            return (
              <div key={p.id} className="card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>

                {/* Cabecera peluquero */}
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h3 style={{ color: 'var(--text-main)', margin: 0 }}>{p.nombre}</h3>
                      {p.cantVales > 0 && (
                        <span style={{ background: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Ticket size={11} /> {p.cantVales} vale{p.cantVales > 1 ? 's' : ''}
                        </span>
                      )}
                      {estadoPago === 'pagado' && (
                        <span style={{ background: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={11} /> Pagado
                        </span>
                      )}
                      {estadoPago === 'parcial' && (
                        <span style={{ background: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          Parcial · resta ${(totalDeuda - totalPagadoPeriodo).toLocaleString('es-AR')}
                        </span>
                      )}
                      {estadoPago === 'pendiente' && (
                        <span style={{ background: 'color-mix(in srgb, var(--danger) 15%, transparent)', color: 'var(--danger)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          Pendiente
                        </span>
                      )}
                    </div>
                    {p.usaTramos ? (
                      <span style={{ background: 'color-mix(in srgb, var(--success) 12%, transparent)', color: 'var(--success)', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <BarChart2 size={13} /> Tramos configurados
                      </span>
                    ) : (
                      <span style={{ background: 'rgba(var(--accent-bright-rgb), 0.15)', color: 'var(--accent-bright)', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                        {p.comision}% de comisión
                      </span>
                    )}
                  </div>

                  {/* Stats — solo cortes reales, vales aparte */}
                  <div style={{ display: 'grid', gridTemplateColumns: p.cantVales > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Cortes</div>
                      <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 20 }}>{p.cantidad}</div>
                    </div>
                    {p.cantVales > 0 && (
                      <div style={{ background: 'color-mix(in srgb, var(--warning) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Vales</div>
                        <div style={{ color: 'var(--warning)', fontWeight: 700, fontSize: 20 }}>{p.cantVales}</div>
                      </div>
                    )}
                    <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Total generado</div>
                      <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 18 }}>${p.totalGenerado.toLocaleString('es-AR')}</div>
                    </div>
                    <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>
                        {p.usaTramos ? 'Le corresponde (tramo)' : `Le corresponde (${p.comision}%)`}
                      </div>
                      <div style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 18 }}>${p.montoComision.toLocaleString('es-AR')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Queda para el local</div>
                      <div style={{ color: 'var(--accent-bright)', fontWeight: 700, fontSize: 18 }}>${(p.totalGenerado - p.montoComision).toLocaleString('es-AR')}</div>
                    </div>
                    <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>
                        Propinas {p.porcentajePropina < 100 && <span style={{ color: 'var(--warning)' }}>({p.porcentajePropina}%)</span>}
                      </div>
                      <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 18 }}>${p.propinasAPagar.toLocaleString('es-AR')}</div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 4, fontSize: 11 }}>
                        {p.totalPropinas !== p.propinasAPagar && (
                          <span style={{ color: 'var(--text-muted)' }}>total: ${p.totalPropinas.toLocaleString('es-AR')}</span>
                        )}
                        {p.totalPropinasEfectivo > 0 && <span style={{ color: 'var(--success)' }}>Ef: ${p.totalPropinasEfectivo.toLocaleString('es-AR')}</span>}
                        {p.totalPropinasTransferencia > 0 && <span style={{ color: 'var(--accent-2)' }}>Tr: ${p.totalPropinasTransferencia.toLocaleString('es-AR')}</span>}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Total a pagar (con propinas)</div>
                      <div style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 18 }}>${(p.montoComision + p.propinasAPagar).toLocaleString('es-AR')}</div>
                    </div>
                  </div>

                  {/* Desglose por atención (solo con tramos) */}
                  {p.usaTramos && p.desglose && p.desglose.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <ClipboardList size={13} /> Desglose por servicio
                      </div>
                      <table className="table" style={{ fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th>Servicio</th>
                            <th>Cobrado</th>
                            <th>Pago al peluquero</th>
                            <th>Propina</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.desglose.map((d, i) => (
                            <tr key={i}>
                              <td style={{ color: 'var(--text-soft)' }}>{d.servicio}</td>
                              <td style={{ color: 'var(--text-muted)' }}>${d.precio.toLocaleString('es-AR')}</td>
                              <td style={{ color: 'var(--success)', fontWeight: 700 }}>
                                ${d.pago.toLocaleString('es-AR')}
                                {!d.usóTramo && <span style={{ color: 'var(--warning)', fontSize: 10, marginLeft: 4 }}>(% fallback)</span>}
                              </td>
                              <td>
                                <div style={{ color: 'var(--danger)', fontWeight: 700 }}>${d.propina.toLocaleString('es-AR')}</div>
                                <div style={{ display: 'flex', gap: 6, fontSize: 10, marginTop: 2 }}>
                                  {d.propina_efectivo > 0 && <span style={{ color: 'var(--success)' }}>E: ${d.propina_efectivo.toLocaleString('es-AR')}</span>}
                                  {d.propina_transferencia > 0 && <span style={{ color: 'var(--accent-2)' }}>T: ${d.propina_transferencia.toLocaleString('es-AR')}</span>}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {/* Vales informativos al final del desglose */}
                          {p.cantVales > 0 && (
                            <tr style={{ background: 'color-mix(in srgb, var(--warning) 5%, transparent)', borderTop: '1px dashed color-mix(in srgb, var(--warning) 30%, transparent)' }}>
                              <td style={{ color: 'var(--warning)', fontStyle: 'italic' }}>
                                <Ticket size={12} style={{ verticalAlign: -2, marginRight: 3 }} /> Vale × {p.cantVales} (no genera comisión)
                              </td>
                              <td style={{ color: 'var(--text-muted)' }}>—</td>
                              <td style={{ color: 'var(--text-muted)' }}>—</td>
                              <td style={{ color: 'var(--text-muted)' }}>—</td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {/* Tabla resumen de totales */}
                      <table style={{ width: '100%', marginTop: 12, borderCollapse: 'separate', borderSpacing: 0, border: '1px solid var(--border-soft)', borderRadius: 10, overflow: 'hidden', fontSize: 13 }}>
                        <tbody>
                          <tr style={{ background: 'color-mix(in srgb, var(--danger) 5%, transparent)' }}>
                            <td style={{ padding: '10px 14px', color: 'var(--text-soft)', fontWeight: 600 }}>Total (cortes)</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--danger)', fontWeight: 700, fontSize: 14 }}>${p.montoComision.toLocaleString('es-AR')}</td>
                          </tr>
                          <tr style={{ background: 'color-mix(in srgb, var(--success) 5%, transparent)', borderTop: '1px solid var(--border-soft)' }}>
                            <td style={{ padding: '10px 14px', color: 'var(--text-soft)', fontWeight: 600 }}>
                              Propinas {p.porcentajePropina < 100 && <span style={{ color: 'var(--warning)', fontWeight: 400 }}>({p.porcentajePropina}%)</span>}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--success)', fontWeight: 700, fontSize: 14 }}>
                              ${p.propinasAPagar.toLocaleString('es-AR')}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 2, fontSize: 11 }}>
                                {p.totalPropinas !== p.propinasAPagar && <span style={{ color: 'var(--text-muted)' }}>total: ${p.totalPropinas.toLocaleString('es-AR')}</span>}
                                {p.totalPropinasEfectivo > 0 && <span style={{ color: 'var(--success)' }}>Ef: ${p.totalPropinasEfectivo.toLocaleString('es-AR')}</span>}
                                {p.totalPropinasTransferencia > 0 && <span style={{ color: 'var(--accent-2)' }}>Tr: ${p.totalPropinasTransferencia.toLocaleString('es-AR')}</span>}
                              </div>
                            </td>
                          </tr>
                          <tr style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', borderTop: '1px solid var(--border-soft)' }}>
                            <td style={{ padding: '10px 14px', color: 'var(--text-main)', fontWeight: 700 }}>Total con Propinas</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--danger)', fontWeight: 700, fontSize: 16 }}>${(p.montoComision + p.propinasAPagar).toLocaleString('es-AR')}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Si usa % simple y tiene vales, mostrar nota */}
                  {!p.usaTramos && p.cantVales > 0 && (
                    <div style={{ marginBottom: 16, background: 'color-mix(in srgb, var(--warning) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--warning)' }}>
                      <Ticket size={13} style={{ verticalAlign: -2, marginRight: 3 }} /> Este peluquero tiene {p.cantVales} vale{p.cantVales > 1 ? 's' : ''} en el período. Los vales no se incluyen en el total generado ni en la comisión.
                    </div>
                  )}

                  {/* Botón confirmar pago */}
                  {(p.cantidad > 0 || p.cantVales > 0) && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => abrirPanelPago(p.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
                    >
                      <CheckCircle size={15} color="var(--success)" />
                      Registrar pago
                      {panelAbierto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>

                {/* Panel de pago */}
                <AnimatePresence>
                  {panelAbierto && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden', borderTop: '1px solid var(--border-soft)' }}
                    >
                      <div style={{ padding: '20px 24px', background: 'color-mix(in srgb, var(--success) 3%, transparent)' }}>

                        {/* Formulario de pago */}
                        <div style={{ display: 'grid', gridTemplateColumns: p.propinasRestantes > 0 ? '1fr 1fr 1fr 1fr 1fr auto' : '1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>Período cubierto</label>
                            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--text-soft)' }}>
                              {formatFecha(desde)} → {formatFecha(hasta)}
                            </div>
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>Total calculado</label>
                            <div style={{ background: 'var(--bg-main)', border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)', borderRadius: 10, padding: '8px 14px' }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)' }}>
                                ${(Math.max(0, pendiente) + p.propinasRestantes).toLocaleString('es-AR')}
                              </div>
                              {p.propinasRestantes > 0 && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                  comisión ${Math.max(0, pendiente).toLocaleString('es-AR')} + propinas ${p.propinasRestantes.toLocaleString('es-AR')}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>
                              Monto manual
                              <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 4 }}>(override comisión)</span>
                            </label>
                            <input
                              className="input"
                              type="text"
                              inputMode="numeric"
                              value={fmtMiles(formPago.montoManual)}
                              onChange={e => setFormPago({ ...formPago, montoManual: parseMiles(e.target.value) })}
                              placeholder={`$${Math.max(0, pendiente).toLocaleString('es-AR')}`}
                              style={{ fontSize: 14, fontWeight: formPago.montoManual ? 700 : 400, color: formPago.montoManual ? 'var(--warning)' : undefined }}
                            />
                          </div>
                          {p.propinasRestantes > 0 && (
                            <div className="form-group" style={{ margin: 0 }}>
                              <label>
                                Propinas a pagar ahora
                                <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 4 }}>(de ${p.propinasRestantes.toLocaleString('es-AR')})</span>
                              </label>
                              <input
                                className="input"
                                type="text"
                                inputMode="numeric"
                                value={fmtMiles(formPago.propinasManual)}
                                onChange={e => setFormPago({ ...formPago, propinasManual: parseMiles(e.target.value) })}
                                placeholder={`$${p.propinasRestantes.toLocaleString('es-AR')}`}
                                style={{ fontSize: 14, fontWeight: formPago.propinasManual ? 700 : 400, color: formPago.propinasManual ? 'var(--warning)' : undefined }}
                              />
                              <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 4 }}>
                                total a entregar: ${(
                                  (formPago.montoManual !== '' ? Number(formPago.montoManual) : Math.max(0, pendiente)) +
                                  (formPago.propinasManual !== '' ? Number(formPago.propinasManual) : p.propinasRestantes)
                                ).toLocaleString('es-AR')}
                              </div>
                            </div>
                          )}
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>Fecha de pago</label>
                            <input
                              className="input"
                              type="date"
                              value={formPago.fecha_pago}
                              onChange={e => setFormPago({ ...formPago, fecha_pago: e.target.value })}
                            />
                          </div>
                          <button
                            className="btn btn-primary"
                            onClick={() => ejecutarPago(p)}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            <CheckCircle size={15} style={{ marginRight: 6 }} />
                            Confirmar pago
                          </button>
                        </div>


                        <div className="form-group" style={{ marginBottom: 20 }}>
                          <label>Notas <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(opcional)</span></label>
                          <input
                            className="input"
                            value={formPago.notas}
                            onChange={e => setFormPago({ ...formPago, notas: e.target.value })}
                            placeholder="Ej: Pago en efectivo, banco..."
                          />
                        </div>

                        {/* Historial completo de pagos */}
                        {historialPagos.length > 0 ? (
                          <div>
                            <div style={{ fontSize: 13, color: 'var(--accent-bright)', fontWeight: 600, marginBottom: 10 }}>
                              Historial de pagos
                            </div>
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Fecha de pago</th>
                                  <th>Período cubierto</th>
                                  <th>Monto</th>
                                  <th>Notas</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                <AnimatePresence>
                                {historialPagos.map((pg, i) => {
                                  const esPeriodoActual = pagadoEste.some(p => p.id === pg.id)
                                  return (
                                    <motion.tr key={pg.id}
                                      initial={{ opacity: 0, y: -8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -8 }}
                                      transition={{ duration: 0.18, delay: i * 0.02 }}
                                      style={{ background: esPeriodoActual ? 'rgba(var(--accent-bright-rgb),0.06)' : undefined }}>
                                      <td style={{ color: 'var(--text-muted)' }}>{formatFecha(pg.fecha_pago)}</td>
                                      <td style={{ color: 'var(--text-soft)', fontSize: 12 }}>{formatFecha(pg.desde)} → {formatFecha(pg.hasta)}</td>
                                      <td style={{ color: 'var(--success)', fontWeight: 700 }}>
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
                                    </motion.tr>
                                  )
                                })}
                                </AnimatePresence>
                              </tbody>
                            </table>
                            {totalPagadoPeriodo > 0 && (
                              <div style={{ textAlign: 'right', marginTop: 8, fontSize: 13, color: 'var(--accent-bright)', fontWeight: 600 }}>
                                Pagado en el período actual: ${totalPagadoPeriodo.toLocaleString('es-AR')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>
                            No hay pagos registrados todavía.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            )
          })
        )}
      </div>
      </div>{/* fin área scrolleable */}
    </div>
  )
}
