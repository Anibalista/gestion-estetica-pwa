// src/utils/themeManager.js

const THEME_STORAGE_KEY = 'esteticapp_theme'

export const APP_THEMES = [
  {
    id: 'normal',
    nombre: 'Normal',
    descripcion: 'Tema claro profesional actual'
  },
  {
    id: 'dark',
    nombre: 'Dark',
    descripcion: 'Modo oscuro elegante'
  },
  {
    id: 'healthy',
    nombre: 'Healthy',
    descripcion: 'Natural, relajante y verdoso'
  },
  {
    id: 'glitter',
    nombre: 'Glitter',
    descripcion: 'Claro, luminoso y dorado'
  },
  {
    id: 'glamour',
    nombre: 'Glamour',
    descripcion: 'Pastel rosa y femenino'
  }
]

export function getSupportedThemeIds() {
  return APP_THEMES.map((theme) => theme.id)
}

export function isValidTheme(themeId) {
  return getSupportedThemeIds().includes(themeId)
}

export function getSavedTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)

    if (isValidTheme(savedTheme)) {
      return savedTheme
    }

    return null
  } catch (error) {
    console.warn('No se pudo leer el tema guardado:', error)
    return null
  }
}

export function getBrowserPreferredTheme() {
  if (typeof window === 'undefined') {
    return 'normal'
  }

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches

  return prefersDark ? 'dark' : 'normal'
}

export function getInitialTheme() {
  const savedTheme = getSavedTheme()

  if (savedTheme) {
    return savedTheme
  }

  return getBrowserPreferredTheme()
}

export function applyTheme(themeId, options = {}) {
  const { persist = false } = options
  const safeTheme = isValidTheme(themeId) ? themeId : 'normal'

  document.documentElement.dataset.theme = safeTheme
  document.documentElement.style.colorScheme = safeTheme === 'dark' ? 'dark' : 'light'

  if (persist) {
    saveTheme(safeTheme)
  }

  return safeTheme
}

export function saveTheme(themeId) {
  if (!isValidTheme(themeId)) {
    return
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId)
  } catch (error) {
    console.warn('No se pudo guardar el tema:', error)
  }
}

export function clearSavedTheme() {
  try {
    localStorage.removeItem(THEME_STORAGE_KEY)
  } catch (error) {
    console.warn('No se pudo limpiar el tema guardado:', error)
  }
}

export function initTheme() {
  const initialTheme = getInitialTheme()

  applyTheme(initialTheme, { persist: false })

  return initialTheme
}

export function listenBrowserThemeChanges() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {}
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const handleChange = () => {
    const savedTheme = getSavedTheme()

    if (savedTheme) {
      return
    }

    applyTheme(getBrowserPreferredTheme(), { persist: false })
  }

  mediaQuery.addEventListener?.('change', handleChange)

  return () => {
    mediaQuery.removeEventListener?.('change', handleChange)
  }
}