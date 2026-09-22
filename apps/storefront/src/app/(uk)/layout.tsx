import StorefrontDocument from '../../components/layout/StorefrontDocument';
import { rootMetadata } from '../../i18n/metadata';
export const metadata = rootMetadata('uk');
export default function Layout({ children }: { children: React.ReactNode }) {
  return <StorefrontDocument locale="uk">{children}</StorefrontDocument>;
}
