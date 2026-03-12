import { useEffect, useMemo, useState } from 'react'
import api from '../../api'

const STORAGE_KEY = 'lowStockHideDate'

const useLowStock = () => {
  const [items, setItems] = useState([])
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  useEffect(() => {
    const hiddenDate = localStorage.getItem(STORAGE_KEY)
    if (hiddenDate === today) return

    const load = async () => {
      try {
        setLoading(true)
        const res = await api.get('/products/low-stock/')
        const data = res.data || []
        setItems(data)
        setShow(Array.isArray(data) && data.length > 0)
      } catch {
        setShow(false)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [today])

  const close = () => setShow(false)

  const hideForToday = () => {
    localStorage.setItem(STORAGE_KEY, today)
    setShow(false)
  }

  return { items, show, loading, close, hideForToday }
}

export default useLowStock
