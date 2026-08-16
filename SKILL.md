---
name: peluapp
description: >
  Sistema de gestión para peluquerías/barberías desarrollado en Electron + React + SQLite.
  Usar este skill siempre que el usuario mencione PeluApp, quiera agregar features, corregir bugs,
  modificar módulos existentes (Agenda, Atenciones, Caja, Liquidación, Gastos, Reportes, Peluqueros,
  Servicios, Configuración, Dashboard), o trabajar con la integración web (Supabase/reservas online).
  También aplica si menciona: turnos web, señas, vales, caja, comisiones, tramos, bloqueos, backup nube,
  licencia, o cualquier parte del stack (Electron IPC, better-sqlite3, framer-motion, Vite, react-router).
---

# PeluApp — Skill de Contexto Completo

## Stack técnico
- **Framework**: Electron 29 + React 18 + Vite 5
- **DB local**: `better-sqlite3` (SQLite WAL mode, foreign keys ON)
- **Backend web**: Supabase (PostgreSQL + Realtime + Storage)
- **UI**: CSS variables propio (tema dark/light), `framer-motion` animaciones, `lucide-react` íconos
- **Router**: `react-router-dom` v6 con `HashRouter`
- **PDF**: `jsPDF` + `jspdf-autotable`
- **Notificaciones**: Electron `Notification` API + IPC `postMessage`
- **Auto-updater**: `electron-updater` (GitHub Releases)
- **Licencias**: HMAC-SHA256 firmadas, validación por machineId + días de uso

## Estructura de archivos clave

```
electron/
  main.js          ← proceso principal Electron, toda lógica IPC + DB + Supabase
  preload.js       ← expone electronAPI al renderer via contextBridge

src/
  main.jsx         ← entry point React
  App.jsx          ← layout principal, sidebar, rutas, notificaciones, licencia
  App.css          ← sistema de diseño completo (variables CSS, clases utilitarias)
  index.css        ← reset global

  components/
    Modal.jsx        ← ModalConfirm, ModalAlert reutilizables (framer-motion)
    Actualizador.jsx ← UI para auto-updater

  hooks/
    useTheme.js      ← dark/light toggle con localStorage
    usePDF.js        ← genera PDF con jsPDF+autoTable, invoca electronAPI.guardarPDF

  pages/
    Dashboard/Dashboard.jsx   ← resumen del día, gráficos 7 días, top peluqueros
    Agenda/Agenda.jsx         ← calendario mensual, turnos locales, reservas web, señas
    Atenciones/Atenciones.jsx ← registro atenciones, vales, control de períodos de vales
    Caja/Caja.jsx             ← apertura/cierre caja, historial expandible por fecha
    Liquidacion/Liquidacion.jsx ← comisiones por %, tramos, pagos confirmados
    Gastos/Gastos.jsx         ← gastos operativos + pagos peluqueros por mes
    Reportes/Reportes.jsx     ← estadísticas, gráficos, breakdown por peluquero/servicio
    Peluqueros/Peluqueros.jsx ← CRUD peluqueros, bloqueos/ausencias, tramos comisión
    Servicios/Servicios.jsx   ← CRUD servicios con sync Supabase
    Configuracion/Configuracion.jsx ← apariencia, seguridad (password maestra + secciones), backups, web, horario, seña
    Licencia/Licencia.jsx     ← pantalla de activación con machineId
    PasswordGate.jsx          ← HOC que protege rutas con contraseña
```

## Base de datos SQLite — Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `peluqueros` | id, nombre, comision, activo |
| `servicios` | id, nombre, precio, activo |
| `atenciones` | id, peluquero_id, servicio_id (nullable), precio_cobrado, metodo_pago, nombre_transferencia, fecha, hora, monto_efectivo, monto_transferencia |
| `cierre_caja` | id, fecha, hora_apertura, hora_cierre, total_efectivo, total_transferencia, total_general, observaciones, estado |
| `gastos` | id, descripcion, monto, fecha, categoria |
| `pagos_peluqueros` | id, peluquero_id, peluquero_nombre, desde, hasta, monto, fecha_pago, notas |
| `turnos` | id, peluquero_id, servicio_id, cliente_nombre, fecha, hora, estado, notas, turno_web_id |
| `configuracion` | clave/valor store (password_, peluqueria_*, sena_*, nombre_app, etc.) |
| `periodos_vales` | id, fecha_apertura, hora_apertura, fecha_cierre, hora_cierre, estado |
| `peluquero_tramos` | id, peluquero_id, monto_desde, monto_pago (sistema de comisión variable) |
| `dias_bloqueados` | id, fecha (UNIQUE), motivo |
| `bloqueos_peluquero` | id, peluquero_id, desde, hasta, motivo |
| `migraciones` | control de versión de esquema (13 migraciones aplicadas) |

### Métodos de pago disponibles
`efectivo` | `transferencia` | `mixto` | `vale`

Los **vales** NO suman a totales de caja, NO generan comisión. Solo registran peluquero.

## Supabase — Tablas remotas sincronizadas

| Tabla Supabase | Descripción |
|----------------|-------------|
| `peluquerias` | registro de peluquerías (id, nombre, email, horario JSON, sena_*) |
| `peluqueros_web` | id=`${pid}_${local_id}`, espejo de peluqueros activos |
| `servicios_web` | espejo de servicios activos |
| `turnos_web` | reservas de clientes (estado: pendiente→confirmado/rechazado/modificado/cancelado/esperando_sena) |
| `turnos_senas` | señas pendientes (monto, alias, vence_at, estado: pendiente_sena/pagada) |
| `turnos_manuales_web` | turnos locales para bloquear horarios en el sitio web |
| `dias_bloqueados_web` | espejo de días bloqueados |
| `bloqueos_peluquero_web` | espejo de bloqueos por peluquero |
| `backups-db` (Storage) | backup SQLite en `{pid}/database.sqlite` |

### Constantes importantes en main.js
```js
const SUPABASE_URL = 'https://xsalearfdfjuyjwugick.supabase.co'
const SUPABASE_KEY = 'sb_publishable_9NvWXl8HHIhde1l8lt8apw_-bCNWwUz'
const WEB_URL = 'https://www.peluapp-turnos.xyz'
```

## IPC API (electronAPI expuesta al renderer)

### Grupos de handlers

**Peluqueros**: `getPeluqueros`, `createPeluquero`, `updatePeluquero`, `deletePeluquero`

**Servicios**: `getServicios`, `createServicio`, `updateServicio`, `deleteServicio`

**Atenciones**: `createAtencion`, `getAtencionesByFecha`, `getAtencionesByRango`, `deleteAtencion`, `updateAtencion`, `getValesPorMes`

**Caja**: `abrirCaja`, `getCajaAbierta`, `cerrarCaja`, `getCierres`, `getDetalleCierre`

**Períodos Vales**: `abrirPeriodoVales`, `cerrarPeriodoVales`, `getPeriodoValesAbierto`, `getPeriodosVales`, `getValesPorPeriodo`

**Gastos**: `getGastosByRango`, `getResumenMensualGastos`, `createGasto`, `updateGasto`, `deleteGasto`

**Pagos peluqueros**: `createPago`, `getPagosByMes`, `getPagosByPeluqueroYRango`, `deletePago`

**Tramos comisión**: `getTramosComision(peluquero_id)`, `getAllTramosComision`, `saveTramosComision({peluquero_id, tramos})`

**Turnos locales**: `createTurno`, `getTurnosByFecha`, `getTurnosByRango`, `updateTurnoEstado`, `deleteTurno`

**Reservas web**: `getPeluqueriaConfig`, `registrarPeluqueria`, `vincularPeluqueria`, `getTurnosWebPendientes`, `getTurnosWebSenas`, `getTurnosWebTodos(mes)`, `responderTurnoWeb({id, accion, fecha_propuesta, hora_propuesta, motivo})`, `confirmarSena(id)`, `guardarSena({sena_monto, sena_alias, sena_horas_vencimiento})`

**Configuración**: `getConfig(clave)`, `setConfig({clave, valor})`, `getNombreApp`, `setNombreApp`, `getLogo`, `setLogo`

**Backup**: `abrirCarpetaBackup`, `listarBackups`, `syncBackupNube`, `restaurarDesdeNube`, `getUltimoBackupNube`, `existeBackupNube`

**Días bloqueados**: `getDiasBloqueados`, `bloquearDia({fecha, motivo})`, `desbloquearDia(fecha)`

**Bloqueos peluquero**: `getBloqueosPeluquero(peluquero_id?)`, `crearBloqueoPeluquero({peluquero_id, desde, hasta, motivo})`, `eliminarBloqueoPeluquero(id)`

**Sincronización**: `sincronizarPeluqueria`, `actualizarNombreWeb(nombre)`, `actualizarHorario(horario)`, `sincronizarCanceladosWeb`, `sincronizarConfirmadosWeb`

**Licencia**: `verificarLicencia`, `cargarLicencia(ruta)`, `getMachineId`

**App**: `getVersion`, `guardarPDF({buffer, nombreSugerido})`, `getDashboard`

**Updater**: `checkUpdate`, `downloadUpdate`, `onDownloadProgress(cb)`, `onDownloadComplete(cb)`

## Seguridad — Sistema de contraseñas

- **Contraseña maestra** (`password_maestra` en configuracion): protege la sección de seguridad
- **Pregunta/respuesta de seguridad** (`pregunta_seguridad`, `respuesta_seguridad`): recuperación
- **Contraseñas por sección**: `password_dashboard`, `password_agenda`, `password_peluqueros`, `password_servicios`, `password_atenciones`, `password_reportes`, `password_caja`, `password_liquidacion`, `password_gastos`
- **PasswordGate**: HOC en `App.jsx` que envuelve cada ruta; estado `desbloqueados{}` en App

## Sistema de diseño CSS (App.css)

### Variables principales
```css
--bg-main, --bg-sidebar, --bg-card
--border-primary (#3b2f6e dark / #c4b5fd light), --border-soft
--text-main, --text-soft, --text-muted
--accent (#7c3aed), --accent-hover (#6d28d9), --accent-soft (#2d1f5e)
--danger (#991b1b), --input-bg, --input-border
--radius (12px), --radius-sm (8px), --transition (0.2s ease)
```

### Clases utilitarias disponibles
- Layout: `.app-container`, `.sidebar`, `.sidebar-nav`, `.main-content`
- Cards: `.card` (con hover)
- Botones: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`
- Inputs: `.input` (con estados hover/focus/dark date)
- Tablas: `.table` (zebra, hover rows, scrollbar)
- Badges: `.badge`, `.badge-efectivo`, `.badge-transferencia`
- Formularios: `.form-group`
- Animaciones: `.page-animation` (fadeIn), `.form-container` (slideDown), `.spin`
- Responsive: breakpoints 1366px y 1280px

### Temas
- `.dark` (default): fondo `#0f0f0f`, sidebar `#141414`, card `#1a1a1a`
- `.light` (`[data-theme="light"]`): fondo `#f4f4f5`, sidebar/card `#ffffff`
- Guardado en `localStorage` via `useTheme.js`

## Patrones de código frecuentes

### Patrón modal confirmación/alerta
```jsx
// En cualquier componente:
const [modalConfirm, setModalConfirm] = useState(null)
const [modalAlert, setModalAlert] = useState(null)
const confirmar = (msg, fn) => setModalConfirm({ mensaje: msg, onConfirm: fn })
const alertar = (msg, tipo = 'info') => setModalAlert({ mensaje: msg, tipo })

// En render:
{modalConfirm && <ModalConfirm mensaje={modalConfirm.mensaje} onConfirm={modalConfirm.onConfirm} onCancel={() => setModalConfirm(null)} />}
{modalAlert && <ModalAlert mensaje={modalAlert.mensaje} tipo={modalAlert.tipo} onClose={() => setModalAlert(null)} />}
```

### Patrón fecha hoy
```js
function hoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
```

### Patrón consulta IPC en useEffect
```jsx
useEffect(() => {
  window.electronAPI.getPeluqueros().then(setPeluqueros)
  window.electronAPI.getServicios().then(setServicios)
}, [])
```

### Animaciones con framer-motion
```jsx
// Panel desplegable:
<AnimatePresence>
  {visible && (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
      ...
    </motion.div>
  )}
</AnimatePresence>

// Card entry:
<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
```

## Flujo de reservas web (Agenda)

```
Cliente solicita turno (turnos_web estado='pendiente')
  ↓
Peluquería responde via responderTurnoWeb:
  - 'confirmado' sin seña → turno local creado, email enviado
  - 'confirmado' con seña → estado='esperando_sena', fila en turnos_senas, email con datos de pago
  - 'modificado' → email con nueva fecha/hora propuesta, cliente debe aceptar
  - 'rechazado' → email con motivo
  ↓ (si esperando_sena)
Peluquería confirma seña recibida via confirmarSena(id)
  → turno_web='confirmado', turno local creado, email de confirmación
```

## Flujo comisiones (Liquidación)

```
Sin tramos: montoComision = totalGenerado * (comision% / 100)
Con tramos (peluquero_tramos): por cada atención busca tramo donde monto_desde <= precio_cobrado
  → usa monto_pago del tramo más cercano
  → si no hay tramo, fallback a comision%
Vales: NO se incluyen en totalGenerado ni en comisión
```

## Configuraciones almacenadas (tabla configuracion)

| Clave | Descripción |
|-------|-------------|
| `password_liquidacion` (default '1234') | contraseña sección |
| `password_*` | contraseñas por sección |
| `password_maestra` | contraseña maestra de seguridad |
| `pregunta_seguridad` / `respuesta_seguridad` | recuperación |
| `peluqueria_id` | UUID de Supabase |
| `peluqueria_nombre` / `peluqueria_email` | datos web |
| `peluqueria_horario` | JSON con bloques, días, intervalo, modo |
| `nombre_app` | nombre en sidebar |
| `sena_monto` / `sena_alias` / `sena_horas_vencimiento` | config señas |
| `ultimo_backup_nube` | timestamp ISO |
| `ultima_fecha_uso` / `dias_usados` | control licencia |

## Horario web — estructura JSON

```json
{
  "modo": "normal" | "fecha_unica",
  "dias": [1,2,3,4,5,6],  // 0=Dom, 1=Lun... (modo normal)
  "fecha_unica": "2025-03-15",  // solo si modo=fecha_unica
  "bloques": [
    { "activo": true, "inicio": "09:00", "fin": "13:00" },
    { "activo": false, "inicio": "17:00", "fin": "20:00" }
  ],
  "intervalo": 30  // o 60
}
```

## Backup y licencia

### Backup local
- Al iniciar app: `hacerBackup()` → guarda en `userData/backups/database_YYYY-MM-DD_HH-MM.sqlite`
- Máximo 7 backups, elimina los más viejos

### Backup nube (Supabase Storage)
- Bucket: `backups-db`, ruta: `{peluqueria_id}/database.sqlite`
- Al conectar nueva instalación: detecta backup existente, ofrece restaurar

### Licencia
- Archivo: `userData/licencia.lic` (base64 de JSON firmado con HMAC-SHA256)
- Campos: `machineId` (opcional), `desde`, `vence`, `firma`
- SECRET_KEY: `peluapp-jofree-2026`
- Validaciones: firma, machineId si existe, fecha sistema (anti-manipulación), días usados

## Notas para desarrollo

1. **IPC siempre**: el renderer NUNCA accede directo a DB o filesystem, todo va por `window.electronAPI.*`
2. **Sync automática**: crear/editar/borrar peluqueros/servicios llama `syncSupabase()` automáticamente
3. **Días bloqueados**: llaman `syncDiasBloqueados()` → se sincronizan a `dias_bloqueados_web`
4. **Turnos manuales**: al crear turno → `syncTurnoManual()` → `turnos_manuales_web`
5. **isDev**: `!app.isPackaged` — en dev la DB está en `../database.sqlite` (relativo a electron/), en prod en `userData/`
6. **Realtime Supabase**: suscripción a INSERT en `turnos_web` para notificaciones push (canal `turnos_web_{pid}`)
7. **Archivo .env**: contiene `GH_TOKEN` para GitHub releases (auto-updater)
8. **Versión actual**: 2.2.0 (package.json) — build NSIS para Windows, AppImage para Linux

## Dependencias principales

```json
{
  "better-sqlite3": "^12.6.2",
  "@supabase/supabase-js": "^2.98.0",
  "electron-updater": "^6.7.3",
  "framer-motion": "^12.34.3",
  "jspdf": "^4.2.0",
  "jspdf-autotable": "^5.0.7",
  "lucide-react": "^0.574.0",
  "react-router-dom": "^6.22.0",
  "dotenv": "^17.3.1"
}
```

## Scripts npm

```bash
npm run dev      # vite + electron en paralelo (concurrently + wait-on)
npm run build    # vite build + electron-builder
npm run publish  # build + electron-builder --win nsis --publish always
```
