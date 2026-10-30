// js/utils.js
import { state } from "./state.js";
import { adminConfigDocRef, getDocFromServer } from "./firebase.js";

export function showNotification(msg) {
    const alert = document.getElementById('top-alert');
    if (!alert) return;
    document.getElementById('top-alert-msg').textContent = msg;
    alert.style.transform = 'translateY(0)';
    setTimeout(() => alert.style.transform = 'translateY(-100%)', 3000);
}

export function formatTimeShort(ts) {
    return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export const getLocalDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const formatDateToDisplay = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString + 'T12:00:00').toLocaleDateString('es-MX', options).replace(/^\w/, c => c.toUpperCase());
};

export function markAsSynced() {
    state.syncState = 'synced';
    state.lastSyncTimestamp = Date.now();
    updateSyncStatusUI();
    
    const headerEl = document.getElementById('cloud-status');
    if (headerEl && state.currentPiece) {
        headerEl.classList.add('sync-flash');
        setTimeout(() => headerEl.classList.remove('sync-flash'), 1000);
    }
}

export function updateSyncStatusUI() {
    const headerEl = document.getElementById('cloud-status');
    const lobbyEl = document.getElementById('lobby-cloud-status');
    if (!headerEl || !lobbyEl) return;

    if (!navigator.onLine || state.syncState === 'offline') {
        headerEl.innerHTML = `<i class="fas fa-wifi-slash text-amber-300"></i> <span>Sin señal</span>`;
        lobbyEl.innerHTML = `<i class="fas fa-exclamation-circle text-amber-600"></i> Sin señal (Guardado local activo)`;
        return;
    }

    if (state.syncState === 'connecting' || state.syncState === 'syncing') {
        headerEl.innerHTML = `<i class="fas fa-sync fa-spin text-blue-200"></i> <span>Actualizando...</span>`;
        lobbyEl.innerHTML = `<i class="fas fa-sync fa-spin text-blue-600"></i> Actualizando datos...`;
    } else {
        const timeStr = formatTimeShort(state.lastSyncTimestamp);
        headerEl.innerHTML = `<i class="fas fa-check-circle text-emerald-400"></i> <span>Sincronizado: ${timeStr}</span>`;
        lobbyEl.innerHTML = `<i class="fas fa-check-circle text-emerald-500"></i> Actualizado automáticamente: ${timeStr}`;
    }
}

export async function manualSyncPulse() {
    if (!navigator.onLine) {
        state.syncState = 'offline'; 
        updateSyncStatusUI();
        return showNotification("Sin señal de internet. Tus registros se guardan en el dispositivo.");
    }
    state.syncState = 'syncing'; 
    updateSyncStatusUI();
    try {
        if (adminConfigDocRef) await getDocFromServer(adminConfigDocRef);
        markAsSynced();
    } catch (e) { 
        markAsSynced(); 
    }
}
