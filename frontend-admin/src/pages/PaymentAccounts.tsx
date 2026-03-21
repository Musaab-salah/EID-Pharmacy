import { Button, Form, Input, Modal, Select, Space, Table, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import PageObjective from '../components/PageObjective'

type PaymentAccount = {
  id: number
  name_ar: string
  name_en: string
  account_number: string
  account_type: string
  is_active: boolean
}

const PaymentAccounts = () => {
  const { t } = useTranslation()
  const [items, setItems] = useState<PaymentAccount[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentAccount | null>(null)
  const [form] = Form.useForm<PaymentAccount>()

  const load = async () => {
    const res = await api.get('/payment-accounts/')
    setItems(res.data)
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (values: PaymentAccount) => {
    if (editing) {
      await api.put(`/payment-accounts/${editing.id}/`, values)
    } else {
      await api.post('/payment-accounts/', values)
    }
    setOpen(false)
    setEditing(null)
    form.resetFields()
    load()
  }

  const handleEdit = (record: PaymentAccount) => {
    setEditing(record)
    setOpen(true)
    form.setFieldsValue(record)
  }

  const handleDelete = async (record: PaymentAccount) => {
    await api.delete(`/payment-accounts/${record.id}/`)
    load()
  }

  return (
    <div>
      <PageObjective objectiveKey="page_objective_payment_accounts" />
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={3}>{t('payment_accounts')}</Typography.Title>
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
          { title: t('account_number'), dataIndex: 'account_number' },
          { title: t('account_type'), dataIndex: 'account_type' },
          {
            title: t('status'),
            dataIndex: 'is_active',
            render: (v: boolean) => (v ? t('active') : t('inactive')),
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
          <Form.Item name="name_en" label={t('name_en')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name_ar" label={t('name_ar')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="account_number"
            label={t('account_number')}
            rules={[{ required: true }]}
          >
            <Input placeholder="IBAN or wallet number" />
          </Form.Item>
          <Form.Item
            name="account_type"
            label={t('account_type')}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'bank', label: t('bank') },
                { value: 'wallet', label: t('bank_wallet') },
              ]}
            />
          </Form.Item>
          <Form.Item name="is_active" label={t('status')} initialValue={true}>
            <Select
              options={[
                { value: true, label: t('active') },
                { value: false, label: t('inactive') },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default PaymentAccounts
