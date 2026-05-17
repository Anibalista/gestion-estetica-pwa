// src/components/Turnos.jsx
import { useState, useEffect } from 'react'
import { TurnoFormulario } from './turnos/TurnoFormulario'
import { TurnosLista } from './turnos/TurnosLista'
import { TurnoDetalle } from './turnos/TurnoDetalle'

export function Turnos({
  session,
  empresaActiva,
  rolEmpresa,
  initialModo = 'agenda'
}) {
  const [modo, setModo] = useState(initialModo)
  const [turnoAEditar, setTurnoAEditar] = useState(null)
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null)

  useEffect(() => {
    setModo(initialModo)

    if (initialModo === 'nuevo-turno') {
      setTurnoAEditar(null)
    }
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
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b border-stone-100 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-light text-stone-800">
            {modo === 'nuevo-turno'
              ? turnoAEditar
                ? 'Editar Sesión'
                : 'Registrar Sesión'
              : modo === 'detalle'
                ? 'Ficha de Sesión'
                : 'Agenda de Citas'}
          </h2>

          <p className="text-xs text-stone-400 mt-1">
            Empresa activa: <span className="font-bold text-teal-600">{empresaActiva?.nombre || 'Sin empresa'}</span>
            {rolEmpresa ? ` · Rol: ${rolEmpresa}` : ''}
          </p>
        </div>

        {modo === 'agenda' && (
          <button
            type="button"
            onClick={() => {
              setTurnoAEditar(null)
              setModo('nuevo-turno')
            }}
            className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-teal-700 transition active:scale-95"
          >
            + Registrar Sesión
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {modo === 'nuevo-turno' ? (
          <TurnoFormulario
            session={session}
            empresaActiva={empresaActiva}
            rolEmpresa={rolEmpresa}
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
            empresaActiva={empresaActiva}
            rolEmpresa={rolEmpresa}
            onEditar={manejarEdicion}
            onVerDetalle={manejarConsulta}
          />
        )}
      </div>
    </div>
  )
}