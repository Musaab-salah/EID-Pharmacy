import { useTranslation } from 'react-i18next'

const LanguageSwitch = () => {
  const { i18n, t } = useTranslation()
  return (
    <select
      aria-label={t('language')}
      value={i18n.language}
      onChange={(event) => i18n.changeLanguage(event.target.value)}
    >
      <option value="ar">العربية</option>
      <option value="en">English</option>
    </select>
  )
}

export default LanguageSwitch
