// photo-editor.js - Editor de Fotos para Rayar / Marcar Daños en Negro
import { state } from "./state.js";
import { showNotification } from "./utils.js";
import { getImageLocally, saveImageLocally } from "./indexeddb.js";
import { CHUNK_SIZE } from "./config.js";

let currentEditingIndex = null;
let baseImage = new Image();
let canvas = null;
let ctx = null;
let isDrawing = false;
let currentBrushSize = 6;
let strokeHistory = []; // Stack of imageData for undo
let lastX = 0;
let lastY = 0;

export async function openPhotoEditor(photoIndex) {
    currentEditingIndex = photoIndex;
    const photoObj = state.newRecordData.photos[photoIndex];
    if (!photoObj) return;

    const modal = document.getElementById('photo-editor-modal');
    canvas = document.getElementById('photo-annotation-canvas');
    if (!modal || !canvas) return;

    ctx = canvas.getContext('2d');
    strokeHistory = [];

    // Cargar imagen completa (desde IndexedDB o thumbnail/dataURL)
    let src = '';
    if (typeof photoObj === 'object') {
        const full = await getImageLocally(photoObj.id);
        src = full || photoObj.thumbnail || '';
    } else {
        src = photoObj;
    }

    if (!src) return showNotification("No se pudo cargar la imagen para editar.");

    baseImage = new Image();
    baseImage.onload = () => {
        // Ajustar tamaño del canvas respetando la resolución de la imagen (hasta 1200 max para fluidez)
        const maxDim = 1200;
        let scale = 1;
        if (baseImage.width > maxDim || baseImage.height > maxDim) {
            scale = maxDim / Math.max(baseImage.width, baseImage.height);
        }
        canvas.width = Math.round(baseImage.width * scale);
        canvas.height = Math.round(baseImage.height * scale);

        ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
        saveCanvasState(); // Estado inicial
        setBrushSize(6);

        setupCanvasEvents();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };
    baseImage.src = src;
}

export function closePhotoEditor() {
    const modal = document.getElementById('photo-editor-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    currentEditingIndex = null;
}

export function setBrushSize(size) {
    currentBrushSize = size;
    [3, 6, 12].forEach(s => {
        const btn = document.getElementById(`brush-size-${s}`);
        if (btn) {
            if (s === size) {
                btn.classList.add('bg-white/40', 'shadow');
                btn.classList.remove('bg-transparent');
            } else {
                btn.classList.remove('bg-white/40', 'shadow');
                btn.classList.add('bg-transparent');
            }
        }
    });
}

function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function saveCanvasState() {
    if (!ctx || !canvas) return;
    strokeHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (strokeHistory.length > 20) strokeHistory.shift(); // Max 20 pasos de undo
}

export function undoLastStroke() {
    if (!ctx || !canvas || strokeHistory.length <= 1) return;
    strokeHistory.pop(); // Elimina estado actual
    const previousState = strokeHistory[strokeHistory.length - 1];
    ctx.putImageData(previousState, 0, 0);
}

export function clearAllStrokes() {
    if (!ctx || !canvas || !baseImage.src) return;
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    saveCanvasState();
}

function startDrawing(e) {
    e.preventDefault();
    isDrawing = true;
    const coords = getCanvasCoordinates(e);
    lastX = coords.x;
    lastY = coords.y;

    ctx.strokeStyle = '#ef4444'; // Trazo rojo brillante // Trazo negro
    ctx.lineWidth = currentBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.arc(lastX, lastY, currentBrushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
}

function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCanvasCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastX = coords.x;
    lastY = coords.y;
}

function stopDrawing(e) {
    if (!isDrawing) return;
    isDrawing = false;
    saveCanvasState();
}

function setupCanvasEvents() {
    // Remover eventos previos clonando o reasignando
    canvas.onmousedown = startDrawing;
    canvas.onmousemove = draw;
    canvas.onmouseup = stopDrawing;
    canvas.onmouseleave = stopDrawing;

    canvas.ontouchstart = startDrawing;
    canvas.ontouchmove = draw;
    canvas.ontouchend = stopDrawing;
    canvas.ontouchcancel = stopDrawing;
}

export async function savePhotoAnnotations() {
    if (currentEditingIndex === null || !canvas) return;

    try {
        const fullB64 = canvas.toDataURL('image/jpeg', 0.85);

        // Crear thumbnail de 200px
        const thumbCanvas = document.createElement('canvas');
        const thumbCtx = thumbCanvas.getContext('2d');
        const scale = 200 / canvas.width;
        thumbCanvas.width = 200;
        thumbCanvas.height = Math.round(canvas.height * scale);
        thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        const thumbB64 = thumbCanvas.toDataURL('image/jpeg', 0.5);

        const photoObj = state.newRecordData.photos[currentEditingIndex];
        if (typeof photoObj === 'object') {
            photoObj.thumbnail = thumbB64;
            saveImageLocally(photoObj.id, fullB64);
            
            // Re-generar chunks para Firestore
            photoObj.chunks = [];
            for (let i = 0; i < fullB64.length; i += CHUNK_SIZE) {
                photoObj.chunks.push(fullB64.substring(i, i + CHUNK_SIZE));
            }
        } else {
            state.newRecordData.photos[currentEditingIndex] = fullB64;
        }

        // Re-renderizar miniaturas
        if (window.renderPhotoPreviews) window.renderPhotoPreviews();

        closePhotoEditor();
        showNotification("¡Marcas en negro guardadas en la foto!");
    } catch(e) {
        console.error(e);
        showNotification("Error guardando marcas en la foto.");
    }
}
