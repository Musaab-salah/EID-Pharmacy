import React from 'react'

const InvoicePreview = ({ invoice, items, onPrint, onNewSale }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 max-w-xl mx-auto">
      <div className="text-center mb-4">
        <div className="text-lg font-bold text-gray-800">تمت العملية بنجاح</div>
        <div className="text-sm text-gray-500">فاتورة #{invoice?.invoice_no || invoice?.id}</div>
      </div>

      <div className="space-y-2 text-sm">
        {items.map((line) => (
          <div key={line.id} className="flex justify-between">
            <span>
              {line.name} × {line.qty}
            </span>
            <span>{(Number(line.price) * Number(line.qty)).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="border-t mt-4 pt-4 text-sm space-y-1">
        <div className="flex justify-between">
          <span>الإجمالي النهائي</span>
          <span className="font-semibold">{Number(invoice?.grand_total ?? 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onPrint} className="rounded-xl border border-gray-200 px-4 py-2.5 font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          طباعة
        </button>
        <button onClick={onNewSale} className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2.5 font-semibold hover:from-blue-600 hover:to-blue-700 shadow-sm transition-all">
          بيع جديد
        </button>
      </div>
    </div>
  )
}

export default InvoicePreview
