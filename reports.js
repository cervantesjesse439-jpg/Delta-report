// js/modules/reports.js
import { state, getFilteredRecords } from "./state.js";
import { showNotification, getLocalDateString } from "./utils.js";

export function getGroupedData(records, pieceTarget) {
    let grouped = {}; 
    let totals = {}; 
    let totalTarimas = 0;
    records.forEach(r => {
        let dmg = r.damage; 
        let type = r.type || 'Pieza';
        let side = (r.side && r.side !== 'N/A') ? r.side : ''; 
        let variant = (r.variant && r.variant !== 'N/A') ? r.variant : '';
        let qty = r.quantity !== undefined ? r.quantity : 1;
        
        if (pieceTarget === 'COVER') totalTarimas += (r.pallets || 0);

        if (dmg !== 'Tarimas OK') {
            if (!totals[type]) totals[type] = 0; 
            totals[type] += qty;
            let key = `${dmg}|${type}|${side}|${variant}`;
            if (!grouped[key]) grouped[key] = { dmg, type, side, variant, qty: 0 };
            grouped[key].qty += qty;
        }
    });
    return { grouped: Object.values(grouped), totals, totalTarimas };
}

export function openReportModal() {
    const m = document.getElementById('report-modal');
    document.getElementById('report-date-picker').value = getLocalDateString();
    m.classList.remove('hidden'); 
    m.classList.add('flex');
    generateReportContent();
}

export function closeReportModal() {
    document.getElementById('report-modal').classList.add('hidden'); 
    document.getElementById('report-modal').classList.remove('flex');
}

export function generateReportContent() {
    const date = document.getElementById('report-date-picker').value;
    document.getElementById('report-content').innerHTML = getHTMLReportForPiece(state.currentPiece, date);
}

export function getHTMLReportForPiece(pieceTarget, dateStr) {
    const records = getFilteredRecords().filter(r => r.dateString === dateStr);
    if (records.length === 0) {
        return `<div class="text-center py-10 glass-btn rounded-3xl"><p class="text-gray-600 font-bold text-lg">No se registraron defectos ni tarimas.</p></div>`;
    }

    const { grouped, totals, totalTarimas } = getGroupedData(records, pieceTarget);
    
    let headerColorClass = 'bg-blue-600';
    if (pieceTarget === 'COWL') headerColorClass = 'bg-indigo-600';
    if (pieceTarget === 'POCKET') headerColorClass = 'bg-teal-600';
    if (pieceTarget === 'COVER') headerColorClass = 'bg-emerald-600';

    let summaryText = Object.keys(totals).length > 0 ? Object.keys(totals).map(k => `<span class="font-bold text-white bg-black/25 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-lg text-sm shadow-sm">${totals[k]} ${k}</span>`).join(' ') : '<span class="font-bold text-white bg-black/25 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-lg text-sm shadow-sm">0 Rechazos</span>';
    
    let html = `<div class="mb-5 ${headerColorClass} text-white p-5 rounded-[2rem] shadow-lg flex flex-col gap-3 border border-white/20 relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
        <div class="relative z-10"><span class="font-black text-sm text-white/90 uppercase tracking-widest block mb-2 drop-shadow-sm">Total Rechazos:</span><div class="flex flex-wrap gap-2">${summaryText}</div></div>
    </div>`;
    
    if (pieceTarget === 'COVER' && totalTarimas > 0) {
        html += `<div class="mb-5 glass-btn border border-emerald-300 p-5 rounded-[2rem] flex justify-between items-center shadow-sm"><span class="font-black text-emerald-800 uppercase tracking-wide">Tarimas Revisadas:</span><span class="text-3xl font-black text-emerald-600 drop-shadow-sm">${totalTarimas}</span></div>`;
    }

    let dmgGroups = {};
    grouped.sort((a,b) => b.qty - a.qty).forEach(item => {
        if (!dmgGroups[item.dmg]) dmgGroups[item.dmg] = [];
        dmgGroups[item.dmg].push(item);
    });

    Object.keys(dmgGroups).forEach(dmg => {
        let itemsHtml = dmgGroups[dmg].map(item => {
            let detalles = [];
            if (item.side) detalles.push(item.side);
            if (item.variant) detalles.push(item.variant);
            let detStr = detalles.length > 0 ? `<span class="text-xs text-gray-500 font-bold bg-white/50 px-2 py-0.5 rounded border border-white shadow-sm">${detalles.join(', ')}</span>` : '';
            return `<div class="flex justify-between items-center py-3 border-b border-gray-300/30 last:border-0"><div class="flex flex-col gap-1"><span class="font-black text-gray-800 text-base">${item.type}</span>${detStr}</div><span class="font-black text-gray-900 bg-white/70 shadow-inner border border-white px-4 py-1.5 rounded-xl text-lg">${item.qty}</span></div>`;
        }).join('');

        html += `<div class="glass-btn p-5 rounded-[2rem] shadow-sm mb-4 border border-white"><h4 class="font-black text-red-600 text-xl mb-3 pb-3 border-b border-gray-300/50 drop-shadow-sm">${dmg}</h4>${itemsHtml}</div>`;
    });
    return html;
}

export function openExportModal() {
    const m = document.getElementById('export-date-modal');
    document.getElementById('export-date-picker-pdf').value = getLocalDateString();
    m.classList.remove('hidden'); 
    m.classList.add('flex');
}

export function closeExportModal() {
    document.getElementById('export-date-modal').classList.add('hidden'); 
    document.getElementById('export-date-modal').classList.remove('flex');
}

export function downloadPDF() {
    if (state.allRecords.length === 0) { 
        closeExportModal(); 
        return showNotification("No hay registros en la nube."); 
    }
    const dateStr = document.getElementById('export-date-picker-pdf').value;
    const dateStrFormatted = new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' }).toUpperCase();
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold"); 
    doc.setFontSize(18); 
    doc.text("REPORTE DE CALIDAD - DELTA TECH", 14, 20);
    doc.setFontSize(11); 
    doc.setFont("helvetica", "normal"); 
    doc.text(`Fecha: ${dateStrFormatted}`, 14, 28);
    
    let currentY = 36;
    const piecesList = ['UPR', 'COWL', 'POCKET', 'COVER'];
    let hasData = false;

    piecesList.forEach(piece => {
        const rawRecords = state.allRecords.filter(r => (r.pieceType || 'UPR') === piece && r.dateString === dateStr);
        const records = rawRecords.map(r => {
            let correctedRecord = { ...r };
            if (correctedRecord.pieceType === 'COWL' && correctedRecord.damage === 'Sin etiqueta') correctedRecord.damage = 'Contaminación';
            if (correctedRecord.damage === 'Poste fracturado') correctedRecord.damage = 'Fractura';
            return correctedRecord;
        });
        
        if (records.length === 0) return;
        
        hasData = true;
        const { grouped, totals, totalTarimas } = getGroupedData(records, piece);
        if (currentY > 250) { 
            doc.addPage(); 
            currentY = 20; 
        }

        doc.setFont("helvetica", "bold"); 
        doc.setFontSize(14); 
        doc.setTextColor(41, 128, 185);
        doc.text(`Línea: ${piece}`, 14, currentY); 
        currentY += 6;
        doc.setFontSize(10); 
        doc.setTextColor(0, 0, 0);
        
        let summaryText = Object.keys(totals).length > 0 ? Object.keys(totals).map(k => `${totals[k]} ${k}`).join(', ') : '0 Rechazos';
        if (piece === 'COVER' && totalTarimas > 0) {
            doc.setFont("helvetica", "bold"); 
            doc.text(`Total Tarimas Revisadas: ${totalTarimas}`, 14, currentY); 
            currentY += 5;
        }
        
        doc.setFont("helvetica", "bold"); 
        doc.text(`Total Registrado: ${summaryText}`, 14, currentY); 
        currentY += 6;

        const tableBody = grouped.sort((a,b) => a.dmg.localeCompare(b.dmg)).map(item => {
            let detalles = [];
            if (item.side) detalles.push(`Lado: ${item.side}`);
            if (item.variant) detalles.push(piece === 'POCKET' ? `Tamaño: ${item.variant}` : `Variante: ${item.variant}`);
            let detStr = detalles.length > 0 ? detalles.join('\n') : '-';
            return [item.dmg, item.type, detStr, item.qty.toString()];
        });
        
        if (tableBody.length > 0) {
            doc.autoTable({
                startY: currentY, 
                head: [['Defecto', 'Presentación', 'Detalles', 'Cantidad']], 
                body: tableBody,
                theme: 'grid', 
                headStyles: { fillColor: [44, 62, 80] }, 
                styles: { fontSize: 9, cellPadding: 3, valign: 'middle' }, 
                margin: { left: 14, right: 14 }
            });
            currentY = doc.lastAutoTable.finalY + 15;
        } else { 
            currentY += 10; 
        }
    });

    if (!hasData) { 
        doc.setFont("helvetica", "italic"); 
        doc.text("No se registraron defectos ni tarimas en esta fecha.", 14, currentY); 
    }
    doc.save(`Reporte_Delta_${dateStr}.pdf`); 
    closeExportModal(); 
    showNotification("¡PDF descargado con éxito!");
}
