// profile.js - Sistema de Perfiles, Avatares y Vinculación Multi-dispositivo
import { AVATAR_PRESETS } from "./config.js";
import { state } from "./state.js";
import { showNotification, getLocalDateString, markAsSynced, updateSyncStatusUI } from "./utils.js";
import { perfilesRef, auditoriaRef, asignacionesRef, rechazosRef, addDoc, doc, setDoc, query, where, getDocs } from "./firebase.js";
import { updateDashboard, renderBitacora } from "./dashboard.js";

let selectedPresetId = 'av-1';
let customAvatarDataUrl = '';

export function getProfileAvatarHtml(profile, sizeClass = 'w-9 h-9', textSize = 'text-sm') {
    if (!profile) {
        return `<div class="${sizeClass} rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold ${textSize} border border-slate-300 shadow-sm"><i class="fas fa-user"></i></div>`;
    }

    if (profile.avatarType === 'custom' && profile.avatarValue) {
        return `<img src="${profile.avatarValue}" class="${sizeClass} rounded-full object-cover border-2 border-white shadow-sm">`;
    }

    const preset = AVATAR_PRESETS.find(p => p.id === (profile.avatarValue || profile.avatarPresetId)) || AVATAR_PRESETS[0];
    return `<div class="${sizeClass} rounded-full ${preset.bg} ${preset.color} flex items-center justify-center font-bold ${textSize} border-2 border-white shadow-sm"><i class="fas ${preset.icon}"></i></div>`;
}

export function updateHeaderAvatars() {
    const lobbyAvatarEl = document.getElementById('lobby-profile-avatar-slot');
    const headerAvatarEl = document.getElementById('header-profile-avatar-slot');
    const inspectorNameEl = document.getElementById('current-inspector-display');

    const html = getProfileAvatarHtml(state.currentProfile, 'w-10 h-10', 'text-base');
    const smallHtml = getProfileAvatarHtml(state.currentProfile, 'w-8 h-8', 'text-xs');

    if (lobbyAvatarEl) lobbyAvatarEl.innerHTML = html;
    if (headerAvatarEl) headerAvatarEl.innerHTML = smallHtml;

    if (state.currentProfile && !state.inspectorName) {
        if (inspectorNameEl) inspectorNameEl.textContent = `${state.currentProfile.name}`;
    }
}

export function renderPresetSelector() {
    const container = document.getElementById('avatar-presets-grid');
    if (!container) return;

    container.innerHTML = AVATAR_PRESETS.map(p => {
        const isSelected = selectedPresetId === p.id && !customAvatarDataUrl;
        return `
            <button type="button" onclick="selectPresetAvatar('${p.id}')" class="p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition active:scale-95 border-2 ${isSelected ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-400' : 'border-gray-200 bg-white hover:bg-gray-50'}">
                <div class="w-10 h-10 rounded-full ${p.bg} ${p.color} flex items-center justify-center text-lg shadow-sm">
                    <i class="fas ${p.icon}"></i>
                </div>
                <span class="text-[9px] font-bold text-gray-700 truncate max-w-[65px]">${p.label}</span>
            </button>
        `;
    }).join('');
}

export function selectPresetAvatar(presetId) {
    selectedPresetId = presetId;
    customAvatarDataUrl = '';
    renderPresetSelector();
    const previewEl = document.getElementById('profile-avatar-live-preview');
    if (previewEl) {
        const preset = AVATAR_PRESETS.find(p => p.id === presetId) || AVATAR_PRESETS[0];
        previewEl.innerHTML = `<div class="w-20 h-20 rounded-full ${preset.bg} ${preset.color} flex items-center justify-center text-3xl shadow-inner border-2 border-white"><i class="fas ${preset.icon}"></i></div>`;
    }
}

export function handleCustomAvatarPhoto(e) {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (re) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = 160;
            canvas.width = size;
            canvas.height = size;
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
            customAvatarDataUrl = canvas.toDataURL('image/jpeg', 0.85);

            const previewEl = document.getElementById('profile-avatar-live-preview');
            if (previewEl) {
                previewEl.innerHTML = `<img src="${customAvatarDataUrl}" class="w-20 h-20 rounded-full object-cover border-4 border-indigo-500 shadow-md">`;
            }
            renderPresetSelector();
        };
        img.src = re.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

export function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;

    cancelLinkProfileView();

    const nameInput = document.getElementById('profile-name-input');
    const passInput = document.getElementById('profile-password-input');

    if (state.currentProfile) {
        if (nameInput) nameInput.value = state.currentProfile.name || '';
        if (passInput) passInput.value = state.currentProfile.password || '';
        if (state.currentProfile.avatarType === 'custom' && state.currentProfile.avatarValue) {
            customAvatarDataUrl = state.currentProfile.avatarValue;
            const previewEl = document.getElementById('profile-avatar-live-preview');
            if (previewEl) previewEl.innerHTML = `<img src="${customAvatarDataUrl}" class="w-20 h-20 rounded-full object-cover border-4 border-indigo-500 shadow-md">`;
        } else {
            selectPresetAvatar(state.currentProfile.avatarValue || 'av-1');
        }
    } else {
        const defaultName = localStorage.getItem('delta_auto_last_name') || '';
        if (nameInput) nameInput.value = defaultName;
        if (passInput) passInput.value = '';
        selectPresetAvatar('av-1');
    }

    renderPresetSelector();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

export function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

export async function saveProfile() {
    const name = document.getElementById('profile-name-input').value.trim();
    const password = document.getElementById('profile-password-input').value.trim();

    if (!name) return showNotification("Por favor ingresa tu nombre.");
    if (!password || password.length < 4) return showNotification("Define una contraseña de al menos 4 caracteres para proteger tu perfil.");

    try {
        state.syncState = 'syncing';
        updateSyncStatusUI();

        const profileId = state.currentProfile?.id || ('prof_' + state.deviceUuid);
        const avatarType = customAvatarDataUrl ? 'custom' : 'preset';
        const avatarValue = customAvatarDataUrl || selectedPresetId;

        const profileData = {
            id: profileId,
            name: name,
            password: password,
            avatarType: avatarType,
            avatarValue: avatarValue,
            deviceUuids: Array.from(new Set([...(state.currentProfile?.deviceUuids || []), state.deviceUuid])),
            updatedAt: Date.now()
        };

        await setDoc(doc(perfilesRef, profileId), profileData, { merge: true });

        state.currentProfile = profileData;
        state.inspectorName = name;
        localStorage.setItem('delta_active_profile_id', profileId);
        localStorage.setItem('delta_auto_last_name', name);

        updateHeaderAvatars();
        markAsSynced();
        closeProfileModal();
        showNotification("¡Perfil guardado y configurado exitosamente!");
    } catch(e) {
        console.error(e);
        showNotification("Error al guardar perfil.");
    }
}

// --- VINCULACIÓN EN OTRO CELULAR ---
export function openLinkProfileView() {
    document.getElementById('profile-main-view').classList.add('hidden');
    document.getElementById('profile-link-view').classList.remove('hidden');
    document.getElementById('profile-link-view').classList.add('flex');

    const selectEl = document.getElementById('select-existing-profile');
    if (selectEl) {
        selectEl.innerHTML = '<option value="">-- Selecciona tu nombre --</option>' + 
            state.allProfiles.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }
    document.getElementById('input-link-password').value = '';
}

export function cancelLinkProfileView() {
    const lv = document.getElementById('profile-link-view');
    if (lv) { lv.classList.add('hidden'); lv.classList.remove('flex'); }
    const mv = document.getElementById('profile-main-view');
    if (mv) { mv.classList.remove('hidden'); mv.classList.add('flex'); }
}

export async function confirmLinkProfile() {
    const profileId = document.getElementById('select-existing-profile').value;
    const pass = document.getElementById('input-link-password').value.trim();

    if (!profileId) return showNotification("Selecciona el perfil a vincular.");
    const targetProfile = state.allProfiles.find(p => p.id === profileId);
    if (!targetProfile) return showNotification("Perfil no encontrado.");

    if (targetProfile.password && targetProfile.password !== pass) {
        return showNotification("Contraseña incorrecta para este perfil.");
    }

    try {
        state.syncState = 'syncing';
        updateSyncStatusUI();

        const updatedDevices = Array.from(new Set([...(targetProfile.deviceUuids || []), state.deviceUuid]));
        await setDoc(doc(perfilesRef, profileId), { deviceUuids: updatedDevices, lastLinkedAt: Date.now() }, { merge: true });

        state.currentProfile = { ...targetProfile, deviceUuids: updatedDevices };
        state.inspectorName = targetProfile.name;
        localStorage.setItem('delta_active_profile_id', profileId);
        localStorage.setItem('delta_auto_last_name', targetProfile.name);

        updateHeaderAvatars();
        markAsSynced();
        closeProfileModal();
        showNotification(`¡Vinculado con éxito como ${targetProfile.name}!`);
    } catch(e) {
        console.error(e);
        showNotification("Error al vincular el perfil.");
    }
}

// --- ASIGNACIÓN DE 1 CLIC DEL INSPECTOR DEL DÍA CON AUDITORÍA ---
export async function assignProfileAsDailyInspector() {
    if (!state.currentProfile) {
        openProfileModal();
        return showNotification("Configura tu perfil primero.");
    }

    if (!state.currentPiece) return;

    const todayStr = getLocalDateString();
    const docId = `${todayStr}_${state.currentPiece}`;
    const previousInspector = state.dailyInspectors[docId] || 'Sin asignar';
    const newName = state.currentProfile.name;

    try {
        state.syncState = 'syncing';
        updateSyncStatusUI();

        // 1. Asignar en asignaciones_delta_auto
        await setDoc(doc(asignacionesRef, docId), {
            inspectorName: newName,
            profileId: state.currentProfile.id,
            timestamp: Date.now()
        });

        state.inspectorName = newName;
        state.dailyInspectors[docId] = newName;

        // 2. Cascada: Actualizar todos los reportes de hoy de esta pieza en rechazos_delta
        const q = query(rechazosRef, where("dateString", "==", todayStr), where("pieceType", "==", state.currentPiece));
        const snap = await getDocs(q);
        const updates = [];
        snap.forEach(d => {
            updates.push(setDoc(doc(rechazosRef, d.id), { inspectorName: newName }, { merge: true }));
        });
        await Promise.all(updates);

        // 3. Registrar en Bitácora de Auditoría
        await addDoc(auditoriaRef, {
            type: "ASIGNACION_INSPECTOR",
            timestamp: Date.now(),
            dateString: todayStr,
            pieceType: state.currentPiece,
            previousInspector: previousInspector,
            newInspector: newName,
            profileId: state.currentProfile.id,
            deviceUuid: state.deviceUuid
        });

        markAsSynced();
        updateDashboard();
        renderBitacora();
        const modal = document.getElementById('inspector-name-modal');
        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }

        showNotification(`¡Asignado! Todos los rechazos de hoy en ${state.currentPiece} están ahora vinculados a ti.`);
    } catch(e) {
        console.error(e);
        showNotification("Error al asignar inspector.");
    }
}
