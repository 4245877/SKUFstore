/** Fetch/body failures are tagged at the transport boundary, not inferred from UI errors. */
export class ApiConnectionError extends Error {
  readonly code: 'NETWORK_ERROR' | 'REQUEST_TIMEOUT';

  constructor(kind: 'network' | 'timeout', cause?: unknown) {
    super(kind === 'timeout' ? 'API request timed out' : 'API connection failed', { cause });
    this.name = 'ApiConnectionError';
    this.code = kind === 'timeout' ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR';
  }
}

export type CatalogFailureKind = 'connection' | 'server' | 'rate-limit' | 'request';

export function getCatalogFailureKind(error: unknown): CatalogFailureKind {
  if (error instanceof ApiConnectionError) return 'connection';

  const status = (error as { status?: number } | null)?.status;
  // Gateways and service-unavailable responses can reflect a backend outage.
  // A responding API's internal error (500) gets separate, neutral copy.
  if (status === 408 || status === 502 || status === 503 || status === 504) return 'connection';
  if (status === 429) return 'rate-limit';
  if (status >= 500) return 'server';
  return 'request';
}
