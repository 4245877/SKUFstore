import Body from '../../../../../views/(content)/faq/page';
import { pageMetadata } from '../../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('en', '/faq/');
export default function Page() {
  return <Body locale="en" />;
}
