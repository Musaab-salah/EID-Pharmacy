import React from 'react'
import { useTranslation } from 'react-i18next'

const CartSummary = ({ items, totals }) => {
  const { t } = useTranslation()
  const formatLine = (line) => {
    const amt = line.lineTotal ?? line.price * line.qty
    if (line.isPills) {
      const mode = line.pillsMode === 'strip' ? t('strip') : t('box')
      const pills = line.totalPills
      const suffix = line.pillsMode === 'strip'
        ? `(${pills} ${t('pill')})`
        : `(${line.qty * (line.stripsPerBox || 1)} ${t('strip')} | ${pills} ${t('pill')})`
      return `${line.name} — ${line.qty} ${mode} ${suffix}`
    }
    return `${line.name} × ${line.qty}`
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 h-fit shadow-sm hover:shadow-md transition-shadow duration-300">
      <h3 className="font-bold text-gray-800 mb-4">ملخص الطلب</h3>
      <div className="space-y-2 text-sm">
        {items.map((line) => (
          <div key={line.id} className="flex justify-between">
            <span>{formatLine(line)}</span>
            <span>{(line.lineTotal ?? line.price * line.qty).toFixed(2)}</span>
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
        <div className="flex justify-between font-bold text-lg text-blue-600 pt-1">
          <span>الإجمالي النهائي</span>
          <span>{totals.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

export default CartSummary
