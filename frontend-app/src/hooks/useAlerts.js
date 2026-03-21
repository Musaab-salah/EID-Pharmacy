import { useEffect, useState } from 'react'
import api from '../api'

const useAlerts = () => {
  const [lowStock, setLowStock] = useState([])
  const [nearExpiry, setNearExpiry] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const [lowRes, expRes] = await Promise.all([
        api.get('/products/low-stock/').catch(() => ({ data: [] })),
        api.get('/reports/expiring/?days=90').catch(() => ({ data: [] })),
      ])
      setLowStock(Array.isArray(lowRes.data) ? lowRes.data : [])
      setNearExpiry(Array.isArray(expRes.data) ? expRes.data : [])
    } catch {
      setLowStock([])
      setNearExpiry([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const count = lowStock.length + nearExpiry.length

  return { lowStock, nearExpiry, loading, count, refresh: load }
}

export default useAlerts
