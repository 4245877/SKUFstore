import Body from '../../../../../views/(content)/terms/page';
import { pageMetadata } from '../../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('en', '/terms/');
export default function Page() {
  return <Body locale="en" />;
}
