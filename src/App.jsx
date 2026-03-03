import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Scissors, Users, ClipboardList, DollarSign, BarChart2, Lock, Settings, TrendingDown, CalendarDays, Bell, X, Globe } from 'lucide-react'
import Dashboard    from './pages/Dashboard/Dashboard'
import Peluqueros   from './pages/Peluqueros/Peluqueros'
import Servicios    from './pages/Servicios/Servicios'
import Atenciones   from './pages/Atenciones/Atenciones'
import Caja         from './pages/Caja/Caja'
import Reportes     from './pages/Reportes/Reportes'
import Liquidacion  from './pages/Liquidacion/Liquidacion'
import Gastos       from './pages/Gastos/Gastos'
import Agenda       from './pages/Agenda/Agenda'
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
  const [notificaciones, setNotificaciones] = useState([])
  const [bandejaAbierta, setBandejaAbierta] = useState(false)
  const noLeidas = notificaciones.filter(n => !n.leida).length

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

    const handleMessage = (e) => {
      if (e.data?.type === 'turnoWeb:nuevo') {
        setNotificaciones(prev => [{ ...e.data.data, leida: false }, ...prev].slice(0, 50))
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
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
            <NavLink to="/agenda" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <CalendarDays size={18} /> Agenda
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

          {/* Bandeja de notificaciones */}
          <div style={{ padding: '0 12px 10px', position: 'relative' }}>
            <button
              onClick={() => {
                setBandejaAbierta(v => !v)
                if (!bandejaAbierta) setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-soft)',
                background: noLeidas > 0 ? 'rgba(167,139,250,0.08)' : 'transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={16} color={noLeidas > 0 ? '#a78bfa' : 'var(--text-muted)'} />
                <span style={{ fontSize: 13, color: noLeidas > 0 ? '#a78bfa' : 'var(--text-muted)', fontWeight: noLeidas > 0 ? 600 : 400 }}>
                  Turnos web
                </span>
              </div>
              {noLeidas > 0 && (
                <div style={{ background: '#a78bfa', color: 'white', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                  {noLeidas}
                </div>
              )}
            </button>

            {bandejaAbierta && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 12, right: 12, marginBottom: 6,
                background: 'var(--bg-card)', border: '1px solid var(--border-soft)',
                borderRadius: 12, overflow: 'hidden', boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
                zIndex: 1000, maxHeight: 360, display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>Turnos recibidos</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {notificaciones.length > 0 && (
                      <button onClick={() => setNotificaciones([])}
                        style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Limpiar
                      </button>
                    )}
                    <button onClick={() => setBandejaAbierta(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {notificaciones.length === 0 ? (
                    <div style={{ padding: '28px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      <Globe size={24} style={{ marginBottom: 8, opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                      Sin turnos nuevos
                    </div>
                  ) : (
                    notificaciones.map((n, i) => (
                      <div key={n.id || i} style={{
                        padding: '10px 14px',
                        borderBottom: i < notificaciones.length - 1 ? '1px solid var(--border-soft)' : 'none',
                        background: n.leida ? 'transparent' : 'rgba(167,139,250,0.05)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-main)', marginBottom: 2 }}>
                              {n.cliente_nombre}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {n.peluquero_nombre} · {n.fecha} {n.hora}hs
                            </div>
                          </div>
                          {!n.leida && (
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', flexShrink: 0, marginTop: 4 }} />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Badge licencia */}
          {diasRestantes !== null && (
            <div className={`licencia-badge licencia-${diasRestantes <= 5 ? 'critica' : diasRestantes <= 10 ? 'advertencia' : 'normal'}`}>
              <div className="licencia-titulo">LICENCIA ACTIVA</div>
              <div className="licencia-dias">
                {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
              </div>
              <div className="licencia-vence">Vence: {fechaVence}</div>
              {diasRestantes <= 10 && (
                <div className="licencia-alerta">⚠️ Renovar pronto</div>
              )}
            </div>
          )}

          <div className="actualizador-container">
            <Actualizador />
          </div>

          <div className="footer-container">
            <footer className="app-footer">
              <div className="version-text">
                v{version} BETA
              </div>
              <div className="footer-author">Desarrollado por<br /> <strong style={{color:'var(--text-soft)'}}> Jorge Tapia Ahumada</strong>
              </div>
            </footer>
          </div>

        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/agenda"        element={<Agenda />} />
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
