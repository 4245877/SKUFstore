import Body from '../../../../views/(auth)/register/page';
import { pageMetadata } from '../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('uk', '/register/');
export default function Page() {
  return <Body />;
}
