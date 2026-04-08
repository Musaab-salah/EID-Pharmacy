import React from 'react'

const lineAmount = (line) => {
  if (line.lineTotal != null) return Number(line.lineTotal)
  return Number(line.price || 0) * Number(line.qty || 0)
}

const InvoicePreview = ({ invoice, items, pharmacyName, onPrint, onNewSale }) => {
  const invoiceNo = invoice?.invoice_no ?? invoice?.id ?? '—'
  const created = invoice?.created_at ? new Date(invoice.created_at) : new Date()
  const dateStr = created.toLocaleString('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="max-w-xl mx-auto">
      <div
        id="receipt-print-root"
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 print:rounded-none print:shadow-none print:border-0 print:p-3"
      >
        <div className="text-center border-b border-gray-200 pb-4 mb-4 print:border-gray-300">
          <div className="text-xl font-bold text-gray-900 leading-snug print:text-[18px]">
            {pharmacyName || 'صيدلية عيد'}
          </div>
          <div className="text-sm font-semibold text-gray-700 mt-2">فاتورة مبيعات</div>
          <div className="text-base font-bold text-[#1677ff] mt-1">رقم الفاتورة: {invoiceNo}</div>
          <div className="text-xs text-gray-500 mt-1">{dateStr}</div>
          <div className="text-sm text-gray-600 mt-2">تمت العملية بنجاح</div>
        </div>

        <div className="space-y-2 text-sm">
          {items.map((line) => (
            <div key={line.id} className="flex justify-between gap-2">
              <span className="text-start">
                {line.name} × {line.qty}
              </span>
              <span className="shrink-0">{lineAmount(line).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="border-t mt-4 pt-4 text-sm space-y-1 print:border-gray-300">
          <div className="flex justify-between font-semibold text-base">
            <span>الإجمالي النهائي</span>
            <span>{Number(invoice?.grand_total ?? 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 print:hidden">
        <button
          type="button"
          onClick={onPrint}
          className="rounded-xl border border-gray-200 px-4 py-2.5 font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          طباعة
        </button>
        <button
          type="button"
          onClick={onNewSale}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2.5 font-semibold hover:from-blue-600 hover:to-blue-700 shadow-sm transition-all"
        >
          بيع جديد
        </button>
      </div>
    </div>
  )
}

export default InvoicePreview
