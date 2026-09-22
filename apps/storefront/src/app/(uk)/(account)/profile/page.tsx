import Body from '../../../../views/(account)/profile/page';
import { pageMetadata } from '../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('uk', '/profile/');
export default function Page() {
  return <Body />;
}
