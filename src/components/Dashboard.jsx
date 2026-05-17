// src/components/Dashboard.jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Clientes } from './Clientes'
import { Productos } from './Productos'
import { Servicios } from './Servicios'
import { Combos } from './Combos'
import { Turnos } from './Turnos'
import { Ventas } from './Ventas'
import { Insumos } from './productos/Insumos'
import { ReportesAlertas } from './productos/ReportesAlertas'
import { InformesProductividad } from './turnos/InformesProductividad'
import { InformesIdeas } from './clientes/InformesIdeas'
import { InformesAdministracion } from './servicios/InformesAdministracion'

export function Dashboard({ session }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [vistaActiva, setVistaActiva] = useState('inicio') 

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const cerrarMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false)
    }
  }

  const vistasEnConstruccion = {
    'registrar-atencion': {
      titulo: 'Registrar Atención',
      descripcion: 'Acá vamos a registrar una atención realizada, asociarla a un cliente, turno, servicio, profesional y monto cobrado.',
      icono: '📝'
    },
    'cierre-caja': {
      titulo: 'Cierre de Caja',
      descripcion: 'Acá vamos a registrar y revisar el cierre diario de caja, ingresos, egresos y diferencias.',
      icono: '💵'
    },
    'reportes-comparativos': {
      titulo: 'Reportes Comparativos',
      descripcion: 'Acá vamos a comparar períodos, ventas, servicios, productos, clientes y rendimiento financiero.',
      icono: '📈'
    },
    'ver-transacciones': {
      titulo: 'Ver Transacciones',
      descripcion: 'Acá vamos a listar todas las transacciones económicas: cobros, pagos, ventas y movimientos de caja.',
      icono: '💳'
    },
    'informes-estadisticos': {
      titulo: 'Informes Estadísticos',
      descripcion: 'Acá vamos a mostrar estadísticas financieras, ingresos por período, medios de pago y evolución del negocio.',
      icono: '📉'
    }
  }

  const vistaConstruccion = vistasEnConstruccion[vistaActiva]
  const mostrarInsumos = vistaActiva === 'insumos' || vistaActiva === 'insumos-costos'
  const mostrarReportesAlertas = vistaActiva === 'reportes-alertas'
  const mostrarInformesProductividad = vistaActiva === 'informes-productividad'
  const mostrarInformesIdeas = vistaActiva === 'informes-ideas'
  const mostrarInformesAdministracion = vistaActiva === 'informes-administracion'

  return (
    <div 
      className="min-h-screen bg-stone-100 flex flex-col text-stone-800 font-sans"
      onClick={cerrarMenu}
    >
      
      <Header 
        session={session} 
        isMenuOpen={isMenuOpen} 
        setIsMenuOpen={setIsMenuOpen} 
        handleLogout={handleLogout} 
        setVistaActiva={setVistaActiva}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isMenuOpen={isMenuOpen} 
          setVistaActiva={setVistaActiva} 
          setIsMenuOpen={setIsMenuOpen} 
        />

        <main className="flex-1 p-6 overflow-y-auto">
          
          {vistaActiva === 'inicio' && (
            <div className="border-2 border-dashed border-stone-300 rounded-xl h-full flex flex-col items-center justify-center text-stone-400 bg-stone-50/50">
              <h2 className="text-2xl font-light text-stone-600 mb-2">
                ¡Hola, {session.user.email.split('@')[0]}!
              </h2>
              <p className="text-lg font-light">
                Este es tu resumen diario.
              </p>
            </div>
          )}

          {(vistaActiva === 'clientes' || vistaActiva === 'nuevo-cliente') && (
            <Clientes 
              session={session} 
              initialModo={vistaActiva === 'nuevo-cliente' ? 'formulario' : 'lista'} 
            />
          )}

          {(vistaActiva === 'registrar-producto' || vistaActiva === 'stock') && (
            <Productos 
              session={session} 
              initialModo={vistaActiva === 'registrar-producto' ? 'registrar' : 'stock'} 
            />
          )}

          {(vistaActiva === 'ver-servicios' || vistaActiva === 'nuevo-servicio') && (
            <Servicios 
              session={session} 
              initialModo={vistaActiva} 
            />
          )}

          {vistaActiva === 'combos' && (
            <Combos 
              session={session} 
              initialModo="lista" 
            />
          )}

          {(vistaActiva === 'agenda' || vistaActiva === 'nuevo-turno') && (
            <Turnos 
              session={session} 
              initialModo={vistaActiva} 
            />
          )}

          {vistaActiva === 'ventas' && (
            <Ventas 
              session={session} 
              initialModo="historial" 
            />
          )}

          {mostrarInsumos && (
            <Insumos session={session} />
          )}

          {mostrarReportesAlertas && (
            <ReportesAlertas session={session} />
          )}

          {mostrarInformesProductividad && (
            <InformesProductividad session={session} />
          )}

          {mostrarInformesIdeas && (
            <InformesIdeas session={session} />
          )}

          {mostrarInformesAdministracion && (
            <InformesAdministracion session={session} />
          )}

          {vistaActiva === 'personalizar' && (
            <VistaPerfilEnConstruccion
              icono="🎨"
              titulo="Personalizar App"
              descripcion="Aquí agregaremos la opción para cambiar colores, logos y el diseño de la PWA."
            />
          )}

          {vistaActiva === 'empresa' && (
            <VistaPerfilEnConstruccion
              icono="🏢"
              titulo="Mi Empresa"
              descripcion="Aquí cargaremos el CUIT, dirección comercial, redes sociales y nombre legal."
            />
          )}

          {vistaActiva === 'mejoras' && (
            <VistaPerfilEnConstruccion
              icono="💡"
              titulo="Buzón de Mejoras"
              descripcion="Un formulario simple para que reportes errores o pidas nuevas funciones."
            />
          )}

          {vistaConstruccion && !mostrarInsumos && !mostrarReportesAlertas && !mostrarInformesProductividad && !mostrarInformesIdeas && !mostrarInformesAdministracion && (
            <VistaEnConstruccion
              icono={vistaConstruccion.icono}
              titulo={vistaConstruccion.titulo}
              descripcion={vistaConstruccion.descripcion}
            />
          )}

        </main>
      </div>
    </div>
  )
}

function VistaEnConstruccion({ icono, titulo, descripcion }) {
  return (
    <div className="border-2 border-dashed border-stone-300 rounded-xl min-h-full flex items-center justify-center text-stone-400 bg-stone-50/50 p-6">
      <div className="max-w-2xl text-center bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
        <span className="text-5xl mb-4 block">
          {icono}
        </span>

        <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-2">
          En construcción
        </p>

        <h2 className="text-2xl font-light text-stone-800 mb-3">
          {titulo}
        </h2>

        <p className="text-stone-500">
          {descripcion}
        </p>
      </div>
    </div>
  )
}

function VistaPerfilEnConstruccion({ icono, titulo, descripcion }) {
  return (
    <div className="max-w-3xl mx-auto p-8 text-center bg-white rounded-2xl shadow-sm border border-stone-200 mt-10">
      <span className="text-5xl mb-4 block">
        {icono}
      </span>

      <h2 className="text-2xl font-light text-stone-800 mb-2">
        {titulo}
      </h2>

      <p className="text-stone-500">
        {descripcion}
      </p>
    </div>
  )
}