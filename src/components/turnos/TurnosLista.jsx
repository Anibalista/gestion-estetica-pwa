// src/components/turnos/TurnosLista.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export function TurnosLista({ session, onEditar }) {
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [verAnteriores, setVerAnteriores] = useState(false)

  // 1. FUNCIÓN DE FORMATEO (Definida correctamente aquí)
  const formatearFechaHora = (isoString) => {
    if (!isoString) return { dia: '--/--/--', hora: '--:--' };
    
    // Convertimos el string de la BD a un objeto Date local
    const fecha = new Date(isoString);
    
    return {
      dia: fecha.toLocaleDateString('es-AR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        timeZone: 'America/Argentina/Buenos_Aires' // Forzamos tu zona horaria
      }),
      hora: fecha.toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Argentina/Buenos_Aires'
      })
    };
  }

  useEffect(() => {
    fetchTurnos()
  }, [session.user.id, verAnteriores])

  const fetchTurnos = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('sesiones')
        .select(`
          *,
          clientes ( nombre, telefono ),
          sesion_detalles (
            servicio_id,    
            combo_id,         
            precio_cobrado,
            servicios ( nombre, duracion_minutos ),
            combos ( nombre, duracion_minutos )
          )
        `)
        .eq('profesional_id', session.user.id)
        .order('fecha_hora', { ascending: true })

      if (!verAnteriores) {
        // Solo desde hoy a las 00:00 en adelante
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        query = query.gte('fecha_hora', hoy.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setTurnos(data || []);
    } catch (err) {
      console.error("Error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const cambiarEstado = async (id, nuevoEstado) => {
    const { error } = await supabase.from('sesiones').update({ estado: nuevoEstado }).eq('id', id);
    if (!error) {
      setTurnos(prev => prev.map(t => t.id === id ? { ...t, estado: nuevoEstado } : t));
    }
  }

  const turnosFiltrados = turnos.filter(t => {
    const matchEstado = filtroEstado === 'Todos' || t.estado === filtroEstado;
    const matchBusqueda = t.clientes?.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusqueda;
  })

  if (loading) return <div className="p-10 text-center text-stone-400 font-light">Cargando agenda...</div>

  return (
    <div className="flex flex-col h-full bg-white">
      
      {/* BARRA DE FILTROS RESPONSIVE */}
      <div className="bg-stone-50 p-4 border-b border-stone-200 space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Buscar por paciente..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
            <svg className="w-5 h-5 text-stone-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-500 uppercase bg-white px-4 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 transition-colors">
            <input 
              type="checkbox" 
              checked={verAnteriores} 
              onChange={(e) => setVerAnteriores(e.target.checked)} 
              className="w-4 h-4 text-teal-600 rounded cursor-pointer" 
            />
            Ver días anteriores
          </label>
        </div>

        {/* SELECTOR DE ESTADOS (Con Scroll Horizontal en Móvil) */}
        <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar">
          {['Todos', 'Pendiente', 'Cobrada', 'Ausente', 'Anulada'].map(est => (
            <button
              key={est}
              onClick={() => setFiltroEstado(est)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                filtroEstado === est 
                ? 'bg-teal-600 text-white shadow-md' 
                : 'bg-white text-stone-400 border border-stone-200 hover:border-stone-400'
              }`}
            >
              {est}
            </button>
          ))}
        </div>
      </div>

      {/* LISTADO DE TURNOS */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm text-stone-600">
          <thead className="bg-white border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-bold">
            <tr>
              <th className="px-6 py-4">Cita</th>
              <th className="px-6 py-4">Paciente</th>
              <th className="px-6 py-4">Detalle</th>
              <th className="px-6 py-4 text-center">Cobro</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {turnosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-stone-400 font-light italic">
                  No hay turnos agendados para este periodo.
                </td>
              </tr>
            ) : (
              turnosFiltrados.map((t) => {
                const { dia, hora } = formatearFechaHora(t.fecha_hora);
                return (
                  <tr key={t.id} className={`hover:bg-stone-50/50 group transition-colors ${t.estado === 'Anulada' || t.estado === 'Ausente' ? 'opacity-50 grayscale bg-stone-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-black text-stone-700">{dia}</div>
                      <div className="text-teal-600 font-bold text-xs">{hora} hs</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-stone-800">{t.clientes?.nombre}</div>
                      <div className="text-[10px] text-stone-400 font-mono">{t.clientes?.telefono}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {t.sesion_detalles?.map((d, i) => (
                          <span key={i} className="bg-stone-100 text-stone-500 text-[9px] px-2 py-0.5 rounded border border-stone-200 font-bold uppercase">
                            {d.servicios?.nombre || d.combos?.nombre}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-stone-800 font-black">${t.monto_cobrado > 0 ? t.monto_cobrado : t.monto_total}</div>
                      {t.monto_cobrado > 0 && t.monto_cobrado !== t.monto_total && (
                        <div className="text-[9px] text-amber-600 font-bold line-through">${t.monto_total}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <select 
                        value={t.estado} 
                        onChange={(e) => cambiarEstado(t.id, e.target.value)}
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border-none outline-none cursor-pointer shadow-sm ${
                          t.estado === 'Cobrada' ? 'bg-teal-100 text-teal-700' :
                          t.estado === 'Anulada' ? 'bg-red-100 text-red-700' :
                          t.estado === 'Ausente' ? 'bg-stone-200 text-stone-600' :
                          'bg-amber-100 text-amber-700'
                        }`}
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Cobrada">Cobrada</option>
                        <option value="Anulada">Anulada</option>
                        <option value="Ausente">Ausente</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => onEditar(t)}
                        className="bg-white border border-stone-200 text-stone-400 hover:text-teal-600 p-2 rounded-xl transition-all shadow-sm active:scale-90"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
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