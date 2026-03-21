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
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
          <h2 className="text-lg font-bold text-gray-800 mb-1">بيانات العميل</h2>
          <p className="text-sm text-gray-500 mb-4">أدخل البيانات لتسريع العملية</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">اسم العميل</label>
              <input
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all"
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
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all"
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
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 text-sm font-semibold hover:from-blue-600 hover:to-blue-700 transition-all"
                >
                  بحث
                </button>
              </div>
              {errors.phone && <div className="text-xs text-red-600">{errors.phone}</div>}
            </div>
          </div>
          <textarea
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 mt-3 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all"
            placeholder="ملاحظات إضافية (اختياري)"
            value={customer.notes}
            onChange={(e) => setCustomer((prev) => ({ ...prev, notes: e.target.value }))}
          />
          {loading && <div className="text-sm text-gray-500">جاري التحقق من العميل...</div>}
        </div>

        <div className="sticky bottom-4 bg-white/95 backdrop-blur border border-gray-100 rounded-2xl p-4 flex justify-end gap-2 shadow-lg">
          <button onClick={onBack} className="rounded-xl border border-gray-200 px-4 py-2.5 font-medium text-gray-600 hover:bg-gray-50 transition-colors">
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
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2.5 font-semibold hover:from-blue-600 hover:to-blue-700 shadow-sm transition-all"
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
