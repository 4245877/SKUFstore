import Body from '../../../../views/(shop)/cart/page';
import { pageMetadata } from '../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('uk', '/cart/');
export default function Page() {
  return <Body />;
}
