// js/services/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager, 
    collection, 
    addDoc, 
    onSnapshot, 
    deleteDoc, 
    doc, 
    setDoc, 
    getDocFromServer, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

const rechazosRef = collection(db, 'rechazos_delta');
const approvalsRef = collection(db, 'delta_approvals');
const adminsRef = collection(db, 'delta_admins');
const chunksRef = collection(db, 'delta_image_chunks');
const adminConfigDocRef = doc(db, 'delta_config', 'admin_settings');

export {
    app,
    auth,
    db,
    signInAnonymously,
    rechazosRef,
    approvalsRef,
    adminsRef,
    chunksRef,
    adminConfigDocRef,
    collection,
    addDoc,
    onSnapshot,
    deleteDoc,
    doc,
    setDoc,
    getDocFromServer,
    query,
    where,
    getDocs
};
