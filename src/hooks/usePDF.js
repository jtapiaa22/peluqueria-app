import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Convierte '#rrggbb' (o '#rgb') a [r, g, b]. Devuelve null si no es válido.
function hexToRgb(hex) {
  if (!hex) return null
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (h.length !== 6) return null
  const num = parseInt(h, 16)
  if (Number.isNaN(num)) return null
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

// Lee una variable CSS del <html> y la convierte a [r, g, b].
function leerVarColor(nombre) {
  try {
    const val = getComputedStyle(document.documentElement).getPropertyValue(nombre)
    return hexToRgb(val)
  } catch {
    return null
  }
}

// Resuelve un color que puede venir como [r,g,b] | '#rrggbb' | 'var(--x)'.
function resolverColor(color, fallback) {
  if (Array.isArray(color)) return color
  if (typeof color === 'string') {
    const s = color.trim()
    if (s.startsWith('#')) return hexToRgb(s) || fallback
    const m = s.match(/^var\(\s*(--[\w-]+)\s*\)$/)
    if (m) return leerVarColor(m[1]) || fallback
  }
  return fallback
}

export function usePDF() {

  const generarReporte = async ({ titulo, subtitulo, columnas, filas, totales, nombreArchivo }) => {
    const doc = new jsPDF()
    const ahora = new Date()
    const fechaImpresion = ahora.toLocaleDateString('es-AR') + ' ' + ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

    // Color de acento según la paleta activa (fallback turquesa)
    const accentBright = leerVarColor('--accent-bright') || [45, 212, 191]
    const accent = leerVarColor('--accent') || [20, 184, 166]
    const headerFill = accent.map(c => Math.round(c * 0.28)) // versión oscura del acento

    // Encabezado
    doc.setFillColor(20, 20, 20)
    doc.rect(0, 0, 210, 35, 'F')

    doc.setTextColor(...accentBright)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(titulo, 14, 16)

    doc.setTextColor(150, 150, 150)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitulo, 14, 24)
    doc.text(`Generado: ${fechaImpresion}`, 14, 30)

    // Tabla principal
    autoTable(doc, {
      startY: 42,
      head: [columnas],
      body: filas,
      theme: 'grid',
      headStyles: {
        fillColor: headerFill,
        textColor: accentBright,
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [220, 220, 220],
        fillColor: [20, 20, 20]
      },
      alternateRowStyles: {
        fillColor: [28, 28, 28]
      },
      styles: {
        lineColor: [50, 50, 50],
        lineWidth: 0.3
      }
    })

    // Totales al pie
    if (totales?.length > 0) {
      let y = doc.lastAutoTable.finalY + 10
      doc.setFillColor(28, 28, 28)
      doc.roundedRect(14, y - 4, 182, totales.length * 10 + 8, 3, 3, 'F')
      totales.forEach(({ label, valor, color }, i) => {
        const [r, g, b] = resolverColor(color, accentBright)
        doc.setTextColor(150, 150, 150)
        doc.setFontSize(9)
        doc.text(label, 20, y + i * 10 + 2)
        doc.setTextColor(r, g, b)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text(valor, 190, y + i * 10 + 2, { align: 'right' })
        doc.setFont('helvetica', 'normal')
      })
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(8)
      doc.text(`Página ${i} de ${pageCount}`, 196, 290, { align: 'right' })
    }

    // Exportar
    const buffer = doc.output('arraybuffer')
    const result = await window.electronAPI.guardarPDF({
      buffer: Array.from(new Uint8Array(buffer)),
      nombreSugerido: nombreArchivo
    })
    return result
  }

  return { generarReporte }
}
