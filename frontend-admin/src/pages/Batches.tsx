import { Button, DatePicker, Form, Input, Modal, Select, Space, Table, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import dayjs from 'dayjs'

type Batch = {
  id: number
  product: number
  branch: number
  batch_no: string
  expiry_date: string
  qty_on_hand: number
  unit_cost: number
}

const Batches = () => {
  const { t } = useTranslation()
  const [items, setItems] = useState<Batch[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Batch | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    const res = await api.get('/batches/')
    setItems(res.data)
  }

  useEffect(() => {
    load()
    api.get('/products/').then((res) => setProducts(res.data))
    api.get('/branches/').then((res) => setBranches(res.data))
  }, [])

  const handleSubmit = async (values: any) => {
    const payload = {
      ...values,
      expiry_date: values.expiry_date.format('YYYY-MM-DD'),
    }
    if (editing) {
      await api.put(`/batches/${editing.id}/`, payload)
    } else {
      await api.post('/batches/', payload)
    }
    setOpen(false)
    setEditing(null)
    form.resetFields()
    load()
  }

  const handleEdit = (record: Batch) => {
    setEditing(record)
    setOpen(true)
    form.setFieldsValue({
      ...record,
      expiry_date: record.expiry_date ? dayjs(record.expiry_date) : null,
    })
  }

  const handleDelete = async (record: Batch) => {
    await api.delete(`/batches/${record.id}/`)
    load()
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={3}>{t('batches')}</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          {t('add')}
        </Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          { title: t('batch_no'), dataIndex: 'batch_no' },
          { title: t('product'), dataIndex: 'product_name' },
          { title: t('branch'), dataIndex: 'branch_name' },
          { title: t('expiry_date'), dataIndex: 'expiry_date' },
          { title: t('qty_on_hand'), dataIndex: 'qty_on_hand' },
          { title: t('unit_cost'), dataIndex: 'unit_cost' },
          {
            title: t('actions'),
            render: (_, record) => (
              <Space>
                <Button onClick={() => handleEdit(record)}>{t('edit')}</Button>
                <Button danger onClick={() => handleDelete(record)}>
                  {t('delete')}
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        onCancel={() => {
          setOpen(false)
          setEditing(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        title={editing ? t('edit') : t('add')}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="product" label={t('products')} rules={[{ required: true }]}>
            <Select options={products.map((p) => ({ value: p.id, label: p.name_en }))} />
          </Form.Item>
          <Form.Item name="branch" label={t('branch')} rules={[{ required: true }]}>
            <Select options={branches.map((b) => ({ value: b.id, label: b.name_en }))} />
          </Form.Item>
          <Form.Item name="batch_no" label={t('batch_no')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="expiry_date" label={t('expiry_date')} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="qty_on_hand" label={t('qty_on_hand')} rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="unit_cost" label={t('unit_cost')} rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Batches
