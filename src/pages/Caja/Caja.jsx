import React, { useState, useEffect } from 'react'
import { X, Eye } from 'lucide-react'
import { ModalConfirm, ModalAlert } from '../../components/Modal'
import { motion, AnimatePresence } from 'framer-motion'

function hoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function horaActual() {
  return new Date().toTimeString().split(' ')[0].slice(0, 5)
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
  const [fechasAbiertas, setFechasAbiertas] = useState({})
  const toggleFecha = (fecha) =>
    setFechasAbiertas(prev => ({ ...prev, [fecha]: !prev[fecha] }))

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

  useEffect(() => { cargar(); verificarCaja() }, [fechaFiltro])
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
        <span style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>
          Vale
        </span>
      )
    }
    if (a.metodo_pago === 'mixto') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>
            ef ${Number(a.monto_efectivo).toLocaleString('es-AR')}
          </span>
          <span style={{ background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>
            tr ${Number(a.monto_transferencia).toLocaleString('es-AR')}
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

              <h3 style={{ color: '#a78bfa', marginBottom: 20 }}>Detalle del cierre</h3>

              {/* Cards apertura / cierre */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: 10, padding: '14px 18px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Apertura</div>
                  <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 22 }}>{detalleCierre.cierre.hora_apertura}hs</div>
                  <div style={{ color: '#4ade80', fontSize: 13, marginTop: 4 }}>{detalleCierre.cierre.fecha}</div>
                </div>
                <div style={{ background: 'rgba(192, 132, 252, 0.1)', border: '1px solid rgba(192, 132, 252, 0.3)', borderRadius: 10, padding: '14px 18px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Cierre
                    {detalleCierre.cierre.hora_cierre < detalleCierre.cierre.hora_apertura && (
                      <span style={{ marginLeft: 8, background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', fontSize: 10, padding: '1px 7px', borderRadius: 99 }}>
                        día siguiente
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#c084fc', fontWeight: 700, fontSize: 22 }}>{detalleCierre.cierre.hora_cierre}hs</div>
                  <div style={{ color: '#c084fc', fontSize: 13, marginTop: 4 }}>
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
                <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Efectivo</div>
                  <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 18 }}>
                    ${Number(detalleCierre.cierre.total_efectivo).toLocaleString('es-AR')}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Transferencia</div>
                  <div style={{ color: '#c084fc', fontWeight: 700, fontSize: 18 }}>
                    ${Number(detalleCierre.cierre.total_transferencia).toLocaleString('es-AR')}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Total</div>
                  <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: 18 }}>
                    ${Number(detalleCierre.cierre.total_general).toLocaleString('es-AR')}
                  </div>
                </div>
              </div>

              {/* Por peluquero (con columna Propinas) */}
              <h4 style={{ color: '#a78bfa', marginBottom: 12 }}>Por peluquero</h4>
              <table className="table" style={{ marginBottom: 24 }}>
                <thead>
                  <tr>
                    <th>Peluquero</th>
                    <th>Cortes</th>
                    <th>Vales 🎫</th>
                    <th>Total generado</th>
                    <th>Propinas</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(resumenPorPeluqueroCierre).map(([nombre, data]) => (
                    <tr key={nombre}>
                      <td>{nombre}</td>
                      <td>{data.atenciones}</td>
                      <td style={{ color: data.vales > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
                        {data.vales > 0 ? data.vales : '—'}
                      </td>
                      <td style={{ color: '#4ade80', fontWeight: 600 }}>${data.total.toLocaleString('es-AR')}</td>
                      <td>
                        <div style={{ color: '#facc15', fontWeight: 600 }}>${data.propinas.toLocaleString('es-AR')}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 2, fontSize: 11 }}>
                          {data.propinas_efectivo > 0 && <span style={{ color: '#4ade80' }}>E: ${data.propinas_efectivo.toLocaleString('es-AR')}</span>}
                          {data.propinas_transferencia > 0 && <span style={{ color: '#c084fc' }}>T: ${data.propinas_transferencia.toLocaleString('es-AR')}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Todas las atenciones (con columna Propina) */}
              <h4 style={{ color: '#a78bfa', marginBottom: 12 }}>Todas las atenciones</h4>
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
                      <td style={{ color: a.metodo_pago === 'vale' ? 'var(--text-muted)' : '#4ade80', fontWeight: 600 }}>
                        {a.metodo_pago === 'vale' ? '—' : `$${Number(a.precio_cobrado).toLocaleString('es-AR')}`}
                      </td>
                      <td>
                        {(Number(a.propina_efectivo) || 0) > 0 || (Number(a.propina_transferencia) || 0) > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {Number(a.propina_efectivo) > 0 && <span style={{ color: '#facc15', fontWeight: 600, fontSize: 13 }}>Ef: ${Number(a.propina_efectivo).toLocaleString('es-AR')}</span>}
                            {Number(a.propina_transferencia) > 0 && <span style={{ color: '#facc15', fontWeight: 600, fontSize: 13 }}>Tr: ${Number(a.propina_transferencia).toLocaleString('es-AR')}</span>}
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
      {vistaActiva === 'dia' && (
        <div>
          <div className="form-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{
              background: 'var(--input-bg-focus)',
              border: '1px solid var(--input-border)',
              borderRadius: 8,
              padding: '8px 16px',
              color: 'var(--text-main)',
              fontSize: 14
            }}>
              📅 {fechaFiltro}
            </div>

            {!cajaAbierta
              ? <button className="btn btn-primary" onClick={abrirCaja}>Abrir caja</button>
              : <div style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: 8, padding: '8px 16px', color: '#4ade80', fontSize: 13 }}>
                Caja abierta desde las <strong>{cajaAbierta.hora_apertura}hs</strong>
                {cajaAbierta.fecha !== hoy() && (
                  <span style={{ marginLeft: 8, background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', fontSize: 11, padding: '1px 8px', borderRadius: 99 }}>
                    desde el {cajaAbierta.fecha}
                  </span>
                )}
              </div>
            }
          </div>

          {!cajaAbierta && (
            <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: 10, padding: '16px 20px', marginBottom: 24, color: '#fbbf24', fontSize: 14 }}>
              La caja está cerrada. Abrila para empezar a registrar atenciones.
            </div>
          )}

          {/* Cards totales */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Efectivo</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#4ade80' }}>${totalEfectivo.toLocaleString('es-AR')}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                {atencionesReales.filter(a => a.metodo_pago === 'efectivo' || a.metodo_pago === 'mixto').length} atenciones
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Transferencia</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#c084fc' }}>${totalTransferencia.toLocaleString('es-AR')}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                {atencionesReales.filter(a => a.metodo_pago === 'transferencia' || a.metodo_pago === 'mixto').length} atenciones
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center', margin: 0, border: '1px solid var(--border-primary)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Total general</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#a78bfa' }}>${totalGeneral.toLocaleString('es-AR')}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                {atencionesReales.length} cortes
                {valesHoy.length > 0 && (
                  <span style={{ marginLeft: 6, color: '#fbbf24' }}>· {valesHoy.length} vale{valesHoy.length > 1 ? 's' : ''} 🎫</span>
                )}
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center', margin: 0, border: '1px solid rgba(250,204,21,0.25)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Propinas</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#facc15' }}>${totalPropinasDia.toLocaleString('es-AR')}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4 }}>
                {totalPropinasEfectivo > 0 && <span style={{ color: '#4ade80', fontSize: 11 }}>Ef: ${totalPropinasEfectivo.toLocaleString('es-AR')}</span>}
                {totalPropinasTransferencia > 0 && <span style={{ color: '#c084fc', fontSize: 11 }}>Tr: ${totalPropinasTransferencia.toLocaleString('es-AR')}</span>}
              </div>
            </div>
          </div>

          {/* Generado por peluquero (con columna Propinas) */}
          <div className="card">
            <h3 style={{ marginBottom: 16, color: '#a78bfa' }}>Generado por peluquero</h3>
            <table className="table" style={{ width: '100%', marginTop: 12, borderCollapse: 'separate', borderSpacing: 0, border: '1px solid var(--border-soft)', borderRadius: 10, overflow: 'hidden', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Peluquero</th>
                  <th>Total generado</th>
                  <th>Cortes</th>
                  <th>Vales 🎫</th>
                  <th>Propinas</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(resumenPorPeluquero).length === 0
                  ? <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Sin atenciones para este día</td></tr>
                  : Object.entries(resumenPorPeluquero)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([nombre, data]) => (
                      <tr key={nombre}>
                        <td>{nombre}</td>
                        <td style={{ color: '#4ade80', fontWeight: 600 }}>${data.total.toLocaleString('es-AR')}</td>
                        <td>{data.cortes}</td>
                        <td style={{ color: data.vales > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
                          {data.vales > 0 ? data.vales : '—'}
                        </td>
                        <td>
                          <div style={{ color: '#facc15', fontWeight: 600 }}>${data.propinas.toLocaleString('es-AR')}</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 2, fontSize: 11 }}>
                            {data.propinas_efectivo > 0 && <span style={{ color: '#4ade80' }}>Ef: ${data.propinas_efectivo.toLocaleString('es-AR')}</span>}
                            {data.propinas_transferencia > 0 && <span style={{ color: '#c084fc' }}>Tr: ${data.propinas_transferencia.toLocaleString('es-AR')}</span>}
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
              <h3 style={{ marginBottom: 16, color: '#a78bfa' }}>Cerrar caja</h3>

              {/* Resumen del turno */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Efectivo',      valor: totalEfectivo,      color: '#4ade80' },
                  { label: 'Transferencia', valor: totalTransferencia,  color: '#c084fc' },
                  { label: 'Total',         valor: totalGeneral,        color: '#a78bfa' },
                  { label: 'Propinas',      valor: totalPropinasDia,    color: '#facc15' },
                ].map(({ label, valor, color }) => (
                  <div key={label} style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
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
                  <h3 style={{ color: '#a78bfa', margin: 0 }}>Historial de cierres</h3>
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
                          <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>
                            No hay cierres registrados
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
                                    background: abierta ? 'rgba(124, 58, 237, 0.10)' : 'rgba(124, 58, 237, 0.04)',
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
                                        background: 'rgba(124, 58, 237, 0.15)',
                                        color: '#a78bfa',
                                        fontSize: 11,
                                        transition: 'transform 0.2s ease',
                                        transform: abierta ? 'rotate(90deg)' : 'rotate(0deg)',
                                        flexShrink: 0,
                                      }}>▶</span>
                                      <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 14 }}>{fecha}</span>
                                      <span style={{
                                        background: 'rgba(124, 58, 237, 0.15)',
                                        color: '#a78bfa',
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
                                  <td style={{ color: '#4ade80', fontWeight: 600 }}>${efectivoDia.toLocaleString('es-AR')}</td>
                                  <td style={{ color: '#c084fc', fontWeight: 600 }}>${transfDia.toLocaleString('es-AR')}</td>
                                  <td style={{ color: '#facc15', fontWeight: 700, fontSize: 15 }}>${totalDia.toLocaleString('es-AR')}</td>
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
                                        style={{ background: 'rgba(124, 58, 237, 0.02)' }}
                                      >
                                        <td style={{ paddingLeft: 48, color: 'var(--text-muted)', fontSize: 12 }}>{c.fecha}</td>
                                        <td><div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.hora_apertura}hs</div></td>
                                        <td>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.hora_cierre}hs</span>
                                            {cierreOtroDia && (
                                              <span style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', fontSize: 10, padding: '1px 7px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                                                +1 día
                                              </span>
                                            )}
                                          </div>
                                          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fechaCierre}</div>
                                        </td>
                                        <td style={{ color: '#4ade80' }}>${Number(c.total_efectivo).toLocaleString('es-AR')}</td>
                                        <td style={{ color: '#c084fc' }}>${Number(c.total_transferencia).toLocaleString('es-AR')}</td>
                                        <td style={{ color: '#a78bfa', fontWeight: 700 }}>${Number(c.total_general).toLocaleString('es-AR')}</td>
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