// src/components/Ventas.jsx
import { useState, useEffect } from 'react'
import { VentaFormulario } from './ventas/VentaFormulario'
import { VentasLista } from './ventas/VentasLista' // <--- IMPORTAMOS LA LISTA

export function Ventas({ session, initialModo = 'historial' }) {
  const [modo, setModo] = useState(initialModo)

  useEffect(() => {
    setModo(initialModo)
  }, [initialModo])

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center px-4">
        <div>
          <h2 className="text-2xl font-light text-stone-800">Caja y Ventas</h2>
          <p className="text-sm text-stone-500 font-light italic">Venta de productos e historial de facturación.</p>
        </div>
        {modo !== 'nueva-venta' && (
          <button 
            onClick={() => setModo('nueva-venta')} 
            className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-teal-700 transition flex items-center gap-2"
          >
            <span>🛒</span> Nueva Venta
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex-1">
        {modo === 'nueva-venta' ? (
          <VentaFormulario 
            session={session} 
            onGuardar={() => setModo('historial')}
            onCancelar={() => setModo('historial')}
          />
        ) : (
          /* AQUI MOSTRAMOS EL HISTORIAL REAL */
          <VentasLista session={session} /> 
        )}
      </div>
    </div>
  )
}