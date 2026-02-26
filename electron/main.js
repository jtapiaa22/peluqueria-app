const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')
const { autoUpdater } = require('electron-updater')
const crypto = require('crypto')
require('dotenv').config()
const { dialog } = require('electron')

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

const isDev = !app.isPackaged
const SECRET_KEY = 'peluapp-jofree-2026'

const dbPath = isDev
  ? path.join(__dirname, '../database.sqlite')
  : path.join(app.getPath('userData'), 'database.sqlite')

let db
let mainWindow

// ============ MIGRACIONES ============

const MIGRATIONS = [
  {
    version: 1,
    descripcion: 'Esquema inicial',
    up: (db) => {
      db.exec(`
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
          peluquero_id INTEGER NOT NULL REFERENCES peluqueros(id),
          servicio_id INTEGER NOT NULL REFERENCES servicios(id),
          precio_cobrado REAL NOT NULL,
          metodo_pago TEXT NOT NULL,
          nombre_transferencia TEXT,
          fecha TEXT NOT NULL,
          hora TEXT NOT NULL,
          monto_efectivo REAL DEFAULT 0,
          monto_transferencia REAL DEFAULT 0
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

        CREATE INDEX IF NOT EXISTS idx_atenciones_fecha     ON atenciones(fecha);
        CREATE INDEX IF NOT EXISTS idx_atenciones_peluquero ON atenciones(peluquero_id);
        CREATE INDEX IF NOT EXISTS idx_cierre_caja_estado   ON cierre_caja(estado);
        CREATE INDEX IF NOT EXISTS idx_configuracion_clave  ON configuracion(clave);
      `)

      const passExiste = db.prepare("SELECT id FROM configuracion WHERE clave = 'password_liquidacion'").get()
      if (!passExiste) {
        db.prepare("INSERT INTO configuracion (clave, valor) VALUES ('password_liquidacion', '1234')").run()
      }
    }
  },

  {
    version: 2,
    descripcion: 'Agregar módulo de gastos',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS gastos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          descripcion TEXT NOT NULL,
          monto REAL NOT NULL,
          fecha TEXT NOT NULL,
          categoria TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);
      `)
    }
  },

  {
    version: 3,
    descripcion: 'Agregar columnas de pago mixto en atenciones',
    up: (db) => {
      const cols = db.prepare("PRAGMA table_info(atenciones)").all().map(c => c.name)
      if (!cols.includes('monto_efectivo')) {
        db.prepare("ALTER TABLE atenciones ADD COLUMN monto_efectivo REAL DEFAULT 0").run()
      }
      if (!cols.includes('monto_transferencia')) {
        db.prepare("ALTER TABLE atenciones ADD COLUMN monto_transferencia REAL DEFAULT 0").run()
      }
    }
  },

  // ─── FUTURAS MIGRACIONES ─────────────────────────────────────────────────────
  // {
  //   version: 4,
  //   descripcion: 'Descripción del cambio',
  //   up: (db) => { db.exec(`...`) }
  // },
]

// ============ RUNNER DE MIGRACIONES ============

function runMigrations() {
  const ultimaVersion = db.prepare('SELECT MAX(version) as v FROM migraciones').get()?.v || 0
  const pendientes = MIGRATIONS.filter(m => m.version > ultimaVersion)

  if (pendientes.length === 0) return

  const aplicarMigracion = db.transaction((migracion) => {
    migracion.up(db)
    db.prepare(
      'INSERT INTO migraciones (version, descripcion, aplicada_en) VALUES (?, ?, ?)'
    ).run(migracion.version, migracion.descripcion, new Date().toISOString())
  })

  for (const migracion of pendientes) {
    try {
      aplicarMigracion(migracion)
      console.log(`✅ Migración ${migracion.version} aplicada: ${migracion.descripcion}`)
    } catch (e) {
      console.error(`❌ Error en migración ${migracion.version}:`, e.message)
      throw new Error(`Falló la migración ${migracion.version}: ${e.message}`)
    }
  }
}

// ============ BASE DE DATOS ============

function initDB() {
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS migraciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER UNIQUE NOT NULL,
      descripcion TEXT,
      aplicada_en TEXT NOT NULL
    );
  `)

  runMigrations()
}

// ============ BACKUP AUTOMÁTICO ============

function hacerBackup() {
  try {
    const backupDir = isDev
      ? path.join(__dirname, '../backups')
      : path.join(app.getPath('userData'), 'backups')

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const ahora = new Date()
    const timestamp = [
      ahora.getFullYear(),
      String(ahora.getMonth() + 1).padStart(2, '0'),
      String(ahora.getDate()).padStart(2, '0')
    ].join('-') + '_' + [
      String(ahora.getHours()).padStart(2, '0'),
      String(ahora.getMinutes()).padStart(2, '0')
    ].join('-')

    const backupPath = path.join(backupDir, `database_${timestamp}.sqlite`)
    db.backup(backupPath)
    console.log(`✅ Backup creado: ${backupPath}`)

    const archivos = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('database_') && f.endsWith('.sqlite'))
      .map(f => ({ nombre: f, tiempo: fs.statSync(path.join(backupDir, f)).mtimeMs }))
      .sort((a, b) => b.tiempo - a.tiempo)

    for (const archivo of archivos.slice(7)) {
      fs.unlinkSync(path.join(backupDir, archivo.nombre))
      console.log(`🗑️ Backup antiguo eliminado: ${archivo.nombre}`)
    }
  } catch (e) {
    console.error('⚠️ Error al hacer backup:', e.message)
  }
}

// ============ IPC HANDLERS ============

// --- Peluqueros ---
ipcMain.handle('peluqueros:getAll', () =>
  db.prepare('SELECT * FROM peluqueros WHERE activo = 1').all()
)
ipcMain.handle('peluqueros:create', (_, data) => {
  const result = db.prepare(
    'INSERT INTO peluqueros (nombre, comision) VALUES (?, ?)'
  ).run(data.nombre, data.comision)
  return result.lastInsertRowid
})
ipcMain.handle('peluqueros:update', (_, data) => {
  db.prepare(
    'UPDATE peluqueros SET nombre = ?, comision = ? WHERE id = ?'
  ).run(data.nombre, data.comision, data.id)
  return true
})
ipcMain.handle('peluqueros:delete', (_, id) => {
  db.prepare('UPDATE peluqueros SET activo = 0 WHERE id = ?').run(id)
  return true
})

// --- Servicios ---
ipcMain.handle('servicios:getAll', () =>
  db.prepare('SELECT * FROM servicios WHERE activo = 1').all()
)
ipcMain.handle('servicios:create', (_, data) => {
  const result = db.prepare(
    'INSERT INTO servicios (nombre, precio) VALUES (?, ?)'
  ).run(data.nombre, data.precio)
  return result.lastInsertRowid
})
ipcMain.handle('servicios:update', (_, data) => {
  db.prepare(
    'UPDATE servicios SET nombre = ?, precio = ? WHERE id = ?'
  ).run(data.nombre, data.precio, data.id)
  return true
})
ipcMain.handle('servicios:delete', (_, id) => {
  db.prepare('UPDATE servicios SET activo = 0 WHERE id = ?').run(id)
  return true
})

// --- Atenciones ---
ipcMain.handle('atenciones:create', (_, data) => {
  const precioFinal = data.metodo_pago === 'mixto'
    ? Number(data.monto_efectivo) + Number(data.monto_transferencia)
    : Number(data.precio_cobrado)

  const montoEfectivo = data.metodo_pago === 'efectivo' ? precioFinal
    : data.metodo_pago === 'mixto' ? Number(data.monto_efectivo)
    : 0
  const montoTransferencia = data.metodo_pago === 'transferencia' ? precioFinal
    : data.metodo_pago === 'mixto' ? Number(data.monto_transferencia)
    : 0

  const result = db.prepare(`
    INSERT INTO atenciones
      (peluquero_id, servicio_id, precio_cobrado, metodo_pago,
       nombre_transferencia, fecha, hora, monto_efectivo, monto_transferencia)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(data.peluquero_id),
    Number(data.servicio_id),
    precioFinal,
    data.metodo_pago,
    data.nombre_transferencia || null,
    data.fecha,
    data.hora,
    montoEfectivo,
    montoTransferencia
  )
  return result.lastInsertRowid
})
ipcMain.handle('atenciones:getByFecha', (_, fecha) =>
  db.prepare(`
    SELECT a.*, p.nombre as peluquero_nombre, s.nombre as servicio_nombre
    FROM atenciones a
    JOIN peluqueros p ON a.peluquero_id = p.id
    JOIN servicios s ON a.servicio_id = s.id
    WHERE a.fecha = ?
    ORDER BY a.id DESC
  `).all(fecha)
)
ipcMain.handle('atenciones:getByRango', (_, { desde, hasta }) =>
  db.prepare(`
    SELECT a.*, p.nombre as peluquero_nombre, s.nombre as servicio_nombre
    FROM atenciones a
    JOIN peluqueros p ON a.peluquero_id = p.id
    JOIN servicios s ON a.servicio_id = s.id
    WHERE a.fecha BETWEEN ? AND ?
    ORDER BY a.fecha DESC, a.hora DESC
  `).all(desde, hasta)
)
ipcMain.handle('atenciones:delete', (_, id) => {
  db.prepare('DELETE FROM atenciones WHERE id = ?').run(id)
  return true
})
ipcMain.handle('atenciones:update', (_, data) => {
  const precioFinal = data.metodo_pago === 'mixto'
    ? Number(data.monto_efectivo) + Number(data.monto_transferencia)
    : Number(data.precio_cobrado)

  const montoEfectivo = data.metodo_pago === 'efectivo' ? precioFinal
    : data.metodo_pago === 'mixto' ? Number(data.monto_efectivo)
    : 0
  const montoTransferencia = data.metodo_pago === 'transferencia' ? precioFinal
    : data.metodo_pago === 'mixto' ? Number(data.monto_transferencia)
    : 0

  db.prepare(`
    UPDATE atenciones
    SET peluquero_id = ?, servicio_id = ?, precio_cobrado = ?,
        metodo_pago = ?, nombre_transferencia = ?, fecha = ?, hora = ?,
        monto_efectivo = ?, monto_transferencia = ?
    WHERE id = ?
  `).run(
    Number(data.peluquero_id),
    Number(data.servicio_id),
    precioFinal,
    data.metodo_pago,
    data.nombre_transferencia || null,
    data.fecha,
    data.hora,
    montoEfectivo,
    montoTransferencia,
    data.id
  )
  return true
})

// --- Configuración ---
ipcMain.handle('config:get', (_, clave) =>
  db.prepare('SELECT valor FROM configuracion WHERE clave = ?').get(clave) || null
)
ipcMain.handle('config:set', (_, { clave, valor }) => {
  db.prepare(
    'INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)'
  ).run(clave, valor)
  return true
})

// --- Caja ---
ipcMain.handle('caja:abrir', (_, data) => {
  const result = db.prepare(
    "INSERT INTO cierre_caja (fecha, hora_apertura, estado) VALUES (?, ?, 'abierta')"
  ).run(data.fecha, data.hora_apertura)
  return result.lastInsertRowid
})
ipcMain.handle('caja:getCajaAbierta', () =>
  db.prepare(
    "SELECT * FROM cierre_caja WHERE estado = 'abierta' ORDER BY id DESC LIMIT 1"
  ).get() || null
)
ipcMain.handle('caja:cerrar', (_, data) => {
  db.prepare(`
    UPDATE cierre_caja
    SET hora_cierre = ?, total_efectivo = ?, total_transferencia = ?,
        total_general = ?, observaciones = ?, estado = 'cerrada'
    WHERE id = ?
  `).run(
    data.hora_cierre,
    data.total_efectivo,
    data.total_transferencia,
    data.total_general,
    data.observaciones || null,
    data.id
  )
  return true
})
ipcMain.handle('caja:getCierres', (_, fecha) => {
  return fecha
    ? db.prepare(
        "SELECT * FROM cierre_caja WHERE fecha = ? AND estado = 'cerrada' ORDER BY hora_apertura ASC"
      ).all(fecha)
    : db.prepare(
        "SELECT * FROM cierre_caja WHERE estado = 'cerrada' ORDER BY fecha DESC, hora_apertura ASC"
      ).all()
})
ipcMain.handle('caja:getDetalleCierre', (_, { hora_apertura, hora_cierre, fecha }) =>
  db.prepare(`
    SELECT a.*, p.nombre as peluquero_nombre, s.nombre as servicio_nombre
    FROM atenciones a
    JOIN peluqueros p ON a.peluquero_id = p.id
    JOIN servicios s ON a.servicio_id = s.id
    WHERE a.fecha = ? AND a.hora >= ? AND a.hora <= ?
    ORDER BY a.hora ASC
  `).all(fecha, hora_apertura, hora_cierre)
)

// --- Backup ---
ipcMain.handle('backup:abrirCarpeta', () => {
  const backupDir = isDev
    ? path.join(__dirname, '../backups')
    : path.join(app.getPath('userData'), 'backups')
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
  shell.openPath(backupDir)
  return true
})
ipcMain.handle('backup:listar', () => {
  const backupDir = isDev
    ? path.join(__dirname, '../backups')
    : path.join(app.getPath('userData'), 'backups')
  if (!fs.existsSync(backupDir)) return []
  return fs.readdirSync(backupDir)
    .filter(f => f.startsWith('database_') && f.endsWith('.sqlite'))
    .map(f => ({
      nombre: f,
      fecha: fs.statSync(path.join(backupDir, f)).mtime.toLocaleString('es-AR')
    }))
    .sort((a, b) => b.nombre.localeCompare(a.nombre))
})

// --- Gastos ---
ipcMain.handle('gastos:getAll', () =>
  db.prepare('SELECT * FROM gastos ORDER BY fecha DESC, id DESC').all()
)
ipcMain.handle('gastos:getByRango', (_, { desde, hasta }) =>
  db.prepare(
    'SELECT * FROM gastos WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC, id DESC'
  ).all(desde, hasta)
)
ipcMain.handle('gastos:getResumenMensual', () =>
  db.prepare(`
    SELECT
      strftime('%Y-%m', fecha) as mes,
      SUM(monto) as total_gastos,
      COUNT(*) as cantidad
    FROM gastos
    GROUP BY mes
    ORDER BY mes DESC
  `).all()
)
ipcMain.handle('gastos:create', (_, data) => {
  const result = db.prepare(
    'INSERT INTO gastos (descripcion, monto, fecha, categoria) VALUES (?, ?, ?, ?)'
  ).run(data.descripcion, Number(data.monto), data.fecha, data.categoria || null)
  return result.lastInsertRowid
})
ipcMain.handle('gastos:update', (_, data) => {
  db.prepare(
    'UPDATE gastos SET descripcion = ?, monto = ?, fecha = ?, categoria = ? WHERE id = ?'
  ).run(data.descripcion, Number(data.monto), data.fecha, data.categoria || null, data.id)
  return true
})
ipcMain.handle('gastos:delete', (_, id) => {
  db.prepare('DELETE FROM gastos WHERE id = ?').run(id)
  return true
})

// --- Licencia ---
function verificarLicencia() {
  try {
    const licPath = isDev
      ? path.join(__dirname, '../licencia.lic')
      : path.join(app.getPath('userData'), 'licencia.lic')

    if (!fs.existsSync(licPath))
      return { valida: false, mensaje: 'No se encontró archivo de licencia.' }

    const contenido = fs.readFileSync(licPath, 'utf-8').trim()
    const decoded = Buffer.from(contenido, 'base64').toString('utf-8')
    const datos = JSON.parse(decoded)

    const firma = crypto.createHmac('sha256', SECRET_KEY)
      .update(`peluapp|${datos.desde}|${datos.vence}`)
      .digest('hex')
    if (firma !== datos.firma)
      return { valida: false, mensaje: 'Licencia inválida o modificada.' }

    const ahora = new Date()
    const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`

    const fechaHoy   = new Date(hoy        + 'T00:00:00Z')
    const fechaDesde = new Date(datos.desde + 'T00:00:00Z')
    const fechaVence = new Date(datos.vence + 'T00:00:00Z')

    const ultimaFechaRow = db.prepare(
      "SELECT valor FROM configuracion WHERE clave = 'ultima_fecha_uso'"
    ).get()
    if (ultimaFechaRow && hoy < ultimaFechaRow.valor)
      return { valida: false, mensaje: 'Se detectó un cambio en la fecha del sistema. Contactá al soporte.' }

    const diasUsadosRow = db.prepare(
      "SELECT valor FROM configuracion WHERE clave = 'dias_usados'"
    ).get()
    let diasUsados = []
    if (diasUsadosRow) {
      try { diasUsados = JSON.parse(diasUsadosRow.valor) } catch { diasUsados = [] }
    }
    if (!diasUsados.includes(hoy)) {
      diasUsados.push(hoy)
      db.prepare(
        "INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('dias_usados', ?)"
      ).run(JSON.stringify(diasUsados))
    }

    const totalDiasLicencia = Math.round((fechaVence - fechaDesde) / (1000 * 60 * 60 * 24)) + 1
    if (diasUsados.length > totalDiasLicencia)
      return { valida: false, mensaje: 'Licencia vencida por días de uso excedidos. Contactá al soporte.' }

    db.prepare(
      "INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('ultima_fecha_uso', ?)"
    ).run(hoy)

    if (fechaHoy < fechaDesde)
      return { valida: false, mensaje: `La licencia es válida a partir del ${datos.desde}.` }
    if (fechaHoy > fechaVence)
      return { valida: false, mensaje: `Licencia vencida el ${datos.vence}.` }

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

ipcMain.handle('licencia:verificar', () => verificarLicencia())
ipcMain.handle('licencia:cargar', (_, rutaArchivo) => {
  try {
    const licPath = isDev
      ? path.join(__dirname, '../licencia.lic')
      : path.join(app.getPath('userData'), 'licencia.lic')
    fs.copyFileSync(rutaArchivo, licPath)
    db.prepare("DELETE FROM configuracion WHERE clave = 'ultima_fecha_uso'").run()
    db.prepare("DELETE FROM configuracion WHERE clave = 'dias_usados'").run()
    return verificarLicencia()
  } catch (e) {
    return { valida: false, mensaje: 'Error al cargar el archivo.' }
  }
})

// --- Actualizador ---
ipcMain.handle('updater:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates()
    const versionDisponible = result.updateInfo.version
    const versionActual = app.getVersion()
    return { disponible: versionDisponible !== versionActual, version: versionDisponible }
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
  if (mainWindow) mainWindow.webContents.send('updater:download-complete')
  autoUpdater.quitAndInstall()
})

// --- Personalización (nombre y logo) ---
function getLogoBasePath() {
  const basePath = isDev
    ? path.join(app.getPath('userData'), 'dev')
    : app.getPath('userData')
  if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true })
  return basePath
}

ipcMain.handle('config:getNombreApp', () =>
  db.prepare("SELECT valor FROM configuracion WHERE clave = 'nombre_app'").get()?.valor || 'PeluApp'
)
ipcMain.handle('config:setNombreApp', (_, nombre) => {
  db.prepare(
    "INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('nombre_app', ?)"
  ).run(nombre)
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
ipcMain.handle('config:setLogo', (_, rutaArchivo) => {
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
ipcMain.handle('app:getVersion', () => app.getVersion())

// --- PDF ---
ipcMain.handle('pdf:guardar', async (_, { buffer, nombreSugerido }) => {
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar PDF',
    defaultPath: nombreSugerido,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (canceled || !filePath) return { ok: false }
  fs.writeFileSync(filePath, Buffer.from(buffer))
  return { ok: true, filePath }
})

// --- Dashboard ---
ipcMain.handle('dashboard:getResumen', () => {
  const hoy = new Date()
  const fechaHoy = hoy.toISOString().split('T')[0]

  const ultimos7 = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy)
    d.setDate(d.getDate() - i)
    ultimos7.push(d.toISOString().split('T')[0])
  }

  const atencionesHoy = db.prepare(`
    SELECT a.*, p.nombre as peluquero_nombre, s.nombre as servicio_nombre
    FROM atenciones a
    JOIN peluqueros p ON a.peluquero_id = p.id
    JOIN servicios s ON a.servicio_id = s.id
    WHERE a.fecha = ?
  `).all(fechaHoy)

  const ingresosPorDia = ultimos7.map(fecha => {
    const row = db.prepare(
      'SELECT COALESCE(SUM(precio_cobrado), 0) as total FROM atenciones WHERE fecha = ?'
    ).get(fecha)
    return { fecha, total: row.total }
  })

  const primerDiaMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
  const topPeluqueros = db.prepare(`
    SELECT p.nombre, COUNT(*) as atenciones, SUM(a.precio_cobrado) as total
    FROM atenciones a
    JOIN peluqueros p ON a.peluquero_id = p.id
    WHERE a.fecha BETWEEN ? AND ?
    GROUP BY a.peluquero_id
    ORDER BY total DESC
    LIMIT 5
  `).all(primerDiaMes, fechaHoy)

  const ultimoCierre = db.prepare(
    "SELECT * FROM cierre_caja WHERE estado = 'cerrada' ORDER BY id DESC LIMIT 1"
  ).get() || null

  const cajaAbierta = db.prepare(
    "SELECT * FROM cierre_caja WHERE estado = 'abierta' ORDER BY id DESC LIMIT 1"
  ).get() || null

  // Totales hoy usando monto_efectivo y monto_transferencia
  const efectivoHoy      = atencionesHoy.reduce((acc, a) => acc + Number(a.monto_efectivo      || 0), 0)
  const transferenciaHoy = atencionesHoy.reduce((acc, a) => acc + Number(a.monto_transferencia || 0), 0)

  return {
    fechaHoy,
    atencionesHoy,
    totalHoy: atencionesHoy.reduce((acc, a) => acc + Number(a.precio_cobrado), 0),
    efectivoHoy,
    transferenciaHoy,
    ingresosPorDia,
    topPeluqueros,
    ultimoCierre,
    cajaAbierta
  }
})

// ============ VENTANA ============
function createWindow() {
  Menu.setApplicationMenu(null)
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  })
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// ============ ARRANQUE ============
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
  app.whenReady().then(() => {
    initDB()
    hacerBackup()
    createWindow()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
