import React, { useEffect, useMemo, useState } from 'react'
import api from '../../api'

export default function ShiftGate({ children }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [branches, setBranches] = useState([])
  const [current, setCurrent] = useState(null)
  const [openingCash, setOpeningCash] = useState('0')
  const [branchId, setBranchId] = useState('')
  const [error, setError] = useState('')

  const reload = async () => {
    setError('')
    setLoading(true)
    try {
      const [me, br, cur] = await Promise.all([
        api.get('/users/me/'),
        api.get('/branches/').catch(() => ({ data: [] })),
        api.get('/shifts/current/'),
      ])
      setUser(me.data)
      setBranches(br.data || [])
      setCurrent(cur.data || null)
      const allowed = me.data?.branches || (me.data?.branch ? [me.data.branch] : [])
      const bid = allowed?.[0] || ''
      setBranchId(String(bid || ''))
    } catch (e) {
      setError(e?.response?.data?.detail || 'خطأ في تحميل بيانات الوردية')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const branchName = useMemo(() => {
    const b = branches.find((x) => String(x.id) === String(branchId))
    return b ? (b.name_ar || b.name_en) : ''
  }, [branches, branchId])

  const openShift = async () => {
    setError('')
    try {
      await api.post('/shifts/open/', {
        branch: Number(branchId),
        opening_cash: openingCash || 0,
      })
      await reload()
    } catch (e) {
      setError(e?.response?.data?.detail || 'فشل فتح الوردية')
    }
  }

  if (loading) return <div className="bg-white rounded-xl p-4 shadow">جاري التحميل...</div>

  if (current?.open) return <>{children}</>

  return (
    <div className="bg-white rounded-xl shadow-md p-5 max-w-xl mx-auto">
      <h2 className="text-lg font-bold mb-2">فتح وردية</h2>
      <p className="text-sm text-gray-500 mb-4">
        لا يمكن البدء بالبيع قبل فتح وردية للكاشير.
      </p>
      {error && <div className="mb-3 p-2 rounded bg-red-50 text-red-700 text-sm">{String(error)}</div>}
      <div className="grid gap-3">
        <label className="block">
          <span className="block text-sm text-gray-600 mb-1">الفرع</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={Boolean(user?.branch) && !(user?.branches && user.branches.length > 1)}
          >
            <option value="">{branchName ? branchName : 'اختر فرع'}</option>
            {(branches || [])
              .filter((b) => {
                const allowed = user?.branches || (user?.branch ? [user.branch] : [])
                if (!allowed || allowed.length === 0) return true
                return allowed.map(String).includes(String(b.id))
              })
              .map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name_ar || b.name_en}
                </option>
              ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm text-gray-600 mb-1">رصيد افتتاحي (نقداً)</span>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            inputMode="decimal"
          />
        </label>
        <button
          onClick={openShift}
          disabled={!branchId}
          className="w-full rounded-lg bg-[#1677ff] text-white py-2 font-semibold hover:bg-[#4096ff] disabled:opacity-60"
        >
          فتح الوردية
        </button>
      </div>
    </div>
  )
}

