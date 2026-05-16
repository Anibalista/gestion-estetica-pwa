// src/components/Header.jsx
import { useState } from 'react'
import logo from '../assets/logo.jpeg'

export function Header({ session, isMenuOpen, setIsMenuOpen, handleLogout, setVistaActiva }) {
  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false)
  
  const inicial = session?.user?.email?.charAt(0).toUpperCase() || 'P'

  const navegarA = (vista) => {
    setVistaActiva(vista)
    setMenuPerfilAbierto(false)
  }

  const manejarClickHamburguesa = (e) => {
    // Evita que el click llegue al Dashboard y cierre el menú al instante
    e.stopPropagation()

    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header className="bg-white border-b border-stone-200 h-26 flex items-center justify-between px-4 shrink-0 shadow-sm relative z-40">
      {/* Izquierda: Botón Hamburguesa */}
      <div className="flex items-center gap-2">
        <button 
          onClick={manejarClickHamburguesa}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          <svg className="w-6 h-6 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 6h16M4 12h16M4 18h16" 
            />
          </svg>
        </button>
      </div>

      {/* Centro: Logotipo con imagen */}
      <div className="flex-1 flex justify-center">
        <button 
          onClick={() => setVistaActiva('inicio')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
        >
          <img 
            src={logo} 
            alt="Silmar Masajes Logo" 
            className="h-24 w-auto object-contain" 
          />
          <span className="hidden md:block font-medium tracking-widest text-stone-500 text-sm">
            SILMAR MASAJES
          </span>
        </button>
      </div>

      {/* Menú de perfil */}
      <div className="relative">
        <button 
          onClick={() => setMenuPerfilAbierto(!menuPerfilAbierto)}
          className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center justify-center shadow-md transition-all active:scale-95 border-2 border-white ring-2 ring-stone-100"
        >
          {inicial}
        </button>

        {menuPerfilAbierto && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setMenuPerfilAbierto(false)}
            ></div>
            
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-100 z-50 overflow-hidden transform origin-top-right transition-all">
              
              <div className="p-4 border-b border-stone-100 bg-stone-50/50">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">
                  Cuenta Activa
                </p>
                <p className="text-sm font-medium text-stone-700 truncate">
                  {session?.user?.email}
                </p>
              </div>

              <div className="p-2 flex flex-col gap-1">
                <button 
                  onClick={() => navegarA('personalizar')} 
                  className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-stone-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-colors"
                >
                  <span className="text-lg">🎨</span> Personalizar App
                </button>

                <button 
                  onClick={() => navegarA('empresa')} 
                  className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-stone-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-colors"
                >
                  <span className="text-lg">🏢</span> Mi Empresa
                </button>

                <button 
                  onClick={() => navegarA('mejoras')} 
                  className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-stone-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-colors"
                >
                  <span className="text-lg">💡</span> Sugerencias y Bugs
                </button>
              </div>

              <div className="p-2 border-t border-stone-100 bg-red-50/30">
                <button 
                  onClick={handleLogout} 
                  className="flex items-center justify-center gap-2 w-full text-center px-3 py-3 text-sm font-bold text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl transition-colors active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                    />
                  </svg>
                  CERRAR SESIÓN
                </button>
              </div>

            </div>
          </>
        )}
      </div>
    </header>
  )
}