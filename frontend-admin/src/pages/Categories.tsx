import { Button, Form, Input, Modal, Space, Table, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'

type Category = {
  id: number
  code: string
  name_en: string
  name_ar: string
}

const Categories = () => {
  const { t } = useTranslation()
  const [items, setItems] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form] = Form.useForm<Category>()

  const load = async () => {
    const res = await api.get('/categories/')
    setItems(res.data)
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (values: Category) => {
    if (editing) {
      await api.put(`/categories/${editing.id}/`, values)
    } else {
      await api.post('/categories/', values)
    }
    setOpen(false)
    setEditing(null)
    form.resetFields()
    load()
  }

  const handleEdit = (record: Category) => {
    setEditing(record)
    setOpen(true)
    form.setFieldsValue(record)
  }

  const handleDelete = async (record: Category) => {
    await api.delete(`/categories/${record.id}/`)
    load()
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={3}>{t('categories')}</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          {t('add')}
        </Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          { title: t('code'), dataIndex: 'code' },
          { title: t('name_en'), dataIndex: 'name_en' },
          { title: t('name_ar'), dataIndex: 'name_ar' },
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
          <Form.Item name="code" label={t('code')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name_en" label={t('name_en')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name_ar" label={t('name_ar')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Categories
