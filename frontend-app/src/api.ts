/**
 * Central API client — JWT from auth storage, base URL from config (VITE_API_URL in production).
 */
import axios from 'axios'
import { getToken, clearToken } from './auth'
import { API_URL } from './config'
import { loginHref } from './routerBase'

const api = axios.create({
  baseURL: API_URL,
  timeout: 120_000,
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
      if (!window.location.pathname.includes('/login')) {
        window.location.href = loginHref
      }
    }
    return Promise.reject(error)
  }
)

export default api
