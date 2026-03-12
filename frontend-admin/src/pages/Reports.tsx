import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
} from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import dayjs from 'dayjs'

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
  const [purchases, setPurchases] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [nearExpiry, setNearExpiry] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [purchaseFilters, setPurchaseFilters] = useState({
    date_from: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    date_to: dayjs().format('YYYY-MM-DD'),
    supplier_id: '',
    product_id: '',
  })
  const [salesFilters, setSalesFilters] = useState({
    date_from: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    date_to: dayjs().format('YYYY-MM-DD'),
    cashier_id: '',
    payment_method: '',
  })
  const [lowStockThreshold, setLowStockThreshold] = useState<number | ''>('')

  const loadPurchases = () => {
    const params = new URLSearchParams()
    if (purchaseFilters.date_from) params.set('date_from', purchaseFilters.date_from)
    if (purchaseFilters.date_to) params.set('date_to', purchaseFilters.date_to)
    if (purchaseFilters.supplier_id) params.set('supplier_id', purchaseFilters.supplier_id)
    if (purchaseFilters.product_id) params.set('product_id', purchaseFilters.product_id)
    api.get(`/reports/purchases/?${params}`).then((res) => setPurchases(res.data))
  }

  const loadSales = () => {
    const params = new URLSearchParams()
    if (salesFilters.date_from) params.set('date_from', salesFilters.date_from)
    if (salesFilters.date_to) params.set('date_to', salesFilters.date_to)
    if (salesFilters.cashier_id) params.set('cashier_id', salesFilters.cashier_id)
    if (salesFilters.payment_method) params.set('payment_method', salesFilters.payment_method)
    api.get(`/reports/sales/?${params}`).then((res) => setSales(res.data))
  }

  const loadLowStock = () => {
    const params = lowStockThreshold !== '' ? `?threshold=${lowStockThreshold}` : ''
    api.get(`/reports/low_stock/${params}`).then((res) => setLowStock(res.data))
  }

  const loadNearExpiry = () => {
    api.get('/reports/expiring/?days=90').then((res) => setNearExpiry(res.data))
  }

  useEffect(() => {
    api.get('/reports/daily_sales/').then((res) => setDaily(res.data))
    api.get('/reports/monthly_sales/').then((res) => setMonthly(res.data))
    api.get('/suppliers/').then((res) => setSuppliers(res.data))
    api.get('/branches/').then((res) => setBranches(res.data))
    api.get('/products/').then((res) => setProducts(res.data))
    api.get('/users/').then((res) => setUsers(res.data))
  }, [])

  useEffect(() => {
    loadPurchases()
  }, [purchaseFilters])

  useEffect(() => {
    loadSales()
  }, [salesFilters])

  useEffect(() => {
    loadLowStock()
    loadNearExpiry()
  }, [])

  const purchaseFlattened = purchases.flatMap((p) =>
    (p.lines || []).map((l: any) => ({
      invoice_no: p.invoice_no,
      purchase_date: p.purchase_date,
      supplier_name: p.supplier_name_ar || p.supplier_name,
      product_name: l.product_name_ar || l.product_name,
      qty: l.qty,
      unit_price: l.unit_price,
      line_total: l.line_total,
    }))
  )

  const salesFlattened = sales.flatMap((s) =>
    (s.lines || []).map((l: any) => ({
      invoice_no: s.invoice_no,
      sale_date: s.sale_date,
      cashier_name: s.cashier_name,
      payment_method: s.payment_method,
      product_name: l.product_name_ar || l.product_name,
      qty: l.qty,
      unit_price: l.unit_price,
      line_total: l.line_total,
    }))
  )

  return (
    <div>
      <Typography.Title level={3}>{t('reports')}</Typography.Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Typography.Title level={5}>{t('daily_sales')}</Typography.Title>
            <div>
              {t('count')}: {daily.count || 0}
            </div>
            <div>
              {t('total')}: {Number(daily.total || 0).toFixed(2)}
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
              {t('total')}: {Number(monthly.total || 0).toFixed(2)}
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'purchases',
            label: t('purchase_reports'),
            children: (
              <Card>
                <Space style={{ marginBottom: 16 }} wrap>
                  <DatePicker.RangePicker
                    value={[
                      purchaseFilters.date_from ? dayjs(purchaseFilters.date_from) : null,
                      purchaseFilters.date_to ? dayjs(purchaseFilters.date_to) : null,
                    ]}
                    onChange={(dates) => {
                      if (dates?.[0]) setPurchaseFilters((f) => ({ ...f, date_from: dates[0].format('YYYY-MM-DD') }))
                      if (dates?.[1]) setPurchaseFilters((f) => ({ ...f, date_to: dates[1].format('YYYY-MM-DD') }))
                    }}
                  />
                  <Select
                    placeholder={t('supplier')}
                    allowClear
                    style={{ width: 180 }}
                    value={purchaseFilters.supplier_id || undefined}
                    onChange={(v) => setPurchaseFilters((f) => ({ ...f, supplier_id: v || '' }))}
                    options={suppliers.map((s) => ({ value: String(s.id), label: s.name_ar || s.name_en }))}
                  />
                  <Select
                    placeholder={t('product')}
                    allowClear
                    style={{ width: 180 }}
                    value={purchaseFilters.product_id || undefined}
                    onChange={(v) => setPurchaseFilters((f) => ({ ...f, product_id: v || '' }))}
                    options={products.map((p) => ({ value: String(p.id), label: p.name_ar || p.name_en }))}
                  />
                  <Button onClick={loadPurchases}>{t('apply')}</Button>
                  <Button onClick={() => downloadCsv(purchaseFlattened, 'purchases.csv')}>
                    {t('export_csv')}
                  </Button>
                </Space>
                <Table
                  rowKey="id"
                  dataSource={purchases}
                  columns={[
                    { title: t('purchase_date'), dataIndex: 'purchase_date' },
                    { title: t('invoice_no'), dataIndex: 'invoice_no' },
                    { title: t('supplier'), dataIndex: 'supplier_name_ar', render: (_, r) => r.supplier_name_ar || r.supplier_name },
                    {
                      title: t('products'),
                      render: (_, r) =>
                        (r.lines || []).map((l: any) => `${l.product_name_ar || l.product_name} × ${l.qty}`).join(', '),
                    },
                    { title: t('total'), dataIndex: 'total', render: (v: number) => v?.toFixed(2) },
                  ]}
                  expandable={{
                    expandedRowRender: (record) => (
                      <Table
                        size="small"
                        rowKey={(r) => `${r.product_id}-${r.qty}-${r.unit_price}`}
                        dataSource={record.lines || []}
                        columns={[
                          { title: t('product'), dataIndex: 'product_name_ar', render: (_, r) => r.product_name_ar || r.product_name },
                          { title: t('qty'), dataIndex: 'qty' },
                          { title: t('purchase_price'), dataIndex: 'unit_price', render: (v: number) => v?.toFixed(2) },
                          { title: t('line_total'), dataIndex: 'line_total', render: (v: number) => v?.toFixed(2) },
                        ]}
                        pagination={false}
                      />
                    ),
                  }}
                />
              </Card>
            ),
          },
          {
            key: 'sales',
            label: t('sales_reports'),
            children: (
              <Card>
                <Space style={{ marginBottom: 16 }} wrap>
                  <DatePicker.RangePicker
                    value={[
                      salesFilters.date_from ? dayjs(salesFilters.date_from) : null,
                      salesFilters.date_to ? dayjs(salesFilters.date_to) : null,
                    ]}
                    onChange={(dates) => {
                      if (dates?.[0]) setSalesFilters((f) => ({ ...f, date_from: dates[0].format('YYYY-MM-DD') }))
                      if (dates?.[1]) setSalesFilters((f) => ({ ...f, date_to: dates[1].format('YYYY-MM-DD') }))
                    }}
                  />
                  <Select
                    placeholder={t('cashier')}
                    allowClear
                    style={{ width: 180 }}
                    value={salesFilters.cashier_id || undefined}
                    onChange={(v) => setSalesFilters((f) => ({ ...f, cashier_id: v || '' }))}
                    options={users.map((u) => ({ value: String(u.id), label: u.name }))}
                  />
                  <Select
                    placeholder={t('payment_method')}
                    allowClear
                    style={{ width: 180 }}
                    value={salesFilters.payment_method || undefined}
                    onChange={(v) => setSalesFilters((f) => ({ ...f, payment_method: v || '' }))}
                    options={[
                      { value: 'CASH', label: t('cash') },
                      { value: 'TRANSFER', label: t('transfer') },
                    ]}
                  />
                  <Button onClick={loadSales}>{t('apply')}</Button>
                  <Button onClick={() => downloadCsv(salesFlattened, 'sales.csv')}>
                    {t('export_csv')}
                  </Button>
                </Space>
                <Table
                  rowKey="id"
                  dataSource={sales}
                  columns={[
                    { title: t('sale_date'), dataIndex: 'sale_date' },
                    { title: t('invoice_no'), dataIndex: 'invoice_no' },
                    { title: t('cashier'), dataIndex: 'cashier_name' },
                    { title: t('payment_method'), dataIndex: 'payment_method' },
                    {
                      title: t('products'),
                      render: (_, r) =>
                        (r.lines || []).map((l: any) => `${l.product_name_ar || l.product_name} × ${l.qty}`).join(', '),
                    },
                    { title: t('grand_total'), dataIndex: 'grand_total', render: (v: number) => v?.toFixed(2) },
                  ]}
                  expandable={{
                    expandedRowRender: (record) => (
                      <Table
                        size="small"
                        rowKey={(r) => `${r.product_id}-${r.qty}-${r.unit_price}`}
                        dataSource={record.lines || []}
                        columns={[
                          { title: t('product'), dataIndex: 'product_name_ar', render: (_, r) => r.product_name_ar || r.product_name },
                          { title: t('qty'), dataIndex: 'qty' },
                          { title: t('price'), dataIndex: 'unit_price', render: (v: number) => v?.toFixed(2) },
                          { title: t('line_total'), dataIndex: 'line_total', render: (v: number) => v?.toFixed(2) },
                        ]}
                        pagination={false}
                      />
                    ),
                  }}
                />
              </Card>
            ),
          },
          {
            key: 'low_stock',
            label: t('low_stock'),
            children: (
              <Card>
                <Space style={{ marginBottom: 16 }}>
                  <Typography.Text>{t('min_quantity_threshold')}:</Typography.Text>
                  <Input
                    type="number"
                    placeholder={t('use_product_min')}
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{ width: 120 }}
                  />
                  <Button onClick={loadLowStock}>{t('apply')}</Button>
                  <Button onClick={() => downloadCsv(lowStock, 'low_stock.csv')}>
                    {t('export_csv')}
                  </Button>
                </Space>
                <Table
                  rowKey="id"
                  dataSource={lowStock}
                  columns={[
                    { title: t('product'), dataIndex: 'name_ar', render: (_, r) => r.name_ar || r.name_en },
                    { title: t('current_quantity'), dataIndex: 'current_quantity' },
                    { title: t('min_quantity'), dataIndex: 'min_quantity' },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'near_expiry',
            label: t('near_expiry'),
            children: (
              <Card>
                <Typography.Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
                  {t('near_expiry_desc')}
                </Typography.Text>
                <Button onClick={() => downloadCsv(nearExpiry, 'near_expiry.csv')} style={{ marginBottom: 16 }}>
                  {t('export_csv')}
                </Button>
                <Table
                  rowKey="id"
                  dataSource={nearExpiry}
                  columns={[
                    { title: t('product'), dataIndex: 'product_name_ar', render: (_, r) => r.product_name_ar || r.product_name },
                    { title: t('batch_no'), dataIndex: 'batch_no' },
                    { title: t('expiry_date'), dataIndex: 'expiry_date' },
                    { title: t('qty_on_hand'), dataIndex: 'qty_on_hand' },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}

export default Reports
