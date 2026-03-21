import { Button, Card, DatePicker, Input, Table, Upload } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import dayjs from 'dayjs'
import PageObjective from '../components/PageObjective'

const Sales = () => {
  const { t } = useTranslation()
  const [sales, setSales] = useState<any[]>([])
  const [dateFrom, setDateFrom] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'))
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'))

  const load = () => {
    api.get('/sales/').then((res) => {
      const all = res.data || []
      const filtered = all.filter((s: any) => {
        const d = s.created_at?.slice(0, 10) || ''
        return d >= dateFrom && d <= dateTo
      })
      setSales(filtered)
    })
  }

  useEffect(() => {
    load()
  }, [dateFrom, dateTo])

  const handleUploadProof = (invoiceId: number, file: File) => {
    const form = new FormData()
    form.append('payment_proof', file)
    api.patch(`/sales/${invoiceId}/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(() => load()).catch((e) => alert(e?.response?.data?.detail || 'Failed'))
  }

  return (
    <div>
      <PageObjective objectiveKey="page_objective_reports" />
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <DatePicker.RangePicker
            value={[dayjs(dateFrom), dayjs(dateTo)]}
            onChange={(dates) => {
              if (dates?.[0]) setDateFrom(dates[0].format('YYYY-MM-DD'))
              if (dates?.[1]) setDateTo(dates[1].format('YYYY-MM-DD'))
            }}
          />
          <Button onClick={load}>{t('apply')}</Button>
        </div>
      </Card>
      <Table
        rowKey="id"
        dataSource={sales}
        columns={[
          { title: t('sale_date'), render: (_, r) => r.created_at?.slice(0, 10) },
          { title: t('invoice_no'), dataIndex: 'id' },
          { title: t('cashier'), render: (_, r) => r.cashier?.name || r.cashier },
          { title: t('payment_method'), dataIndex: 'payment_method' },
          { title: t('grand_total'), dataIndex: 'grand_total', render: (v: unknown) => (v != null ? Number(v).toFixed(2) : '') },
          {
            title: t('payment_proof'),
            render: (_, r) => {
              if (r.payment_method !== 'TRANSFER') return '-'
              return (
                <Upload
                  accept="image/jpeg,image/png"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    handleUploadProof(r.id, file)
                    return false
                  }}
                >
                  <Button size="small">{r.payment_proof ? t('edit') : t('add')}</Button>
                </Upload>
              )
            },
          },
        ]}
      />
    </div>
  )
}

export default Sales
