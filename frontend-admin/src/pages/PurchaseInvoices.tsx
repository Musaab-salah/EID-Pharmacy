import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd'
import { CheckCircleOutlined, DollarOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import PageObjective from '../components/PageObjective'
import { API_BASE } from '../config'

type PurchaseLine = {
  id?: number
  product: number
  qty: number
  unit_price: number
  line_total: number
  product_name?: string
}

type DueDateItem = {
  id: number
  due_date: string
  amount?: number
  paid: boolean
  paid_at?: string
  payment_method?: string
  payment_account?: number
  payment_account_name?: string
  transaction_number?: string
  payment_proof?: string
}

type PurchaseInvoice = {
  id: number
  invoice_no: string
  purchase_date: string
  supplier: number
  supplier_name?: string
  supplier_name_ar?: string
  branch: number
  total: number
  payment_type: string
  credit_status?: string
  due_dates?: DueDateItem[]
  lines: PurchaseLine[]
}

const PurchaseInvoices = () => {
  const { t, i18n } = useTranslation()
  const [items, setItems] = useState<PurchaseInvoice[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payingDueDate, setPayingDueDate] = useState<{ invoiceId: number; dueDate: DueDateItem } | null>(null)
  const [form] = Form.useForm()
  const [payForm] = Form.useForm()

  const load = async () => {
    const res = await api.get('/purchases/')
    setItems(res.data)
  }

  useEffect(() => {
    load()
    api.get('/suppliers/').then((res) => setSuppliers(res.data))
    api.get('/branches/').then((res) => setBranches(res.data))
    api.get('/products/').then((res) => setProducts(res.data))
    api.get('/payment-accounts/active/').then((res) => setPaymentAccounts(Array.isArray(res.data) ? res.data : []))
  }, [])

  const handleSubmit = async (values: any) => {
    const lines = (values.lines || []).filter(
      (l: any) => l?.product && l?.qty > 0 && l?.unit_price != null
    ).map((l: any) => ({
      product: l.product,
      qty: l.qty,
      unit_price: l.unit_price,
      line_total: l.qty * l.unit_price,
    }))
    if (!lines.length) {
      message.error(t('add_at_least_one_line'))
      return
    }
    const paymentType = values.payment_type || 'CASH'
    if (paymentType === 'CREDIT' && (!values.due_dates || values.due_dates.length === 0)) {
      message.error(t('credit_requires_due_dates'))
      return
    }
    try {
      const payload: any = {
        invoice_no: values.invoice_no,
        purchase_date: values.purchase_date.format('YYYY-MM-DD'),
        supplier: values.supplier,
        branch: values.branch,
        payment_type: paymentType,
        lines,
      }
      if (paymentType === 'CREDIT' && values.due_dates?.length) {
        payload.due_dates = values.due_dates.map((d: any) => ({
          due_date: d.due_date?.format?.('YYYY-MM-DD') || d.due_date,
          amount: d.amount ?? null,
        }))
      }
      await api.post('/purchases/', payload)
      setOpen(false)
      form.resetFields()
      load()
      message.success(t('saved'))
    } catch (error: any) {
      const detail = error?.response?.data
      message.error(typeof detail === 'string' ? detail : JSON.stringify(detail))
    }
  }

  const handlePayClick = (invoice: PurchaseInvoice, dueDate: DueDateItem) => {
    setPayingDueDate({ invoiceId: invoice.id, dueDate })
    payForm.setFieldsValue({
      payment_method: 'CASH',
      payment_account: undefined,
      transaction_number: '',
    })
    setPayModalOpen(true)
  }

  const handlePaySubmit = async () => {
    if (!payingDueDate) return
    const values = await payForm.validateFields()
    if (values.payment_method === 'TRANSFER' && (!values.payment_account || !values.transaction_number?.trim())) {
      message.error(t('transfer_requires_account_and_transaction'))
      return
    }
    try {
      const formData = new FormData()
      formData.append('due_date_id', String(payingDueDate.dueDate.id))
      formData.append('payment_method', values.payment_method)
      if (values.payment_method === 'TRANSFER') {
        formData.append('payment_account', values.payment_account)
        formData.append('transaction_number', values.transaction_number)
      }
      const proof = (document.getElementById('payment_proof_input') as HTMLInputElement)?.files?.[0]
      if (proof) formData.append('payment_proof', proof)

      await api.post(`/purchases/${payingDueDate.invoiceId}/pay-due-date/`, formData)
      message.success(t('payment_completed'))
      setPayModalOpen(false)
      setPayingDueDate(null)
      payForm.resetFields()
      load()
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message
      message.error(typeof detail === 'string' ? detail : JSON.stringify(detail))
    }
  }

  return (
    <div>
      <PageObjective objectiveKey="page_objective_purchases" />
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={3}>{t('purchase_invoices')}</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          {t('add')}
        </Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          { title: t('invoice_no'), dataIndex: 'invoice_no' },
          { title: t('purchase_date'), dataIndex: 'purchase_date' },
          {
            title: t('supplier'),
            render: (_, r) => r.supplier_name_ar || r.supplier_name || '-',
          },
          {
            title: t('payment_type'),
            dataIndex: 'payment_type',
            render: (v: string) => (v === 'CREDIT' ? t('credit') : t('cash')),
          },
          {
            title: t('credit_status'),
            dataIndex: 'credit_status',
            render: (v: string, r) =>
              r.payment_type === 'CREDIT'
                ? (v === 'paid' ? t('paid') : v === 'partially_paid' ? t('partially_paid') : t('pending'))
                : '-',
          },
          { title: t('total'), dataIndex: 'total', render: (v: unknown) => (v != null ? Number(v).toFixed(2) : '') },
        ]}
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ padding: '0 24px 16px' }}>
              {record.lines?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                    {t('products')}
                  </Typography.Text>
                  <Table
                    size="small"
                    rowKey={(r) => r.id ?? `line-${record.id}-${r.product}`}
                    dataSource={record.lines || []}
                    pagination={false}
                    columns={[
                      { title: t('product'), dataIndex: 'product_name' },
                      { title: t('qty'), dataIndex: 'qty' },
                      {
                        title: t('purchase_price'),
                        dataIndex: 'unit_price',
                        render: (v: unknown) => (v != null ? Number(v).toFixed(2) : ''),
                      },
                      {
                        title: t('line_total'),
                        dataIndex: 'line_total',
                        render: (v: unknown) => (v != null ? Number(v).toFixed(2) : ''),
                      },
                    ]}
                  />
                </div>
              )}
              {record.payment_type === 'CREDIT' && (record.due_dates?.length ?? 0) > 0 && (
                <div>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                    {t('due_dates')}
                  </Typography.Text>
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={record.due_dates || []}
                    pagination={false}
                    columns={[
                      { title: t('due_date'), dataIndex: 'due_date' },
                      {
                        title: t('amount'),
                        dataIndex: 'amount',
                        render: (v: unknown, r: DueDateItem) =>
                          v != null ? Number(v).toFixed(2) : r.amount != null ? Number(r.amount).toFixed(2) : '-',
                      },
                      {
                        title: t('status'),
                        dataIndex: 'paid',
                        render: (paid: boolean, dd: DueDateItem) =>
                          paid ? (
                            <Space>
                              <CheckCircleOutlined style={{ color: '#52c41a' }} />
                              <Typography.Text type="success">{t('payment_completed')}</Typography.Text>
                              {dd.payment_method && (
                                <Typography.Text type="secondary">
                                  ({dd.payment_method === 'CASH' ? t('cash') : t('transfer')})
                                  {dd.payment_account_name && ` - ${dd.payment_account_name}`}
                                </Typography.Text>
                              )}
                              {dd.payment_proof && (
                                <a
                                  href={`${API_BASE}${dd.payment_proof.startsWith('/') ? '' : '/media/'}${dd.payment_proof}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {t('view_receipt')}
                                </a>
                              )}
                            </Space>
                          ) : (
                            <Button
                              type="primary"
                              size="small"
                              icon={<DollarOutlined />}
                              onClick={() => handlePayClick(record, dd)}
                            >
                              {t('pay')}
                            </Button>
                          ),
                      },
                    ]}
                  />
                </div>
              )}
            </div>
          ),
        }}
      />

      <Modal
        open={open}
        onCancel={() => {
          setOpen(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        title={t('add') + ' ' + t('purchase_invoice')}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="invoice_no" label={t('invoice_no')} rules={[{ required: true }]}>
            <Input placeholder="INV-001" />
          </Form.Item>
          <Form.Item name="purchase_date" label={t('purchase_date')} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="supplier" label={t('supplier')} rules={[{ required: true }]}>
            <Select
              options={suppliers.map((s) => ({
                value: s.id,
                label: `${s.name_en} - ${s.name_ar}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="branch" label={t('branch')} rules={[{ required: true }]}>
            <Select
              options={branches.map((b) => ({
                value: b.id,
                label: i18n.language === 'ar' ? b.name_ar : b.name_en,
              }))}
            />
          </Form.Item>
          <Form.Item name="payment_type" label={t('payment_type')} rules={[{ required: true }]} initialValue="CASH">
            <Select
              options={[
                { value: 'CASH', label: t('cash') },
                { value: 'CREDIT', label: t('credit') },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.payment_type !== curr.payment_type}>
            {({ getFieldValue }) =>
              getFieldValue('payment_type') === 'CREDIT' ? (
                <Form.List name="due_dates">
                  {(fields, { add, remove }) => (
                    <>
                      <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('due_dates')}</div>
                      {fields.map(({ key, name, ...rest }) => (
                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <Form.Item {...rest} name={[name, 'due_date']} rules={[{ required: true }]}>
                            <DatePicker placeholder={t('due_date')} />
                          </Form.Item>
                          <Form.Item {...rest} name={[name, 'amount']}>
                            <InputNumber min={0} placeholder={t('amount')} style={{ width: 120 }} />
                          </Form.Item>
                          <Button type="link" danger onClick={() => remove(name)}>
                            {t('delete')}
                          </Button>
                        </Space>
                      ))}
                      <Form.Item>
                        <Button type="dashed" onClick={() => add()} block>
                          + {t('add_due_date')}
                        </Button>
                      </Form.Item>
                    </>
                  )}
                </Form.List>
              ) : null
            }
          </Form.Item>
          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item {...rest} name={[name, 'product']} rules={[{ required: true }]}>
                      <Select
                        style={{ width: 200 }}
                        options={products.map((p) => ({
                          value: p.id,
                          label: p.name_en,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'qty']} rules={[{ required: true }]}>
                      <InputNumber min={1} placeholder={t('qty')} />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'unit_price']} rules={[{ required: true }]}>
                      <InputNumber min={0} step={0.01} placeholder={t('purchase_price')} />
                    </Form.Item>
                    <Button type="link" danger onClick={() => remove(name)}>
                      {t('delete')}
                    </Button>
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block>
                    + {t('add_line')}
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        open={payModalOpen}
        onCancel={() => {
          setPayModalOpen(false)
          setPayingDueDate(null)
          payForm.resetFields()
        }}
        onOk={handlePaySubmit}
        title={t('record_payment')}
        okText={t('payment_completed')}
      >
        {payingDueDate && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
            <Typography.Text>
              {t('due_date')}: {payingDueDate.dueDate.due_date} — {t('amount')}:{' '}
              {payingDueDate.dueDate.amount != null ? Number(payingDueDate.dueDate.amount).toFixed(2) : '-'}
            </Typography.Text>
          </div>
        )}
        <Form form={payForm} layout="vertical">
          <Form.Item name="payment_method" label={t('payment_method')} rules={[{ required: true }]} initialValue="CASH">
            <Select
              options={[
                { value: 'CASH', label: t('cash') },
                { value: 'TRANSFER', label: t('transfer') },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.payment_method !== curr.payment_method}>
            {({ getFieldValue }) =>
              getFieldValue('payment_method') === 'TRANSFER' && (
                <>
                  <Form.Item
                    name="payment_account"
                    label={t('payment_accounts')}
                    rules={[{ required: true, message: t('payment_account_required') }]}
                  >
                    <Select
                      options={paymentAccounts.map((a) => ({
                        value: a.id,
                        label: i18n.language === 'ar' ? a.name_ar : a.name_en,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name="transaction_number"
                    label={t('transaction_number')}
                    rules={[{ required: true, message: t('transaction_number_required') }]}
                  >
                    <Input placeholder="TXN-123" />
                  </Form.Item>
                </>
              )
            }
          </Form.Item>
          <Form.Item label={t('attach_receipt')}>
            <Input
              id="payment_proof_input"
              type="file"
              accept="image/*"
              style={{ padding: 4 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default PurchaseInvoices
