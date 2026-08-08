self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => {
      return new Response(
        "<html><body><h2>App is offline. Please check your internet connection.</h2></body></html>",
        { headers: { 'Content-Type': 'text/html' } }
      );
    })
  );
});
