import { Button, Form, Input, Modal, Space, Table, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'

type Product = {
  id: number
  name_ar: string
  name_en: string
  barcode: string
  sku: string
  price: number
  purchase_price: number
}

const Products = () => {
  const { t } = useTranslation()
  const [items, setItems] = useState<Product[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form] = Form.useForm<Product>()

  const load = async () => {
    const res = await api.get('/products/')
    setItems(res.data)
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (values: Product) => {
    try {
      if (editing) {
        await api.patch(`/products/${editing.id}/`, values)
      } else {
        await api.post('/products/', values)
      }
      setOpen(false)
      setEditing(null)
      form.resetFields()
      load()
    } catch (error: any) {
      const detail = error?.response?.data
      alert(typeof detail === 'string' ? detail : JSON.stringify(detail))
    }
  }

  const handleEdit = (record: Product) => {
    setEditing(record)
    setOpen(true)
    form.setFieldsValue(record)
  }

  const handleDelete = async (record: Product) => {
    await api.delete(`/products/${record.id}/`)
    load()
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={3}>{t('products')}</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          {t('add')}
        </Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          { title: t('name_en'), dataIndex: 'name_en' },
          { title: t('name_ar'), dataIndex: 'name_ar' },
          { title: t('barcode'), dataIndex: 'barcode' },
          { title: t('sku'), dataIndex: 'sku' },
          { title: t('price'), dataIndex: 'price' },
          { title: t('purchase_price'), dataIndex: 'purchase_price' },
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
          <Form.Item name="name_en" label={t('name_en')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name_ar" label={t('name_ar')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="barcode" label={t('barcode')}>
            <Input />
          </Form.Item>
          <Form.Item name="sku" label={t('sku')}>
            <Input />
          </Form.Item>
          <Form.Item name="price" label={t('price')} rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item
            name="purchase_price"
            label={t('purchase_price')}
            rules={[{ required: true }]}
          >
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Products
