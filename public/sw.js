/**
 * Service Worker for H5 Encrypted Display Page
 * Provides caching strategies for better performance
 */

const CACHE_NAME = 'h5-display-v1.0.0';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/display-controller.js',
  '/click-handler.js',
  '/parameter-parser.js',
  '/decryption-service.js',
  '/firebase-service.js',
  '/error-handler.js'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('📦 Caching app resources');
        return cache.addAll(CACHE_URLS);
      })
      .then(function() {
        console.log('✅ Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('❌ Service Worker installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('✅ Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip Firebase requests
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version if available
        if (response) {
          console.log('📦 Serving from cache:', event.request.url);
          return response;
        }
        
        // Otherwise fetch from network
        console.log('🌐 Fetching from network:', event.request.url);
        return fetch(event.request).then(function(response) {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response for caching
          const responseToCache = response.clone();
          
          // Cache the response for future use
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(function(error) {
        console.error('❌ Fetch failed:', error);
        
        // Return offline fallback for HTML requests
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        
        throw error;
      })
  );
});

// Message event - handle cache updates
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    // Force cache update
    caches.delete(CACHE_NAME).then(function() {
      console.log('🔄 Cache cleared for update');
    });
  }
});

// Performance monitoring
self.addEventListener('fetch', function(event) {
  const startTime = Date.now();
  
  event.respondWith(
    caches.match(event.request).then(function(response) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log performance metrics for monitoring
      if (duration > 1000) { // Log slow requests
        console.warn('⚠️ Slow request detected:', {
          url: event.request.url,
          duration: duration + 'ms',
          cached: !!response
        });
      }
      
      return response || fetch(event.request);
    })
  );
});