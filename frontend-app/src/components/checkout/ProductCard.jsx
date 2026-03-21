import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { stripsToPills, boxesToPills, hasEnoughStock } from '../../utils/units'

const ProductCard = ({ product, onAdd, pulse }) => {
  const { t } = useTranslation()
  const [showPillsModal, setShowPillsModal] = useState(false)
  const [pillsMode, setPillsMode] = useState('strip')
  const [pillsQty, setPillsQty] = useState(1)
  const [pillsError, setPillsError] = useState('')

  const isPills = product.isPills && (product.pricePerStrip != null || product.pricePerBox != null)
  const isOut = product.stock <= 0
  const isLow = product.stock > 0 && product.stock <= 5

  const handleAddClick = () => {
    if (isPills) {
      setPillsQty(1)
      setPillsMode(product.pricePerStrip != null ? 'strip' : 'box')
      setPillsError('')
      setShowPillsModal(true)
    } else {
      onAdd()
    }
  }

  const handlePillsAdd = () => {
    const s = product.stripsPerBox || 1
    const p = product.pillsPerStrip || 1
    const requiredPills = pillsMode === 'strip'
      ? stripsToPills(pillsQty, p)
      : boxesToPills(pillsQty, s, p)
    if (!hasEnoughStock(requiredPills, product.stock)) {
      setPillsError(t('insufficient_stock'))
      return
    }
    const unitPrice = pillsMode === 'strip' ? product.pricePerStrip : product.pricePerBox
    onAdd({ mode: pillsMode, qty: pillsQty, unitPrice, totalPills: requiredPills })
    setShowPillsModal(false)
  }

  const displayPrice = () => {
    if (isPills) {
      const parts = []
      if (product.pricePerStrip != null) parts.push(`${t('price_per_strip')}: ${Number(product.pricePerStrip).toFixed(2)}`)
      if (product.pricePerBox != null) parts.push(`${t('price_per_box')}: ${Number(product.pricePerBox).toFixed(2)}`)
      return parts.length ? parts.join(' / ') : product.price.toFixed(2)
    }
    return product.price.toFixed(2)
  }

  return (
    <>
      <div
        className={`group bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ease-out border border-gray-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 ${
          pulse ? 'ring-2 ring-blue-400 shadow-lg shadow-blue-500/20' : 'shadow-sm'
        }`}
      >
        <div className="relative h-36 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
          {product.image ? (
            <img src={product.image} alt={product.name} className="max-h-28 object-contain transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-400">
              <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
              <span className="text-xs">لا توجد صورة</span>
            </div>
          )}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {isOut && (
              <span className="text-[10px] font-medium text-white bg-red-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
                نفاد
              </span>
            )}
            {!isOut && isLow && (
              <span className="text-[10px] font-medium text-amber-800 bg-amber-200/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
                منخفض
              </span>
            )}
          </div>
        </div>

        <div className="px-4 pt-3 pb-2 flex flex-col gap-2 flex-1">
          <div className="font-semibold text-sm text-gray-800 line-clamp-2 leading-snug min-h-[2.5rem]">
            {product.name}
          </div>

          <div className="text-xs text-gray-500 space-y-0.5">
            {product.supplierName && (
              <div className="line-clamp-1">{t('supplier')}: {product.supplierName}</div>
            )}
            {product.placeOfManufacture && (
              <div className="line-clamp-1">{t('country')}: {product.placeOfManufacture}</div>
            )}
            {!product.supplierName && !product.placeOfManufacture && product.desc && (
              <div className="line-clamp-2">{product.desc}</div>
            )}
            {!product.supplierName && !product.placeOfManufacture && !product.desc && (
              <div>—</div>
            )}
          </div>

          <div className="flex items-baseline justify-between gap-2 mt-auto pt-2">
            <div className="flex flex-col">
              <span className="font-bold text-lg text-blue-600">{displayPrice()}</span>
              <span className={`text-xs ${isOut ? 'text-red-600' : 'text-gray-500'}`}>
                المتوفر: {product.stock} {isPills ? t('pill') : ''}
              </span>
            </div>
            <button
              disabled={isOut}
              onClick={handleAddClick}
              className="shrink-0 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 text-sm font-medium shadow-sm hover:from-blue-600 hover:to-blue-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {t('add_to_cart')}
            </button>
          </div>
        </div>
      </div>

      {showPillsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 max-w-sm w-full border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">{product.name}</h3>
            <div className="flex gap-2 mb-4">
              {product.pricePerStrip != null && (
                <button
                  onClick={() => setPillsMode('strip')}
                  className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${pillsMode === 'strip' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-blue-300'}`}
                >
                  {t('by_strip')} ({product.pricePerStrip})
                </button>
              )}
              {product.pricePerBox != null && (
                <button
                  onClick={() => setPillsMode('box')}
                  className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${pillsMode === 'box' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-blue-300'}`}
                >
                  {t('by_box')} ({product.pricePerBox})
                </button>
              )}
            </div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              {pillsMode === 'strip' ? t('strip') : t('box')}:
            </label>
            <input
              type="number"
              min={1}
              value={pillsQty}
              onChange={(e) => setPillsQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-2 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all"
            />
            {pillsError && (
              <p className="text-red-600 text-sm mb-2">{pillsError}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowPillsModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handlePillsAdd}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:from-blue-600 hover:to-blue-700 shadow-sm transition-all"
              >
                {t('add_to_cart')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ProductCard
