import Body from '../../../../views/(age-gate)/verify/page';
import { pageMetadata } from '../../../../i18n/metadata';
export const dynamic = 'force-static';
export const metadata = pageMetadata('uk', '/verify/');
export default function Page() {
  return <Body locale="uk" />;
}
