import { Card, Col, Row, Statistic } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'

type Report = {
  count: number
  total: number
}

const Dashboard = () => {
  const { t } = useTranslation()
  const [daily, setDaily] = useState<Report>({ count: 0, total: 0 })
  const [monthly, setMonthly] = useState<Report>({ count: 0, total: 0 })

  useEffect(() => {
    const load = async () => {
      const dailyRes = await api.get('/reports/daily_sales/')
      const monthlyRes = await api.get('/reports/monthly_sales/')
      setDaily(dailyRes.data)
      setMonthly(monthlyRes.data)
    }
    load()
  }, [])

  return (
    <Row gutter={16}>
      <Col span={12}>
        <Card>
          <Statistic title={t('daily_sales')} value={daily.total} />
        </Card>
      </Col>
      <Col span={12}>
        <Card>
          <Statistic title={t('monthly_sales')} value={monthly.total} />
        </Card>
      </Col>
    </Row>
  )
}

export default Dashboard
