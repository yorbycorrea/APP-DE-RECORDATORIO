// main.tsx — El punto de entrada absoluto de la aplicación React.
// ¿Por qué es tan pequeño?
// Su única responsabilidad es montar React en el DOM. Cualquier otra lógica
// (routing, providers, inicialización) va en App.tsx o sus hijos.
// Esto hace que sea trivial de entender y que el entry point no sea un "dumping ground".

import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

// ¿Por qué React.StrictMode?
// En desarrollo, StrictMode renderiza cada componente DOS VECES para detectar
// efectos secundarios no intencionados (efectos que deberían ser puros pero no lo son).
// También detecta patrones deprecated. En PRODUCCIÓN, StrictMode se elimina
// automáticamente — no hay penalidad de performance en producción.
//
// ¿Podría causar problemas con IndexedDB (doble llamada a loadReminders)?
// Sí — en desarrollo verás dos cargas. Por eso nuestra función getDB() usa
// un singleton: la segunda llamada reutiliza la conexión abierta por la primera.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Registro del Service Worker con vite-plugin-pwa
// ¿Por qué usamos el registro manual de vite-plugin-pwa en lugar del automático?
// El registro automático (registerType: 'autoUpdate' en vite.config.ts) lo hace
// vite-plugin-pwa, pero nosotros también necesitamos la referencia al SW para
// enviar mensajes (SCHEDULE_NOTIFICATION). Por eso en notifications.ts usamos
// navigator.serviceWorker.register() directamente con nuestro archivo sw.js.
//
// ¿Por qué no hay imports de React Router aquí?
// Esta app no tiene rutas múltiples — todo vive en '/' con estado local.
// Agregar React Router sería complejidad innecesaria. Si en el futuro
// añades una vista de "Calendario" o "Configuración", ese sería el momento.
