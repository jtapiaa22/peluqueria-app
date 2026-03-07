import { useState, useEffect } from 'react'
import { Lock, CheckCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { ModalAlert, ModalConfirm } from '../../components/Modal'
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

export default function Liquidacion() {
  const [desbloqueado, setDesbloqueado] = useState(false)
  const [password, setPassword]         = useState('')
  const [peluqueros, setPeluqueros]     = useState([])
  const [atenciones, setAtenciones]     = useState([])
  const [desde, setDesde]               = useState(primerDiaMes())
  const [hasta, setHasta]               = useState(hoy())
  const [modalAlert, setModalAlert]     = useState(null)
  const [modalConfirm, setModalConfirm] = useState(null)
  const [cambiarPass, setCambiarPass]   = useState(false)
  const [passForm, setPassForm]         = useState({ actual: '', nueva: '', repetir: '' })

  // Estado para confirmar pagos
  const [panelPago, setPanelPago]       = useState(null) // peluquero_id activo
  const [formPago, setFormPago]         = useState({ fecha_pago: hoy(), notas: '' })
  const [pagosExistentes, setPagosExistentes] = useState([]) // pagos ya hechos en el período

  const { generarReporte } = usePDF()
  const alertar   = (mensaje, tipo = 'info') => setModalAlert({ mensaje, tipo })
  const confirmar = (mensaje, onConfirm)     => setModalConfirm({ mensaje, onConfirm })

  const desbloquear = async () => {
    const result = await window.electronAPI.getConfig('password_liquidacion')
    if (result && result.valor === password) {
      setDesbloqueado(true)
      setPassword('')
      cargarDatos()
    } else {
      alertar('Contraseña incorrecta.', 'error')
      setPassword('')
    }
  }

  const cargarDatos = async () => {
    const [p, a] = await Promise.all([
      window.electronAPI.getPeluqueros(),
      window.electronAPI.getAtencionesByRango({ desde, hasta })
    ])
    setPeluqueros(p)
    setAtenciones(a)
    // Recargar pagos si hay panel abierto
    if (panelPago) {
      cargarPagosExistentes(panelPago)
    }
  }

  useEffect(() => {
    if (desbloqueado) cargarDatos()
  }, [desde, hasta])

  const cargarPagosExistentes = async (peluqueroId) => {
    const pagos = await window.electronAPI.getPagosByPeluqueroYRango({
      peluquero_id: peluqueroId,
      desde,
      hasta
    })
    setPagosExistentes(pagos)
  }

  const abrirPanelPago = async (peluqueroId) => {
    if (panelPago === peluqueroId) {
      setPanelPago(null)
      setPagosExistentes([])
      return
    }
    setPanelPago(peluqueroId)
    setFormPago({ fecha_pago: hoy(), notas: '' })
    await cargarPagosExistentes(peluqueroId)
  }

  const ejecutarPago = async (peluquero) => {
    if (!formPago.fecha_pago) {
      alertar('Indicá la fecha de pago.', 'warning')
      return
    }
    const liq = getLiquidacionPeluquero(peluquero.id)
    if (liq.montoComision <= 0) {
      alertar('Este peluquero no tiene monto a pagar en el período.', 'warning')
      return
    }
    const pendiente = liq.montoComision - liq.totalPagado

    confirmar(
      `¿Confirmar pago de $${pendiente.toLocaleString('es-AR')} a ${peluquero.nombre}?`,
      async () => {
        setModalConfirm(null)
        await window.electronAPI.createPago({
          peluquero_id:     peluquero.id,
          peluquero_nombre: peluquero.nombre,
          desde,
          hasta,
          monto:            pendiente,
          fecha_pago:       formPago.fecha_pago,
          notas:            formPago.notas
        })
        alertar(`✅ Pago registrado a ${peluquero.nombre}`, 'success')
        await cargarPagosExistentes(peluquero.id)
      }
    )
  }

  const eliminarPago = (pago) => {
    confirmar(`¿Eliminar el pago de $${Number(pago.monto).toLocaleString('es-AR')} a ${pago.peluquero_nombre}?`, async () => {
      setModalConfirm(null)
      await window.electronAPI.deletePago(pago.id)
      await cargarPagosExistentes(pago.peluquero_id)
    })
  }

  const cambiarContrasena = async () => {
    if (!passForm.actual || !passForm.nueva || !passForm.repetir) {
      alertar('Completá todos los campos.', 'warning')
      return
    }
    if (passForm.nueva !== passForm.repetir) {
      alertar('La nueva contraseña no coincide.', 'error')
      return
    }
    const result = await window.electronAPI.getConfig('password_liquidacion')
    if (result && result.valor !== passForm.actual) {
      alertar('La contraseña actual es incorrecta.', 'error')
      return
    }
    await window.electronAPI.setConfig({ clave: 'password_liquidacion', valor: passForm.nueva })
    alertar('Contraseña actualizada correctamente.', 'success')
    setPassForm({ actual: '', nueva: '', repetir: '' })
    setCambiarPass(false)
  }

  const getLiquidacionPeluquero = (peluqueroId) => {
    const atencionesP   = atenciones.filter(a => a.peluquero_id == peluqueroId)
    const totalGenerado = atencionesP.reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
    const peluquero     = peluqueros.find(p => p.id == peluqueroId)
    const comision      = peluquero ? Number(peluquero.comision) : 0
    const montoComision = (totalGenerado * comision) / 100
    const totalPagado   = pagosExistentes
      .filter(pg => pg.peluquero_id == peluqueroId)
      .reduce((acc, pg) => acc + Number(pg.monto), 0)
    return { totalGenerado, comision, montoComision, cantidad: atencionesP.length, totalPagado }
  }

  const peluquerosConDatos = peluqueros.map(p => ({
    ...p,
    ...getLiquidacionPeluquero(p.id)
  }))

  const totalGeneralPeriodo = peluquerosConDatos.reduce((acc, p) => acc + p.totalGenerado, 0)
  const totalComisiones     = peluquerosConDatos.reduce((acc, p) => acc + p.montoComision, 0)

  const exportarPDF = async () => {
    await generarReporte({
      titulo: 'Liquidación de comisiones',
      subtitulo: `Período: ${desde} al ${hasta}`,
      columnas: ['Peluquero', 'Atenciones', 'Total generado', 'Comisión %', 'A pagar'],
      filas: peluquerosConDatos.map(p => [
        p.nombre,
        String(p.cantidad),
        `$${p.totalGenerado.toLocaleString('es-AR')}`,
        `${p.comision}%`,
        `$${p.montoComision.toLocaleString('es-AR')}`
      ]),
      totales: [
        { label: 'Total generado en el período', valor: `$${totalGeneralPeriodo.toLocaleString('es-AR')}`, color: [74, 222, 128] },
        { label: 'Total a pagar en comisiones',  valor: `$${totalComisiones.toLocaleString('es-AR')}`,    color: [248, 113, 113] },
      ],
      nombreArchivo: `liquidacion_${desde}_${hasta}.pdf`
    })
  }

  // ── Pantalla de login ──
  if (!desbloqueado) {
    return (
      <div>
        {modalAlert && <ModalAlert mensaje={modalAlert.mensaje} tipo={modalAlert.tipo} onClose={() => setModalAlert(null)} />}
        <h1 className="page-title">Liquidación</h1>
        <div style={{ maxWidth: 380, margin: '60px auto' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <Lock size={40} style={{ color: '#a78bfa', marginBottom: 16 }} />
            <h3 style={{ color: 'var(--text-main)', marginBottom: 8 }}>Sección privada</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
              Ingresá la contraseña para acceder a las liquidaciones.
            </p>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label>Contraseña</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && desbloquear()}
                placeholder="••••••••"
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={desbloquear}>
              Ingresar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Vista desbloqueada ──
  return (
    <div className="page-animation">
      {modalAlert  && <ModalAlert   mensaje={modalAlert.mensaje}   tipo={modalAlert.tipo}   onClose={() => setModalAlert(null)} />}
      {modalConfirm && <ModalConfirm mensaje={modalConfirm.mensaje} onConfirm={modalConfirm.onConfirm} onCancel={() => setModalConfirm(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Liquidación</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={exportarPDF}>Exportar PDF</button>
          <button className="btn btn-secondary" onClick={() => setCambiarPass(!cambiarPass)}>Cambiar contraseña</button>
          <button className="btn btn-secondary" onClick={() => setDesbloqueado(false)}>
            <Lock size={14} style={{ marginRight: 6 }} />Bloquear
          </button>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <AnimatePresence>
        {cambiarPass && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="card"
          >
            <div style={{ maxWidth: 400, marginBottom: 8 }}>
              <h3 style={{ color: '#a78bfa', marginBottom: 16 }}>Cambiar contraseña</h3>
              <div className="form-group">
                <label>Contraseña actual</label>
                <input className="input" type="password" value={passForm.actual} onChange={e => setPassForm({ ...passForm, actual: e.target.value })} placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label>Nueva contraseña</label>
                <input className="input" type="password" value={passForm.nueva} onChange={e => setPassForm({ ...passForm, nueva: e.target.value })} placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label>Repetir nueva contraseña</label>
                <input className="input" type="password" value={passForm.repetir} onChange={e => setPassForm({ ...passForm, repetir: e.target.value })} placeholder="••••••••" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={cambiarContrasena}>Guardar</button>
                <button className="btn btn-secondary" onClick={() => setCambiarPass(false)}>Cancelar</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtro de período */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <label style={{ color: 'var(--text-muted)', fontSize: 14 }}>Período:</label>
        <input className="input" type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 'auto' }} />
        <label style={{ color: 'var(--text-muted)', fontSize: 14 }}>hasta</label>
        <input className="input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 'auto' }} />
        <button className="btn btn-primary" onClick={cargarDatos}>Buscar</button>
      </div>

      {/* Resumen general */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Total generado en el período</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#4ade80' }}>${totalGeneralPeriodo.toLocaleString('es-AR')}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Total a pagar en comisiones</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#f87171' }}>${totalComisiones.toLocaleString('es-AR')}</div>
        </div>
      </div>

      {/* Liquidación por peluquero */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {peluquerosConDatos.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
            No hay peluqueros registrados
          </div>
        ) : (
          peluquerosConDatos.map(p => {
            const panelAbierto = panelPago === p.id
            const pendiente    = p.montoComision - p.totalPagado
            const pagadoEste   = pagosExistentes.filter(pg => pg.peluquero_id == p.id)
            const totalPagadoPeriodo = pagadoEste.reduce((acc, pg) => acc + Number(pg.monto), 0)

            return (
              <div key={p.id} className="card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>

                {/* Cabecera peluquero */}
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ color: 'var(--text-main)', margin: 0 }}>{p.nombre}</h3>
                    <span style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                      {p.comision}% de comisión
                    </span>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Atenciones</div>
                      <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 20 }}>{p.cantidad}</div>
                    </div>
                    <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Total generado</div>
                      <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 18 }}>${p.totalGenerado.toLocaleString('es-AR')}</div>
                    </div>
                    <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Le corresponde ({p.comision}%)</div>
                      <div style={{ color: '#f87171', fontWeight: 700, fontSize: 18 }}>${p.montoComision.toLocaleString('es-AR')}</div>
                    </div>
                    <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Queda para el local</div>
                      <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: 18 }}>${(p.totalGenerado - p.montoComision).toLocaleString('es-AR')}</div>
                    </div>
                  </div>

                  {/* Botón confirmar pago */}
                  {p.cantidad > 0 && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => abrirPanelPago(p.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
                    >
                      <CheckCircle size={15} color="#4ade80" />
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
                      <div style={{ padding: '20px 24px', background: 'rgba(74, 222, 128, 0.03)' }}>

                        {/* Formulario de pago */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>Período cubierto</label>
                            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--text-soft)' }}>
                              {formatFecha(desde)} → {formatFecha(hasta)}
                            </div>
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>Monto pendiente</label>
                            <div style={{ background: 'var(--bg-main)', border: '1px solid rgba(248, 113, 113, 0.4)', borderRadius: 10, padding: '10px 14px', fontSize: 15, fontWeight: 700, color: '#f87171' }}>
                              ${Math.max(0, pendiente).toLocaleString('es-AR')}
                            </div>
                          </div>
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
                            disabled={pendiente <= 0}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            <CheckCircle size={15} style={{ marginRight: 6 }} />
                            {pendiente <= 0 ? 'Ya pagado' : 'Confirmar pago'}
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

                        {/* Historial de pagos en el período */}
                        {pagadoEste.length > 0 && (
                          <div>
                            <div style={{ fontSize: 13, color: '#a78bfa', fontWeight: 600, marginBottom: 10 }}>
                              Pagos realizados en este período
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
                                {pagadoEste.map(pg => (
                                  <tr key={pg.id}>
                                    <td style={{ color: 'var(--text-muted)' }}>{formatFecha(pg.fecha_pago)}</td>
                                    <td style={{ color: 'var(--text-soft)', fontSize: 12 }}>{formatFecha(pg.desde)} → {formatFecha(pg.hasta)}</td>
                                    <td style={{ color: '#4ade80', fontWeight: 700 }}>${Number(pg.monto).toLocaleString('es-AR')}</td>
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
                            <div style={{ textAlign: 'right', marginTop: 8, fontSize: 13, color: '#4ade80', fontWeight: 700 }}>
                              Total pagado en este período: ${totalPagadoPeriodo.toLocaleString('es-AR')}
                            </div>
                          </div>
                        )}

                        {pagadoEste.length === 0 && (
                          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>
                            No hay pagos registrados en este período todavía.
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
    </div>
  )
}
