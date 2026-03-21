import {
  Alert,
  Card,
  Col,
  List,
  Row,
  Statistic,
  Spin,
  Typography,
} from 'antd'
import {
  ShoppingCartOutlined,
  DollarOutlined,
  InboxOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  BankOutlined,
  CreditCardOutlined,
  AppstoreOutlined,
  TagsOutlined,
  ShopOutlined,
  UserOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import PageObjective from '../components/PageObjective'

type DashboardStats = {
  daily_sales: number
  daily_sales_count: number
  monthly_sales: number
  monthly_sales_count: number
  daily_purchases_count: number
  products_count: number
  categories_count: number
  batches_count: number
  branches_count: number
  suppliers_count: number
  users_count: number
  customers_count: number
  payment_accounts_count?: number
  low_stock_count: number
  expiring_count: number
  due_alerts_count: number
}

type PurchaseAlert = {
  id: number
  invoice_no: string
  supplier_name: string
  supplier_name_ar: string
  due_date: string
  amount: number | null
  total: number
}

const StatCard = ({
  title,
  value,
  suffix,
  icon,
  color,
  link,
}: {
  title: string
  value: number | string
  suffix?: string
  icon: React.ReactNode
  color?: string
  link?: string
}) => {
  const content = (
    <Card
      size="small"
      style={{
        height: '100%',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      styles={{
        body: { padding: '16px 20px' },
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ padding: 8, borderRadius: 8, background: `${color || '#1677ff'}15`, color: color || '#1677ff' }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Statistic
            title={title}
            value={value}
            suffix={suffix}
            valueStyle={{ color: color || '#1677ff', fontSize: 20, fontWeight: 600 }}
          />
        </div>
      </div>
    </Card>
  )
  if (link) {
    return (
      <Link
        to={link}
        style={{ textDecoration: 'none', color: 'inherit' }}
        onMouseEnter={(e) => {
          const card = e.currentTarget.querySelector('.ant-card')
          if (card) {
            ;(card as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
            ;(card as HTMLElement).style.transform = 'translateY(-2px)'
          }
        }}
        onMouseLeave={(e) => {
          const card = e.currentTarget.querySelector('.ant-card')
          if (card) {
            ;(card as HTMLElement).style.boxShadow = ''
            ;(card as HTMLElement).style.transform = ''
          }
        }}
      >
        {content}
      </Link>
    )
  }
  return content
}

const Dashboard = () => {
  const { t } = useTranslation()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [alerts, setAlerts] = useState<PurchaseAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, alertsRes] = await Promise.all([
          api.get('/reports/dashboard-stats/'),
          api.get('/reports/alerts/?days=7').catch(() => ({ data: [] })),
        ])
        setStats(statsRes.data)
        setAlerts(alertsRes.data || [])
      } catch {
        setStats(null)
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  const s = stats || ({} as DashboardStats)
  const hasAlerts = (s.low_stock_count || 0) + (s.expiring_count || 0) + (s.due_alerts_count || 0) > 0

  return (
    <div>
      <PageObjective objectiveKey="page_objective_dashboard" />
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        {t('dashboard')}
      </Typography.Title>

      {alerts.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={t('purchase_due_alerts')}
          description={
            <List
              size="small"
              dataSource={alerts.slice(0, 5)}
              renderItem={(a) => (
                <List.Item>
                  <Link to="/purchases">
                    {a.invoice_no} - {a.supplier_name_ar || a.supplier_name} - {t('due')}: {a.due_date}
                    {a.amount != null ? ` (${a.amount})` : ''}
                  </Link>
                </List.Item>
              )}
            />
          }
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Sales Section */}
      <Typography.Title level={5} style={{ marginBottom: 16, color: '#1677ff' }}>
        {t('dashboard_sales')}
      </Typography.Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} md={8}>
          <StatCard
            title={t('daily_sales')}
            value={Number(s.daily_sales || 0).toFixed(2)}
            suffix={`(${s.daily_sales_count || 0} ${t('count')})`}
            icon={<DollarOutlined />}
            color="#52c41a"
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <StatCard
            title={t('monthly_sales')}
            value={Number(s.monthly_sales || 0).toFixed(2)}
            suffix={`(${s.monthly_sales_count || 0} ${t('count')})`}
            icon={<ShoppingCartOutlined />}
            color="#1677ff"
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <StatCard
            title={t('dashboard_daily_purchases')}
            value={s.daily_purchases_count || 0}
            icon={<FileTextOutlined />}
            link="/purchases"
          />
        </Col>
      </Row>

      {/* Alerts Section */}
      {hasAlerts && (
        <>
          <Typography.Title level={5} style={{ marginBottom: 16, color: '#fa8c16' }}>
            {t('dashboard_alerts')}
          </Typography.Title>
          <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
            {(s.low_stock_count || 0) > 0 && (
              <Col xs={24} sm={8}>
                <Link to="/reports" style={{ textDecoration: 'none' }}>
                  <Card size="small" style={{ borderColor: '#ffa940', background: '#fff7e6' }}>
                    <Statistic
                      title={t('low_stock')}
                      value={s.low_stock_count}
                      prefix={<WarningOutlined style={{ color: '#fa8c16' }} />}
                      valueStyle={{ color: '#d46b08' }}
                    />
                  </Card>
                </Link>
              </Col>
            )}
            {(s.expiring_count || 0) > 0 && (
              <Col xs={24} sm={8}>
                <Link to="/reports" style={{ textDecoration: 'none' }}>
                  <Card size="small" style={{ borderColor: '#ff7875', background: '#fff2f0' }}>
                    <Statistic
                      title={t('near_expiry')}
                      value={s.expiring_count}
                      prefix={<ClockCircleOutlined style={{ color: '#ff4d4f' }} />}
                      valueStyle={{ color: '#cf1322' }}
                    />
                  </Card>
                </Link>
              </Col>
            )}
            {(s.due_alerts_count || 0) > 0 && (
              <Col xs={24} sm={8}>
                <Link to="/purchases" style={{ textDecoration: 'none' }}>
                  <Card size="small" style={{ borderColor: '#ffc069', background: '#fffbe6' }}>
                    <Statistic
                      title={t('purchase_due_alerts')}
                      value={s.due_alerts_count}
                      prefix={<WarningOutlined style={{ color: '#faad14' }} />}
                      valueStyle={{ color: '#d48806' }}
                    />
                  </Card>
                </Link>
              </Col>
            )}
          </Row>
        </>
      )}

      {/* System Entities */}
      <Typography.Title level={5} style={{ marginBottom: 16, color: '#595959' }}>
        {t('dashboard_entities')}
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title={t('products')}
            value={s.products_count || 0}
            icon={<AppstoreOutlined />}
            link="/products"
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title={t('categories')}
            value={s.categories_count || 0}
            icon={<TagsOutlined />}
            link="/categories"
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title={t('batches')}
            value={s.batches_count || 0}
            icon={<InboxOutlined />}
            link="/batches"
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title={t('branches')}
            value={s.branches_count || 0}
            icon={<ShopOutlined />}
            link="/branches"
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title={t('suppliers')}
            value={s.suppliers_count || 0}
            icon={<BankOutlined />}
            link="/suppliers"
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title={t('users')}
            value={s.users_count || 0}
            icon={<UserOutlined />}
            link="/users"
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title={t('customers')}
            value={s.customers_count || 0}
            icon={<TeamOutlined />}
            link="/customers"
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title={t('payment_accounts')}
            value={s.payment_accounts_count || 0}
            icon={<CreditCardOutlined />}
            link="/payment-accounts"
          />
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
