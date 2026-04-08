import { Button, Card, message, Space, Table, Typography, Upload } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import PageObjective from '../components/PageObjective'
import ConflictsTable from '../components/admin/ConflictsTable'

const SyncFromBatches = () => {
  const { t } = useTranslation()
  const [syncing, setSyncing] = useState(false)
  const [importingBatches, setImportingBatches] = useState(false)
  const [summary, setSummary] = useState<{ created: number; updated: number; conflicts: number; skipped: number } | null>(null)
  const [conflicts, setConflicts] = useState<any[]>([])
  const [batchImports, setBatchImports] = useState<any[]>([])

  const loadConflicts = async () => {
    try {
      const res = await api.get('/products/conflicts/')
      setConflicts(res.data || [])
    } catch {
      setConflicts([])
    }
  }

  const loadBatchImports = async () => {
    try {
      const res = await api.get('/batch-imports/').catch(() => ({ data: [] }))
      setBatchImports(res.data || [])
    } catch {
      setBatchImports([])
    }
  }

  useEffect(() => {
    loadConflicts()
    loadBatchImports()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await api.post('/products/sync-from-batches/')
      setSummary(res.data)
      message.success(t('sync_completed'))
      loadConflicts()
      loadBatchImports()
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'فشل المزامنة'
      message.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSyncing(false)
    }
  }

  const onResolved = () => {
    loadConflicts()
    loadBatchImports()
  }

  const handleBatchImport = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      message.error(t('err_xlsx_only'))
      return false
    }
    setImportingBatches(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/products/import-batches-excel/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      message.success(t('batch_import_success', { count: res.data.created }))
      loadBatchImports()
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message
      message.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setImportingBatches(false)
    }
    return false
  }

  return (
    <div>
      <PageObjective objectiveKey="page_objective_sync_batches" />
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={3}>{t('sync_from_batches')}</Typography.Title>

        <div className="flex flex-wrap gap-4">
          <Card className="min-w-[140px]" title={t('created')}>
            <Typography.Title level={2} style={{ margin: 0, color: '#52c41a' }}>
              {summary?.created ?? '-'}
            </Typography.Title>
          </Card>
          <Card className="min-w-[140px]" title={t('updated')}>
            <Typography.Title level={2} style={{ margin: 0, color: '#1677ff' }}>
              {summary?.updated ?? '-'}
            </Typography.Title>
          </Card>
          <Card className="min-w-[140px]" title={t('conflicts')}>
            <Typography.Title level={2} style={{ margin: 0, color: '#faad14' }}>
              {summary?.conflicts ?? conflicts.length}
            </Typography.Title>
          </Card>
          <Card className="min-w-[140px]" title={t('skipped')}>
            <Typography.Title level={2} style={{ margin: 0, color: '#999' }}>
              {summary?.skipped ?? '-'}
            </Typography.Title>
          </Card>
        </div>

        <Space wrap>
          <Upload accept=".xlsx" showUploadList={false} beforeUpload={handleBatchImport}>
            <Button loading={importingBatches}>{t('import_batches_excel')}</Button>
          </Upload>
          <Button type="primary" loading={syncing} onClick={handleSync}>
            {t('run_sync')}
          </Button>
          <Typography.Text type="secondary">
            {t('sync_help')}
          </Typography.Text>
        </Space>

        {conflicts.length > 0 && (
          <ConflictsTable conflicts={conflicts} onResolved={onResolved} />
        )}

        {batchImports.length > 0 && (
          <Card title={t('batch_imports_pending')}>
            <Table
              rowKey="id"
              dataSource={batchImports}
              pagination={{ pageSize: 10 }}
              columns={[
                { title: t('product'), dataIndex: 'product_name' },
                { title: t('batch_no'), dataIndex: 'batch_number' },
                { title: t('sku'), dataIndex: 'sku' },
                { title: t('barcode'), dataIndex: 'barcode' },
                { title: t('qty_on_hand'), dataIndex: 'quantity' },
                { title: t('expiry_date'), dataIndex: 'expiry_date' },
              ]}
            />
          </Card>
        )}
      </Space>
    </div>
  )
}

export default SyncFromBatches
