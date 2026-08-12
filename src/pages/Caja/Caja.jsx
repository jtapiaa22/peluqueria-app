import React, { useState, useEffect } from 'react'
import { X, Eye, Scissors, Archive, Ticket, Calendar } from 'lucide-react'
import { ModalConfirm, ModalAlert } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import Skeleton from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { motion, AnimatePresence } from 'framer-motion'

function hoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function horaActual() {
  return new Date().toTimeString().split(' ')[0].slice(0, 5)
}

function CajaSkeleton() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Skeleton width={150} height={38} radius={8} />
        <Skeleton width={130} height={38} radius={8} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', margin: 0 }}>
            <Skeleton width="55%" height={12} style={{ margin: '0 auto 12px' }} />
            <Skeleton width="70%" height={26} style={{ margin: '0 auto 10px' }} />
            <Skeleton width="45%" height={10} style={{ margin: '0 auto' }} />
          </div>
        ))}
      </div>
      <div className="card">
        <Skeleton width={200} height={16} style={{ marginBottom: 20 }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
            <Skeleton width="30%" height={14} />
            <Skeleton width="20%" height={14} />
            <Skeleton width="15%" height={14} />
            <Skeleton width="15%" height={14} />
            <Skeleton width="20%" height={14} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Caja() {
  const [atenciones, setAtenciones] = useState([])
  const [cierres, setCierres] = useState([])
  const [cajaAbierta, setCajaAbierta] = useState(null)
  const [fechaFiltro, setFechaFiltro] = useState(hoy())
  const [fechaHistorial, setFechaHistorial] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [vistaActiva, setVistaActiva] = useState('dia')
  const [detalleCierre, setDetalleCierre] = useState(null)
  const [modalConfirm, setModalConfirm] = useState(null)
  const [modalAlert, setModalAlert] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [fechasAbiertas, setFechasAbiertas] = useState({})
  const toggleFecha = (fecha) =>
    setFechasAbiertas(prev => ({ ...prev, [fecha]: !prev[fecha] }))

  const confirmar = (mensaje, onConfirm) => setModalConfirm({ mensaje, onConfirm })
  const toast = useToast()
  const alertar = (mensaje, tipo = 'info') => {
    if (tipo === 'error' || tipo === 'warning') setModalAlert({ mensaje, tipo })
    else toast(mensaje, tipo)
  }

  const cargar = async () => {
    const data = await window.electronAPI.getAtencionesByFecha(fechaFiltro)
    setAtenciones(data)
  }
  const verificarCaja = async () => {
    const caja = await window.electronAPI.getCajaAbierta()
    setCajaAbierta(caja)
  }
  const cargarCierres = async (fecha) => {
    const data = await window.electronAPI.getCierres(fecha)
    setCierres(data)
  }

  const abrirCaja = () => confirmar('¿Confirmar apertura de caja?', async () => {
    setModalConfirm(null)
    await window.electronAPI.abrirCaja({ fecha: hoy(), hora_apertura: horaActual() })
    verificarCaja()
    alertar('Caja abierta correctamente.', 'success')
  })

  const cerrarCaja = () => confirmar('¿Confirmar cierre de caja?', async () => {
    setModalConfirm(null)
    const atencionesDelTurno = await window.electronAPI.getAtencionesByFecha(cajaAbierta.fecha)
    const atencionesEnTurno = atencionesDelTurno.filter(a => a.hora >= cajaAbierta.hora_apertura)
    const efectivoTurno = atencionesEnTurno.reduce((acc, a) => acc + Number(a.monto_efectivo || 0), 0)
    const transferenciaTurno = atencionesEnTurno.reduce((acc, a) => acc + Number(a.monto_transferencia || 0), 0)
    await window.electronAPI.cerrarCaja({
      id: cajaAbierta.id,
      hora_cierre: horaActual(),
      total_efectivo: efectivoTurno,
      total_transferencia: transferenciaTurno,
      total_general: efectivoTurno + transferenciaTurno,
      observaciones
    })
    setObservaciones('')
    verificarCaja()
    alertar('Caja cerrada correctamente.', 'success')
  })

  const verDetalle = async (cierre) => {
    const data = await window.electronAPI.getDetalleCierre({
      fecha: cierre.fecha,
      hora_apertura: cierre.hora_apertura,
      hora_cierre: cierre.hora_cierre
    })
    setDetalleCierre({ cierre, atenciones: data })
  }

  useEffect(() => {
    setCargando(true)
    Promise.all([cargar(), verificarCaja()]).finally(() => setCargando(false))
  }, [fechaFiltro])
  useEffect(() => { if (vistaActiva === 'historial') cargarCierres(fechaHistorial) }, [vistaActiva])

  // Totales de caja (sin propinas)
  const totalEfectivo = atenciones.reduce((acc, a) => acc + Number(a.monto_efectivo || 0), 0)
  const totalTransferencia = atenciones.reduce((acc, a) => acc + Number(a.monto_transferencia || 0), 0)
  const totalGeneral = totalEfectivo + totalTransferencia

  // Propinas del día (solo informativas)
  const totalPropinasEfectivo = atenciones.reduce((acc, a) => acc + (Number(a.propina_efectivo) || 0), 0)
  const totalPropinasTransferencia = atenciones.reduce((acc, a) => acc + (Number(a.propina_transferencia) || 0), 0)
  const totalPropinasDia = totalPropinasEfectivo + totalPropinasTransferencia

  const atencionesReales = atenciones.filter(a => a.metodo_pago !== 'vale')
  const valesHoy = atenciones.filter(a => a.metodo_pago === 'vale')

  // Resumen por peluquero (incluye propinas)
  const resumenPorPeluquero = atenciones.reduce((acc, a) => {
    if (!acc[a.peluquero_nombre]) acc[a.peluquero_nombre] = { total: 0, cortes: 0, vales: 0, propinas: 0, propinas_efectivo: 0, propinas_transferencia: 0 }
    if (a.metodo_pago === 'vale') {
      acc[a.peluquero_nombre].vales += 1
    } else {
      acc[a.peluquero_nombre].total += Number(a.precio_cobrado)
      acc[a.peluquero_nombre].cortes += 1
    }
    acc[a.peluquero_nombre].propinas += (Number(a.propina_efectivo || 0) + Number(a.propina_transferencia || 0))
    acc[a.peluquero_nombre].propinas_efectivo += Number(a.propina_efectivo || 0)
    acc[a.peluquero_nombre].propinas_transferencia += Number(a.propina_transferencia || 0)
    return acc
  }, {})

  // Resumen para el modal de detalle de cierre (incluye propinas)
  const resumenPorPeluqueroCierre = detalleCierre
    ? detalleCierre.atenciones.reduce((acc, a) => {
      if (!acc[a.peluquero_nombre]) acc[a.peluquero_nombre] = { total: 0, atenciones: 0, vales: 0, propinas: 0, propinas_efectivo: 0, propinas_transferencia: 0 }
      if (a.metodo_pago === 'vale') {
        acc[a.peluquero_nombre].vales += 1
      } else {
        acc[a.peluquero_nombre].total += Number(a.precio_cobrado)
        acc[a.peluquero_nombre].atenciones += 1
      }
      acc[a.peluquero_nombre].propinas += (Number(a.propina_efectivo || 0) + Number(a.propina_transferencia || 0))
      acc[a.peluquero_nombre].propinas_efectivo += Number(a.propina_efectivo || 0)
      acc[a.peluquero_nombre].propinas_transferencia += Number(a.propina_transferencia || 0)
      return acc
    }, {})
    : {}

  const BadgePago = ({ a }) => {
    if (a.metodo_pago === 'vale') {
      return (
        <span style={{ background: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>
          Vale
        </span>
      )
    }
    if (a.metodo_pago === 'mixto') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ background: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>
            ef ${Number(a.monto_efectivo).toLocaleString('es-AR')}
          </span>
          <span style={{ background: 'rgba(var(--accent-2-rgb), 0.15)', color: 'var(--accent-2)', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>
            tr ${Number(a.monto_transferencia).toLocaleString('es-AR')}
          </span>
        </div>
      )
    }
    return (
      <span style={{
        background: a.metodo_pago === 'efectivo' ? 'color-mix(in srgb, var(--success) 15%, transparent)' : 'rgba(var(--accent-2-rgb), 0.15)',
        color: a.metodo_pago === 'efectivo' ? 'var(--success)' : 'var(--accent-2)',
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

      {/* ── MODAL DETALLE CIERRE ── */}
      <AnimatePresence>
        {detalleCierre && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          >
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 14, padding: 30, width: '100%', maxWidth: 800, maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
              <button onClick={() => setDetalleCierre(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>

              <h3 style={{ color: 'var(--accent-bright)', marginBottom: 20 }}>Detalle del cierre</h3>

              {/* Cards apertura / cierre */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)', borderRadius: 10, padding: '14px 18px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Apertura</div>
                  <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 22 }}>{detalleCierre.cierre.hora_apertura}hs</div>
                  <div style={{ color: 'var(--success)', fontSize: 13, marginTop: 4 }}>{detalleCierre.cierre.fecha}</div>
                </div>
                <div style={{ background: 'rgba(var(--accent-2-rgb), 0.1)', border: '1px solid rgba(var(--accent-2-rgb), 0.3)', borderRadius: 10, padding: '14px 18px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Cierre
                    {detalleCierre.cierre.hora_cierre < detalleCierre.cierre.hora_apertura && (
                      <span style={{ marginLeft: 8, background: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)', fontSize: 10, padding: '1px 7px', borderRadius: 99 }}>
                        día siguiente
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--accent-2)', fontWeight: 700, fontSize: 22 }}>{detalleCierre.cierre.hora_cierre}hs</div>
                  <div style={{ color: 'var(--accent-2)', fontSize: 13, marginTop: 4 }}>
                    {detalleCierre.cierre.hora_cierre < detalleCierre.cierre.hora_apertura
                      ? (() => {
                        const d = new Date(detalleCierre.cierre.fecha + 'T00:00:00')
                        d.setDate(d.getDate() + 1)
                        return d.toISOString().split('T')[0]
                      })()
                      : detalleCierre.cierre.fecha
                    }
                  </div>
                </div>
              </div>

              {/* Totales cierre */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Efectivo</div>
                  <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 18 }}>
                    ${Number(detalleCierre.cierre.total_efectivo).toLocaleString('es-AR')}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Transferencia</div>
                  <div style={{ color: 'var(--accent-2)', fontWeight: 700, fontSize: 18 }}>
                    ${Number(detalleCierre.cierre.total_transferencia).toLocaleString('es-AR')}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Total</div>
                  <div style={{ color: 'var(--accent-bright)', fontWeight: 700, fontSize: 18 }}>
                    ${Number(detalleCierre.cierre.total_general).toLocaleString('es-AR')}
                  </div>
                </div>
              </div>

              {/* Por peluquero (con columna Propinas) */}
              <h4 style={{ color: 'var(--accent-bright)', marginBottom: 12 }}>Por peluquero</h4>
              <table className="table" style={{ marginBottom: 24 }}>
                <thead>
                  <tr>
                    <th>Peluquero</th>
                    <th>Cortes</th>
                    <th>Vales</th>
                    <th>Total generado</th>
                    <th>Propinas</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(resumenPorPeluqueroCierre).map(([nombre, data]) => (
                    <tr key={nombre}>
                      <td>{nombre}</td>
                      {/* Cortes = todos los cortes hechos (incluye los pagados con vale) */}
                      <td>{data.atenciones + data.vales}</td>
                      <td style={{ color: data.vales > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {data.vales > 0 ? data.vales : '—'}
                      </td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>${data.total.toLocaleString('es-AR')}</td>
                      <td>
                        <div style={{ color: 'var(--warning)', fontWeight: 600 }}>${data.propinas.toLocaleString('es-AR')}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 2, fontSize: 11 }}>
                          {data.propinas_efectivo > 0 && <span style={{ color: 'var(--success)' }}>E: ${data.propinas_efectivo.toLocaleString('es-AR')}</span>}
                          {data.propinas_transferencia > 0 && <span style={{ color: 'var(--accent-2)' }}>T: ${data.propinas_transferencia.toLocaleString('es-AR')}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Todas las atenciones (con columna Propina) */}
              <h4 style={{ color: 'var(--accent-bright)', marginBottom: 12 }}>Todas las atenciones</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Peluquero</th>
                    <th>Servicio</th>
                    <th>Precio</th>
                    <th>Propina</th>
                    <th>Pago</th>
                    <th>Transferido por</th>
                  </tr>
                </thead>
                <tbody>
                  {detalleCierre.atenciones.map(a => (
                    <tr key={a.id} style={{ opacity: a.metodo_pago === 'vale' ? 0.75 : 1 }}>
                      <td>{a.hora}hs</td>
                      <td>{a.peluquero_nombre}</td>
                      <td style={{ color: a.metodo_pago === 'vale' ? 'var(--text-muted)' : 'var(--text-main)', fontStyle: a.metodo_pago === 'vale' ? 'italic' : 'normal' }}>
                        {a.metodo_pago === 'vale' ? '— vale —' : (a.servicio_nombre || '-')}
                      </td>
                      <td style={{ color: a.metodo_pago === 'vale' ? 'var(--text-muted)' : 'var(--success)', fontWeight: 600 }}>
                        {a.metodo_pago === 'vale' ? '—' : `$${Number(a.precio_cobrado).toLocaleString('es-AR')}`}
                      </td>
                      <td>
                        {(Number(a.propina_efectivo) || 0) > 0 || (Number(a.propina_transferencia) || 0) > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {Number(a.propina_efectivo) > 0 && <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: 13 }}>Ef: ${Number(a.propina_efectivo).toLocaleString('es-AR')}</span>}
                            {Number(a.propina_transferencia) > 0 && <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: 13 }}>Tr: ${Number(a.propina_transferencia).toLocaleString('es-AR')}</span>}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td><BadgePago a={a} /></td>
                      <td style={{ color: 'var(--text-muted)' }}>{a.nombre_transferencia || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Caja</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${vistaActiva === 'dia' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setVistaActiva('dia')}>Día actual</button>
          <button className={`btn ${vistaActiva === 'historial' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setVistaActiva('historial')}>Historial de cierres</button>
        </div>
      </div>

      {/* VISTA DÍA */}
      {vistaActiva === 'dia' && cargando && <CajaSkeleton />}
      {vistaActiva === 'dia' && !cargando && (
        <div>
          <div className="form-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{
              background: 'var(--input-bg-focus)',
              border: '1px solid var(--input-border)',
              borderRadius: 8,
              padding: '8px 16px',
              color: 'var(--text-main)',
              fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Calendar size={15} /> {fechaFiltro}
            </div>

            {!cajaAbierta
              ? <button className="btn btn-primary" onClick={abrirCaja}>Abrir caja</button>
              : <div style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)', borderRadius: 8, padding: '8px 16px', color: 'var(--success)', fontSize: 13 }}>
                Caja abierta desde las <strong>{cajaAbierta.hora_apertura}hs</strong>
                {cajaAbierta.fecha !== hoy() && (
                  <span style={{ marginLeft: 8, background: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)', fontSize: 13, padding: '1px 8px', borderRadius: 99 }}>
                    desde el {cajaAbierta.fecha}
                  </span>
                )}
              </div>
            }
          </div>

          {!cajaAbierta && (
            <div style={{ background: 'color-mix(in srgb, var(--warning) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)', borderRadius: 10, padding: '16px 20px', marginBottom: 24, color: 'var(--warning)', fontSize: 14 }}>
              La caja está cerrada. Abrila para empezar a registrar atenciones.
            </div>
          )}

          {/* Cards totales */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Efectivo</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-main)' }}>${totalEfectivo.toLocaleString('es-AR')}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                {atencionesReales.filter(a => a.metodo_pago === 'efectivo' || a.metodo_pago === 'mixto').length} atenciones
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Transferencia</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-main)' }}>${totalTransferencia.toLocaleString('es-AR')}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                {atencionesReales.filter(a => a.metodo_pago === 'transferencia' || a.metodo_pago === 'mixto').length} atenciones
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center', margin: 0, border: '1px solid var(--border-primary)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Total general</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-main)' }}>${totalGeneral.toLocaleString('es-AR')}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                {/* Cortes = todos los cortes hechos (incluye los pagados con vale); el vale se muestra aparte como desglose */}
                {atenciones.length} cortes
                {valesHoy.length > 0 && (
                  <span style={{ marginLeft: 6, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>· {valesHoy.length} vale{valesHoy.length > 1 ? 's' : ''} <Ticket size={11} /></span>
                )}
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Propinas</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-main)' }}>${totalPropinasDia.toLocaleString('es-AR')}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4 }}>
                {totalPropinasEfectivo > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Ef: ${totalPropinasEfectivo.toLocaleString('es-AR')}</span>}
                {totalPropinasTransferencia > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Tr: ${totalPropinasTransferencia.toLocaleString('es-AR')}</span>}
              </div>
            </div>
          </div>

          {/* Generado por peluquero (con columna Propinas) */}
          <div className="card">
            <h3 style={{ marginBottom: 16, color: 'var(--accent-bright)' }}>Generado por peluquero</h3>
            <table className="table" style={{ width: '100%', marginTop: 12, borderCollapse: 'separate', borderSpacing: 0, border: '1px solid var(--border-soft)', borderRadius: 10, overflow: 'hidden', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Peluquero</th>
                  <th>Total generado</th>
                  <th>Cortes</th>
                  <th>Vales</th>
                  <th>Propinas</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(resumenPorPeluquero).length === 0
                  ? <tr><td colSpan={5} style={{ padding: 0 }}><EmptyState icono={<Scissors size={26} />} titulo="Sin atenciones para este día" texto="Las atenciones que cargues hoy van a aparecer acá." padding="32px 24px" /></td></tr>
                  : Object.entries(resumenPorPeluquero)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([nombre, data]) => (
                      <tr key={nombre}>
                        <td>{nombre}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>${data.total.toLocaleString('es-AR')}</td>
                        {/* Cortes = todos los cortes hechos (incluye los pagados con vale) */}
                        <td>{data.cortes + data.vales}</td>
                        <td style={{ color: data.vales > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                          {data.vales > 0 ? data.vales : '—'}
                        </td>
                        <td>
                          <div style={{ color: 'var(--warning)', fontWeight: 600 }}>${data.propinas.toLocaleString('es-AR')}</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 2, fontSize: 11 }}>
                            {data.propinas_efectivo > 0 && <span style={{ color: 'var(--success)' }}>Ef: ${data.propinas_efectivo.toLocaleString('es-AR')}</span>}
                            {data.propinas_transferencia > 0 && <span style={{ color: 'var(--accent-2)' }}>Tr: ${data.propinas_transferencia.toLocaleString('es-AR')}</span>}
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>

          {/* Cerrar caja */}
          {cajaAbierta && (
            <div className="card">
              <h3 style={{ marginBottom: 16, color: 'var(--accent-bright)' }}>Cerrar caja</h3>

              {/* Resumen del turno */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Efectivo',      valor: totalEfectivo,      color: 'var(--success)' },
                  { label: 'Transferencia', valor: totalTransferencia,  color: 'var(--accent-2)' },
                  { label: 'Total',         valor: totalGeneral,        color: 'var(--accent-bright)' },
                  { label: 'Propinas',      valor: totalPropinasDia,    color: 'var(--warning)' },
                ].map(({ label, valor, color }) => (
                  <div key={label} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>{label}</div>
                    <div style={{ color, fontWeight: 700, fontSize: 18 }}>${valor.toLocaleString('es-AR')}</div>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label>Observaciones <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(opcional)</span></label>
                <input className="input" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Ej: turno mañana, turno tarde, etc." />
              </div>
              <button className="btn btn-primary" onClick={cerrarCaja}>Cerrar caja</button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {/* VISTA HISTORIAL (sin cambios en propinas, solo se ven en el modal) */}
        {vistaActiva === 'historial' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden', borderTop: '1px solid var(--border-soft)' }}
          >
            <div className='caja-historial-container'>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ color: 'var(--accent-bright)', margin: 0 }}>Historial de cierres</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: 14 }}>Filtrar por fecha</label>
                    <input
                      className="input" type="date" value={fechaHistorial}
                      onChange={e => { setFechaHistorial(e.target.value); cargarCierres(e.target.value) }}
                      style={{ width: 'auto' }}
                    />
                    {fechaHistorial && (
                      <button className="btn btn-secondary" onClick={() => { setFechaHistorial(''); cargarCierres('') }}>Ver todos</button>
                    )}
                  </div>
                </div>
                <div className='historial-container'>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Apertura</th>
                        <th>Cierre</th>
                        <th>Efectivo</th>
                        <th>Transferencia</th>
                        <th>Total turno</th>
                        <th>Observaciones</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cierres.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: 0 }}>
                            <EmptyState icono={<Archive size={26} />} titulo="No hay cierres registrados" texto="Cuando cierres un turno de caja, vas a ver el historial acá." padding="32px 24px" />
                          </td>
                        </tr>
                      ) : (
                        (() => {
                          const porFecha = cierres.reduce((acc, c) => {
                            if (!acc[c.fecha]) acc[c.fecha] = []
                            acc[c.fecha].push(c)
                            return acc
                          }, {})

                          return Object.entries(porFecha).map(([fecha, turnos]) => {
                            const totalDia = turnos.reduce((acc, t) => acc + Number(t.total_general), 0)
                            const efectivoDia = turnos.reduce((acc, t) => acc + Number(t.total_efectivo), 0)
                            const transfDia = turnos.reduce((acc, t) => acc + Number(t.total_transferencia), 0)
                            const abierta = !!fechasAbiertas[fecha]

                            return (
                              <React.Fragment key={fecha}>
                                <tr
                                  onClick={() => toggleFecha(fecha)}
                                  style={{
                                    cursor: 'pointer',
                                    background: abierta ? 'rgba(var(--accent-rgb), 0.10)' : 'rgba(var(--accent-rgb), 0.04)',
                                    transition: 'background 0.2s ease',
                                    userSelect: 'none',
                                  }}
                                >
                                  <td colSpan={2} style={{ padding: '14px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 22, height: 22,
                                        borderRadius: '50%',
                                        background: 'rgba(var(--accent-rgb), 0.15)',
                                        color: 'var(--accent-bright)',
                                        fontSize: 11,
                                        transition: 'transform 0.2s ease',
                                        transform: abierta ? 'rotate(90deg)' : 'rotate(0deg)',
                                        flexShrink: 0,
                                      }}>▶</span>
                                      <span style={{ color: 'var(--accent-bright)', fontWeight: 700, fontSize: 14 }}>{fecha}</span>
                                      <span style={{
                                        background: 'rgba(var(--accent-rgb), 0.15)',
                                        color: 'var(--accent-bright)',
                                        borderRadius: 99,
                                        fontSize: 11,
                                        padding: '2px 8px',
                                        fontWeight: 600,
                                      }}>
                                        {turnos.length} {turnos.length === 1 ? 'turno' : 'turnos'}
                                      </span>
                                    </div>
                                  </td>
                                  <td />
                                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>${efectivoDia.toLocaleString('es-AR')}</td>
                                  <td style={{ color: 'var(--accent-2)', fontWeight: 600 }}>${transfDia.toLocaleString('es-AR')}</td>
                                  <td style={{ color: 'var(--warning)', fontWeight: 700, fontSize: 15 }}>${totalDia.toLocaleString('es-AR')}</td>
                                  <td colSpan={2} style={{ color: 'var(--text-muted)', fontSize: 12 }}>Total del día</td>
                                </tr>
                                <AnimatePresence>
                                  {abierta && turnos.map((c, i) => {
                                    const cierreOtroDia = c.hora_cierre && c.hora_cierre < c.hora_apertura
                                    const fechaCierre = cierreOtroDia
                                      ? (() => {
                                        const d = new Date(c.fecha + 'T00:00:00')
                                        d.setDate(d.getDate() + 1)
                                        return d.toISOString().split('T')[0]
                                      })()
                                      : c.fecha

                                    return (
                                      <motion.tr
                                        key={c.id}
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.18, delay: i * 0.04 }}
                                        style={{ background: 'rgba(var(--accent-rgb), 0.02)' }}
                                      >
                                        <td style={{ paddingLeft: 48, color: 'var(--text-muted)', fontSize: 12 }}>{c.fecha}</td>
                                        <td><div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.hora_apertura}hs</div></td>
                                        <td>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.hora_cierre}hs</span>
                                            {cierreOtroDia && (
                                              <span style={{ background: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)', fontSize: 10, padding: '1px 7px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                                                +1 día
                                              </span>
                                            )}
                                          </div>
                                          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fechaCierre}</div>
                                        </td>
                                        <td style={{ color: 'var(--success)' }}>${Number(c.total_efectivo).toLocaleString('es-AR')}</td>
                                        <td style={{ color: 'var(--accent-2)' }}>${Number(c.total_transferencia).toLocaleString('es-AR')}</td>
                                        <td style={{ color: 'var(--accent-bright)', fontWeight: 700 }}>${Number(c.total_general).toLocaleString('es-AR')}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{c.observaciones || '-'}</td>
                                        <td>
                                          <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); verDetalle(c) }}>
                                            <Eye size={14} />
                                          </button>
                                        </td>
                                      </motion.tr>
                                    )
                                  })}
                                </AnimatePresence>
                              </React.Fragment>
                            )
                          })
                        })()
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}