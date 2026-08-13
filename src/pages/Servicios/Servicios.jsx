import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Scissors } from 'lucide-react'
import { ModalConfirm, ModalAlert } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import EmptyState from '../../components/EmptyState'
import Skeleton from '../../components/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'

const fmtMiles = (val) => {
  if (val === '' || val == null) return ''
  const n = Number(String(val).replace(/\./g, ''))
  return isNaN(n) ? '' : n.toLocaleString('es-AR')
}
const parseMiles = (val) => String(val).replace(/\./g, '').replace(/[^0-9]/g, '')

export default function Servicios() {
  const [servicios, setServicios]       = useState([])
  const [form, setForm]                 = useState({ nombre: '', precio: '' })
  const [editando, setEditando]         = useState(null)
  const [mostrarForm, setMostrarForm]   = useState(false)
  const [modalConfirm, setModalConfirm] = useState(null)
  const [modalAlert, setModalAlert]     = useState(null)
  const [sincState, setSincState] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const confirmar = (mensaje, onConfirm) => setModalConfirm({ mensaje, onConfirm })
  const toast = useToast()
  const alertar   = (mensaje, tipo = 'info') => {
    if (tipo === 'error' || tipo === 'warning') setModalAlert({ mensaje, tipo })
    else toast(mensaje, tipo)
  }

  const cargar = async () => {
    const data = await window.electronAPI.getServicios()
    setServicios(data)
  }

  useEffect(() => {
    setCargando(true)
    cargar().finally(() => setCargando(false))
  }, [])

  const guardar = async () => {
    if (guardando) return
    if (!form.nombre.trim() || !form.precio) {
      alertar('Por favor completá el nombre y el precio del servicio.', 'warning')
      return
    }
    setGuardando(true)
    setSincState('syncing')
    try {
      if (editando) {
        await window.electronAPI.updateServicio({ ...form, id: editando })
      } else {
        await window.electronAPI.createServicio(form)
      }
      setForm({ nombre: '', precio: '' })
      setEditando(null)
      setMostrarForm(false)
      cargar()
      setSincState('ok')
      setTimeout(() => setSincState(null), 3000)
    } finally {
      setGuardando(false)
    }
  }


  const editar = (s) => {
    setForm({ nombre: s.nombre, precio: s.precio })
    setEditando(s.id)
    setMostrarForm(true)
  }

  const eliminar = (id) => {
    confirmar('¿Eliminar este servicio?', async () => {
      setModalConfirm(null)
      setSincState('syncing')
      await window.electronAPI.deleteServicio(id)
      cargar()
      setSincState('ok')
      setTimeout(() => setSincState(null), 3000)
    })
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Servicios</h1>
        {sincState && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: sincState === 'ok' ? 'var(--success)' : sincState === 'error' ? 'var(--danger)' : 'var(--accent-bright)',
            marginBottom: 16
          }}>
            <RefreshCw size={13} style={{ animation: sincState === 'syncing' ? 'spin 1s linear infinite' : 'none' }} />
            {sincState === 'syncing' ? 'Sincronizando con la web...' : sincState === 'ok' ? 'Sincronizado' : 'Error al sincronizar'}
          </div>
        )}
        <button className="btn btn-primary" onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm({ nombre: '', precio: '' }) }}>
          <Plus size={16} style={{ marginRight: 6 }} />Agregar
        </button>
      </div>

      <AnimatePresence>
        {mostrarForm && (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 style={{ marginBottom: 16, color: 'var(--accent-bright)' }}>
              {editando ? 'Editar servicio' : 'Nuevo servicio'}
            </h3>
            <div className="form-group">
              <label>Nombre del servicio</label>
              <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Corte o Corte + Barba..." />
            </div>
            <div className="form-group">
              <label>Precio ($)</label>
              <input className="input" type="text" inputMode="numeric" value={fmtMiles(form.precio)} onChange={e => setForm({ ...form, precio: parseMiles(e.target.value) })} placeholder="Ej: 2.000" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button className="btn btn-primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
              <button className="btn btn-secondary" onClick={() => setMostrarForm(false)} disabled={guardando}>Cancelar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Precio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando && Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`}>
                <td><Skeleton width="60%" height={14} /></td>
                <td><Skeleton width={70} height={14} /></td>
                <td><Skeleton width={80} height={28} radius={8} /></td>
              </tr>
            ))}
            {!cargando && servicios.map(s => (
              <tr key={s.id}>
                <td>{s.nombre}</td>
                <td>${Number(s.precio).toLocaleString('es-AR')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => editar(s)}><Pencil size={14} /></button>
                    <button className="btn btn-danger" onClick={() => eliminar(s.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!cargando && servicios.length === 0 && (
              <tr>
                <td colSpan={3}>
                  <EmptyState icono={<Scissors size={28} />} titulo="No hay servicios registrados" texto="Creá el primero con el botón de arriba." padding="28px" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
