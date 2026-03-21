import { Button, Form, Input, Modal, Space, Table, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import PageObjective from '../components/PageObjective'

type Branch = {
  id: number
  name_ar: string
  name_en: string
  address: string
}

const Branches = () => {
  const { t } = useTranslation()
  const [items, setItems] = useState<Branch[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    const res = await api.get('/branches/')
    setItems(res.data)
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (values: Branch) => {
    if (editing) {
      await api.put(`/branches/${editing.id}/`, values)
    } else {
      await api.post('/branches/', values)
    }
    setOpen(false)
    setEditing(null)
    form.resetFields()
    load()
  }

  const handleEdit = (record: Branch) => {
    setEditing(record)
    setOpen(true)
    form.setFieldsValue(record)
  }

  const handleDelete = async (record: Branch) => {
    await api.delete(`/branches/${record.id}/`)
    load()
  }

  return (
    <div>
      <PageObjective objectiveKey="page_objective_branches" />
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={3}>{t('branches')}</Typography.Title>
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
          <Form.Item name="address" label={t('address')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Branches
