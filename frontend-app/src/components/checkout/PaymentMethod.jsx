import React, { useEffect, useState } from 'react'
import { useCheckout } from '../../context/CheckoutContext'
import CartSummary from './CartSummary'
import api from '../../api'
import { getToken } from '../../auth'

const API_BASE = 'http://localhost:8000/api'

const PaymentMethod = ({ onBack, onComplete, userInfo }) => {
  const { cart, payment, setPayment, totals, customer, paymentAccount, setPaymentAccount, paymentProof, setPaymentProof } = useCheckout()
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [showProofModal, setShowProofModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const token = getToken()
        const res = await fetch(`${API_BASE}/payment-accounts/active/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const data = await res.json()
        setAccounts(Array.isArray(data) ? data : [])
      } catch {
        setAccounts([])
      }
    }
    load()
  }, [])

  const handleComplete = async () => {
    if (!cart.length || !userInfo?.branch) return

    if (payment === 'TRANSFER') {
      if (!paymentAccount) {
        alert('يرجى اختيار حساب التحويل')
        return
      }
      if (!paymentProof) {
        setShowProofModal(true)
        return
      }
    }

    setLoading(true)
    try {
      await onComplete({
        branch: userInfo.branch,
        cashier: userInfo.id,
        customer: customer.name || customer.phone ? { name: customer.name, phone: customer.phone } : null,
        discount: 0,
        tax: 0,
        payment_method: payment,
        payment_account: payment === 'TRANSFER' ? paymentAccount?.id : null,
        payment_proof: paymentProof,
        lines: cart.map((line) => ({
          product: line.productId,
          batch: line.batchId,
          qty: line.qty,
          unit_price: line.price,
          line_total: line.price * line.qty,
        })),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      setPaymentProof(file)
    } else if (file) {
      alert('يرجى رفع صورة بصيغة JPG أو PNG فقط')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-[#1677ff] text-white rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="text-sm opacity-90">الإجمالي النهائي</div>
          <div className="text-2xl font-bold">{totals.total.toFixed(2)}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'CASH', label: 'نقدًا', icon: '💵' },
            { key: 'TRANSFER', label: 'تحويل إلى حساب', icon: '🏦' },
          ].map((method) => (
            <button
              key={method.key}
              onClick={() => setPayment(method.key)}
              className={`rounded-xl px-4 py-6 text-lg font-semibold border transition shadow-sm ${
                payment === method.key
                  ? 'bg-[#1677ff] text-white border-[#1677ff]'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div className="text-2xl mb-2">{method.icon}</div>
              {method.label}
            </button>
          ))}
        </div>

        {payment === 'TRANSFER' && (
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <h3 className="font-semibold">اختر حساب التحويل</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setPaymentAccount(acc)}
                  className={`w-full text-start p-3 rounded-lg border ${
                    paymentAccount?.id === acc.id
                      ? 'bg-[#e6f4ff] border-[#1677ff]'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{acc.name_ar || acc.name_en}</div>
                  <div className="text-sm text-gray-500">{acc.account_number}</div>
                </button>
              ))}
              {!accounts.length && (
                <p className="text-sm text-gray-500">لا توجد حسابات متاحة. أضفها من لوحة الإدارة.</p>
              )}
            </div>

            <div className="pt-3 border-t">
              <p className="text-sm text-amber-600 font-medium mb-2">
                ⚠️ إرفاق صورة إشعار التحويل إلزامي
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                className="block w-full text-sm"
              />
              {paymentProof && (
                <p className="text-sm text-green-600 mt-1">✓ تم اختيار الصورة: {paymentProof.name}</p>
              )}
            </div>
          </div>
        )}

        <div className="sticky bottom-4 bg-white/90 backdrop-blur border rounded-xl p-3 flex justify-end gap-2 shadow-sm">
          <button onClick={onBack} className="rounded-lg border px-4 py-2">
            رجوع
          </button>
          <button
            onClick={handleComplete}
            className="rounded-lg bg-[#1677ff] text-white px-4 py-2 font-semibold"
            disabled={loading || cart.length === 0}
          >
            {loading ? 'جاري المعالجة...' : 'إتمام الدفع'}
          </button>
        </div>
      </div>

      <CartSummary items={cart} totals={totals} />

      {showProofModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm mx-4">
            <div className="text-center mb-4">
              <div className="text-2xl mb-2">⚠️</div>
              <h3 className="font-semibold text-lg">إرفاق صورة الإشعار إلزامي</h3>
              <p className="text-sm text-gray-500 mt-1">
                لا يمكن إتمام الدفع بالتحويل دون رفع صورة إشعار التحويل (JPG أو PNG)
              </p>
            </div>
            <button
              onClick={() => setShowProofModal(false)}
              className="w-full rounded-lg bg-[#1677ff] text-white py-2 font-semibold"
            >
              فهمت
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentMethod
