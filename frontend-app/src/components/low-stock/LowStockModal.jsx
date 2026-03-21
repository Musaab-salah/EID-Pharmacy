import React, { useState } from 'react'

const LowStockModal = ({ open, items, onClose, onHideToday }) => {
  const [dontShowToday, setDontShowToday] = useState(false)

  if (!open) return null

  const handleClose = () => {
    if (dontShowToday) onHideToday()
    else onClose()
  }

  const getQtyClass = (qty) => {
    if (qty <= 0) return 'text-red-600'
    if (qty <= 5) return 'text-amber-600'
    return 'text-green-600'
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center animate-fade">
      <div className="bg-white rounded-xl shadow-md w-full max-w-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-lg font-semibold text-[#111]">تنبيه المخزون</div>
            <div className="text-xs text-gray-500">منتجات منخفضة أو نافدة</div>
          </div>
          <button
            onClick={handleClose}
            className="h-8 w-8 rounded-full border hover:bg-gray-50"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-start p-2">المنتج</th>
                <th className="text-start p-2">SKU</th>
                <th className="text-start p-2">الكمية</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-2">{item.name_ar || item.name_en || item.name}</td>
                  <td className="p-2 text-gray-500">{item.sku || '-'}</td>
                  <td className={`p-2 font-semibold ${getQtyClass(item.stock || item.qty || 0)}`}>
                    {item.stock ?? item.qty ?? 0}
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td className="p-3 text-center text-gray-500" colSpan={3}>
                    لا توجد تنبيهات
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-600 mt-3">
          <input
            type="checkbox"
            checked={dontShowToday}
            onChange={(e) => setDontShowToday(e.target.checked)}
          />
          عدم الإظهار مرة أخرى اليوم
        </label>
      </div>
    </div>
  )
}

export default LowStockModal
