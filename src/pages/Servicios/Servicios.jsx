import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { ModalConfirm, ModalAlert } from '../../components/Modal'
import { motion, AnimatePresence } from 'framer-motion'

export default function Servicios() {
  const [servicios, setServicios]       = useState([])
  const [form, setForm]                 = useState({ nombre: '', precio: '' })
  const [editando, setEditando]         = useState(null)
  const [mostrarForm, setMostrarForm]   = useState(false)
  const [modalConfirm, setModalConfirm] = useState(null)
  const [modalAlert, setModalAlert]     = useState(null)

  const confirmar = (mensaje, onConfirm) => setModalConfirm({ mensaje, onConfirm })
  const alertar   = (mensaje, tipo = 'info') => setModalAlert({ mensaje, tipo })

  const cargar = async () => {
    const data = await window.electronAPI.getServicios()
    setServicios(data)
  }

  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!form.nombre.trim() || !form.precio) {
      alertar('Por favor completá el nombre y el precio del servicio.', 'warning')
      return
    }
    if (editando) {
      await window.electronAPI.updateServicio({ ...form, id: editando })
    } else {
      await window.electronAPI.createServicio(form)
    }
    setForm({ nombre: '', precio: '' })
    setEditando(null)
    setMostrarForm(false)
    cargar()
  }

  const editar = (s) => {
    setForm({ nombre: s.nombre, precio: s.precio })
    setEditando(s.id)
    setMostrarForm(true)
  }

  const eliminar = (id) => {
    confirmar('¿Eliminar este servicio?', async () => {
      setModalConfirm(null)
      await window.electronAPI.deleteServicio(id)
      cargar()
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
            <h3 style={{ marginBottom: 16, color: '#a78bfa' }}>
              {editando ? 'Editar servicio' : 'Nuevo servicio'}
            </h3>
            <div className="form-group">
              <label>Nombre del servicio</label>
              <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Corte de cabello" />
            </div>
            <div className="form-group">
              <label>Precio ($)</label>
              <input className="input" type="number" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} placeholder="Ej: 2000" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button className="btn btn-primary" onClick={guardar}>Guardar</button>
              <button className="btn btn-secondary" onClick={() => setMostrarForm(false)}>Cancelar</button>
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
            {servicios.map(s => (
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
            {servicios.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>
                  No hay servicios registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
