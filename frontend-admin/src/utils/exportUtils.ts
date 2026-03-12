import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { AMIRI_BASE64 } from './amiriFont'

const FONT_ARABIC = 'Amiri'
const HEADER_BG: [number, number, number] = [250, 250, 250]

const isRtl = () => document.documentElement.dir === 'rtl'
const halign = () => (isRtl() ? 'right' : 'left')

export const exportToPdf = (
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm' })
  doc.addFileToVFS('Amiri-Regular.ttf', AMIRI_BASE64)
  doc.addFont('Amiri-Regular.ttf', FONT_ARABIC, 'normal')
  doc.setFont(FONT_ARABIC)
  doc.setFontSize(16)
  doc.text(title, 14, 15)
  doc.setFontSize(10)
  doc.text(new Date().toLocaleString(), 14, 22)

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 28,
    theme: 'grid',
    headStyles: {
      fillColor: HEADER_BG,
      textColor: [0, 0, 0],
      fontStyle: 'normal',
      font: FONT_ARABIC,
      fontSize: 10,
      halign: halign(),
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
      font: FONT_ARABIC,
      fontStyle: 'normal',
      halign: halign(),
    },
    alternateRowStyles: {
      fillColor: [252, 252, 252] as [number, number, number],
    },
    margin: { left: 14, right: 14 },
  })

  doc.save(filename)
}

export const printTable = (
  title: string,
  headers: string[],
  rows: (string | number)[][],
  subtitle?: string
) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const tableRows = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`
    )
    .join('')

  const headerCells = headers.map((h) => `<th>${h}</th>`).join('')

  const dir = document.documentElement.dir || 'ltr'
  const lang = document.documentElement.lang || 'en'
  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="${dir}" lang="${lang}">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Amiri', 'Noto Naskh Arabic', Arial, Tahoma, sans-serif; padding: 24px; color: #333; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .subtitle { font-size: 12px; color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e8e8e8; padding: 8px 12px; text-align: ${dir === 'rtl' ? 'right' : 'left'}; }
        th { background: #fafafa; font-weight: 700; font-size: 12px; }
        td { font-size: 11px; }
        tr:nth-child(even) { background: #fafafa; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
      <table>
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 250)
}
