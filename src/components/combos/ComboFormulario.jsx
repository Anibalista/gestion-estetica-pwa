// src/components/combos/ComboFormulario.jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { capitalizarNombres } from '../../utils/formatters'

export function ComboFormulario({ comboInicial, session, onGuardar, onCancelar }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  
  // Datos del Combo
  const [formData, setFormData] = useState({
    id: null,
    nombre: '',
    precio_actual: '',
    duracion_minutos: '',
    url_imagen: ''
  })

  // Servicios para elegir
  const [todosLosServicios, setTodosLosServicios] = useState([])
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([]) // Array de IDs

  // 1. CARGA DE DATOS
  useEffect(() => {
    const cargarServicios = async () => {
      const { data } = await supabase
        .from('servicio_profesional')
        .select('servicios(*, costo_servicio(monto))')
        .eq('profesional_id', session.user.id)
      
      if (data) {
        const formateados = data.map(d => {
          const s = d.servicios;
          const costo = s.costo_servicio?.reduce((acc, c) => acc + Number(c.monto), 0) || 0;
          return { ...s, costo_total: costo };
        });
        setTodosLosServicios(formateados);
      }
    };

    cargarServicios();

    if (comboInicial) {
      setFormData({
        id: comboInicial.id,
        nombre: comboInicial.nombre,
        precio_actual: comboInicial.precio_actual,
        duracion_minutos: comboInicial.duracion_minutos,
        url_imagen: comboInicial.url_imagen || ''
      });

      // CARGA DE VINCULADOS CON SEGURIDAD
      // Nos aseguramos de que el campo exista y filtramos cualquier nulo
      const vinculados = comboInicial.combo_servicios
        ?.map(cs => cs.servicio_id)
        .filter(id => id !== undefined && id !== null) || [];
      
      setServiciosSeleccionados(vinculados);
    }
  }, [comboInicial, session.user.id]);

  // 2. CÁLCULOS AUTOMÁTICOS
  const metricas = useMemo(() => {
    const seleccionados = todosLosServicios.filter(s => serviciosSeleccionados.includes(s.id));
    return {
      precioNormal: seleccionados.reduce((acc, s) => acc + Number(s.precio_actual), 0),
      costoTotal: seleccionados.reduce((acc, s) => acc + Number(s.costo_total || 0), 0),
      duracionSugerida: seleccionados.reduce((acc, s) => acc + (s.duracion_minutos || 0), 0)
    };
  }, [serviciosSeleccionados, todosLosServicios]);

  // Sincronizar duración real con sugerida si es un combo nuevo
  useEffect(() => {
    if (!formData.id && metricas.duracionSugerida > 0) {
      setFormData(prev => ({ ...prev, duracion_minutos: metricas.duracionSugerida }));
    }
  }, [metricas.duracionSugerida]);

  // 3. MANEJADORES
  const toggleServicio = (id) => {
    setServiciosSeleccionados(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (serviciosSeleccionados.length === 0) return alert("Debes seleccionar al menos un servicio");
    
    setIsSubmitting(true);
    try {
      const datosCombo = {
        nombre: capitalizarNombres(formData.nombre),
        precio_actual: parseFloat(formData.precio_actual),
        duracion_minutos: parseInt(formData.duracion_minutos),
        url_imagen: formData.url_imagen,
        profesional_id: session.user.id
      };

      let comboId = formData.id;

      if (comboId) {
        await supabase.from('combos').update(datosCombo).eq('id', comboId);
        await supabase.from('combo_servicios').delete().eq('combo_id', comboId);
      } else {
        const { data, error } = await supabase.from('combos').insert([datosCombo]).select().single();
        if (error) throw error;
        comboId = data.id;
      }

      // Insertar nuevas relaciones
      const relaciones = serviciosSeleccionados.map(sid => ({ combo_id: comboId, servicio_id: sid }));
      await supabase.from('combo_servicios').insert(relaciones);

      onGuardar();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ordenar lista: seleccionados arriba, luego el resto
  const listaOrdenada = [...todosLosServicios].sort((a, b) => {
    const aSel = serviciosSeleccionados.includes(a.id);
    const bSel = serviciosSeleccionados.includes(b.id);
    if (aSel && !bSel) return -1;
    if (!aSel && bSel) return 1;
    return a.nombre.localeCompare(b.nombre);
  }).filter(s => s.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <form onSubmit={handleGuardar} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* COLUMNA IZQUIERDA: DATOS E IMAGEN */}
      <div className="space-y-6">
        <section className="bg-stone-50 p-5 rounded-2xl border border-stone-100 space-y-4">
          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">Información Básica</h3>
          
          <input required type="text" placeholder="Nombre del Combo *" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold" />
          
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1 ml-1">URL de la Imagen (O ruta local)</label>
            <input type="text" placeholder="https://..." value={formData.url_imagen} onChange={e => setFormData({...formData, url_imagen: e.target.value})} className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none text-sm" />
          </div>

          <div className="aspect-video w-full bg-stone-200 rounded-xl overflow-hidden border-2 border-dashed border-stone-300">
            {formData.url_imagen ? (
              <img src={formData.url_imagen} alt="Vista previa" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs italic">Vista previa de imagen</div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 bg-teal-50/50 p-5 rounded-2xl border border-teal-100">
          <div>
            <label className="block text-[10px] font-bold text-teal-600 uppercase mb-1">Precio Combo ($) *</label>
            <input required type="number" value={formData.precio_actual} onChange={e => setFormData({...formData, precio_actual: e.target.value})} className="w-full px-4 py-3 border border-teal-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-black text-xl text-teal-700" />
            <p className="text-[10px] mt-1 text-stone-400 italic">Precio normal: ${metricas.precioNormal}</p>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Duración Real (Min)</label>
            <input required type="number" value={formData.duracion_minutos} onChange={e => setFormData({...formData, duracion_minutos: e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-400 font-bold text-xl" />
            <p className="text-[10px] mt-1 text-stone-400 italic">Sugerida: {metricas.duracionSugerida} min</p>
          </div>
        </section>
        
        <div className="p-4 bg-red-50 rounded-xl text-red-700">
           <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">Costo total de insumos</p>
           <p className="text-xl font-black">${metricas.costoTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* COLUMNA DERECHA: SELECCIÓN DE SERVICIOS */}
      <div className="flex flex-col h-[600px]">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-3">Incluir Servicios</h3>
          <input type="text" placeholder="Filtrar servicios..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none text-sm" />
        </div>

        <div className="flex-1 overflow-y-auto border border-stone-100 rounded-2xl p-2 space-y-2 bg-stone-50/30">
          {listaOrdenada.map(s => {
            const isSelected = serviciosSeleccionados.includes(s.id);
            return (
              <div 
                key={s.id} 
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isSelected ? 'bg-white border-teal-500 shadow-md ring-1 ring-teal-500' : 'bg-white border-stone-100 opacity-70'}`}
              >
                <div className="flex items-center gap-3">
                   <input type="checkbox" checked={isSelected} onChange={() => toggleServicio(s.id)} className="w-5 h-5 text-teal-600 rounded cursor-pointer" />
                   <div>
                     <p className={`font-bold text-sm ${isSelected ? 'text-teal-700' : 'text-stone-600'}`}>{s.nombre}</p>
                     <p className="text-[10px] text-stone-400">{s.duracion_minutos} min | ${s.precio_actual}</p>
                   </div>
                </div>
                {isSelected && (
                  <button type="button" onClick={() => toggleServicio(s.id)} className="text-red-400 hover:text-red-600 font-black text-lg p-1">×</button>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 pt-6">
          <button type="button" onClick={onCancelar} className="flex-1 py-3 text-stone-400 font-bold hover:text-stone-600 transition-colors">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="flex-[2] bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 shadow-lg transition-all active:scale-95">
            {isSubmitting ? 'Guardando...' : 'Guardar Combo'}
          </button>
        </div>
      </div>
    </form>
  )
}