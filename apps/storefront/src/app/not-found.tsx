import StorefrontDocument from '../components/layout/StorefrontDocument';
import Body from '../views/not-found';
import { DEFAULT_LOCALE } from '../i18n/locales';

/**
 * Global 404 — the document Pages serves as /404.html for every unmatched URL,
 * /en/ ones included, since a static host has only one of these. It is
 * therefore the default locale's page. Nothing wraps it (the root layout is a
 * pass-through), so it renders the storefront shell itself; the per-group
 * not-found files still handle notFound() raised inside a locale tree.
 */
export default function NotFound() {
  return (
    <StorefrontDocument locale={DEFAULT_LOCALE} isNotFound>
      <Body locale={DEFAULT_LOCALE} />
    </StorefrontDocument>
  );
}
