import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker: solo en producción y en el navegador (dentro del APK los archivos ya son locales).
const insideNativeShell = 'Capacitor' in window;
if (import.meta.env.PROD && 'serviceWorker' in navigator && !insideNativeShell) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((err) => console.warn('No se pudo registrar el service worker:', err));
  });
}
