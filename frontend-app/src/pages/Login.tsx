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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const response = await api.post('/auth/token/', { email, password })
    setToken(response.data.access)
    navigate('/')
  }

  return (
    <div className="centered">
      <form className="card" onSubmit={handleSubmit}>
        <h2>{t('login')}</h2>
        <label>
          {t('email')}
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          {t('password')}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit">{t('login')}</button>
      </form>
    </div>
  )
}

export default Login
