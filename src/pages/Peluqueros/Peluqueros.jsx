import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { ModalConfirm, ModalAlert } from '../../components/Modal'

export default function Peluqueros() {
  const [peluqueros, setPeluqueros] = useState([])
  const [form, setForm] = useState({ nombre: '', comision: '' })
  const [editando, setEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [modalConfirm, setModalConfirm] = useState(null)
  const [modalAlert, setModalAlert] = useState(null)

  const confirmar = (mensaje, onConfirm) => setModalConfirm({ mensaje, onConfirm })
  const alertar = (mensaje, tipo = 'info') => setModalAlert({ mensaje, tipo })

  const cargar = async () => {
    const data = await window.electronAPI.getPeluqueros()
    setPeluqueros(data)
  }

  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!form.nombre.trim()) {
      alertar('Por favor ingresá el nombre del peluquero.', 'warning')
      return
    }
    if (editando) {
      await window.electronAPI.updatePeluquero({ ...form, id: editando })
    } else {
      await window.electronAPI.createPeluquero(form)
    }
    setForm({ nombre: '', comision: '' })
    setEditando(null)
    setMostrarForm(false)
    cargar()
  }

  const editar = (p) => {
    setForm({ nombre: p.nombre, comision: p.comision })
    setEditando(p.id)
    setMostrarForm(true)
  }

  const eliminar = (id) => {
    confirmar('¿Dar de baja este peluquero?', async () => {
      setModalConfirm(null)
      await window.electronAPI.deletePeluquero(id)
      cargar()
    })
  }

  return (
    <div>
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
        <h1 className="page-title" style={{ margin: 0 }}>Peluqueros</h1>
        <button className="btn btn-primary" onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm({ nombre: '', comision: '' }) }}>
          <Plus size={16} style={{ marginRight: 6 }} />Agregar
        </button>
      </div>

      {mostrarForm && (
        <div className="card">
          <h3 style={{ marginBottom: 16, color: '#a78bfa' }}>{editando ? 'Editar peluquero' : 'Nuevo peluquero'}</h3>
          <div className="form-group">
            <label>Nombre</label>
            <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre completo" />
          </div>
          <div className="form-group">
            <label>Comisión (%)</label>
            <input className="input" type="number" value={form.comision} onChange={e => setForm({ ...form, comision: e.target.value })} placeholder="Ej: 50" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={guardar}>Guardar</button>
            <button className="btn btn-secondary" onClick={() => setMostrarForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Comisión</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {peluqueros.map(p => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td>{p.comision}%</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => editar(p)}><Pencil size={14} /></button>
                    <button className="btn btn-danger" onClick={() => eliminar(p.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {peluqueros.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: 'center', color: '#555', padding: 30 }}>No hay peluqueros registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
