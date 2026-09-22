import Body from '../../../../../views/(shop)/checkout/failed/page';
import { pageMetadata } from '../../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('uk', '/checkout/failed/');
export default function Page() {
  return <Body locale="uk" />;
}
