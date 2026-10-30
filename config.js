// config.js - Automotriz
export const firebaseConfig = {
    apiKey: "AIzaSyC6-UX4jsL4nfyprVw1PviZzHwnKbWLipA",
    authDomain: "delta-9c75f.firebaseapp.com",
    projectId: "delta-9c75f",
    storageBucket: "delta-9c75f.firebasestorage.app",
    messagingSenderId: "901178031655",
    appId: "1:901178031655:web:5d7f41aedede352ea71802",
    measurementId: "G-0QY5CJP0ED"
};

export const DEFAULT_PIN = "2486";
export const DB_NAME = "DeltaTechImagesDB";
export const DEFAULT_MAX_ADMIN_SLOTS = 3;
export const CHUNK_SIZE = 750000;

// Colecciones exclusivas para Automotriz
export const COL_RECORDS = "rechazos_delta";
export const COL_ADMINS = "delta_admins_auto";
export const COL_ASIGNACIONES = "asignaciones_delta_auto";
export const COL_TRASH = "delta_eliminaciones_auto";
export const DOC_CONFIG = "admin_settings_auto";

export const COL_PERFILES = "delta_perfiles_auto";
export const COL_AUDITORIA = "delta_auditoria_auto";

export const AVATAR_PRESETS = [
    { id: 'av-1', icon: 'fa-user-ninja', bg: 'bg-blue-600', color: 'text-white', label: 'Ninja Azul' },
    { id: 'av-2', icon: 'fa-hard-hat', bg: 'bg-amber-500', color: 'text-slate-900', label: 'Casco Oro' },
    { id: 'av-3', icon: 'fa-user-astronaut', bg: 'bg-purple-600', color: 'text-white', label: 'Astronauta' },
    { id: 'av-4', icon: 'fa-robot', bg: 'bg-emerald-600', color: 'text-white', label: 'Robot Verde' },
    { id: 'av-5', icon: 'fa-shield-halved', bg: 'bg-red-600', color: 'text-white', label: 'Escudo Rojo' },
    { id: 'av-6', icon: 'fa-bolt', bg: 'bg-yellow-400', color: 'text-slate-900', label: 'Rayo Veloz' },
    { id: 'av-7', icon: 'fa-screwdriver-wrench', bg: 'bg-teal-600', color: 'text-white', label: 'Técnico Teal' },
    { id: 'av-8', icon: 'fa-compass-drafting', bg: 'bg-indigo-600', color: 'text-white', label: 'Ingeniero' },
    { id: 'av-9', icon: 'fa-industry', bg: 'bg-slate-700', color: 'text-white', label: 'Planta Gris' },
    { id: 'av-10', icon: 'fa-user-check', bg: 'bg-cyan-600', color: 'text-white', label: 'Auditor Cyan' }
];
