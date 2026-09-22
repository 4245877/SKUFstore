import Body from '../../../../views/(auth)/forgot-password/page';
import { pageMetadata } from '../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('uk', '/forgot-password/');
export default function Page() {
  return <Body locale="uk" />;
}
