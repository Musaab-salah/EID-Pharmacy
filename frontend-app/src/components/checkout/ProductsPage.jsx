import React, { useState } from 'react'
import { useCheckout } from '../../context/CheckoutContext'
import ProductCard from './ProductCard'

const ProductsPage = ({
  products,
  search,
  setSearch,
  barcode,
  setBarcode,
  categories,
  category,
  setCategory,
  onNext,
  onDing,
}) => {
  const { addItem, cart } = useCheckout()
  const [pulseId, setPulseId] = useState(null)

  const handleBarcode = (event) => {
    if (event.key !== 'Enter') return
    const term = barcode.trim().toLowerCase()
    if (!term) return
    const match = products.find((p) => p.barcode && p.barcode.toLowerCase() === term)
    if (match) {
      const batch = match.batches[0]
      const added = addItem(match, batch)
      if (added && onDing) onDing()
      if (added) {
        setPulseId(match.id)
        setTimeout(() => setPulseId(null), 200)
      }
      setBarcode('')
    }
  }

  const handleAdd = (product) => {
    const batch = product.batches[0]
    const added = addItem(product, batch)
    if (added && onDing) onDing()
    if (added) {
      setPulseId(product.id)
      setTimeout(() => setPulseId(null), 200)
    }
  }

  const hasCart = cart.length > 0

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-semibold">اختيار المنتجات</h2>
            <p className="text-xs text-gray-500">ابحث أو امسح الباركود لإضافة المنتج</p>
          </div>
          <span className="text-xs text-gray-500">عدد الأصناف: {products.length}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex-1 min-w-[220px] bg-gray-50 border rounded-full px-3 py-2 flex items-center gap-2">
            <span className="text-gray-400">🔎</span>
            <input
              className="bg-transparent w-full outline-none text-sm"
              placeholder="ابحث بالاسم أو الباركود"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="min-w-[220px] bg-gray-50 border rounded-full px-3 py-2 flex items-center gap-2">
            <span className="text-gray-400">🏷️</span>
            <input
              className="bg-transparent w-full outline-none text-sm"
              placeholder="باركود (Enter)"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleBarcode}
            />
          </label>
          <button
            onClick={onNext}
            className="rounded-full bg-[#1677ff] text-white px-5 py-2 font-semibold shadow-sm hover:bg-[#4096ff] disabled:opacity-60"
            disabled={!hasCart}
          >
            التالي
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory('all')}
          className={`rounded-full px-3 py-1 text-sm border ${
            category === 'all' ? 'bg-[#1677ff] text-white border-[#1677ff]' : 'bg-white'
          }`}
        >
          الكل
        </button>
        {(categories || []).map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`rounded-full px-3 py-1 text-sm border ${
              category === c.id ? 'bg-[#1677ff] text-white border-[#1677ff]' : 'bg-white'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onAdd={() => handleAdd(p)}
            pulse={pulseId === p.id}
          />
        ))}
        {!products.length && (
          <div className="col-span-full text-center text-sm text-gray-500 py-8 bg-white rounded-2xl border">
            لا توجد نتائج مطابقة
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={!hasCart}
        className="fixed bottom-6 right-6 bg-[#1677ff] text-white rounded-full px-5 py-3 shadow-lg font-semibold hover:bg-[#4096ff] disabled:opacity-60"
      >
        عرض السلة / التالي
      </button>
    </div>
  )
}

export default ProductsPage
