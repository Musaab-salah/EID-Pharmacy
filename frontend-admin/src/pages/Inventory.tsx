import {
  Button,
  Card,
  Checkbox,
  Collapse,
  Dropdown,
  Form,
  InputNumber,
  Select,
  Space,
  Table,
  Typography,
  Upload,
  Modal,
} from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import PageObjective from '../components/PageObjective'
import { exportToPdf, printTable } from '../utils/exportUtils'

type BatchRow = {
  id: number
  product_id: number
  product_name: string
  product_name_ar: string
  batch_no: string
  expiry_date: string
  branch_id: number
  branch_name: string
  system_qty: number
}

const StockAdjustForm = () => {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const [batches, setBatches] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])

  useEffect(() => {
    api.get('/batches/').then((res) => setBatches(res.data))
    api.get('/branches/').then((res) => setBranches(res.data))
  }, [])

  const onFinish = async (values: any) => {
    await api.post('/inventory/adjust/', values)
    form.resetFields()
  }

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 420 }}>
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
        <InputNumber min={1} style={{ width: '100%' }} />
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
  )
}

type ExcelPreviewRow = {
  batch_id: number
  branch_id: number
  product_name: string
  batch_no: string
  branch_name: string
  system_qty: number
  physical_qty: number
  diff: number
}

const Inventory = () => {
  const { t, i18n } = useTranslation()
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [auditType, setAuditType] = useState<string>('weekly')
  const [branchIds, setBranchIds] = useState<number[] | 'all'>('all')
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false)
  const [physicalCounts, setPhysicalCounts] = useState<Record<number, number>>({})
  const [saving, setSaving] = useState(false)
  const [excelPreview, setExcelPreview] = useState<ExcelPreviewRow[] | null>(null)
  const [excelImportBranch, setExcelImportBranch] = useState<number | null>(null)

  const loadBranches = () => {
    api.get('/branches/').then((res) => setBranches(res.data))
  }

  const loadBatches = () => {
    const params = new URLSearchParams()
    params.set('audit_type', auditType)
    if (branchIds !== 'all' && branchIds.length > 0) {
      params.set('branch_ids', branchIds.join(','))
    }
    api.get(`/inventory/audit/batches/?${params}`).then((res) => {
      const data = res.data || []
      setBatches(data)
      const initial: Record<number, number> = {}
      data.forEach((b: BatchRow) => {
        initial[b.id] = b.system_qty
      })
      setPhysicalCounts(initial)
    })
  }

  useEffect(() => {
    loadBranches()
  }, [])

  useEffect(() => {
    loadBatches()
  }, [auditType, branchIds])

  const handlePhysicalChange = (batchId: number, value: number | null) => {
    setPhysicalCounts((prev) => ({ ...prev, [batchId]: value ?? 0 }))
  }

  const handleSave = async () => {
    const uniqueBranches = [...new Set(batches.map((b) => b.branch_id))]
    const branchesToSave =
      branchIds === 'all' ? uniqueBranches : branchIds.length > 0 ? branchIds : uniqueBranches
    if (branchesToSave.length === 0) {
      alert(t('select_branch_first'))
      return
    }
    setSaving(true)
    try {
      for (const targetBranch of branchesToSave) {
        const counts = batches
          .filter((b) => b.branch_id === targetBranch)
          .map((b) => ({
            batch_id: b.id,
            physical_qty: physicalCounts[b.id] ?? b.system_qty,
          }))
        if (counts.length > 0) {
          await api.post('/inventory/audit/save/', {
            audit_type: auditType,
            branch_id: targetBranch,
            counts,
          })
        }
      }
      loadBatches()
    } catch (e: any) {
      alert(e?.response?.data?.detail || e?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    const headers = [t('product'), t('batch_no'), t('expiry_date'), t('branch'), t('system_qty'), t('physical_stock')]
    const rows = batches.map((b) => [
      b.product_name_ar || b.product_name,
      b.batch_no,
      b.expiry_date,
      b.branch_name,
      String(b.system_qty),
      String(physicalCounts[b.id] ?? b.system_qty),
    ])
    const auditLabel = auditType === 'daily' ? t('daily') : auditType === 'weekly' ? t('weekly') : t('monthly')
    printTable(
      t('inventory_audit'),
      headers,
      rows,
      `${t('audit_type')}: ${auditLabel} | ${new Date().toLocaleDateString()}`
    )
  }

  const handleExportPdf = () => {
    const headers = [t('product'), t('batch_no'), t('expiry_date'), t('branch'), t('system_qty'), t('physical_stock')]
    const rows = batches.map((b) => [
      b.product_name_ar || b.product_name,
      b.batch_no,
      b.expiry_date,
      b.branch_name,
      String(b.system_qty),
      String(physicalCounts[b.id] ?? b.system_qty),
    ])
    exportToPdf(t('inventory_audit'), headers, rows, `inventory-audit-${Date.now()}.pdf`)
  }

  return (
    <div>
      <PageObjective objectiveKey="page_objective_inventory" />
      <Space style={{ marginBottom: 16 }} wrap>
        <Typography.Title level={3}>{t('inventory_audit')}</Typography.Title>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Typography.Text>{t('audit_type')}:</Typography.Text>
          <Select
            value={auditType}
            onChange={setAuditType}
            style={{ width: 120 }}
            options={[
              { value: 'daily', label: t('daily') },
              { value: 'weekly', label: t('weekly') },
              { value: 'monthly', label: t('monthly') },
            ]}
          />
          <Typography.Text>{t('branch')}:</Typography.Text>
          <Dropdown
            open={branchDropdownOpen}
            onOpenChange={setBranchDropdownOpen}
            trigger={['click']}
            popupRender={() => (
              <Card size="small" style={{ minWidth: 220, maxHeight: 280, overflow: 'auto' }}>
                <Checkbox
                  checked={branchIds === 'all'}
                  onChange={(e) => setBranchIds(e.target.checked ? 'all' : [])}
                >
                  {t('all_branches')}
                </Checkbox>
                <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                  {branches.map((b) => (
                    <div key={b.id} style={{ marginBottom: 4 }}>
                      <Checkbox
                        checked={branchIds === 'all' || (Array.isArray(branchIds) && branchIds.includes(b.id))}
                        disabled={branchIds === 'all'}
                        onChange={(e) => {
                          if (branchIds === 'all' || !Array.isArray(branchIds)) return
                          const next = e.target.checked
                            ? [...branchIds, b.id]
                            : branchIds.filter((id) => id !== b.id)
                          setBranchIds(next.length === branches.length ? 'all' : next)
                        }}
                      >
                        {i18n.language === 'ar' ? b.name_ar : b.name_en}
                      </Checkbox>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          >
            <Button style={{ minWidth: 180 }}>
              {branchIds === 'all'
                ? t('all_branches')
                : Array.isArray(branchIds) && branchIds.length > 0
                  ? `${branchIds.length} ${t('branches_selected')}`
                  : t('select_branches')}
            </Button>
          </Dropdown>
          <Button onClick={loadBatches}>{t('apply')}</Button>
          <Button onClick={handlePrint}>{t('print')}</Button>
          <Button onClick={handleExportPdf}>{t('export_pdf')}</Button>
          <Upload
            accept=".xlsx,.xls"
            showUploadList={false}
            beforeUpload={(file) => {
              const fd = new FormData()
              fd.append('file', file)
              api.post('/inventory/audit/import-excel/', fd).then((res) => {
                setExcelPreview(res.data.preview || [])
                setExcelImportBranch(branches[0]?.id || null)
              }).catch((e) => {
                alert(e?.response?.data?.detail || 'Failed to parse Excel')
              })
              return false
            }}
          >
            <Button>{t('import_excel')}</Button>
          </Upload>
        </Space>
      </Card>

      <Modal
        title={t('excel_import_preview')}
        open={!!excelPreview?.length}
        onCancel={() => setExcelPreview(null)}
        footer={[
          <Button key="cancel" onClick={() => setExcelPreview(null)}>{t('cancel')}</Button>,
          <Button
            key="apply"
            type="primary"
            disabled={!excelImportBranch}
            onClick={() => {
              if (!excelPreview?.length || !excelImportBranch) return
              const counts = excelPreview
                .filter((p) => p.branch_id === excelImportBranch)
                .map((p) => ({ batch_id: p.batch_id, physical_qty: p.physical_qty }))
              if (!counts.length) {
                alert(t('no_batches_for_branch'))
                return
              }
              api.post('/inventory/audit/apply-excel/', {
                audit_type: auditType,
                branch_id: excelImportBranch,
                counts,
              }).then(() => {
                setExcelPreview(null)
                loadBatches()
              }).catch((e) => alert(e?.response?.data?.detail || 'Failed'))
            }}
          >
            {t('apply_changes')}
          </Button>,
        ]}
        width={700}
      >
        {excelPreview?.length ? (
          <>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              {t('excel_format_hint')}
            </Typography.Text>
            <Select
              placeholder={t('branch')}
              value={excelImportBranch}
              onChange={setExcelImportBranch}
              style={{ width: 200, marginBottom: 16 }}
              options={branches.map((b) => ({ value: b.id, label: b.name_en }))}
            />
            <Table
              size="small"
              dataSource={excelPreview}
              columns={[
                { title: t('product'), dataIndex: 'product_name' },
                { title: t('batch_no'), dataIndex: 'batch_no' },
                { title: t('branch'), dataIndex: 'branch_name' },
                { title: t('system_qty'), dataIndex: 'system_qty' },
                { title: t('physical_stock'), dataIndex: 'physical_qty' },
                { title: t('diff'), dataIndex: 'diff', render: (v: number) => (v !== 0 ? v : '-') },
              ]}
              pagination={false}
              rowKey="batch_id"
            />
          </>
        ) : null}
      </Modal>

      <Card>
        <Table
          rowKey="id"
          dataSource={batches}
          columns={[
            { title: t('product'), dataIndex: 'product_name_ar', render: (_, r) => r.product_name_ar || r.product_name },
            { title: t('batch_no'), dataIndex: 'batch_no' },
            { title: t('expiry_date'), dataIndex: 'expiry_date' },
            { title: t('branch'), dataIndex: 'branch_name' },
            {
              title: t('system_qty'),
              dataIndex: 'system_qty',
              width: 100,
            },
            {
              title: t('physical_stock'),
              key: 'physical',
              width: 140,
              render: (_, record) => (
                <InputNumber
                  min={0}
                  value={physicalCounts[record.id] ?? record.system_qty}
                  onChange={(v) => handlePhysicalChange(record.id, v ?? 0)}
                  style={{ width: '100%' }}
                />
              ),
            },
          ]}
          pagination={{ pageSize: 20 }}
        />
        <div style={{ marginTop: 16 }}>
          <Button type="primary" onClick={handleSave} loading={saving}>
            {t('save_counts')}
          </Button>
        </div>
      </Card>

      <Collapse
        style={{ marginTop: 24 }}
        items={[{ key: 'adjust', label: t('stock_adjust'), children: <StockAdjustForm /> }]}
      />
    </div>
  )
}

export default Inventory
