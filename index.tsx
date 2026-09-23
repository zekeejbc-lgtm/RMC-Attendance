
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

window.addEventListener('error', event => console.error('[App] uncaught error', event.error || event.message));
window.addEventListener('unhandledrejection', event => console.error('[App] unhandled promise rejection', event.reason));

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
