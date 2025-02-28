const CACHE_NAME = "vinyl-cd-tracker-v1";
const urlsToCache = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./spotify.js",
    "./applemusic.js",
    "./img/add.svg",
    "./img/delete.svg",
    "./img/edit.svg",
    "./img/filter.svg",
    "./img/grid.svg",
    "./img/list.svg",
    "./img/refresh.svg",
    "./img/stats.svg",
    "./img/random.svg",
    "./img/clear.svg",
    "./img/link.svg",
    "./img/export.svg",
    "./img/import.svg",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }
            return fetch(event.request);
        })
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
});
