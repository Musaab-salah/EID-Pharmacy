import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCheckout } from '../../context/CheckoutContext'
import { clearToken } from '../../auth'
import api from '../../api'

const AppHeader = () => {
  const navigate = useNavigate()
  const { cart, setStep } = useCheckout()
  const [user, setUser] = useState(null)
  const [lowStock, setLowStock] = useState([])
  const [nearExpiry, setNearExpiry] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const dropdownRef = useRef(null)
  const userMenuRef = useRef(null)

  const alertCount = lowStock.length + nearExpiry.length

  useEffect(() => {
    api.get('/users/me/').then((res) => setUser(res.data)).catch(() => setUser(null))
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [lowRes, expRes] = await Promise.all([
          api.get('/products/low-stock/').catch(() => ({ data: [] })),
          api.get('/reports/expiring/?days=90').catch(() => ({ data: [] })),
        ])
        setLowStock(Array.isArray(lowRes?.data) ? lowRes.data : [])
        setNearExpiry(Array.isArray(expRes?.data) ? expRes.data : [])
      } catch {
        setLowStock([])
        setNearExpiry([])
      }
    }
    load()
  }, [])

  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0)

  const handleLogout = () => {
    clearToken()
    navigate('/login')
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-[#1677ff] flex items-center justify-center font-bold text-white">
            P
          </div>
          <div>
            <div className="text-sm font-semibold text-[#111]">EID pharmacy</div>
          </div>
        </div>

        <div className="flex-1 hidden md:flex items-center gap-2">
          <div className="flex-1 bg-gray-50 border rounded-full px-3 py-2 flex items-center gap-2">
            <span className="text-gray-400">🔎</span>
            <input
              className="bg-transparent w-full outline-none text-sm"
              placeholder="ابحث عن المنتج أو الباركود"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ms-auto">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="h-10 w-10 rounded-full border bg-white hover:bg-gray-50 relative"
              title="التنبيهات"
            >
              🔔
              {alertCount > 0 && (
                <span className="absolute -top-1 -end-1 text-[10px] bg-amber-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute top-full end-0 mt-2 w-80 max-h-96 overflow-auto bg-white rounded-xl shadow-lg border z-50">
                <div className="p-3 border-b flex justify-between items-center">
                  <span className="font-semibold">التنبيهات</span>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="max-h-72 overflow-auto">
                  {lowStock.length > 0 && (
                    <div className="p-2">
                      <div className="text-xs font-medium text-amber-600 mb-1">نقص الكمية</div>
                      {lowStock.slice(0, 5).map((item) => (
                        <div
                          key={`low-${item.id}`}
                          className="text-sm py-1.5 px-2 rounded bg-amber-50 border border-amber-100"
                        >
                          {item.name_ar || item.name_en} — المتوفر: {item.current_quantity ?? item.stock ?? 0}
                        </div>
                      ))}
                      {lowStock.length > 5 && (
                        <div className="text-xs text-gray-500 mt-1">+{lowStock.length - 5} أخرى</div>
                      )}
                    </div>
                  )}
                  {nearExpiry.length > 0 && (
                    <div className="p-2">
                      <div className="text-xs font-medium text-orange-600 mb-1">قرب انتهاء الصلاحية</div>
                      {nearExpiry.slice(0, 5).map((item) => (
                        <div
                          key={`exp-${item.id}`}
                          className="text-sm py-1.5 px-2 rounded bg-orange-50 border border-orange-100"
                        >
                          {item.product_name_ar || item.product_name} — ينتهي: {item.expiry_date} (الكمية: {item.qty_on_hand})
                        </div>
                      ))}
                      {nearExpiry.length > 5 && (
                        <div className="text-xs text-gray-500 mt-1">+{nearExpiry.length - 5} أخرى</div>
                      )}
                    </div>
                  )}
                  {alertCount === 0 && (
                    <div className="p-4 text-center text-gray-500 text-sm">لا توجد تنبيهات</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setStep(2)}
              className="h-10 w-10 rounded-full border bg-white hover:bg-gray-50"
              title="السلة"
            >
              🛒
            </button>
            {cartCount > 0 && (
              <span className="absolute -top-1 -end-1 text-[10px] bg-[#1677ff] text-white rounded-full px-1.5 py-0.5">
                {cartCount}
              </span>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="h-10 px-3 rounded-lg border bg-white hover:bg-gray-50 flex items-center gap-2"
              title={user?.name || 'المستخدم'}
            >
              <span className="h-8 w-8 rounded-full bg-[#1677ff] flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                {user?.name || 'المستخدم'}
              </span>
              <span className="text-gray-400 text-xs">▼</span>
            </button>
            {showUserMenu && (
              <div className="absolute top-full end-0 mt-2 w-48 bg-white rounded-xl shadow-lg border z-50 py-1">
                <div className="px-3 py-2 border-b text-sm text-gray-600">
                  {user?.name || 'المستخدم'}
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    handleLogout()
                  }}
                  className="w-full text-start px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
