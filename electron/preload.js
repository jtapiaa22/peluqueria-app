const { contextBridge, ipcRenderer } = require('electron')

// postMessage es el método garantizado para cruzar contextIsolation
ipcRenderer.on('turnoWeb:nuevo', (_, data) => {
  window.postMessage({ type: 'turnoWeb:nuevo', data }, '*')
})

ipcRenderer.on('licencia:invalida', (_, data) => {
  window.dispatchEvent(new CustomEvent('licencia:invalida', { detail: data }))
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
  getValesPorMes:       ()      => ipcRenderer.invoke('atenciones:getValesPorMes'),

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

  // Periodos Vales
  abrirPeriodoVales:    (data)  => ipcRenderer.invoke('periodosVales:abrir', data),
  cerrarPeriodoVales:   (data)  => ipcRenderer.invoke('periodosVales:cerrar', data),
  getPeriodoValesAbierto: ()    => ipcRenderer.invoke('periodosVales:getAbierto'),
  getPeriodosVales:     ()      => ipcRenderer.invoke('periodosVales:getTodos'),
  getValesPorPeriodo:   (data)  => ipcRenderer.invoke('periodosVales:getVales', data),

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
  getAllPagosByPeluquero:      (id)    => ipcRenderer.invoke('pagos:getAllByPeluquero', id),
  deletePago:                 (id)    => ipcRenderer.invoke('pagos:delete', id),

  // Turnos manuales (Agenda local)
  createTurno:          (data)         => ipcRenderer.invoke('turnos:create', data),
  getTurnosByFecha:     (fecha)        => ipcRenderer.invoke('turnos:getByFecha', fecha),
  getTurnosByRango:     (rango)        => ipcRenderer.invoke('turnos:getByRango', rango),
  updateTurnoEstado:    (data)         => ipcRenderer.invoke('turnos:updateEstado', data),
  deleteTurno:          (id)           => ipcRenderer.invoke('turnos:delete', id),

  // Peluquería web (Supabase)
  getPeluqueriaConfig:  ()             => ipcRenderer.invoke('peluqueria:getConfig'),
  vincularPeluqueria:   (data)         => ipcRenderer.invoke('peluqueria:vincular', data),

  // Clave del panel de turnos (peluapp-web /admin)
  estadoClavePanel:     ()             => ipcRenderer.invoke('admin:estadoClave'),
  setClaveInicialPanel: (clave)        => ipcRenderer.invoke('admin:setClaveInicial', { clave }),

  // Turnos web (reservas online)
  getTurnosWebPendientes: ()           => ipcRenderer.invoke('turnosWeb:getPendientes'),
  getTurnosWebSenas:      ()           => ipcRenderer.invoke('turnosWeb:getSenas'),
  getTurnosWebTodos:      (mes)        => ipcRenderer.invoke('turnosWeb:getTodos', mes),
  responderTurnoWeb:      (data)       => ipcRenderer.invoke('turnosWeb:responder', data),
  confirmarSena: (id)   => ipcRenderer.invoke('turnosWeb:confirmarSena', id),
  guardarSena:   (data) => ipcRenderer.invoke('peluqueria:guardarSena',   data),

  // Dashboard
  getDashboard:         ()      => ipcRenderer.invoke('dashboard:getResumen'),

  // Licencia
  verificarLicencia:    ()      => ipcRenderer.invoke('licencia:verificar'),
  cargarLicencia:       (ruta)  => ipcRenderer.invoke('licencia:cargar', ruta),
  getMachineId: () => ipcRenderer.invoke('licencia:getMachineId'),
  solicitarLicenciaRemota: (datos) => ipcRenderer.invoke('licencia:solicitarRemota', datos),
  consultarLicenciaRemota: ()      => ipcRenderer.invoke('licencia:consultarRemota'),

  // Actualizador
  checkUpdate:          ()      => ipcRenderer.invoke('updater:check'),
  downloadUpdate:       ()      => ipcRenderer.invoke('updater:download'),
  onDownloadProgress:   (cb)    => ipcRenderer.on('updater:download-progress', (_, data) => cb(data)),
  onDownloadComplete:   (cb)    => ipcRenderer.on('updater:download-complete', () => cb()),
  onDownloadError:      (cb)    => ipcRenderer.on('updater:download-error', (_, data) => cb(data)),

  // App
  getVersion:           ()      => ipcRenderer.invoke('app:getVersion'),
  abrirLink:            (url)   => ipcRenderer.invoke('app:abrirLink', url),
  checkChangelog:       ()      => ipcRenderer.invoke('app:checkChangelog'),
  getChangelogCompleto: ()      => ipcRenderer.invoke('app:getChangelogCompleto'),
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

  // Tramos de comisión por peluquero
  getTramosComision:       (peluquero_id) => ipcRenderer.invoke('tramosComision:getByPeluquero', peluquero_id),
  getAllTramosComision:     ()             => ipcRenderer.invoke('tramosComision:getAll'),
  saveTramosComision:      (data)         => ipcRenderer.invoke('tramosComision:save', data),

  // Backup en la nube
  syncBackupNube:       () => ipcRenderer.invoke('backup:syncNube'),
  restaurarDesdeNube:   () => ipcRenderer.invoke('backup:restaurarNube'),
  getUltimoBackupNube:  () => ipcRenderer.invoke('backup:getUltimoSync'),
  existeBackupNube:     () => ipcRenderer.invoke('backup:existeEnNube'),

})
