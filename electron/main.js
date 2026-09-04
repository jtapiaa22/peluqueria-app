const { app, BrowserWindow, ipcMain, shell, Menu, Notification } = require('electron')
app.setName('PeluApp')
if (process.platform === 'win32') app.setAppUserModelId('PeluApp')
const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')
const { autoUpdater } = require('electron-updater')
const crypto = require('crypto')
require('dotenv').config()
const { dialog } = require('electron')
const { execSync } = require('child_process')
const os = require('os')

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

const isDev = !app.isPackaged
const _sk = ['pelu', 'app', '-', 'jo', 'free', '-', '20', '26']
const SECRET_KEY = _sk[0]+_sk[1]+_sk[2]+_sk[3]+_sk[4]+_sk[5]+_sk[6]+_sk[7]

const SUPABASE_URL = 'https://xsalearfdfjuyjwugick.supabase.co'
const SUPABASE_KEY = 'sb_publishable_9NvWXl8HHIhde1l8lt8apw_-bCNWwUz'
const WEB_URL = 'https://www.peluapp-turnos.xyz'
let supabase = null
async function getSupabase() {
  if (supabase) return supabase
  const { createClient } = await import('@supabase/supabase-js')
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  return supabase
}

const dbPath = isDev
  ? path.join(__dirname, '../database.sqlite')
  : path.join(app.getPath('userData'), 'database.sqlite')

let db
let mainWindow

const MIGRATIONS = [
  { version:1, descripcion:'Esquema inicial', up:(db)=>{ db.exec(`CREATE TABLE IF NOT EXISTS peluqueros(id INTEGER PRIMARY KEY AUTOINCREMENT,nombre TEXT NOT NULL,comision REAL DEFAULT 0,activo INTEGER DEFAULT 1);CREATE TABLE IF NOT EXISTS servicios(id INTEGER PRIMARY KEY AUTOINCREMENT,nombre TEXT NOT NULL,precio REAL NOT NULL,activo INTEGER DEFAULT 1);CREATE TABLE IF NOT EXISTS atenciones(id INTEGER PRIMARY KEY AUTOINCREMENT,peluquero_id INTEGER NOT NULL REFERENCES peluqueros(id),servicio_id INTEGER NOT NULL REFERENCES servicios(id),precio_cobrado REAL NOT NULL,metodo_pago TEXT NOT NULL,nombre_transferencia TEXT,fecha TEXT NOT NULL,hora TEXT NOT NULL,monto_efectivo REAL DEFAULT 0,monto_transferencia REAL DEFAULT 0);CREATE TABLE IF NOT EXISTS cierre_caja(id INTEGER PRIMARY KEY AUTOINCREMENT,fecha TEXT NOT NULL,hora_apertura TEXT NOT NULL,hora_cierre TEXT,total_efectivo REAL DEFAULT 0,total_transferencia REAL DEFAULT 0,total_general REAL DEFAULT 0,observaciones TEXT,estado TEXT DEFAULT 'abierta');CREATE TABLE IF NOT EXISTS configuracion(id INTEGER PRIMARY KEY AUTOINCREMENT,clave TEXT UNIQUE NOT NULL,valor TEXT NOT NULL);CREATE INDEX IF NOT EXISTS idx_atenciones_fecha ON atenciones(fecha);CREATE INDEX IF NOT EXISTS idx_atenciones_peluquero ON atenciones(peluquero_id);CREATE INDEX IF NOT EXISTS idx_configuracion_clave ON configuracion(clave);`); const p=db.prepare("SELECT id FROM configuracion WHERE clave='password_liquidacion'").get(); if(!p) db.prepare("INSERT INTO configuracion(clave,valor) VALUES('password_liquidacion','1234')").run() } },
  { version:2, descripcion:'Gastos', up:(db)=>{ db.exec(`CREATE TABLE IF NOT EXISTS gastos(id INTEGER PRIMARY KEY AUTOINCREMENT,descripcion TEXT NOT NULL,monto REAL NOT NULL,fecha TEXT NOT NULL,categoria TEXT);CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);`) } },
  { version:3, descripcion:'Pago mixto', up:(db)=>{ const c=db.prepare("PRAGMA table_info(atenciones)").all().map(x=>x.name); if(!c.includes('monto_efectivo')) db.prepare("ALTER TABLE atenciones ADD COLUMN monto_efectivo REAL DEFAULT 0").run(); if(!c.includes('monto_transferencia')) db.prepare("ALTER TABLE atenciones ADD COLUMN monto_transferencia REAL DEFAULT 0").run() } },
  { version:4, descripcion:'Pagos peluqueros', up:(db)=>{ db.exec(`CREATE TABLE IF NOT EXISTS pagos_peluqueros(id INTEGER PRIMARY KEY AUTOINCREMENT,peluquero_id INTEGER NOT NULL,peluquero_nombre TEXT NOT NULL,desde TEXT NOT NULL,hasta TEXT NOT NULL,monto REAL NOT NULL,fecha_pago TEXT NOT NULL,notas TEXT);CREATE INDEX IF NOT EXISTS idx_pagos_peluqueros_fecha ON pagos_peluqueros(fecha_pago);CREATE INDEX IF NOT EXISTS idx_pagos_peluqueros_pid ON pagos_peluqueros(peluquero_id);`) } },
  { version:5, descripcion:'Turnos agenda', up:(db)=>{ db.exec(`CREATE TABLE IF NOT EXISTS turnos(id INTEGER PRIMARY KEY AUTOINCREMENT,peluquero_id INTEGER,servicio_id INTEGER,cliente_nombre TEXT NOT NULL,fecha TEXT NOT NULL,hora TEXT NOT NULL,estado TEXT DEFAULT 'pendiente',notas TEXT);CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos(fecha);CREATE INDEX IF NOT EXISTS idx_turnos_peluquero ON turnos(peluquero_id);`) } },
  { version:6, descripcion:'Config peluqueria web', up:(db)=>{ for(const c of ['peluqueria_id','peluqueria_nombre','peluqueria_email']){ if(!db.prepare("SELECT id FROM configuracion WHERE clave=?").get(c)) db.prepare("INSERT INTO configuracion(clave,valor) VALUES(?,?)").run(c,'') } } },
  { version: 7, descripcion: 'turno_web_id en turnos', up: (db) => {
  const cols = db.prepare('PRAGMA table_info(turnos)').all().map(x => x.name)
  if (!cols.includes('turno_web_id')) db.prepare('ALTER TABLE turnos ADD COLUMN turno_web_id TEXT').run()
  }},
  { version: 8, descripcion: 'Días bloqueados', up: (db) => {
    db.exec(`CREATE TABLE IF NOT EXISTS dias_bloqueados(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL UNIQUE,
      motivo TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`)
  }},
  { version: 9, descripcion: 'Bloqueos por peluquero', up: (db) => {
    db.exec(`CREATE TABLE IF NOT EXISTS bloqueos_peluquero(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      peluquero_id INTEGER NOT NULL REFERENCES peluqueros(id),
      desde TEXT NOT NULL,
      hasta TEXT NOT NULL,
      motivo TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_bloqueos_peluquero ON bloqueos_peluquero(peluquero_id);`)
  }},
  { version: 10, descripcion: 'Tramos de comisión por peluquero', up: (db) => {
    db.exec(`CREATE TABLE IF NOT EXISTS peluquero_tramos(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      peluquero_id INTEGER NOT NULL REFERENCES peluqueros(id),
      monto_desde REAL NOT NULL,
      monto_pago REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tramos_peluquero ON peluquero_tramos(peluquero_id);`)
  }},
  { version: 11, descripcion: 'servicio_id nullable para vale', up: (db) => {
    db.exec(`
      CREATE TABLE atenciones_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        peluquero_id INTEGER NOT NULL REFERENCES peluqueros(id),
        servicio_id INTEGER REFERENCES servicios(id),
        precio_cobrado REAL NOT NULL,
        metodo_pago TEXT NOT NULL,
        nombre_transferencia TEXT,
        fecha TEXT NOT NULL,
        hora TEXT NOT NULL,
        monto_efectivo REAL DEFAULT 0,
        monto_transferencia REAL DEFAULT 0
      );
      INSERT INTO atenciones_new SELECT * FROM atenciones;
      DROP TABLE atenciones;
      ALTER TABLE atenciones_new RENAME TO atenciones;
      CREATE INDEX IF NOT EXISTS idx_atenciones_fecha ON atenciones(fecha);
      CREATE INDEX IF NOT EXISTS idx_atenciones_peluquero ON atenciones(peluquero_id);
    `)
  }},
  { version: 12, descripcion: 'Config senia web', up: (db) =>{
    for (const c of ['sena_monto', 'sena_alias', 'sena_horas_vencimiento']){
      if(!db.prepare("SELECT id FROM configuracion WHERE clave=?").get(c)) db.prepare("INSERT INTO configuracion(clave, valor) VALUES(?,?)").run(c, '')
    }
  }},
  { version: 13, descripcion: 'Caja de vales', up: (db) => {
    db.exec(`CREATE TABLE IF NOT EXISTS periodos_vales(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha_apertura TEXT NOT NULL,
      hora_apertura TEXT NOT NULL,
      fecha_cierre TEXT,
      hora_cierre TEXT,
      estado TEXT DEFAULT 'abierta'
    );`)
  }},
  {version: 14, descripcion: 'Propinas en Atenciones', up: (db) =>{
    const cols = db.prepare('PRAGMA table_info(atenciones)').all().map(c => c.name)
    if (!cols.includes('propina')){
      db.prepare('ALTER TABLE atenciones ADD COLUMN propina REAL DEFAULT 0').run()
    }
  }},
  {version: 15, descripcion: 'Dividir propinas en efectivo y transferencia', up: (db) =>{
    const cols = db.prepare('PRAGMA table_info(atenciones)').all().map(c => c.name)
    if (!cols.includes('propina_efectivo')){
      db.prepare('ALTER TABLE atenciones ADD COLUMN propina_efectivo REAL DEFAULT 0').run()
      db.prepare('ALTER TABLE atenciones ADD COLUMN propina_transferencia REAL DEFAULT 0').run()
      // Migrar propina existente a propina_efectivo
      db.prepare('UPDATE atenciones SET propina_efectivo = propina WHERE propina IS NOT NULL AND propina > 0').run()
    }
  }},
  { version: 16, descripcion: 'Porcentaje propina configurable por peluquero', up: (db) => {
    const cols = db.prepare('PRAGMA table_info(peluqueros)').all().map(c => c.name)
    if (!cols.includes('porcentaje_propina')) db.prepare('ALTER TABLE peluqueros ADD COLUMN porcentaje_propina REAL DEFAULT 100').run()
  }},
  { version: 17, descripcion: 'Propinas pagadas en registro de pagos a peluqueros', up: (db) => {
    const cols = db.prepare('PRAGMA table_info(pagos_peluqueros)').all().map(c => c.name)
    if (!cols.includes('propinas_pagadas')) db.prepare('ALTER TABLE pagos_peluqueros ADD COLUMN propinas_pagadas REAL DEFAULT 0').run()
  }},
  { version: 18, descripcion: 'Correo para comprobantes de seña', up: (db) => {
    if (!db.prepare("SELECT id FROM configuracion WHERE clave='sena_correo'").get())
      db.prepare("INSERT INTO configuracion(clave,valor) VALUES('sena_correo','')").run()
  }},
]

function runMigrations() {
  const ultima = db.prepare('SELECT MAX(version) as v FROM migraciones').get()?.v || 0
  const pendientes = MIGRATIONS.filter(m => m.version > ultima)
  if (!pendientes.length) return
  const aplicar = db.transaction((m) => { m.up(db); db.prepare('INSERT INTO migraciones(version,descripcion,aplicada_en) VALUES(?,?,?)').run(m.version,m.descripcion,new Date().toISOString()) })
  for (const m of pendientes) { try { aplicar(m); console.log(`✅ Migración ${m.version}`) } catch(e){ console.error(`❌ Migración ${m.version}:`,e.message); throw e } }
}

function initDB() {
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`CREATE TABLE IF NOT EXISTS migraciones(id INTEGER PRIMARY KEY AUTOINCREMENT,version INTEGER UNIQUE NOT NULL,descripcion TEXT,aplicada_en TEXT NOT NULL);`)
  runMigrations()
}

function hacerBackup() {
  try {
    const dir = isDev ? path.join(__dirname,'../backups') : path.join(app.getPath('userData'),'backups')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true})
    const n = new Date()
    const ts = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}_${String(n.getHours()).padStart(2,'0')}-${String(n.getMinutes()).padStart(2,'0')}`
    db.backup(path.join(dir,`database_${ts}.sqlite`))
    const files = fs.readdirSync(dir).filter(f=>f.startsWith('database_')&&f.endsWith('.sqlite')).map(f=>({f,t:fs.statSync(path.join(dir,f)).mtimeMs})).sort((a,b)=>b.t-a.t)
    for (const x of files.slice(7)) fs.unlinkSync(path.join(dir,x.f))
  } catch(e){ console.error('⚠️ Backup:',e.message) }
}

async function getPid() {
  return db.prepare("SELECT valor FROM configuracion WHERE clave='peluqueria_id'").get()?.valor || null
}

async function getDeviceToken() {
  return db.prepare("SELECT valor FROM configuracion WHERE clave='device_token'").get()?.valor || null
}

// turnos_web/turnos_manuales_web/turnos_senas ya no son accesibles con la clave
// anon (ver migraciones/004-lock-turnos-web.sql en peluapp-web): hay que pasar
// por las rutas /api/admin/* y /api/device/*, autenticadas con este token.
// Si la peluquería ya tiene clave de panel configurada, /api/device/vincular
// la exige (ver ese archivo en peluapp-web) — sin eso, cualquiera con el
// peluqueria_id (que viaja en el link público de reservas, no es secreto)
// podía pedir un token de admin acá sin ninguna clave.
async function vincularDevice(peluqueriaId, clave) {
  try {
    const r = await fetch(`${WEB_URL}/api/device/vincular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peluqueriaId, clave }),
    })
    const d = await r.json()
    if (!r.ok || !d.token) return { ok: false, error: d.error, requiereClave: !!d.requiereClave }
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('device_token',?)").run(d.token)
    return { ok: true, token: d.token }
  } catch (e) { console.error('⚠️ Vincular device:', e.message); return { ok: false, error: e.message } }
}

// Deja la clave del panel configurada por primera vez para una peluquería
// (ver /api/device/set-clave en peluapp-web) — solo funciona mientras esa
// peluquería no tenga ninguna clave todavía.
async function establecerClaveInicial(peluqueriaId, clave) {
  try {
    const r = await fetch(`${WEB_URL}/api/device/set-clave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peluqueriaId, clave }),
    })
    const d = await r.json()
    if (!r.ok) return { ok: false, error: d.error }
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}

async function apiDevice(path, opciones = {}) {
  const token = await getDeviceToken()
  const r = await fetch(`${WEB_URL}${path}`, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...(opciones.headers || {}), Authorization: `Bearer ${token}` },
  })
  const data = await r.json().catch(() => null)
  if (!r.ok) throw new Error(data?.error || `Error ${r.status}`)
  return data
}

// ── HELPER: enviar a la ventana aunque mainWindow sea null ────
function sendToWindow(channel, data) {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length) wins[0].webContents.send(channel, data)
}

// ── NOTIFICACIONES ────────────────────────────────────────────
let turnosNotificados = new Set()
let primeraVerificacion = true

function notificarTurno(t) {
  if (turnosNotificados.has(t.id)) return
  turnosNotificados.add(t.id)
  if (primeraVerificacion) return
  if (Notification.isSupported()) {
    new Notification({
      title: 'Nuevo turno solicitado',
      body: `${t.cliente_nombre} con ${t.peluquero_nombre} — ${t.fecha} a las ${t.hora?.substring(0,5)}`
    }).show()
  }
  sendToWindow('turnoWeb:nuevo', {
    id:               t.id,
    cliente_nombre:   t.cliente_nombre,
    peluquero_nombre: t.peluquero_nombre,
    fecha:            t.fecha,
    hora:             t.hora?.substring(0,5),
    timestamp:        Date.now()
  })
}

async function checkNuevosTurnos() {
  try {
    const pid = await getPid()
    if (!pid || !(await getDeviceToken())) return
    const { pendientes } = await apiDevice('/api/admin/turnos')
    for (const t of pendientes.filter(t => t.estado === 'pendiente')) notificarTurno(t)
    primeraVerificacion = false
  } catch(e) { console.error('⚠️ Notif:', e.message) }
}

// ── SYNC DÍAS BLOQUEADOS ──────────────────────────────────────
async function syncDiasBloqueados() {
  try {
    const pid = await getPid()
    if (!pid) return
    const sb = await getSupabase()
    const dias = db.prepare('SELECT * FROM dias_bloqueados').all()
    await sb.from('dias_bloqueados_web').delete().eq('peluqueria_id', pid)
    if (dias.length) await sb.from('dias_bloqueados_web').insert(
      dias.map(d => ({ fecha: d.fecha, motivo: d.motivo || null, peluqueria_id: pid }))
    )
  } catch(e) { console.error('⚠️ SyncDias:', e.message) }
}

async function syncBloqueosPeluquero() {
  try {
    const pid = await getPid()
    if (!pid) return
    const sb = await getSupabase()
    const bloqueos = db.prepare('SELECT b.*, p.nombre as peluquero_nombre FROM bloqueos_peluquero b JOIN peluqueros p ON b.peluquero_id=p.id').all()
    await sb.from('bloqueos_peluquero_web').delete().eq('peluqueria_id', pid)
    if (bloqueos.length) await sb.from('bloqueos_peluquero_web').insert(
      bloqueos.map(b => ({
        peluqueria_id:    pid,
        peluquero_id:     b.peluquero_id,
        peluquero_nombre: b.peluquero_nombre,
        desde:            b.desde,
        hasta:            b.hasta,
        motivo:           b.motivo || null
      }))
    )
  } catch(e) { console.error('⚠️ SyncBloqueos:', e.message) }
}

// ── BACKUP EN LA NUBE (Supabase Storage) ─────────────────────
async function syncBackupCompleto() {
  try {
    const pid = await getPid()
    if (!pid) return { ok: false, error: 'No hay peluquería vinculada.' }

    // Crear copia segura del sqlite
    const tempPath = path.join(app.getPath('temp'), `peluapp_backup_${Date.now()}.sqlite`)
    await db.backup(tempPath)

    // Leer y subir a Supabase Storage
    const fileBuffer = fs.readFileSync(tempPath)
    const sb = await getSupabase()
    const { error } = await sb.storage
      .from('backups-db')
      .upload(`${pid}/database.sqlite`, fileBuffer, {
        contentType: 'application/x-sqlite3',
        upsert: true
      })

    // Limpiar temp
    try { fs.unlinkSync(tempPath) } catch {}

    if (error) throw error

    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('ultimo_backup_nube',?)").run(new Date().toISOString())

    // Historial de backups en la nube: una copia fechada por día (no pisa la última),
    // para poder volver a un punto anterior si el backup "actual" se corrompe.
    // Cualquier error acá no debe afectar el resultado del backup principal.
    try {
      const hoy = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      const ultimoHistorial = db.prepare("SELECT valor FROM configuracion WHERE clave='ultimo_backup_historial'").get()?.valor
      if (ultimoHistorial !== hoy) {
        await sb.storage
          .from('backups-db')
          .upload(`${pid}/historial/database_${hoy}.sqlite`, fileBuffer, {
            contentType: 'application/x-sqlite3',
            upsert: true
          })
        db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('ultimo_backup_historial',?)").run(hoy)

        // Rotación: conservar solo los últimos 30 backups diarios en la nube
        const { data: listado } = await sb.storage.from('backups-db').list(`${pid}/historial`)
        if (listado && listado.length > 30) {
          const sobrantes = listado
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, listado.length - 30)
            .map(f => `${pid}/historial/${f.name}`)
          if (sobrantes.length) await sb.storage.from('backups-db').remove(sobrantes)
        }
      }
    } catch (e) { console.error('⚠️ Historial nube:', e.message) }

    // Stats para mostrar en la UI
    const peluqueros = db.prepare('SELECT COUNT(*) as c FROM peluqueros').get().c
    const servicios  = db.prepare('SELECT COUNT(*) as c FROM servicios').get().c
    const atenciones = db.prepare('SELECT COUNT(*) as c FROM atenciones').get().c
    const gastos     = db.prepare('SELECT COUNT(*) as c FROM gastos').get().c
    const cierres    = db.prepare("SELECT COUNT(*) as c FROM cierre_caja WHERE estado='cerrada'").get().c

    return { ok: true, peluqueros, servicios, atenciones, gastos, cierres }
  } catch(e) { return { ok: false, error: e.message } }
}

async function restaurarDesdeNube() {
  try {
    const pid = await getPid()
    if (!pid) return { ok: false, error: 'No hay peluquería vinculada.' }

    const sb = await getSupabase()
    const { data, error } = await sb.storage
      .from('backups-db')
      .download(`${pid}/database.sqlite`)

    if (error) throw error
    if (!data) return { ok: false, error: 'No se encontró backup en la nube.' }

    // Convertir blob a buffer y guardar en temp
    const buffer = Buffer.from(await data.arrayBuffer())
    const tempPath = path.join(app.getPath('temp'), `peluapp_restore_${Date.now()}.sqlite`)
    fs.writeFileSync(tempPath, buffer)

    // Verificar que sea un sqlite válido
    try {
      const testDb = new Database(tempPath, { readonly: true })
      testDb.close()
    } catch {
      fs.unlinkSync(tempPath)
      return { ok: false, error: 'El archivo descargado no es una base de datos válida.' }
    }

    // Cerrar DB actual → reemplazar → reabrir
    db.close()
    fs.copyFileSync(tempPath, dbPath)
    try { fs.unlinkSync(tempPath) } catch {}
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    // Stats
    const peluqueros = db.prepare('SELECT COUNT(*) as c FROM peluqueros').get().c
    const servicios  = db.prepare('SELECT COUNT(*) as c FROM servicios').get().c
    const atenciones = db.prepare('SELECT COUNT(*) as c FROM atenciones').get().c
    const gastos     = db.prepare('SELECT COUNT(*) as c FROM gastos').get().c
    const cierres    = db.prepare("SELECT COUNT(*) as c FROM cierre_caja WHERE estado='cerrada'").get().c

    return { ok: true, peluqueros, servicios, atenciones, gastos, cierres }
  } catch(e) {
    // Si falló, intentar reabrir la DB original
    try { db = new Database(dbPath); db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON') } catch {}
    return { ok: false, error: e.message }
  }
}

async function syncSupabase() {
  try {
    const pid = await getPid()
    if (!pid) return
    const sb = await getSupabase()

    const pels  = db.prepare('SELECT * FROM peluqueros WHERE activo=1').all()
    const inP   = db.prepare('SELECT id FROM peluqueros WHERE activo=0').all()
    const servs = db.prepare('SELECT * FROM servicios WHERE activo=1').all()
    const inS   = db.prepare('SELECT id FROM servicios WHERE activo=0').all()

    await Promise.all([
      ...pels.map(p  => sb.from('peluqueros_web').upsert(
        { id: `${pid}_${p.id}`, nombre: p.nombre, activo: true, peluqueria_id: pid, local_id: p.id },
        { onConflict: 'id' }
      )),
      ...inP.map(p   => sb.from('peluqueros_web').update({ activo: false }).eq('id', `${pid}_${p.id}`)),
      ...servs.map(s => sb.from('servicios_web').upsert(
        { id: `${pid}_${s.id}`, nombre: s.nombre, precio: s.precio, activo: true, peluqueria_id: pid, local_id: s.id },
        { onConflict: 'id' }
      )),
      ...inS.map(s   => sb.from('servicios_web').update({ activo: false }).eq('id', `${pid}_${s.id}`)),
    ])

    console.log('✅ Sync Supabase OK')
  } catch(e) { console.error('⚠️ Sync:', e.message) }
}

async function syncTurnoManual(turno, eliminar = false) {
  try {
    const pid = await getPid()
    if (!pid || !(await getDeviceToken())) return
    await apiDevice('/api/admin/manual-turno', {
      method: 'POST',
      body: JSON.stringify({ id: turno.id, peluquero_id: turno.peluquero_id, fecha: turno.fecha, hora: turno.hora, eliminar }),
    })
  } catch(e) { console.error('⚠️ SyncTurno:', e.message) }
}

// PELUQUEROS
ipcMain.handle('peluqueros:getAll', ()=>db.prepare('SELECT * FROM peluqueros WHERE activo=1').all())
ipcMain.handle('peluqueros:create', async(_,d)=>{ const r=db.prepare('INSERT INTO peluqueros(nombre,comision,porcentaje_propina) VALUES(?,?,?)').run(d.nombre,d.comision,d.porcentaje_propina!=null?Number(d.porcentaje_propina):100); syncSupabase(); return r.lastInsertRowid })
ipcMain.handle('peluqueros:update', async(_,d)=>{ db.prepare('UPDATE peluqueros SET nombre=?,comision=?,porcentaje_propina=? WHERE id=?').run(d.nombre,d.comision,d.porcentaje_propina!=null?Number(d.porcentaje_propina):100,d.id); syncSupabase(); return true })
ipcMain.handle('peluqueros:delete', async(_,id)=>{ db.prepare('UPDATE peluqueros SET activo=0 WHERE id=?').run(id); syncSupabase(); return true })

// TRAMOS COMISIÓN
ipcMain.handle('tramosComision:getByPeluquero', (_, peluquero_id) =>
  db.prepare('SELECT * FROM peluquero_tramos WHERE peluquero_id=? ORDER BY monto_desde ASC').all(peluquero_id)
)
ipcMain.handle('tramosComision:getAll', () =>
  db.prepare('SELECT * FROM peluquero_tramos ORDER BY peluquero_id, monto_desde ASC').all()
)
ipcMain.handle('tramosComision:save', (_, { peluquero_id, tramos }) => {
  const del = db.prepare('DELETE FROM peluquero_tramos WHERE peluquero_id=?')
  const ins = db.prepare('INSERT INTO peluquero_tramos(peluquero_id, monto_desde, monto_pago) VALUES(?,?,?)')
  const tx  = db.transaction(() => {
    del.run(peluquero_id)
    for (const t of tramos) ins.run(peluquero_id, Number(t.monto_desde), Number(t.monto_pago))
  })
  tx()
  return true
})

// SERVICIOS
ipcMain.handle('servicios:getAll', ()=>db.prepare('SELECT * FROM servicios WHERE activo=1').all())
ipcMain.handle('servicios:create', async(_,d)=>{ const r=db.prepare('INSERT INTO servicios(nombre,precio) VALUES(?,?)').run(d.nombre,d.precio); syncSupabase(); return r.lastInsertRowid })
ipcMain.handle('servicios:update', async(_,d)=>{ db.prepare('UPDATE servicios SET nombre=?,precio=? WHERE id=?').run(d.nombre,d.precio,d.id); syncSupabase(); return true })
ipcMain.handle('servicios:delete', async(_,id)=>{ db.prepare('UPDATE servicios SET activo=0 WHERE id=?').run(id); syncSupabase(); return true })

// ATENCIONES
ipcMain.handle('atenciones:create',async(_,d)=> {
  const pf=d.metodo_pago==='mixto'?Number(d.monto_efectivo)+Number(d.monto_transferencia):
  Number(d.precio_cobrado); 
  const me=d.metodo_pago==='efectivo'?pf:d.metodo_pago==='mixto'?Number(d.monto_efectivo):0; 
  const mt=d.metodo_pago==='transferencia'?pf:d.metodo_pago==='mixto'?Number(d.monto_transferencia):0; 
  const sid=d.servicio_id?Number(d.servicio_id):null; 
  const r=db.prepare(
    `INSERT INTO atenciones(peluquero_id,servicio_id,precio_cobrado,metodo_pago,nombre_transferencia,fecha,hora,monto_efectivo,monto_transferencia, propina, propina_efectivo, propina_transferencia) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(Number(d.peluquero_id),sid,pf,d.metodo_pago,d.nombre_transferencia||null,d.fecha,d.hora,me,mt,d.propina, d.propina_efectivo, d.propina_transferencia); 
  return r.lastInsertRowid })

ipcMain.handle('atenciones:getByFecha',(_,f)=>db.prepare(`SELECT a.*,p.nombre as peluquero_nombre,s.nombre as servicio_nombre FROM atenciones a JOIN peluqueros p ON a.peluquero_id=p.id LEFT JOIN servicios s ON a.servicio_id=s.id WHERE a.fecha=? ORDER BY a.id DESC`).all(f))

ipcMain.handle('atenciones:getByRango',(_,{desde,hasta})=>db.prepare(`SELECT a.*,p.nombre as peluquero_nombre,s.nombre as servicio_nombre FROM atenciones a JOIN peluqueros p ON a.peluquero_id=p.id LEFT JOIN servicios s ON a.servicio_id=s.id WHERE a.fecha BETWEEN ? AND ? ORDER BY a.fecha DESC,a.hora DESC`).all(desde,hasta))

ipcMain.handle('atenciones:delete',async(_,id)=>{ db.prepare('DELETE FROM atenciones WHERE id=?').run(id); return true })

ipcMain.handle('atenciones:update',async(_,d)=>{ 
  const pf=d.metodo_pago==='mixto'?Number(d.monto_efectivo)+Number(d.monto_transferencia):Number(d.precio_cobrado); 
  const me=d.metodo_pago==='efectivo'?pf:d.metodo_pago==='mixto'?Number(d.monto_efectivo):0; 
  const mt=d.metodo_pago==='transferencia'?pf:d.metodo_pago==='mixto'?Number(d.monto_transferencia):0; 
  const sid=d.servicio_id?Number(d.servicio_id):null; db.prepare(`UPDATE atenciones SET peluquero_id=?,servicio_id=?,precio_cobrado=?,metodo_pago=?,nombre_transferencia=?,fecha=?,hora=?,monto_efectivo=?,monto_transferencia=?,propina=?, propina_efectivo=?, propina_transferencia=? WHERE id=?`).run(Number(d.peluquero_id),sid,pf,d.metodo_pago,d.nombre_transferencia||null,d.fecha,d.hora,me,mt,d.propina, d.propina_efectivo, d.propina_transferencia, d.id); return true })
  
ipcMain.handle('atenciones:getValesPorMes', () =>
  db.prepare(`
    SELECT strftime('%Y-%m', a.fecha) as mes,
           p.nombre as peluquero_nombre,
           COUNT(*) as cantidad
    FROM atenciones a
    JOIN peluqueros p ON a.peluquero_id = p.id
    WHERE a.metodo_pago = 'vale'
    GROUP BY mes, a.peluquero_id
    ORDER BY mes DESC, p.nombre ASC
  `).all()
)

// CONFIG
ipcMain.handle('config:get',(_,c)=>db.prepare('SELECT valor FROM configuracion WHERE clave=?').get(c)||null)
const CONFIG_CLAVES_PERMITIDAS = new Set(['password_liquidacion','password_dashboard','password_agenda','password_peluqueros','password_servicios','password_atenciones','password_reportes','password_caja','password_gastos','password_maestra','pregunta_seguridad','respuesta_seguridad','peluqueria_id','peluqueria_nombre','peluqueria_email','peluqueria_horario','nombre_app','sena_monto','sena_alias','sena_horas_vencimiento','sena_correo','remoto_peluqueria','remoto_nombre_contacto','remoto_contacto','remoto_telefono'])
ipcMain.handle('config:set',(_,{clave,valor})=>{ if(!CONFIG_CLAVES_PERMITIDAS.has(clave)) return false; db.prepare('INSERT OR REPLACE INTO configuracion(clave,valor) VALUES(?,?)').run(clave,valor); return true })

// CAJA
ipcMain.handle('caja:abrir',(_,d)=>{ const r=db.prepare("INSERT INTO cierre_caja(fecha,hora_apertura,estado) VALUES(?,?,'abierta')").run(d.fecha,d.hora_apertura); return r.lastInsertRowid })
ipcMain.handle('caja:getCajaAbierta',()=>db.prepare("SELECT * FROM cierre_caja WHERE estado='abierta' ORDER BY id DESC LIMIT 1").get()||null)
ipcMain.handle('caja:cerrar',async(_,d)=>{ db.prepare(`UPDATE cierre_caja SET hora_cierre=?,total_efectivo=?,total_transferencia=?,total_general=?,observaciones=?,estado='cerrada' WHERE id=?`).run(d.hora_cierre,d.total_efectivo,d.total_transferencia,d.total_general,d.observaciones||null,d.id); return true })
ipcMain.handle('caja:getCierres',(_,f)=>f?db.prepare("SELECT * FROM cierre_caja WHERE fecha=? AND estado='cerrada' ORDER BY hora_apertura ASC").all(f):db.prepare("SELECT * FROM cierre_caja WHERE estado='cerrada' ORDER BY fecha DESC,hora_apertura ASC").all())
ipcMain.handle('caja:getDetalleCierre',(_,{hora_apertura,hora_cierre,fecha})=>db.prepare(`SELECT a.*,p.nombre as peluquero_nombre,s.nombre as servicio_nombre FROM atenciones a JOIN peluqueros p ON a.peluquero_id=p.id LEFT JOIN servicios s ON a.servicio_id=s.id WHERE a.fecha=? AND a.hora>=? AND a.hora<=? ORDER BY a.hora ASC`).all(fecha,hora_apertura,hora_cierre))

// PERIODOS VALES (CAJA VALES)
ipcMain.handle('periodosVales:abrir', (_, d) => {
  const r = db.prepare("INSERT INTO periodos_vales(fecha_apertura, hora_apertura, estado) VALUES(?,?, 'abierta')").run(d.fecha_apertura, d.hora_apertura)
  return r.lastInsertRowid
})
ipcMain.handle('periodosVales:cerrar', (_, d) => {
  db.prepare("UPDATE periodos_vales SET fecha_cierre=?, hora_cierre=?, estado='cerrada' WHERE id=?").run(d.fecha_cierre, d.hora_cierre, d.id)
  return true
})
ipcMain.handle('periodosVales:getAbierto', () => {
  return db.prepare("SELECT * FROM periodos_vales WHERE estado='abierta' ORDER BY id DESC LIMIT 1").get() || null
})
ipcMain.handle('periodosVales:getTodos', () => {
  return db.prepare("SELECT * FROM periodos_vales ORDER BY id DESC").all()
})
ipcMain.handle('periodosVales:getVales', (_, p) => {
  if (p.estado === 'abierta') {
    return db.prepare(`
      SELECT p.nombre as peluquero_nombre, COUNT(*) as cantidad
      FROM atenciones a
      JOIN peluqueros p ON a.peluquero_id = p.id
      WHERE a.metodo_pago = 'vale'
        AND (a.fecha > ? OR (a.fecha = ? AND a.hora >= ?))
      GROUP BY a.peluquero_id
      ORDER BY p.nombre ASC
    `).all(p.fecha_apertura, p.fecha_apertura, p.hora_apertura)
  } else {
    return db.prepare(`
      SELECT p.nombre as peluquero_nombre, COUNT(*) as cantidad
      FROM atenciones a
      JOIN peluqueros p ON a.peluquero_id = p.id
      WHERE a.metodo_pago = 'vale'
        AND (a.fecha > ? OR (a.fecha = ? AND a.hora >= ?))
        AND (a.fecha < ? OR (a.fecha = ? AND a.hora <= ?))
      GROUP BY a.peluquero_id
      ORDER BY p.nombre ASC
    `).all(p.fecha_apertura, p.fecha_apertura, p.hora_apertura, p.fecha_cierre, p.fecha_cierre, p.hora_cierre)
  }
})


// BACKUP
ipcMain.handle('backup:abrirCarpeta',()=>{ const d=isDev?path.join(__dirname,'../backups'):path.join(app.getPath('userData'),'backups'); if(!fs.existsSync(d))fs.mkdirSync(d,{recursive:true}); shell.openPath(d); return true })
ipcMain.handle('backup:listar',()=>{ const d=isDev?path.join(__dirname,'../backups'):path.join(app.getPath('userData'),'backups'); if(!fs.existsSync(d))return []; return fs.readdirSync(d).filter(f=>f.startsWith('database_')&&f.endsWith('.sqlite')).map(f=>({nombre:f,fecha:fs.statSync(path.join(d,f)).mtime.toLocaleString('es-AR')})).sort((a,b)=>b.nombre.localeCompare(a.nombre)) })

// GASTOS
ipcMain.handle('gastos:getAll',()=>db.prepare('SELECT * FROM gastos ORDER BY fecha DESC,id DESC').all())
ipcMain.handle('gastos:getByRango',(_,{desde,hasta})=>db.prepare('SELECT * FROM gastos WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC,id DESC').all(desde,hasta))
ipcMain.handle('gastos:getResumenMensual',()=>{
  const g=db.prepare(`SELECT strftime('%Y-%m',fecha) as mes,SUM(monto) as total_gastos,COUNT(*) as cantidad_gastos FROM gastos GROUP BY mes`).all()
  // Se agrupa por el mes del período cubierto (desde), no por la fecha en que se pagó,
  // para que coincida con el mes de los ingresos que esa comisión generó.
  const p=db.prepare(`SELECT strftime('%Y-%m',desde) as mes,SUM(monto + COALESCE(propinas_pagadas,0)) as total_pagos,COUNT(*) as cantidad_pagos FROM pagos_peluqueros GROUP BY mes`).all()
  const i=db.prepare(`SELECT strftime('%Y-%m',fecha) as mes,SUM(precio_cobrado + COALESCE(propina_efectivo,0) + COALESCE(propina_transferencia,0)) as total_ingresos FROM atenciones WHERE metodo_pago != 'vale' GROUP BY mes`).all()
  const meses=new Set([...g.map(r=>r.mes),...p.map(r=>r.mes),...i.map(r=>r.mes)])
  return Array.from(meses).sort().reverse().map(mes=>{ const gr=g.find(r=>r.mes===mes)||{total_gastos:0,cantidad_gastos:0}; const pr=p.find(r=>r.mes===mes)||{total_pagos:0,cantidad_pagos:0}; const ir=i.find(r=>r.mes===mes)||{total_ingresos:0}; return {mes,total_gastos:Number(gr.total_gastos)||0,cantidad_gastos:Number(gr.cantidad_gastos)||0,total_pagos:Number(pr.total_pagos)||0,cantidad_pagos:Number(pr.cantidad_pagos)||0,total_ingresos:Number(ir.total_ingresos)||0} })
})
ipcMain.handle('gastos:create',async(_,d)=>{ const r=db.prepare('INSERT INTO gastos(descripcion,monto,fecha,categoria) VALUES(?,?,?,?)').run(d.descripcion,Number(d.monto),d.fecha,d.categoria||null); return r.lastInsertRowid })
ipcMain.handle('gastos:update',async(_,d)=>{ db.prepare('UPDATE gastos SET descripcion=?,monto=?,fecha=?,categoria=? WHERE id=?').run(d.descripcion,Number(d.monto),d.fecha,d.categoria||null,d.id); return true })
ipcMain.handle('gastos:delete',async(_,id)=>{ db.prepare('DELETE FROM gastos WHERE id=?').run(id); return true })

// PAGOS PELUQUEROS
ipcMain.handle('pagos:create',async(_,d)=>{ const r=db.prepare(`INSERT INTO pagos_peluqueros(peluquero_id,peluquero_nombre,desde,hasta,monto,fecha_pago,notas,propinas_pagadas) VALUES(?,?,?,?,?,?,?,?)`).run(d.peluquero_id,d.peluquero_nombre,d.desde,d.hasta,Number(d.monto),d.fecha_pago,d.notas||null,Number(d.propinas_pagadas||0)); return r.lastInsertRowid })
ipcMain.handle('pagos:getByMes',(_,mes)=>{ const [a,m]=mes.split('-'); const desde=`${a}-${m}-01`; const u=new Date(parseInt(a),parseInt(m),0).getDate(); const hasta=`${a}-${m}-${String(u).padStart(2,'0')}`; return db.prepare('SELECT * FROM pagos_peluqueros WHERE desde BETWEEN ? AND ? ORDER BY fecha_pago DESC,id DESC').all(desde,hasta) })
ipcMain.handle('pagos:getByPeluqueroYRango',(_,{peluquero_id,desde,hasta})=>db.prepare('SELECT * FROM pagos_peluqueros WHERE peluquero_id=? AND desde<=? AND hasta>=? ORDER BY fecha_pago DESC').all(peluquero_id,hasta,desde))
ipcMain.handle('pagos:getAllByPeluquero',(_,peluquero_id)=>db.prepare('SELECT * FROM pagos_peluqueros WHERE peluquero_id=? ORDER BY fecha_pago DESC, id DESC').all(peluquero_id))
ipcMain.handle('pagos:delete',async(_,id)=>{ db.prepare('DELETE FROM pagos_peluqueros WHERE id=?').run(id); return true })

// TURNOS MANUALES
ipcMain.handle('turnos:create',async(_,d)=>{ const r=db.prepare(`INSERT INTO turnos(peluquero_id,servicio_id,cliente_nombre,fecha,hora,estado,notas) VALUES(?,?,?,?,?,?,?)`).run(d.peluquero_id||null,d.servicio_id||null,d.cliente_nombre,d.fecha,d.hora,d.estado||'pendiente',d.notas||null); await syncTurnoManual({id:r.lastInsertRowid,peluquero_id:d.peluquero_id,fecha:d.fecha,hora:d.hora}); return r.lastInsertRowid })
ipcMain.handle('turnos:getByFecha',(_,f)=>db.prepare(`SELECT t.*,p.nombre as peluquero_nombre,s.nombre as servicio_nombre FROM turnos t LEFT JOIN peluqueros p ON t.peluquero_id=p.id LEFT JOIN servicios s ON t.servicio_id=s.id WHERE t.fecha=? ORDER BY t.hora ASC`).all(f))
ipcMain.handle('turnos:getByRango',(_,{desde,hasta})=>db.prepare(`SELECT t.*,p.nombre as peluquero_nombre,s.nombre as servicio_nombre FROM turnos t LEFT JOIN peluqueros p ON t.peluquero_id=p.id LEFT JOIN servicios s ON t.servicio_id=s.id WHERE t.fecha BETWEEN ? AND ? ORDER BY t.fecha ASC,t.hora ASC`).all(desde,hasta))
ipcMain.handle('turnos:updateEstado',(_,{id,estado})=>{ db.prepare('UPDATE turnos SET estado=? WHERE id=?').run(estado,id); return true })
ipcMain.handle('turnos:delete',async(_,id)=>{ const t=db.prepare('SELECT * FROM turnos WHERE id=?').get(id); db.prepare('DELETE FROM turnos WHERE id=?').run(id); if(t) await syncTurnoManual(t,true); return true })

// PELUQUERÍA WEB
ipcMain.handle('peluqueria:getConfig',async()=>{
  const id     = db.prepare("SELECT valor FROM configuracion WHERE clave='peluqueria_id'").get()
  const nombre = db.prepare("SELECT valor FROM configuracion WHERE clave='peluqueria_nombre'").get()
  const email  = db.prepare("SELECT valor FROM configuracion WHERE clave='peluqueria_email'").get()
  let codigo   = db.prepare("SELECT valor FROM configuracion WHERE clave='peluqueria_codigo'").get()
  // Instalaciones vinculadas antes de que existiera el código corto (ver
  // migración 011) no lo tienen guardado local todavía — se completa solo
  // acá la primera vez, sin que el peluquero tenga que re-vincular nada.
  if (!codigo?.valor && id?.valor) {
    try {
      const sb = await getSupabase()
      const { data } = await sb.from('peluquerias').select('codigo').eq('id', id.valor).maybeSingle()
      if (data?.codigo) {
        db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_codigo',?)").run(data.codigo)
        codigo = { valor: data.codigo }
      }
    } catch {}
  }
  const horarioRaw = db.prepare("SELECT valor FROM configuracion WHERE clave='peluqueria_horario'").get()
  const senaMonto  = db.prepare("SELECT valor FROM configuracion WHERE clave='sena_monto'").get()
  const senaAlias  = db.prepare("SELECT valor FROM configuracion WHERE clave='sena_alias'").get()
  const senaHoras  = db.prepare("SELECT valor FROM configuracion WHERE clave='sena_horas_vencimiento'").get()
  const senaCorreo = db.prepare("SELECT valor FROM configuracion WHERE clave='sena_correo'").get()
  const senaActiva = db.prepare("SELECT valor FROM configuracion WHERE clave='sena_activa'").get()
  let horario = null
  try { horario = horarioRaw ? JSON.parse(horarioRaw.valor) : null } catch {}
  return {
    id:id?.valor||'', nombre:nombre?.valor||'', email:email?.valor||'', codigo:codigo?.valor||'', horario,
    sena_monto: senaMonto?.valor || '',
    sena_alias: senaAlias?.valor || '',
    sena_horas_vencimiento: senaHoras?.valor || '24',
    sena_correo: senaCorreo?.valor || '',
    // Si nunca se guardó, se asume activa: asi las peluquerias que ya venian
    // con monto y alias cargados siguen pidiendo seña igual que antes.
    sena_activa: senaActiva ? senaActiva.valor === '1' : true,
  }
})
ipcMain.handle('peluqueria:guardarSena', async (_, { sena_monto, sena_alias, sena_horas_vencimiento, sena_correo, sena_activa }) => {
  try {
    // Si no viene el dato (version vieja del front) se asume activa.
    const activa = sena_activa !== false

    // Guardar en local
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('sena_monto',?)").run(String(sena_monto || ''))
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('sena_alias',?)").run(sena_alias || '')
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('sena_horas_vencimiento',?)").run(String(sena_horas_vencimiento || 24))
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('sena_correo',?)").run(sena_correo || '')
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('sena_activa',?)").run(activa ? '1' : '0')

    // Sincronizar con Supabase si está registrada
    const pid = await getPid()
    if (pid) {
      const sb = await getSupabase()
      await sb.from('peluquerias').update({
        sena_monto: sena_monto ? Number(sena_monto) : null,
        sena_alias: sena_alias || null,
        sena_horas_vencimiento: Number(sena_horas_vencimiento) || 24,
        sena_correo: sena_correo || null,
        sena_activa: activa,
      }).eq('id', pid)
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})
// Registra (o recupera, si el email ya existe) la fila en `peluquerias` y deja esta instalación
// vinculada localmente. Se llama únicamente desde la activación remota de licencia (ver
// consultarActivacionRemota) — ya conoce el email del cliente y vincula sola, sin pedirle nada. La
// activación manual (.lic por mail) no crea la cuenta acá: el cliente vincula con "Ya tengo ID"
// usando el ID/email que el vendedor ya generó junto con la licencia (ver generar-licencia.js en
// peluapp-admin). No hay ningún camino para que alguien se autorregistre una peluquería nueva desde
// la app sin pasar por la licencia.
async function vincularPeluqueriaPorEmail(nombre, email, clave) {
  const sb = await getSupabase()

  // Intentar insertar; si viola unique constraint, recuperar el existente
  const {data:nueva, error:errInsert} = await sb.from('peluquerias').insert({nombre,email,activo:true}).select().maybeSingle()

  let data
  if (errInsert) {
    // Si es error de clave duplicada, buscar el registro existente
    if (errInsert.code === '23505') {
      const {data:existente, error:errSelect} = await sb.from('peluquerias').select('*').eq('email', email).maybeSingle()
      if (errSelect || !existente) throw new Error('Email ya registrado pero no se pudo recuperar. Usá "Ya tengo ID".')
      data = existente
    } else {
      throw errInsert
    }
  } else {
    data = nueva
  }

  const yaExistia = !nueva

  // Si la peluquería ya existe y tiene una clave de panel configurada, recuperarla
  // solo por email (sin pedir esa clave) sería el mismo hueco que ya cerramos en
  // /api/device/vincular — por eso acá SÍ hay que revisar si la vinculación anduvo
  // de verdad antes de guardar nada localmente o de avisar que "se recuperó".
  const device = await vincularDevice(data.id)
  if (!device.ok) {
    const err = new Error(device.requiereClave
      ? 'Esta peluquería ya está registrada y tiene una clave de panel configurada. Usá "Ya tengo ID" con el ID o el email, y esa clave.'
      : (device.error || 'No se pudo vincular el dispositivo.'))
    err.requiereClave = !!device.requiereClave
    throw err
  }

  db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_id',?)").run(data.id)
  db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_nombre',?)").run(data.nombre)
  db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_email',?)").run(email)
  db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_codigo',?)").run(data.codigo || '')
  // Recién creada (no recuperada por email): si nos pasaron una clave para
  // el panel, la dejamos configurada ya mismo — es el único momento en que
  // nadie más pudo haber visto este id todavía.
  if (!yaExistia && clave) {
    await establecerClaveInicial(data.id, clave)
  }
  await syncSupabase()
  return { id: data.id, yaExistia }
}
ipcMain.handle('admin:estadoClave', async () => {
  try {
    const pid = await getPid()
    if (!pid) return { tieneClave: null }
    const r = await fetch(`${WEB_URL}/api/device/set-clave?peluqueriaId=${pid}`)
    const d = await r.json()
    return { tieneClave: r.ok ? !!d.tieneClave : null }
  } catch { return { tieneClave: null } }
})
ipcMain.handle('admin:setClaveInicial', async (_, { clave }) => {
  try {
    const pid = await getPid()
    if (!pid) return { ok: false, error: 'Vinculá tu peluquería primero.' }
    return await establecerClaveInicial(pid, clave)
  } catch (e) { return { ok: false, error: e.message } }
})
ipcMain.handle('peluqueria:vincular',async(_,{peluqueriaId,clave})=>{
  try {
    const idOrEmail = String(peluqueriaId || '').trim()
    const sb=await getSupabase()
    const {data,error}= idOrEmail.includes('@')
      ? await sb.from('peluquerias').select('*').eq('email',idOrEmail).maybeSingle()
      : await sb.from('peluquerias').select('*').eq('id',idOrEmail).maybeSingle()
    if(error||!data) return { ok:false, error:'No encontramos ninguna peluquería con ese ID o email.' }

    const device = await vincularDevice(data.id, clave)
    if (!device.ok) {
      // No se guarda nada localmente si la clave falta o es incorrecta —
      // así la pantalla puede simplemente pedirla de nuevo, sin dejar la
      // app "medio vinculada" a una peluquería sin el token que necesita.
      return { ok:false, error: device.error || 'No pudimos vincular.', requiereClave: !!device.requiereClave }
    }

    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_id',?)").run(data.id)
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_nombre',?)").run(data.nombre)
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_email',?)").run(data.email)
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_codigo',?)").run(data.codigo || '')
    await syncSupabase()
    return { ok:true, id:data.id, link:`${WEB_URL}/?p=${data.id}` }
  } catch(e){ return { ok:false, error:e.message } }
})

ipcMain.handle('peluqueria:actualizarNombre', async (_, { nombre }) => {
  try {
    const pid = await getPid()
    if (!pid) return { ok: false, error: 'No hay peluquería vinculada.' }

    const sb = await getSupabase()
    const { error } = await sb
      .from('peluquerias')
      .update({ nombre })
      .eq('id', pid)

    if (error) throw error

    // Actualizar también en local
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_nombre',?)").run(nombre)

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('turnosWeb:getPendientes',async()=>{
  try {
    const pid=await getPid(); if(!pid) return []
    const { pendientes } = await apiDevice('/api/admin/turnos')
    return pendientes
  } catch(e){ return [] }
})

ipcMain.handle('turnosWeb:getSenas', async () => {
  try {
    const pid = await getPid()
    if (!pid) return []
    const { senas } = await apiDevice('/api/admin/senas')
    return senas
  } catch (e) { return [] }
})

ipcMain.handle('turnosWeb:getTodos',async(_,mes)=>{
  try {
    const pid=await getPid(); if(!pid) return []
    const [a,m]=mes.split('-').map(Number)
    const desde=`${a}-${String(m).padStart(2,'0')}-01`
    const u=new Date(a,m,0).getDate()
    const hasta=`${a}-${String(m).padStart(2,'0')}-${String(u).padStart(2,'0')}`
    const { turnos } = await apiDevice(`/api/admin/mes?desde=${desde}&hasta=${hasta}`)
    return turnos
  } catch(e){ return [] }
})

ipcMain.handle('turnosWeb:responder', async (_, { id, accion, fecha_propuesta, hora_propuesta, motivo }) => {
  try {
    // /api/admin/responder hace el update en Supabase, inserta/borra turnos_senas
    // y manda la notificación push al cliente (mismo endpoint que usa el panel web).
    const d = await apiDevice('/api/admin/responder', {
      method: 'POST',
      body: JSON.stringify({ id, accion, fecha_propuesta, hora_propuesta, motivo }),
    })
    const turno = d.turno

    if (accion === 'confirmado' && !d.esperandoSena) {
      const rTurno = db.prepare(`
        INSERT INTO turnos(peluquero_id, servicio_id, cliente_nombre, fecha, hora, estado, notas, turno_web_id)
        VALUES (?, ?, ?, ?, ?, 'confirmado', 'Reserva web', ?)
      `).run(
        turno.peluquero_id || null,
        turno.servicio_id  || null,
        turno.cliente_nombre,
        turno.fecha,
        turno.hora?.substring(0, 5),
        turno.id
      )
      await syncTurnoManual({ id: rTurno.lastInsertRowid, peluquero_id: turno.peluquero_id, fecha: turno.fecha, hora: turno.hora?.substring(0, 5) })
    }

    if (accion === 'cancelado') {
      const local = db.prepare('SELECT id FROM turnos WHERE turno_web_id = ?').get(id)
      if (local) {
        db.prepare('DELETE FROM turnos WHERE id = ?').run(local.id)
        await syncTurnoManual(local, true)
      }
    }

    return { ok: true, esperandoSena: d.esperandoSena, push: d.push }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('turnosWeb:confirmarSena', async (_, turnoSenaId) => {
  try {
    // /api/admin/senas (POST) marca la seña pagada, confirma el turno_web y
    // manda la notificación push de confirmación al cliente.
    const { sena, push } = await apiDevice('/api/admin/senas', {
      method: 'POST',
      body: JSON.stringify({ id: turnoSenaId }),
    })

    // Crear turno local si no existe
    const yaExiste = db.prepare('SELECT id FROM turnos WHERE turno_web_id=?').get(sena.turno_web_id)
    if (!yaExiste) {
      const rSena = db.prepare(`
        INSERT INTO turnos(peluquero_id, servicio_id, cliente_nombre, fecha, hora, estado, notas, turno_web_id)
        VALUES (?, ?, ?, ?, ?, 'confirmado', 'Reserva web (seña confirmada)', ?)
      `).run(
        sena.peluquero_id || null,
        null,
        sena.cliente_nombre,
        sena.fecha,
        sena.hora,
        sena.turno_web_id
      )
      await syncTurnoManual({ id: rSena.lastInsertRowid, peluquero_id: sena.peluquero_id, fecha: sena.fecha, hora: sena.hora })
    } else {
      await syncTurnoManual({ id: yaExiste.id, peluquero_id: sena.peluquero_id, fecha: sena.fecha, hora: sena.hora })
    }

    return { ok: true, push }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('turnosWeb:sincronizarCancelados', async () => {
  try {
    const pid = await getPid()
    if (!pid) return { ok: true, eliminados: 0 }

    const { cancelados } = await apiDevice('/api/admin/reconciliar')

    if (!cancelados?.length) return { ok: true, eliminados: 0 }

    let eliminados = 0
    for (const t of cancelados) {
      const local = db.prepare('SELECT id FROM turnos WHERE turno_web_id = ?').get(t.id)
      if (local) {
        db.prepare('DELETE FROM turnos WHERE id = ?').run(local.id)
        eliminados++
      }
    }

    return { ok: true, eliminados }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('turnosWeb:sincronizarConfirmados', async () => {
  try {
    const pid = await getPid()
    if (!pid) return { ok: true, creados: 0 }

    const { confirmados } = await apiDevice('/api/admin/reconciliar')

    if (!confirmados?.length) return { ok: true, creados: 0 }

    let creados = 0
    for (const t of confirmados) {
      const existe = db.prepare('SELECT id FROM turnos WHERE turno_web_id = ?').get(t.id)
      if (!existe) {
        // Si hubo modificación, usar la fecha/hora propuesta; si no, la original
        const fecha = t.fecha_propuesta || t.fecha
        const hora  = (t.hora_propuesta || t.hora)?.substring(0, 5)

        const rSync = db.prepare(`
          INSERT INTO turnos(peluquero_id, servicio_id, cliente_nombre, fecha, hora, estado, notas, turno_web_id)
          VALUES (?, ?, ?, ?, ?, 'confirmado', 'Reserva web', ?)
        `).run(t.peluquero_id || null, t.servicio_id || null, t.cliente_nombre, fecha, hora, t.id)
        await syncTurnoManual({ id: rSync.lastInsertRowid, peluquero_id: t.peluquero_id, fecha, hora })
        creados++
      }
    }

    return { ok: true, creados }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})



// DÍAS BLOQUEADOS
ipcMain.handle('diasBloqueados:getAll', () => db.prepare('SELECT * FROM dias_bloqueados ORDER BY fecha ASC').all())
ipcMain.handle('diasBloqueados:create', async (_, { fecha, motivo }) => {
  db.prepare('INSERT OR IGNORE INTO dias_bloqueados(fecha,motivo) VALUES(?,?)').run(fecha, motivo || null)
  await syncDiasBloqueados(); return true
})
ipcMain.handle('diasBloqueados:delete', async (_, fecha) => {
  db.prepare('DELETE FROM dias_bloqueados WHERE fecha=?').run(fecha)
  await syncDiasBloqueados(); return true
})

// BLOQUEOS POR PELUQUERO
ipcMain.handle('bloqueosPeluquero:getAll', (_, peluquero_id) => {
  if (peluquero_id) return db.prepare('SELECT * FROM bloqueos_peluquero WHERE peluquero_id=? ORDER BY desde ASC').all(peluquero_id)
  return db.prepare('SELECT b.*, p.nombre as peluquero_nombre FROM bloqueos_peluquero b JOIN peluqueros p ON b.peluquero_id=p.id ORDER BY b.desde ASC').all()
})
ipcMain.handle('bloqueosPeluquero:create', async (_, { peluquero_id, desde, hasta, motivo }) => {
  const r = db.prepare('INSERT INTO bloqueos_peluquero(peluquero_id, desde, hasta, motivo) VALUES(?,?,?,?)').run(peluquero_id, desde, hasta, motivo || null)
  await syncBloqueosPeluquero()
  return r.lastInsertRowid
})
ipcMain.handle('bloqueosPeluquero:delete', async (_, id) => {
  db.prepare('DELETE FROM bloqueos_peluquero WHERE id=?').run(id)
  await syncBloqueosPeluquero()
  return true
})

// LICENCIA
function getMachineId() {
  try {
    if (process.platform === 'win32') {
      const out = execSync('reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid', { encoding: 'utf8' })
      return out.split('REG_SZ')[1]?.trim()
    } else if (process.platform === 'darwin') {
      const out = execSync("ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID", { encoding: 'utf8' })
      return out.split('"')[3]
    } else {
      return fs.readFileSync('/etc/machine-id', 'utf8').trim()
    }
  } catch {
    return crypto.createHash('sha256').update(os.hostname() + (os.cpus()[0]?.model || '')).digest('hex')
  }
}

function verificarLicencia() {
  try {
    const licPath = isDev
      ? path.join(__dirname, '../licencia.lic')
      : path.join(app.getPath('userData'), 'licencia.lic')

    if (!fs.existsSync(licPath)) return { valida: false, mensaje: 'No se encontró archivo de licencia.' }

    const contenido = fs.readFileSync(licPath, 'utf-8').trim()
    const decoded = Buffer.from(contenido, 'base64').toString('utf-8')
    const datos = JSON.parse(decoded)

    // Verificar machine ID si la licencia lo tiene
    if (datos.machineId) {
      const machineId = getMachineId()
      if (datos.machineId !== machineId) {
        return { valida: false, mensaje: 'Esta licencia pertenece a otra máquina.' }
      }
    }

    // Verificar firma (incluye machineId si existe)
    const firmaBase = datos.machineId
      ? `peluapp|${datos.machineId}|${datos.desde}|${datos.vence}`
      : `peluapp|${datos.desde}|${datos.vence}`

    const firma = crypto.createHmac('sha256', SECRET_KEY).update(firmaBase).digest('hex')
    if (firma !== datos.firma) return { valida: false, mensaje: 'Licencia inválida o modificada.' }

    const ahora = new Date()
    const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}`
    const fechaHoy = new Date(hoy + 'T00:00:00Z')
    const fechaDesde = new Date(datos.desde + 'T00:00:00Z')
    const fechaVence = new Date(datos.vence + 'T00:00:00Z')

    const uf = db.prepare("SELECT valor FROM configuracion WHERE clave='ultima_fecha_uso'").get()
    if (uf && hoy < uf.valor) return { valida: false, mensaje: 'Fecha del sistema manipulada.' }

    const du = db.prepare("SELECT valor FROM configuracion WHERE clave='dias_usados'").get()
    const diasUsados = du ? parseInt(du.valor) : 0
    const total = Math.round((fechaVence - fechaDesde) / (1000 * 60 * 60 * 24)) + 1
    if (diasUsados > total) return { valida: false, mensaje: 'Licencia vencida por días de uso excedidos.' }

    // Incrementar días usados solo si es un día nuevo
    if (!uf || hoy !== uf.valor) {
      db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('dias_usados',?)").run(String(diasUsados + 1))
    }
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('ultima_fecha_uso',?)").run(hoy)

    if (fechaHoy < fechaDesde) return { valida: false, mensaje: `La licencia comienza el ${datos.desde}.` }
    if (fechaHoy > fechaVence) return { valida: false, mensaje: `Licencia vencida el ${datos.vence}.` }

    const diasRestantes = Math.round((fechaVence - fechaHoy) / (1000 * 60 * 60 * 24)) + 1
    return { valida: true, mensaje: `Licencia válida. ${diasRestantes} días restantes.`, vence: datos.vence, diasRestantes }
  } catch (e) {
    return { valida: false, mensaje: 'Error al leer la licencia: ' + e.message }
  }
}

// ACTIVACIÓN REMOTA
// Camino opcional para peluquerías con internet: en vez de recibir el .lic por mail y cargarlo a
// mano, la app manda una "solicitud de activación" a Supabase (mismo proyecto que ya usa esta app
// para turnos web y backups) y hace polling contra una función RPC hasta que la activen desde el
// panel. El .lic manual sigue existiendo tal cual, sin cambios.
async function solicitarActivacionRemota(datos, machineId) {
  try {
    const sb = await getSupabase()
    const { error } = await sb.from('peluqueria_solicitudes').insert({
      peluqueria: datos.peluqueria,
      nombre_contacto: datos.nombreContacto || null,
      contacto: datos.contacto,
      telefono: datos.telefono || null,
      machine_id: machineId,
      nombre_maquina: os.hostname(),
      estado: 'pendiente',
    })
    if (error) return { success: false, error: 'No se pudo enviar la solicitud.' }
    return { success: true }
  } catch {
    return { success: false, error: 'No se pudo conectar. Revisá tu conexión a internet.' }
  }
}

async function consultarActivacionRemota(machineId) {
  try {
    const sb = await getSupabase()
    const { data, error } = await sb.rpc('peluqueria_estado_solicitud', { p_machine_id: machineId })
    const fila = !error && data?.[0]
    if (!fila) return { valida: false, pendiente: true }

    if (fila.estado === 'rechazada') {
      return { valida: false, mensaje: 'La solicitud de activación remota fue rechazada. Contactá a tu proveedor.' }
    }

    if (fila.estado === 'activada' && fila.lic_base64) {
      const lp = isDev ? path.join(__dirname, '../licencia.lic') : path.join(app.getPath('userData'), 'licencia.lic')
      fs.writeFileSync(lp, fila.lic_base64)
      db.prepare("DELETE FROM configuracion WHERE clave='ultima_fecha_uso'").run()
      db.prepare("DELETE FROM configuracion WHERE clave='dias_usados'").run()

      // Precarga el nombre del negocio con el que se generó la licencia, salvo que ya haya uno
      // personalizado — el .lic firmado no trae el nombre, así que solo se puede hacer acá.
      if (fila.peluqueria) {
        const actual = db.prepare("SELECT valor FROM configuracion WHERE clave='nombre_app'").get()
        if (!actual?.valor) db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('nombre_app',?)").run(fila.peluqueria)
      }

      // Si la activación trae email, ya existe (o se crea) su fila en `peluquerias` del lado del
      // panel (ver generar-licencia.js) — la vinculamos acá para que Configuración → Web y Backups
      // ya la muestre lista, sin que el cliente tenga que "Registrar" de nuevo con el mismo email.
      const yaVinculada = db.prepare("SELECT valor FROM configuracion WHERE clave='peluqueria_id'").get()?.valor
      if (fila.contacto && !yaVinculada) {
        try {
          await vincularPeluqueriaPorEmail(fila.peluqueria, fila.contacto)
        } catch (e) {
          console.error('No se pudo vincular peluquerias automáticamente tras la activación remota:', e.message)
        }
      }

      return verificarLicencia()
    }

    return { valida: false, pendiente: true }
  } catch {
    return { valida: false, pendiente: true }
  }
}

// BACKUP NUBE
ipcMain.handle('backup:syncNube',      async () => syncBackupCompleto())
ipcMain.handle('backup:restaurarNube', async () => restaurarDesdeNube())
ipcMain.handle('backup:getUltimoSync', () => {
  return db.prepare("SELECT valor FROM configuracion WHERE clave='ultimo_backup_nube'").get()?.valor || null
})
ipcMain.handle('backup:existeEnNube', async () => {
  try {
    const pid = await getPid()
    if (!pid) return { existe: false }
    const sb = await getSupabase()
    const { data, error } = await sb.storage
      .from('backups-db')
      .list(pid)
    if (error) return { existe: false }
    return { existe: data?.some(f => f.name === 'database.sqlite') || false }
  } catch { return { existe: false } }
})

// LICENCIAS
ipcMain.handle('licencia:getMachineId', () => getMachineId())
ipcMain.handle('licencia:verificar',()=>verificarLicencia())
ipcMain.handle('licencia:cargar',(_,ruta)=>{ try{ const lp=isDev?path.join(__dirname,'../licencia.lic'):path.join(app.getPath('userData'),'licencia.lic'); fs.copyFileSync(ruta,lp); db.prepare("DELETE FROM configuracion WHERE clave='ultima_fecha_uso'").run(); db.prepare("DELETE FROM configuracion WHERE clave='dias_usados'").run(); return verificarLicencia() }catch{return {valida:false,mensaje:'Error al cargar el archivo.'}} })
ipcMain.handle('licencia:solicitarRemota', (_, datos) => solicitarActivacionRemota(datos, getMachineId()))
ipcMain.handle('licencia:consultarRemota', () => consultarActivacionRemota(getMachineId()))

// ACTUALIZADOR
ipcMain.handle('updater:check',async()=>{ try{ const r=await autoUpdater.checkForUpdates(); return {disponible:r.updateInfo.version!==app.getVersion(),version:r.updateInfo.version} }catch(e){return {disponible:false,mensaje:e.message}} })
ipcMain.handle('updater:download',()=>{ autoUpdater.downloadUpdate(); return true })
autoUpdater.on('download-progress',(p)=>{ if(mainWindow) mainWindow.webContents.send('updater:download-progress',{percent:Math.floor(p.percent),transferred:p.transferred,total:p.total}) })
// Antes se llamaba a quitAndInstall() en el mismo instante que se avisaba al
// renderer — la ventana se cerraba para reiniciar antes de que el modal de
// "Descarga completa" llegara a pintarse, así que en vez del diseño con blur
// se veía un blanco (la ventana cerrándose). Este delay le da tiempo real al
// mensaje "la app se reiniciará automáticamente" de cumplir lo que promete.
autoUpdater.on('update-downloaded',()=>{ if(mainWindow) mainWindow.webContents.send('updater:download-complete'); setTimeout(()=>autoUpdater.quitAndInstall(), 3500) })
// Sin esto, si la descarga falla (404 por un nombre de archivo que no
// coincide, un hash que no matchea, etc.) la ventana se queda mostrando
// "Descargando... 0%" para siempre, porque nunca llega ni download-progress
// ni update-downloaded — y no había forma de saber por qué.
autoUpdater.on('error',(err)=>{ if(mainWindow) mainWindow.webContents.send('updater:download-error',{mensaje:err?.message||String(err)}) })

// LOGO Y NOMBRE
function getLogoBasePath(){ const b=isDev?path.join(app.getPath('userData'),'dev'):app.getPath('userData'); if(!fs.existsSync(b))fs.mkdirSync(b,{recursive:true}); return b }
ipcMain.handle('config:getNombreApp',()=>db.prepare("SELECT valor FROM configuracion WHERE clave='nombre_app'").get()?.valor||'PeluApp')
ipcMain.handle('config:setNombreApp',(_,n)=>{ db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('nombre_app',?)").run(n); return true })
ipcMain.handle('config:getLogo',()=>{ const lp=path.join(getLogoBasePath(),'logo.png'); if(fs.existsSync(lp)) return `data:image/png;base64,${fs.readFileSync(lp).toString('base64')}`; return null })
ipcMain.handle('config:setLogo',(_,ruta)=>{ try{ const lp=path.join(getLogoBasePath(),'logo.png'); if(ruta===null){if(fs.existsSync(lp))fs.unlinkSync(lp);return {ok:true}}; fs.copyFileSync(ruta,lp); return {ok:true} }catch{return {ok:false}} })
ipcMain.handle('app:getVersion',()=>app.getVersion())
ipcMain.handle('app:abrirLink', (e, url) => { shell.openExternal(url) })

const CHANGELOG = require('./changelog')

ipcMain.handle('app:checkChangelog', () => {
  const versionActual = app.getVersion()
  const archivoVisto = path.join(app.getPath('userData'), isDev ? 'dev' : '', 'last-seen-version.json')
  let versionVista = null
  try { versionVista = JSON.parse(fs.readFileSync(archivoVisto, 'utf8')).version } catch {}
  if (versionVista === versionActual) return null
  fs.writeFileSync(archivoVisto, JSON.stringify({ version: versionActual }), 'utf8')
  return { version: versionActual, items: CHANGELOG[versionActual] || [] }
})

// Historial completo, para poder releer las novedades desde Configuración
// (a diferencia de app:checkChangelog, esto no marca nada como "visto").
ipcMain.handle('app:getChangelogCompleto', () => CHANGELOG)

// PDF
ipcMain.handle('pdf:guardar',async(_,{buffer,nombreSugerido})=>{ const {filePath,canceled}=await dialog.showSaveDialog(mainWindow,{title:'Guardar PDF',defaultPath:nombreSugerido,filters:[{name:'PDF',extensions:['pdf']}]}); if(canceled||!filePath) return {ok:false}; fs.writeFileSync(filePath,Buffer.from(buffer)); return {ok:true,filePath} })

// DASHBOARD
ipcMain.handle('dashboard:getResumen',()=>{
  const hoy=new Date(); const fechaHoy=`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`
  const ultimos7=[]; for(let i=6;i>=0;i--){const d=new Date(hoy);d.setDate(d.getDate()-i);ultimos7.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)}
  const atencionesHoy=db.prepare(`SELECT a.*,p.nombre as peluquero_nombre,s.nombre as servicio_nombre FROM atenciones a JOIN peluqueros p ON a.peluquero_id=p.id LEFT JOIN servicios s ON a.servicio_id=s.id WHERE a.fecha=?`).all(fechaHoy)
  const ingresosPorDia=ultimos7.map(f=>{const r=db.prepare('SELECT COALESCE(SUM(precio_cobrado),0) as total,COALESCE(SUM(COALESCE(propina_efectivo,0)+COALESCE(propina_transferencia,0)),0) as propinas FROM atenciones WHERE fecha=?').get(f);return{fecha:f,total:r.total,propinas:r.propinas}})
  const pm=`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-01`
  const topPeluqueros=db.prepare(`SELECT p.nombre,COUNT(*) as atenciones,SUM(a.precio_cobrado) as total FROM atenciones a JOIN peluqueros p ON a.peluquero_id=p.id WHERE a.fecha BETWEEN ? AND ? GROUP BY a.peluquero_id ORDER BY total DESC LIMIT 5`).all(pm,fechaHoy)
  const ultimoCierre=db.prepare("SELECT * FROM cierre_caja WHERE estado='cerrada' ORDER BY id DESC LIMIT 1").get()||null
  const cajaAbierta=db.prepare("SELECT * FROM cierre_caja WHERE estado='abierta' ORDER BY id DESC LIMIT 1").get()||null
  const resMes=db.prepare("SELECT COALESCE(SUM(precio_cobrado),0) as total,COALESCE(SUM(COALESCE(propina_efectivo,0)+COALESCE(propina_transferencia,0)),0) as propinas FROM atenciones WHERE fecha BETWEEN ? AND ? AND metodo_pago!='vale'").get(pm,fechaHoy)
  const totalMes=Number(resMes.total)||0
  const propinasMes=Number(resMes.propinas)||0
  // ── Métricas comparativas / "inteligentes" ──
  const diaHoy=hoy.getDate()
  const ultimoDiaMesAnt=new Date(hoy.getFullYear(),hoy.getMonth(),0).getDate()
  const diaClamp=Math.min(diaHoy,ultimoDiaMesAnt)
  const mesAntBase=new Date(hoy.getFullYear(),hoy.getMonth()-1,1)
  const pmAnt=`${mesAntBase.getFullYear()}-${String(mesAntBase.getMonth()+1).padStart(2,'0')}-01`
  const pmAntHasta=`${mesAntBase.getFullYear()}-${String(mesAntBase.getMonth()+1).padStart(2,'0')}-${String(diaClamp).padStart(2,'0')}`
  const totalMesAnterior=Number(db.prepare("SELECT COALESCE(SUM(precio_cobrado),0) as total FROM atenciones WHERE fecha BETWEEN ? AND ? AND metodo_pago!='vale'").get(pmAnt,pmAntHasta).total)||0
  const atencionesMes=Number(db.prepare("SELECT COUNT(*) as c FROM atenciones WHERE fecha BETWEEN ? AND ? AND metodo_pago!='vale'").get(pm,fechaHoy).c)||0
  const ticketPromedioMes=atencionesMes>0?Math.round(totalMes/atencionesMes):0
  const topServicios=db.prepare(`SELECT COALESCE(s.nombre,'Sin servicio') as nombre,COUNT(*) as cantidad,COALESCE(SUM(a.precio_cobrado),0) as total FROM atenciones a LEFT JOIN servicios s ON a.servicio_id=s.id WHERE a.fecha BETWEEN ? AND ? AND a.metodo_pago!='vale' GROUP BY a.servicio_id ORDER BY total DESC LIMIT 5`).all(pm,fechaHoy)
  // ── Patrones históricos (todo el historial, sin vales): día de semana y hora pico ──
  const porDiaSemana=db.prepare(`SELECT CAST(strftime('%w',fecha) AS INTEGER) as dow,COUNT(*) as atenciones,COALESCE(SUM(precio_cobrado),0) as total,COUNT(DISTINCT fecha) as dias FROM atenciones WHERE metodo_pago!='vale' GROUP BY dow`).all()
  const porHora=db.prepare(`SELECT CAST(substr(hora,1,2) AS INTEGER) as hora,COUNT(*) as cantidad,COALESCE(SUM(precio_cobrado),0) as total FROM atenciones WHERE metodo_pago!='vale' AND hora IS NOT NULL AND hora!='' GROUP BY CAST(substr(hora,1,2) AS INTEGER) ORDER BY 1`).all()
  return {fechaHoy,atencionesHoy,totalHoy:atencionesHoy.reduce((a,x)=>a+Number(x.precio_cobrado),0),efectivoHoy:atencionesHoy.reduce((a,x)=>a+Number(x.monto_efectivo||0),0),transferenciaHoy:atencionesHoy.reduce((a,x)=>a+Number(x.monto_transferencia||0),0),ingresosPorDia,topPeluqueros,ultimoCierre,cajaAbierta,totalMes,propinasMes,totalMesAnterior,atencionesMes,ticketPromedioMes,topServicios,porDiaSemana,porHora}
})

ipcMain.handle('peluqueria:sincronizar', async () => {
  try {
    const pid = await getPid()
    if (!pid) return { ok: false, error: 'No hay peluquería configurada.' }

    await syncSupabase()

    const turnos = db.prepare('SELECT * FROM turnos').all()

    if (turnos.length && (await getDeviceToken())) {
      await apiDevice('/api/admin/manual-turnos-bulk', {
        method: 'POST',
        body: JSON.stringify({
          turnos: turnos.map(t => ({ id: t.id, peluquero_id: t.peluquero_id, fecha: t.fecha, hora: t.hora })),
        }),
      })
    }

    await syncDiasBloqueados()
    await syncBloqueosPeluquero()
    return { ok: true, peluqueros: db.prepare('SELECT COUNT(*) as c FROM peluqueros WHERE activo=1').get().c, servicios: db.prepare('SELECT COUNT(*) as c FROM servicios WHERE activo=1').get().c, turnos: turnos.length }
  } catch(e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('actualizar-horario', async (_, horario) => {
  try {
    const pid = await getPid()
    if (!pid) return { ok: false, error: 'No hay peluquería vinculada' }

    const sb = await getSupabase()
    const { error } = await sb
      .from('peluquerias')
      .update({ horario })
      .eq('id', pid)

    if (error) throw error

    // Guardar localmente en SQLite
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_horario',?)")
      .run(JSON.stringify(horario))

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

function createWindow(){
  Menu.setApplicationMenu(null)
  mainWindow=new BrowserWindow({width:1280,height:800,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,webSecurity:!isDev}})
  // Chromium guarda el zoom por sitio en disco; forzamos 1.0 para pisar cualquier valor que haya quedado guardado
  mainWindow.webContents.on('did-finish-load', () => mainWindow.webContents.setZoomFactor(1))
  // Sin menú de aplicación no hay atajo F11 por defecto: lo manejamos a mano
  mainWindow.webContents.on('before-input-event', (_, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen())
    }
  })
  if(isDev) mainWindow.loadURL('http://localhost:5173')
  else mainWindow.loadFile(path.join(__dirname,'../dist/index.html'))
}

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

    // 3s — Sync inicial con Supabase
    setTimeout(() => syncSupabase(), 3000)

    // 8s — Verificar turnos nuevos
    setTimeout(async () => {
      // Instalaciones vinculadas antes de que existiera device_token: emparejar una vez.
      const pid = await getPid()
      if (pid && !(await getDeviceToken())) await vincularDevice(pid)

      await checkNuevosTurnos()
      setInterval(checkNuevosTurnos, 20000)
    }, 8000)

    // 10s — Auto-backup nube solo si la base tiene datos reales
    setTimeout(async () => {
      const tiene = db.prepare('SELECT COUNT(*) as c FROM atenciones').get().c
      if (tiene > 0) syncBackupCompleto()
    }, 10000)

    // Cada 20 min — Re-backup nube para no perder atenciones del día
    setInterval(async () => {
      const pid = await getPid()
      if (!pid) return
      const tiene = db.prepare('SELECT COUNT(*) as c FROM atenciones').get().c
      if (tiene > 0) syncBackupCompleto()
    }, 20 * 60 * 1000)

    // Cada 1h — Re-verificar licencia silenciosamente
    setInterval(() => {
      const res = verificarLicencia()
      if (!res.valida) sendToWindow('licencia:invalida', { mensaje: res.mensaje })
    }, 60 * 60 * 1000)
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
