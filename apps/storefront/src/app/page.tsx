import { getTranslator } from '../i18n/translate';
import { DEFAULT_LOCALE } from '../i18n/locales';
import type { Metadata } from 'next'
import HomePageClient from './HomePageClient'

const t = getTranslator(DEFAULT_LOCALE);

export const metadata: Metadata = {
  title: t('seo.homeTitle'),
  description:
    t('seo.homeDescription'),
}

export default function HomePage() {
  return <HomePageClient />
}