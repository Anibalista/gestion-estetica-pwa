// src/components/Turnos.jsx
import { useState, useEffect } from 'react'
import { TurnoFormulario } from './turnos/TurnoFormulario'
import { TurnosLista } from './turnos/TurnosLista'

export function Turnos({ session, initialModo = 'agenda' }) {
  const [modo, setModo] = useState(initialModo)
  const [turnoAEditar, setTurnoAEditar] = useState(null) // <--- Estado para el turno a editar

  useEffect(() => {
    setModo(initialModo)
    // Si entramos a "nuevo-turno" desde el sidebar, limpiamos el editor
    if (initialModo === 'nuevo-turno') setTurnoAEditar(null)
  }, [initialModo])

  const manejarEdicion = (turno) => {
    setTurnoAEditar(turno) // Guardamos el turno que viene de la lista
    setModo('nuevo-turno') // Cambiamos al modo formulario
  }

  const manejarGuardado = () => {
    setTurnoAEditar(null)
    setModo('agenda')
  }

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center px-4">
        <div>
          <h2 className="text-2xl font-light text-stone-800">
            {modo === 'nuevo-turno' ? (turnoAEditar ? 'Editar Sesión' : 'Nueva Sesión') : 'Agenda de Citas'}
          </h2>
          <p className="text-sm text-stone-500 font-light italic">
            {modo === 'nuevo-turno' ? 'Completa los detalles de la prestación.' : 'Historial de sesiones y estados de cobro.'}
          </p>
        </div>
        {modo !== 'nuevo-turno' && (
          <button 
            onClick={() => { setTurnoAEditar(null); setModo('nuevo-turno'); }} 
            className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-teal-700 transition active:scale-95 flex items-center gap-2"
          >
            <span>+</span> Agendar Turno
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex-1">
        {modo === 'nuevo-turno' ? (
          <TurnoFormulario 
            session={session} 
            turnoInicial={turnoAEditar} // <--- Pasamos el turno al formulario
            onGuardar={manejarGuardado}
            onCancelar={() => setModo('agenda')}
          />
        ) : (
          <TurnosLista 
            session={session} 
            onEditar={manejarEdicion} // <--- Conectamos la función de editar
          />
        )}
      </div>
    </div>
  )
}