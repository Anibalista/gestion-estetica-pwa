// src/components/Sidebar.jsx

export function Sidebar({ isMenuOpen }) {
  return (
    <aside className={`${isMenuOpen ? 'w-64' : 'w-0'} bg-white border-r border-stone-200 overflow-y-auto transition-all duration-300 ease-in-out flex flex-col shrink-0`}>
      <div className="p-4 w-64">
        <MenuSection title="Turnos / Citas">
          <MenuItem label="Nuevo turno" />
          <MenuItem label="Ver turnos" />
        </MenuSection>

        <MenuSection title="Servicios">
          <MenuItem label="Nuevo servicio" />
          <MenuItem label="Combos" />
          <MenuItem label="Insumos - Costos" />
        </MenuSection>

        <MenuSection title="Clientes">
          <MenuItem label="Nuevo cliente" />
          <MenuItem label="Ver clientes" />
        </MenuSection>
      </div>
    </aside>
  )
}

// Los mini-componentes ahora viven aquí, escondidos del App.jsx
function MenuSection({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 px-3">{title}</h3>
      <ul className="space-y-1">{children}</ul>
    </div>
  )
}

function MenuItem({ label }) {
  return (
    <li>
      <a href="#" className="block px-3 py-2 rounded-md text-sm font-medium text-stone-600 hover:bg-teal-50 hover:text-teal-700 transition-colors">
        {label}
      </a>
    </li>
  )
}