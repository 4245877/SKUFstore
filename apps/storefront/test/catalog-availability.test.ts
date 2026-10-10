import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { apiFetch, getCatalogCategories, getCatalogProducts, getHomeProducts } from '../src/lib/api.ts';
import { ApiConnectionError, getCatalogFailureKind } from '../src/lib/catalog-errors.ts';
import { presentApiError } from '../src/i18n/api-errors.ts';
import { getTranslator } from '../src/i18n/translate.ts';

describe('catalog availability and transport', () => {
  beforeEach(() => { Object.assign(globalThis, { window: {} }); });
  afterEach(() => { mock.restoreAll(); delete (globalThis as { window?: unknown }).window; });

  it('loads products, categories and a genuinely empty catalog', async () => {
    mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
      assert.equal(init.cache, 'no-store', 'A manual retry must reach the API');
      if (url.includes('/categories')) return Response.json({ items: [{ id: 'c', slug: 'figures', name: 'Фігурки', children: [] }] });
      if (url.includes('/home')) return Response.json({ items: [] });
      return Response.json({ items: [], meta: { page: 1, limit: 24, total: 0, pageCount: 0 } });
    });
    assert.equal((await getCatalogCategories())[0].slug, 'figures');
    assert.deepEqual((await getCatalogProducts()).items, []);
    assert.deepEqual((await getHomeProducts('uk')).items, []);
  });

  it('shows a connection failure promptly, then succeeds on the next manual request', async () => {
    let calls = 0;
    mock.method(globalThis, 'fetch', async () => {
      if (++calls === 1) throw new TypeError('Failed to fetch https://private-api.invalid');
      return Response.json({ items: [] });
    });
    await assert.rejects(getCatalogCategories(), (error: ApiConnectionError) => {
      assert.equal(error.code, 'NETWORK_ERROR');
      assert.equal(getCatalogFailureKind(error), 'connection');
      assert.ok(!error.message.includes('private-api'));
      return true;
    });
    assert.equal(calls, 1, 'Browser catalog failures must not start automatic retries');
    assert.deepEqual(await getCatalogCategories(), []);
    assert.equal(calls, 2);
  });

  for (const bodyPhase of [false, true]) {
    it(`bounds the ${bodyPhase ? 'response body' : 'connection'} wait with a tagged timeout`, async () => {
      mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
        const pending = () => new Promise<never>((_resolve, reject) => {
          init.signal!.addEventListener('abort', () => reject(init.signal!.reason), { once: true });
        });
        if (!bodyPhase) return pending();
        return { text: pending } as unknown as Response;
      });
      await assert.rejects(getCatalogProducts({}, { timeoutMs: 20 }), (error: ApiConnectionError) => {
        assert.equal(error.code, 'REQUEST_TIMEOUT');
        assert.equal(getCatalogFailureKind(error), 'connection');
        return true;
      });
    });
  }

  it('does not retry external cancellation or misclassify it as a power outage', async () => {
    const controller = new AbortController();
    let calls = 0;
    mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
      calls++;
      return new Promise<Response>((_resolve, reject) => {
        init.signal!.addEventListener('abort', () => reject(init.signal!.reason), { once: true });
        controller.abort();
      });
    });
    await assert.rejects(apiFetch('/api/catalog/products', { signal: controller.signal }), { name: 'AbortError' });
    assert.equal(calls, 1);
    await assert.rejects(getCatalogCategories({ signal: controller.signal }), { name: 'AbortError' });
    assert.equal(calls, 1, 'An already cancelled request must not reach fetch');
  });

  for (const [status, kind] of [[408, 'connection'], [500, 'server'], [502, 'connection'], [503, 'connection'], [504, 'connection'], [429, 'rate-limit'], [400, 'request'], [401, 'request'], [403, 'request'], [404, 'request']] as const) {
    it(`distinguishes HTTP ${status} from other failures`, async () => {
      let calls = 0;
      mock.method(globalThis, 'fetch', async () => {
        calls++;
        return Response.json({ error: 'PRIVATE_DIAGNOSTIC', message: 'http://internal-api/stack-trace' }, { status });
      });
      await assert.rejects(getCatalogProducts(), (error: { status?: number }) => {
        assert.equal(error.status, status);
        assert.equal(getCatalogFailureKind(error), kind);
        return true;
      });
      assert.equal(calls, 1);
    });
  }

  it('does not mistake a malformed successful response for an empty catalog', async () => {
    for (const body of ['not-json', 'null', '{}', '{"items":null}']) {
      mock.method(globalThis, 'fetch', async () => new Response(body, { status: 200 }));
      for (const load of [getCatalogCategories, getCatalogProducts, getHomeProducts]) {
        await assert.rejects(load(), (error: unknown) => {
          assert.equal(getCatalogFailureKind(error), 'request');
          return true;
        });
      }
      mock.restoreAll();
    }
    assert.equal(getCatalogFailureKind(new TypeError('A rendering/programming bug')), 'request');
  });

  it('preserves safe network messages for other existing API consumers', () => {
    for (const locale of ['uk', 'en'] as const) {
      const t = getTranslator(locale);
      for (const kind of ['network', 'timeout'] as const) {
        assert.equal(presentApiError(t, new ApiConnectionError(kind)), t('errors.network'));
      }
    }
  });
});
