import { Button, Card, message, Space, Table, Upload, Select, Typography } from 'antd'
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import PageObjective from '../components/PageObjective'

const FIELD_OPTIONS = [
  { value: 'productName', label: 'productName' },
  { value: 'sku', label: 'sku' },
  { value: 'barcode', label: 'barcode' },
  { value: 'productType', label: 'productType' },
  { value: 'category', label: 'category' },
  { value: 'supplier', label: 'supplier' },
  { value: 'pillsPerStrip', label: 'pillsPerStrip' },
  { value: 'stripsPerBox', label: 'stripsPerBox' },
  { value: 'pricePerStrip', label: 'pricePerStrip' },
  { value: 'pricePerBox', label: 'pricePerBox' },
  { value: 'stockUnit', label: 'stockUnit' },
  { value: 'stockQty', label: 'stockQty' },
  { value: 'batchNumber', label: 'batchNumber' },
  { value: 'expiryDate', label: 'expiryDate' },
  { value: 'cost', label: 'cost' },
]

type RowStatus = 'new' | 'update' | 'error'

type PreviewRow = {
  _row: number
  _raw: string[]
  _status?: RowStatus
  _error?: string
  productName?: string
  sku?: string
  barcode?: string
  productType?: string
  category?: string
  supplier?: string
  pillsPerStrip?: number
  stripsPerBox?: number
  pricePerStrip?: number
  pricePerBox?: number
  stockUnit?: string
  stockQty?: number
  batchNumber?: string
  expiryDate?: string
  cost?: number
  [k: string]: any
}

const ImportExcel = () => {
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [parsed, setParsed] = useState<{
    headers: string[]
    suggested_mapping: Record<string, number>
    rows: PreviewRow[]
    total_rows: number
  } | null>(null)
  const [mapping, setMapping] = useState<Record<string, number>>({})
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    created: number
    updated: number
    batches: number
    errors: { row: number; message: string }[]
  } | null>(null)
  const [branches, setBranches] = useState<any[]>([])

  useEffect(() => {
    api.get('/branches/').then((res) => setBranches(res.data || []))
  }, [])

  const handleUpload = async (f: File) => {
    if (!f.name.toLowerCase().endsWith('.xlsx')) {
      message.error(t('err_xlsx_only'))
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      message.error(t('err_file_size'))
      return
    }
    setFile(f)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', f)
      const res = await api.post('/products/import-excel/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setParsed(res.data)
      setMapping(res.data.suggested_mapping || {})
      setRows(res.data.rows || [])
      setResult(null)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message
      message.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setUploading(false)
    }
    return false
  }

  const validateRows = () => {
    const updated = rows.map((r) => {
      const name = (r.productName ?? r.product_name ?? '').toString().trim()
      if (!name) {
        return { ...r, _status: 'error' as RowStatus, _error: t('err_product_name_required') }
      }
      if (r.productType === 'pills' && (Number(r.pillsPerStrip ?? r.pills_per_strip) || 0) < 1) {
        return { ...r, _status: 'error' as RowStatus, _error: t('err_pills_required') }
      }
      const status = r.sku || r.barcode ? 'update' : 'new'
      return { ...r, _status: status, _error: undefined }
    })
    setRows(updated)
    message.success(t('validation_done'))
  }

  const handleImport = async () => {
    const validRows = rows.filter((r) => r._status !== 'error')
    if (!validRows.length) {
      message.error(t('err_no_valid_rows'))
      return
    }
    setImporting(true)
    try {
      const branchId = branches[0]?.id
      const res = await api.post('/products/import-commit/', {
        rows: validRows.map(({ _row, _raw, _status, _error, ...rest }) => ({ _row, ...rest })),
        mapping,
        branch: branchId,
      })
      setResult(res.data)
      if (res.data.errors?.length) {
        message.warning(t('import_completed_with_errors'))
      } else {
        message.success(t('import_completed'))
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message
      message.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/products/import-template/', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'products_import_template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error(t('download_failed'))
    }
  }

  const downloadErrors = () => {
    if (!result?.errors?.length) return
    const csv = [
      ['row', 'message'],
      ...result.errors.map((e) => [e.row, e.message]),
    ]
      .map((r) => r.join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import_errors_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getRowStyle = (r: PreviewRow) => {
    if (r._status === 'error') return { backgroundColor: '#fff2f0' }
    if (r._status === 'update') return { backgroundColor: '#e6f4ff' }
    return { backgroundColor: '#f6ffed' }
  }

  return (
    <div>
      <PageObjective objectiveKey="page_objective_import_excel" />
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={3}>{t('import_products_excel')}</Typography.Title>

        <Card>
          <Upload.Dragger
            accept=".xlsx"
            maxCount={1}
            beforeUpload={handleUpload}
            fileList={file ? [{ uid: '1', name: file.name }] : []}
            onRemove={() => {
              setFile(null)
              setParsed(null)
              setRows([])
              setResult(null)
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 48, color: '#1677ff' }} />
            </p>
            <p className="ant-upload-text">{t('upload_excel')}</p>
            <p className="ant-upload-hint">{t('upload_hint')}</p>
          </Upload.Dragger>
        </Card>

        <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
          {t('download_template')}
        </Button>

        {parsed && (
          <>
            <Card title={t('preview')}>
              <Table
                rowKey="_row"
                dataSource={rows}
                pagination={{ pageSize: 20 }}
                scroll={{ x: 800 }}
                rowClassName={(r) => (r._status === 'error' ? 'error-row' : '')}
                onRow={(r) => ({ style: getRowStyle(r) })}
                columns={[
                  { title: '#', dataIndex: '_row', width: 50 },
                  { title: t('product'), dataIndex: 'productName', render: (v) => v ?? '-' },
                  { title: t('sku'), dataIndex: 'sku', render: (v) => v ?? '-' },
                  { title: t('barcode'), dataIndex: 'barcode', render: (v) => v ?? '-' },
                  { title: t('pills_per_strip'), dataIndex: 'pillsPerStrip', render: (v) => v ?? '-' },
                  { title: t('price_per_strip'), dataIndex: 'pricePerStrip', render: (v) => v ?? '-' },
                  {
                    title: t('status'),
                    dataIndex: '_status',
                    render: (v, r) => (r._error ? <span title={r._error} style={{ color: 'red' }}>{v}</span> : v),
                  },
                ]}
              />
            </Card>

            <Space>
              <Button onClick={validateRows}>{t('validate')}</Button>
              <Button type="primary" loading={importing} onClick={handleImport}>
                {t('import')}
              </Button>
              {result?.errors?.length ? (
                <Button onClick={downloadErrors}>{t('download_errors')}</Button>
              ) : null}
            </Space>
          </>
        )}

        {result && (
          <Card title={t('import_result')}>
            <p>
              {t('created')}: {result.created} | {t('updated')}: {result.updated} | {t('batches')}: {result.batches}
            </p>
            {result.errors?.length ? (
              <p style={{ color: 'red' }}>
                {t('errors')}: {result.errors.length}
              </p>
            ) : null}
          </Card>
        )}
      </Space>
    </div>
  )
}

export default ImportExcel
