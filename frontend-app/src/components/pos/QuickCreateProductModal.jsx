import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const QuickCreateProductModal = ({
  open,
  onClose,
  barcode,
  onSave,
  categories,
  suppliers,
  branches,
}) => {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    productName: '',
    productType: 'pills',
    pillsPerStrip: 1,
    stripsPerBox: 1,
    pricePerStrip: '',
    pricePerBox: '',
    sku: '',
    barcode: barcode || '',
    initialStockQty: 0,
    stockUnit: 'pill',
    category: null,
    supplier: null,
    branch: branches?.[0]?.id || null,
  })

  React.useEffect(() => {
    if (open) {
      setForm((prev) => ({
        ...prev,
        barcode: barcode || prev.barcode,
        productName: '',
        productType: 'pills',
        pillsPerStrip: 1,
        stripsPerBox: 1,
        pricePerStrip: '',
        pricePerBox: '',
        sku: '',
        initialStockQty: 0,
        stockUnit: 'pill',
        branch: branches?.[0]?.id || prev.branch,
      }))
      setError('')
    }
  }, [open, barcode, branches])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const name = form.productName.trim()
    if (!name) {
      setError(t('err_product_name_required') || 'اسم المنتج مطلوب')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        productName: name,
        productType: form.productType,
        pillsPerStrip: form.pillsPerStrip,
        stripsPerBox: form.stripsPerBox,
        pricePerStrip: form.pricePerStrip ? parseFloat(form.pricePerStrip) : null,
        pricePerBox: form.pricePerBox ? parseFloat(form.pricePerBox) : null,
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        initialStockQty: form.initialStockQty || 0,
        stockUnit: form.stockUnit,
        category: form.category || undefined,
        supplier: form.supplier || undefined,
        branch: form.branch || undefined,
      })
      onClose()
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'فشل إنشاء المنتج'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-lg p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-lg mb-4">إنشاء منتج سريع</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="p-2 rounded bg-red-50 text-red-600 text-sm">{error}</div>
          )}
          <label className="block">
            <span className="text-sm text-gray-600">اسم المنتج *</span>
            <input
              type="text"
              value={form.productName}
              onChange={(e) => setForm((p) => ({ ...p, productName: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 mt-1"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">الباركود</span>
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 mt-1"
              dir="ltr"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">نوع المنتج</span>
            <select
              value={form.productType}
              onChange={(e) => setForm((p) => ({ ...p, productType: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 mt-1"
            >
              <option value="pills">حبوب</option>
              <option value="default">عادي</option>
            </select>
          </label>
          {form.productType === 'pills' && (
            <>
              <label className="block">
                <span className="text-sm text-gray-600">حبوب في الشريط</span>
                <input
                  type="number"
                  min={1}
                  value={form.pillsPerStrip}
                  onChange={(e) => setForm((p) => ({ ...p, pillsPerStrip: parseInt(e.target.value) || 1 }))}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">أشرطة في العلبة</span>
                <input
                  type="number"
                  min={1}
                  value={form.stripsPerBox}
                  onChange={(e) => setForm((p) => ({ ...p, stripsPerBox: parseInt(e.target.value) || 1 }))}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </label>
            </>
          )}
          <label className="block">
            <span className="text-sm text-gray-600">سعر الشريط</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.pricePerStrip}
              onChange={(e) => setForm((p) => ({ ...p, pricePerStrip: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 mt-1"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">سعر العلبة</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.pricePerBox}
              onChange={(e) => setForm((p) => ({ ...p, pricePerBox: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 mt-1"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">SKU</span>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 mt-1"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">الكمية الأولية</span>
            <input
              type="number"
              min={0}
              value={form.initialStockQty}
              onChange={(e) => setForm((p) => ({ ...p, initialStockQty: parseInt(e.target.value) || 0 }))}
              className="w-full border rounded-lg px-3 py-2 mt-1"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">وحدة المخزون</span>
            <select
              value={form.stockUnit}
              onChange={(e) => setForm((p) => ({ ...p, stockUnit: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 mt-1"
            >
              <option value="pill">حبة</option>
              <option value="strip">شريط</option>
              <option value="box">علبة</option>
            </select>
          </label>
          {branches?.length > 1 && (
            <label className="block">
              <span className="text-sm text-gray-600">الفرع</span>
              <select
                value={form.branch || ''}
                onChange={(e) => setForm((p) => ({ ...p, branch: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full border rounded-lg px-3 py-2 mt-1"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name_ar || b.name_en}</option>
                ))}
              </select>
            </label>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-[#1677ff] text-white disabled:opacity-60"
            >
              {saving ? 'جاري...' : 'حفظ وإضافة للسلة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default QuickCreateProductModal
