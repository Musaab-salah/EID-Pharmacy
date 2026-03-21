import { Button, Modal, Select, Table, Form, InputNumber } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api'

type Conflict = {
  id: number
  product_identifier: string
  product_id?: number
  conflicting_batch_ids: number[]
  conflicting_values: Record<string, number[]>
  resolved_values?: Record<string, number>
}

const ConflictsTable = ({
  conflicts,
  onResolved,
}: {
  conflicts: Conflict[]
  onResolved: () => void
}) => {
  const { t } = useTranslation()
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Conflict | null>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const handleResolve = (record: Conflict) => {
    setSelected(record)
    const vals = record.conflicting_values || {}
    form.setFieldsValue({
      pills_per_strip: vals.pills_per_strip?.[0] ?? 1,
      strips_per_box: vals.strips_per_box?.[0] ?? 1,
      price_per_strip: vals.price_per_strip?.[0],
      price_per_box: vals.price_per_box?.[0],
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!selected) return
    const values = await form.validateFields()
    setSaving(true)
    try {
      await api.post('/products/resolve-conflict/', {
        conflict_id: selected.id,
        resolved_values: values,
      })
      setModalOpen(false)
      setSelected(null)
      form.resetFields()
      onResolved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Table
        rowKey="id"
        dataSource={conflicts}
        columns={[
          { title: t('product_identifier'), dataIndex: 'product_identifier' },
          {
            title: t('conflicting_values'),
            dataIndex: 'conflicting_values',
            render: (v: Record<string, number[]>) =>
              v ? Object.entries(v).map(([k, vals]) => `${k}: [${vals?.join(', ')}]`).join(' | ') : '-',
          },
          {
            title: t('actions'),
            render: (_, record: Conflict) => (
              <Button type="primary" onClick={() => handleResolve(record)}>
                {t('resolve')}
              </Button>
            ),
          },
        ]}
      />

      <Modal
        open={modalOpen}
        title={t('resolve_conflict')}
        onCancel={() => {
          setModalOpen(false)
          setSelected(null)
        }}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={t('apply_resolutions')}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="pills_per_strip" label={t('pills_per_strip')}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="strips_per_box" label={t('strips_per_box')}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="price_per_strip" label={t('price_per_strip')}>
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="price_per_box" label={t('price_per_box')}>
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default ConflictsTable
