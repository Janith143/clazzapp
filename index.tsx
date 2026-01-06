
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Register PWA Service Worker (handles caching and updates)
import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('New content available, verify if reload is needed.');
    },
    onOfflineReady() {
      console.log('App is ready for offline use.');
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
