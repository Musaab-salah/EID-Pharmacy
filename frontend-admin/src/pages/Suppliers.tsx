import { Button, Form, Input, Modal, Space, Table, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'

type Supplier = {
  id: number
  name_ar: string
  name_en: string
  phone: string
  address: string
}

const Suppliers = () => {
  const { t } = useTranslation()
  const [items, setItems] = useState<Supplier[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form] = Form.useForm<Supplier>()

  const load = async () => {
    const res = await api.get('/suppliers/')
    setItems(res.data)
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (values: Supplier) => {
    try {
      if (editing) {
        await api.patch(`/suppliers/${editing.id}/`, values)
      } else {
        await api.post('/suppliers/', values)
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

  const handleEdit = (record: Supplier) => {
    setEditing(record)
    setOpen(true)
    form.setFieldsValue(record)
  }

  const handleDelete = async (record: Supplier) => {
    await api.delete(`/suppliers/${record.id}/`)
    load()
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={3}>{t('suppliers')}</Typography.Title>
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
          { title: t('phone'), dataIndex: 'phone' },
          { title: t('address'), dataIndex: 'address' },
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
          <Form.Item name="phone" label={t('phone')}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label={t('address')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Suppliers
