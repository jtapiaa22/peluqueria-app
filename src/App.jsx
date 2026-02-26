import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Scissors, Users, ClipboardList, DollarSign, BarChart2, Lock, Settings, TrendingDown } from 'lucide-react'
import Dashboard    from './pages/Dashboard/Dashboard'
import Peluqueros   from './pages/Peluqueros/Peluqueros'
import Servicios    from './pages/Servicios/Servicios'
import Atenciones   from './pages/Atenciones/Atenciones'
import Caja         from './pages/Caja/Caja'
import Reportes     from './pages/Reportes/Reportes'
import Liquidacion  from './pages/Liquidacion/Liquidacion'
import Gastos       from './pages/Gastos/Gastos'
import Configuracion from './pages/Configuracion/Configuracion'
import Licencia     from './pages/Licencia/Licencia'
import Actualizador from './components/Actualizador'
import './App.css'
import { useTheme } from './hooks/useTheme'

function App() {
  const { tema, toggleTema } = useTheme()
  const [licenciaValida, setLicenciaValida] = useState(null)
  const [diasRestantes, setDiasRestantes]   = useState(null)
  const [fechaVence, setFechaVence]         = useState(null)
  const [nombreApp, setNombreApp]           = useState('PeluApp')
  const [logo, setLogo]                     = useState(null)
  const [version, setVersion]               = useState(null)

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
  }, [])

  if (licenciaValida === null) return null

  if (!licenciaValida) return (
    <Licencia onActivada={() => {
      window.electronAPI.verificarLicencia().then(res => {
        setLicenciaValida(res.valida)
        if (res.valida) {
          setFechaVence(res.vence)
          setDiasRestantes(res.diasRestantes)
        }
      })
    }} />
  )

  const colorDias  = diasRestantes <= 5  ? '#fbbf24' : diasRestantes <= 10 ? '#fb923c' : '#4ade80'
  const bgDias     = diasRestantes <= 5  ? 'rgba(251, 191, 36, 0.1)'  : diasRestantes <= 10 ? 'rgba(251, 146, 60, 0.1)'  : 'rgba(74, 222, 128, 0.1)'
  const borderDias = diasRestantes <= 5  ? 'rgba(251, 191, 36, 0.35)' : diasRestantes <= 10 ? 'rgba(251, 146, 60, 0.35)' : 'rgba(74, 222, 128, 0.35)'

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
              <LayoutDashboard size={18} /> Dashboard
            </NavLink>
            <NavLink to="/peluqueros" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
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
            <NavLink to="/gastos" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <TrendingDown size={18} /> Gastos
            </NavLink>
            <NavLink to="/configuracion" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Settings size={18} /> Configuración
            </NavLink>
          </nav>

          {/* Badge licencia */}
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
              <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: 11 }}>LICENCIA ACTIVA</div>
              <div style={{ color: colorDias, fontWeight: 700, fontSize: 20, marginBottom: 2 }}>
                {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Vence: {fechaVence}</div>
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
              backgroundColor: 'var(--bg-main)',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '8px',
              fontSize: '12px',
              borderRadius: 6
            }}>
              <span>v{version}</span> BETA · Desarrollado por
              <strong style={{ color: 'var(--text-soft)' }}><br />Jorge Tapia Ahumada</strong>
            </footer>
          </div>

        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/peluqueros"    element={<Peluqueros />} />
            <Route path="/servicios"     element={<Servicios />} />
            <Route path="/atenciones"    element={<Atenciones />} />
            <Route path="/caja"          element={<Caja />} />
            <Route path="/reportes"      element={<Reportes />} />
            <Route path="/liquidacion"   element={<Liquidacion />} />
            <Route path="/gastos"        element={<Gastos />} />
            <Route path="/configuracion" element={<Configuracion
              onNombreChange={setNombreApp}
              onLogoChange={setLogo}
              tema={tema}
              onToggleTema={toggleTema}
            />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
