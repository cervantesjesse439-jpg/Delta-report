// trash.js - Automotriz (Papelera / Bitácora de Cambios y Restauración)
import { state } from "./state.js";
import { showNotification, markAsSynced, updateSyncStatusUI, getLocalDateString } from "./utils.js";
import { trashRef, rechazosRef, addDoc, deleteDoc, doc } from "./firebase.js";

export function syncTrashUI() {
    const btnLobbyTrash = document.getElementById('btn-trash-lobby');
    const badgeCount = document.getElementById('lobby-trash-count');

    if (btnLobbyTrash && badgeCount) {
        if (state.trashList.length > 0) {
            btnLobbyTrash.classList.remove('hidden');
            btnLobbyTrash.classList.add('flex');
            badgeCount.textContent = state.trashList.length;
        } else {
            btnLobbyTrash.classList.add('hidden');
            btnLobbyTrash.classList.remove('flex');
        }
    }
}

export function openTrashModal() {
    if (state.trashList.length === 0) {
        return showNotification("No hay registros en la papelera de eliminaciones.");
    }
    renderTrashItems();
    document.getElementById('trash-modal').classList.remove('hidden');
    document.getElementById('trash-modal').classList.add('flex');
    cancelTrashPinView();
}

export function closeTrashModal() {
    document.getElementById('trash-modal').classList.add('hidden');
    document.getElementById('trash-modal').classList.remove('flex');
    state.activeTrashDocId = null;
}

export function renderTrashItems() {
    const container = document.getElementById('trash-items-container');
    if (!container) return;

    if (state.trashList.length === 0) {
        container.innerHTML = '<div class="text-center py-6 text-gray-500 font-bold text-sm">La papelera está vacía.</div>';
        return;
    }

    container.innerHTML = state.trashList.map((entry) => {
        const dateStr = new Date(entry.deletedAt || Date.now()).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        const items = entry.items || [];
        const itemsSummary = items.map(i => `• [${i.pieceType || entry.pieceType || 'UPR'}] ${i.type || 'Pieza'} (${i.damage}) x${i.quantity || 1}`).join('<br>');
        
        return `
            <div class="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col gap-2 shadow-sm">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-xs font-black text-red-600 block"><i class="fas fa-trash-alt mr-1"></i> Eliminado a las ${dateStr}</span>
                        <span class="text-[10px] text-gray-500 font-bold">Por: ${entry.inspectorAtDeletion || 'Inspector'} (${items.length} registro/s)</span>
                    </div>
                    <button onclick="promptRestoreBatch('${entry.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition active:scale-95 shadow flex items-center gap-1.5">
                        <i class="fas fa-undo"></i> Restaurar
                    </button>
                </div>
                <div class="text-xs text-gray-700 font-medium bg-white/80 p-2.5 rounded-xl border border-gray-200/80 leading-relaxed">
                    ${itemsSummary}
                </div>
            </div>
        `;
    }).join('');
}

export function promptRestoreBatch(docId) {
    state.activeTrashDocId = docId;
    document.getElementById('trash-list-view').classList.add('hidden');
    document.getElementById('trash-list-view').classList.remove('flex');
    document.getElementById('trash-pin-view').classList.remove('hidden');
    document.getElementById('trash-pin-view').classList.add('flex');
    document.getElementById('trash-pin-input').value = '';
}

export function cancelTrashPinView() {
    state.activeTrashDocId = null;
    const tv = document.getElementById('trash-pin-view');
    if (tv) { tv.classList.add('hidden'); tv.classList.remove('flex'); }
    const lv = document.getElementById('trash-list-view');
    if (lv) { lv.classList.remove('hidden'); lv.classList.add('flex'); }
}

export async function executeRestoreWithPin() {
    const pin = document.getElementById('trash-pin-input').value.trim();
    if (pin !== state.currentPin) return showNotification("PIN de administrador incorrecto.");
    if (!state.activeTrashDocId) return;

    const targetDocId = state.activeTrashDocId;
    const entry = state.trashList.find(t => t.id === targetDocId);
    if (!entry) {
        cancelTrashPinView();
        return showNotification("El registro ya no existe.");
    }

    try {
        state.syncState = 'syncing';
        updateSyncStatusUI();

        // Restaurar cada elemento en rechazos_delta
        const items = entry.items || [];
        for (const item of items) {
            const restoredItem = { ...item };
            delete restoredItem.id;
            delete restoredItem.originalId;
            restoredItem.timestamp = Date.now();
            restoredItem.dateString = restoredItem.dateString || getLocalDateString();
            await addDoc(rechazosRef, restoredItem);
        }

        // Eliminar de la papelera
        await deleteDoc(doc(trashRef, targetDocId));
        markAsSynced();
        showNotification(`¡Se restauraron ${items.length} registro(s) con éxito!`);
        cancelTrashPinView();
        if (state.trashList.length <= 1) closeTrashModal();
    } catch(e) {
        console.error(e);
        showNotification("Error al restaurar los registros.");
    }
}
