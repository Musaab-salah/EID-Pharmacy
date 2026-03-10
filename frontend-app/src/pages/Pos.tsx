import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { clearToken } from '../auth'
import LanguageSwitch from '../components/LanguageSwitch'

type Product = {
  id: number
  name_en: string
  name_ar: string
  barcode: string
  price: number
}

type Batch = {
  id: number
  batch_no: string
  expiry_date: string
  qty_on_hand: number
  unit_cost: number
}

type CartLine = {
  product: Product
  batch: Batch
  qty: number
  unit_price: number
  line_total: number
}

const Pos = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [todaySales, setTodaySales] = useState({ count: 0, total: 0 })
  const [userInfo, setUserInfo] = useState<any>(null)
  const [lastInvoice, setLastInvoice] = useState<any>(null)

  useEffect(() => {
    api.get('/products/').then((res) => setProducts(res.data))
    api.get('/users/me/').then((res) => setUserInfo(res.data))
    api.get('/sales/today/').then((res) => setTodaySales(res.data))
  }, [])

  const filteredProducts = useMemo(() => {
    if (!search) return products
    const term = search.toLowerCase()
    return products.filter(
      (p) =>
        p.name_en.toLowerCase().includes(term) ||
        p.name_ar.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term),
    )
  }, [search, products])

  const addToCart = async (product: Product) => {
    if (!userInfo?.branch) return
    const res = await api.get('/batches/fefo/', {
      params: { product_id: product.id, branch_id: userInfo.branch },
    })
    const batch: Batch | undefined = res.data[0]
    if (!batch) {
      alert(t('no_batch'))
      return
    }
    setCart((prev) => {
      const existing = prev.find(
        (line) => line.product.id === product.id && line.batch.id === batch.id,
      )
      if (existing) {
        const updated = prev.map((line) =>
          line === existing
            ? {
                ...line,
                qty: line.qty + 1,
                line_total: (line.qty + 1) * line.unit_price,
              }
            : line,
        )
        return updated
      }
      return [
        ...prev,
        {
          product,
          batch,
          qty: 1,
          unit_price: product.price,
          line_total: product.price,
        },
      ]
    })
  }

  const updateQty = (index: number, qty: number) => {
    if (qty <= 0) return
    setCart((prev) =>
      prev.map((line, i) =>
        i === index
          ? { ...line, qty, line_total: qty * line.unit_price }
          : line,
      ),
    )
  }

  const total = cart.reduce((sum, line) => sum + line.line_total, 0)

  const handleCheckout = async () => {
    if (!cart.length) return
    let customerId = null
    if (customerName) {
      const customerRes = await api.post('/customers/', {
        name: customerName,
        phone: customerPhone,
      })
      customerId = customerRes.data.id
    }

    const payload = {
      branch: userInfo.branch,
      customer: customerId,
      cashier: userInfo.id,
      discount: 0,
      tax: 0,
      lines: cart.map((line) => ({
        product: line.product.id,
        batch: line.batch.id,
        qty: line.qty,
        unit_price: line.unit_price,
        line_total: line.line_total,
      })),
    }
    const res = await api.post('/sales/', payload)
    setLastInvoice(res.data)
    setCart([])
    setCustomerName('')
    setCustomerPhone('')
    api.get('/sales/today/').then((r) => setTodaySales(r.data))
  }

  const handlePrint = () => {
    window.print()
  }

  const handleWhatsapp = () => {
    if (!lastInvoice?.id) return
    const message = encodeURIComponent(
      `${t('receipt')} #${lastInvoice.id} - ${t('grand_total')}: ${lastInvoice.grand_total}`,
    )
    const url = `https://wa.me/${customerPhone}?text=${message}`
    window.open(url, '_blank')
  }

  const handleLogout = () => {
    clearToken()
    navigate('/login')
  }

  return (
    <div className="pos">
      <header className="pos-header">
        <div>
          <h2>{t('app_title')}</h2>
        </div>
        <div className="header-actions">
          <LanguageSwitch />
          <button onClick={handleLogout}>{t('logout')}</button>
        </div>
      </header>

      <section className="pos-content">
        <div className="left">
          <div className="card">
            <h3>{t('search')}</h3>
            <input
              placeholder={t('search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="card">
            <h3>{t('products')}</h3>
            <div className="product-list">
              {filteredProducts.map((product) => (
                <button key={product.id} onClick={() => addToCart(product)}>
                  {i18n.language === 'ar' ? product.name_ar : product.name_en}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="right">
          <div className="card">
            <h3>{t('cart')}</h3>
            {!cart.length && <div>{t('empty_cart')}</div>}
            {cart.map((line, index) => (
              <div key={`${line.product.id}-${line.batch.id}`} className="cart-line">
                <div>
                  {i18n.language === 'ar' ? line.product.name_ar : line.product.name_en} (
                  {t('batch')} {line.batch.batch_no})
                </div>
                <input
                  type="number"
                  value={line.qty}
                  onChange={(e) => updateQty(index, Number(e.target.value))}
                />
                <div>{line.line_total.toFixed(2)}</div>
              </div>
            ))}
            <div className="totals">
              {t('total')}: {total.toFixed(2)}
            </div>
          </div>

          <div className="card">
            <h3>{t('customer')}</h3>
            <input
              placeholder={t('customer_name')}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <input
              placeholder={t('customer_phone')}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
            <button onClick={handleCheckout}>{t('checkout')}</button>
          </div>

          <div className="card">
            <h3>{t('today_sales')}</h3>
            <div>
              {todaySales.count} / {todaySales.total}
            </div>
          </div>

          {lastInvoice && (
            <div className="card receipt">
              <h3>{t('receipt')}</h3>
              <div>#{lastInvoice.id}</div>
              <div>{t('grand_total')}: {lastInvoice.grand_total}</div>
              <button onClick={handlePrint}>{t('print')}</button>
              <button onClick={handleWhatsapp}>{t('send_whatsapp')}</button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Pos
