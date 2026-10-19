import { getSnapshotProducts, getSnapshotResinColors } from '../../lib/build-snapshot';
import { buildMerchantSourceState } from '../../lib/merchant-feed';

export const dynamic = 'force-static';

export function GET(): Response {
  return Response.json(buildMerchantSourceState(getSnapshotProducts(), getSnapshotResinColors()));
}
