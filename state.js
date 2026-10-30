// state.js - Automotriz
import { DEFAULT_MAX_ADMIN_SLOTS, DEFAULT_PIN } from "./config.js";

let deviceUuid = localStorage.getItem('delta_device_uuid') || '';
if (!deviceUuid) {
    deviceUuid = 'dev_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('delta_device_uuid', deviceUuid);
}

export const state = {
    allRecords: [],
    allAdmins: [],
    maxAdminSlots: DEFAULT_MAX_ADMIN_SLOTS,
    currentPin: DEFAULT_PIN,
    pendingSlotChangeDelta: 0,
    newRecordData: { side: null, damage: null, variant: null, type: null, quantity: 1, pallets: 1, cartDefectPieces: 0, photos: [] },
    currentUser: null,
    isDeleteMode: false,
    selectedForDeletion: new Set(),
    currentPiece: null,
    cloneQuantityValue: 1,
    clonePhotos: [],
    inspectorName: '',
    dailyInspectors: {}, // Map of `${date}_${piece}` -> inspectorName
    unsubscribeInspector: null,
    unsubscribeTrash: null,
    unsubscribeAdmins: null,
    unsubscribeAdminConfig: null,
    deviceUuid: deviceUuid,
    isAdmin: localStorage.getItem('delta_auto_is_admin') === 'true',
    adminSavedName: localStorage.getItem('delta_auto_admin_name') || '',
    targetAdminToRemove: null,
    trashList: [],
    allProfiles: [],
    currentProfile: null,
    activeTrashDocId: null,
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
            // Vinculación dinámica: Si existe un inspector asignado a este día y pieza, prevalece siempre
            const key = `${r.dateString}_${r.pieceType || 'UPR'}`;
            if (state.dailyInspectors[key]) {
                correctedRecord.inspectorName = state.dailyInspectors[key];
            }
            return correctedRecord;
        });
}

export function resetNewRecordData() {
    state.newRecordData = { side: null, damage: null, variant: null, type: null, quantity: 1, pallets: 1, cartDefectPieces: 0, photos: [] };
}
