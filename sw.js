const CACHE_NAME = 'mp-cache-v1';
const CORE_ASSETS = [
	'/',
	'/index.html',
	'/styles.css',
	'/script.js',
	'/manifest.webmanifest',
	'/songs/index.json'
];

self.addEventListener('install', (event) => {
	event.waitUntil((async () => {
		const cache = await caches.open(CACHE_NAME);
		await cache.addAll(CORE_ASSETS);
		try {
			const res = await fetch('/songs/index.json', { cache: 'no-store' });
			if (res.ok) {
				const data = await res.json();
				if (data && Array.isArray(data.songs)) {
					const toCache = data.songs.flatMap(s => [s.src, s.lyrics].filter(Boolean));
					await cache.addAll(toCache).catch(() => {});
				}
			}
		} catch {}
		self.skipWaiting();
	})());
});

self.addEventListener('activate', (event) => {
	event.waitUntil((async () => {
		const keys = await caches.keys();
		await Promise.all(keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : null));
		await self.clients.claim();
	})());
});

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;

	// Allow range requests to go to network for proper audio seeking
	if (req.headers.has('range')) {
		event.respondWith(fetch(req));
		return;
	}

	const url = new URL(req.url);
	const isHtml = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
	const isAudio = url.pathname.endsWith('.mp3') || req.destination === 'audio' || url.pathname.startsWith('/songs/');
	const isStatic = CORE_ASSETS.includes(url.pathname) || ['style', 'script', 'image', 'font'].includes(req.destination);
	const isLyrics = url.pathname.startsWith('/lyrics/');

	if (isAudio || isStatic || isLyrics) {
		// cache-first
		event.respondWith((async () => {
			const cache = await caches.open(CACHE_NAME);
			const cached = await cache.match(req);
			if (cached) return cached;
			try {
				const res = await fetch(req);
				if (res && res.ok) cache.put(req, res.clone());
				return res;
			} catch (err) {
				return cached || Response.error();
			}
		})());
		return;
	}

	if (isHtml) {
		// network-first for HTML
		event.respondWith((async () => {
			try {
				const fresh = await fetch(req);
				return fresh;
			} catch {
				const cache = await caches.open(CACHE_NAME);
				return (await cache.match('/index.html')) || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
			}
		})());
	}
});