// src/components/Header.jsx
import logo from '../assets/logo.jpeg'

export function Header({ session, isMenuOpen, setIsMenuOpen, handleLogout, setVistaActiva }) {
  return (
    <header className="h-26 bg-white border-b border-stone-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
      
      {/* Izquierda: Botón Hamburguesa */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
        >
          <svg className="w-6 h-6 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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

      {/* Derecha: Perfil / Logout */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <p className="text-xs font-bold text-stone-400 uppercase">Profesional</p>
          <p className="text-sm text-stone-600">{session.user.email.split('@')[0]}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold hover:bg-teal-700 transition-colors shadow-md"
        >
          {session.user.email.charAt(0).toUpperCase()}
        </button>
      </div>
    </header>
  )
}