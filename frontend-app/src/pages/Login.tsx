import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api'
import { setToken } from '../auth'

const Login = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await api.post('/auth/token/', {
        email,
        password,
        source: 'app',
      })
      setToken(response.data.access)
      navigate('/')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'فشل تسجيل الدخول'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-md p-6 w-full max-w-sm"
      >
        <h2 className="text-xl font-bold mb-2 text-center">{t('login')}</h2>
        <p className="text-sm text-gray-500 mb-4 text-center">
          {t('page_objective')}: {t('app_objective_login')}
        </p>
        {error && (
          <div className="mb-4 p-2 rounded bg-red-50 text-red-600 text-sm">{error}</div>
        )}
        <label className="block mb-3">
          <span className="block text-sm text-gray-600 mb-1">{t('email')}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            required
          />
        </label>
        <label className="block mb-4">
          <span className="block text-sm text-gray-600 mb-1">{t('password')}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#1677ff] text-white py-2 font-semibold hover:bg-[#4096ff] disabled:opacity-60"
        >
          {loading ? 'جاري...' : t('login')}
        </button>
      </form>
    </div>
  )
}

export default Login
