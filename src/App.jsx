import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import { Scissors, Users, ClipboardList, DollarSign, BarChart2, Lock } from 'lucide-react'
import Peluqueros from './pages/Peluqueros/Peluqueros'
import Servicios from './pages/Servicios/Servicios'
import Atenciones from './pages/Atenciones/Atenciones'
import Caja from './pages/Caja/Caja'
import Reportes from './pages/Reportes/Reportes'
import Liquidacion from './pages/Liquidacion/Liquidacion'
import Licencia from './pages/Licencia/Licencia'
import './App.css'
import Actualizador from './components/Actualizador'

function App() {
  const [licenciaValida, setLicenciaValida] = useState(null)
  const [diasRestantes, setDiasRestantes] = useState(null)
  const [fechaVence, setFechaVence] = useState(null)

  useEffect(() => {
    window.electronAPI.verificarLicencia().then(res => {
      setLicenciaValida(res.valida)
      if (res.valida && res.vence) {
        setFechaVence(res.vence)
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        const vence = new Date(res.vence)
        vence.setHours(0, 0, 0, 0)
        const diff = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24))
        setDiasRestantes(diff)
      }
    })
  }, [])

  if (licenciaValida === null) return null

  if (!licenciaValida) return <Licencia onActivada={() => {
    window.electronAPI.verificarLicencia().then(res => {
      setLicenciaValida(res.valida)
      if (res.valida && res.vence) {
        setFechaVence(res.vence)
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        const vence = new Date(res.vence)
        vence.setHours(0, 0, 0, 0)
        const diff = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24))
        setDiasRestantes(diff)
      }
    })
  }} />

  const colorDias = diasRestantes <= 5 ? '#fbbf24' : diasRestantes <= 10 ? '#fb923c' : '#4ade80'
  const bgDias = diasRestantes <= 5 ? '#2d1a00' : diasRestantes <= 10 ? '#2d1500' : '#052e16'
  const borderDias = diasRestantes <= 5 ? '#92400e' : diasRestantes <= 10 ? '#9a3412' : '#166534'

  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <Scissors size={28} />
            <span>PeluApp</span>
          </div>
          <nav className="sidebar-nav">
            <NavLink to="/" end className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <Users size={18} /> Peluqueros
            </NavLink>
            <NavLink to="/servicios" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <Scissors size={18} /> Servicios
            </NavLink>
            <NavLink to="/atenciones" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <ClipboardList size={18} /> Atenciones
            </NavLink>
            <NavLink to="/caja" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <DollarSign size={18} /> Caja
            </NavLink>
            <NavLink to="/reportes" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <BarChart2 size={18} /> Reportes
            </NavLink>
            <NavLink to="/liquidacion" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <Lock size={18} /> Liquidación
            </NavLink>
          </nav>

          {/* Indicador de licencia */}
          {diasRestantes !== null && (
            <div style={{
              margin: 'auto 10px 16px 10px',
              padding: '12px 14px',
              borderRadius: 8,
              background: bgDias,
              border: `1px solid ${borderDias}`,
              fontSize: 12,
              lineHeight: 1.6
            }}>
              <div style={{ color: '#888', marginBottom: 4, fontSize: 11 }}>LICENCIA ACTIVA</div>
              <div style={{ color: colorDias, fontWeight: 700, fontSize: 20, marginBottom: 2 }}>
                {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
              </div>
              <div style={{ color: '#555', fontSize: 11 }}>
                Vence: {fechaVence}
              </div>
              {diasRestantes <= 10 && (
                <div style={{ color: colorDias, fontSize: 11, marginTop: 6, fontWeight: 600 }}>
                  ⚠️ Renovar pronto
                </div>
              )}
            </div>
          )}
          <div style={{ padding: '0 10px 16px 10px' }}>

            <Actualizador />

          </div>
        </aside>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Peluqueros />} />
            <Route path="/servicios" element={<Servicios />} />
            <Route path="/atenciones" element={<Atenciones />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/liquidacion" element={<Liquidacion />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App