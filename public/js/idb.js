let db;

const request = indexedDB.open('budget-tracker', 1)

request.onupgradeneeded = function(event) {
    const db = event.target.result
    db.createObjectStore('new_transaction', { autoIncrement: true })
}

request.onsuccess = function(event) {
    db = event.target.result

    if (navigator.onLine) {
        syncOfflineTransactions()
    }
}

request.onerror = function(event) {
    console.log(event.target.errorCode)
}

function saveOfflineTransaction(record) {
    const transaction = db.transaction(['new_transaction'], 'readwrite')
    const transactionObjectStore = transaction.objectStore('new_transaction')
    transactionObjectStore.add(record)
}

async function syncOfflineTransactions() {
    const records = await getIDBrecords()

    if (records.length > 0) {
        fetch('/api/transaction/bulk', {
            method: 'POST',
            body: JSON.stringify(records),
            headers: {
                Accept: 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(serverResponse => {
            if (serverResponse.message) {
                throw new Error(serverResponse)
            }

            const transaction = db.transaction(['new_transaction'], 'readwrite')
            const transactionObjectStore = transaction.objectStore('new_transaction')
            transactionObjectStore.clear()

            window.location.reload()
        }) 
        .catch(err => {
            console.log(err)
        })
    }
}

function getIDBrecords() {
    return new Promise( res => {
        const transaction = db.transaction(['new_transaction'], 'readwrite')
        const transactionObjectStore = transaction.objectStore('new_transaction')
        const getAll = transactionObjectStore.getAll()

        getAll.onsuccess = function() {
            res(getAll.result)
        }        
    })

}

window.addEventListener('online', syncOfflineTransactions)