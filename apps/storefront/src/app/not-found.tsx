import { getTranslator } from '../i18n/translate';
import { DEFAULT_LOCALE } from '../i18n/locales';
const t = getTranslator(DEFAULT_LOCALE);

export default function NotFound() {
  return (
    <main>
      <h1>404</h1>
      <p>{t('errors.notFound')}</p>
    </main>
  );
}