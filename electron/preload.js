const { contextBridge, ipcRenderer } = require('electron')

// postMessage es el método garantizado para cruzar contextIsolation
ipcRenderer.on('turnoWeb:nuevo', (_, data) => {
  window.postMessage({ type: 'turnoWeb:nuevo', data }, '*')
})

contextBridge.exposeInMainWorld('electronAPI', {
  // Peluqueros
  getPeluqueros:        ()      => ipcRenderer.invoke('peluqueros:getAll'),
  createPeluquero:      (data)  => ipcRenderer.invoke('peluqueros:create', data),
  updatePeluquero:      (data)  => ipcRenderer.invoke('peluqueros:update', data),
  deletePeluquero:      (id)    => ipcRenderer.invoke('peluqueros:delete', id),

  // Servicios
  getServicios:         ()      => ipcRenderer.invoke('servicios:getAll'),
  createServicio:       (data)  => ipcRenderer.invoke('servicios:create', data),
  updateServicio:       (data)  => ipcRenderer.invoke('servicios:update', data),
  deleteServicio:       (id)    => ipcRenderer.invoke('servicios:delete', id),

  // Atenciones
  createAtencion:       (data)  => ipcRenderer.invoke('atenciones:create', data),
  getAtencionesByFecha: (fecha) => ipcRenderer.invoke('atenciones:getByFecha', fecha),
  getAtencionesByRango: (rango) => ipcRenderer.invoke('atenciones:getByRango', rango),
  deleteAtencion:       (id)    => ipcRenderer.invoke('atenciones:delete', id),
  updateAtencion:       (data)  => ipcRenderer.invoke('atenciones:update', data),

  // Configuración
  getConfig:            (clave) => ipcRenderer.invoke('config:get', clave),
  setConfig:            (data)  => ipcRenderer.invoke('config:set', data),
  getNombreApp:         ()      => ipcRenderer.invoke('config:getNombreApp'),
  setNombreApp:         (n)     => ipcRenderer.invoke('config:setNombreApp', n),
  getLogo:              ()      => ipcRenderer.invoke('config:getLogo'),
  setLogo:              (ruta)  => ipcRenderer.invoke('config:setLogo', ruta),

  // Caja
  abrirCaja:            (data)  => ipcRenderer.invoke('caja:abrir', data),
  getCajaAbierta:       ()      => ipcRenderer.invoke('caja:getCajaAbierta'),
  cerrarCaja:           (data)  => ipcRenderer.invoke('caja:cerrar', data),
  getCierres:           (fecha) => ipcRenderer.invoke('caja:getCierres', fecha),
  getDetalleCierre:     (data)  => ipcRenderer.invoke('caja:getDetalleCierre', data),

  // Backup
  abrirCarpetaBackup:   ()      => ipcRenderer.invoke('backup:abrirCarpeta'),
  listarBackups:        ()      => ipcRenderer.invoke('backup:listar'),

  // Gastos
  getGastosByRango:           (rango) => ipcRenderer.invoke('gastos:getByRango', rango),
  getResumenMensualGastos:    ()      => ipcRenderer.invoke('gastos:getResumenMensual'),
  createGasto:                (data)  => ipcRenderer.invoke('gastos:create', data),
  updateGasto:                (data)  => ipcRenderer.invoke('gastos:update', data),
  deleteGasto:                (id)    => ipcRenderer.invoke('gastos:delete', id),

  // Pagos a peluqueros
  createPago:                 (data)  => ipcRenderer.invoke('pagos:create', data),
  getPagosByMes:              (mes)   => ipcRenderer.invoke('pagos:getByMes', mes),
  getPagosByPeluqueroYRango:  (data)  => ipcRenderer.invoke('pagos:getByPeluqueroYRango', data),
  deletePago:                 (id)    => ipcRenderer.invoke('pagos:delete', id),

  // Turnos manuales (Agenda local)
  createTurno:          (data)         => ipcRenderer.invoke('turnos:create', data),
  getTurnosByFecha:     (fecha)        => ipcRenderer.invoke('turnos:getByFecha', fecha),
  getTurnosByRango:     (rango)        => ipcRenderer.invoke('turnos:getByRango', rango),
  updateTurnoEstado:    (data)         => ipcRenderer.invoke('turnos:updateEstado', data),
  deleteTurno:          (id)           => ipcRenderer.invoke('turnos:delete', id),

  // Peluquería web (Supabase)
  getPeluqueriaConfig:  ()             => ipcRenderer.invoke('peluqueria:getConfig'),
  registrarPeluqueria:  (data)         => ipcRenderer.invoke('peluqueria:registrar', data),
  vincularPeluqueria:   (data)         => ipcRenderer.invoke('peluqueria:vincular', data),

  // Turnos web (reservas online)
  getTurnosWebPendientes: ()           => ipcRenderer.invoke('turnosWeb:getPendientes'),
  getTurnosWebTodos:      (mes)        => ipcRenderer.invoke('turnosWeb:getTodos', mes),
  responderTurnoWeb:      (data)       => ipcRenderer.invoke('turnosWeb:responder', data),

  // Dashboard
  getDashboard:         ()      => ipcRenderer.invoke('dashboard:getResumen'),

  // Licencia
  verificarLicencia:    ()      => ipcRenderer.invoke('licencia:verificar'),
  cargarLicencia:       (ruta)  => ipcRenderer.invoke('licencia:cargar', ruta),
  getMachineId: () => ipcRenderer.invoke('licencia:getMachineId'),

  // Actualizador
  checkUpdate:          ()      => ipcRenderer.invoke('updater:check'),
  downloadUpdate:       ()      => ipcRenderer.invoke('updater:download'),
  onDownloadProgress:   (cb)    => ipcRenderer.on('updater:download-progress', (_, data) => cb(data)),
  onDownloadComplete:   (cb)    => ipcRenderer.on('updater:download-complete', () => cb()),

  // App
  getVersion:           ()      => ipcRenderer.invoke('app:getVersion'),
  guardarPDF:           (data)  => ipcRenderer.invoke('pdf:guardar', data),

  // Turnos webs
  sincronizarPeluqueria: () => ipcRenderer.invoke('peluqueria:sincronizar'),
  actualizarNombreWeb: (nombre) => ipcRenderer.invoke('peluqueria:actualizarNombre', { nombre }),
  sincronizarCanceladosWeb: () => ipcRenderer.invoke('turnosWeb:sincronizarCancelados'),
  sincronizarConfirmadosWeb: () => ipcRenderer.invoke('turnosWeb:sincronizarConfirmados'),

  //horarios para turnos
  actualizarHorario: (horario) => ipcRenderer.invoke('actualizar-horario', horario),

  // Días bloqueados
  getDiasBloqueados: ()      => ipcRenderer.invoke('diasBloqueados:getAll'),
  bloquearDia:       (data)  => ipcRenderer.invoke('diasBloqueados:create', data),
  desbloquearDia:    (fecha) => ipcRenderer.invoke('diasBloqueados:delete', fecha),

  // Bloqueos por peluquero
  getBloqueosPeluquero:    (peluquero_id) => ipcRenderer.invoke('bloqueosPeluquero:getAll', peluquero_id),
  crearBloqueoPeluquero:   (data)         => ipcRenderer.invoke('bloqueosPeluquero:create', data),
  eliminarBloqueoPeluquero:(id)           => ipcRenderer.invoke('bloqueosPeluquero:delete', id),

})
