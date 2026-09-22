import Body from '../../../../../../views/(shop)/checkout/failed/page';
import { pageMetadata } from '../../../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('en', '/checkout/failed/');
export default function Page() {
  return <Body locale="en" />;
}
