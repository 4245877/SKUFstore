import type { NextConfig } from 'next'
import { randomUUID } from 'node:crypto'

// Inherited by build workers and inlined into server bundles. A new build never
// reuses a previous catalog, while UK/EN workers share one collection run.
const catalogBuildId = process.env.SKUF_CATALOG_BUILD_ID ?? randomUUID()
process.env.SKUF_CATALOG_BUILD_ID = catalogBuildId

const deployTarget = process.env.DEPLOY_TARGET ?? 'server'
const isPages = deployTarget === 'pages'

const rawBasePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '')
const useBasePath = process.env.USE_BASE_PATH === 'true'
const basePath = isPages && useBasePath ? rawBasePath : ''

const nextConfig: NextConfig = {
  env: { SKUF_CATALOG_BUILD_ID: catalogBuildId },
  trailingSlash: true,

  experimental: {
    // Повтор страницы спасает от случайного сбоя, но бессилен против
    // недоступного API — и раньше именно он маскировал причину: в логе Actions
    // виднелись три одинаковых провала по 60 секунд вместо одной внятной
    // ошибки запроса. Данные каталога теперь приезжают до экспорта, так что
    // повтор снова стоит секунды и остаётся дешёвой страховкой.
    staticGenerationRetryCount: 3,

    // Один воркер и concurrency 1 были следствием того, что каждая страница
    // ходила в API сама: параллельные запросы упирались в лимит 60 req/min.
    // Теперь рендер страницы читает товар с диска и в сеть не ходит, поэтому
    // держать экспорт строго последовательным больше незачем. Значения всё же
    // ниже дефолтных (8 и 25): на редком промахе кеша в API уйдёт не больше
    // четырёх параллельных запросов, и раннер не раздувает память под каталог
    // из полутора сотен страниц.
    staticGenerationMaxConcurrency: 4,
    staticGenerationMinPagesPerWorker: 50,
  },

  images: {
    unoptimized: true,
  },

  ...(isPages
    ? {
        output: 'export',
        ...(basePath ? { basePath } : {}),
      }
    : {
        output: 'standalone',
      }),
}

export default nextConfig
