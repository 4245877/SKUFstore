import type { MetadataRoute } from 'next';
import { getSnapshotProductSlugs } from '../lib/build-snapshot';
import { sitemapUrls } from '../lib/sitemap-urls';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  // In Pages builds generateStaticParams collects the snapshot before export workers run.
  // Never start a second catalog fetch here or read a different list from the live API.
  const slugs = process.env.DEPLOY_TARGET === 'pages' ? getSnapshotProductSlugs() : [];
  return sitemapUrls(slugs).map((url) => ({ url }));
}
