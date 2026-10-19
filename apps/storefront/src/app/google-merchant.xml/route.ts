import { resolveMediaUrl } from '../../lib/api';
import { getSnapshotProducts, getSnapshotResinColors } from '../../lib/build-snapshot';
import { buildMerchantFeed } from '../../lib/merchant-feed';

export const dynamic = 'force-static';

export function GET(): Response {
  // generateStaticParams collects the same completed catalog for Pages and
  // standalone builds before export. A missing snapshot must fail the build.
  const result = buildMerchantFeed(getSnapshotProducts(), getSnapshotResinColors(), resolveMediaUrl);
  console.info(`[google-merchant] included=${result.diagnostics.includedCount} source=${result.diagnostics.productCount}`);
  for (const exclusion of result.diagnostics.excluded) {
    console.warn(`[google-merchant] excluded id=${exclusion.id} slug=${exclusion.slug} reason=${exclusion.reason}`);
  }
  return new Response(result.xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
