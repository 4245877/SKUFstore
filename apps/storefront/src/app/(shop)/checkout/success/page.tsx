import { Suspense } from 'react';
import CheckoutSuccessPageClient from './CheckoutSuccessPageClient';

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessPageClient />
    </Suspense>
  );
}
