// js/modules/approvals.js
import { CORRECT_PIN } from "./config.js";
import { state } from "./state.js";
import { showNotification, markAsSynced, updateSyncStatusUI } from "./utils.js";
import { db, deleteDoc, doc } from "./firebase.js";

export function syncApprovalModalState() {
    const btnPendingLobby = document.getElementById('btn-pending-approvals-lobby');
    const countPendingLobby = document.getElementById('lobby-pending-count');

    if (state.isAdmin && state.pendingApprovalsList.length > 0) {
        if (btnPendingLobby) { 
            btnPendingLobby.classList.remove('hidden'); 
            btnPendingLobby.classList.add('flex'); 
        }
        if (countPendingLobby) {
            countPendingLobby.textContent = state.pendingApprovalsList.length;
        }
    } else {
        if (btnPendingLobby) { 
            btnPendingLobby.classList.add('hidden'); 
            btnPendingLobby.classList.remove('flex'); 
        }
    }

    const modal = document.getElementById('admin-approval-modal');
    if (!state.isAdmin) {
        modal.classList.add('hidden'); 
        modal.classList.remove('flex');
        state.activeApprovalDocId = null; 
        return;
    }

    if (state.activeApprovalDocId) {
        const stillPending = state.pendingApprovalsList.find(p => p.id === state.activeApprovalDocId);
        if (!stillPending) {
            const nextUnskipped = state.pendingApprovalsList.find(p => !state.skippedApprovalDocIds.has(p.id));
            if (nextUnskipped) {
                showApprovalAdminModal(nextUnskipped.id, nextUnskipped);
            } else { 
                modal.classList.add('hidden'); 
                modal.classList.remove('flex'); 
                state.activeApprovalDocId = null; 
                state.activeApprovalItems = []; 
            }
            return;
        }
    } else {
        const nextUnskipped = state.pendingApprovalsList.find(p => !state.skippedApprovalDocIds.has(p.id));
        if (nextUnskipped) {
            showApprovalAdminModal(nextUnskipped.id, nextUnskipped);
        }
    }
}

export function showApprovalAdminModal(docId, data) {
    state.activeApprovalDocId = docId; 
    state.activeApprovalItems = data.items || [];
    document.getElementById('approval-list-view').classList.remove('hidden'); 
    document.getElementById('approval-list-view').classList.add('flex');
    document.getElementById('approval-pin-view').classList.add('hidden'); 
    document.getElementById('approval-pin-view').classList.remove('flex');
    document.getElementById('approval-pin-input').value = '';

    const container = document.getElementById('approval-items-container');
    container.innerHTML = state.activeApprovalItems.map((item, idx) => `
        <label class="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition">
            <input type="checkbox" checked data-idx="${idx}" class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500">
            <div class="flex-1">
                <span class="block font-bold text-gray-900 text-sm">[${item.pieceType}] ${item.type} - ${item.damage}</span>
                <span class="text-xs text-gray-500">Lado: ${item.side} | Cantidad: ${item.quantity}</span>
            </div>
        </label>
    `).join('');
    document.getElementById('admin-approval-modal').classList.remove('hidden'); 
    document.getElementById('admin-approval-modal').classList.add('flex');
}

export function skipCurrentApprovalModal() {
    if (state.activeApprovalDocId) state.skippedApprovalDocIds.add(state.activeApprovalDocId);
    state.activeApprovalDocId = null; 
    state.activeApprovalItems = [];
    document.getElementById('admin-approval-modal').classList.add('hidden'); 
    document.getElementById('admin-approval-modal').classList.remove('flex');
    syncApprovalModalState();
}

export function openPendingApprovalsManually() {
    if (state.pendingApprovalsList.length === 0) return showNotification("No hay solicitudes pendientes.");
    state.skippedApprovalDocIds.clear();
    const first = state.pendingApprovalsList[0];
    showApprovalAdminModal(first.id, first);
}

export async function rejectApprovalRequest() {
    if (!state.activeApprovalDocId) return;
    const targetId = state.activeApprovalDocId;
    try {
        state.syncState = 'syncing'; 
        updateSyncStatusUI();
        await deleteDoc(doc(db, 'delta_approvals', targetId));
        markAsSynced(); 
        showNotification("Solicitud de borrado rechazada.");
    } catch(e) { 
        console.error(e); 
    }
}

export function showApprovalPinView() {
    const checkboxes = document.querySelectorAll('#approval-items-container input[type="checkbox"]:checked');
    if (checkboxes.length === 0) return showNotification("Selecciona al menos un registro para borrar.");
    document.getElementById('approval-list-view').classList.add('hidden'); 
    document.getElementById('approval-list-view').classList.remove('flex');
    document.getElementById('approval-pin-view').classList.remove('hidden'); 
    document.getElementById('approval-pin-view').classList.add('flex');
}

export function cancelApprovalPinView() {
    document.getElementById('approval-pin-view').classList.add('hidden'); 
    document.getElementById('approval-pin-view').classList.remove('flex');
    document.getElementById('approval-list-view').classList.remove('hidden'); 
    document.getElementById('approval-list-view').classList.add('flex');
    document.getElementById('approval-pin-input').value = '';
}

export async function executeApprovedDeletion() {
    const pinVal = document.getElementById('approval-pin-input').value.trim();
    if (pinVal !== CORRECT_PIN) return showNotification("PIN incorrecto.");
    if (!state.activeApprovalDocId) return;

    const targetApprovalId = state.activeApprovalDocId;
    const stillExists = state.pendingApprovalsList.some(p => p.id === targetApprovalId);
    if (!stillExists) { 
        showNotification("Esta solicitud ya fue procesada por otro administrador."); 
        syncApprovalModalState(); 
        return; 
    }

    const checkboxes = document.querySelectorAll('#approval-items-container input[type="checkbox"]');
    const idsToDelete = [];
    checkboxes.forEach(cb => {
        if (cb.checked) {
            const idx = parseInt(cb.getAttribute('data-idx'));
            if (state.activeApprovalItems[idx]) idsToDelete.push(state.activeApprovalItems[idx].id);
        }
    });

    try {
        state.syncState = 'syncing'; 
        updateSyncStatusUI();
        await deleteDoc(doc(db, 'delta_approvals', targetApprovalId));
        for (const id of idsToDelete) {
            await deleteDoc(doc(db, 'rechazos_delta', id));
        }
        markAsSynced();
        showNotification(`¡Se aprobaron y borraron ${idsToDelete.length} registros!`);
    } catch(e) { 
        console.error(e); 
        showNotification("Error al ejecutar el borrado autorizado."); 
    }
}
