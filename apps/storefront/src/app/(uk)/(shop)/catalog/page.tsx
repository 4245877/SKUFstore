import Body from '../../../../views/(shop)/catalog/page';
import { pageMetadata } from '../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('uk', '/catalog/');
export default function Page() {
  return <Body locale="uk" />;
}
