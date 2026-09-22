import { productMetadata, ProductPage, productStaticParams } from '../../../../../../views/(shop)/product/[slug]/page';
export const dynamicParams = false;
export const generateStaticParams = productStaticParams;
export function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  return productMetadata({ ...props, locale: 'en' });
}
export default function Page(props: { params: Promise<{ slug: string }> }) {
  return <ProductPage {...props} locale="en" />;
}
