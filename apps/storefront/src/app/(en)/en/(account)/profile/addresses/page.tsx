import Body from '../../../../../../views/(account)/profile/addresses/page';
import { pageMetadata } from '../../../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('en', '/profile/addresses/');
export default function Page() {
  return <Body locale="en" />;
}
