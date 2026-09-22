import Body from '../../../../views/(shop)/favorites/page';
import { pageMetadata } from '../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('uk', '/favorites/');
export default function Page() {
  return <Body />;
}
