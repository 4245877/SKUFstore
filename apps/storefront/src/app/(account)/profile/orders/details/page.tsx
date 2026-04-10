import { Suspense } from 'react';
import OrderDetailsPageClient from './OrderDetailsPageClient';

export default function OrderDetailsPage() {
  return (
    <Suspense fallback={null}>
      <OrderDetailsPageClient />
    </Suspense>
  );
}
