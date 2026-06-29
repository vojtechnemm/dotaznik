// Verze cache se mění při každém nasazení - vynucuje vždy čerstvé načtení
const CACHE = 'dotaznik-v6';
const FILES = [
  './dotaznik-cmlsystem.html',
  './manifest.json'
];

// Instalace – uložit soubory do cache a okamžitě převzít kontrolu
self.addEventListener('install', e => {
  self.skipWaiting(); // Nečekat na zavření starých tabů
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(FILES.map(f => cache.add(f).catch(() => {})));
    })
  );
});

// Aktivace – smazat VŠECHNY staré cache a okamžitě ovládnout všechny taby
self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      ),
      self.clients.claim()
    ])
  );
});

// Fetch strategie: network-first pro HTML (vždy zkusit nejnovější verzi ze sítě),
// cache-first pro statické soubory (rychlejší, ale méně kritické)
self.addEventListener('fetch', e => {
  const isHTML = e.request.mode === 'navigate' || e.request.url.endsWith('.html');

  if (isHTML) {
    // Network-first: zkusit síť, při neúspěchu (offline) použít cache
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first pro ostatní soubory (ikony, manifest)
    e.respondWith(
      caches.match(e.request).then(cached => {
        return cached || fetch(e.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
  }
});

// Naslouchat zprávě pro vynucené přeskočení čekání (lze volat z hlavní stránky)
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
