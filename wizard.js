
export function setCartDefectPiecesQuick(val) {
    state.newRecordData.cartDefectPieces = Math.max(0, Math.min(50, val));
    const numEl = document.getElementById('record-cart-defect-pieces');
    if (numEl) numEl.textContent = state.newRecordData.cartDefectPieces > 0 ? `${state.newRecordData.cartDefectPieces}` : '0';
    const sumEl = document.getElementById('summary-cart-defect-pieces');
    if (sumEl) sumEl.textContent = state.newRecordData.cartDefectPieces > 0 ? `${state.newRecordData.cartDefectPieces} pzs adicionales` : 'Ninguna';
}

// js/modules/wizard.js
import { state, resetNewRecordData } from "./state.js";
import { showNotification, getLocalDateString, markAsSynced, updateSyncStatusUI } from "./utils.js";
import { rechazosRef, addDoc } from "./firebase.js";
import { resizeImageAndConvert, uploadChunksInBackground } from "./indexeddb.js";
import { updateDashboard, renderBitacora, checkDailyInspector, openInspectorModal } from "./dashboard.js";

export function selectPiece(piece) {
    state.currentPiece = piece;
    
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('main-dashboard').classList.remove('hidden', 'flex');
    document.getElementById('main-dashboard').classList.add('flex');
    document.getElementById('btn-registrar-container').classList.remove('hidden');

    const header = document.getElementById('main-header');
    const wizardProgress = document.getElementById('wizard-progress');
    const btnMain = document.getElementById('btn-open-wizard');
    
    document.getElementById('header-piece-name').textContent = piece;
    document.getElementById('wizard-piece-badge').textContent = piece;
    document.getElementById('report-piece-badge').textContent = piece;

    document.querySelectorAll('.dmg-btn').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.type-btn').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.na-option').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.color-upr').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.size-pocket').forEach(el => el.classList.add('hidden'));
    document.getElementById('summary-variant-row').classList.add('hidden');
    
    document.getElementById('stat-card-piezas').classList.remove('hidden', 'col-span-2');
    document.getElementById('stat-card-carros').classList.add('hidden'); 
    document.getElementById('stat-card-carros').classList.remove('flex');
    document.getElementById('stat-card-cajas').classList.add('hidden'); 
    document.getElementById('stat-card-cajas').classList.remove('flex');
    document.getElementById('stat-card-tarimas').classList.add('hidden');
    
    document.getElementById('lbl-cantidad-rechazos').textContent = "Cantidad";
    document.getElementById('summary-lbl-cantidad').textContent = "Cantidad Total";
    document.getElementById('cover-pallets-container').classList.add('hidden');
    document.getElementById('summary-pallets-row').classList.add('hidden');
    document.getElementById('summary-type-row').classList.remove('hidden');

    const containerUprCowlPocket = document.getElementById('container-upr-cowl-pocket');
    const containerCover = document.getElementById('container-cover-actions');

    header.className = 'text-white p-5 rounded-b-[2rem] shadow-lg sticky top-0 z-10 transition-colors duration-300 bg-opacity-90 backdrop-blur-xl border-b border-white/20';
    
    if (piece === 'UPR') {
        header.classList.add('bg-blue-700'); 
        wizardProgress.className = 'h-full transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.8)] bg-blue-500';
        document.querySelectorAll('.upr-dmg').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.type-upr').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.color-upr').forEach(el => el.classList.remove('hidden'));
        document.getElementById('step-4').classList.remove('hidden'); 
        document.getElementById('step-4').classList.add('flex');
        document.getElementById('stat-card-carros').classList.remove('hidden'); 
        document.getElementById('stat-card-carros').classList.add('flex');
        document.getElementById('step-3-title').textContent = 'Color';
        document.getElementById('summary-variant-label').textContent = 'Color';
        document.getElementById('summary-variant-row').classList.remove('hidden');
        containerUprCowlPocket.classList.remove('hidden'); 
        containerCover.classList.add('hidden');
        btnMain.innerHTML = '<i class="fas fa-plus-circle text-2xl drop-shadow-sm"></i> Registrar Rechazo';

    } else if (piece === 'COWL') {
        header.classList.add('bg-indigo-700'); 
        wizardProgress.className = 'h-full transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.8)] bg-indigo-500';
        document.querySelectorAll('.cowl-dmg').forEach(el => el.classList.remove('hidden'));
        document.getElementById('step-4').classList.remove('flex'); 
        document.getElementById('step-4').classList.add('hidden');
        document.getElementById('summary-type-row').classList.add('hidden');
        document.getElementById('stat-card-piezas').classList.add('col-span-2');
        containerUprCowlPocket.classList.remove('hidden'); 
        containerCover.classList.add('hidden');
        btnMain.innerHTML = '<i class="fas fa-plus-circle text-2xl drop-shadow-sm"></i> Registrar Rechazo';

    } else if (piece === 'POCKET') {
        header.classList.add('bg-teal-700'); 
        wizardProgress.className = 'h-full transition-all duration-300 shadow-[0_0_10px_rgba(20,184,166,0.8)] bg-teal-500';
        document.querySelectorAll('.pocket-dmg').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.type-pocket').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.size-pocket').forEach(el => el.classList.remove('hidden'));
        document.getElementById('step-4').classList.remove('hidden'); 
        document.getElementById('step-4').classList.add('flex');
        document.getElementById('stat-card-cajas').classList.remove('hidden'); 
        document.getElementById('stat-card-cajas').classList.add('flex');
        document.getElementById('step-3-title').textContent = 'Tamaño';
        document.getElementById('summary-variant-label').textContent = 'Tamaño';
        document.getElementById('summary-variant-row').classList.remove('hidden');
        containerUprCowlPocket.classList.remove('hidden'); 
        containerCover.classList.add('hidden');
        btnMain.innerHTML = '<i class="fas fa-plus-circle text-2xl drop-shadow-sm"></i> Registrar Rechazo';

    } else if (piece === 'COVER') {
        header.classList.add('bg-emerald-700'); 
        wizardProgress.className = 'h-full transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.8)] bg-emerald-500';
        document.querySelectorAll('.cover-dmg').forEach(el => el.classList.remove('hidden'));
        document.getElementById('step-4').classList.remove('flex'); 
        document.getElementById('step-4').classList.add('hidden');
        document.getElementById('summary-type-row').classList.add('hidden');
        document.getElementById('stat-card-piezas').classList.add('hidden');
        document.getElementById('stat-card-tarimas').classList.remove('hidden');
        document.getElementById('cover-pallets-container').classList.add('hidden');
        document.getElementById('summary-pallets-row').classList.add('hidden');
        containerUprCowlPocket.classList.add('hidden'); 
        containerCover.classList.remove('hidden');
    }

    updateDashboard(); 
    renderBitacora(); 
    checkDailyInspector(); 
}

export function goBackToLobby() {
    state.currentPiece = null;
    if (state.unsubscribeInspector) state.unsubscribeInspector();
    document.getElementById('lobby-screen').classList.remove('hidden');
    document.getElementById('main-dashboard').classList.add('hidden');
    document.getElementById('btn-registrar-container').classList.add('hidden');
}

export async function openCoverPalletsQuick() {
    const activeName = state.inspectorName || (state.isAdmin ? state.adminSavedName : '');
    if (!activeName) { 
        openInspectorModal(); 
        return showNotification("Configura quién está inspeccionando."); 
    }
    
    let palletsCount = prompt("¿Cuántas tarimas limpias/revisadas deseas registrar?", "1");
    if (!palletsCount || isNaN(palletsCount) || parseInt(palletsCount) <= 0) return;

    try {
        state.syncState = 'syncing'; 
        updateSyncStatusUI();
        await addDoc(rechazosRef, {
            side: 'N/A', 
            damage: 'Tarimas OK', 
            variant: 'N/A', 
            type: 'Pieza',
            quantity: 0, 
            pallets: parseInt(palletsCount), 
            photos: [],
            pieceType: 'COVER', 
            timestamp: Date.now(), 
            dateString: getLocalDateString(),
            inspectorId: state.currentUser ? state.currentUser.uid.substring(0, 4) : state.deviceUuid.substring(0, 4), 
            inspectorName: activeName
        });
        markAsSynced();
        showNotification(`¡Se registraron ${palletsCount} tarimas OK!`);
    } catch(e) { 
        console.error(e); 
        showNotification("Error al guardar tarimas."); 
    }
}

export function openCoverRejectWizard() {
    const activeName = state.inspectorName || (state.isAdmin ? state.adminSavedName : '');
    if (!activeName) { 
        openInspectorModal(); 
        return showNotification("Configura quién está inspeccionando."); 
    }
    document.getElementById('wizard-modal').classList.remove('hidden');
    document.getElementById('wizard-modal').classList.add('flex');
    resetWizard();
}

export function selectOption(cat, val, step) {
    state.newRecordData[cat] = val;
    
    const stepContainer = event.currentTarget.closest('.snap-center');
    if (stepContainer) {
        stepContainer.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
        event.currentTarget.classList.add('selected');
    }

    if (cat === 'variant') {
        document.getElementById('summary-variant-value').textContent = val;
    } else if (document.getElementById(`summary-${cat}`)) {
        document.getElementById(`summary-${cat}`).textContent = val;
    }

    let nextStep = step;
    if (cat === 'damage') {
        if (state.currentPiece === 'COWL' || state.currentPiece === 'COVER') {
            state.newRecordData['variant'] = 'N/A'; 
            state.newRecordData['type'] = 'Pieza'; 
            nextStep = 5; 
        } else { 
            nextStep = 3; 
        }
    } else if (cat === 'variant') { 
        nextStep = 4; 
    }
    goToStep(nextStep);
}

export function changeQuantity(amt) {
    state.newRecordData.quantity = Math.max(1, state.newRecordData.quantity + amt);
    document.getElementById('record-quantity').textContent = state.newRecordData.quantity;
    document.getElementById('summary-quantity').textContent = state.newRecordData.quantity;
}


export function changeCartDefectPieces(amt) {
    const cur = state.newRecordData.cartDefectPieces || 0;
    const next = Math.max(0, Math.min(50, cur + amt));
    state.newRecordData.cartDefectPieces = next;
    const numEl = document.getElementById('record-cart-defect-pieces');
    if (numEl) numEl.textContent = next > 0 ? `${next}` : '0';
    const sumEl = document.getElementById('summary-cart-defect-pieces');
    if (sumEl) sumEl.textContent = next > 0 ? `${next} pzs adicionales` : 'Ninguna';
}

export function changePallets(amt) {
    state.newRecordData.pallets = Math.max(1, state.newRecordData.pallets + amt);
    document.getElementById('record-pallets').textContent = state.newRecordData.pallets;
    document.getElementById('summary-pallets').textContent = state.newRecordData.pallets;
}

export async function handlePhotos(e) {
    if (!e.target.files) return;
    for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (file) {
            const photoObj = await resizeImageAndConvert(file);
            if (photoObj) state.newRecordData.photos.push(photoObj);
        }
    }
    renderPhotoPreviews();
    e.target.value = ''; 
}

export function renderPhotoPreviews() {
    const c = document.getElementById('photo-preview-container');
    if (!c) return;
    c.innerHTML = state.newRecordData.photos.map((p, i) => `
        <div class="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 border-white shadow-sm group">
            <img src="${p.thumbnail}" class="w-full h-full object-cover cursor-pointer" onclick="openPhotoEditor(${i})" title="Toca para rayar / marcar daño">
            <button type="button" onclick="event.stopPropagation(); removePhoto(${i})" class="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white text-xs w-6 h-6 rounded-bl-lg shadow flex items-center justify-center transition active:scale-95" title="Eliminar foto"><i class="fas fa-times"></i></button>
            <button type="button" onclick="event.stopPropagation(); openPhotoEditor(${i})" class="absolute bottom-0 right-0 bg-black/85 hover:bg-black text-amber-300 text-xs w-6 h-6 rounded-tl-lg shadow flex items-center justify-center transition active:scale-95" title="Rayar / marcar defecto"><i class="fas fa-pencil-alt"></i></button>
        </div>
    `).join('');
    
    const btnLabel = document.getElementById('btn-foto-label');
    if (btnLabel) {
        btnLabel.classList.remove('hidden'); 
        btnLabel.classList.add('flex');
    }
}

export function removePhoto(i) { 
    state.newRecordData.photos.splice(i, 1); 
    renderPhotoPreviews(); 
}

export function goToStep(n) {
    let stepLabel = "";
    let actualStepNumber = n;
    const isShort = (state.currentPiece === 'COVER' || state.currentPiece === 'COWL');
    const totalSteps = isShort ? 4 : 6;
    
    if (isShort) {
        if (n === 1) { stepLabel = "Lado"; actualStepNumber = 1; }
        if (n === 2) { stepLabel = "Daño"; actualStepNumber = 2; }
        if (n === 5) { stepLabel = "Cantidades"; actualStepNumber = 3; }
        if (n === 6) { stepLabel = "Confirmar"; actualStepNumber = 4; }
    } else {
        const t = ["Lado", "Daño", state.currentPiece === 'POCKET' ? 'Tamaño' : 'Color', "Presentación", "Cantidades", "Confirmar"];
        stepLabel = t[n-1];
        actualStepNumber = n;
    }
    
    document.getElementById('wizard-step-text').textContent = `Paso ${actualStepNumber}: ${stepLabel}`;
    document.getElementById('wizard-progress').style.width = `${(actualStepNumber / totalSteps) * 100}%`;
    document.getElementById(`step-${n}`).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

export function resetWizard() {
    resetNewRecordData();
    if (state.currentPiece === 'COVER' || state.currentPiece === 'COWL') {
        state.newRecordData.type = 'Pieza'; 
        document.getElementById('summary-type').textContent = 'Pieza';
    }

    document.querySelectorAll('.option-btn.selected').forEach(btn => btn.classList.remove('selected'));
    ['piece','side','damage','type'].forEach(k => {
        if (document.getElementById(`summary-${k}`)) {
            document.getElementById(`summary-${k}`).textContent = k === 'piece' ? state.currentPiece : (state.newRecordData[k] || '-');
        }
    });
    document.getElementById('summary-variant-value').textContent = '-';
    document.getElementById('summary-quantity').textContent = '1';
    document.getElementById('record-quantity').textContent = '1';
    document.getElementById('summary-pallets').textContent = '1';
    document.getElementById('record-pallets').textContent = '1';
    const uprCartContainer = document.getElementById('upr-cart-pieces-container');
    if (uprCartContainer) uprCartContainer.classList.add('hidden');
    const summaryCartRow = document.getElementById('summary-cart-defect-row');
    if (summaryCartRow) summaryCartRow.classList.add('hidden');
    const numEl = document.getElementById('record-cart-defect-pieces');
    if (numEl) numEl.textContent = '0 (Todos)';
    const sumEl = document.getElementById('summary-cart-defect-pieces');
    if (sumEl) sumEl.textContent = 'Sin especificar';
    renderPhotoPreviews();
    document.getElementById('step-1').scrollIntoView({ behavior: 'auto' });
    
    const isShort = (state.currentPiece === 'COVER' || state.currentPiece === 'COWL');
    document.getElementById('wizard-progress').style.width = isShort ? '25%' : '16.66%';
    document.getElementById('wizard-step-text').textContent = 'Paso 1: Lado';
}

export async function saveRecord() {
    if (!state.newRecordData.side || !state.newRecordData.damage || !state.newRecordData.type) {
        return showNotification("Completa todos los pasos antes de guardar.");
    }
    if ((state.currentPiece === 'UPR' || state.currentPiece === 'POCKET') && !state.newRecordData.variant) {
        return showNotification("Selecciona la variante.");
    }
    
    const activeName = state.inspectorName || (state.isAdmin ? state.adminSavedName : '');
    if (!activeName) return showNotification("Falta configurar nombre del inspector.");

    const btn = document.getElementById('btn-save-record');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin text-2xl"></i> Guardando...'; 
    btn.disabled = true;

    try {
        state.syncState = 'syncing'; 
        updateSyncStatusUI();

        const photosToSave = state.newRecordData.photos.map(p => ({ id: p.id, thumbnail: p.thumbnail }));
        uploadChunksInBackground(state.newRecordData.photos);

        const nowTs = Date.now();
        const dateStr = getLocalDateString();
        const inspId = state.currentUser ? state.currentUser.uid.substring(0, 4) : state.deviceUuid.substring(0, 4);
        const defectPieces = parseInt(state.newRecordData.cartDefectPieces) || 0;
        const isCart = (state.currentPiece === 'UPR' && (state.newRecordData.type === 'Carro de venta' || state.newRecordData.type === 'Carro de inyección'));

        // 1. Guardar el reporte del Carro
        await addDoc(rechazosRef, {
            ...state.newRecordData,
            photos: photosToSave,
            pieceType: state.currentPiece,
            timestamp: nowTs,
            dateString: dateStr,
            inspectorId: inspId,
            inspectorName: activeName
        });

        // 2. Si se especificaron piezas defectuosas en el carro, SUBIR APARTE LAS PIEZAS
        if (isCart && defectPieces > 0) {
            await addDoc(rechazosRef, {
                side: state.newRecordData.side,
                damage: state.newRecordData.damage,
                variant: state.newRecordData.variant,
                type: 'Pieza', // Subidas como piezas individuales por separado
                quantity: defectPieces,
                pallets: 0,
                derivedFromCart: state.newRecordData.type,
                photos: photosToSave,
                pieceType: 'UPR',
                timestamp: nowTs + 10, // Timestamp ligeramente posterior para mantener orden
                dateString: dateStr,
                inspectorId: inspId,
                inspectorName: activeName
            });
        }
        markAsSynced();
        document.getElementById('wizard-modal').classList.add('hidden');
        document.getElementById('wizard-modal').classList.remove('flex');
    } catch (e) {
        console.error(e); 
        showNotification("Error al guardar en la nube.");
    } finally {
        btn.innerHTML = '<i class="fas fa-save text-2xl"></i> Guardar'; 
        btn.disabled = false;
    }
}
