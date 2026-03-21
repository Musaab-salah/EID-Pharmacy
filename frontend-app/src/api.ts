import axios from 'axios'
import { getToken, clearToken } from './auth'
import { API_URL } from './config'

const api = axios.create({
  baseURL: API_URL,
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
        window.location.href = '/app/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
