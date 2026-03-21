import React, { useState } from 'react'
import { useCheckout } from '../../context/CheckoutContext'
import ProductCard from './ProductCard'
import BarcodeInput from '../pos/BarcodeInput'
import QuickCreateProductModal from '../pos/QuickCreateProductModal'
import api from '../../api'

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
  reloadProducts,
  branches,
}) => {
  const { addItem, cart } = useCheckout()
  const [pulseId, setPulseId] = useState(null)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickCreateBarcode, setQuickCreateBarcode] = useState('')
  const [barcodeError, setBarcodeError] = useState('')

  const addProductToCart = (product, batch, pillsOptions) => {
    const p = {
      id: product.id,
      name: product.name_ar || product.name_en || product.name,
      sku: product.sku || '-',
      barcode: product.barcode || '',
      price: Number(product.price || 0),
      stock: product.stock ?? batch?.qty_on_hand ?? 0,
      batches: product.batches || (batch ? [batch] : []),
      isPills: product.product_type === 'pills',
      stripsPerBox: Number(product.strips_per_box) || 1,
      pillsPerStrip: Number(product.pills_per_strip) || 1,
      pricePerStrip: product.price_per_strip != null ? Number(product.price_per_strip) : null,
      pricePerBox: product.price_per_box != null ? Number(product.price_per_box) : null,
    }
    const b = batch || (p.batches && p.batches[0])
    if (b && typeof b === 'object' && !b.batch_no && b.batchNo) {
      b.batch_no = b.batchNo
      b.expiry_date = b.expiryDate || b.expiry
      b.qty_on_hand = b.qty_on_hand ?? b.qtyOnHand
    }
    const added = addItem(p, b, pillsOptions)
    if (added && onDing) onDing()
    if (added) {
      setPulseId(p.id)
      setTimeout(() => setPulseId(null), 200)
    }
    return added
  }

  const handleBarcode = async () => {
    const term = (barcode || '').trim()
    if (!term) return
    setBarcodeError('')
    const match = products.find((p) => p.barcode && p.barcode.toLowerCase() === term)
    if (match) {
      const batch = match.batches[0]
      addProductToCart(match, batch)
      setBarcode('')
      return
    }
    try {
      const res = await api.get('/products/by-barcode/', { params: { code: term } })
      const data = res.data
      const batch = data.batch || (data.batches && data.batches[0])
      if (batch) {
        const p = {
          ...data,
          batches: data.batches || [batch],
          stock: data.stock ?? batch.qty_on_hand,
        }
        addProductToCart(p, batch)
        setBarcode('')
      } else {
        setBarcodeError('لا يوجد مخزون')
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setQuickCreateBarcode(term)
        setShowQuickCreate(true)
        setBarcode('')
      } else {
        setBarcodeError(err?.response?.data?.detail || 'خطأ في البحث')
      }
    }
  }

  const handleQuickCreateSave = async (payload) => {
    const res = await api.post('/products/quick-create/', payload)
    const data = res.data
    const batch = data.batch || (data.batches && data.batches[0])
    if (batch) {
      addProductToCart(data, batch)
      setShowQuickCreate(false)
      setQuickCreateBarcode('')
      if (reloadProducts) reloadProducts()
    }
  }

  const handleAdd = (product, pillsOptions) => {
    const batch = product.batches[0]
    const added = addItem(product, batch, pillsOptions)
    if (added && onDing) onDing()
    if (added) {
      setPulseId(product.id)
      setTimeout(() => setPulseId(null), 200)
    }
  }

  const hasCart = cart.length > 0

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">اختيار المنتجات</h2>
            <p className="text-sm text-gray-500 mt-0.5">ابحث أو امسح الباركود لإضافة المنتج</p>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">عدد الأصناف: {products.length}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex-1 min-w-[220px] bg-gray-50/80 border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-300 transition-all">
            <span className="text-gray-400 text-lg">🔎</span>
            <input
              className="bg-transparent w-full outline-none text-sm"
              placeholder="ابحث بالاسم أو الباركود"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <BarcodeInput
            value={barcode}
            onChange={setBarcode}
            onEnter={handleBarcode}
            placeholder="باركود (Enter)"
          />
          {barcodeError && (
            <span className="text-red-600 text-sm">{barcodeError}</span>
          )}
          <button
            onClick={onNext}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2.5 font-semibold shadow-sm hover:from-blue-600 hover:to-blue-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            disabled={!hasCart}
          >
            التالي
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory('all')}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
            category === 'all'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          الكل
        </button>
        {(categories || []).map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              category === c.id
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
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
            onAdd={(pillsOptions) => handleAdd(p, pillsOptions)}
            pulse={pulseId === p.id}
          />
        ))}
        {!products.length && (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-gray-400 mb-2">
              <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">لا توجد نتائج مطابقة</p>
            <p className="text-sm text-gray-400 mt-1">جرب تغيير البحث أو الفئة</p>
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={!hasCart}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl px-6 py-3.5 shadow-lg shadow-blue-500/30 font-semibold hover:from-blue-600 hover:to-blue-700 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
      >
        عرض السلة / التالي
      </button>

      <QuickCreateProductModal
        open={showQuickCreate}
        onClose={() => {
          setShowQuickCreate(false)
          setQuickCreateBarcode('')
        }}
        barcode={quickCreateBarcode}
        onSave={handleQuickCreateSave}
        branches={branches}
      />
    </div>
  )
}

export default ProductsPage
