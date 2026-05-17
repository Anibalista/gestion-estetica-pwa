// src/components/Ventas.jsx
import { useState, useEffect } from 'react'
import { VentaFormulario } from './ventas/VentaFormulario'
import { VentasLista } from './ventas/VentasLista'

export function Ventas({
  session,
  empresaActiva,
  rolEmpresa,
  initialModo = 'historial'
}) {
  const [modo, setModo] = useState(initialModo)

  useEffect(() => {
    setModo(initialModo)
  }, [initialModo])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b border-stone-100 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-light text-stone-800">
            Caja y Ventas
          </h2>

          <p className="text-sm text-stone-500 font-light">
            Venta de productos e historial de facturación.
          </p>

          <p className="text-xs text-stone-400 mt-1">
            Empresa activa:{' '}
            <span className="font-bold text-teal-600">
              {empresaActiva?.nombre || 'Sin empresa'}
            </span>
            {rolEmpresa ? ` · Rol: ${rolEmpresa}` : ''}
          </p>
        </div>

        {modo !== 'nueva-venta' && (
          <button
            type="button"
            onClick={() => setModo('nueva-venta')}
            className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-teal-700 transition flex items-center gap-2"
          >
            Nueva Venta
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-stone-50">
        {modo === 'nueva-venta' ? (
          <VentaFormulario
            session={session}
            empresaActiva={empresaActiva}
            rolEmpresa={rolEmpresa}
            onGuardar={() => setModo('historial')}
            onCancelar={() => setModo('historial')}
          />
        ) : (
          <VentasLista
            session={session}
            empresaActiva={empresaActiva}
            rolEmpresa={rolEmpresa}
          />
        )}
      </div>
    </div>
  )
}