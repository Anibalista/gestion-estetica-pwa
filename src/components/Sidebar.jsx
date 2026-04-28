// src/components/Sidebar.jsx

// Agregamos una nueva prop: setVistaActiva
export function Sidebar({ isMenuOpen, setVistaActiva }) {
  return (
    <aside className={`${isMenuOpen ? 'w-64' : 'w-0'} bg-white border-r border-stone-200 overflow-y-auto transition-all duration-300 ease-in-out flex flex-col shrink-0`}>
      <div className="p-4 w-64">
        
        <MenuSection title="Panel">
          <MenuItem label="Inicio / Resumen" onClick={() => setVistaActiva('inicio')} />
        </MenuSection>

        <MenuSection title="Turnos / Citas">
          <MenuItem label="Agenda" onClick={() => setVistaActiva('agenda')} />
        </MenuSection>

        <MenuSection title="Pacientes">
          {/* Aquí es donde hacemos la magia de cambiar la pantalla */}
          <MenuItem label="Fichas de Clientes" onClick={() => setVistaActiva('clientes')} />
        </MenuSection>

        <MenuSection title="Configuración">
          <MenuItem label="Servicios y Combos" onClick={() => setVistaActiva('servicios')} />
          <MenuItem label="Insumos (Costos)" onClick={() => setVistaActiva('insumos')} />
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

// Convertimos el <a> en un <button> para que pueda recibir el evento onClick
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