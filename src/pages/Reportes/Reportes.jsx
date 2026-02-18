import { useState, useEffect } from 'react'

// Movidas fuera del componente para evitar problemas de hoisting
function hoy() {
  return new Date().toISOString().split('T')[0]
}

function primerDiaMes() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function Reportes() {
  const [atenciones, setAtenciones] = useState([])
  const [desde, setDesde] = useState(primerDiaMes())
  const [hasta, setHasta] = useState(hoy())

  const cargar = async () => {
    const data = await window.electronAPI.getAtencionesByRango({ desde, hasta })
    setAtenciones(data)
  }

  useEffect(() => { cargar() }, [])

  const totalGeneral = atenciones.reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
  const totalEfectivo = atenciones.filter(a => a.metodo_pago === 'efectivo').reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
  const totalTransferencia = atenciones.filter(a => a.metodo_pago === 'transferencia').reduce((acc, a) => acc + Number(a.precio_cobrado), 0)

  const resumenPorPeluquero = atenciones.reduce((acc, a) => {
    if (!acc[a.peluquero_nombre]) acc[a.peluquero_nombre] = { total: 0, atenciones: 0 }
    acc[a.peluquero_nombre].total += Number(a.precio_cobrado)
    acc[a.peluquero_nombre].atenciones += 1
    return acc
  }, {})

  const resumenPorServicio = atenciones.reduce((acc, a) => {
    if (!acc[a.servicio_nombre]) acc[a.servicio_nombre] = { total: 0, cantidad: 0 }
    acc[a.servicio_nombre].total += Number(a.precio_cobrado)
    acc[a.servicio_nombre].cantidad += 1
    return acc
  }, {})

  const sinDatos = atenciones.length === 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Reportes</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: '#aaa', fontSize: 14 }}>Desde:</label>
          <input className="input" type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 'auto' }} />
          <label style={{ color: '#aaa', fontSize: 14 }}>Hasta:</label>
          <input className="input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 'auto' }} />
          <button className="btn btn-primary" onClick={cargar}>Buscar</button>
        </div>
      </div>

      {sinDatos && (
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '16px 20px', marginBottom: 24, color: '#555', fontSize: 14, textAlign: 'center' }}>
          No hay atenciones registradas en el rango seleccionado.
        </div>
      )}

      {/* Tarjetas resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Total efectivo</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#4ade80' }}>${totalEfectivo.toLocaleString('es-AR')}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Total transferencias</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#c084fc' }}>${totalTransferencia.toLocaleString('es-AR')}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', margin: 0, border: '1px solid #4c1d95' }}>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Total general</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#a78bfa' }}>${totalGeneral.toLocaleString('es-AR')}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>{atenciones.length} atenciones</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Por peluquero */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginBottom: 16, color: '#a78bfa' }}>Por peluquero</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Peluquero</th>
                <th>Cantidad</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(resumenPorPeluquero)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([nombre, data]) => (
                  <tr key={nombre}>
                    <td>{nombre}</td>
                    <td>{data.atenciones}</td>
                    <td style={{ color: '#4ade80', fontWeight: 600 }}>${data.total.toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              {Object.keys(resumenPorPeluquero).length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#555', padding: 20 }}>Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Por servicio */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginBottom: 16, color: '#a78bfa' }}>Por servicio</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Cantidad</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(resumenPorServicio)
                .sort((a, b) => b[1].cantidad - a[1].cantidad)
                .map(([nombre, data]) => (
                  <tr key={nombre}>
                    <td>{nombre}</td>
                    <td>{data.cantidad}</td>
                    <td style={{ color: '#4ade80', fontWeight: 600 }}>${data.total.toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              {Object.keys(resumenPorServicio).length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#555', padding: 20 }}>Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
