// js/app.js
import { state } from "./state.js";
import { formatDateToDisplay, getLocalDateString, updateSyncStatusUI, markAsSynced, manualSyncPulse, showNotification } from "./utils.js";
import { auth, signInAnonymously, onSnapshot, rechazosRef, approvalsRef, adminsRef, adminConfigDocRef } from "./firebase.js";
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
    promptRemoveAdmin, 
    cancelRemoveAdmin, 
    confirmRemoveAdmin, 
    verifyAndRegisterAdmin 
} from "./admin.js";

import { 
    syncApprovalModalState, 
    showApprovalAdminModal, 
    skipCurrentApprovalModal, 
    openPendingApprovalsManually, 
    rejectApprovalRequest, 
    showApprovalPinView, 
    cancelApprovalPinView, 
    executeApprovedDeletion 
} from "./approvals.js";

import { 
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
window.promptRemoveAdmin = promptRemoveAdmin;
window.cancelRemoveAdmin = cancelRemoveAdmin;
window.confirmRemoveAdmin = confirmRemoveAdmin;
window.verifyAndRegisterAdmin = verifyAndRegisterAdmin;

window.skipCurrentApprovalModal = skipCurrentApprovalModal;
window.openPendingApprovalsManually = openPendingApprovalsManually;
window.rejectApprovalRequest = rejectApprovalRequest;
window.showApprovalPinView = showApprovalPinView;
window.cancelApprovalPinView = cancelApprovalPinView;
window.executeApprovedDeletion = executeApprovedDeletion;

window.selectPiece = selectPiece;
window.goBackToLobby = goBackToLobby;
window.openCoverPalletsQuick = openCoverPalletsQuick;
window.openCoverRejectWizard = openCoverRejectWizard;
window.selectOption = selectOption;
window.changeQuantity = changeQuantity;
window.changePallets = changePallets;
window.handlePhotos = handlePhotos;
window.removePhoto = removePhoto;
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
    if (state.unsubscribeAdminConfig) state.unsubscribeAdminConfig();
    state.unsubscribeAdminConfig = onSnapshot(adminConfigDocRef, (docSnap) => {
        if (docSnap.exists() && typeof docSnap.data().maxSlots === 'number') {
            state.maxAdminSlots = docSnap.data().maxSlots;
        } else {
            state.maxAdminSlots = 3;
        }
        markAsSynced(); 
        updateAdminUI(); 
        renderAdminModalContent();
    });

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
                if (state.adminSavedName) localStorage.setItem('delta_admin_name', state.adminSavedName);
            }
        });
        
        state.allAdmins.sort((a, b) => (a.registeredAt || 0) - (b.registeredAt || 0));
        state.isAdmin = isFound;
        localStorage.setItem('delta_is_admin', state.isAdmin ? 'true' : 'false');
        markAsSynced(); 
        updateAdminUI(); 
        renderAdminModalContent();
        if (!state.isAdmin) checkFirstTimeAdmin();
    });

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

    if (state.unsubscribeApprovals) state.unsubscribeApprovals();
    state.unsubscribeApprovals = onSnapshot(approvalsRef, (snapshot) => {
        state.pendingApprovalsList = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.status === 'pending') state.pendingApprovalsList.push({ id: docSnap.id, ...data });
        });
        state.pendingApprovalsList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        markAsSynced(); 
        syncApprovalModalState();
    });
}

async function initApp() {
    document.getElementById('current-date-display').textContent = formatDateToDisplay(getLocalDateString());
    updateSyncStatusUI();
    
    // Asignar listeners a botones fijos del wizard
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

// Iniciar
initApp();
