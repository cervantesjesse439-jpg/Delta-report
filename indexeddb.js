// js/services/indexeddb.js
import { DB_NAME, CHUNK_SIZE } from "./config.js";
import { chunksRef, setDoc, doc } from "./firebase.js";

let localDB = null;

export const initLocalDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            localDB = e.target.result;
            if (!localDB.objectStoreNames.contains('images')) {
                localDB.createObjectStore('images', { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => { 
            localDB = e.target.result; 
            resolve(localDB); 
        };
        request.onerror = (e) => { 
            console.error("Error IndexedDB", e); 
            reject(e); 
        };
    });
};

export const saveImageLocally = (id, data) => {
    if (!localDB) return;
    try {
        const tx = localDB.transaction('images', 'readwrite');
        tx.objectStore('images').put({ id, data });
    } catch (e) { 
        console.error("Error guardando imagen en cache", e); 
    }
};

export const getImageLocally = (id) => {
    return new Promise((resolve) => {
        if (!localDB) return resolve(null);
        try {
            const tx = localDB.transaction('images', 'readonly');
            const req = tx.objectStore('images').get(id);
            req.onsuccess = () => resolve(req.result ? req.result.data : null);
            req.onerror = () => resolve(null);
        } catch (e) { 
            resolve(null); 
        }
    });
};

export function resizeImageAndConvert(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                let scaleFull = img.width > 1600 ? 1600 / img.width : 1;
                canvas.width = img.width * scaleFull;
                canvas.height = img.height * scaleFull;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const fullB64 = canvas.toDataURL('image/jpeg', 0.85);

                let scaleThumb = img.width > 200 ? 200 / img.width : 1;
                canvas.width = img.width * scaleThumb;
                canvas.height = img.height * scaleThumb;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const thumbB64 = canvas.toDataURL('image/jpeg', 0.5);

                const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
                saveImageLocally(id, fullB64);
                
                const chunks = [];
                for (let i = 0; i < fullB64.length; i += CHUNK_SIZE) {
                    chunks.push(fullB64.substring(i, i + CHUNK_SIZE));
                }

                resolve({ id, thumbnail: thumbB64, chunks });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

export async function uploadChunksInBackground(photosArray) {
    if (!navigator.onLine) return;
    for (const photo of photosArray) {
        if (typeof photo === 'object' && photo.chunks && photo.chunks.length > 0) {
            for (let i = 0; i < photo.chunks.length; i++) {
                const chunkId = `${photo.id}_${i}`;
                setDoc(doc(chunksRef, chunkId), {
                    imageId: photo.id,
                    chunkIndex: i,
                    totalChunks: photo.chunks.length,
                    data: photo.chunks[i]
                }).catch(e => console.error("Error sync chunk", e));
            }
            delete photo.chunks;
        }
    }
}
