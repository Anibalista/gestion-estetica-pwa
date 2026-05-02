// src/components/Sidebar.jsx

export function Sidebar({ isMenuOpen, setVistaActiva }) {
  return (
    <aside className={`${isMenuOpen ? 'w-64' : 'w-0'} bg-white border-r border-stone-200 overflow-y-auto transition-all duration-300 ease-in-out flex flex-col shrink-0`}>
      <div className="p-4 w-64">
        
        {/* SECCIÓN: TURNOS / CITAS */}
        <MenuSection title="Turnos / Citas">
          <MenuItem 
            label="Nuevo turno" 
            onClick={() => setVistaActiva('nuevo-turno')} 
          />
          <MenuItem 
            label="Ver turnos" 
            onClick={() => setVistaActiva('agenda')} 
          />
        </MenuSection>

        {/* SECCIÓN: SERVICIOS */}
        <MenuSection title="Servicios">
          <MenuItem 
            label="Nuevo servicio" 
            onClick={() => setVistaActiva('nuevo-servicio')} 
          />
          <MenuItem 
            label="Combos" 
            onClick={() => setVistaActiva('combos')} 
          />
          <MenuItem 
            label="Insumos - Costos" 
            onClick={() => setVistaActiva('insumos')} 
          />
          <MenuItem 
            label="Ver servicios" 
            onClick={() => setVistaActiva('ver-servicios')} 
          />
        </MenuSection>

        {/* SECCIÓN: PRODUCTOS */}
        <MenuSection title="Productos">
          <MenuItem 
            label="Ventas" 
            onClick={() => setVistaActiva('ventas')} 
          />
          <MenuItem 
            label="Registrar" 
            onClick={() => setVistaActiva('registrar-producto')} 
          />
          <MenuItem 
            label="Stock" 
            onClick={() => setVistaActiva('stock')} 
          />
          <MenuItem 
            label="Administrar" 
            onClick={() => setVistaActiva('admin-productos')} 
          />
          <MenuItem 
            label="Reportes" 
            onClick={() => setVistaActiva('reportes-productos')} 
          />
        </MenuSection>

        {/* SECCIÓN: CLIENTES */}
        <MenuSection title="Clientes">
          <MenuItem 
            label="Nuevo cliente" 
            onClick={() => setVistaActiva('nuevo-cliente')} 
          />
          <MenuItem 
            label="Ver clientes" 
            onClick={() => setVistaActiva('clientes')} 
          />
        </MenuSection>

      </div>
    </aside>
  )
}

// Componentes auxiliares para mantener el código limpio
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