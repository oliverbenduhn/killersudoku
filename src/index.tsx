import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ChakraProvider } from '@chakra-ui/react';
import { registerSW } from 'virtual:pwa-register';

// PWA: Auto-Update. Im Dev-Modus ist die Registrierung inaktiv, weil
// vite-plugin-pwa die Funktionalität nur in Production-Bundles einspeist.
// Wir prüfen gegen NODE_ENV statt import.meta.env, damit ts-jest
// die Datei auch im Test-Modus parsen kann.
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  registerSW({ immediate: true });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ChakraProvider>
      <App />
    </ChakraProvider>
  </React.StrictMode>
);
