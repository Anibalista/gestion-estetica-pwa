// src/components/Combos.jsx
import { useState, useEffect } from 'react'
import { CombosLista } from './combos/CombosLista'
import { ComboFormulario } from './combos/ComboFormulario'

export function Combos({ session, initialModo = 'lista' }) {
  const [modo, setModo] = useState(initialModo)
  const [comboAEditar, setComboAEditar] = useState(null)

  useEffect(() => {
    setModo(initialModo)
    if (initialModo === 'formulario') setComboAEditar(null)
  }, [initialModo])

  const manejarEdicion = (combo) => {
    setComboAEditar(combo);
    setModo('formulario');
  }

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      {modo === 'lista' ? (
        <CombosLista 
          session={session} 
          onEditar={manejarEdicion} 
          onNuevo={() => {
            setComboAEditar(null) 
            setModo('formulario')
          }} 
        />
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
          <ComboFormulario 
            key={comboAEditar ? comboAEditar.id : 'nuevo'}
            session={session} 
            comboInicial={comboAEditar}
            onGuardar={() => setModo('lista')}
            onCancelar={() => setModo('lista')}
          />
        </div>
      )}
    </div>
  )
}