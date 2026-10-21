// Offline shell only. NEVER cache API, REST klines, exchangeInfo, price streams or manufactured market data.
const VERSION='lsr-shell-v1.1';
const ASSETS=['./','./index.html','./style.css','./src/app.mjs','./src/feed.mjs','./src/engine.mjs','./src/chart.mjs','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
 e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));});