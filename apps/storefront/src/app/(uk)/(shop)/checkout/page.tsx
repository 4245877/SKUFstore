import Body from '../../../../views/(shop)/checkout/page';
import { pageMetadata } from '../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('uk', '/checkout/');
export default function Page() {
  return <Body />;
}
