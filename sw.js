// Pub Darts Cabin Scorer — Service Worker
// キャビン設置（オフライン運用）を想定し、コアファイルをキャッシュしてオフラインでも起動できるようにする。
//
// 更新方針: CACHE_NAME のバージョンを上げると、新しいSWがインストールされ、
// 古いキャッシュは activate 時に破棄される。ファイルを更新したら CACHE_VERSION を上げること。
const CACHE_VERSION = "v25"; // v25: index.htmlに読み込み失敗フォールバック(8秒後に#root空なら再読み込み案内)を追加
const CACHE_NAME = `pdcs-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./js/constants.js",
  "./js/checkout.js",
  "./js/game/save-utils.js",
  "./js/scoring.js",
  "./js/cpu.js",
  "./js/ui-components.js",
  "./js/camera/camera-input.js",
  "./js/camera/calibration.js",
  "./js/hooks/useSound.js",
  "./js/components/HowToModal.js",
  "./js/components/ExitConfirmModal.js",
  "./js/components/StatsModal.js",
  "./js/app-main.js",
  "./style.css",
  "./tailwind.css",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./vendor/react.production.min.js",
  "./vendor/react-dom.production.min.js",
  "./vendor/fonts/inter-700.woff2",
  "./vendor/fonts/inter-900.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache.addAll は1件でも404/失敗するとinstall全体が失敗し、SWが一切機能しなくなる
      // （例: icons/ の1枚がまだアップロードされていないだけで全滅する）。
      // 1件ずつ cache.add し、失敗しても他のファイルのキャッシュは継続する形にする。
      Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] precache失敗（無視して続行）: ${url}`, err);
          }),
        ),
      ).then(() => self.skipWaiting()),
    ),
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

      const result = cached || (await networkFetch);
      if (result) return result;

      // ここまでで両方とも失敗＝キャッシュ未保持のURLにオフラインでアクセスした状態。
      // ナビゲーション要求（ページ遷移・リロード等）に限っては、素のエラーを返さず
      // index.html（アプリシェル）にフォールバックする。SPA的な構成なので、
      // これで「オフライン時に画面が真っ白/エラーになる」事態を避けられる。
      if (event.request.mode === "navigate") {
        const shell = await cache.match("./index.html");
        if (shell) return shell;
      }
      return Response.error();
    }),
  );
});
