import Body from '../../../../../views/(content)/returns/page';
import { pageMetadata } from '../../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('en', '/returns/');
export default function Page() {
  return <Body locale="en" />;
}
