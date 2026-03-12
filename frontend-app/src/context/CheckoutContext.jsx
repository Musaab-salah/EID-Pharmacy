import React, { createContext, useContext, useMemo, useState } from 'react'

const CheckoutContext = createContext(null)

export const CheckoutProvider = ({ children }) => {
  const [step, setStep] = useState(1)
  const [cart, setCart] = useState([])
  const [customer, setCustomer] = useState({ name: '', phone: '', notes: '' })
  const [payment, setPayment] = useState('CASH')
  const [paymentAccount, setPaymentAccount] = useState(null)
  const [paymentProof, setPaymentProof] = useState(null)

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
    const tax = 0
    const discount = 0
    return {
      subtotal,
      tax,
      discount,
      total: subtotal + tax - discount,
    }
  }, [cart])

  const addItem = (product, batch) => {
    if (!batch || product.stock <= 0 || batch.qty_on_hand <= 0) return false
    setCart((prev) => {
      const existing = prev.find((line) => line.batchId === batch.id)
      if (existing) {
        return prev.map((line) =>
          line.batchId === batch.id ? { ...line, qty: line.qty + 1 } : line,
        )
      }
      return [
        ...prev,
        {
          id: `${product.id}-${batch.id}`,
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.price || 0),
          qty: 1,
          image: product.image,
          stock: product.stock,
          batchId: batch.id,
          batchNo: batch.batch_no,
          expiry: batch.expiry_date,
        },
      ]
    })
    return true
  }

  const updateQty = (id, qty) => {
    if (qty <= 0) return
    setCart((prev) => prev.map((line) => (line.id === id ? { ...line, qty } : line)))
  }

  const removeItem = (id) => {
    setCart((prev) => prev.filter((line) => line.id !== id))
  }

  const clearCart = () => {
    setCart([])
    setPayment('CASH')
    setPaymentAccount(null)
    setPaymentProof(null)
  }

  const value = {
    step,
    setStep,
    cart,
    setCart,
    customer,
    setCustomer,
    payment,
    setPayment,
    paymentAccount,
    setPaymentAccount,
    paymentProof,
    setPaymentProof,
    totals,
    addItem,
    updateQty,
    removeItem,
    clearCart,
  }

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>
}

export const useCheckout = () => {
  const ctx = useContext(CheckoutContext)
  if (!ctx) {
    throw new Error('useCheckout must be used within CheckoutProvider')
  }
  return ctx
}
