import React from 'react'

const InvoicePreview = ({ invoice, items, onPrint, onNewSale }) => {
  return (
    <div className="bg-white rounded-2xl shadow p-6 max-w-xl mx-auto">
      <div className="text-center mb-4">
        <div className="text-lg font-semibold">تمت العملية بنجاح</div>
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
        <button onClick={onPrint} className="rounded-lg border px-4 py-2">
          طباعة
        </button>
        <button onClick={onNewSale} className="rounded-lg bg-[#1677ff] text-white px-4 py-2 hover:bg-[#4096ff]">
          بيع جديد
        </button>
      </div>
    </div>
  )
}

export default InvoicePreview
