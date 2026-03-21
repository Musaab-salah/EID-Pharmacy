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
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../api'
import dayjs from 'dayjs'
import PageObjective from '../components/PageObjective'

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

const downloadPdf = (rows: any[], columns: { key: string; label: string }[], title: string, filename: string) => {
  if (!rows.length) return
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text(title, 14, 12)
  const headers = columns.map((c) => c.label)
  const data = rows.map((r) => columns.map((c) => String(r[c.key] ?? '')))
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 18,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 139, 202] },
  })
  doc.save(filename)
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
    date_from: dayjs().subtract(365, 'day').format('YYYY-MM-DD'),
    date_to: dayjs().format('YYYY-MM-DD'),
    supplier_id: '',
    product_id: '',
    branch_id: '',
  })
  const [salesFilters, setSalesFilters] = useState({
    date_from: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    date_to: dayjs().format('YYYY-MM-DD'),
    cashier_id: '',
    payment_method: '',
  })
  const [lowStockThreshold, setLowStockThreshold] = useState<number | ''>('')
  const [attendance, setAttendance] = useState<any[]>([])
  const [attendanceDateFrom, setAttendanceDateFrom] = useState(dayjs().format('YYYY-MM-DD'))
  const [attendanceDateTo, setAttendanceDateTo] = useState(dayjs().format('YYYY-MM-DD'))
  const [attendanceUser, setAttendanceUser] = useState<string>('')
  const [attendanceSource, setAttendanceSource] = useState<string>('all')
  const [activeReportTab, setActiveReportTab] = useState('purchases')
  const [myDailyReport, setMyDailyReport] = useState<any>(null)
  const [myDailyReportDate, setMyDailyReportDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [myDailyReportLoading, setMyDailyReportLoading] = useState(false)

  const loadPurchases = () => {
    const params = new URLSearchParams()
    if (purchaseFilters.date_from) params.set('date_from', purchaseFilters.date_from)
    if (purchaseFilters.date_to) params.set('date_to', purchaseFilters.date_to)
    if (purchaseFilters.supplier_id) params.set('supplier_id', purchaseFilters.supplier_id)
    if (purchaseFilters.product_id) params.set('product_id', purchaseFilters.product_id)
    if (purchaseFilters.branch_id) params.set('branch_id', purchaseFilters.branch_id)
    api.get(`/purchases/?${params}`).then((res) => {
      const data = res.data?.results ?? res.data
      setPurchases(Array.isArray(data) ? data : [])
    })
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

  const loadMyDailyReport = () => {
    setMyDailyReportLoading(true)
    setMyDailyReport(null)
    api
      .get(`/reports/my-daily-activity/?date=${myDailyReportDate}`)
      .then((res) => setMyDailyReport(res.data))
      .catch(() => setMyDailyReport({ error: true }))
      .finally(() => setMyDailyReportLoading(false))
  }

  const loadAttendance = () => {
    const params = new URLSearchParams()
    params.set('date_from', attendanceDateFrom)
    params.set('date_to', attendanceDateTo)
    if (attendanceUser && attendanceUser !== 'all') params.set('user_id', attendanceUser)
    if (attendanceSource && attendanceSource !== 'all') params.set('source', attendanceSource)
    api
      .get(`/reports/user-attendance/?${params}`)
      .then((res) => setAttendance(res.data || []))
      .catch(() => setAttendance([]))
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
      branch_name: p.branch_name || '',
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
      <PageObjective objectiveKey="page_objective_reports" />
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
        activeKey={activeReportTab}
        onChange={(key) => {
          setActiveReportTab(key)
          if (key === 'attendance') loadAttendance()
          if (key === 'daily_report') loadMyDailyReport()
        }}
        items={[
          {
            key: 'daily_report',
            label: t('daily_report'),
            children: (
              <Card>
                <Space style={{ marginBottom: 16 }} wrap>
                  <Typography.Text>{t('daily_report_date')}:</Typography.Text>
                  <DatePicker
                    value={myDailyReportDate ? dayjs(myDailyReportDate) : null}
                    onChange={(d) => setMyDailyReportDate(d ? d.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'))}
                  />
                  <Button type="primary" onClick={loadMyDailyReport} loading={myDailyReportLoading}>
                    {t('daily_report_show')}
                  </Button>
                  {myDailyReport && !myDailyReport.error && (
                    <>
                      <Button
                        onClick={() => {
                          const rows: any[] = [
                            {
                              type: 'summary',
                              info: `${myDailyReport.user_name} - ${myDailyReport.date}`,
                              value: `${t('total_hours')}: ${myDailyReport.total_hours}`,
                            },
                            ...(myDailyReport.sessions || []).map((s: any) => ({
                              type: t('daily_report_attendance'),
                              info: `${s.login_at} – ${s.logout_at || t('daily_report_ongoing')}`,
                              value: s.minutes ?? '',
                            })),
                            ...(myDailyReport.sales || []).map((s: any) => ({
                              type: t('daily_report_sales'),
                              info: `#${s.invoice_no} – ${s.time}`,
                              value: s.grand_total,
                            })),
                          ]
                          downloadCsv(rows, `daily-report-${myDailyReportDate}.csv`)
                        }}
                      >
                        {t('export_csv')}
                      </Button>
                      <Button
                        onClick={() => {
                          const sessions = myDailyReport.sessions || []
                          const sales = myDailyReport.sales || []
                          if (sessions.length > 0) {
                            downloadPdf(
                              sessions.map((s: any) => ({
                                session: `${s.login_at} – ${s.logout_at || t('daily_report_ongoing')}`,
                                minutes: s.minutes != null ? `${s.minutes} ${t('minutes')}` : '—',
                              })),
                              [
                                { key: 'session', label: t('daily_report_login_logout') },
                                { key: 'minutes', label: t('minutes') },
                              ],
                              `${t('daily_report')} - ${myDailyReport.user_name} - ${myDailyReport.date}`,
                              `daily-report-${myDailyReportDate}.pdf`
                            )
                          } else if (sales.length > 0) {
                            downloadPdf(
                              sales.map((s: any) => ({
                                invoice: `#${s.invoice_no} – ${s.time}`,
                                total: Number(s.grand_total).toFixed(2),
                              })),
                              [
                                { key: 'invoice', label: t('invoice_no') },
                                { key: 'total', label: t('grand_total') },
                              ],
                              `${t('daily_report')} - ${myDailyReport.user_name} - ${myDailyReport.date}`,
                              `daily-report-${myDailyReportDate}.pdf`
                            )
                          }
                        }}
                      >
                        {t('export_pdf')}
                      </Button>
                    </>
                  )}
                </Space>
                {myDailyReportLoading ? (
                  <div style={{ padding: 48, textAlign: 'center', color: '#999' }}>{t('loading')}</div>
                ) : myDailyReport?.error ? (
                  <div style={{ padding: 48, textAlign: 'center', color: '#ff4d4f' }}>{t('download_failed')}</div>
                ) : myDailyReport ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <Card size="small" style={{ background: '#fafafa' }}>
                      <Typography.Text strong>{myDailyReport.user_name}</Typography.Text>
                      <Typography.Text type="secondary" style={{ marginLeft: 8 }}>{myDailyReport.date}</Typography.Text>
                      <div style={{ marginTop: 8 }}>
                        <Typography.Text type="secondary">{t('total_hours')}: </Typography.Text>
                        <Typography.Text strong>{myDailyReport.total_hours}</Typography.Text>
                      </div>
                    </Card>
                    <div>
                      <Typography.Title level={5}>{t('daily_report_attendance')} ({t('daily_report_login_logout')})</Typography.Title>
                      {(myDailyReport.sessions || []).length > 0 ? (
                        <Table
                          size="small"
                          dataSource={myDailyReport.sessions}
                          rowKey="id"
                          pagination={false}
                          columns={[
                            {
                              title: t('daily_report_login_logout'),
                              render: (_, s) => `${s.login_at} – ${s.logout_at || t('daily_report_ongoing')}`,
                            },
                            {
                              title: t('minutes'),
                              dataIndex: 'minutes',
                              render: (v: number) => (v != null ? `${v} ${t('minutes')}` : '—'),
                            },
                          ]}
                        />
                      ) : (
                        <Typography.Text type="secondary">{t('daily_report_no_sessions')}</Typography.Text>
                      )}
                    </div>
                    <div>
                      <Typography.Title level={5}>{t('daily_report_sales')}</Typography.Title>
                      {(myDailyReport.sales || []).length > 0 ? (
                        <>
                          <Table
                            size="small"
                            dataSource={myDailyReport.sales}
                            rowKey="id"
                            pagination={false}
                            columns={[
                              {
                                title: t('invoice_no'),
                                render: (_, s) => `#${s.invoice_no} – ${s.time}`,
                              },
                              {
                                title: t('grand_total'),
                                dataIndex: 'grand_total',
                                render: (v: number) => Number(v).toFixed(2),
                              },
                            ]}
                          />
                          <div style={{ marginTop: 12 }}>
                            <Typography.Text>{t('daily_report_invoices_count')}: {myDailyReport.sales_count}</Typography.Text>
                            <Typography.Text strong style={{ marginLeft: 16 }}>
                              {t('total')}: {myDailyReport.sales_total?.toFixed(2)}
                            </Typography.Text>
                          </div>
                        </>
                      ) : (
                        <Typography.Text type="secondary">{t('daily_report_no_sales')}</Typography.Text>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 48, textAlign: 'center', color: '#999' }}>
                    {t('daily_report_show')} {t('daily_report')}
                  </div>
                )}
              </Card>
            ),
          },
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
                    value={purchaseFilters.supplier_id || 'all'}
                    onChange={(v) => setPurchaseFilters((f) => ({ ...f, supplier_id: v === 'all' ? '' : v || '' }))}
                    options={[{ value: 'all', label: t('all') }, ...suppliers.map((s) => ({ value: String(s.id), label: s.name_ar || s.name_en }))]}
                  />
                  <Select
                    placeholder={t('product')}
                    allowClear
                    style={{ width: 180 }}
                    value={purchaseFilters.product_id || 'all'}
                    onChange={(v) => setPurchaseFilters((f) => ({ ...f, product_id: v === 'all' ? '' : v || '' }))}
                    options={[{ value: 'all', label: t('all') }, ...products.map((p) => ({ value: String(p.id), label: p.name_ar || p.name_en }))]}
                  />
                  <Select
                    placeholder={t('branch')}
                    allowClear
                    style={{ width: 180 }}
                    value={purchaseFilters.branch_id || 'all'}
                    onChange={(v) => setPurchaseFilters((f) => ({ ...f, branch_id: v === 'all' ? '' : v || '' }))}
                    options={[{ value: 'all', label: t('all') }, ...branches.map((b) => ({ value: String(b.id), label: b.name_ar || b.name_en }))]}
                  />
                  <Button onClick={loadPurchases}>{t('apply')}</Button>
                  <Button onClick={() => downloadCsv(purchaseFlattened, 'purchases.csv')}>
                    {t('export_csv')}
                  </Button>
                  <Button
                    onClick={() =>
                      downloadPdf(
                        purchaseFlattened,
                        [
                          { key: 'invoice_no', label: t('invoice_no') },
                          { key: 'purchase_date', label: t('purchase_date') },
                          { key: 'supplier_name', label: t('supplier') },
                          { key: 'branch_name', label: t('branch') },
                          { key: 'product_name', label: t('product') },
                          { key: 'qty', label: t('qty') },
                          { key: 'unit_price', label: t('purchase_price') },
                          { key: 'line_total', label: t('line_total') },
                        ],
                        t('purchase_reports'),
                        'purchases.pdf'
                      )
                    }
                  >
                    {t('export_pdf')}
                  </Button>
                </Space>
                <Table
                  rowKey="id"
                  dataSource={purchases}
                  columns={[
                    { title: t('purchase_date'), dataIndex: 'purchase_date' },
                    { title: t('invoice_no'), dataIndex: 'invoice_no' },
                    { title: t('supplier'), dataIndex: 'supplier_name_ar', render: (_, r) => r.supplier_name_ar || r.supplier_name },
                    { title: t('branch'), dataIndex: 'branch_name', render: (v: string) => v || '—' },
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
                    value={salesFilters.cashier_id || 'all'}
                    onChange={(v) => setSalesFilters((f) => ({ ...f, cashier_id: v === 'all' ? '' : v || '' }))}
                    options={[{ value: 'all', label: t('all') }, ...users.map((u) => ({ value: String(u.id), label: u.name }))]}
                  />
                  <Select
                    placeholder={t('payment_method')}
                    allowClear
                    style={{ width: 180 }}
                    value={salesFilters.payment_method || 'all'}
                    onChange={(v) => setSalesFilters((f) => ({ ...f, payment_method: v === 'all' ? '' : v || '' }))}
                    options={[
                      { value: 'all', label: t('all') },
                      { value: 'CASH', label: t('cash') },
                      { value: 'TRANSFER', label: t('transfer') },
                    ]}
                  />
                  <Button onClick={loadSales}>{t('apply')}</Button>
                  <Button onClick={() => downloadCsv(salesFlattened, 'sales.csv')}>
                    {t('export_csv')}
                  </Button>
                  <Button
                    onClick={() =>
                      downloadPdf(
                        salesFlattened,
                        [
                          { key: 'invoice_no', label: t('invoice_no') },
                          { key: 'sale_date', label: t('sale_date') },
                          { key: 'cashier_name', label: t('cashier') },
                          { key: 'payment_method', label: t('payment_method') },
                          { key: 'product_name', label: t('product') },
                          { key: 'qty', label: t('qty') },
                          { key: 'unit_price', label: t('price') },
                          { key: 'line_total', label: t('line_total') },
                        ],
                        t('sales_reports'),
                        'sales.pdf'
                      )
                    }
                  >
                    {t('export_pdf')}
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
                  <Button
                    onClick={() =>
                      downloadPdf(
                        lowStock.map((r) => ({
                          name_ar: r.name_ar || r.name_en,
                          current_quantity: r.current_quantity,
                          min_quantity: r.min_quantity,
                        })),
                        [
                          { key: 'name_ar', label: t('product') },
                          { key: 'current_quantity', label: t('current_quantity') },
                          { key: 'min_quantity', label: t('min_quantity') },
                        ],
                        t('low_stock'),
                        'low_stock.pdf'
                      )
                    }
                  >
                    {t('export_pdf')}
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
            key: 'attendance',
            label: t('user_attendance'),
            children: (
              <Card>
                <Space style={{ marginBottom: 16 }} wrap>
                  <DatePicker.RangePicker
                    value={[
                      attendanceDateFrom ? dayjs(attendanceDateFrom) : null,
                      attendanceDateTo ? dayjs(attendanceDateTo) : null,
                    ]}
                    onChange={(dates) => {
                      if (dates?.[0]) setAttendanceDateFrom(dates[0].format('YYYY-MM-DD'))
                      if (dates?.[1]) setAttendanceDateTo(dates[1].format('YYYY-MM-DD'))
                    }}
                  />
                  <Select
                    placeholder={t('user')}
                    allowClear
                    style={{ width: 180 }}
                    value={attendanceUser || 'all'}
                    onChange={(v) => setAttendanceUser(v === 'all' ? '' : v || '')}
                    options={[{ value: 'all', label: t('all') }, ...users.map((u) => ({ value: String(u.id), label: u.name }))]}
                  />
                  <Select
                    placeholder={t('source')}
                    style={{ width: 140 }}
                    value={attendanceSource || 'all'}
                    onChange={(v) => setAttendanceSource(v || 'all')}
                    options={[
                      { value: 'all', label: t('all') },
                      { value: 'admin', label: t('admin') },
                      { value: 'app', label: t('app') },
                    ]}
                  />
                  <Button type="primary" onClick={loadAttendance}>{t('apply')}</Button>
                  <Button onClick={() => downloadCsv(attendance, 'user_attendance.csv')}>
                    {t('export_csv')}
                  </Button>
                  <Button
                    onClick={() =>
                      downloadPdf(
                        attendance.map((r) => ({
                          user_name: r.user_name,
                          branch_name: r.branch_name || '—',
                          date: r.date,
                          total_hours: r.total_hours != null ? Number(r.total_hours).toFixed(2) : '—',
                        })),
                        [
                          { key: 'user_name', label: t('user') },
                          { key: 'branch_name', label: t('branch') },
                          { key: 'date', label: t('date') },
                          { key: 'total_hours', label: t('total_hours') },
                        ],
                        t('user_attendance'),
                        'user_attendance.pdf'
                      )
                    }
                  >
                    {t('export_pdf')}
                  </Button>
                </Space>
                <Table
                  rowKey={(r) => `${r.user_id}-${r.date}`}
                  dataSource={attendance}
                  columns={[
                    { title: t('user'), dataIndex: 'user_name' },
                    { title: t('branch'), dataIndex: 'branch_name', render: (v: string) => v || '—' },
                    { title: t('date'), dataIndex: 'date' },
                    {
                      title: t('sessions'),
                      render: (_, r) =>
                        (r.sessions || []).length > 0 ? (
                          (r.sessions || []).map((s, i) => (
                            <div key={i} style={{ marginBottom: 4 }}>
                              {s.login_at} – {s.logout_at} ({s.minutes} {t('minutes')})
                              {s.source && <span style={{ marginLeft: 8, fontSize: 10, color: '#666' }}>({s.source})</span>}
                            </div>
                          ))
                        ) : (
                          <span style={{ color: '#999' }}>—</span>
                        ),
                    },
                    {
                      title: t('total_hours'),
                      dataIndex: 'total_hours',
                      render: (v: number) => (v != null ? Number(v).toFixed(2) : '—'),
                    },
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
                <Space wrap style={{ marginBottom: 16 }}>
                  <Button onClick={() => downloadCsv(nearExpiry, 'near_expiry.csv')}>
                    {t('export_csv')}
                  </Button>
                  <Button
                    onClick={() =>
                      downloadPdf(
                        nearExpiry.map((r) => ({
                          product_name_ar: r.product_name_ar || r.product_name,
                          batch_no: r.batch_no,
                          expiry_date: r.expiry_date,
                          qty_on_hand: r.qty_on_hand,
                        })),
                        [
                          { key: 'product_name_ar', label: t('product') },
                          { key: 'batch_no', label: t('batch_no') },
                          { key: 'expiry_date', label: t('expiry_date') },
                          { key: 'qty_on_hand', label: t('qty_on_hand') },
                        ],
                        t('near_expiry'),
                        'near_expiry.pdf'
                      )
                    }
                  >
                    {t('export_pdf')}
                  </Button>
                </Space>
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
