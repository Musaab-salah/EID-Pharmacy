import JsBarcode from 'jsbarcode'

export type LabelItem = {
  name: string
  code: string
  price?: number | string
}

export function printBarcodeLabels(item: LabelItem, qty: number) {
  const count = Math.max(1, Math.min(500, Number(qty) || 1))
  const safeName = escapeHtml(item.name || '')
  const safeCode = escapeHtml(item.code || '')
  const safePrice = item.price != null && item.price !== '' ? escapeHtml(String(item.price)) : ''

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Labels</title>
    <style>
      @page { margin: 6mm; }
      body { font-family: Arial, sans-serif; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
      .label { border: 1px dashed #bbb; border-radius: 6px; padding: 6px; }
      .name { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
      .meta { display:flex; justify-content:space-between; font-size: 11px; color:#333; margin-top:4px; }
      svg { width: 100%; height: 42px; }
    </style>
  </head>
  <body>
    <div class="grid">
      ${Array.from({ length: count })
        .map(
          (_, i) => `
        <div class="label">
          <div class="name">${safeName}</div>
          <svg class="barcode" id="bc-${i}"></svg>
          <div class="meta">
            <span>${safeCode}</span>
            <span>${safePrice}</span>
          </div>
        </div>
      `,
        )
        .join('')}
    </div>
    <script>
      window.__LABEL_CODE__ = ${JSON.stringify(item.code || '')};
    </script>
  </body>
</html>`

  const w = window.open('', '_blank', 'noopener,noreferrer')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()

  // Render barcodes after DOM is ready
  w.addEventListener('load', () => {
    const code = String((w as any).__LABEL_CODE__ || '')
    for (let i = 0; i < count; i++) {
      const el = w.document.getElementById(`bc-${i}`) as any
      if (!el) continue
      try {
        JsBarcode(el, code, {
          format: 'CODE128',
          displayValue: false,
          margin: 0,
          height: 42,
        })
      } catch {
        // ignore render failures (bad code)
      }
    }
    w.focus()
    w.print()
  })
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

