// =====================================
// D&D CHARACTER SHEET - SERVICE WORKER
// =====================================

const CACHE_NAME = 'dnd-character-sheet-v1.0.0';
const DATA_CACHE_NAME = 'dnd-data-cache-v1.0.0';

// Files to cache for offline functionality
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/data/stats.html',
  '/data/equipment.html',
  '/data/spells_skills.html',
  '/data/notes.html',
  '/manifest.json',
  // Add your icons when you create them
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// D&D SRD and rules data (these could be added later)
const DATA_FILES = [
  '/data/classes.json',
  '/data/spells.json',
  '/data/equipment.json',
  '/data/species.json'
];

// =====================================
// SERVICE WORKER INSTALLATION
// =====================================

self.addEventListener('install', function(event) {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(FILES_TO_CACHE);
    }).then(function() {
      // Force the waiting service worker to become the active service worker
      return self.skipWaiting();
    }).catch(function(error) {
      console.error('[ServiceWorker] Cache installation failed:', error);
    })
  );
});

// =====================================
// SERVICE WORKER ACTIVATION
// =====================================

self.addEventListener('activate', function(event) {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Delete old caches
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// =====================================
// FETCH EVENT HANDLING (OFFLINE SUPPORT)
// =====================================

self.addEventListener('fetch', function(event) {
  // Handle different types of requests
  if (event.request.url.includes('/api/') || event.request.url.includes('/data/')) {
    // Handle data requests (for future API integration)
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(function(cache) {
        return fetch(event.request).then(function(response) {
          // If request is successful, clone and cache the response
          if (response.status === 200) {
            cache.put(event.request.url, response.clone());
          }
          return response;
        }).catch(function() {
          // If network fails, return cached version
          return cache.match(event.request);
        });
      })
    );
  } else {
    // Handle app shell requests
    event.respondWith(
      caches.match(event.request).then(function(response) {
        // Return cached version if available
        if (response) {
          return response;
        }
        
        // Otherwise, fetch from network
        return fetch(event.request).then(function(response) {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response for caching
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        }).catch(function() {
          // If both cache and network fail, return a basic offline page
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
    );
  }
});

// =====================================
// BACKGROUND SYNC (Future Feature)
// =====================================

self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync-character') {
    console.log('[ServiceWorker] Background sync: character data');
    event.waitUntil(syncCharacterData());
  }
});

function syncCharacterData() {
  // This function could sync character data with a cloud service
  // when the app comes back online
  return new Promise((resolve) => {
    console.log('[ServiceWorker] Syncing character data...');
    // Implementation would go here
    resolve();
  });
}

// =====================================
// PUSH NOTIFICATIONS (Future Feature)
// =====================================

self.addEventListener('push', function(event) {
  console.log('[ServiceWorker] Push received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New D&D notification',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open Character Sheet',
        icon: '/assets/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close notification',
        icon: '/assets/icons/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('D&D Character Sheet', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[ServiceWorker] Notification click received.');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    event.notification.close();
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// =====================================
// MESSAGE HANDLING
// =====================================

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// =====================================
// UTILITY FUNCTIONS
// =====================================

// Function to check if the user is online
function isOnline() {
  return navigator.onLine;
}

// Function to cache additional D&D data files
function cacheDataFiles() {
  return caches.open(DATA_CACHE_NAME).then(function(cache) {
    return cache.addAll(DATA_FILES);
  }).catch(function(error) {
    console.log('[ServiceWorker] Failed to cache data files:', error);
  });
}

// =====================================
// PERIODIC BACKGROUND SYNC (Future)
// =====================================

self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'update-character-data') {
    event.waitUntil(updateCharacterData());
  }
});

function updateCharacterData() {
  // This could check for character updates or sync with cloud storage
  console.log('[ServiceWorker] Periodic sync: updating character data');
  return Promise.resolve();
}

// =====================================
// DEBUGGING AND DEVELOPMENT
// =====================================

// Log service worker events for debugging
console.log('[ServiceWorker] Service Worker script loaded');

// Function to clear all caches (useful for development)
function clearAllCaches() {
  return caches.keys().then(function(cacheNames) {
    return Promise.all(
      cacheNames.map(function(cacheName) {
        return caches.delete(cacheName);
      })
    );
  });
}

// Expose debugging functions
self.debugSW = {
  clearAllCaches,
  cacheDataFiles,
  cacheName: CACHE_NAME,
  dataCacheName: DATA_CACHE_NAME
};