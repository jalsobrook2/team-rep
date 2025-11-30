import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import ErrorBoundary from './ErrorBoundary'
import { AuthProvider } from './AuthContext'
import './styles.css'
import UiProvider from './components/UiProvider'

// Sentry (frontend) - initialize if VITE_SENTRY_DSN is set
let Sentry;
try{
  // Dynamic import to avoid build errors if package not installed
  Sentry = await import('@sentry/react');
  const { BrowserTracing } = await import('@sentry/tracing');
  const dsn = import.meta.env.VITE_SENTRY_DSN || '';
  if (dsn) {
    Sentry.init({
      dsn,
      integrations: [new BrowserTracing()],
      tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.05') || 0.05,
      environment: import.meta.env.MODE || 'development'
    });
    console.log('Sentry initialized for frontend');
  }
}catch(e){
  // if Sentry package isn't installed, silently continue
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <UiProvider>
          {/* If Sentry is present we can also wrap App in Sentry.ErrorBoundary but
              we keep the existing ErrorBoundary; Sentry will pick up unhandled errors */}
          <App />
        </UiProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
