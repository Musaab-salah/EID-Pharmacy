import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

type PageObjectiveProps = {
  objectiveKey: string
}

const PageObjective = ({ objectiveKey }: PageObjectiveProps) => {
  const { t } = useTranslation()
  const text = t(objectiveKey)
  if (!text || text === objectiveKey) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <Text type="secondary" style={{ fontSize: 13 }}>
        <strong>{t('page_objective')}:</strong> {text}
      </Text>
    </div>
  )
}

export default PageObjective
