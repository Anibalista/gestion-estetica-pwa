// src/components/Sidebar.jsx

// 1. Recibimos setIsMenuOpen en los props
export function Sidebar({ isMenuOpen, setVistaActiva, setIsMenuOpen }) {
  
  // 2. Creamos la función que hace ambas tareas
  const manejarSeleccion = (vista) => {
    setVistaActiva(vista);
    // Para que no moleste en monitores grandes, cerramos el menú
    // solo si la pantalla es chica (típico de celulares/tablets)
    // Si prefieres que se cierre SIEMPRE sin importar la pantalla, deja solo: setIsMenuOpen(false);
    if (window.innerWidth < 1024 && setIsMenuOpen) {
      setIsMenuOpen(false);
    }
  }

  return (
    <aside className={`${isMenuOpen ? 'w-64' : 'w-0'} bg-white border-r border-stone-200 overflow-y-auto transition-all duration-300 ease-in-out flex flex-col shrink-0`}>
      <div className="p-4 w-64">
        
        <MenuSection title="Turnos / Citas">
          {/* 3. Reemplazamos setVistaActiva por nuestra nueva función */}
          <MenuItem label="Nuevo turno" onClick={() => manejarSeleccion('nuevo-turno')} />
          <MenuItem label="Ver turnos" onClick={() => manejarSeleccion('agenda')} />
        </MenuSection>

        <MenuSection title="Servicios">
          <MenuItem label="Nuevo servicio" onClick={() => manejarSeleccion('nuevo-servicio')} />
          <MenuItem label="Combos" onClick={() => manejarSeleccion('combos')} />
          <MenuItem label="Insumos - Costos" onClick={() => manejarSeleccion('insumos')} />
          <MenuItem label="Ver servicios" onClick={() => manejarSeleccion('ver-servicios')} />
        </MenuSection>

        <MenuSection title="Productos">
          <MenuItem label="Ventas" onClick={() => manejarSeleccion('ventas')} />
          <MenuItem label="Registrar" onClick={() => manejarSeleccion('registrar-producto')} />
          <MenuItem label="Stock" onClick={() => manejarSeleccion('stock')} />
          <MenuItem label="Administrar" onClick={() => manejarSeleccion('admin-productos')} />
          <MenuItem label="Reportes" onClick={() => manejarSeleccion('reportes-productos')} />
        </MenuSection>

        <MenuSection title="Clientes">
          <MenuItem label="Nuevo cliente" onClick={() => manejarSeleccion('nuevo-cliente')} />
          <MenuItem label="Ver clientes" onClick={() => manejarSeleccion('clientes')} />
        </MenuSection>

      </div>
    </aside>
  )
}

function MenuSection({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 px-3">{title}</h3>
      <ul className="space-y-1">{children}</ul>
    </div>
  )
}

function MenuItem({ label, onClick }) {
  return (
    <li>
      <button 
        onClick={onClick}
        className="w-full text-left block px-3 py-2 rounded-md text-sm font-medium text-stone-600 hover:bg-teal-50 hover:text-teal-700 transition-colors"
      >
        {label}
      </button>
    </li>
  )
}