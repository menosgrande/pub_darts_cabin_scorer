// Pub Darts Cabin Scorer — Service Worker
// キャビン設置（オフライン運用）を想定し、コアファイルをキャッシュしてオフラインでも起動できるようにする。
//
// 更新方針: CACHE_NAME のバージョンを上げると、新しいSWがインストールされ、
// 古いキャッシュは activate 時に破棄される。ファイルを更新したら CACHE_VERSION を上げること。
const CACHE_VERSION = "v1";
const CACHE_NAME = `pdcs-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./app.js",
  "./style.css",
  "./tailwind.css",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "https://unpkg.com/react@18/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// 戦略: キャッシュ優先 + バックグラウンド更新（stale-while-revalidate）。
// オフラインのキャビン設置でも即起動でき、オンライン時は裏で最新版を取得してキャッシュを更新する。
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => null); // オフライン時はネットワーク取得失敗を無視してキャッシュに委ねる

      return cached || (await networkFetch) || Response.error();
    }),
  );
});
