import { Select } from 'antd'
import { useTranslation } from 'react-i18next'

const LanguageSwitch = () => {
  const { i18n, t } = useTranslation()

  return (
    <Select
      aria-label={t('language')}
      value={i18n.language}
      onChange={(value) => i18n.changeLanguage(value)}
      options={[
        { value: 'en', label: 'English' },
        { value: 'ar', label: 'العربية' },
      ]}
      style={{ width: 140 }}
    />
  )
}

export default LanguageSwitch
