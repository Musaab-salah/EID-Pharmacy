import React, { useEffect, useState } from 'react'
import { useCheckout } from '../../context/CheckoutContext'
import CartSummary from './CartSummary'
import api from '../../api'
import { getToken } from '../../auth'
import { API_URL } from '../../config'

const PaymentMethod = ({ onBack, onComplete, userInfo }) => {
  const { cart, payment, setPayment, totals, customer, paymentAccount, setPaymentAccount, transactionNumber, setTransactionNumber, paymentProof, setPaymentProof } = useCheckout()
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [showProofModal, setShowProofModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const token = getToken()
        const res = await fetch(`${API_URL}/payment-accounts/active/`, {
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
    if (!cart.length) return
    if (!userInfo?.branch) {
      alert('يجب تعيين فرع للمستخدم. تواصل مع المدير.')
      return
    }

    if (payment === 'TRANSFER') {
      if (!paymentAccount) {
        alert('يرجى اختيار حساب التحويل')
        return
      }
      if (!transactionNumber?.trim()) {
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
        transaction_number: payment === 'TRANSFER' ? transactionNumber?.trim() : '',
        payment_proof: paymentProof,
        lines: cart.map((line) => ({
          product: line.productId,
          batch: line.batchId,
          qty: line.isPills ? line.totalPills : line.qty,
          unit_price: line.price,
          line_total: line.lineTotal ?? line.price * line.qty,
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
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-blue-500/20">
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
              className={`rounded-2xl px-4 py-6 text-lg font-semibold border transition-all duration-200 shadow-sm ${
                payment === method.key
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-md'
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <div className="text-2xl mb-2">{method.icon}</div>
              {method.label}
            </button>
          ))}
        </div>

        {payment === 'TRANSFER' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-bold text-gray-800">اختر حساب التحويل</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setPaymentAccount(acc)}
                  className={`w-full text-start p-3 rounded-xl border transition-all ${
                    paymentAccount?.id === acc.id
                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                      : 'bg-white border-gray-200 hover:border-blue-300'
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

            <div className="pt-3 border-t space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">رقم العملية / المرجع *</label>
                <input
                  type="text"
                  value={transactionNumber}
                  onChange={(e) => setTransactionNumber(e.target.value)}
                  placeholder="أدخل رقم التحويل"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                  required
                />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">صورة إشعار التحويل (اختياري - يمكن رفعها لاحقاً من لوحة الإدارة)</p>
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
          </div>
        )}

        <div className="sticky bottom-4 bg-white/95 backdrop-blur border border-gray-100 rounded-2xl p-4 flex justify-end gap-2 shadow-lg">
          <button onClick={onBack} className="rounded-xl border border-gray-200 px-4 py-2.5 font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            رجوع
          </button>
          <button
            onClick={handleComplete}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2.5 font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-sm transition-all"
            disabled={loading || cart.length === 0}
          >
            {loading ? 'جاري المعالجة...' : 'إتمام الدفع'}
          </button>
        </div>
      </div>

      <CartSummary items={cart} totals={totals} />

      {showProofModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4 border border-gray-100">
            <div className="text-center mb-4">
              <div className="text-2xl mb-2">⚠️</div>
              <h3 className="font-bold text-lg text-gray-800">رقم العملية مطلوب</h3>
              <p className="text-sm text-gray-500 mt-1">
                يرجى إدخال رقم العملية أو المرجع عند الدفع بالتحويل
              </p>
            </div>
            <button
              onClick={() => setShowProofModal(false)}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 font-semibold hover:from-blue-600 hover:to-blue-700 transition-all"
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
