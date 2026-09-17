import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';

// Detect iOS standalone / PWA mode to ensure flawless safe-area behavior
if (typeof window !== 'undefined') {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '') || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = (window.navigator as any).standalone === true || 
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);
  if (isIOS) {
    document.documentElement.classList.add('is-ios');
  }
  if (isIOS && isStandalone) {
    document.documentElement.classList.add('ios-standalone');
  }
}

// Intercept window.print to handle iframe limitations gracefully in preview
const originalPrint = window.print;
window.print = function(...args: any[]) {
  if (window.self !== window.top) {
    window.dispatchEvent(new CustomEvent('print-blocked-warning'));
    return;
  }
  originalPrint.apply(this, args as any);
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
