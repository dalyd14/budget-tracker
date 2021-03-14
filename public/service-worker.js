const STATIC_CACHE_NAME = 'BudgetTrackerStatic-v1'
const DATA_CACHE_NAME = 'BudgetTrackerData-v1'

const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/index.js',
    '/js/idb.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    'https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css'
]

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            console.log('installing cache: ' + STATIC_CACHE_NAME)
            cache.addAll(FILES_TO_CACHE)
        })        
    )

    self.skipWaiting()
})

self.addEventListener('activate', evt => {
    evt.waitUntil(
        caches.keys().then(keys => {
            console.log(keys)
            return Promise.all(
                keys.map(key => {
                    if (key !== STATIC_CACHE_NAME && key !== DATA_CACHE_NAME) {
                        console.log('Removing old cache data', key)
                        return caches.delete(key)
                    }
                })
            )
        })
    )

    self.clients.claim()
})

function getFromIDB() {
    return new Promise( res => {
        const request = indexedDB.open('budget-tracker', 1)
        request.onsuccess = event => {
            const db = event.target.result
            const transaction = db.transaction(['new_transaction'], 'readwrite')
            const transactionObjectStore = transaction.objectStore('new_transaction')
            const getAll = transactionObjectStore.getAll()

            getAll.onsuccess = function() {
                res(getAll.result)
            }                 
        }
    })
}

self.addEventListener('fetch', evt => {
    if (evt.request.url.includes('/api/') && evt.request.method === 'GET') {
        evt.respondWith(
            caches  
                .open(DATA_CACHE_NAME)
                .then(cache => {
                    return fetch(evt.request)
                        .then(response => {
                            if (response.status === 200) {
                                cache.put(evt.request.url, response.clone())
                            }
                            return response
                        })
                        .catch(err => {
                            return cache.match(evt.request)
                                .then(async cache => {
                                    const cacheData = await cache.json()
                                    const responseData = await getFromIDB()
                                    responseData.reverse()
                                    const newBody = JSON.stringify(responseData.concat(cacheData))
                                    return new Response(newBody, { status : 200 , statusText : "OK" })
                                })
                        })
                })
                .catch(err => console.log(err))
        )
        return
    }

    evt.respondWith(
        caches.match(evt.request).then(cacheRes => {
            return cacheRes || fetch(evt.request)
        })
    )
})