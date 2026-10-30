// js/modules/admin.js
import { CORRECT_PIN } from "./config.js";
import { state } from "./state.js";
import { showNotification, markAsSynced, updateSyncStatusUI } from "./utils.js";
import { db, setDoc, deleteDoc, doc, adminConfigDocRef } from "./firebase.js";
import { syncApprovalModalState } from "./approvals.js";

export function checkFirstTimeAdmin() {
    const hasPrompted = localStorage.getItem('delta_prompted_admin');
    if (!hasPrompted && !state.isAdmin) {
        document.getElementById('admin-onboarding-modal').classList.remove('hidden');
        document.getElementById('admin-onboarding-modal').classList.add('flex');
    }
}

export function updateAdminUI() {
    const btnOqc = document.getElementById('btn-oqc-trends-lobby');
    const lblBtnAdmin = document.getElementById('lbl-btn-admin');
    if (state.isAdmin) {
        btnOqc.classList.remove('hidden'); 
        btnOqc.classList.add('flex');
    } else {
        btnOqc.classList.add('hidden'); 
        btnOqc.classList.remove('flex');
    }
    if (lblBtnAdmin) {
        lblBtnAdmin.textContent = `Admin (${state.allAdmins.length}/${state.maxAdminSlots})`;
    }
    syncApprovalModalState();
}

export function renderAdminModalContent() {
    const countEl = document.getElementById('admin-slots-count');
    const listEl = document.getElementById('admin-slots-list');
    const regSec = document.getElementById('admin-register-section');
    const fullMsg = document.getElementById('admin-full-msg');

    if (countEl) countEl.textContent = `${state.allAdmins.length} / ${state.maxAdminSlots}`;

    if (listEl) {
        let html = '';
        const totalToRender = Math.max(state.maxAdminSlots, state.allAdmins.length);
        for (let i = 0; i < totalToRender; i++) {
            const adm = state.allAdmins[i];
            if (adm) {
                const isMe = adm.id === state.deviceUuid;
                html += `
                    <div class="flex items-center justify-between p-3 rounded-2xl border ${isMe ? 'bg-indigo-50/90 border-indigo-300' : 'bg-gray-50 border-gray-200'} shadow-sm">
                        <div class="flex items-center gap-2.5 overflow-hidden">
                            <div class="w-9 h-9 rounded-full ${isMe ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'} flex items-center justify-center font-bold text-sm flex-shrink-0">
                                <i class="fas fa-user-shield"></i>
                            </div>
                            <div class="truncate">
                                <div class="flex items-center gap-1.5">
                                    <span class="font-bold text-sm text-gray-900 truncate">${adm.name || 'Admin'}</span>
                                    ${isMe ? '<span class="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Tú</span>' : ''}
                                </div>
                                <span class="text-[10px] text-gray-400 font-medium block">ID: ${adm.id.substring(0, 8)}</span>
                            </div>
                        </div>
                        <button onclick="promptRemoveAdmin('${adm.id}', '${(adm.name || 'Admin').replace(/'/g, "\\'")}', ${isMe})" class="px-2.5 py-1.5 rounded-xl text-xs font-bold ${isMe ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-200 text-gray-700 hover:bg-red-100 hover:text-red-600'} transition active:scale-95 flex items-center gap-1 flex-shrink-0">
                            <i class="fas ${isMe ? 'fa-sign-out-alt' : 'fa-trash'}"></i> ${isMe ? 'Salir' : ''}
                        </button>
                    </div>
                `;
            } else {
                html += `
                    <div class="flex items-center justify-between p-3 rounded-2xl border border-dashed border-gray-300 bg-white/40 text-gray-400">
                        <div class="flex items-center gap-2.5">
                            <div class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                                <i class="fas fa-plus"></i>
                            </div>
                            <span class="text-xs font-bold">Espacio Disponible #${i + 1}</span>
                        </div>
                        <span class="text-[10px] font-semibold uppercase tracking-wider">Libre</span>
                    </div>
                `;
            }
        }
        listEl.innerHTML = html;
    }

    if (regSec && fullMsg) {
        if (state.isAdmin) {
            regSec.classList.add('hidden'); 
            fullMsg.classList.add('hidden');
        } else {
            if (state.allAdmins.length >= state.maxAdminSlots) {
                regSec.classList.add('hidden'); 
                fullMsg.classList.remove('hidden');
            } else {
                regSec.classList.remove('hidden'); 
                fullMsg.classList.add('hidden');
            }
        }
    }
}

export function skipAdminOnboarding() {
    localStorage.setItem('delta_prompted_admin', 'true');
    document.getElementById('admin-onboarding-modal').classList.add('hidden');
    document.getElementById('admin-onboarding-modal').classList.remove('flex');
}

export function startAdminRegistration() {
    localStorage.setItem('delta_prompted_admin', 'true');
    document.getElementById('admin-onboarding-modal').classList.add('hidden');
    document.getElementById('admin-onboarding-modal').classList.remove('flex');
    
    cancelRemoveAdmin(); 
    cancelChangeAdminSlots();
    document.getElementById('admin-name-input').value = state.adminSavedName || localStorage.getItem('delta_last_name') || '';
    document.getElementById('pin-input').value = '';
    renderAdminModalContent();

    document.getElementById('pin-modal').classList.remove('hidden');
    document.getElementById('pin-modal').classList.add('flex');
}

export function closePinModal() {
    document.getElementById('pin-modal').classList.add('hidden');
    document.getElementById('pin-modal').classList.remove('flex');
}

export function promptChangeAdminSlots(delta) {
    const newTotal = state.maxAdminSlots + delta;
    if (newTotal < 1) return showNotification("Debe existir al menos 1 espacio de administrador.");
    if (newTotal < state.allAdmins.length) return showNotification(`No puedes reducir a ${newTotal} porque ya hay ${state.allAdmins.length} administradores activos. Elimina uno primero.`);

    state.pendingSlotChangeDelta = delta;
    document.getElementById('admin-main-view').classList.add('hidden'); 
    document.getElementById('admin-main-view').classList.remove('flex');
    document.getElementById('admin-delete-confirm-view').classList.add('hidden'); 
    document.getElementById('admin-delete-confirm-view').classList.remove('flex');

    const actionText = delta > 0 ? "Aumentar" : "Reducir";
    document.getElementById('admin-slots-title').textContent = `${actionText} Espacios`;
    document.getElementById('admin-slots-target-desc').textContent = `Ingresa el PIN para cambiar la capacidad máxima de ${state.maxAdminSlots} a ${newTotal} espacios.`;
    document.getElementById('admin-slots-pin-input').value = '';

    document.getElementById('admin-slots-confirm-view').classList.remove('hidden'); 
    document.getElementById('admin-slots-confirm-view').classList.add('flex');
}

export function cancelChangeAdminSlots() {
    state.pendingSlotChangeDelta = 0;
    document.getElementById('admin-slots-confirm-view').classList.add('hidden'); 
    document.getElementById('admin-slots-confirm-view').classList.remove('flex');
    document.getElementById('admin-main-view').classList.remove('hidden'); 
    document.getElementById('admin-main-view').classList.add('flex');
}

export async function confirmChangeAdminSlots() {
    const pinVal = document.getElementById('admin-slots-pin-input').value.trim();
    if (pinVal !== CORRECT_PIN) return showNotification("PIN incorrecto.");
    if (!state.pendingSlotChangeDelta) return;

    const newMax = state.maxAdminSlots + state.pendingSlotChangeDelta;
    if (newMax < 1 || newMax < state.allAdmins.length) {
        cancelChangeAdminSlots(); 
        return showNotification("Operación no válida.");
    }

    try {
        state.syncState = 'syncing'; 
        updateSyncStatusUI();
        await setDoc(adminConfigDocRef, { maxSlots: newMax, updatedAt: Date.now() }, { merge: true });
        state.maxAdminSlots = newMax;
        markAsSynced();
        showNotification(`Capacidad actualizada a ${newMax} espacios.`);
        cancelChangeAdminSlots(); 
        updateAdminUI(); 
        renderAdminModalContent();
    } catch (e) {
        console.error(e); 
        showNotification("Error al actualizar los espacios.");
    }
}

export function promptRemoveAdmin(targetUuid, targetName, isSelf) {
    state.targetAdminToRemove = targetUuid;
    document.getElementById('admin-main-view').classList.add('hidden'); 
    document.getElementById('admin-main-view').classList.remove('flex');
    document.getElementById('admin-slots-confirm-view').classList.add('hidden'); 
    document.getElementById('admin-slots-confirm-view').classList.remove('flex');
    
    const desc = isSelf 
        ? `Ingresa el PIN para darte de baja como administrador (${targetName}) y liberar tu espacio.`
        : `Ingresa el PIN para eliminar el dispositivo de "${targetName}" y liberar su espacio.`;
    document.getElementById('admin-delete-target-desc').textContent = desc;
    document.getElementById('admin-delete-pin-input').value = '';

    document.getElementById('admin-delete-confirm-view').classList.remove('hidden'); 
    document.getElementById('admin-delete-confirm-view').classList.add('flex');
}

export function cancelRemoveAdmin() {
    state.targetAdminToRemove = null;
    document.getElementById('admin-delete-confirm-view').classList.add('hidden'); 
    document.getElementById('admin-delete-confirm-view').classList.remove('flex');
    document.getElementById('admin-main-view').classList.remove('hidden'); 
    document.getElementById('admin-main-view').classList.add('flex');
}

export async function confirmRemoveAdmin() {
    const pinVal = document.getElementById('admin-delete-pin-input').value.trim();
    if (pinVal !== CORRECT_PIN) return showNotification("PIN incorrecto.");
    if (!state.targetAdminToRemove) return;

    try {
        state.syncState = 'syncing'; 
        updateSyncStatusUI();
        await deleteDoc(doc(db, 'delta_admins', state.targetAdminToRemove));
        markAsSynced();
        if (state.targetAdminToRemove === state.deviceUuid) {
            state.isAdmin = false;
            localStorage.setItem('delta_is_admin', 'false');
            showNotification("Te has dado de baja como Administrador.");
        } else { 
            showNotification("Dispositivo administrador eliminado."); 
        }
        cancelRemoveAdmin();
    } catch(e) { 
        console.error(e); 
        showNotification("Error al eliminar administrador."); 
    }
}

export async function verifyAndRegisterAdmin() {
    const adminName = document.getElementById('admin-name-input').value.trim();
    const pinVal = document.getElementById('pin-input').value.trim();
    
    if (!adminName) return showNotification("Ingresa el nombre del administrador.");
    if (pinVal !== CORRECT_PIN) return showNotification("PIN incorrecto.");

    try {
        const alreadyRegistered = state.allAdmins.some(a => a.id === state.deviceUuid);
        if (!alreadyRegistered && state.allAdmins.length >= state.maxAdminSlots) {
            return showNotification(`Límite de ${state.maxAdminSlots} administradores alcanzado.`);
        }

        state.syncState = 'syncing'; 
        updateSyncStatusUI();
        const adminDocRef = doc(db, 'delta_admins', state.deviceUuid);
        await setDoc(adminDocRef, { name: adminName, registeredAt: Date.now(), uuid: state.deviceUuid });
        markAsSynced();
        
        state.isAdmin = true;
        state.adminSavedName = adminName;
        localStorage.setItem('delta_is_admin', 'true');
        localStorage.setItem('delta_admin_name', adminName);
        localStorage.setItem('delta_last_name', adminName);
        
        document.getElementById('pin-input').value = '';
        showNotification(`¡Bienvenido, ${adminName}! Este dispositivo ahora es Administrador.`);
    } catch(e) { 
        console.error(e); 
        showNotification("Error al registrar administrador."); 
    }
}
