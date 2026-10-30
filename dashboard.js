// dashboard.js - Automotriz
import { state, getFilteredRecords } from "./state.js";
import { showNotification, getLocalDateString, formatTimeShort, markAsSynced, updateSyncStatusUI } from "./utils.js";
import { db, rechazosRef, trashRef, asignacionesRef, addDoc, doc, setDoc, onSnapshot, chunksRef, query, where, getDocs, deleteDoc } from "./firebase.js";
import { getImageLocally, saveImageLocally, resizeImageAndConvert, uploadChunksInBackground } from "./indexeddb.js";

export function updateDashboard() {
    const todayStr = getLocalDateString();
    const records = getFilteredRecords().filter(r => r.dateString === todayStr);
    
    let stats = { piezasTotal: 0, rh: 0, lh: 0, carrosTotal: 0, carrosVenta: 0, carrosInyeccion: 0, cajasTotal: 0, cajaNormal: 0, cajaGrande: 0, tarimas: 0 };

    records.forEach(r => {
        let qty = r.quantity !== undefined ? r.quantity : 1;
        let pallets = r.pallets || 0;
        
        if (state.currentPiece === 'COVER') {
            stats.piezasTotal += qty; 
            stats.tarimas += pallets;
        } else if (state.currentPiece === 'POCKET') {
            if (r.type === 'Pieza') { 
                stats.piezasTotal += qty; 
                if (r.side === 'RH') stats.rh += qty; 
                if (r.side === 'LH') stats.lh += qty; 
            } else if (r.type === 'Caja') { 
                stats.cajasTotal += qty; 
                stats.cajaNormal += qty; 
            } else if (r.type === 'Caja Grande') { 
                stats.cajasTotal += qty; 
                stats.cajaGrande += qty; 
            }
        } else { 
            if (r.type === 'Pieza') { 
                stats.piezasTotal += qty; 
                if (r.side === 'RH') stats.rh += qty; 
                if (r.side === 'LH') stats.lh += qty; 
            } else if (r.type === 'Carro de venta') { 
                stats.carrosTotal += qty; 
                stats.carrosVenta += qty; 
            } else if (r.type === 'Carro de inyección') { 
                stats.carrosTotal += qty; 
                stats.carrosInyeccion += qty; 
            }
        }
    });

    document.getElementById('stat-piezas-total').textContent = stats.piezasTotal;
    document.getElementById('stat-piezas-rh').textContent = stats.rh;
    document.getElementById('stat-piezas-lh').textContent = stats.lh;
    document.getElementById('stat-carros-total').textContent = stats.carrosTotal;
    document.getElementById('stat-carros-venta').textContent = stats.carrosVenta;
    document.getElementById('stat-carros-inyeccion').textContent = stats.carrosInyeccion;
    document.getElementById('stat-cajas-total').textContent = stats.cajasTotal;
    document.getElementById('stat-cajas-normal').textContent = stats.cajaNormal;
    document.getElementById('stat-cajas-grande').textContent = stats.cajaGrande;
    document.getElementById('stat-tarimas-total').textContent = stats.tarimas;
    document.getElementById('stat-cover-rechazos').textContent = stats.piezasTotal;
}

export function renderBitacora() {
    const container = document.getElementById('bitacora-list');
    container.innerHTML = '';
    const records = getFilteredRecords().sort((a, b) => b.timestamp - a.timestamp);

    if (records.length === 0) {
        container.innerHTML = `<div class="text-center py-10 glass-btn rounded-2xl border border-white"><i class="fas fa-clipboard-list text-4xl mb-3 text-gray-400"></i><p class="font-bold text-gray-600">No hay registros hoy.</p></div>`;
        return;
    }

    let currentGroupDate = null;
    records.forEach(r => {
        if (r.dateString !== currentGroupDate) {
            currentGroupDate = r.dateString;
            const header = document.createElement('div');
            header.className = 'text-xs font-black text-gray-800 uppercase mt-5 mb-2 px-2 tracking-widest drop-shadow-sm';
            header.textContent = currentGroupDate === getLocalDateString() ? 'Hoy' : currentGroupDate;
            container.appendChild(header);
        }

        const isTarimasOK = r.damage === 'Tarimas OK';
        let iconClass = 'fa-puzzle-piece text-red-500 bg-red-100 border-red-200';
        if (r.type && r.type.includes('Carro')) iconClass = 'fa-truck text-purple-600 bg-purple-100 border-purple-200';
        if (r.type && r.type.includes('Caja')) iconClass = 'fa-box-open text-teal-600 bg-teal-100 border-teal-200';
        if (isTarimasOK) iconClass = 'fa-pallet text-green-600 bg-green-100 border-green-200';
        
        const sideColor = r.side === 'RH' ? 'text-blue-700 bg-blue-100/80 border-blue-200' : (r.side === 'LH' ? 'text-green-700 bg-green-100/80 border-green-200' : 'text-gray-700 bg-gray-100/80 border-gray-200');
        const qtyText = (r.quantity > 1) ? `<span class="bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md ml-1 shadow-sm">${r.quantity} ${r.type}</span>` : '';
        const cartDefectBadge = (r.cartDefectPieces > 0) ? `<span class="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-md ml-1 shadow-sm"><i class="fas fa-cubes mr-1"></i>+${r.cartDefectPieces} pzs registradas</span>` : '';
        const derivedBadge = r.derivedFromCart ? `<span class="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md ml-1 shadow-sm"><i class="fas fa-truck mr-1"></i>De ${r.derivedFromCart}</span>` : '';
        const palletText = (state.currentPiece === 'COVER' && r.pallets) ? `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md ml-1 border border-emerald-300">${r.pallets} Tarimas</span>` : '';
        const isSelected = state.selectedForDeletion.has(r.id);
        
        const variantSpan = (r.variant && r.variant !== 'N/A') ? `<span class="bg-black/5 border border-white px-2 py-0.5 rounded-md text-gray-800 font-bold">${r.variant}</span>` : '';
        
        // VINCULACIÓN DINÁMICA DEL INSPECTOR
        const activeInsp = r.inspectorName || state.dailyInspectors[`${r.dateString}_${r.pieceType || 'UPR'}`] || 'Sin asignar';
        const inspectorStr = `<span class="text-[9px] text-gray-500 block font-bold"><i class="fas fa-user mr-0.5"></i> ${activeInsp.substring(0, 15)}</span>`;

        let damageIcon = isTarimasOK ? 'fa-check-double' : 'fa-exclamation-triangle';
        let damageStyle = isTarimasOK ? 'text-green-700 bg-green-100/90 border-green-200' : 'text-red-700 bg-red-100/90 border-red-200';

        let photosHTML = '';
        if (r.photos && r.photos.length > 0) {
            photosHTML = `<div class="flex gap-2 mt-3 hide-scrollbar overflow-x-auto pb-1">` + 
                r.photos.map(p => {
                    const isObj = typeof p === 'object';
                    const idStr = isObj ? p.id : p;
                    const thumbStr = isObj ? p.thumbnail : p;
                    return `<img src="${thumbStr}" class="w-12 h-12 rounded-lg object-cover border border-white shadow-sm cursor-pointer active:scale-95 bg-gray-200" onclick="event.stopPropagation(); openPhotoViewer('${idStr}', '${thumbStr}')">`;
                }).join('') + `</div>`;
        }

        const card = document.createElement('div');
        card.className = `p-3.5 rounded-2xl shadow-sm mb-3 flex items-start gap-3 glass-btn border border-white ${state.isDeleteMode ? (isSelected ? 'bg-red-50/90 border-red-400 ring-2 ring-red-400' : 'cursor-pointer') : 'cursor-pointer'}`;
        
        if (state.isDeleteMode) { 
            card.onclick = () => toggleRecordSelection(r.id); 
        } else { 
            card.onclick = () => openRecordDetails(r.id); 
        }

        card.innerHTML = `
            ${state.isDeleteMode ? `<div class="flex items-center justify-center mt-2 mr-1"><div class="w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-red-500 border-red-500' : 'border-gray-400 bg-white/50'}">${isSelected ? '<i class="fas fa-check text-white text-[12px]"></i>' : ''}</div></div>` : ''}
            <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner border border-white ${iconClass.split(' ').slice(1).join(' ')}"><i class="fas ${iconClass.split(' ')[0]} text-lg"></i></div>
            <div class="flex-1 overflow-hidden ml-1">
                <div class="flex justify-between items-start">
                    <p class="font-black text-gray-900 text-sm drop-shadow-sm">${r.type} ${qtyText} ${cartDefectBadge} ${derivedBadge} ${palletText}</p>
                    <div class="text-[10px] text-gray-600 font-bold text-right leading-tight">${formatTimeShort(r.timestamp)}${inspectorStr}</div>
                </div>
                <p class="text-xs flex flex-wrap gap-1.5 mt-2">
                    ${!isTarimasOK ? `<span class="font-bold border backdrop-blur-sm ${sideColor} px-2 py-0.5 rounded-md">${r.side}</span>` : ''}
                    ${variantSpan}
                    <span class="${damageStyle} px-2 py-0.5 rounded-md font-bold truncate max-w-full shadow-sm"><i class="fas ${damageIcon} text-[10px] mr-1"></i>${r.damage}</span>
                </p>
                ${photosHTML}
            </div>
        `;
        container.appendChild(card);
    });
}

export async function checkDailyInspector() {
    if (state.unsubscribeInspector) state.unsubscribeInspector();
    const docId = `${getLocalDateString()}_${state.currentPiece}`;
    const docRef = doc(asignacionesRef, docId);
    state.unsubscribeInspector = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            state.inspectorName = docSnap.data().inspectorName;
            state.dailyInspectors[docId] = state.inspectorName;
            document.getElementById('current-inspector-display').textContent = state.inspectorName;
        } else {
            if (state.isAdmin && state.adminSavedName) {
                state.inspectorName = state.adminSavedName;
                document.getElementById('current-inspector-display').textContent = `${state.adminSavedName} (Admin)`;
            } else {
                state.inspectorName = '';
                document.getElementById('current-inspector-display').textContent = 'Nadie asignado';
                openInspectorModal(); 
            }
        }
        updateDashboard();
        renderBitacora();
    });
}

export function openInspectorModal() {
    const modal = document.getElementById('inspector-name-modal');
    if (!modal) return;

    const profileSec = document.getElementById('inspector-profile-active-section');
    const manualSec = document.getElementById('inspector-manual-input-section');

    if (state.currentProfile) {
        if (profileSec) profileSec.classList.remove('hidden');
        if (manualSec) manualSec.classList.add('hidden');
        const nameEl = document.getElementById('inspector-active-profile-name');
        if (nameEl) nameEl.textContent = state.currentProfile.name;
    } else {
        if (profileSec) profileSec.classList.add('hidden');
        if (manualSec) manualSec.classList.remove('hidden');
        const inp = document.getElementById('inspector-name-input');
        if (inp) inp.value = localStorage.getItem('delta_auto_last_name') || '';
    }

    const descEl = document.getElementById('inspector-modal-desc');
    if (descEl) descEl.textContent = `Asignación oficial para la línea ${state.currentPiece} hoy.`;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

export function closeInspectorModal() {
    document.getElementById('inspector-name-modal').classList.add('hidden');
    document.getElementById('inspector-name-modal').classList.remove('flex');
}

export async function saveInspectorName() {
    const name = document.getElementById('inspector-name-input').value.trim();
    if (!name) return showNotification("Por favor, ingresa tu nombre.");
    
    localStorage.setItem('delta_auto_last_name', name);
    
    const todayStr = getLocalDateString();
    const docId = `${todayStr}_${state.currentPiece}`;
    const docRef = doc(asignacionesRef, docId);

    try {
        state.syncState = 'syncing'; 
        updateSyncStatusUI();
        
        // 1. Guardar asignación del día y pieza
        await setDoc(docRef, { inspectorName: name, timestamp: Date.now() });
        state.inspectorName = name;
        state.dailyInspectors[docId] = name;

        // 2. Vinculación en cascada: Actualizar todos los registros existentes de este día y pieza en Firestore
        const q = query(rechazosRef, where("dateString", "==", todayStr), where("pieceType", "==", state.currentPiece));
        const snap = await getDocs(q);
        const updatePromises = [];
        snap.forEach(d => {
            updatePromises.push(setDoc(doc(rechazosRef, d.id), { inspectorName: name }, { merge: true }));
        });
        await Promise.all(updatePromises);

        markAsSynced();
        closeInspectorModal();
        updateDashboard();
        renderBitacora();
        showNotification(`¡Asignado! Todos los rechazos de hoy en ${state.currentPiece} están ahora vinculados a ti.`);
    } catch(e) { 
        console.error(e); 
        showNotification("Error al guardar el inspector."); 
    }
}

export async function openPhotoViewer(id, fallbackThumb) {
    const viewerModal = document.getElementById('photo-viewer-modal');
    const viewerImg = document.getElementById('photo-viewer-img');
    const loader = document.getElementById('photo-viewer-loader');
    
    if (id && id.startsWith('data:image')) {
        viewerImg.src = id;
        viewerImg.classList.remove('opacity-0');
        viewerModal.classList.remove('hidden'); 
        viewerModal.classList.add('flex');
        return;
    }

    viewerImg.src = fallbackThumb || ''; 
    viewerImg.classList.add('opacity-50');
    viewerModal.classList.remove('hidden'); 
    viewerModal.classList.add('flex');
    
    let fullB64 = await getImageLocally(id);
    if (fullB64) {
        viewerImg.src = fullB64;
        viewerImg.classList.remove('opacity-50');
        return;
    }

    if (!navigator.onLine) {
        showNotification("Sin internet. Mostrando vista previa.");
        viewerImg.classList.remove('opacity-50');
        return;
    }

    loader.classList.remove('hidden');
    try {
        const q = query(chunksRef, where("imageId", "==", id));
        const querySnapshot = await getDocs(q);
        
        let chunks = [];
        querySnapshot.forEach((doc) => { chunks.push(doc.data()); });
        
        if (chunks.length > 0) {
            chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
            fullB64 = chunks.map(c => c.data).join('');
            
            if (fullB64) {
                viewerImg.src = fullB64;
                saveImageLocally(id, fullB64);
            }
        } else if (!fallbackThumb) {
            showNotification("La imagen completa aún no se sincroniza.");
        }
    } catch(e) {
        console.error("Error cargando foto completa", e);
        showNotification("Error al descargar la foto en alta calidad.");
    } finally {
        loader.classList.add('hidden');
        viewerImg.classList.remove('opacity-50');
    }
}

export function closePhotoViewer() {
    document.getElementById('photo-viewer-modal').classList.add('hidden');
    document.getElementById('photo-viewer-modal').classList.remove('flex');
    setTimeout(() => document.getElementById('photo-viewer-img').src = '', 300);
}

export function openRecordDetails(id) {
    if (state.isDeleteMode) return;
    const r = getFilteredRecords().find(x => x.id === id); 
    if (!r) return;

    const photoContainer = document.getElementById('details-photos');
    if (r.photos && r.photos.length > 0) {
        photoContainer.innerHTML = r.photos.map(p => {
            const isObj = typeof p === 'object';
            const idStr = isObj ? p.id : p;
            const thumbStr = isObj ? p.thumbnail : p;
            return `<img src="${thumbStr}" class="w-full max-h-[60vh] object-contain snap-center rounded-2xl bg-black/80 shadow-2xl border border-white/20 cursor-pointer active:scale-95" onclick="openPhotoViewer('${idStr}', '${thumbStr}')">`;
        }).join('');
        photoContainer.classList.remove('hidden');
    } else {
        photoContainer.innerHTML = '<div class="w-full flex flex-col items-center justify-center text-white/50 py-12"><i class="fas fa-image text-5xl mb-3"></i><p class="font-bold">Sin fotografías</p></div>';
        photoContainer.classList.remove('hidden');
    }

    state.clonePhotos = r.photos ? [...r.photos] : [];
    renderClonePhotos();

    const qtyStr = (r.quantity > 1) ? `(${r.quantity} ${r.type})` : '';
    const palStr = (state.currentPiece === 'COVER' && r.pallets) ? ` - ${r.pallets} Tarimas` : '';
    document.getElementById('details-title').textContent = `${r.type} ${qtyStr}${palStr}`;
    
    const isTarimasOK = r.damage === 'Tarimas OK';
    const damageEl = document.getElementById('details-damage');
    damageEl.textContent = r.damage;
    damageEl.className = isTarimasOK ? 'text-green-600 font-black text-xl mb-3 drop-shadow-sm' : 'text-red-600 font-black text-xl mb-3 drop-shadow-sm';
    
    document.getElementById('details-time').textContent = formatTimeShort(r.timestamp);

    let badgesHtml = '';
    if (r.side && r.side !== 'N/A' && !isTarimasOK) badgesHtml += `<span class="bg-black/10 text-gray-800 border border-white/50 px-3 py-1 rounded-md font-bold text-sm shadow-sm">${r.side}</span>`;
    if (r.variant && r.variant !== 'N/A') badgesHtml += `<span class="bg-black/10 text-gray-800 border border-white/50 px-3 py-1 rounded-md font-bold text-sm shadow-sm">Var: ${r.variant}</span>`;
    document.getElementById('details-badges').innerHTML = badgesHtml;

    state.cloneQuantityValue = 1;
    document.getElementById('clone-quantity').textContent = '1';
    const btn = document.getElementById('btn-duplicate-record');
    btn.onclick = () => duplicateRecord(r.id);

    const m = document.getElementById('record-details-modal');
    m.classList.remove('hidden'); 
    m.classList.add('flex');
}

export function renderClonePhotos() {
    const container = document.getElementById('clone-photo-preview');
    if (state.clonePhotos.length === 0) {
        container.innerHTML = '<span class="text-xs text-gray-400 italic">Sin fotos.</span>';
    } else {
        container.innerHTML = state.clonePhotos.map((p, i) => {
            const thumb = typeof p === 'object' ? p.thumbnail : p;
            const pId = typeof p === 'object' ? p.id : p;
            return `
            <div class="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-black">
                <img src="${thumb}" class="w-full h-full object-cover cursor-pointer" onclick="openPhotoViewer('${pId}', '${thumb}')">
                <button onclick="removeClonePhoto(${i})" class="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-5 h-5 rounded-bl shadow flex items-center justify-center active:scale-95"><i class="fas fa-times"></i></button>
            </div>
        `}).join('');
    }
}

export function removeClonePhoto(i) { 
    state.clonePhotos.splice(i, 1); 
    renderClonePhotos(); 
}

export async function handleClonePhotos(e) {
    if (!e.target.files) return;
    for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (file) {
            const photoObj = await resizeImageAndConvert(file);
            if (photoObj) state.clonePhotos.push(photoObj);
        }
    }
    renderClonePhotos();
    e.target.value = ''; 
}

export function closeRecordDetails() {
    document.getElementById('record-details-modal').classList.add('hidden');
    document.getElementById('record-details-modal').classList.remove('flex');
}

export function changeCloneQuantity(amt) {
    state.cloneQuantityValue = Math.max(1, state.cloneQuantityValue + amt);
    document.getElementById('clone-quantity').textContent = state.cloneQuantityValue;
}

export async function duplicateRecord(id) {
    const activeName = state.inspectorName || (state.isAdmin ? state.adminSavedName : '');
    if (!activeName) return showNotification("¡Atención! Asigna un nombre en la parte de arriba primero.");
    
    const original = state.allRecords.find(x => x.id === id);
    if (!original) return;

    const btn = document.getElementById('btn-duplicate-record');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin text-2xl"></i> Registrando...'; 
    btn.disabled = true;

    try {
        state.syncState = 'syncing'; 
        updateSyncStatusUI();

        const newRecord = { ...original };
        delete newRecord.id; 
        newRecord.timestamp = Date.now();
        newRecord.dateString = getLocalDateString();
        newRecord.inspectorId = state.currentUser ? state.currentUser.uid.substring(0, 4) : state.deviceUuid.substring(0, 4);
        newRecord.inspectorName = activeName;
        newRecord.quantity = state.cloneQuantityValue;
        if (state.currentPiece === 'COVER' && newRecord.damage !== 'Tarimas OK') newRecord.pallets = 0; 
        
        const photosToSave = state.clonePhotos.map(p => typeof p === 'object' ? { id: p.id, thumbnail: p.thumbnail } : p);
        uploadChunksInBackground(state.clonePhotos);
        newRecord.photos = photosToSave;

        await addDoc(rechazosRef, newRecord);
        markAsSynced();
        showNotification(`¡${state.cloneQuantityValue} registro(s) extra añadido(s)!`);
        closeRecordDetails();
    } catch(e) {
        console.error(e); 
        showNotification("Error al crear el nuevo registro.");
    } finally {
        btn.innerHTML = '<i class="fas fa-copy text-2xl"></i> Registrar más iguales'; 
        btn.disabled = false;
    }
}

// --- ELIMINACIÓN DIRECTA ÁGIL (SIN PIN) + ENVIAR A PAPELERA ---
export function toggleDeleteMode() {
    state.isDeleteMode = !state.isDeleteMode; 
    state.selectedForDeletion.clear();
    document.getElementById('normal-actions').classList.toggle('hidden', state.isDeleteMode);
    document.getElementById('delete-actions').classList.toggle('hidden', !state.isDeleteMode);
    document.getElementById('delete-actions').classList.toggle('flex', state.isDeleteMode);
    updateDeleteButton(); 
    renderBitacora();
}

export function toggleRecordSelection(id) {
    state.selectedForDeletion.has(id) ? state.selectedForDeletion.delete(id) : state.selectedForDeletion.add(id);
    updateDeleteButton(); 
    renderBitacora();
}

export function updateDeleteButton() {
    const b = document.getElementById('btn-confirm-delete');
    b.innerHTML = `<i class="fas fa-trash-alt mr-1"></i> Eliminar (${state.selectedForDeletion.size})`;
    if (state.selectedForDeletion.size > 0) b.classList.remove('opacity-50', 'pointer-events-none');
    else b.classList.add('opacity-50', 'pointer-events-none');
}

export async function requestDeletion() {
    if (state.selectedForDeletion.size === 0) return;

    const itemsToDelete = [];
    state.selectedForDeletion.forEach(id => {
        const rec = state.allRecords.find(x => x.id === id);
        if (rec) itemsToDelete.push({ ...rec, originalId: rec.id });
    });
    if (itemsToDelete.length === 0) return;

    if (!confirm(`¿Eliminar ${itemsToDelete.length} reporte(s)? Se moverán a la papelera donde un administrador puede restaurarlos si fue un error.`)) {
        return;
    }

    try {
        state.syncState = 'syncing'; 
        updateSyncStatusUI();

        // 1. Registrar en la papelera / bitácora de cambios
        await addDoc(trashRef, {
            deletedAt: Date.now(),
            dateString: getLocalDateString(),
            deletedByDevice: state.deviceUuid,
            inspectorAtDeletion: state.inspectorName || 'Desconocido',
            pieceType: state.currentPiece,
            items: itemsToDelete,
            totalItems: itemsToDelete.length
        });

        // 2. Eliminar de la colección activa
        for (const item of itemsToDelete) {
            await deleteDoc(doc(rechazosRef, item.id));
        }

        markAsSynced();
        showNotification(`¡${itemsToDelete.length} reporte(s) eliminado(s)! Puedes restaurarlos desde la Papelera.`);
        toggleDeleteMode();
    } catch(e) { 
        console.error(e); 
        showNotification("Error al eliminar los reportes."); 
    }
}
