import { Button, Form, Input, Modal, Select, Space, Switch, Table, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import PageObjective from '../components/PageObjective'

type User = {
  id: number
  name: string
  email: string
  username: string
  role: string
  branch: number | null
  is_active: boolean
}

const Users = () => {
  const { t } = useTranslation()
  const [items, setItems] = useState<User[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    const res = await api.get('/users/')
    setItems(res.data)
  }

  useEffect(() => {
    load()
    api.get('/branches/').then((res) => setBranches(res.data))
  }, [])

  const handleSubmit = async (values: any) => {
    if (editing) {
      await api.put(`/users/${editing.id}/`, values)
    } else {
      await api.post('/users/', values)
    }
    setOpen(false)
    setEditing(null)
    form.resetFields()
    load()
  }

  const handleEdit = (record: User) => {
    setEditing(record)
    setOpen(true)
    form.setFieldsValue(record)
  }

  const handleDelete = async (record: User) => {
    await api.delete(`/users/${record.id}/`)
    load()
  }

  return (
    <div>
      <PageObjective objectiveKey="page_objective_users" />
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={3}>{t('users')}</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          {t('add')}
        </Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          { title: t('name'), dataIndex: 'name' },
          { title: t('email'), dataIndex: 'email' },
          { title: t('role'), dataIndex: 'role' },
          {
            title: t('status'),
            dataIndex: 'is_active',
            render: (value) => (value ? t('active') : t('inactive')),
          },
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
          <Form.Item name="email" label={t('email')} rules={[{ required: true }]}>
            <Input type="email" />
          </Form.Item>
          <Form.Item name="username" label={t('username')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label={t('role')} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'admin', label: 'admin' },
                { value: 'pharmacist', label: 'pharmacist' },
                { value: 'cashier', label: 'cashier' },
              ]}
            />
          </Form.Item>
          <Form.Item name="branch" label={t('branch')}>
            <Select
              allowClear
              options={branches.map((b) => ({ value: b.id, label: b.name_en }))}
            />
          </Form.Item>
          {!editing && (
            <Form.Item name="password" label={t('password')} rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="is_active" label={t('status')} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Users
