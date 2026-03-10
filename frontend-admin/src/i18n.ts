import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ar from './locales/ar.json'
import en from './locales/en.json'

const resources = {
  en: { translation: en },
  ar: { translation: ar },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

const applyDirection = (lang: string) => {
  const isArabic = lang === 'ar'
  document.documentElement.dir = isArabic ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
}

applyDirection(i18n.language)
i18n.on('languageChanged', applyDirection)

export default i18n
