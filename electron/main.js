const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const initSqlJs = require('sql.js')
const { autoUpdater } = require('electron-updater')

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

const isDev = !app.isPackaged

const dbPath = isDev
  ? path.join(__dirname, '../database.sqlite')
  : path.join(app.getPath('userData'), 'database.sqlite')

let db

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
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  await initDB()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ============ IPC HANDLERS ============

// --- PELUQUEROS ---
ipcMain.handle('peluqueros:getAll', () => {
  return query('SELECT * FROM peluqueros WHERE activo = 1')
})
ipcMain.handle('peluqueros:create', (_, data) => {
  return run('INSERT INTO peluqueros (nombre, comision) VALUES (?, ?)', [data.nombre, data.comision])
})
ipcMain.handle('peluqueros:update', (_, data) => {
  run('UPDATE peluqueros SET nombre = ?, comision = ? WHERE id = ?', [data.nombre, data.comision, data.id])
  return true
})
ipcMain.handle('peluqueros:delete', (_, id) => {
  run('UPDATE peluqueros SET activo = 0 WHERE id = ?', [id])
  return true
})

// --- SERVICIOS ---
ipcMain.handle('servicios:getAll', () => {
  return query('SELECT * FROM servicios WHERE activo = 1')
})
ipcMain.handle('servicios:create', (_, data) => {
  return run('INSERT INTO servicios (nombre, precio) VALUES (?, ?)', [data.nombre, data.precio])
})
ipcMain.handle('servicios:update', (_, data) => {
  run('UPDATE servicios SET nombre = ?, precio = ? WHERE id = ?', [data.nombre, data.precio, data.id])
  return true
})
ipcMain.handle('servicios:delete', (_, id) => {
  run('UPDATE servicios SET activo = 0 WHERE id = ?', [id])
  return true
})

// --- ATENCIONES ---
ipcMain.handle('atenciones:create', (_, data) => {
  return run(
    'INSERT INTO atenciones (peluquero_id, servicio_id, precio_cobrado, metodo_pago, nombre_transferencia, fecha, hora) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [Number(data.peluquero_id), Number(data.servicio_id), Number(data.precio_cobrado), data.metodo_pago, data.nombre_transferencia || null, data.fecha, data.hora]
  )
})
ipcMain.handle('atenciones:getByFecha', (_, fecha) => {
  return query(`
    SELECT a.*, p.nombre as peluquero_nombre, s.nombre as servicio_nombre
    FROM atenciones a
    JOIN peluqueros p ON a.peluquero_id = p.id
    JOIN servicios s ON a.servicio_id = s.id
    WHERE a.fecha = ?
    ORDER BY a.hora DESC
  `, [fecha])
})
ipcMain.handle('atenciones:getByRango', (_, { desde, hasta }) => {
  return query(`
    SELECT a.*, p.nombre as peluquero_nombre, s.nombre as servicio_nombre
    FROM atenciones a
    JOIN peluqueros p ON a.peluquero_id = p.id
    JOIN servicios s ON a.servicio_id = s.id
    WHERE a.fecha BETWEEN ? AND ?
    ORDER BY a.fecha DESC, a.hora DESC
  `, [desde, hasta])
})
ipcMain.handle('atenciones:delete', (_, id) => {
  run('DELETE FROM atenciones WHERE id = ?', [id])
  return true
})

// --- CONFIGURACION ---
ipcMain.handle('config:get', (_, clave) => {
  const result = query('SELECT valor FROM configuracion WHERE clave = ?', [clave])
  return result[0] || null
})
ipcMain.handle('config:set', (_, { clave, valor }) => {
  run('INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)', [clave, valor])
  return true
})

// --- CAJA ---
ipcMain.handle('caja:abrir', (_, data) => {
  return run(
    'INSERT INTO cierre_caja (fecha, hora_apertura, estado) VALUES (?, ?, ?)',
    [data.fecha, data.hora_apertura, 'abierta']
  )
})

ipcMain.handle('caja:getCajaAbierta', () => {
  const result = query("SELECT * FROM cierre_caja WHERE estado = 'abierta' ORDER BY id DESC LIMIT 1")
  return result[0] || null
})

ipcMain.handle('caja:cerrar', (_, data) => {
  run(
    'UPDATE cierre_caja SET hora_cierre = ?, total_efectivo = ?, total_transferencia = ?, total_general = ?, observaciones = ?, estado = ? WHERE id = ?',
    [data.hora_cierre, data.total_efectivo, data.total_transferencia, data.total_general, data.observaciones || null, 'cerrada', data.id]
  )
  return true
})

ipcMain.handle('caja:getCierres', (_, fecha) => {
  let cierres
  if (fecha) {
    cierres = query("SELECT * FROM cierre_caja WHERE fecha = ? AND estado = 'cerrada' ORDER BY hora_apertura ASC", [fecha])
  } else {
    cierres = query("SELECT * FROM cierre_caja WHERE estado = 'cerrada' ORDER BY fecha DESC, hora_apertura ASC")
  }

  // Recalcular totales reales por rango horario de cada turno
  return cierres.map(c => {
    const atenciones = query(`
      SELECT * FROM atenciones
      WHERE fecha = ? AND hora >= ? AND hora <= ?
    `, [c.fecha, c.hora_apertura, c.hora_cierre])

    const total_efectivo = atenciones.filter(a => a.metodo_pago === 'efectivo').reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
    const total_transferencia = atenciones.filter(a => a.metodo_pago === 'transferencia').reduce((acc, a) => acc + Number(a.precio_cobrado), 0)
    const total_general = total_efectivo + total_transferencia

    return { ...c, total_efectivo, total_transferencia, total_general }
  })
})

ipcMain.handle('caja:getDetalleCierre', (_, { hora_apertura, hora_cierre, fecha }) => {
  return query(`
    SELECT a.*, p.nombre as peluquero_nombre, s.nombre as servicio_nombre
    FROM atenciones a
    JOIN peluqueros p ON a.peluquero_id = p.id
    JOIN servicios s ON a.servicio_id = s.id
    WHERE a.fecha = ? AND a.hora >= ? AND a.hora <= ?
    ORDER BY a.hora ASC
  `, [fecha, hora_apertura, hora_cierre])
})


//funcion mensual
const crypto = require('crypto')
const SECRET_KEY = 'peluapp-jofree-2026' // Clave secreta, no la compartas

async function verificarLicencia() {
  try {
    const licPath = isDev
      ? path.join(__dirname, '../licencia.lic')
      : path.join(app.getPath('userData'), 'licencia.lic')

    if (!fs.existsSync(licPath)) return { valida: false, mensaje: 'No se encontró archivo de licencia.' }

    const contenido = fs.readFileSync(licPath, 'utf-8').trim()
    const decoded = atob(contenido)
    const datos = JSON.parse(decoded)

    const firma = crypto.createHmac('sha256', SECRET_KEY)
      .update(`peluapp|${datos.desde}|${datos.vence}`)
      .digest('hex')

    if (firma !== datos.firma) return { valida: false, mensaje: 'Licencia inválida o modificada.' }

    const hoy = new Date().toISOString().split('T')[0]
    if (hoy < datos.desde) return { valida: false, mensaje: `La licencia es válida a partir del ${datos.desde}.` }
    if (hoy > datos.vence) return { valida: false, mensaje: `Licencia vencida el ${datos.vence}.` }

    return { valida: true, mensaje: `Licencia válida hasta ${datos.vence}.`, vence: datos.vence }
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
    return await verificarLicencia()
  } catch (e) {
    return { valida: false, mensaje: 'Error al cargar el archivo.' }
  }
})

// --- ACTUALIZACIONES ---
ipcMain.handle('updater:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates()
    return { disponible: true, version: result.updateInfo.version }
  } catch (e) {
    return { disponible: false, mensaje: e.message }
  }
})

ipcMain.handle('updater:download', () => {
  autoUpdater.downloadUpdate()
  return true
})

autoUpdater.on('update-not-available', () => {
  // no hay update
})

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})