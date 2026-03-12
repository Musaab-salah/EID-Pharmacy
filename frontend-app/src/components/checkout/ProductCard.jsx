import React from 'react'

const ProductCard = ({ product, onAdd, pulse }) => {
  const isOut = product.stock <= 0
  const isLow = product.stock > 0 && product.stock <= 5

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col gap-2 transition hover:shadow ${
        pulse ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      <div className="h-32 bg-gray-50 flex items-center justify-center">
        {product.image ? (
          <img src={product.image} alt={product.name} className="max-h-24" />
        ) : (
          <span className="text-xs text-gray-400">لا توجد صورة</span>
        )}
      </div>

      <div className="px-3 pt-2 flex items-start justify-between gap-2">
        <div className="font-semibold text-sm line-clamp-2">{product.name}</div>
        {isOut && (
          <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
            نفاد
          </span>
        )}
        {!isOut && isLow && (
          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            منخفض
          </span>
        )}
      </div>

      <div className="px-3 text-xs text-gray-500 line-clamp-2">{product.desc || '—'}</div>

      <div className="px-3 flex items-center justify-between text-sm">
        <span className="font-bold text-[#1677ff]">{product.price.toFixed(2)}</span>
        <span className={isOut ? 'text-red-600' : 'text-gray-600'}>
          المتوفر: {product.stock}
        </span>
      </div>

      <button
        disabled={isOut}
        onClick={onAdd}
        className="mx-3 mb-3 mt-1 w-auto rounded-full bg-[#1677ff] text-white py-1.5 hover:bg-[#4096ff] disabled:opacity-60"
      >
        إضافة إلى السلة
      </button>
    </div>
  )
}

export default ProductCard
