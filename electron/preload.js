const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Peluqueros
  getPeluqueros: () => ipcRenderer.invoke('peluqueros:getAll'),
  createPeluquero: (data) => ipcRenderer.invoke('peluqueros:create', data),
  updatePeluquero: (data) => ipcRenderer.invoke('peluqueros:update', data),
  deletePeluquero: (id) => ipcRenderer.invoke('peluqueros:delete', id),

  // Servicios
  getServicios: () => ipcRenderer.invoke('servicios:getAll'),
  createServicio: (data) => ipcRenderer.invoke('servicios:create', data),
  updateServicio: (data) => ipcRenderer.invoke('servicios:update', data),
  deleteServicio: (id) => ipcRenderer.invoke('servicios:delete', id),

  // Atenciones
  createAtencion: (data) => ipcRenderer.invoke('atenciones:create', data),
  getAtencionesByFecha: (fecha) => ipcRenderer.invoke('atenciones:getByFecha', fecha),
  getAtencionesByRango: (rango) => ipcRenderer.invoke('atenciones:getByRango', rango),
  deleteAtencion: (id) => ipcRenderer.invoke('atenciones:delete', id),

  // Caja
  abrirCaja: (data) => ipcRenderer.invoke('caja:abrir', data),
  getCajaAbierta: () => ipcRenderer.invoke('caja:getCajaAbierta'),
  cerrarCaja: (data) => ipcRenderer.invoke('caja:cerrar', data),
  getCierres: (fecha) => ipcRenderer.invoke('caja:getCierres', fecha),
  getDetalleCierre: (data) => ipcRenderer.invoke('caja:getDetalleCierre', data),

  // Configuracion
  getConfig: (clave) => ipcRenderer.invoke('config:get', clave),
  setConfig: (data) => ipcRenderer.invoke('config:set', data),

  // Licencia
  verificarLicencia: () => ipcRenderer.invoke('licencia:verificar'),
  cargarLicencia: (ruta) => ipcRenderer.invoke('licencia:cargar', ruta),

  // Actualizaciones
  checkUpdate: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  onDownloadProgress: (callback) => ipcRenderer.on('updater:download-progress', (_, data) => callback(data)),
  onDownloadComplete: (callback) => ipcRenderer.on('updater:download-complete', () => callback()),

  // Personalizar nombre-logo
  getNombreApp: () => ipcRenderer.invoke('config:getNombreApp'),
  setNombreApp: (nombre) => ipcRenderer.invoke('config:setNombreApp', nombre),
  getLogo: () => ipcRenderer.invoke('config:getLogo'),
  setLogo: (ruta) => ipcRenderer.invoke('config:setLogo', ruta),
})
