import React, { useState, useEffect } from 'react'
import { X, Eye } from 'lucide-react'
import { ModalConfirm, ModalAlert } from '../../components/Modal'
import { div } from 'framer-motion/client'
import { AnimatePresence, motion } from "framer-motion";


// Movidas fuera del componente para evitar problemas de hoisting
function hoy() {
  return new Date().toISOString().split('T')[0]
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

  const confirmar = (mensaje, onConfirm) => {
    setModalConfirm({ mensaje, onConfirm })
  }

  const alertar = (mensaje, tipo = 'info') => {
    setModalAlert({ mensaje, tipo })
  }

  const cargar = async () => {
    const data = await window.electronAPI.getAtencionesByFecha(fechaFiltro)
    setAtenciones(data)
  }

  const verificarCaja = async () => {
    const caja = await window.electronAPI.getCajaAbierta()
    setCajaAbierta(caja)
  }

  const cargarCierres = async (fecha = '') => {
    const data = await window.electronAPI.getCierres(fecha)
    setCierres(data)
  }

  const abrirCaja = () => {
    confirmar('¿Confirmar apertura de caja?', async () => {
      setModalConfirm(null)
      await window.electronAPI.abrirCaja({ fecha: hoy(), hora_apertura: horaActual() })
      verificarCaja()
      alertar('Caja abierta correctamente.', 'success')
    })
  }

  const cerrarCaja = () => {
    confirmar('¿Confirmar cierre de caja?', async () => {
      setModalConfirm(null)

      // Calcular totales filtrando por el turno abierto, no por fechaFiltro
      // Esto evita que un cambio de fecha en el filtro afecte los totales del cierre
      const atencionesDelTurno = await window.electronAPI.getAtencionesByFecha(cajaAbierta.fecha)
      const atencionesEnTurno = atencionesDelTurno.filter(
        a => a.hora >= cajaAbierta.hora_apertura
      )
      const efectivoTurno = atencionesEnTurno
        .filter(a => a.metodo_pago === 'efectivo')
        .reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
      const transferenciaTurno = atencionesEnTurno
        .filter(a => a.metodo_pago === 'transferencia')
        .reduce((acc, a) => acc + Number(a.precio_cobrado), 0)

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
  }

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

  const totalEfectivo = atenciones.filter(a => a.metodo_pago === 'efectivo').reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
  const totalTransferencia = atenciones.filter(a => a.metodo_pago === 'transferencia').reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
  const totalGeneral = totalEfectivo + totalTransferencia

  const resumenPorPeluquero = atenciones.reduce((acc, a) => {
    if (!acc[a.peluquero_nombre]) acc[a.peluquero_nombre] = 0
    acc[a.peluquero_nombre] += Number(a.precio_cobrado)
    return acc
  }, {})

  const resumenPorPeluqueroCierre = detalleCierre
    ? detalleCierre.atenciones.reduce((acc, a) => {
        if (!acc[a.peluquero_nombre]) acc[a.peluquero_nombre] = { total: 0, atenciones: 0 }
        acc[a.peluquero_nombre].total += Number(a.precio_cobrado)
        acc[a.peluquero_nombre].atenciones += 1
        return acc
      }, {})
    : {}

  return (
    <div className='page-animation'>
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


      <AnimatePresence>
      {detalleCierre && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14, padding: 30, width: '100%', maxWidth: 700, maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setDetalleCierre(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>
              <X size={20} />
            </button>
            <h3 style={{ color: '#a78bfa', marginBottom: 4 }}>Detalle del cierre</h3>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
              {detalleCierre.cierre.fecha} — Apertura: {detalleCierre.cierre.hora_apertura}hs / Cierre: {detalleCierre.cierre.hora_cierre}hs
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div style={{ background: '#0f0f0f', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Efectivo</div>
                <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 18 }}>${Number(detalleCierre.cierre.total_efectivo).toLocaleString('es-AR')}</div>
              </div>
              <div style={{ background: '#0f0f0f', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Transferencia</div>
                <div style={{ color: '#c084fc', fontWeight: 700, fontSize: 18 }}>${Number(detalleCierre.cierre.total_transferencia).toLocaleString('es-AR')}</div>
              </div>
              <div style={{ background: '#0f0f0f', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Total</div>
                <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: 18 }}>${Number(detalleCierre.cierre.total_general).toLocaleString('es-AR')}</div>
              </div>
            </div>
            <h4 style={{ color: '#a78bfa', marginBottom: 12 }}>Por peluquero</h4>
            <table className="table" style={{ marginBottom: 24 }}>
              <thead><tr><th>Peluquero</th><th>Atenciones</th><th>Total</th></tr></thead>
              <tbody>
                {Object.entries(resumenPorPeluqueroCierre).map(([nombre, data]) => (
                  <tr key={nombre}>
                    <td>{nombre}</td>
                    <td>{data.atenciones}</td>
                    <td style={{ color: '#4ade80', fontWeight: 600 }}>${data.total.toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h4 style={{ color: '#a78bfa', marginBottom: 12 }}>Todas las atenciones</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Peluquero</th>
                  <th>Servicio</th>
                  <th>Precio</th>
                  <th>Pago</th>
                  <th>Transferido por</th>
                </tr>
              </thead>
              <tbody>
                {detalleCierre.atenciones.map(a => (
                  <tr key={a.id}>
                    <td>{a.hora}</td>
                    <td>{a.peluquero_nombre}</td>
                    <td>{a.servicio_nombre}</td>
                    <td style={{ color: '#4ade80', fontWeight: 600 }}>${Number(a.precio_cobrado).toLocaleString('es-AR')}</td>
                    <td>
                      <span style={{
                        background: a.metodo_pago === 'efectivo' ? '#052e16' : '#2e1065',
                        color: a.metodo_pago === 'efectivo' ? '#4ade80' : '#c084fc',
                        padding: '2px 10px', borderRadius: 99, fontSize: 12
                      }}>
                        {a.metodo_pago}
                      </span>
                    </td>
                    <td style={{ color: '#666' }}>{a.nombre_transferencia || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Caja</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${vistaActiva === 'dia' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setVistaActiva('dia')}>Día actual</button>
          <button className={`btn ${vistaActiva === 'historial' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setVistaActiva('historial')}>Historial de cierres</button>
        </div>
      </div>

      {vistaActiva === 'dia' && (
        <>
          <div className="form-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ color: '#aaa', fontSize: 14 }}>Fecha:</label>
              <input className="input" type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} style={{ width: 'auto' }} />
            </div>
            {!cajaAbierta ? (
              <button className="btn btn-primary" onClick={abrirCaja}>Abrir caja</button>
            ) : (
              <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: 8, padding: '8px 16px', color: '#4ade80', fontSize: 13 }}>
                ✅ Caja abierta desde las <strong>{cajaAbierta.hora_apertura}hs</strong>
              </div>
            )}
          </div>

          {!cajaAbierta && (
            <div style={{ background: '#2d1a00', border: '1px solid #92400e', borderRadius: 10, padding: '16px 20px', marginBottom: 24, color: '#fbbf24', fontSize: 14 }}>
              ⚠️ La caja está cerrada. Abrila para empezar a registrar atenciones.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Efectivo</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#4ade80' }}>${totalEfectivo.toLocaleString('es-AR')}</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>{atenciones.filter(a => a.metodo_pago === 'efectivo').length} atenciones</div>
            </div>
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Transferencia</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#c084fc' }}>${totalTransferencia.toLocaleString('es-AR')}</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>{atenciones.filter(a => a.metodo_pago === 'transferencia').length} atenciones</div>
            </div>
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Total general</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#a78bfa' }}>${totalGeneral.toLocaleString('es-AR')}</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>{atenciones.length} atenciones en total</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 16, color: '#a78bfa' }}>Generado por peluquero</h3>
            <table className="table">
              <thead><tr><th>Peluquero</th><th>Total generado</th><th>Cantidad de cortes</th></tr></thead>
              <tbody>
                {Object.keys(resumenPorPeluquero).length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: '#555', padding: 30 }}>Sin atenciones para este día</td></tr>
                )}
                {Object.entries(resumenPorPeluquero)
                  .sort((a, b) => atenciones.filter(at => at.peluquero_nombre === b[0]).length
                                - atenciones.filter(at => at.peluquero_nombre === a[0]).length)
                  .map(([nombre, total]) => (
                    <tr key={nombre}>
                      <td>{nombre}</td>
                      <td style={{ color: '#4ade80', fontWeight: 600 }}>${total.toLocaleString('es-AR')}</td>
                      <td>{atenciones.filter(a => a.peluquero_nombre === nombre).length}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {cajaAbierta && (
            <div className="card">
              <h3 style={{ marginBottom: 16, color: '#a78bfa' }}>Cerrar caja</h3>
              <div className="form-group">
                <label>Observaciones (opcional)</label>
                <input
                  className="input"
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Ej: turno mañana, turno tarde, etc."
                />
              </div>
              <button className="btn btn-primary" onClick={cerrarCaja}>Cerrar caja</button>
            </div>
          )}
        </>
      )}

      {vistaActiva === 'historial' && (
        <div className="form-container">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#a78bfa', margin: 0 }}>Historial de cierres</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ color: '#aaa', fontSize: 14 }}>Filtrar por fecha:</label>
                <input
                  className="input"
                  type="date"
                  value={fechaHistorial}
                  onChange={e => { setFechaHistorial(e.target.value); cargarCierres(e.target.value) }}
                  style={{ width: 'auto' }}
                />
                {fechaHistorial && (
                  <button className="btn btn-secondary" onClick={() => { setFechaHistorial(''); cargarCierres('') }}>Ver todos</button>
                )}
              </div>
            </div>
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
                {(() => {
                  const porFecha = cierres.reduce((acc, c) => {
                    if (!acc[c.fecha]) acc[c.fecha] = []
                    acc[c.fecha].push(c)
                    return acc
                  }, {})

                  return Object.entries(porFecha).map(([fecha, turnos]) => {
                    const totalDia = turnos.reduce((acc, t) => acc + Number(t.total_general), 0)
                    return (
                      // key en Fragment corregida — antes faltaba y causaba warnings
                      <React.Fragment key={fecha}>
                        {turnos.map(c => (
                          <tr key={c.id}>
                            <td>{c.fecha}</td>
                            <td>{c.hora_apertura}hs</td>
                            <td>{c.hora_cierre}hs</td>
                            <td style={{ color: '#4ade80' }}>${Number(c.total_efectivo).toLocaleString('es-AR')}</td>
                            <td style={{ color: '#c084fc' }}>${Number(c.total_transferencia).toLocaleString('es-AR')}</td>
                            <td style={{ color: '#a78bfa', fontWeight: 700 }}>${Number(c.total_general).toLocaleString('es-AR')}</td>
                            <td style={{ color: '#666' }}>{c.observaciones || '-'}</td>
                            <td>
                              <button className="btn btn-secondary" onClick={() => verDetalle(c)}><Eye size={14} /></button>
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: '#1f1f1f' }}>
                          <td colSpan={5} style={{ color: '#888', fontSize: 13, paddingLeft: 14 }}>
                            Total del día {fecha}
                          </td>
                          <td style={{ color: '#facc15', fontWeight: 700 }}>
                            ${totalDia.toLocaleString('es-AR')}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </React.Fragment>
                    )
                  })
                })()}
                {cierres.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#555', padding: 30 }}>No hay cierres registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
