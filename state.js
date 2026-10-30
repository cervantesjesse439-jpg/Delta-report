// js/state.js
import { DEFAULT_MAX_ADMIN_SLOTS } from "./config.js";

let deviceUuid = localStorage.getItem('delta_device_uuid') || '';
if (!deviceUuid) {
    deviceUuid = 'dev_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('delta_device_uuid', deviceUuid);
}

export const state = {
    allRecords: [],
    allAdmins: [],
    maxAdminSlots: DEFAULT_MAX_ADMIN_SLOTS,
    pendingSlotChangeDelta: 0,
    newRecordData: { side: null, damage: null, variant: null, type: null, quantity: 1, pallets: 1, photos: [] },
    currentUser: null,
    isDeleteMode: false,
    selectedForDeletion: new Set(),
    currentPiece: null,
    cloneQuantityValue: 1,
    clonePhotos: [],
    inspectorName: '',
    unsubscribeInspector: null,
    unsubscribeApprovals: null,
    unsubscribeAdmins: null,
    unsubscribeAdminConfig: null,
    deviceUuid: deviceUuid,
    isAdmin: localStorage.getItem('delta_is_admin') === 'true',
    adminSavedName: localStorage.getItem('delta_admin_name') || '',
    targetAdminToRemove: null,
    pendingApprovalsList: [],
    skippedApprovalDocIds: new Set(),
    activeApprovalDocId: null,
    activeApprovalItems: [],
    syncState: 'connecting',
    lastSyncTimestamp: Date.now()
};

export function getFilteredRecords() {
    return state.allRecords
        .filter(r => (r.pieceType || 'UPR') === state.currentPiece)
        .map(r => {
            let correctedRecord = { ...r };
            if (correctedRecord.pieceType === 'COWL' && correctedRecord.damage === 'Sin etiqueta') {
                correctedRecord.damage = 'Contaminación';
            }
            if (correctedRecord.damage === 'Poste fracturado') {
                correctedRecord.damage = 'Fractura';
            }
            return correctedRecord;
        });
}

export function resetNewRecordData() {
    state.newRecordData = { side: null, damage: null, variant: null, type: null, quantity: 1, pallets: 1, photos: [] };
}
