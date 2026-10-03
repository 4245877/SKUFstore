import type { Metadata } from 'next';
import { SITE_URL } from '../i18n/metadata';
import { DEFAULT_LOCALE } from '../i18n/locales';
import { getTranslator } from '../i18n/translate';

/**
 * Pass-through root layout. The document shell lives in the per-locale root
 * layouts under (uk) and (en) so each tree declares its own <html lang>, and
 * this file deliberately renders nothing of its own.
 *
 * It exists because a route without a root layout aborts a production build,
 * and the global not-found is exactly such a route: it sits outside both locale
 * groups. Without this file there is no app-owned 404 at all, and Next exports
 * its unbranded English fallback as /404.html for the whole site.
 *
 * The title and production asset base the 404 needs are declared here.
 * A full rootMetadata() would
 * put its '%s | SKUFnya' template above every locale layout and rewrite titles
 * that pages are already indexed under.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: getTranslator(DEFAULT_LOCALE)('seo.title'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
