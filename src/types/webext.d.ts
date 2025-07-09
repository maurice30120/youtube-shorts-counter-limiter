/// <reference types="webextension-polyfill" />

// Étendre les types WebExtension si nécessaire
declare global {
  // Si browser n'est pas disponible, on peut utiliser chrome
  const browser: typeof chrome;
  
  // Type pour Chart.js
  type ChartInstance = any;
  
  interface Window {
    browser?: typeof chrome;
  }
}

export {};
