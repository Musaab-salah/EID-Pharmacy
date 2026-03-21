import { Button, Form, Input, Modal, Space, Table, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import PageObjective from '../components/PageObjective'

type Customer = {
  id: number
  name: string
  phone: string
  email: string
}

const Customers = () => {
  const { t } = useTranslation()
  const [items, setItems] = useState<Customer[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    const res = await api.get('/customers/')
    setItems(res.data)
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (values: Customer) => {
    if (editing) {
      await api.put(`/customers/${editing.id}/`, values)
    } else {
      await api.post('/customers/', values)
    }
    setOpen(false)
    setEditing(null)
    form.resetFields()
    load()
  }

  const handleEdit = (record: Customer) => {
    setEditing(record)
    setOpen(true)
    form.setFieldsValue(record)
  }

  const handleDelete = async (record: Customer) => {
    await api.delete(`/customers/${record.id}/`)
    load()
  }

  return (
    <div>
      <PageObjective objectiveKey="page_objective_customers" />
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={3}>{t('customers')}</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          {t('add')}
        </Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          { title: t('name'), dataIndex: 'name' },
          { title: t('phone'), dataIndex: 'phone' },
          { title: t('email'), dataIndex: 'email' },
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
          <Form.Item name="name" label={t('name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label={t('phone')}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label={t('email')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Customers
