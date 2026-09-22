import Body from '../../../../views/(content)/faq/page';
import { pageMetadata } from '../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('uk', '/faq/');
export default function Page() {
  return <Body locale="uk" />;
}
