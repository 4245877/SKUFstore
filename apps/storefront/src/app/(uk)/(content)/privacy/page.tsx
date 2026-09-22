import Body from '../../../../views/(content)/privacy/page';
import { pageMetadata } from '../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('uk', '/privacy/');
export default function Page() {
  return <Body locale="uk" />;
}
