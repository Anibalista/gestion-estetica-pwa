// src/components/servicios/ServiciosLista.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export function ServiciosLista({ session, onEditar, onNuevo }) {
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [busqueda, setBusqueda] = useState('')
  const [mostrarAnulados, setMostrarAnulados] = useState(false)

  useEffect(() => {
    fetchServicios()
  }, [session.user.id])

  const fetchServicios = async () => {
    setLoading(true)
    try {
      // 1. Consulta avanzada: Traemos la relación, el servicio y sus costos asociados
      const { data, error } = await supabase
        .from('servicio_profesional')
        .select(`
          servicios (
            id,
            nombre,
            activo,
            precio_actual,
            descripcion,
            duracion_minutos,
            beneficios,
            costo_servicio ( monto )
          )
        `)
        .eq('profesional_id', session.user.id)

      if (error) throw error

      // 2. Aplanamos y calculamos el costo total
      const datosFormateados = data
        .map(item => {
          const s = item.servicios;
          if (!s) return null;
          
          // Sumamos todos los montos de la tabla costo_servicio
          const costoTotal = s.costo_servicio?.reduce((acc, costo) => acc + Number(costo.monto), 0) || 0;
          
          return { ...s, costo_total: costoTotal };
        })
        .filter(Boolean)

      // Ordenar alfabéticamente
      datosFormateados.sort((a, b) => a.nombre.localeCompare(b.nombre))
      setServicios(datosFormateados)

    } catch (error) {
      console.error("Error cargando servicios:", error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleAnular = async (servicio) => {
    const nuevoEstado = !servicio.activo;
    const accion = nuevoEstado ? 'restaurar' : 'anular';

    if (!window.confirm(`¿Estás seguro de que deseas ${accion} el servicio "${servicio.nombre}"?`)) return;

    try {
      const { error } = await supabase
        .from('servicios')
        .update({ activo: nuevoEstado })
        .eq('id', servicio.id)

      if (error) throw error
      setServicios(prev => prev.map(s => s.id === servicio.id ? { ...s, activo: nuevoEstado } : s))
    } catch (error) {
      alert("Error al cambiar el estado: " + error.message)
    }
  }

  // Filtros locales
  const serviciosFiltrados = servicios.filter(s => {
    const matchEstado = mostrarAnulados ? true : s.activo;
    const matchBusqueda = s.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusqueda;
  })

  if (loading) return <div className="p-10 text-center text-stone-400">Cargando servicios...</div>

  return (
    <div className="flex flex-col h-full">
      {/* BARRA SUPERIOR */}
      <div className="bg-stone-50 p-4 border-b border-stone-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-1/2">
          <input 
            type="text" 
            placeholder="Buscar servicio por nombre..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
          />
          <svg className="w-5 h-5 text-stone-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-stone-600">
            <input 
              type="checkbox" 
              checked={mostrarAnulados}
              onChange={(e) => setMostrarAnulados(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded cursor-pointer"
            />
            Ver anulados
          </label>
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto flex-1 pb-20 relative z-10"> {/* pb-20 para que los popups no se corten al final */}
        <table className="w-full text-left text-sm text-stone-600">
          <thead className="bg-white border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-bold">
            <tr>
              <th className="px-6 py-4">Servicio (Hover para Beneficios)</th>
              <th className="px-6 py-4">Descripción</th>
              <th className="px-6 py-4 text-center">Duración</th>
              <th className="px-6 py-4 text-center">Costos</th>
              <th className="px-6 py-4 text-center">Precio Público</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {serviciosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-stone-400 font-light">
                  No se encontraron servicios.
                </td>
              </tr>
            ) : (
              serviciosFiltrados.map((s) => {
                const gananciaEstimada = s.precio_actual - s.costo_total;

                return (
                  <tr key={s.id} className={`hover:bg-stone-50 group transition-colors ${!s.activo ? 'bg-stone-50 opacity-60 grayscale' : ''}`}>
                    
                    {/* NOMBRE Y POPUP (TOOLTIP) DE BENEFICIOS */}
                    <td className="px-6 py-4 relative">
                      <div className="group/tooltip inline-block cursor-help">
                        <span className={`font-bold ${!s.activo ? 'text-stone-500 line-through' : 'text-teal-700'}`}>
                          {s.nombre}
                        </span>
                        
                        {/* El Popup ahora abre hacia ABAJO (top-full mt-2) */}
                        {s.beneficios && (
                          <div className="absolute left-6 top-full mt-2 hidden group-hover/tooltip:block w-64 p-3 bg-stone-800 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none">
                            {/* Triangulito apuntando hacia arriba */}
                            <div className="absolute bottom-full left-4 -mb-[1px] border-4 border-transparent border-b-stone-800"></div>
                            
                            <p className="font-bold text-teal-300 mb-1 uppercase tracking-wider">Beneficios</p>
                            <p className="whitespace-pre-wrap">{s.beneficios}</p>
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-xs text-stone-500 max-w-xs truncate" title={s.descripcion}>
                      {s.descripcion || 'Sin descripción'}
                    </td>
                    
                    <td className="px-6 py-4 text-center font-medium">
                      {s.duracion_minutos ? `${s.duracion_minutos} min` : '-'}
                    </td>
                    
                    <td className="px-6 py-4 text-center text-red-500 font-medium">
                      ${s.costo_total.toFixed(2)}
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <div className="font-bold text-stone-800">${s.precio_actual}</div>
                      <div className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">
                        Neto: ${gananciaEstimada.toFixed(2)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onEditar(s)}
                          className="bg-stone-100 text-stone-600 px-3 py-1.5 rounded hover:bg-teal-100 hover:text-teal-700 transition-all text-xs font-bold"
                        >
                          EDITAR
                        </button>
                        <button 
                          onClick={() => toggleAnular(s)}
                          className={`px-3 py-1.5 rounded transition-all text-xs font-bold ${
                            s.activo 
                              ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-800' 
                              : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                          }`}
                        >
                          {s.activo ? 'ANULAR' : 'RESTAURAR'}
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