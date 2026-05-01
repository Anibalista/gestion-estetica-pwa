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
       {/* ... (Título y botones de la lista) ... */}

       {modo === 'lista' ? (
         <CombosLista session={session} onEditar={manejarEdicion} onNuevo={() => setModo('formulario')} />
       ) : (
         <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
           <ComboFormulario 
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