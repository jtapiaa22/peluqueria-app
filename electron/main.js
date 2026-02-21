const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const initSqlJs = require('sql.js')
const { autoUpdater } = require('electron-updater')
const crypto = require('crypto')
require('dotenv').config()

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

const isDev = !app.isPackaged
const SECRET_KEY = 'peluapp-jofree-2026'

const dbPath = isDev
  ? path.join(__dirname, '../database.sqlite')
  : path.join(app.getPath('userData'), 'database.sqlite')

let db
let mainWindow

async function initDB() {
  const SQL = await initSqlJs()
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS peluqueros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      comision REAL DEFAULT 0,
      activo INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS servicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      activo INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS atenciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      peluquero_id INTEGER NOT NULL,
      servicio_id INTEGER NOT NULL,
      precio_cobrado REAL NOT NULL,
      metodo_pago TEXT NOT NULL,
      nombre_transferencia TEXT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cierre_caja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora_apertura TEXT NOT NULL,
      hora_cierre TEXT,
      total_efectivo REAL DEFAULT 0,
      total_transferencia REAL DEFAULT 0,
      total_general REAL DEFAULT 0,
      observaciones TEXT,
      estado TEXT DEFAULT 'abierta'
    );
    CREATE TABLE IF NOT EXISTS configuracion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clave TEXT UNIQUE NOT NULL,
      valor TEXT NOT NULL
    );
  `)
  const passExiste = db.exec("SELECT * FROM configuracion WHERE clave = 'password_liquidacion'")
  if (!passExiste.length || !passExiste[0].values.length) {
    db.run("INSERT INTO configuracion (clave, valor) VALUES ('password_liquidacion', '1234')")
  }
  saveDB()
}

function saveDB() {
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
}

function query(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

function run(sql, params = []) {
  db.run(sql, params)
  saveDB()
  return db.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0]
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// Evitar múltiples instancias
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    await initDB()
    createWindow()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ============ IPC HANDLERS ============

ipcMain.handle('peluqueros:getAll', () => query('SELECT * FROM peluqueros WHERE activo = 1'))
ipcMain.handle('peluqueros:create', (_, data) => run('INSERT INTO peluqueros (nombre, comision) VALUES (?, ?)', [data.nombre, data.comision]))
ipcMain.handle('peluqueros:update', (_, data) => { run('UPDATE peluqueros SET nombre = ?, comision = ? WHERE id = ?', [data.nombre, data.comision, data.id]); return true })
ipcMain.handle('peluqueros:delete', (_, id) => { run('UPDATE peluqueros SET activo = 0 WHERE id = ?', [id]); return true })

ipcMain.handle('servicios:getAll', () => query('SELECT * FROM servicios WHERE activo = 1'))
ipcMain.handle('servicios:create', (_, data) => run('INSERT INTO servicios (nombre, precio) VALUES (?, ?)', [data.nombre, data.precio]))
ipcMain.handle('servicios:update', (_, data) => { run('UPDATE servicios SET nombre = ?, precio = ? WHERE id = ?', [data.nombre, data.precio, data.id]); return true })
ipcMain.handle('servicios:delete', (_, id) => { run('UPDATE servicios SET activo = 0 WHERE id = ?', [id]); return true })

ipcMain.handle('atenciones:create', (_, data) => run(
  'INSERT INTO atenciones (peluquero_id, servicio_id, precio_cobrado, metodo_pago, nombre_transferencia, fecha, hora) VALUES (?, ?, ?, ?, ?, ?, ?)',
  [Number(data.peluquero_id), Number(data.servicio_id), Number(data.precio_cobrado), data.metodo_pago, data.nombre_transferencia || null, data.fecha, data.hora]
))
ipcMain.handle('atenciones:getByFecha', (_, fecha) => query(`
  SELECT a.*, p.nombre as peluquero_nombre, s.nombre as servicio_nombre
  FROM atenciones a
  JOIN peluqueros p ON a.peluquero_id = p.id
  JOIN servicios s ON a.servicio_id = s.id
  WHERE a.fecha = ? ORDER BY a.id DESC
`, [fecha]))
ipcMain.handle('atenciones:getByRango', (_, { desde, hasta }) => query(`
  SELECT a.*, p.nombre as peluquero_nombre, s.nombre as servicio_nombre
  FROM atenciones a
  JOIN peluqueros p ON a.peluquero_id = p.id
  JOIN servicios s ON a.servicio_id = s.id
  WHERE a.fecha BETWEEN ? AND ? ORDER BY a.fecha DESC, a.hora DESC
`, [desde, hasta]))
ipcMain.handle('atenciones:delete', (_, id) => { run('DELETE FROM atenciones WHERE id = ?', [id]); return true })

ipcMain.handle('config:get', (_, clave) => query('SELECT valor FROM configuracion WHERE clave = ?', [clave])[0] || null)
ipcMain.handle('config:set', (_, { clave, valor }) => { run('INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)', [clave, valor]); return true })

ipcMain.handle('caja:abrir', (_, data) => run('INSERT INTO cierre_caja (fecha, hora_apertura, estado) VALUES (?, ?, ?)', [data.fecha, data.hora_apertura, 'abierta']))
ipcMain.handle('caja:getCajaAbierta', () => query("SELECT * FROM cierre_caja WHERE estado = 'abierta' ORDER BY id DESC LIMIT 1")[0] || null)
ipcMain.handle('caja:cerrar', (_, data) => {
  run('UPDATE cierre_caja SET hora_cierre = ?, total_efectivo = ?, total_transferencia = ?, total_general = ?, observaciones = ?, estado = ? WHERE id = ?',
    [data.hora_cierre, data.total_efectivo, data.total_transferencia, data.total_general, data.observaciones || null, 'cerrada', data.id])
  return true
})
ipcMain.handle('caja:getCierres', (_, fecha) => {
  const cierres = fecha
    ? query("SELECT * FROM cierre_caja WHERE fecha = ? AND estado = 'cerrada' ORDER BY hora_apertura ASC", [fecha])
    : query("SELECT * FROM cierre_caja WHERE estado = 'cerrada' ORDER BY fecha DESC, hora_apertura ASC")
  return cierres.map(c => {
    const atenciones = query('SELECT * FROM atenciones WHERE fecha = ? AND hora >= ? AND hora <= ?', [c.fecha, c.hora_apertura, c.hora_cierre])
    const total_efectivo = atenciones.filter(a => a.metodo_pago === 'efectivo').reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
    const total_transferencia = atenciones.filter(a => a.metodo_pago === 'transferencia').reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
    return { ...c, total_efectivo, total_transferencia, total_general: total_efectivo + total_transferencia }
  })
})
ipcMain.handle('caja:getDetalleCierre', (_, { hora_apertura, hora_cierre, fecha }) => query(`
  SELECT a.*, p.nombre as peluquero_nombre, s.nombre as servicio_nombre
  FROM atenciones a
  JOIN peluqueros p ON a.peluquero_id = p.id
  JOIN servicios s ON a.servicio_id = s.id
  WHERE a.fecha = ? AND a.hora >= ? AND a.hora <= ? ORDER BY a.hora ASC
`, [fecha, hora_apertura, hora_cierre]))

async function verificarLicencia() {
  try {
    const licPath = isDev
      ? path.join(__dirname, '../licencia.lic')
      : path.join(app.getPath('userData'), 'licencia.lic')

    if (!fs.existsSync(licPath)) return { valida: false, mensaje: 'No se encontró archivo de licencia.' }

    const contenido = fs.readFileSync(licPath, 'utf-8').trim()
    const decoded = Buffer.from(contenido, 'base64').toString('utf-8')
    const datos = JSON.parse(decoded)

    // Verificar firma
    const firma = crypto.createHmac('sha256', SECRET_KEY)
      .update(`peluapp|${datos.desde}|${datos.vence}`)
      .digest('hex')
    if (firma !== datos.firma) return { valida: false, mensaje: 'Licencia inválida o modificada.' }

    // Usar fecha LOCAL de la máquina (no UTC) para evitar desfase por zona horaria
    const ahora = new Date()
    const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`

    // Todas las fechas normalizadas a medianoche UTC para comparaciones consistentes
    const fechaHoy = new Date(hoy + 'T00:00:00Z')
    const fechaDesde = new Date(datos.desde + 'T00:00:00Z')
    const fechaVence = new Date(datos.vence + 'T00:00:00Z')

    // Verificar que no atrasaron el reloj
    const ultimaFechaResult = query("SELECT valor FROM configuracion WHERE clave = 'ultima_fecha_uso'")
    if (ultimaFechaResult.length > 0) {
      const ultimaFecha = ultimaFechaResult[0].valor
      if (hoy < ultimaFecha) {
        return { valida: false, mensaje: 'Se detectó un cambio en la fecha del sistema. Contactá al soporte.' }
      }
    }

    // Registrar días únicos de uso
    const diasUsadosResult = query("SELECT valor FROM configuracion WHERE clave = 'dias_usados'")
    let diasUsados = []
    if (diasUsadosResult.length > 0) {
      try { diasUsados = JSON.parse(diasUsadosResult[0].valor) } catch { diasUsados = [] }
    }

    // Agregar el día de hoy si no está ya registrado
    if (!diasUsados.includes(hoy)) {
      diasUsados.push(hoy)
      run("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('dias_usados', ?)", [JSON.stringify(diasUsados)])
    }

    // Calcular total de días de la licencia (todas normalizadas a UTC medianoche)
    const totalDiasLicencia = Math.round((fechaVence - fechaDesde) / (1000 * 60 * 60 * 24)) + 1

    // Si usó más días únicos que los que tiene la licencia, bloquear
    if (diasUsados.length > totalDiasLicencia) {
      return { valida: false, mensaje: 'Licencia vencida por días de uso excedidos. Contactá al soporte.' }
    }

    // Actualizar última fecha de uso
    run("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('ultima_fecha_uso', ?)", [hoy])

    if (fechaHoy < fechaDesde) return { valida: false, mensaje: `La licencia es válida a partir del ${datos.desde}.` }
    if (fechaHoy > fechaVence) return { valida: false, mensaje: `Licencia vencida el ${datos.vence}.` }

    // Días restantes: diferencia exacta en días + 1 para incluir el día de vencimiento
    const diasRestantes = Math.round((fechaVence - fechaHoy) / (1000 * 60 * 60 * 24)) + 1

    return {
      valida: true,
      mensaje: `Licencia válida. ${diasRestantes} días restantes.`,
      vence: datos.vence,
      diasRestantes
    }
  } catch (e) {
    return { valida: false, mensaje: 'Error al leer la licencia: ' + e.message }
  }
}

ipcMain.handle('licencia:verificar', async () => await verificarLicencia())
ipcMain.handle('licencia:cargar', async (_, rutaArchivo) => {
  try {
    const licPath = isDev
      ? path.join(__dirname, '../licencia.lic')
      : path.join(app.getPath('userData'), 'licencia.lic')
    fs.copyFileSync(rutaArchivo, licPath)

    // Resetear registros de fechas al cargar licencia nueva
    run("DELETE FROM configuracion WHERE clave = 'ultima_fecha_uso'")
    run("DELETE FROM configuracion WHERE clave = 'dias_usados'")

    return await verificarLicencia()
  } catch (e) {
    return { valida: false, mensaje: 'Error al cargar el archivo.' }
  }
})

ipcMain.handle('updater:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates()
    const versionDisponible = result.updateInfo.version
    const versionActual = app.getVersion()
    const disponible = versionDisponible !== versionActual
    return { disponible, version: versionDisponible }
  } catch (e) {
    return { disponible: false, mensaje: e.message }
  }
})

ipcMain.handle('updater:download', () => {
  autoUpdater.downloadUpdate()
  return true
})

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow) {
    mainWindow.webContents.send('updater:download-progress', {
      percent: Math.floor(progress.percent),
      transferred: progress.transferred,
      total: progress.total
    })
  }
})

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('updater:download-complete')
  }
  autoUpdater.quitAndInstall()
})

function getLogoBasePath() {
  const isDev = !app.isPackaged
  const basePath = isDev
    ? path.join(app.getPath('userData'), 'dev')
    : app.getPath('userData')
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true })
  }
  return basePath
}

ipcMain.handle('config:getNombreApp', () => {
  const result = query("SELECT valor FROM configuracion WHERE clave = 'nombre_app'")
  return result[0]?.valor || 'PeluApp'
})

ipcMain.handle('config:setNombreApp', (_, nombre) => {
  run("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('nombre_app', ?)", [nombre])
  return true
})

ipcMain.handle('config:getLogo', () => {
  const logoPath = path.join(getLogoBasePath(), 'logo.png')
  if (fs.existsSync(logoPath)) {
    const data = fs.readFileSync(logoPath)
    return `data:image/png;base64,${data.toString('base64')}`
  }
  return null
})

ipcMain.handle('config:setLogo', async (_, rutaArchivo) => {
  try {
    const logoPath = path.join(getLogoBasePath(), 'logo.png')
    if (rutaArchivo === null) {
      if (fs.existsSync(logoPath)) fs.unlinkSync(logoPath)
      return { ok: true }
    }
    fs.copyFileSync(rutaArchivo, logoPath)
    return { ok: true }
  } catch (e) {
    return { ok: false }
  }
})

ipcMain.handle('app:getVersion', () => {
  return app.getVersion()
})
