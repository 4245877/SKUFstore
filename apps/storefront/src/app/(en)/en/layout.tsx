import StorefrontDocument from '../../../components/layout/StorefrontDocument';
import { rootMetadata } from '../../../i18n/metadata';
export const metadata = rootMetadata('en');
export default function Layout({ children }: { children: React.ReactNode }) {
  return <StorefrontDocument locale="en">{children}</StorefrontDocument>;
}
