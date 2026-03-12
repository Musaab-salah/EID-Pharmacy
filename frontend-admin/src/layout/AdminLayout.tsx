import { Layout, Menu, Typography, Button, Space } from 'antd'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitch from '../components/LanguageSwitch'
import { clearToken } from '../auth'

const { Header, Content, Sider } = Layout

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const menuItems = [
    { key: '/', label: <Link to="/">{t('dashboard')}</Link> },
    { key: '/products', label: <Link to="/products">{t('products')}</Link> },
    { key: '/categories', label: <Link to="/categories">{t('categories')}</Link> },
    { key: '/batches', label: <Link to="/batches">{t('batches')}</Link> },
    { key: '/users', label: <Link to="/users">{t('users')}</Link> },
    { key: '/branches', label: <Link to="/branches">{t('branches')}</Link> },
    { key: '/customers', label: <Link to="/customers">{t('customers')}</Link> },
    { key: '/payment-accounts', label: <Link to="/payment-accounts">{t('payment_accounts')}</Link> },
    { key: '/inventory', label: <Link to="/inventory">{t('inventory')}</Link> },
    { key: '/suppliers', label: <Link to="/suppliers">{t('suppliers')}</Link> },
    { key: '/purchases', label: <Link to="/purchases">{t('purchase_invoices')}</Link> },
    { key: '/reports', label: <Link to="/reports">{t('reports')}</Link> },
  ]

  const handleLogout = () => {
    clearToken()
    navigate('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220}>
        <div style={{ padding: 16 }}>
          <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
            {t('app_title')}
          </Typography.Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 16px' }}>
          <Space style={{ float: 'right' }}>
            <LanguageSwitch />
            <Button onClick={handleLogout}>{t('logout')}</Button>
          </Space>
        </Header>
        <Content style={{ padding: 24 }}>{children}</Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout
