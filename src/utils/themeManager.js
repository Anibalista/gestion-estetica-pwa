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

export function applyFontSize(size = 'mediano') {
  const safeSize = ['chico', 'mediano', 'grande'].includes(size)
    ? size
    : 'mediano'

  document.documentElement.dataset.fontSize = safeSize

  return safeSize
}

export function applyDensity(density = 'comoda') {
  const safeDensity = ['comoda', 'compacta'].includes(density)
    ? density
    : 'comoda'

  document.documentElement.dataset.densityUi = safeDensity

  return safeDensity
}

export function applyUIPreferences(preferences = {}, options = {}) {
  const { persistTheme = false } = options

  const selectedTheme = preferences.tema || getBrowserPreferredTheme()

  applyTheme(selectedTheme, {
    persist: persistTheme && Boolean(preferences.tema)
  })

  applyFontSize(preferences.tamano_fuente || 'mediano')
  applyDensity(preferences.densidad_ui || 'comoda')

  if (!preferences.tema) {
    clearSavedTheme()
  }

  return {
    tema: selectedTheme,
    tamano_fuente: preferences.tamano_fuente || 'mediano',
    densidad_ui: preferences.densidad_ui || 'comoda'
  }
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
  applyFontSize('mediano')
  applyDensity('comoda')

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