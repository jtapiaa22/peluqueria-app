import { useState, useEffect } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { ModalAlert } from '../../components/Modal'

export default function Liquidacion() {
  const [desbloqueado, setDesbloqueado] = useState(false)
  const [password, setPassword] = useState('')
  const [peluqueros, setPeluqueros] = useState([])
  const [atenciones, setAtenciones] = useState([])
  const [desde, setDesde] = useState(primerDiaMes())
  const [hasta, setHasta] = useState(hoy())
  const [modalAlert, setModalAlert] = useState(null)
  const [cambiarPass, setCambiarPass] = useState(false)
  const [passForm, setPassForm] = useState({ actual: '', nueva: '', repetir: '' })

  function hoy() {
    return new Date().toISOString().split('T')[0]
  }

  function primerDiaMes() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  }

  const alertar = (mensaje, tipo = 'info') => setModalAlert({ mensaje, tipo })

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
    const p = await window.electronAPI.getPeluqueros()
    setPeluqueros(p)
    const a = await window.electronAPI.getAtencionesByRango({ desde, hasta })
    setAtenciones(a)
  }

  useEffect(() => {
    if (desbloqueado) cargarDatos()
  }, [desde, hasta])

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

  const getLiquidacionPeluquero = (peluqueroId, nombrePeluquero) => {
    const atencionesP = atenciones.filter(a => a.peluquero_id == peluqueroId)
    const totalGenerado = atencionesP.reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
    const peluquero = peluqueros.find(p => p.id == peluqueroId)
    const comision = peluquero ? Number(peluquero.comision) : 0
    const montoComision = (totalGenerado * comision) / 100
    return { totalGenerado, comision, montoComision, cantidad: atencionesP.length }
  }

  const peluquerosConDatos = peluqueros.map(p => ({
    ...p,
    ...getLiquidacionPeluquero(p.id, p.nombre)
  }))

  const totalGeneralPeriodo = peluquerosConDatos.reduce((acc, p) => acc + p.totalGenerado, 0)
  const totalComisiones = peluquerosConDatos.reduce((acc, p) => acc + p.montoComision, 0)

  if (!desbloqueado) {
    return (
      <div>
        {modalAlert && (
          <ModalAlert mensaje={modalAlert.mensaje} tipo={modalAlert.tipo} onClose={() => setModalAlert(null)} />
        )}
        <h1 className="page-title">Liquidación</h1>
        <div style={{ maxWidth: 380, margin: '60px auto' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <Lock size={40} style={{ color: '#a78bfa', marginBottom: 16 }} />
            <h3 style={{ color: '#f0f0f0', marginBottom: 8 }}>Sección privada</h3>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 24 }}>Ingresá la contraseña para acceder a las liquidaciones.</p>
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

  return (
    <div className='page-animation'>
      {modalAlert && (
        <ModalAlert mensaje={modalAlert.mensaje} tipo={modalAlert.tipo} onClose={() => setModalAlert(null)} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Liquidación</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setCambiarPass(!cambiarPass)}>
            Cambiar contraseña
          </button>
          <button className="btn btn-secondary" onClick={() => setDesbloqueado(false)}>
            <Lock size={14} style={{ marginRight: 6 }} />Bloquear
          </button>
        </div>
      </div>

      {cambiarPass && (
        <div className="card" style={{ maxWidth: 400, marginBottom: 24 }}>
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
      )}

      {/* Filtro de período */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <label style={{ color: '#aaa', fontSize: 14 }}>Período:</label>
        <input className="input" type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 'auto' }} />
        <label style={{ color: '#aaa', fontSize: 14 }}>hasta</label>
        <input className="input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 'auto' }} />
        <button className="btn btn-primary" onClick={cargarDatos}>Buscar</button>
      </div>

      {/* Resumen general */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Total generado en el período</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#4ade80' }}>${totalGeneralPeriodo.toLocaleString('es-AR')}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Total a pagar en comisiones</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#f87171' }}>${totalComisiones.toLocaleString('es-AR')}</div>
        </div>
      </div>

      {/* Liquidación por peluquero */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {peluquerosConDatos.map(p => (
          <div key={p.id} className="card" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#f0f0f0', margin: 0 }}>{p.nombre}</h3>
              <span style={{ background: '#2d1f5e', color: '#a78bfa', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                {p.comision}% de comisión
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <div style={{ background: '#0f0f0f', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Atenciones</div>
                <div style={{ color: '#f0f0f0', fontWeight: 700, fontSize: 20 }}>{p.cantidad}</div>
              </div>
              <div style={{ background: '#0f0f0f', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Total generado</div>
                <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 18 }}>${p.totalGenerado.toLocaleString('es-AR')}</div>
              </div>
              <div style={{ background: '#0f0f0f', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Le corresponde ({p.comision}%)</div>
                <div style={{ color: '#f87171', fontWeight: 700, fontSize: 18 }}>${p.montoComision.toLocaleString('es-AR')}</div>
              </div>
              <div style={{ background: '#0f0f0f', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Queda para el local</div>
                <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: 18 }}>${(p.totalGenerado - p.montoComision).toLocaleString('es-AR')}</div>
              </div>
            </div>
          </div>
        ))}
        {peluquerosConDatos.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: '#555', padding: 40 }}>
            No hay peluqueros registrados
          </div>
        )}
      </div>
    </div>
  )
}