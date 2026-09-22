import { getTranslator } from '../i18n/translate';
import type { PublishedLocale } from '../i18n/locales';

/**
 * The body every 404 shares: the per-locale not-found routes and the global
 * 404 Pages serves for unmatched URLs. One component because the global one is
 * the 404 buyers actually reach and the one nobody opens while working inside a
 * locale tree — kept apart, it is the copy that quietly goes stale.
 */
export default function NotFoundPage({ locale }: { locale: PublishedLocale }) {
  return (
    <main style={{ padding: '3rem' }}>
      <h1>404</h1>
      <p>{getTranslator(locale)('errors.notFound')}</p>
    </main>
  );
}
