import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Files that belong to the app shell and must be available offline from the
 * very first visit. Paths are relative to the deploy base.
 */
const APP_SHELL_FILES = [
  '',
  'index.html',
  'manifest.webmanifest',
  'favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/maskable-512.png',
];

declare const process: { env: Record<string, string | undefined> };

function normalizeBase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/' || trimmed === './') return '/';
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

/**
 * GitHub Pages project sites live under `https://<user>.github.io/<repo>/`,
 * so every asset URL has to carry that prefix. Resolution order:
 *
 *   1. `BASE_PATH` environment variable (set by the workflow from
 *      `actions/configure-pages`, or manually). An empty value means "root".
 *   2. `GITHUB_REPOSITORY` injected by GitHub Actions (automatic)
 *   3. `/` for local dev/preview and for `<user>.github.io` root sites
 */
function resolveBase(): string {
  const explicitBase = process.env.BASE_PATH;
  // `''` is a meaningful value: custom domains and `<user>.github.io` sites are
  // served from the domain root, while GitHub always defines the variable.
  if (explicitBase !== undefined) return normalizeBase(explicitBase);

  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (repository) {
    // `owner.github.io` is served from the domain root, not from a sub-path.
    if (repository.toLowerCase().endsWith('.github.io')) return '/';
    return normalizeBase(repository);
  }

  return '/';
}

/**
 * Generates `sw.js` at build time. The service worker is base-aware so the
 * same code works on a domain root and inside a GitHub Pages project path.
 */
function rahyarServiceWorker(): Plugin {
  let base = '/';

  return {
    name: 'rahyar-service-worker',
    apply: 'build',
    configResolved(config) {
      base = config.base.endsWith('/') ? config.base : `${config.base}/`;
    },
    generateBundle(_options, bundle) {
      const builtAssets = Object.keys(bundle)
        .filter((file) => /\.(js|css|woff2?|ttf|png|jpe?g|svg|webp)$/i.test(file))
        .map((file) => `${base}${file}`);
      const precache = Array.from(new Set([...APP_SHELL_FILES.map((file) => `${base}${file}`), ...builtAssets]));
      const version = `rahyar-${Date.now().toString(36)}`;
      const source = `/* Rahyar service worker — generated at build time. */
const VERSION = ${JSON.stringify(version)};
const BASE = ${JSON.stringify(base)};
const CACHE = 'rahyar-' + VERSION;
const SHELL = BASE + 'index.html';
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (response && response.ok) await cache.put(url, response.clone());
          } catch (error) {
            /* A missing optional asset must not block installation. */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(BASE)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response && response.ok && response.type === 'basic') {
            const cache = await caches.open(CACHE);
            await cache.put(SHELL, response.clone());
          }
          if (response && response.ok) return response;
        } catch (error) {
          /* fall through to the cached shell */
        }
        const cache = await caches.open(CACHE);
        const shell = (await cache.match(SHELL)) || (await cache.match(BASE));
        if (shell) return shell;
        return new Response(
          '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>رهیار</title><body style="background:#07090f;color:#f3efe7;font-family:Tahoma;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><h1>رهیار</h1><p>برای بار اول به اینترنت نیاز داری.</p></div></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        );
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        return cached || Response.error();
      }
    })(),
  );
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react(), rahyarServiceWorker()],
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  build: { target: 'es2022', sourcemap: false },
});
