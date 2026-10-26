const C='note-v18',F=['./','index.html','manifest.json','icon.svg','cloud.js','firebase-config.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(F)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
// ネットがあれば最新を取得し、なければ保存済みを使う。データベースとの通信には触れない
self.addEventListener('fetch',e=>{
  const r=e.request,h=new URL(r.url).hostname;
  if(r.method!=='GET'||!(h===location.hostname||h==='www.gstatic.com'||h==='fonts.googleapis.com'||h==='fonts.gstatic.com'))return;
  e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(C).then(y=>y.put(r,c));return x}).catch(()=>caches.match(r)));
});
