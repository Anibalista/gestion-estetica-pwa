// src/components/productos/ProductosStock.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export function ProductosStock({ session, onEditar }) {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Estados para los filtros
  const [busqueda, setBusqueda] = useState('')
  const [mostrarAnulados, setMostrarAnulados] = useState(false)

  useEffect(() => {
    fetchProductos()
  }, [session.user.id])

  const fetchProductos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('profesional_id', session.user.id)
      .order('descripcion', { ascending: true })

    if (!error) setProductos(data)
    setLoading(false)
  }

  // Función para Anular o Restaurar un producto
  const toggleAnular = async (producto) => {
    const esActivo = producto.activo !== false; // Si es null o true, asumimos que está activo
    const nuevoEstado = !esActivo;
    const accion = nuevoEstado ? 'restaurar' : 'anular';

    if (!window.confirm(`¿Estás seguro de que deseas ${accion} el producto "${producto.descripcion}"?`)) return;

    try {
      const { error } = await supabase
        .from('productos')
        .update({ activo: nuevoEstado })
        .eq('id', producto.id)

      if (error) throw error

      // Actualizamos el estado local sin tener que recargar toda la base de datos
      setProductos(prev => prev.map(p => p.id === producto.id ? { ...p, activo: nuevoEstado } : p))
    } catch (error) {
      alert("Error al cambiar el estado: " + error.message)
    }
  }

  // Aplicamos los filtros a la lista original
  const productosFiltrados = productos.filter(p => {
    const esActivo = p.activo !== false;
    const matchEstado = mostrarAnulados ? true : esActivo;
    
    const termino = busqueda.toLowerCase();
    const matchBusqueda = 
      (p.descripcion && p.descripcion.toLowerCase().includes(termino)) || 
      (p.codigo && p.codigo.toLowerCase().includes(termino));

    return matchEstado && matchBusqueda;
  })

  if (loading) return <div className="p-10 text-center text-stone-400">Cargando inventario...</div>

  return (
    <div className="flex flex-col h-full">
      
      {/* BARRA DE HERRAMIENTAS Y FILTROS */}
      <div className="bg-stone-50 p-4 border-b border-stone-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        
        {/* Buscador */}
        <div className="relative w-full sm:w-1/2 md:w-1/3">
          <input 
            type="text" 
            placeholder="Buscar por código o descripción..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
          />
          <svg className="w-5 h-5 text-stone-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Checkbox Anulados */}
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-stone-600 hover:text-stone-800 transition-colors">
          <input 
            type="checkbox" 
            checked={mostrarAnulados}
            onChange={(e) => setMostrarAnulados(e.target.checked)}
            className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
          />
          Incluir productos anulados
        </label>
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm text-stone-600">
          <thead className="bg-white border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-bold">
            <tr>
              <th className="px-6 py-4">Código</th>
              <th className="px-6 py-4">Descripción</th>
              <th className="px-6 py-4 text-center">Stock (Unid / Suelto)</th>
              <th className="px-6 py-4 text-center">Precio Venta</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            
            {productosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-stone-400 font-light">
                  No se encontraron productos con esos filtros.
                </td>
              </tr>
            ) : (
              productosFiltrados.map((p) => {
                const esActivo = p.activo !== false;
                const alertaStock = p.unidades_enteras <= p.stock_minimo;

                return (
                  <tr key={p.id} className={`hover:bg-stone-50 group transition-colors ${!esActivo ? 'bg-stone-50 opacity-60 grayscale' : ''}`}>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-stone-500">
                      {p.codigo}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className={`font-medium ${!esActivo ? 'text-stone-500 line-through' : 'text-stone-800'}`}>
                        {p.descripcion}
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        {p.dosificacion} {p.unidad_medida} | Costo: ${p.costo_unidad}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <div className={`font-bold text-sm ${alertaStock && esActivo ? 'text-red-500' : 'text-stone-700'}`}>
                        {p.unidades_enteras || 0} unid.
                      </div>
                      <div className="text-xs text-stone-400">
                        + {p.cantidad_suelta || 0} {p.unidad_medida}
                      </div>
                      {alertaStock && esActivo && (
                        <span className="block text-[9px] text-red-500 font-bold uppercase tracking-widest mt-1">Reponer</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 text-center font-medium text-stone-800">
                      ${p.precio_venta}
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onEditar(p)}
                          className="bg-stone-100 text-stone-600 px-3 py-1.5 rounded hover:bg-teal-100 hover:text-teal-700 transition-all text-xs font-bold"
                        >
                          EDITAR
                        </button>
                        <button 
                          onClick={() => toggleAnular(p)}
                          className={`px-3 py-1.5 rounded transition-all text-xs font-bold ${
                            esActivo 
                              ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-800' 
                              : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                          }`}
                        >
                          {esActivo ? 'ANULAR' : 'RESTAURAR'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}

          </tbody>
        </table>
      </div>
    </div>
  )
}