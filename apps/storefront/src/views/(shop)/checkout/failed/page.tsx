import { getTranslator } from '../../../../i18n/translate';
import type { PublishedLocale } from '../../../../i18n/locales';
import Link from '../../../../i18n/navigation';
export default function Page({ locale }: { locale: PublishedLocale }) {
  const t = getTranslator(locale);
  return <main style={{ maxWidth: 720, margin: '4rem auto', padding: '1.5rem' }}>
    <h1>{t('checkout.failedTitle')}</h1><p>{t('checkout.failedText')}</p>
    <p><Link href="/contacts/">{t('nav.contacts')}</Link></p>
    <p><Link href="/profile/orders/">{t('nav.orders')}</Link> · <Link href="/cart/">{t('nav.cart')}</Link></p>
  </main>;
}
