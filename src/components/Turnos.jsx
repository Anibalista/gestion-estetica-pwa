// src/components/Turnos.jsx
import { useState, useEffect } from 'react'
import { TurnoFormulario } from './turnos/TurnoFormulario'
import { TurnosLista } from './turnos/TurnosLista'
import { TurnoDetalle } from './turnos/TurnoDetalle'

export function Turnos({ session, initialModo = 'agenda' }) {
  const [modo, setModo] = useState(initialModo)
  const [turnoAEditar, setTurnoAEditar] = useState(null)
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null) 

  useEffect(() => {
    setModo(initialModo)
    if (initialModo === 'nuevo-turno') setTurnoAEditar(null)
  }, [initialModo])

  const manejarEdicion = (turno) => {
    setTurnoAEditar(turno)
    setModo('nuevo-turno')
  }

  const manejarConsulta = (turno) => {
    setTurnoSeleccionado(turno)
    setModo('detalle')
  }

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center px-4">
        <div>
          <h2 className="text-2xl font-light text-stone-800">
            {modo === 'nuevo-turno' ? (turnoAEditar ? 'Editar Sesión' : 'Nueva Sesión') : 
            modo === 'detalle' ? 'Ficha de Sesión' : 'Agenda de Citas'}
          </h2>
        </div>
        {modo === 'agenda' && (
          <button 
            onClick={() => { setTurnoAEditar(null); setModo('nuevo-turno'); }} 
            className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-teal-700 transition active:scale-95"
          >
            + Agendar Turno
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex-1">
        {modo === 'nuevo-turno' ? (
          <TurnoFormulario 
            key={turnoAEditar ? turnoAEditar.id : 'nuevo'}
            session={session} 
            turnoInicial={turnoAEditar}
            onGuardar={() => setModo('agenda')}
            onCancelar={() => setModo('agenda')}
          />
        ) : modo === 'detalle' ? (
          <TurnoDetalle 
            turno={turnoSeleccionado} 
            onVolver={() => setModo('agenda')} 
          />
        ) : (
          <TurnosLista 
            session={session} 
            onEditar={manejarEdicion} 
            onVerDetalle={manejarConsulta}
          />
        )}
      </div>
    </div>
  )
}