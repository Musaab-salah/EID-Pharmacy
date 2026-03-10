import { Button, Card, Form, Input, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api'
import { setToken } from '../auth'

const Login = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleSubmit = async (values: { email: string; password: string }) => {
    const response = await api.post('/auth/token/', {
      email: values.email,
      password: values.password,
    })
    setToken(response.data.access)
    navigate('/')
  }

  return (
    <div className="centered">
      <Card style={{ width: 360 }}>
        <Typography.Title level={3}>{t('login')}</Typography.Title>
        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label={t('email')}
            name="email"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t('password')}
            name="password"
            rules={[{ required: true }]}
          >
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            {t('login')}
          </Button>
        </Form>
      </Card>
    </div>
  )
}

export default Login
