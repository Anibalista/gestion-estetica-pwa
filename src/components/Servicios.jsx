// src/components/Servicios.jsx
import { useState, useEffect } from 'react'
import { ServiciosLista } from './servicios/ServiciosLista'
import { ServicioFormulario } from './servicios/ServicioFormulario'

export function Servicios({ session, initialModo = 'ver-servicios' }) {
  const [modo, setModo] = useState(initialModo)
  const [servicioAEditar, setServicioAEditar] = useState(null)

  useEffect(() => {
    setModo(initialModo)
    if (initialModo === 'nuevo-servicio') setServicioAEditar(null)
  }, [initialModo])

  const manejarEdicion = (servicio) => {
    setServicioAEditar(servicio)
    setModo('nuevo-servicio')
  }

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-light text-stone-800">
          {modo === 'ver-servicios' ? 'Catálogo de Servicios' : (servicioAEditar ? 'Editar Servicio' : 'Nuevo Servicio')}
        </h2>
        {modo === 'ver-servicios' && (
          <button 
            onClick={() => setModo('nuevo-servicio')} 
            className="bg-teal-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-teal-700 transition"
          >
            + Registrar Servicio
          </button>
        )}
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex-1">
        {modo === 'ver-servicios' ? (
        <ServiciosLista 
            session={session} 
            onEditar={manejarEdicion} 
        />
        ) : (
        <ServicioFormulario 
            session={session} 
            servicioInicial={servicioAEditar}
            onGuardar={() => setModo('ver-servicios')}
            onCancelar={() => setModo('ver-servicios')}
        />
        )}
    </div>
    </div>
  )
}