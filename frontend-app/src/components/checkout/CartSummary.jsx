import React from 'react'

const CartSummary = ({ items, totals }) => {
  return (
    <div className="bg-white rounded-xl border p-4 h-fit shadow-sm">
      <h3 className="font-semibold mb-3">ملخص الطلب</h3>
      <div className="space-y-2 text-sm">
        {items.map((line) => (
          <div key={line.id} className="flex justify-between">
            <span>
              {line.name} × {line.qty}
            </span>
            <span>{(line.price * line.qty).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="border-t mt-3 pt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>الإجمالي</span>
          <span>{totals.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>الضريبة</span>
          <span>{totals.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>الخصم</span>
          <span>{totals.discount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-base text-[#1677ff]">
          <span>الإجمالي النهائي</span>
          <span>{totals.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

export default CartSummary
