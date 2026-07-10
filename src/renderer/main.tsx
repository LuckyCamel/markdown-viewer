import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { logError } from './logger'
import './styles/globals.css'
import 'katex/dist/katex.min.css'
import './styles/code-theme.css'
import './lib/highlight'

window.addEventListener('error', (event) => {
  logError('window:error', event.error ?? event.message)
})
window.addEventListener('unhandledrejection', (event) => {
  logError('unhandledRejection', event.reason)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
