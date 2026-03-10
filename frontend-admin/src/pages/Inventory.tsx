import { Button, Form, Input, Select, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'

const Inventory = () => {
  const { t } = useTranslation()
  const [batches, setBatches] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    api.get('/batches/').then((res) => setBatches(res.data))
    api.get('/branches/').then((res) => setBranches(res.data))
  }, [])

  const handleSubmit = async (values: any) => {
    await api.post('/inventory/adjust/', values)
    form.resetFields()
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={3}>{t('inventory')}</Typography.Title>
      </Space>
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 420 }}>
        <Form.Item name="batch_id" label={t('batches')} rules={[{ required: true }]}>
          <Select
            options={batches.map((b) => ({
              value: b.id,
              label: `${b.batch_no} - ${b.product_name}`,
            }))}
          />
        </Form.Item>
        <Form.Item name="action" label={t('inventory_action')} rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'add', label: t('add_stock') },
              { value: 'subtract', label: t('subtract_stock') },
              { value: 'transfer', label: t('transfer_stock') },
            ]}
          />
        </Form.Item>
        <Form.Item name="qty" label={t('qty_on_hand')} rules={[{ required: true }]}>
          <Input type="number" />
        </Form.Item>
        <Form.Item name="target_branch_id" label={t('target_branch')}>
          <Select
            allowClear
            options={branches.map((b) => ({ value: b.id, label: b.name_en }))}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          {t('submit')}
        </Button>
      </Form>
    </div>
  )
}

export default Inventory
