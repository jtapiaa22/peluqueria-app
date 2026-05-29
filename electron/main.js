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
const WEB_URL = 'https://servicio-turno-web-peluapp.xyz'
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

// ── HELPER: enviar a la ventana aunque mainWindow sea null ────
function sendToWindow(channel, data) {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length) wins[0].webContents.send(channel, data)
}

// ── NOTIFICACIONES ────────────────────────────────────────────
let turnosNotificados = new Set()
let primeraVerificacion = true
let realtimeChannel = null

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
    if (!pid) return
    const sb = await getSupabase()
    const { data } = await sb.from('turnos_web')
      .select('id,cliente_nombre,peluquero_nombre,fecha,hora')
      .eq('peluqueria_id', pid).eq('estado', 'pendiente')
    for (const t of (data || [])) notificarTurno(t)
    primeraVerificacion = false
  } catch(e) { console.error('⚠️ Notif:', e.message) }
}

async function iniciarRealtime() {
  try {
    const pid = await getPid()
    if (!pid) return
    const sb = await getSupabase()

    // Cancelar canal anterior si existía
    if (realtimeChannel) { await sb.removeChannel(realtimeChannel); realtimeChannel = null }

    realtimeChannel = sb.channel(`turnos_web_${pid}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'turnos_web',
        filter: `peluqueria_id=eq.${pid}`
      }, (payload) => {
        const t = payload.new
        if (t.estado === 'pendiente') notificarTurno(t)
      })
      .subscribe((status) => {
        console.log('Realtime status:', status)
      })
  } catch(e) { console.error('⚠️ Realtime:', e.message) }
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
    if (!pid) return
    const sb = await getSupabase()
    const webId = `${pid}_${turno.id}`
    if (eliminar) {
      await sb.from('turnos_manuales_web').delete().eq('id', webId)
    } else {
      await sb.from('turnos_manuales_web').upsert(
        { id: webId, peluquero_id: turno.peluquero_id, fecha: turno.fecha, hora: turno.hora, peluqueria_id: pid },
        { onConflict: 'id' }
      )
    }
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
const CONFIG_CLAVES_PERMITIDAS = new Set(['password_liquidacion','password_dashboard','password_agenda','password_peluqueros','password_servicios','password_atenciones','password_reportes','password_caja','password_gastos','password_maestra','pregunta_seguridad','respuesta_seguridad','peluqueria_id','peluqueria_nombre','peluqueria_email','peluqueria_horario','nombre_app','sena_monto','sena_alias','sena_horas_vencimiento','sena_correo'])
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
  const p=db.prepare(`SELECT strftime('%Y-%m',fecha_pago) as mes,SUM(monto + COALESCE(propinas_pagadas,0)) as total_pagos,COUNT(*) as cantidad_pagos FROM pagos_peluqueros GROUP BY mes`).all()
  const i=db.prepare(`SELECT strftime('%Y-%m',fecha) as mes,SUM(precio_cobrado + COALESCE(propina_efectivo,0) + COALESCE(propina_transferencia,0)) as total_ingresos FROM atenciones WHERE metodo_pago != 'vale' GROUP BY mes`).all()
  const meses=new Set([...g.map(r=>r.mes),...p.map(r=>r.mes),...i.map(r=>r.mes)])
  return Array.from(meses).sort().reverse().map(mes=>{ const gr=g.find(r=>r.mes===mes)||{total_gastos:0,cantidad_gastos:0}; const pr=p.find(r=>r.mes===mes)||{total_pagos:0,cantidad_pagos:0}; const ir=i.find(r=>r.mes===mes)||{total_ingresos:0}; return {mes,total_gastos:Number(gr.total_gastos)||0,cantidad_gastos:Number(gr.cantidad_gastos)||0,total_pagos:Number(pr.total_pagos)||0,cantidad_pagos:Number(pr.cantidad_pagos)||0,total_ingresos:Number(ir.total_ingresos)||0} })
})
ipcMain.handle('gastos:create',async(_,d)=>{ const r=db.prepare('INSERT INTO gastos(descripcion,monto,fecha,categoria) VALUES(?,?,?,?)').run(d.descripcion,Number(d.monto),d.fecha,d.categoria||null); return r.lastInsertRowid })
ipcMain.handle('gastos:update',async(_,d)=>{ db.prepare('UPDATE gastos SET descripcion=?,monto=?,fecha=?,categoria=? WHERE id=?').run(d.descripcion,Number(d.monto),d.fecha,d.categoria||null,d.id); return true })
ipcMain.handle('gastos:delete',async(_,id)=>{ db.prepare('DELETE FROM gastos WHERE id=?').run(id); return true })

// PAGOS PELUQUEROS
ipcMain.handle('pagos:create',async(_,d)=>{ const r=db.prepare(`INSERT INTO pagos_peluqueros(peluquero_id,peluquero_nombre,desde,hasta,monto,fecha_pago,notas,propinas_pagadas) VALUES(?,?,?,?,?,?,?,?)`).run(d.peluquero_id,d.peluquero_nombre,d.desde,d.hasta,Number(d.monto),d.fecha_pago,d.notas||null,Number(d.propinas_pagadas||0)); return r.lastInsertRowid })
ipcMain.handle('pagos:getByMes',(_,mes)=>{ const [a,m]=mes.split('-'); const desde=`${a}-${m}-01`; const u=new Date(parseInt(a),parseInt(m),0).getDate(); const hasta=`${a}-${m}-${String(u).padStart(2,'0')}`; return db.prepare('SELECT * FROM pagos_peluqueros WHERE fecha_pago BETWEEN ? AND ? ORDER BY fecha_pago DESC,id DESC').all(desde,hasta) })
ipcMain.handle('pagos:getByPeluqueroYRango',(_,{peluquero_id,desde,hasta})=>db.prepare('SELECT * FROM pagos_peluqueros WHERE peluquero_id=? AND fecha_pago BETWEEN ? AND ? ORDER BY fecha_pago DESC').all(peluquero_id,desde,hasta))
ipcMain.handle('pagos:delete',async(_,id)=>{ db.prepare('DELETE FROM pagos_peluqueros WHERE id=?').run(id); return true })

// TURNOS MANUALES
ipcMain.handle('turnos:create',async(_,d)=>{ const r=db.prepare(`INSERT INTO turnos(peluquero_id,servicio_id,cliente_nombre,fecha,hora,estado,notas) VALUES(?,?,?,?,?,?,?)`).run(d.peluquero_id||null,d.servicio_id||null,d.cliente_nombre,d.fecha,d.hora,d.estado||'pendiente',d.notas||null); await syncTurnoManual({id:r.lastInsertRowid,peluquero_id:d.peluquero_id,fecha:d.fecha,hora:d.hora}); return r.lastInsertRowid })
ipcMain.handle('turnos:getByFecha',(_,f)=>db.prepare(`SELECT t.*,p.nombre as peluquero_nombre,s.nombre as servicio_nombre FROM turnos t LEFT JOIN peluqueros p ON t.peluquero_id=p.id LEFT JOIN servicios s ON t.servicio_id=s.id WHERE t.fecha=? ORDER BY t.hora ASC`).all(f))
ipcMain.handle('turnos:getByRango',(_,{desde,hasta})=>db.prepare(`SELECT t.*,p.nombre as peluquero_nombre,s.nombre as servicio_nombre FROM turnos t LEFT JOIN peluqueros p ON t.peluquero_id=p.id LEFT JOIN servicios s ON t.servicio_id=s.id WHERE t.fecha BETWEEN ? AND ? ORDER BY t.fecha ASC,t.hora ASC`).all(desde,hasta))
ipcMain.handle('turnos:updateEstado',(_,{id,estado})=>{ db.prepare('UPDATE turnos SET estado=? WHERE id=?').run(estado,id); return true })
ipcMain.handle('turnos:delete',async(_,id)=>{ const t=db.prepare('SELECT * FROM turnos WHERE id=?').get(id); db.prepare('DELETE FROM turnos WHERE id=?').run(id); if(t) await syncTurnoManual(t,true); return true })

// PELUQUERÍA WEB
ipcMain.handle('peluqueria:getConfig',()=>{
  const id     = db.prepare("SELECT valor FROM configuracion WHERE clave='peluqueria_id'").get()
  const nombre = db.prepare("SELECT valor FROM configuracion WHERE clave='peluqueria_nombre'").get()
  const email  = db.prepare("SELECT valor FROM configuracion WHERE clave='peluqueria_email'").get()
  const horarioRaw = db.prepare("SELECT valor FROM configuracion WHERE clave='peluqueria_horario'").get()
  const senaMonto  = db.prepare("SELECT valor FROM configuracion WHERE clave='sena_monto'").get()
  const senaAlias  = db.prepare("SELECT valor FROM configuracion WHERE clave='sena_alias'").get()
  const senaHoras  = db.prepare("SELECT valor FROM configuracion WHERE clave='sena_horas_vencimiento'").get()
  const senaCorreo = db.prepare("SELECT valor FROM configuracion WHERE clave='sena_correo'").get()
  let horario = null
  try { horario = horarioRaw ? JSON.parse(horarioRaw.valor) : null } catch {}
  return {
    id:id?.valor||'', nombre:nombre?.valor||'', email:email?.valor||'', horario,
    sena_monto: senaMonto?.valor || '',
    sena_alias: senaAlias?.valor || '',
    sena_horas_vencimiento: senaHoras?.valor || '24',
    sena_correo: senaCorreo?.valor || '',
  }
})
ipcMain.handle('peluqueria:guardarSena', async (_, { sena_monto, sena_alias, sena_horas_vencimiento, sena_correo }) => {
  try {
    // Guardar en local
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('sena_monto',?)").run(String(sena_monto || ''))
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('sena_alias',?)").run(sena_alias || '')
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('sena_horas_vencimiento',?)").run(String(sena_horas_vencimiento || 24))
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('sena_correo',?)").run(sena_correo || '')

    // Sincronizar con Supabase si está registrada
    const pid = await getPid()
    if (pid) {
      const sb = await getSupabase()
      await sb.from('peluquerias').update({
        sena_monto: sena_monto ? Number(sena_monto) : null,
        sena_alias: sena_alias || null,
        sena_horas_vencimiento: Number(sena_horas_vencimiento) || 24,
        sena_correo: sena_correo || null,
      }).eq('id', pid)
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})
ipcMain.handle('peluqueria:registrar',async(_,{nombre,email})=>{
  try {
    const sb=await getSupabase()

    // Intentar insertar; si viola unique constraint, recuperar el existente
    const {data:nueva, error:errInsert} = await sb.from('peluquerias').insert({nombre,email,activo:true}).select().maybeSingle()

    let data
    if (errInsert) {
      // Si es error de clave duplicada, buscar el registro existente
      if (errInsert.code === '23505') {
        const {data:existente, error:errSelect} = await sb.from('peluquerias').select('*').eq('email', email).maybeSingle()
        if (errSelect || !existente) return { ok:false, error:'Email ya registrado pero no se pudo recuperar. Usá "Ya tengo ID".' }
        data = existente
      } else {
        throw errInsert
      }
    } else {
      data = nueva
    }

    const yaExistia = !nueva
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_id',?)").run(data.id)
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_nombre',?)").run(data.nombre)
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_email',?)").run(email)
    await syncSupabase()
    return { ok:true, id:data.id, link:`${WEB_URL}/?p=${data.id}`, yaExistia }
  } catch(e){ return { ok:false, error:e.message } }
})
ipcMain.handle('peluqueria:vincular',async(_,{peluqueriaId})=>{
  try {
    const sb=await getSupabase()
    const {data,error}=await sb.from('peluquerias').select('*').eq('id',peluqueriaId).maybeSingle()
    if(error||!data) return { ok:false, error:'ID no encontrado.' }
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_id',?)").run(peluqueriaId)
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_nombre',?)").run(data.nombre)
    db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('peluqueria_email',?)").run(data.email)
    await syncSupabase()
    return { ok:true, id:peluqueriaId, link:`${WEB_URL}/?p=${peluqueriaId}` }
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
    const sb=await getSupabase()
    const {data}=await sb.from('turnos_web').select('*').eq('peluqueria_id',pid).in('estado',['pendiente','modificado']).order('fecha',{ascending:true}).order('hora',{ascending:true})
    return data||[]
  } catch(e){ return [] }
})

ipcMain.handle('turnosWeb:getSenas', async () => {
  try {
    const pid = await getPid()
    if (!pid) return []
    const sb = await getSupabase()

    const { data } = await sb
      .from('turnos_senas')
      .select('*')
      .eq('peluqueria_id', pid)
      .eq('estado', 'pendiente_sena')
      .order('fecha', { ascending: true })
      .order('hora',  { ascending: true })

    return data || []
  } catch (e) { return [] }
})

ipcMain.handle('turnosWeb:getTodos',async(_,mes)=>{
  try {
    const pid=await getPid(); if(!pid) return []
    const sb=await getSupabase()
    const [a,m]=mes.split('-').map(Number)
    const desde=`${a}-${String(m).padStart(2,'0')}-01`
    const u=new Date(a,m,0).getDate()
    const hasta=`${a}-${String(m).padStart(2,'0')}-${String(u).padStart(2,'0')}`
    const {data}=await sb.from('turnos_web').select('*').eq('peluqueria_id',pid).gte('fecha',desde).lte('fecha',hasta).order('fecha',{ascending:true}).order('hora',{ascending:true})
    return data||[]
  } catch(e){ return [] }
})

ipcMain.handle('turnosWeb:responder', async (_, { id, accion, fecha_propuesta, hora_propuesta, motivo }) => {
  try {
    const pid = await getPid()
    const sb = await getSupabase()

    const { data: turno } = await sb.from('turnos_web').select('*').eq('id', id).single()
    if (!turno) return { ok: false, error: 'Turno no encontrado' }

    const pelNombre = db.prepare("SELECT valor FROM configuracion WHERE clave='peluqueria_nombre'").get()?.valor || 'PeluApp'

    // ── CONFIRMADO: chequear seña ANTES de tocar Supabase ──────────────
    if (accion === 'confirmado') {
      const senaMonto  = db.prepare("SELECT valor FROM configuracion WHERE clave='sena_monto'").get()?.valor
      const senaAlias  = db.prepare("SELECT valor FROM configuracion WHERE clave='sena_alias'").get()?.valor
      const senaHoras  = Number(db.prepare("SELECT valor FROM configuracion WHERE clave='sena_horas_vencimiento'").get()?.valor || 24)
      const senaCorreo = db.prepare("SELECT valor FROM configuracion WHERE clave='sena_correo'").get()?.valor?.trim() || ''

      if (senaMonto && Number(senaMonto) > 0 && senaAlias && senaAlias.trim()) {
        // HAY SEÑA: actualizar turnos_web + insertar en turnos_senas
        const venceAt = new Date(Date.now() + senaHoras * 60 * 60 * 1000).toISOString()

        const { error: errUpdate } = await sb.from('turnos_web').update({
          estado: 'esperando_sena',
          sena_vence_at: venceAt,
          respondido_at: new Date().toISOString(),
          motivo: motivo || null,
        }).eq('id', id)
        if (errUpdate) return { ok: false, error: errUpdate.message }

        // Insertar en tabla independiente turnos_senas
        await sb.from('turnos_senas').insert({
          turno_web_id:     turno.id,
          peluqueria_id:    pid,
          cliente_nombre:   turno.cliente_nombre,
          cliente_telefono: turno.cliente_telefono,
          peluquero_nombre: turno.peluquero_nombre,
          peluquero_id:     turno.peluquero_id,
          servicio_nombre:  turno.servicio_nombre || null,
          fecha:            turno.fecha,
          hora:             turno.hora?.substring(0, 5),
          monto:            Number(senaMonto),
          alias:            senaAlias,
          vence_at:         venceAt,
          estado:           'pendiente_sena',
        })

        await fetch(`${WEB_URL}/api/notificar-respuesta`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telefono: turno.cliente_telefono,
            nombre: turno.cliente_nombre,
            peluqueria_nombre: pelNombre,
            peluquero_nombre: turno.peluquero_nombre,
            peluqueria_id: pid,
            accion: 'esperando_sena',
            fecha_original: turno.fecha,
            hora_original: turno.hora?.substring(0, 5),
            sena_monto:  Number(senaMonto),
            sena_alias:  senaAlias,
            sena_horas:  senaHoras,
            sena_correo: senaCorreo,
          })
        }).catch(() => {})
        return { ok: true, esperandoSena: true }
      }

      // SIN SEÑA: confirmar directo
      await sb.from('turnos_web').update({
        estado: 'confirmado',
        motivo: motivo || null,
        respondido_at: new Date().toISOString(),
      }).eq('id', id)

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

      await fetch(`${WEB_URL}/api/notificar-respuesta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: turno.cliente_telefono,
          nombre: turno.cliente_nombre,
          peluqueria_nombre: pelNombre,
          peluquero_nombre: turno.peluquero_nombre,
          peluqueria_id: pid,
          accion: 'confirmado',
          fecha_original: turno.fecha,
          hora_original: turno.hora?.substring(0, 5),
        })
      }).catch(() => {})
      return { ok: true }
    }

    // ── MODIFICADO / RECHAZADO / CANCELADO ─────────────────────────────
    const expira = accion === 'modificado'
      ? new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      : null

    await sb.from('turnos_web').update({
      estado: accion,
      motivo: motivo || null,
      respondido_at: new Date().toISOString(),
      ...(accion === 'modificado' ? { fecha_propuesta, hora_propuesta, expira_confirmacion_at: expira } : {})
    }).eq('id', id)

    if (accion === 'cancelado') {
      const local = db.prepare('SELECT id FROM turnos WHERE turno_web_id = ?').get(turno.id)
      if (local) db.prepare('DELETE FROM turnos WHERE id = ?').run(local.id)
      await sb.from('turnos_senas').delete().eq('turno_web_id', turno.id).neq('estado', 'pagada')
    }

    await fetch(`${WEB_URL}/api/notificar-respuesta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefono: turno.cliente_telefono,
        nombre: turno.cliente_nombre,
        peluqueria_nombre: pelNombre,
        peluquero_nombre: turno.peluquero_nombre,
        peluqueria_id: pid,
        accion,
        fecha_original: turno.fecha,
        hora_original: turno.hora?.substring(0, 5),
        fecha_propuesta,
        hora_propuesta,
        motivo
      })
    }).catch(() => {})

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('turnosWeb:confirmarSena', async (_, turnoSenaId) => {
  try {
    const pid = await getPid()
    const sb = await getSupabase()

    // Leer desde turnos_senas
    const { data: sena } = await sb.from('turnos_senas').select('*').eq('id', turnoSenaId).single()
    if (!sena) return { ok: false, error: 'Seña no encontrada' }

    // Marcar seña como pagada
    await sb.from('turnos_senas').update({ estado: 'pagada' }).eq('id', turnoSenaId)

    // Confirmar turno web
    await sb.from('turnos_web').update({
      estado: 'confirmado',
      respondido_at: new Date().toISOString(),
    }).eq('id', sena.turno_web_id)

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

    const pelNombre = db.prepare("SELECT valor FROM configuracion WHERE clave='peluqueria_nombre'").get()?.valor || 'PeluApp'

    // WhatsApp de confirmación al cliente
    await fetch(`${WEB_URL}/api/notificar-respuesta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefono: sena.cliente_telefono,
        nombre: sena.cliente_nombre,
        peluqueria_nombre: pelNombre,
        peluquero_nombre: sena.peluquero_nombre,
        peluqueria_id: pid,
        accion: 'confirmado',
        fecha_original: sena.fecha,
        hora_original: sena.hora,
      })
    }).catch(() => {})

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('turnosWeb:sincronizarCancelados', async () => {
  try {
    const pid = await getPid()
    if (!pid) return { ok: true, eliminados: 0 }

    const sb = await getSupabase()
    const { data: cancelados } = await sb
      .from('turnos_web')
      .select('id')
      .eq('peluqueria_id', pid)
      .eq('estado', 'cancelado')

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

    const sb = await getSupabase()
    const { data: confirmados } = await sb
      .from('turnos_web')
      .select('*')
      .eq('peluqueria_id', pid)
      .eq('estado', 'confirmado')

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

// ACTUALIZADOR
ipcMain.handle('updater:check',async()=>{ try{ const r=await autoUpdater.checkForUpdates(); return {disponible:r.updateInfo.version!==app.getVersion(),version:r.updateInfo.version} }catch(e){return {disponible:false,mensaje:e.message}} })
ipcMain.handle('updater:download',()=>{ autoUpdater.downloadUpdate(); return true })
autoUpdater.on('download-progress',(p)=>{ if(mainWindow) mainWindow.webContents.send('updater:download-progress',{percent:Math.floor(p.percent),transferred:p.transferred,total:p.total}) })
autoUpdater.on('update-downloaded',()=>{ if(mainWindow) mainWindow.webContents.send('updater:download-complete'); autoUpdater.quitAndInstall() })

// LOGO Y NOMBRE
function getLogoBasePath(){ const b=isDev?path.join(app.getPath('userData'),'dev'):app.getPath('userData'); if(!fs.existsSync(b))fs.mkdirSync(b,{recursive:true}); return b }
ipcMain.handle('config:getNombreApp',()=>db.prepare("SELECT valor FROM configuracion WHERE clave='nombre_app'").get()?.valor||'PeluApp')
ipcMain.handle('config:setNombreApp',(_,n)=>{ db.prepare("INSERT OR REPLACE INTO configuracion(clave,valor) VALUES('nombre_app',?)").run(n); return true })
ipcMain.handle('config:getLogo',()=>{ const lp=path.join(getLogoBasePath(),'logo.png'); if(fs.existsSync(lp)) return `data:image/png;base64,${fs.readFileSync(lp).toString('base64')}`; return null })
ipcMain.handle('config:setLogo',(_,ruta)=>{ try{ const lp=path.join(getLogoBasePath(),'logo.png'); if(ruta===null){if(fs.existsSync(lp))fs.unlinkSync(lp);return {ok:true}}; fs.copyFileSync(ruta,lp); return {ok:true} }catch{return {ok:false}} })
ipcMain.handle('app:getVersion',()=>app.getVersion())

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

// PDF
ipcMain.handle('pdf:guardar',async(_,{buffer,nombreSugerido})=>{ const {filePath,canceled}=await dialog.showSaveDialog(mainWindow,{title:'Guardar PDF',defaultPath:nombreSugerido,filters:[{name:'PDF',extensions:['pdf']}]}); if(canceled||!filePath) return {ok:false}; fs.writeFileSync(filePath,Buffer.from(buffer)); return {ok:true,filePath} })

// DASHBOARD
ipcMain.handle('dashboard:getResumen',()=>{
  const hoy=new Date(); const fechaHoy=`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`
  const ultimos7=[]; for(let i=6;i>=0;i--){const d=new Date(hoy);d.setDate(d.getDate()-i);ultimos7.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)}
  const atencionesHoy=db.prepare(`SELECT a.*,p.nombre as peluquero_nombre,s.nombre as servicio_nombre FROM atenciones a JOIN peluqueros p ON a.peluquero_id=p.id JOIN servicios s ON a.servicio_id=s.id WHERE a.fecha=?`).all(fechaHoy)
  const ingresosPorDia=ultimos7.map(f=>{const r=db.prepare('SELECT COALESCE(SUM(precio_cobrado),0) as total,COALESCE(SUM(COALESCE(propina_efectivo,0)+COALESCE(propina_transferencia,0)),0) as propinas FROM atenciones WHERE fecha=?').get(f);return{fecha:f,total:r.total,propinas:r.propinas}})
  const pm=`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-01`
  const topPeluqueros=db.prepare(`SELECT p.nombre,COUNT(*) as atenciones,SUM(a.precio_cobrado) as total FROM atenciones a JOIN peluqueros p ON a.peluquero_id=p.id WHERE a.fecha BETWEEN ? AND ? GROUP BY a.peluquero_id ORDER BY total DESC LIMIT 5`).all(pm,fechaHoy)
  const ultimoCierre=db.prepare("SELECT * FROM cierre_caja WHERE estado='cerrada' ORDER BY id DESC LIMIT 1").get()||null
  const cajaAbierta=db.prepare("SELECT * FROM cierre_caja WHERE estado='abierta' ORDER BY id DESC LIMIT 1").get()||null
  const resMes=db.prepare("SELECT COALESCE(SUM(precio_cobrado),0) as total,COALESCE(SUM(COALESCE(propina_efectivo,0)+COALESCE(propina_transferencia,0)),0) as propinas FROM atenciones WHERE fecha BETWEEN ? AND ? AND metodo_pago!='vale'").get(pm,fechaHoy)
  const totalMes=Number(resMes.total)||0
  const propinasMes=Number(resMes.propinas)||0
  return {fechaHoy,atencionesHoy,totalHoy:atencionesHoy.reduce((a,x)=>a+Number(x.precio_cobrado),0),efectivoHoy:atencionesHoy.reduce((a,x)=>a+Number(x.monto_efectivo||0),0),transferenciaHoy:atencionesHoy.reduce((a,x)=>a+Number(x.monto_transferencia||0),0),ingresosPorDia,topPeluqueros,ultimoCierre,cajaAbierta,totalMes,propinasMes}
})

ipcMain.handle('peluqueria:sincronizar', async () => {
  try {
    const pid = await getPid()
    if (!pid) return { ok: false, error: 'No hay peluquería configurada.' }

    await syncSupabase()

    const sb = await getSupabase()
    const turnos = db.prepare('SELECT * FROM turnos').all()

    if (turnos.length) {
      await sb.from('turnos_manuales_web').upsert(
        turnos.map(t => ({
          id: `${pid}_${t.id}`,
          peluquero_id: t.peluquero_id,
          fecha: t.fecha,
          hora: t.hora,
          peluqueria_id: pid
        })),
        { onConflict: 'id' }
      )
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

    // 8s — Verificar turnos nuevos y arrancar realtime
    setTimeout(async () => {
      await checkNuevosTurnos()
      iniciarRealtime()
      setInterval(checkNuevosTurnos, 20000)
    }, 8000)

    // 10s — Auto-backup nube solo si la base tiene datos reales
    setTimeout(async () => {
      const tiene = db.prepare('SELECT COUNT(*) as c FROM atenciones').get().c
      if (tiene > 0) syncBackupCompleto()
    }, 10000)

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
