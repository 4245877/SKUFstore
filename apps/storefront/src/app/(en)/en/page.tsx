import Body from '../../../views/HomePageClient';
import { pageMetadata } from '../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('en', '/');
export default function Page() {
  return <Body />;
}
