import { useState, useEffect, version } from 'react'
import { HashRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import { Scissors, Users, ClipboardList, DollarSign, BarChart2, Lock, Settings } from 'lucide-react'
import Peluqueros from './pages/Peluqueros/Peluqueros'
import Servicios from './pages/Servicios/Servicios'
import Atenciones from './pages/Atenciones/Atenciones'
import Caja from './pages/Caja/Caja'
import Reportes from './pages/Reportes/Reportes'
import Liquidacion from './pages/Liquidacion/Liquidacion'
import Configuracion from './pages/Configuracion/Configuracion'
import Licencia from './pages/Licencia/Licencia'
import Actualizador from './components/Actualizador'
import './App.css'

function App() {
  const [licenciaValida, setLicenciaValida] = useState(null)
  const [diasRestantes, setDiasRestantes] = useState(null)
  const [fechaVence, setFechaVence] = useState(null)
  const [nombreApp, setNombreApp] = useState('PeluApp')
  const [logo, setLogo] = useState(null)
  const [version, setVersion] = useState(null)

  useEffect(() => {
    window.electronAPI.verificarLicencia().then(res => {
      setLicenciaValida(res.valida)
      if (res.valida) {
        setFechaVence(res.vence)
        setDiasRestantes(res.diasRestantes)
      }
    })
    
    window.electronAPI.getVersion().then(v => setVersion(v))
    window.electronAPI.getNombreApp().then(nombre => setNombreApp(nombre))
    window.electronAPI.getLogo().then(logo => setLogo(logo))

    // Los listeners de progreso/descarga los maneja Actualizador.jsx
    // No duplicarlos acá
  }, [])

  if (licenciaValida === null) return null

  if (!licenciaValida) return (
    <Licencia onActivada={() => {
      window.electronAPI.verificarLicencia().then(res => {
        setLicenciaValida(res.valida)
        if(res.valida){
          setFechaVence(res.vence)
          setDiasRestantes(res.diasRestantes)
        }
      })
    }} />
  )

  const colorDias = diasRestantes <= 5 ? '#fbbf24' : diasRestantes <= 10 ? '#fb923c' : '#4ade80'
  const bgDias = diasRestantes <= 5 ? '#2d1a00' : diasRestantes <= 10 ? '#2d1500' : '#052e16'
  const borderDias = diasRestantes <= 5 ? '#92400e' : diasRestantes <= 10 ? '#9a3412' : '#166534'

  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            {logo
              ? <img src={logo} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
              : <Scissors size={28} />
            }
            <span>{nombreApp}</span>
          </div>

          <nav className="sidebar-nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Users size={18} /> Peluqueros
            </NavLink>
            <NavLink to="/servicios" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Scissors size={18} /> Servicios
            </NavLink>
            <NavLink to="/atenciones" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <ClipboardList size={18} /> Atenciones
            </NavLink>
            <NavLink to="/reportes" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <BarChart2 size={18} /> Reportes
            </NavLink>
            <NavLink to="/caja" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <DollarSign size={18} /> Caja
            </NavLink>
            <NavLink to="/liquidacion" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Lock size={18} /> Liquidación
            </NavLink>
            <NavLink to="/configuracion" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Settings size={18} /> Configuración
            </NavLink>
          </nav>

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
              <div style={{ color: '#555', fontSize: 11 }}>Vence: {fechaVence}</div>
              {diasRestantes <= 10 && (
                <div style={{ color: colorDias, fontSize: 11, marginTop: 6, fontWeight: 600 }}>
                  ⚠️ Renovar pronto
                </div>
              )}
            </div>
          )}

          <div style={{ padding: '0 10px 8px 10px' }}>
            <Actualizador />
          </div>

          <div style={{ padding: '0 10px 8px 10px' }}>
            <footer style={{
              marginTop: 'auto',
              backgroundColor: '#000000',
              color: '#95a5a6',
              textAlign: 'center',
              padding: '8px',
              fontSize: '12px'
            }}>
              <span><v>{version}</v></span> BETA · Desarrollado por
              <strong style={{ color: '#bdc3c7' }}> <br />Jorge Tapia Ahumada</strong>
            </footer>
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
            <Route path="/configuracion" element={<Configuracion onNombreChange={setNombreApp} onLogoChange={setLogo} />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
