import { ConfigProvider } from 'antd'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { getToken } from './auth'
import AdminLayout from './layout/AdminLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Products from './pages/Products'
import Batches from './pages/Batches'
import Users from './pages/Users'
import Branches from './pages/Branches'
import Customers from './pages/Customers'
import Inventory from './pages/Inventory'
import Reports from './pages/Reports'

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const token = getToken()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

const App = () => {
  const { i18n } = useTranslation()
  const direction = i18n.language === 'ar' ? 'rtl' : 'ltr'

  return (
    <ConfigProvider direction={direction}>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Dashboard />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/products"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Products />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/batches"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Batches />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/users"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Users />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/branches"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Branches />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/customers"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Customers />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/inventory"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Inventory />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Reports />
                </AdminLayout>
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
