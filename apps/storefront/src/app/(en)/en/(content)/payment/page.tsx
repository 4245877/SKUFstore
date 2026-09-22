import Body from '../../../../../views/(content)/payment/page';
import { pageMetadata } from '../../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('en', '/payment/');
export default function Page() {
  return <Body locale="en" />;
}
