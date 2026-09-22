import Body from '../../../../views/(auth)/login/page';
import { pageMetadata } from '../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('uk', '/login/');
export default function Page() {
  return <Body />;
}
