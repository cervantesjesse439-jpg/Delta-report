// firebase.js - Automotriz
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
import { firebaseConfig, COL_RECORDS, COL_ADMINS, COL_ASIGNACIONES, COL_TRASH, DOC_CONFIG, COL_PERFILES, COL_AUDITORIA } from "./config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

const rechazosRef = collection(db, COL_RECORDS);
const adminsRef = collection(db, COL_ADMINS);
const asignacionesRef = collection(db, COL_ASIGNACIONES);
const trashRef = collection(db, COL_TRASH);
const chunksRef = collection(db, 'delta_image_chunks');
const adminConfigDocRef = doc(db, 'delta_config', DOC_CONFIG);
const perfilesRef = collection(db, COL_PERFILES);
const auditoriaRef = collection(db, COL_AUDITORIA);

export {
    app,
    auth,
    db,
    signInAnonymously,
    rechazosRef,
    adminsRef,
    asignacionesRef,
    trashRef,
    chunksRef,
    adminConfigDocRef,
    perfilesRef,
    auditoriaRef,
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
