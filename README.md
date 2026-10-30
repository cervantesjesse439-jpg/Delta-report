# Delta Tech - Control de Calidad (Arquitectura Modular)

Esta es la versión modularizada y reestructurada de la aplicación **Delta Tech**. Se ha separado el antiguo archivo monolítico de más de 2,300 líneas en una arquitectura desacoplada basada en módulos ES6 nativos, compatible directamente con **GitHub Pages** sin necesidad de herramientas de compilación (*build tools*) ni dependencias complejas.

---

## 📁 Estructura del Proyecto

```text
├── index.html                  # Interfaz HTML pura y semántica (819 líneas)
├── css/
│   └── styles.css              # Estilos personalizados (Glassmorphism, animaciones, scrollbar)
├── js/
│   ├── config.js               # Configuración central de Firebase y constantes (PIN, slots, etc.)
│   ├── state.js                # Estado reactivo global compartido (Single Source of Truth)
│   ├── utils.js                # Utilidades de fecha, notificaciones y estado de red/sincronización
│   ├── services/
│   │   ├── firebase.js         # Inicialización de Auth, Firestore y colecciones
│   │   └── indexeddb.js        # Motor de almacenamiento local para fotos y compresión
│   ├── modules/
│   │   ├── admin.js            # Registro, slots y permisos de Administradores
│   │   ├── approvals.js        # Solicitudes y autorización por PIN de borrados
│   │   ├── wizard.js           # Flujo de registro paso a paso, piezas, cantidades y fotos
│   │   ├── dashboard.js        # KPIs en tiempo real, asignación de inspector y bitácora
│   │   └── reports.js          # Modal de reporte diario y generación de PDF con jsPDF
│   └── app.js                  # Punto de entrada principal (bootstrap y listeners)
```

---

## 🚀 Cómo actualizar en tu repositorio de GitHub

1. **En tu repositorio de GitHub**:
   * Elimina el archivo `index.html` anterior (o reemplázalo con el nuevo `index.html`).
2. **Sube los nuevos archivos y carpetas**:
   * Sube `index.html` a la raíz.
   * Sube la carpeta `css/` con su contenido.
   * Sube la carpeta `js/` con sus subcarpetas (`services/`, `modules/`) y archivos.
3. **¡Listo!**:
   * Como utiliza JavaScript Modules nativo (`<script type="module" src="js/app.js"></script>`), GitHub Pages lo sirve al instante sin requerir Node.js, Webpack ni Vite.
