import { Button, Card, Col, Row, Table, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'

const toCsv = (rows: any[]) => {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  rows.forEach((row) => {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))
  })
  return lines.join('\n')
}

const downloadCsv = (rows: any[], filename: string) => {
  const csv = toCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.setAttribute('download', filename)
  link.click()
}

const Reports = () => {
  const { t } = useTranslation()
  const [daily, setDaily] = useState<any>({})
  const [monthly, setMonthly] = useState<any>({})
  const [expiring, setExpiring] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])

  useEffect(() => {
    api.get('/reports/daily_sales/').then((res) => setDaily(res.data))
    api.get('/reports/monthly_sales/').then((res) => setMonthly(res.data))
    api.get('/reports/expiring/').then((res) => setExpiring(res.data))
    api.get('/reports/low_stock/').then((res) => setLowStock(res.data))
  }, [])

  return (
    <div>
      <Typography.Title level={3}>{t('reports')}</Typography.Title>
      <Row gutter={16}>
        <Col span={12}>
          <Card>
            <Typography.Title level={5}>{t('daily_sales')}</Typography.Title>
            <div>
              {t('count')}: {daily.count || 0}
            </div>
            <div>
              {t('total')}: {daily.total || 0}
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Typography.Title level={5}>{t('monthly_sales')}</Typography.Title>
            <div>
              {t('count')}: {monthly.count || 0}
            </div>
            <div>
              {t('total')}: {monthly.total || 0}
            </div>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Typography.Title level={5}>{t('expiring')}</Typography.Title>
        <Button onClick={() => downloadCsv(expiring, 'expiring.csv')}>
          {t('export_csv')}
        </Button>
        <Table
          rowKey="id"
          dataSource={expiring}
          columns={[
            { title: t('batch_no'), dataIndex: 'batch_no' },
            { title: t('expiry_date'), dataIndex: 'expiry_date' },
            { title: t('qty_on_hand'), dataIndex: 'qty_on_hand' },
          ]}
        />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Typography.Title level={5}>{t('low_stock')}</Typography.Title>
        <Button onClick={() => downloadCsv(lowStock, 'low_stock.csv')}>
          {t('export_csv')}
        </Button>
        <Table
          rowKey="id"
          dataSource={lowStock}
          columns={[
            { title: t('batch_no'), dataIndex: 'batch_no' },
            { title: t('qty_on_hand'), dataIndex: 'qty_on_hand' },
          ]}
        />
      </Card>
    </div>
  )
}

export default Reports
