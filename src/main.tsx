import '@fontsource-variable/inter';
import '@fontsource-variable/schibsted-grotesk';
import '@fontsource/b612-mono/400.css';
import './ui/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { ToastProvider } from './ui/Toast';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
