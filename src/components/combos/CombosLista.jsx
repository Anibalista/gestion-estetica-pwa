// src/components/combos/CombosLista.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export function CombosLista({ session, onEditar, onNuevo }) {
  const [combos, setCombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [mostrarAnulados, setMostrarAnulados] = useState(false)

  useEffect(() => {
    fetchCombos()
  }, [session.user.id])

  const fetchCombos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('combos')
        .select(`
          *,
          combo_servicios (
            servicio_id,
            servicios ( nombre )
          )
        `)
        .eq('profesional_id', session.user.id)
        .order('nombre', { ascending: true })

      if (error) throw error
      setCombos(data)
    } catch (error) {
      console.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleAnular = async (e, combo) => {
    e.stopPropagation(); // Evita que se dispare el click de la tarjeta
    const nuevoEstado = !combo.activo;
    if (!window.confirm(`¿Seguro deseas ${nuevoEstado ? 'restaurar' : 'anular'} "${combo.nombre}"?`)) return;

    const { error } = await supabase.from('combos').update({ activo: nuevoEstado }).eq('id', combo.id)
    if (!error) fetchCombos();
  }

  // Lógica de filtrado
  const combosFiltrados = combos.filter(c => {
    const matchEstado = mostrarAnulados ? true : c.activo;
    const termino = busqueda.toLowerCase();
    
    // Busca en nombre del combo
    const matchNombreCombo = c.nombre.toLowerCase().includes(termino);
    
    // Busca en los nombres de los servicios dentro del combo
    const matchServicios = c.combo_servicios?.some(cs => 
      cs.servicios?.nombre.toLowerCase().includes(termino)
    );

    return matchEstado && (matchNombreCombo || matchServicios);
  })

  if (loading) return <div className="p-10 text-center text-stone-400">Cargando ofertas...</div>

  return (
    <div className="space-y-6">
      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="relative w-full md:w-1/2">
          <input 
            type="text" 
            placeholder="Buscar por nombre de combo o servicio..." 
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
            <input type="checkbox" checked={mostrarAnulados} onChange={(e) => setMostrarAnulados(e.target.checked)} className="w-4 h-4 text-teal-600 rounded" />
            Incluir anulados
          </label>
          <button onClick={onNuevo} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-teal-700 transition shadow-md">
            + Crear Combo
          </button>
        </div>
      </div>

      {/* GRILLA DE TARJETAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {combosFiltrados.map((combo) => (
          <div 
            key={combo.id}
            onClick={() => onEditar(combo)}
            className={`group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col ${!combo.activo ? 'opacity-60 grayscale' : ''}`}
          >
            {/* Cabecera: Nombre */}
            <div className="p-4 bg-stone-50 border-b border-stone-100">
              <h3 className="font-bold text-stone-800 truncate group-hover:text-teal-700 transition-colors uppercase tracking-tight">
                {combo.nombre}
              </h3>
            </div>

            {/* Imagen del Cuerpo */}
            <div className="aspect-video w-full bg-stone-200 overflow-hidden relative">
              <img 
                src={combo.url_imagen || 'https://via.placeholder.com/400x225?text=Sin+Imagen'} 
                alt={combo.nombre}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {!combo.activo && (
                <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
                  <span className="bg-white text-stone-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Anulado</span>
                </div>
              )}
            </div>

            {/* Info: Precio y Duración */}
            <div className="p-5 flex-1 flex flex-col justify-center text-center">
              <div className="text-3xl font-black text-stone-900 mb-1">
                ${combo.precio_actual}
              </div>
              <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                ⏱️ {combo.duracion_minutos || '--'} minutos
              </div>
            </div>

            {/* Acción: Anular */}
            <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex justify-end">
              <button 
                onClick={(e) => toggleAnular(e, combo)}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded transition-colors ${
                  combo.activo ? 'text-red-400 hover:bg-red-50 hover:text-red-600' : 'text-stone-400 hover:bg-stone-200 hover:text-stone-600'
                }`}
              >
                {combo.activo ? 'Anular Combo' : 'Restaurar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {combosFiltrados.length === 0 && (
        <div className="p-20 text-center text-stone-400 font-light bg-white rounded-2xl border border-dashed border-stone-200">
          No se encontraron combos con esos filtros.
        </div>
      )}
    </div>
  )
}