import Body from '../../../../../views/(shop)/catalog/page';
import { pageMetadata } from '../../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('en', '/catalog/');
export default function Page() {
  return <Body locale="en" />;
}
