import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'

export default function Returns() {
  const [invoiceId, setInvoiceId] = useState('')
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [qtyByLine, setQtyByLine] = useState({})

  const loadInvoice = async () => {
    setError('')
    setInvoice(null)
    setQtyByLine({})
    const id = String(invoiceId || '').trim()
    if (!id) return
    setLoading(true)
    try {
      const res = await api.get(`/sales/${id}/`)
      setInvoice(res.data)
      const init = {}
      ;(res.data?.lines || []).forEach((l) => {
        init[l.id] = 0
      })
      setQtyByLine(init)
    } catch (e) {
      setError(e?.response?.data?.detail || 'لم يتم العثور على الفاتورة')
    } finally {
      setLoading(false)
    }
  }

  const totalSelected = useMemo(() => {
    if (!invoice?.lines) return 0
    return invoice.lines.reduce((sum, l) => sum + (Number(qtyByLine[l.id] || 0) > 0 ? 1 : 0), 0)
  }, [invoice, qtyByLine])

  const submitReturn = async () => {
    setError('')
    if (!invoice?.id) return
    const lines = (invoice.lines || [])
      .map((l) => ({ sale_line: l.id, qty: Number(qtyByLine[l.id] || 0) }))
      .filter((x) => x.qty > 0)
    if (!lines.length) {
      setError('اختر كميات للإرجاع')
      return
    }
    try {
      await api.post('/returns/', { original_invoice: invoice.id, lines })
      alert('تم تسجيل المرتجع')
      setInvoiceId('')
      setInvoice(null)
      setQtyByLine({})
    } catch (e) {
      setError(e?.response?.data?.detail || 'فشل تسجيل المرتجع')
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') {
        void loadInvoice()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [invoiceId])

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h2 className="text-lg font-bold">المرتجعات</h2>
        <div className="text-sm text-gray-500">ابحث برقم الفاتورة ثم اختر الكميات</div>
      </div>

      {error && <div className="mb-3 p-2 rounded bg-red-50 text-red-700 text-sm">{String(error)}</div>}

      <div className="flex gap-2 flex-wrap items-center mb-4">
        <input
          className="rounded-lg border px-3 py-2"
          placeholder="رقم الفاتورة"
          value={invoiceId}
          onChange={(e) => setInvoiceId(e.target.value)}
          dir="ltr"
        />
        <button
          className="rounded-lg bg-[#1677ff] text-white px-4 py-2 font-semibold hover:bg-[#4096ff] disabled:opacity-60"
          onClick={loadInvoice}
          disabled={loading}
        >
          {loading ? '...' : 'بحث'}
        </button>
      </div>

      {invoice && (
        <>
          <div className="mb-3 text-sm text-gray-600">
            فاتورة #{invoice.id} — الإجمالي: {Number(invoice.grand_total || 0).toFixed(2)}
          </div>

          <div className="overflow-auto border rounded-lg">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-start p-2 border-b">الصنف</th>
                  <th className="text-center p-2 border-b">الكمية المباعة</th>
                  <th className="text-center p-2 border-b">كمية الإرجاع</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.lines || []).map((l) => (
                  <tr key={l.id} className="border-b last:border-b-0">
                    <td className="p-2">{l.product_name_ar || l.product_name_en || l.product}</td>
                    <td className="p-2 text-center">{l.qty}</td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min={0}
                        max={l.qty}
                        className="w-24 rounded border px-2 py-1"
                        value={qtyByLine[l.id] ?? 0}
                        onChange={(e) =>
                          setQtyByLine((prev) => ({
                            ...prev,
                            [l.id]: Math.max(0, Math.min(Number(l.qty || 0), Number(e.target.value || 0))),
                          }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-gray-500">عدد البنود المحددة: {totalSelected}</div>
            <button
              className="rounded-lg bg-red-600 text-white px-4 py-2 font-semibold hover:bg-red-700 disabled:opacity-60"
              onClick={submitReturn}
              disabled={totalSelected < 1}
            >
              تسجيل المرتجع
            </button>
          </div>
        </>
      )}
    </div>
  )
}

