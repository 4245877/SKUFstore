import Body from '../../../../../views/(content)/privacy/page';
import { pageMetadata } from '../../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('en', '/privacy/');
export default function Page() {
  return <Body locale="en" />;
}
