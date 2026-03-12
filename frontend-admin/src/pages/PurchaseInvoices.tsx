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
} from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import dayjs from 'dayjs'

type PurchaseLine = {
  product: number
  qty: number
  unit_price: number
  line_total: number
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
  lines: PurchaseLine[]
}

const PurchaseInvoices = () => {
  const { t } = useTranslation()
  const [items, setItems] = useState<PurchaseInvoice[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    const res = await api.get('/purchases/')
    setItems(res.data)
  }

  useEffect(() => {
    load()
    api.get('/suppliers/').then((res) => setSuppliers(res.data))
    api.get('/branches/').then((res) => setBranches(res.data))
    api.get('/products/').then((res) => setProducts(res.data))
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
      alert(t('add_at_least_one_line'))
      return
    }
    try {
      await api.post('/purchases/', {
        invoice_no: values.invoice_no,
        purchase_date: values.purchase_date.format('YYYY-MM-DD'),
        supplier: values.supplier,
        branch: values.branch,
        lines,
      })
      setOpen(false)
      form.resetFields()
      load()
    } catch (error: any) {
      const detail = error?.response?.data
      alert(typeof detail === 'string' ? detail : JSON.stringify(detail))
    }
  }

  return (
    <div>
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
          { title: t('total'), dataIndex: 'total', render: (v: number) => v?.toFixed(2) },
        ]}
        expandable={{
          expandedRowRender: (record) => (
            <Table
              size="small"
              dataSource={record.lines || []}
              columns={[
                { title: t('product'), dataIndex: 'product_name' },
                { title: t('qty'), dataIndex: 'qty' },
                { title: t('purchase_price'), dataIndex: 'unit_price', render: (v: number) => v?.toFixed(2) },
                { title: t('line_total'), dataIndex: 'line_total', render: (v: number) => v?.toFixed(2) },
              ]}
              pagination={false}
            />
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
                label: b.name_en,
              }))}
            />
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
    </div>
  )
}

export default PurchaseInvoices
