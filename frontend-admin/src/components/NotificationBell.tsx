import { Badge, Button, Dropdown, Empty, List, Spin, Typography } from 'antd'
import {
  BellOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { stripAdminLinkPrefix } from '../routerBase'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ar'

dayjs.extend(relativeTime)

type NotificationItem = {
  id: number
  notification_type: string
  title: string
  message: string
  link: string
  related_id?: number
  read: boolean
  created_at: string
}

type LowStockItem = {
  id: number
  name_ar?: string
  name_en?: string
  current_quantity?: number
  stock?: number
}

type ExpiringItem = {
  id: number
  product_name?: string
  product_name_ar?: string
  expiry_date: string
  qty_on_hand: number
}

const POLL_INTERVAL_MS = 60000

const NotificationBell = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [lowStock, setLowStock] = useState<LowStockItem[]>([])
  const [expiring, setExpiring] = useState<ExpiringItem[]>([])
  const [badgeCount, setBadgeCount] = useState(0)

  const loadFull = useCallback(async () => {
    setLoading(true)
    try {
      const [notifRes, lowRes, expRes] = await Promise.all([
        api.get('/notifications/').catch(() => ({ data: [] })),
        api.get('/products/low-stock/').catch(() => ({ data: [] })),
        api.get('/reports/expiring/?days=90').catch(() => ({ data: [] })),
      ])
      setNotifications(Array.isArray(notifRes?.data) ? notifRes.data : [])
      setLowStock(Array.isArray(lowRes?.data) ? lowRes.data : [])
      setExpiring(Array.isArray(expRes?.data) ? expRes.data : [])
    } catch {
      setNotifications([])
      setLowStock([])
      setExpiring([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSummary = useCallback(async () => {
    try {
      const res = await api.get('/notifications/summary/')
      setBadgeCount(res.data?.total ?? 0)
    } catch {
      setBadgeCount(0)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadFull()
    } else {
      loadSummary()
    }
  }, [open, loadFull, loadSummary])

  useEffect(() => {
    loadSummary()
    const interval = setInterval(loadSummary, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [loadSummary])

  const systemUnread = notifications.filter((n) => !n.read).length
  const totalCount = systemUnread + lowStock.length + expiring.length

  const handleMarkRead = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await api.post(`/notifications/${id}/mark-read/`)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      loadSummary()
    } catch {
      // ignore
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read/')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      loadSummary()
    } catch {
      // ignore
    }
  }

  const handleNotificationClick = (item: NotificationItem) => {
    if (item.link && !item.read) {
      handleMarkRead(item.id)
    }
    if (item.link) {
      const path = stripAdminLinkPrefix(item.link)
      setOpen(false)
      navigate(path || '/')
    }
  }

  const content = (
    <div
      style={{
        width: 380,
        maxHeight: 480,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Typography.Text strong style={{ fontSize: 15 }}>
          {t('notifications')}
        </Typography.Text>
        {systemUnread > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllRead} style={{ padding: 0, height: 'auto' }}>
            {t('mark_all_read')}
          </Button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : (
          <>
            {notifications.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <DollarOutlined style={{ color: '#fa8c16', fontSize: 14 }} />
                  <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    {t('purchase_due_alerts')}
                  </Typography.Text>
                </div>
                <List
                  size="small"
                  dataSource={notifications.slice(0, 6)}
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      style={{
                        background: item.read ? '#fafafa' : '#fff7e6',
                        borderRadius: 8,
                        marginBottom: 6,
                        padding: '10px 12px',
                        cursor: item.link ? 'pointer' : 'default',
                        border: item.read ? '1px solid #f0f0f0' : '1px solid #ffd591',
                      }}
                      onClick={() => handleNotificationClick(item)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Typography.Text strong={!item.read} ellipsis>
                          {item.title}
                        </Typography.Text>
                        {item.message && (
                          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{item.message}</div>
                        )}
                        <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                          {dayjs(item.created_at).locale(i18n.language === 'ar' ? 'ar' : 'en').fromNow()}
                        </Typography.Text>
                      </div>
                      {!item.read && (
                        <Button
                          type="link"
                          size="small"
                          onClick={(e) => handleMarkRead(item.id, e)}
                          style={{ padding: '0 4px', flexShrink: 0 }}
                        >
                          {t('mark_read')}
                        </Button>
                      )}
                    </List.Item>
                  )}
                />
              </div>
            )}

            {lowStock.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 14 }} />
                  <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    {t('low_stock')}
                  </Typography.Text>
                </div>
                <List
                  size="small"
                  dataSource={lowStock.slice(0, 4)}
                  renderItem={(item) => (
                    <List.Item
                      key={`low-${item.id}`}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        marginBottom: 4,
                        background: '#fffbe6',
                        border: '1px solid #ffe58f',
                      }}
                    >
                      <Link
                        to="/products"
                        onClick={() => setOpen(false)}
                        style={{ color: 'inherit', textDecoration: 'none', width: '100%' }}
                      >
                        <Typography.Text>
                          {i18n.language === 'ar' ? item.name_ar || item.name_en : item.name_en || item.name_ar} —{' '}
                          <Typography.Text type="secondary">
                            {t('current_quantity')}: {item.current_quantity ?? item.stock ?? 0}
                          </Typography.Text>
                        </Typography.Text>
                      </Link>
                    </List.Item>
                  )}
                />
                {lowStock.length > 4 && (
                  <Link to="/reports" onClick={() => setOpen(false)}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      +{lowStock.length - 4} {t('more')} →
                    </Typography.Text>
                  </Link>
                )}
              </div>
            )}

            {expiring.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <ClockCircleOutlined style={{ color: '#ff7875', fontSize: 14 }} />
                  <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    {t('near_expiry')}
                  </Typography.Text>
                </div>
                <List
                  size="small"
                  dataSource={expiring.slice(0, 4)}
                  renderItem={(item) => (
                    <List.Item
                      key={`exp-${item.id}`}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        marginBottom: 4,
                        background: '#fff2f0',
                        border: '1px solid #ffccc7',
                      }}
                    >
                      <Link
                        to="/inventory"
                        onClick={() => setOpen(false)}
                        style={{ color: 'inherit', textDecoration: 'none', width: '100%' }}
                      >
                        <Typography.Text>
                          {i18n.language === 'ar' ? item.product_name_ar || item.product_name : item.product_name || item.product_name_ar} —{' '}
                          <Typography.Text type="secondary">
                            {item.expiry_date} ({item.qty_on_hand})
                          </Typography.Text>
                        </Typography.Text>
                      </Link>
                    </List.Item>
                  )}
                />
                {expiring.length > 4 && (
                  <Link to="/reports" onClick={() => setOpen(false)}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      +{expiring.length - 4} {t('more')} →
                    </Typography.Text>
                  </Link>
                )}
              </div>
            )}

            {notifications.length === 0 && lowStock.length === 0 && expiring.length === 0 && (
              <Empty
                image={<InboxOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                description={t('no_notifications')}
                style={{ padding: 40 }}
              />
            )}
          </>
        )}
      </div>

      {(notifications.length > 0 || lowStock.length > 0 || expiring.length > 0) && (
        <div
          style={{
            padding: 10,
            borderTop: '1px solid #f0f0f0',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          <Link to="/reports" onClick={() => setOpen(false)}>
            <Button type="primary" ghost size="small">
              {t('view_all')}
            </Button>
          </Link>
        </div>
      )}
    </div>
  )

  const displayCount = open ? totalCount : badgeCount

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      popupRender={() => content}
      trigger={['click']}
      placement="bottomRight"
    >
      <Badge count={displayCount} size="small" offset={[-2, 2]} showZero={false}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          style={{ width: 40, height: 40, padding: 0 }}
          title={t('notifications')}
        />
      </Badge>
    </Dropdown>
  )
}

export default NotificationBell
