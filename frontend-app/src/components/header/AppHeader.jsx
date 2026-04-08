import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import html2pdf from 'html2pdf.js'
import { useCheckout } from '../../context/CheckoutContext'
import { clearToken } from '../../auth'
import api from '../../api'

const toLocalDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const toLocalTime = (iso) => {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return null
  }
}

const AppHeader = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cart, setStep } = useCheckout()
  const [user, setUser] = useState(null)
  const [lowStock, setLowStock] = useState([])
  const [nearExpiry, setNearExpiry] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showDailyReport, setShowDailyReport] = useState(false)
  const [dailyReport, setDailyReport] = useState(null)
  const [dailyReportDate, setDailyReportDate] = useState(toLocalDate())
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

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout/')
    } catch {
      // ignore
    }
    clearToken()
    navigate('/login')
  }

  const handleCloseDay = () => {
    if (window.confirm(t('close_day_confirm'))) {
      handleLogout()
    }
  }

  const loadDailyReport = async () => {
    setDailyReport(null)
    try {
      const res = await api.get(`/reports/my-daily-activity/?date=${dailyReportDate}`)
      setDailyReport(res.data)
    } catch {
      setDailyReport({ error: true })
    }
  }

  const openDailyReport = () => {
    setShowUserMenu(false)
    setShowDailyReport(true)
    loadDailyReport()
  }

  const exportDailyReportPdf = () => {
    if (!dailyReport || dailyReport.error) return
    const dir = document.documentElement.dir || 'ltr'
    const fmtSession = (s) => {
      const login = toLocalTime(s.login_at_iso) || s.login_at
      const logout = s.logout_at_iso ? (toLocalTime(s.logout_at_iso) || s.logout_at) : (s.logout_at || t('daily_report_ongoing'))
      return `<tr><td>${login} – ${logout}</td><td>${s.minutes != null ? s.minutes + ' ' + t('daily_report_minutes') : '—'}</td></tr>`
    }
    const sessionsHtml = (dailyReport.sessions || []).length > 0
      ? (dailyReport.sessions || []).map((s) => fmtSession(s))
          .join('') +
        `<tr><td><strong>${t('daily_report_total_hours')}</strong></td><td><strong>${dailyReport.total_hours} ${t('daily_report_hours')}</strong></td></tr>`
      : `<tr><td colspan="2" style="text-align:center;color:#999">${t('daily_report_no_sessions')}</td></tr>`

    const fmtSale = (s) => {
      const time = toLocalTime(s.time_iso) || s.time
      return `<tr><td>#${s.invoice_no} – ${time}</td><td>${Number(s.grand_total).toFixed(2)}</td></tr>`
    }
    const salesHtml = (dailyReport.sales || []).length > 0
      ? (dailyReport.sales || []).map((s) => fmtSale(s))
          .join('') +
        `<tr><td><strong>${t('daily_report_invoices_count')}: ${dailyReport.sales_count}</strong></td><td><strong>${dailyReport.sales_total?.toFixed(2)}</strong></td></tr>`
      : `<tr><td colspan="2" style="text-align:center;color:#999">${t('daily_report_no_sales')}</td></tr>`

    const html = `
      <div id="daily-report-pdf-export" dir="${dir}" style="font-family: Arial, 'Segoe UI', Tahoma, sans-serif; padding: 24px; max-width: 400px; background: white;">
        <h2 style="color: #1677ff; margin: 0 0 8px 0; font-size: 18px;">${t('daily_report')}</h2>
        <p style="color: #666; font-size: 12px; margin: 0 0 20px 0;">${dailyReport.user_name} – ${dailyReport.date}</p>
        <h3 style="font-size: 14px; margin: 0 0 8px 0; color: #333;">${t('daily_report_attendance')}</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
          <thead><tr style="background: #f5f5f5;"><th style="padding: 8px; text-align: ${dir === 'rtl' ? 'right' : 'left'}; border: 1px solid #eee;">${t('daily_report_login_logout')}</th><th style="padding: 8px; text-align: center; border: 1px solid #eee;">${t('daily_report_minutes')}</th></tr></thead>
          <tbody>${sessionsHtml}</tbody>
        </table>
        <h3 style="font-size: 14px; margin: 0 0 8px 0; color: #333;">${t('daily_report_sales')}</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead><tr style="background: #f5f5f5;"><th style="padding: 8px; text-align: ${dir === 'rtl' ? 'right' : 'left'}; border: 1px solid #eee;">${t('invoice_no')}</th><th style="padding: 8px; text-align: center; border: 1px solid #eee;">${t('total')}</th></tr></thead>
          <tbody>${salesHtml}</tbody>
        </table>
      </div>
    `
    const el = document.createElement('div')
    el.innerHTML = html
    el.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 420px;'
    document.body.appendChild(el)
    const target = el.querySelector('#daily-report-pdf-export')
    if (target) {
      html2pdf()
        .set({
          margin: 10,
          filename: `daily-report-${dailyReport.date}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(target)
        .save()
        .then(() => {
          document.body.removeChild(el)
        })
        .catch(() => {
          document.body.removeChild(el)
        })
    } else {
      document.body.removeChild(el)
    }
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
    <header className="sticky top-0 z-40 bg-white border-b shadow-sm print:hidden">
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
              <div className="absolute top-full end-0 mt-2 w-56 bg-white rounded-xl shadow-lg border z-50 py-1">
                <div className="px-3 py-2 border-b text-sm text-gray-600">
                  {user?.name || t('user')}
                </div>
                <button
                  onClick={openDailyReport}
                  className="w-full text-start px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>📊</span>
                  {t('daily_report')}
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    handleCloseDay()
                  }}
                  className="w-full text-start px-3 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                >
                  <span>✓</span>
                  {t('close_day')}
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    handleLogout()
                  }}
                  className="w-full text-start px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDailyReport && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDailyReport(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-l from-[#1677ff] to-[#4096ff] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                <h3 className="font-bold text-lg text-white">{t('daily_report')}</h3>
              </div>
              <button
                onClick={() => setShowDailyReport(false)}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-lg transition-colors"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-5 space-y-4">
              {/* Date picker */}
              <div className="flex gap-2 items-center flex-wrap">
                <label className="text-sm font-medium text-gray-600">{t('daily_report_date')}:</label>
                <input
                  type="date"
                  value={dailyReportDate}
                  onChange={(e) => setDailyReportDate(e.target.value)}
                  className="flex-1 min-w-[140px] border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#1677ff]/30 focus:border-[#1677ff] outline-none transition-all"
                />
                <button
                  onClick={loadDailyReport}
                  className="rounded-xl bg-[#1677ff] hover:bg-[#4096ff] text-white px-4 py-2.5 text-sm font-medium transition-colors shadow-sm"
                >
                  {t('daily_report_show')}
                </button>
                {dailyReport && !dailyReport.error && (
                  <button
                    onClick={exportDailyReportPdf}
                    className="rounded-xl border border-[#1677ff] text-[#1677ff] hover:bg-[#1677ff]/5 px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <span>📄</span>
                    {t('daily_report_export_pdf')}
                  </button>
                )}
              </div>

              {dailyReport ? (
                <>
                  {/* User & date card */}
                  <div className="rounded-xl bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-100 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#1677ff]/10 flex items-center justify-center">
                        <span className="text-xl font-bold text-[#1677ff]">
                          {dailyReport.user_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{dailyReport.user_name}</div>
                        <div className="text-sm text-gray-500">{dailyReport.date}</div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance section */}
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                      <span className="text-lg">🕐</span>
                      <span className="font-semibold text-gray-800">{t('daily_report_attendance')}</span>
                      <span className="text-xs text-gray-500">({t('daily_report_login_logout')})</span>
                    </div>
                    <div className="p-4">
                      {dailyReport.sessions?.length > 0 ? (
                        <div className="space-y-3">
                          {dailyReport.sessions.map((s, i) => (
                            <div
                              key={i}
                              className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-gray-50/80 hover:bg-gray-50"
                            >
                              <span className="text-sm font-medium text-gray-700">
                                {(s.login_at_iso ? toLocalTime(s.login_at_iso) : null) || s.login_at} – {(s.logout_at_iso ? toLocalTime(s.logout_at_iso) : null) || s.logout_at || t('daily_report_ongoing')}
                              </span>
                              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md">
                                {s.minutes != null ? `${s.minutes} ${t('daily_report_minutes')}` : '—'}
                              </span>
                            </div>
                          ))}
                          <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">{t('daily_report_total_hours')}</span>
                            <span className="font-semibold text-[#1677ff]">{dailyReport.total_hours} {t('daily_report_hours')}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-gray-400 text-sm">{t('daily_report_no_sessions')}</div>
                      )}
                    </div>
                  </div>

                  {/* Sales section */}
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                      <span className="text-lg">🛒</span>
                      <span className="font-semibold text-gray-800">{t('daily_report_sales')}</span>
                    </div>
                    <div className="p-4">
                      {dailyReport.sales?.length > 0 ? (
                        <div className="space-y-2">
                          {dailyReport.sales.map((s) => (
                            <div
                              key={s.id}
                              className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-sm text-gray-700">
                                #{s.invoice_no} <span className="text-gray-400">•</span> {(s.time_iso ? toLocalTime(s.time_iso) : null) || s.time}
                              </span>
                              <span className="font-medium text-gray-800">{Number(s.grand_total).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="pt-3 mt-2 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              {t('daily_report_invoices_count')}: {dailyReport.sales_count}
                            </span>
                            <span className="font-bold text-[#1677ff] text-lg">
                              {dailyReport.sales_total?.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-gray-400 text-sm">{t('daily_report_no_sales')}</div>
                      )}
                    </div>
                  </div>
                </>
              ) : dailyReport?.error ? (
                <div className="py-12 text-center">
                  <span className="text-4xl block mb-2">⚠️</span>
                  <p className="text-red-500 font-medium">{t('daily_report_error')}</p>
                  <button
                    onClick={loadDailyReport}
                    className="mt-3 text-sm text-[#1677ff] hover:underline"
                  >
                    {t('daily_report_show')}
                  </button>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="inline-block w-8 h-8 border-2 border-[#1677ff] border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-gray-500 text-sm">{t('daily_report_loading')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default AppHeader
