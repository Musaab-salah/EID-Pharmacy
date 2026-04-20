import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'

type Branch = { id: number; name_ar: string; name_en: string }
type Batch = { id: number; product: number; product_name: string; branch: number; branch_name: string; batch_no: string; expiry_date: string; qty_on_hand: number; unit_cost: number }

type Transfer = {
  id: number
  from_branch: number
  to_branch: number
  from_branch_name?: string
  to_branch_name?: string
  status: string
  notes?: string
  created_at?: string
  approved_at?: string
  sent_at?: string
  received_at?: string
  lines_detail?: Array<{
    id: number
    source_batch: number
    product: number
    product_name_en?: string
    product_name_ar?: string
    qty: number
    batch_no: string
    expiry_date: string
    unit_cost: number
  }>
}

export default function Transfers() {
  const { t, i18n } = useTranslation()
  const [items, setItems] = useState<Transfer[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    const res = await api.get('/transfers/')
    setItems(res.data)
  }

  useEffect(() => {
    void load()
    api.get('/branches/').then((r) => setBranches(r.data))
    api.get('/batches/').then((r) => setBatches(r.data))
  }, [])

  const batchOptions = useMemo(() => {
    return (batches || []).map((b) => ({
      value: b.id,
      label: `${b.product_name} | ${b.branch_name} | ${b.batch_no} | ${b.expiry_date} | ${b.qty_on_hand}`,
    }))
  }, [batches])

  const branchLabel = (id: number) => {
    const b = branches.find((x) => x.id === id)
    if (!b) return String(id)
    return i18n.language === 'ar' ? b.name_ar : b.name_en
  }

  const submit = async (values: any) => {
    try {
      const payload = {
        from_branch: values.from_branch,
        to_branch: values.to_branch,
        notes: values.notes || '',
        lines: (values.lines || []).map((l: any) => ({ source_batch: l.source_batch, qty: l.qty })),
      }
      await api.post('/transfers/', payload)
      setOpen(false)
      form.resetFields()
      await load()
      message.success(t('saved'))
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Error')
    }
  }

  const act = async (id: number, action: 'approve' | 'send' | 'receive' | 'cancel') => {
    try {
      await api.post(`/transfers/${id}/${action}/`)
      await load()
      message.success(t('saved'))
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Error')
    }
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Typography.Title level={3}>{t('inventory')}</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          {t('add')}
        </Button>
      </Space>

      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          { title: '#', dataIndex: 'id', width: 70 },
          {
            title: t('branches'),
            render: (_v, r) => `${branchLabel(r.from_branch)} → ${branchLabel(r.to_branch)}`,
          },
          { title: t('status') as any, dataIndex: 'status' },
          { title: t('notes') as any, dataIndex: 'notes', render: (v) => v || '—' },
          {
            title: t('actions'),
            render: (_v, r) => (
              <Space wrap>
                <Button onClick={() => act(r.id, 'approve')} disabled={r.status !== 'draft'}>
                  Approve
                </Button>
                <Button onClick={() => act(r.id, 'send')} disabled={!(r.status === 'draft' || r.status === 'approved')}>
                  Send
                </Button>
                <Button onClick={() => act(r.id, 'receive')} disabled={r.status !== 'sent'}>
                  Receive
                </Button>
                <Button danger onClick={() => act(r.id, 'cancel')} disabled={r.status === 'received' || r.status === 'cancelled'}>
                  Cancel
                </Button>
              </Space>
            ),
          },
        ]}
        expandable={{
          expandedRowRender: (r) => (
            <Table
              rowKey="id"
              pagination={false}
              dataSource={r.lines_detail || []}
              columns={[
                { title: t('products'), dataIndex: 'product_name_en', render: (_v, l: any) => l.product_name_ar || l.product_name_en || l.product },
                { title: t('batches'), dataIndex: 'batch_no' },
                { title: t('expiry_date') as any, dataIndex: 'expiry_date' },
                { title: t('qty') as any, dataIndex: 'qty' },
              ]}
            />
          ),
        }}
      />

      <Modal open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} title="New transfer" width={720}>
        <Form form={form} layout="vertical" onFinish={submit} initialValues={{ lines: [{ source_batch: undefined, qty: 1 }] }}>
          <Space style={{ width: '100%' }} size="middle" align="start">
            <Form.Item name="from_branch" label="From" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={branches.map((b) => ({ value: b.id, label: branchLabel(b.id) }))} />
            </Form.Item>
            <Form.Item name="to_branch" label="To" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={branches.map((b) => ({ value: b.id, label: branchLabel(b.id) }))} />
            </Form.Item>
          </Space>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fields.map((field) => (
                  <Space key={field.key} align="start" wrap>
                    <Form.Item {...field} name={[field.name, 'source_batch']} label="Source batch" rules={[{ required: true }]} style={{ width: 520 }}>
                      <Select showSearch optionFilterProp="label" options={batchOptions} />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'qty']} label="Qty" rules={[{ required: true }]} style={{ width: 120 }}>
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Button danger onClick={() => remove(field.name)}>
                      {t('delete')}
                    </Button>
                  </Space>
                ))}
                <Button onClick={() => add({ source_batch: undefined, qty: 1 })}>{t('add')}</Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  )
}

