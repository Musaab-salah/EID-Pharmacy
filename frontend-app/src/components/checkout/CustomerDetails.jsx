import React, { useEffect, useState } from 'react'
import { useCheckout } from '../../context/CheckoutContext'
import CartSummary from './CartSummary'

const CustomerDetails = ({ onBack, onNext, onLookup }) => {
  const { customer, setCustomer, cart, totals } = useCheckout()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!customer.phone || customer.phone.length < 6) return
    const timer = setTimeout(async () => {
      setLoading(true)
      const res = await onLookup(customer.phone)
      if (res?.exists && res?.customer?.name) {
        setCustomer((prev) => ({ ...prev, name: res.customer.name }))
      }
      setLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [customer.phone, onLookup, setCustomer])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-1">بيانات العميل</h2>
          <p className="text-xs text-gray-500 mb-4">أدخل البيانات لتسريع العملية</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">اسم العميل</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                placeholder="مثال: محمد أحمد"
                value={customer.name}
                onChange={(e) => setCustomer((prev) => ({ ...prev, name: e.target.value }))}
              />
              {errors.name && <div className="text-xs text-red-600">{errors.name}</div>}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">رقم الجوال</label>
              <div className="flex gap-2">
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="05xxxxxxxx"
                  value={customer.phone}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!customer.phone.trim()) return
                    setLoading(true)
                    const res = await onLookup(customer.phone)
                    if (res?.exists && res?.customer?.name) {
                      setCustomer((prev) => ({ ...prev, name: res.customer.name }))
                    }
                    setLoading(false)
                  }}
                  className="rounded-lg bg-[#1677ff] text-white px-3 text-sm font-semibold"
                >
                  بحث
                </button>
              </div>
              {errors.phone && <div className="text-xs text-red-600">{errors.phone}</div>}
            </div>
          </div>
          <textarea
            className="w-full rounded-lg border px-3 py-2 mt-3"
            placeholder="ملاحظات إضافية (اختياري)"
            value={customer.notes}
            onChange={(e) => setCustomer((prev) => ({ ...prev, notes: e.target.value }))}
          />
          {loading && <div className="text-sm text-gray-500">جاري التحقق من العميل...</div>}
        </div>

        <div className="sticky bottom-4 bg-white/90 backdrop-blur border rounded-xl p-3 flex justify-end gap-2 shadow-sm">
          <button onClick={onBack} className="rounded-lg border px-4 py-2">
            رجوع
          </button>
          <button
            onClick={() => {
              const nextErrors = {}
              if (!customer.name.trim()) nextErrors.name = 'حقل مطلوب'
              if (!customer.phone.trim()) nextErrors.phone = 'حقل مطلوب'
              setErrors(nextErrors)
              if (Object.keys(nextErrors).length === 0) onNext()
            }}
            className="rounded-lg bg-[#1677ff] text-white px-4 py-2 font-semibold"
          >
            التالي
          </button>
        </div>
      </div>

      <CartSummary items={cart} totals={totals} />
    </div>
  )
}

export default CustomerDetails
