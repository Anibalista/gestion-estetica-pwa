// src/components/Sidebar.jsx
import { useState } from 'react'
import {
  CalendarClock,
  CalendarDays,
  ClipboardList,
  BarChart3,
  ShoppingCart,
  PackagePlus,
  Boxes,
  FlaskConical,
  AlertTriangle,
  UserPlus,
  Users,
  Lightbulb,
  HandPlatter,
  ListChecks,
  Layers,
  Settings,
  Wallet,
  ChartNoAxesCombined,
  ReceiptText,
  PieChart,
  ChevronDown
} from 'lucide-react'

export function Sidebar({ isMenuOpen, setVistaActiva, setIsMenuOpen }) {
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    turnos: false,
    productos: false,
    clientes: false,
    servicios: false,
    finanzas: false
  })

  const manejarSeleccion = (vista) => {
    setVistaActiva(vista)

    if (setIsMenuOpen) {
      setIsMenuOpen(false)
    }
  }

  const alternarSeccion = (seccion) => {
    setSeccionesAbiertas((prev) => ({
      ...prev,
      [seccion]: !prev[seccion]
    }))
  }

  return (
    <aside 
      className={`${isMenuOpen ? 'w-64' : 'w-0'} bg-white border-r border-stone-200 overflow-y-auto transition-all duration-300 ease-in-out flex flex-col shrink-0`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 w-64">
        
        <MenuSection 
          title="Turnos / Citas"
          Icon={CalendarClock}
          isOpen={seccionesAbiertas.turnos}
          onToggle={() => alternarSeccion('turnos')}
        >
          <MenuItem 
            label="Registrar Sesión" 
            Icon={CalendarDays}
            onClick={() => manejarSeleccion('nuevo-turno')} 
          />

          <MenuItem 
            label="Ver Turnos" 
            Icon={ClipboardList}
            onClick={() => manejarSeleccion('agenda')} 
          />

          <MenuItem 
            label="Informes - Productividad" 
            Icon={BarChart3}
            onClick={() => manejarSeleccion('informes-productividad')} 
          />
        </MenuSection>

        <MenuSection 
          title="Productos"
          Icon={Boxes}
          isOpen={seccionesAbiertas.productos}
          onToggle={() => alternarSeccion('productos')}
        >
          <MenuItem 
            label="Venta de Productos" 
            Icon={ShoppingCart}
            onClick={() => manejarSeleccion('ventas')} 
          />

          <MenuItem 
            label="Registrar Producto - Insumo" 
            Icon={PackagePlus}
            onClick={() => manejarSeleccion('registrar-producto')} 
          />

          <MenuItem 
            label="Administrar Stock" 
            Icon={Boxes}
            onClick={() => manejarSeleccion('stock')} 
          />

          <MenuItem 
            label="Insumos - Costos" 
            Icon={FlaskConical}
            onClick={() => manejarSeleccion('insumos-costos')} 
          />

          <MenuItem 
            label="Reportes - Alertas" 
            Icon={AlertTriangle}
            onClick={() => manejarSeleccion('reportes-alertas')} 
          />
        </MenuSection>

        <MenuSection 
          title="Clientes"
          Icon={Users}
          isOpen={seccionesAbiertas.clientes}
          onToggle={() => alternarSeccion('clientes')}
        >
          <MenuItem 
            label="Nuevo Cliente" 
            Icon={UserPlus}
            onClick={() => manejarSeleccion('nuevo-cliente')} 
          />

          <MenuItem 
            label="Ver Clientes" 
            Icon={Users}
            onClick={() => manejarSeleccion('clientes')} 
          />

          <MenuItem 
            label="Informes - Ideas" 
            Icon={Lightbulb}
            onClick={() => manejarSeleccion('informes-ideas')} 
          />
        </MenuSection>

        <MenuSection 
          title="Servicios"
          Icon={HandPlatter}
          isOpen={seccionesAbiertas.servicios}
          onToggle={() => alternarSeccion('servicios')}
        >
          <MenuItem 
            label="Registrar Servicio" 
            Icon={ListChecks}
            onClick={() => manejarSeleccion('nuevo-servicio')} 
          />

          <MenuItem 
            label="Ver Servicios" 
            Icon={ClipboardList}
            onClick={() => manejarSeleccion('ver-servicios')} 
          />

          <MenuItem 
            label="Combos" 
            Icon={Layers}
            onClick={() => manejarSeleccion('combos')} 
          />

          <MenuItem 
            label="Informes - Administración" 
            Icon={Settings}
            onClick={() => manejarSeleccion('informes-administracion')} 
          />
        </MenuSection>

        <MenuSection 
          title="Finanzas"
          Icon={Wallet}
          isOpen={seccionesAbiertas.finanzas}
          onToggle={() => alternarSeccion('finanzas')}
        >
          <MenuItem 
            label="Cierre de Caja" 
            Icon={Wallet}
            onClick={() => manejarSeleccion('cierre-caja')} 
          />

          <MenuItem 
            label="Reportes Comparativos" 
            Icon={ChartNoAxesCombined}
            onClick={() => manejarSeleccion('reportes-comparativos')} 
          />

          <MenuItem 
            label="Ver Transacciones" 
            Icon={ReceiptText}
            onClick={() => manejarSeleccion('ver-transacciones')} 
          />

          <MenuItem 
            label="Informes Estadísticos" 
            Icon={PieChart}
            onClick={() => manejarSeleccion('informes-estadisticos')} 
          />
        </MenuSection>

      </div>
    </aside>
  )
}

function MenuSection({ title, Icon, isOpen, onToggle, children }) {
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-stone-500 uppercase tracking-wider hover:bg-stone-100 hover:text-teal-700 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </span>

        <ChevronDown 
          className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        />
      </button>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
        <ul className="space-y-1">
          {children}
        </ul>
      </div>
    </div>
  )
}

function MenuItem({ label, Icon, onClick }) {
  return (
    <li>
      <button 
        type="button"
        onClick={onClick}
        className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-stone-600 hover:bg-teal-50 hover:text-teal-700 transition-colors"
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate" title={label}>
          {label}
        </span>
      </button>
    </li>
  )
}