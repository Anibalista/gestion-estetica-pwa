// src/components/Header.jsx

export function Header({ session, isMenuOpen, setIsMenuOpen, handleLogout }) {
  return (
    <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
      
      {/* Botón Hamburguesa */}
      <button 
        onClick={() => setIsMenuOpen(!isMenuOpen)} 
        className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
      >
        <svg className="w-6 h-6 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Logotipo */}
      <div className="flex-1 flex justify-center">
        <div className="bg-stone-50 border border-stone-200 px-6 py-1.5 rounded-full font-medium tracking-wide text-stone-600">
          SILMAR ESTÉTICA
        </div>
      </div>

      {/* Perfil y Logout */}
      <div className="flex items-center gap-3">
        <button 
          onClick={handleLogout}
          title="Cerrar sesión" 
          className="w-9 h-9 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold hover:bg-teal-700 transition-colors shadow-sm cursor-pointer"
        >
          {session.user.email.charAt(0).toUpperCase()}
        </button>
      </div>
    </header>
  )
}