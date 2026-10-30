
import { 
    openPhotoEditor, 
    closePhotoEditor, 
    setBrushSize, 
    undoLastStroke, 
    clearAllStrokes, 
    savePhotoAnnotations 
} from "./photo-editor.js";
// app.js - Automotriz
import { state } from "./state.js";
import { formatDateToDisplay, getLocalDateString, updateSyncStatusUI, markAsSynced, manualSyncPulse, showNotification } from "./utils.js";
import { auth, signInAnonymously, onSnapshot, rechazosRef, trashRef, adminsRef, adminConfigDocRef, perfilesRef } from "./firebase.js";
import { initLocalDB } from "./indexeddb.js";

// Modulos
import { 
    checkFirstTimeAdmin, 
    updateAdminUI, 
    renderAdminModalContent, 
    skipAdminOnboarding, 
    startAdminRegistration, 
    closePinModal, 
    promptChangeAdminSlots, 
    cancelChangeAdminSlots, 
    confirmChangeAdminSlots, 
    openChangePinView,
    cancelChangePinView,
    confirmChangePin,
    promptRemoveAdmin, 
    cancelRemoveAdmin, 
    confirmRemoveAdmin, 
    verifyAndRegisterAdmin 
} from "./admin.js";

import { 
    syncTrashUI,
    openTrashModal,
    closeTrashModal,
    promptRestoreBatch,
    cancelTrashPinView,
    executeRestoreWithPin
} from "./trash.js";


import { 
    updateHeaderAvatars, 
    selectPresetAvatar, 
    handleCustomAvatarPhoto, 
    openProfileModal, 
    closeProfileModal, 
    saveProfile, 
    openLinkProfileView, 
    cancelLinkProfileView, 
    confirmLinkProfile, 
    assignProfileAsDailyInspector 
} from "./profile.js";

import { 
    changeCartDefectPieces,
    setCartDefectPiecesQuick,
    selectPiece, 
    goBackToLobby, 
    openCoverPalletsQuick, 
    openCoverRejectWizard, 
    selectOption, 
    changeQuantity, 
    changePallets, 
    handlePhotos, 
    renderPhotoPreviews, 
    removePhoto, 
    goToStep, 
    resetWizard, 
    saveRecord 
} from "./wizard.js";

import { 
    updateDashboard, 
    renderBitacora, 
    checkDailyInspector, 
    openInspectorModal, 
    closeInspectorModal, 
    saveInspectorName, 
    openPhotoViewer, 
    closePhotoViewer, 
    openRecordDetails, 
    closeRecordDetails, 
    renderClonePhotos, 
    removeClonePhoto, 
    handleClonePhotos, 
    changeCloneQuantity, 
    duplicateRecord, 
    toggleDeleteMode, 
    toggleRecordSelection, 
    updateDeleteButton, 
    requestDeletion 
} from "./dashboard.js";

import { 
    openReportModal, 
    closeReportModal, 
    generateReportContent, 
    openExportModal, 
    closeExportModal, 
    downloadPDF 
} from "./reports.js";

// Exponer funciones en window para compatibilidad total con atributos onclick / onchange del HTML
window.manualSyncPulse = manualSyncPulse;
window.showNotification = showNotification;

window.skipAdminOnboarding = skipAdminOnboarding;
window.startAdminRegistration = startAdminRegistration;
window.closePinModal = closePinModal;
window.promptChangeAdminSlots = promptChangeAdminSlots;
window.cancelChangeAdminSlots = cancelChangeAdminSlots;
window.confirmChangeAdminSlots = confirmChangeAdminSlots;
window.openChangePinView = openChangePinView;
window.cancelChangePinView = cancelChangePinView;
window.confirmChangePin = confirmChangePin;
window.promptRemoveAdmin = promptRemoveAdmin;
window.cancelRemoveAdmin = cancelRemoveAdmin;
window.confirmRemoveAdmin = confirmRemoveAdmin;
window.verifyAndRegisterAdmin = verifyAndRegisterAdmin;

window.openTrashModal = openTrashModal;
window.closeTrashModal = closeTrashModal;
window.promptRestoreBatch = promptRestoreBatch;
window.cancelTrashPinView = cancelTrashPinView;
window.executeRestoreWithPin = executeRestoreWithPin;


window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.selectPresetAvatar = selectPresetAvatar;
window.handleCustomAvatarPhoto = handleCustomAvatarPhoto;
window.saveProfile = saveProfile;
window.openLinkProfileView = openLinkProfileView;
window.cancelLinkProfileView = cancelLinkProfileView;
window.confirmLinkProfile = confirmLinkProfile;
window.assignProfileAsDailyInspector = assignProfileAsDailyInspector;
window.changeCartDefectPieces = changeCartDefectPieces;
window.setCartDefectPiecesQuick = setCartDefectPiecesQuick;

window.selectPiece = selectPiece;
window.goBackToLobby = goBackToLobby;
window.openCoverPalletsQuick = openCoverPalletsQuick;
window.openCoverRejectWizard = openCoverRejectWizard;
window.selectOption = selectOption;
window.changeQuantity = changeQuantity;
window.changePallets = changePallets;
window.handlePhotos = handlePhotos;
window.removePhoto = removePhoto;
window.renderPhotoPreviews = renderPhotoPreviews;

window.openPhotoEditor = openPhotoEditor;
window.closePhotoEditor = closePhotoEditor;
window.setBrushSize = setBrushSize;
window.undoLastStroke = undoLastStroke;
window.clearAllStrokes = clearAllStrokes;
window.savePhotoAnnotations = savePhotoAnnotations;

window.goToStep = goToStep;

window.openInspectorModal = openInspectorModal;
window.closeInspectorModal = closeInspectorModal;
window.saveInspectorName = saveInspectorName;
window.openPhotoViewer = openPhotoViewer;
window.closePhotoViewer = closePhotoViewer;
window.openRecordDetails = openRecordDetails;
window.closeRecordDetails = closeRecordDetails;
window.removeClonePhoto = removeClonePhoto;
window.handleClonePhotos = handleClonePhotos;
window.changeCloneQuantity = changeCloneQuantity;
window.toggleDeleteMode = toggleDeleteMode;
window.toggleRecordSelection = toggleRecordSelection;
window.requestDeletion = requestDeletion;

window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.generateReportContent = generateReportContent;
window.openExportModal = openExportModal;
window.closeExportModal = closeExportModal;
window.downloadPDF = downloadPDF;

function setupRealtimeListeners() {
    // 1. Configuración de Admin y PIN dinámico
    if (state.unsubscribeAdminConfig) state.unsubscribeAdminConfig();
    state.unsubscribeAdminConfig = onSnapshot(adminConfigDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (typeof data.maxSlots === 'number') state.maxAdminSlots = data.maxSlots;
            if (data.pin) state.currentPin = data.pin;
        }
        markAsSynced(); 
        updateAdminUI(); 
        renderAdminModalContent();
    });

    // 2. Administradores de Automotriz
    if (state.unsubscribeAdmins) state.unsubscribeAdmins();
    state.unsubscribeAdmins = onSnapshot(adminsRef, (snap) => {
        state.allAdmins = [];
        let isFound = false;
        snap.forEach(d => {
            const data = d.data();
            state.allAdmins.push({ id: d.id, ...data });
            if (d.id === state.deviceUuid) {
                isFound = true; 
                state.adminSavedName = data.name || state.adminSavedName;
                if (state.adminSavedName) localStorage.setItem('delta_auto_admin_name', state.adminSavedName);
            }
        });
        
        state.allAdmins.sort((a, b) => (a.registeredAt || 0) - (b.registeredAt || 0));
        state.isAdmin = isFound;
        localStorage.setItem('delta_auto_is_admin', state.isAdmin ? 'true' : 'false');
        markAsSynced(); 
        updateAdminUI(); 
        renderAdminModalContent();
        if (!state.isAdmin) checkFirstTimeAdmin();
    });

    // 3. Registros de Calidad
    onSnapshot(rechazosRef, (snapshot) => {
        state.allRecords = [];
        snapshot.forEach(docSnap => state.allRecords.push({ id: docSnap.id, ...docSnap.data() }));
        markAsSynced();
        if (state.currentPiece) { 
            updateDashboard(); 
            renderBitacora(); 
        }
    }, (err) => {
        console.error(err);
        state.syncState = 'offline'; 
        updateSyncStatusUI();
    });

    // 4. Papelera de Eliminaciones
    if (state.unsubscribeTrash) state.unsubscribeTrash();
    state.unsubscribeTrash = onSnapshot(trashRef, (snapshot) => {
        state.trashList = [];
        snapshot.forEach(docSnap => {
            state.trashList.push({ id: docSnap.id, ...docSnap.data() });
        });
        state.trashList.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
        markAsSynced(); 
        syncTrashUI();
    });

    // 5. Perfiles de Inspectores
    onSnapshot(perfilesRef, (snap) => {
        state.allProfiles = [];
        const activeId = localStorage.getItem('delta_active_profile_id');
        snap.forEach(d => {
            const p = { id: d.id, ...d.data() };
            state.allProfiles.push(p);
            if (activeId && d.id === activeId) {
                state.currentProfile = p;
                state.inspectorName = p.name;
            } else if (!activeId && p.deviceUuids && p.deviceUuids.includes(state.deviceUuid)) {
                state.currentProfile = p;
                state.inspectorName = p.name;
                localStorage.setItem('delta_active_profile_id', p.id);
            }
        });
        updateHeaderAvatars();
    });

}

async function initApp() {
    document.getElementById('current-date-display').textContent = formatDateToDisplay(getLocalDateString());
    updateSyncStatusUI();
    
    const btnOpenWizard = document.getElementById('btn-open-wizard');
    if (btnOpenWizard) {
        btnOpenWizard.addEventListener('click', () => {
            const activeName = state.inspectorName || (state.isAdmin ? state.adminSavedName : '');
            if (!activeName) { 
                openInspectorModal(); 
                return showNotification("Configura quién está inspeccionando."); 
            }
            document.getElementById('wizard-modal').classList.remove('hidden'); 
            document.getElementById('wizard-modal').classList.add('flex');
            resetWizard();
        });
    }

    const btnCloseWizard = document.getElementById('btn-close-wizard');
    if (btnCloseWizard) {
        btnCloseWizard.addEventListener('click', () => {
            document.getElementById('wizard-modal').classList.add('hidden'); 
            document.getElementById('wizard-modal').classList.remove('flex');
        });
    }

    const btnSaveRecord = document.getElementById('btn-save-record');
    if (btnSaveRecord) {
        btnSaveRecord.addEventListener('click', saveRecord);
    }

    try {
        await initLocalDB();
        updateHeaderAvatars();
        await signInAnonymously(auth);
        state.currentUser = auth.currentUser;
        setupRealtimeListeners();
    } catch (error) {
        console.error("Error al iniciar app", error);
        state.syncState = 'offline'; 
        updateSyncStatusUI();
    }
}

// Escuchar cambios de conectividad y sincronización
window.addEventListener('online', () => { window.manualSyncPulse(); });
window.addEventListener('offline', () => { state.syncState = 'offline'; updateSyncStatusUI(); });

setInterval(() => {
    if (navigator.onLine && state.syncState === 'synced') {
        updateSyncStatusUI();
    }
}, 10000);

initApp();
