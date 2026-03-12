import React, { useEffect, useMemo, useState } from 'react'
import ProductsPage from './ProductsPage'
import CustomerDetails from './CustomerDetails'
import PaymentMethod from './PaymentMethod'
import InvoicePreview from './InvoicePreview'
import { useCheckout } from '../../context/CheckoutContext'
import api from '../../api'
import { getToken } from '../../auth'

const API_BASE = 'http://localhost:8000/api'

const CheckoutWizard = () => {
  const { step, setStep } = useCheckout()
  const [products, setProducts] = useState([])
  const [batches, setBatches] = useState([])
  const [search, setSearch] = useState('')
  const [barcode, setBarcode] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [receiptItems, setReceiptItems] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const [productsRes, batchesRes, userRes] = await Promise.all([
          api.get('/products/'),
          api.get('/batches/'),
          api.get('/users/me/'),
        ])
        setProducts(productsRes.data || [])
        setBatches(batchesRes.data || [])
        setUserInfo(userRes.data || null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'F1') {
        event.preventDefault()
        setStep(1)
      }
      if (event.key === 'F2') {
        event.preventDefault()
        setStep(2)
      }
      if (event.key === 'F3') {
        event.preventDefault()
        setStep(3)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const playDing = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.value = 0.12
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    setTimeout(() => {
      osc.stop()
      ctx.close()
    }, 120)
  }

  const productsWithStock = useMemo(() => {
    const byProduct = {}
    batches.forEach((b) => {
      if (b.qty_on_hand <= 0) return
      if (!byProduct[b.product]) byProduct[b.product] = []
      byProduct[b.product].push(b)
    })
    Object.values(byProduct).forEach((list) => {
      list.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
    })
    return products.map((p) => {
      const productBatches = byProduct[p.id] || []
      const stock = productBatches.reduce((sum, b) => sum + (b.qty_on_hand || 0), 0)
      return {
        id: p.id,
        name: p.name_ar || p.name_en,
        desc: p.place_of_manufacture || '',
        sku: p.sku || '-',
        barcode: p.barcode || '',
        categoryId: p.category || null,
        categoryName: p.category_name_ar || p.category_name_en || '',
        image: p.image ? `${API_BASE.replace('/api', '')}${p.image.startsWith('/') ? '' : '/media/'}${p.image}` : '',
        price: Number(p.price || 0),
        stock,
        batches: productBatches,
      }
    })
  }, [products, batches])

  const categories = useMemo(() => {
    const map = new Map()
    productsWithStock.forEach((p) => {
      if (!p.categoryId) return
      if (!map.has(p.categoryId)) {
        map.set(p.categoryId, { id: p.categoryId, name: p.categoryName })
      }
    })
    return Array.from(map.values())
  }, [productsWithStock])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return productsWithStock.filter((p) => {
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.barcode.toLowerCase().includes(term)
      const matchesCategory = category === 'all' || p.categoryId === category
      return matchesSearch && matchesCategory
    })
  }, [productsWithStock, search, category])

  const lookupCustomer = async (phone) => {
    const token = getToken()
    const res = await fetch(`${API_BASE}/customers/lookup/?phone=${encodeURIComponent(phone)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    return res.json()
  }

  const createOrder = async (payload) => {
    let customerId = null
    if (payload.customer && (payload.customer.name || payload.customer.phone)) {
      const customerRes = await api.post('/customers/', {
        name: payload.customer.name || 'Guest',
        phone: payload.customer.phone || '',
      })
      customerId = customerRes.data?.id || null
    }

    const paymentProof = payload.payment_proof
    const isTransferWithProof = payload.payment_method === 'TRANSFER' && paymentProof instanceof File

    if (isTransferWithProof) {
      const form = new FormData()
      form.append('branch', payload.branch)
      form.append('cashier', payload.cashier)
      if (customerId != null) form.append('customer', customerId)
      form.append('discount', payload.discount ?? 0)
      form.append('tax', payload.tax ?? 0)
      form.append('payment_method', 'TRANSFER')
      form.append('payment_account', payload.payment_account || '')
      form.append('lines', JSON.stringify(payload.lines || []))
      form.append('payment_proof', paymentProof)
      return api.post('/orders/create/', form)
    }

    const { payment_proof: _, ...rest } = payload
    const finalPayload = { ...rest, customer: customerId }
    return api.post('/orders/create/', finalPayload)
  }

  if (loading) {
    return <div className="bg-white rounded-xl p-4 shadow">جاري التحميل...</div>
  }

  return (
    <CheckoutInner
      step={step}
      setStep={setStep}
      products={filtered}
      search={search}
      setSearch={setSearch}
      barcode={barcode}
      setBarcode={setBarcode}
      categories={categories}
      category={category}
      setCategory={setCategory}
      onLookup={lookupCustomer}
      createOrder={createOrder}
      userInfo={userInfo}
      invoice={invoice}
      setInvoice={setInvoice}
      receiptItems={receiptItems}
      setReceiptItems={setReceiptItems}
      onDing={playDing}
    />
  )
}

const CheckoutInner = ({
  step,
  setStep,
  products,
  search,
  setSearch,
  barcode,
  setBarcode,
  categories,
  category,
  setCategory,
  onLookup,
  createOrder,
  userInfo,
  invoice,
  setInvoice,
  receiptItems,
  setReceiptItems,
  onDing,
}) => {
  const { cart, clearCart } = useCheckout()
  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0)

  const handleComplete = async (payload) => {
    try {
      const res = await createOrder(payload)
      setInvoice(res.data)
      setReceiptItems(cart)
      clearCart()
      setStep(4)
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data || err?.message || 'فشل إنشاء الطلب'
      alert(typeof msg === 'object' ? JSON.stringify(msg) : msg)
    }
  }

  const handleNewSale = () => {
    setInvoice(null)
    setReceiptItems([])
    setStep(1)
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex items-center gap-2 ${
                step === s ? 'text-[#1677ff]' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === s ? 'bg-[#1677ff] text-white' : 'bg-gray-200'
                }`}
              >
                {s}
              </div>
              <span className="text-sm">
                {s === 1 ? 'المنتجات' : s === 2 ? 'العميل' : s === 3 ? 'الدفع' : 'الفاتورة'}
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-full bg-[#e6f4ff] text-[#1677ff] text-sm px-3 py-1">
          السلة: {cartCount}
        </div>
      </div>

      <div className="transition-all duration-200 animate-fade">
        {step === 1 && (
          <ProductsPage
            products={products}
            search={search}
            setSearch={setSearch}
            barcode={barcode}
            setBarcode={setBarcode}
            categories={categories}
            category={category}
            setCategory={setCategory}
            onNext={() => setStep(2)}
            onDing={onDing}
          />
        )}

        {step === 2 && (
          <CustomerDetails
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            onLookup={onLookup}
          />
        )}

        {step === 3 && (
          <PaymentMethod
            onBack={() => setStep(2)}
            onComplete={handleComplete}
            userInfo={userInfo}
          />
        )}

        {step === 4 && (
          <InvoicePreview
            invoice={invoice}
            items={receiptItems}
            onPrint={() => window.print()}
            onNewSale={handleNewSale}
          />
        )}
      </div>
    </div>
  )
}

export default CheckoutWizard
