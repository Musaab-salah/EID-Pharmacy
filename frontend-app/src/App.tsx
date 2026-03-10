import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Login from './pages/Login'
import Pos from './pages/Pos'
import { getToken } from './auth'

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const token = getToken()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

const App = () => {
  const { i18n } = useTranslation()
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr'

  return (
    <div dir={dir}>
      <BrowserRouter basename="/app">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Pos />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App
