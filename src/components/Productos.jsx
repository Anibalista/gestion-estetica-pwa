// src/components/Productos.jsx
import { useState, useEffect } from 'react'
import { ProductoFormulario } from './productos/ProductoFormulario'
import { ProductosStock } from './productos/ProductosStock'

export function Productos({ session, initialModo = 'stock' }) {
  const [modo, setModo] = useState(initialModo)
  const [productoAEditar, setProductoAEditar] = useState(null)

  useEffect(() => {
    setModo(initialModo)
    if (initialModo === 'registrar') setProductoAEditar(null)
  }, [initialModo])

  const manejarEdicion = (prod) => {
    setProductoAEditar(prod)
    setModo('registrar')
  }

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-light text-stone-800">
          {modo === 'registrar' ? (productoAEditar ? 'Editar Producto' : 'Nuevo Producto') : 'Control de Stock'}
        </h2>
        {modo === 'stock' && (
          <button onClick={() => setModo('registrar')} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-teal-700 transition">
            + Registrar Producto
          </button>
        )}
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        {modo === 'registrar' ? (
          <ProductoFormulario 
            key={productoAEditar ? productoAEditar.id : 'nuevo'}
            session={session} 
            productoInicial={productoAEditar}
            onGuardadoExitoso={() => setModo('stock')} 
            onCancelar={() => setModo('stock')}
          />
        ) : (
          <ProductosStock session={session} onEditar={manejarEdicion} />
        )}
      </div>
    </div>
  )
}