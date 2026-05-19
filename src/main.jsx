import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initTheme, listenBrowserThemeChanges } from './utils/themeManager'
import App from './App.jsx'

initTheme()
listenBrowserThemeChanges()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)