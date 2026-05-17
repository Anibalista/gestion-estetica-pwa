// src/components/Productos.jsx
import { useState, useEffect } from 'react'
import { ProductoFormulario } from './productos/ProductoFormulario'
import { ProductosStock } from './productos/ProductosStock'

export function Productos({
  session,
  empresaActiva,
  rolEmpresa,
  initialModo = 'stock'
}) {
  const [modo, setModo] = useState(initialModo)
  const [productoAEditar, setProductoAEditar] = useState(null)

  useEffect(() => {
    setModo(initialModo)

    if (initialModo === 'registrar') {
      setProductoAEditar(null)
    }
  }, [initialModo])

  const manejarEdicion = (producto) => {
    setProductoAEditar(producto)
    setModo('registrar')
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b border-stone-100 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-light text-stone-800">
            {modo === 'registrar'
              ? productoAEditar
                ? 'Editar Producto'
                : 'Nuevo Producto'
              : 'Control de Stock'}
          </h2>

          <p className="text-xs text-stone-400 mt-1">
            Empresa activa:{' '}
            <span className="font-bold text-teal-600">
              {empresaActiva?.nombre || 'Sin empresa'}
            </span>
            {rolEmpresa ? ` · Rol: ${rolEmpresa}` : ''}
          </p>
        </div>

        {modo === 'stock' && (
          <button
            type="button"
            onClick={() => {
              setProductoAEditar(null)
              setModo('registrar')
            }}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-teal-700 transition"
          >
            + Registrar Producto
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {modo === 'registrar' ? (
          <ProductoFormulario
            session={session}
            empresaActiva={empresaActiva}
            rolEmpresa={rolEmpresa}
            productoInicial={productoAEditar}
            onGuardadoExitoso={() => setModo('stock')}
            onCancelar={() => setModo('stock')}
          />
        ) : (
          <ProductosStock
            session={session}
            empresaActiva={empresaActiva}
            rolEmpresa={rolEmpresa}
            onEditar={manejarEdicion}
          />
        )}
      </div>
    </div>
  )
}