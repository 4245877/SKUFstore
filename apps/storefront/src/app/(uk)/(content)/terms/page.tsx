import Body from '../../../../views/(content)/terms/page';
import { pageMetadata } from '../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('uk', '/terms/');
export default function Page() {
  return <Body locale="uk" />;
}
