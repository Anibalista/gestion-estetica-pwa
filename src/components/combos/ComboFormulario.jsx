// src/components/combos/ComboFormulario.jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { capitalizarNombres } from '../../utils/formatters'
import { uploadImage, IMAGENES_GENERICAS } from '../../utils/storage'

export function ComboFormulario({ comboInicial, session, onGuardar, onCancelar }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  
  // Estado para el método de imagen: 'generica', 'url', 'archivo'
  const [metodoImagen, setMetodoImagen] = useState('generica')
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null)
  const [vistaPrevia, setVistaPrevia] = useState(null)

  const [formData, setFormData] = useState({
    id: null,
    nombre: '',
    precio_actual: '',
    duracion_minutos: '',
    url_imagen: IMAGENES_GENERICAS[0].url // Por defecto la primera genérica
  })

  const [todosLosServicios, setTodosLosServicios] = useState([])
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([])

  useEffect(() => {
    cargarServicios()
    if (comboInicial) {
      setFormData({
        id: comboInicial.id,
        nombre: comboInicial.nombre,
        precio_actual: comboInicial.precio_actual,
        duracion_minutos: comboInicial.duracion_minutos,
        url_imagen: comboInicial.url_imagen
      })
      setServiciosSeleccionados(comboInicial.combo_servicios?.map(s => s.servicio_id) || [])
      // Si ya tiene imagen, detectamos si es una URL externa o genérica
      if (comboInicial.url_imagen?.includes('genericas')) {
        setMetodoImagen('generica')
      } else if (comboInicial.url_imagen) {
        setMetodoImagen('url') // Si no es genérica, la tratamos como link o subida
      }
    }
  }, [comboInicial])

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
      setTodosLosServicios(formateados.sort((a,b) => a.nombre.localeCompare(b.nombre)))
    }
  }

  const handleArchivoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setArchivoSeleccionado(file)
      setVistaPrevia(URL.createObjectURL(file))
    }
  }

  const toggleServicio = (id) => {
    setServiciosSeleccionados(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let urlFinal = formData.url_imagen

      // 1. Si el método es 'archivo', subirlo primero
      if (metodoImagen === 'archivo' && archivoSeleccionado) {
        // Usamos el ID del profesional como nombre de carpeta para asegurar que sea único
        urlFinal = await uploadImage(archivoSeleccionado, 'combos', session.user.id)
      }

      const datosCombo = {
        profesional_id: session.user.id,
        nombre: capitalizarNombres(formData.nombre),
        precio_actual: Number(formData.precio_actual),
        duracion_minutos: Number(formData.duracion_minutos),
        url_imagen: urlFinal,
        activo: true
      }

      let comboId = formData.id
      if (comboId) {
        await supabase.from('combos').update(datosCombo).eq('id', comboId)
        await supabase.from('combo_servicios').delete().eq('combo_id', comboId)
      } else {
        const { data, error } = await supabase.from('combos').insert([datosCombo]).select().single()
        if (error) throw error
        comboId = data.id
      }

      const relaciones = serviciosSeleccionados.map(sid => ({ combo_id: comboId, servicio_id: sid }))
      await supabase.from('combo_servicios').insert(relaciones)

      onGuardar()
    } catch (err) {
      alert("Error al guardar: " + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleGuardar} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-stone-800 mb-4">Información del Combo</h3>
          <div className="space-y-4">
            <input required type="text" placeholder="Nombre del Combo" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500" />
            
            <div className="grid grid-cols-2 gap-4">
              <input required type="number" placeholder="Precio ($)" value={formData.precio_actual} onChange={e => setFormData({...formData, precio_actual: e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold" />
              <input required type="number" placeholder="Duración (min)" value={formData.duracion_minutos} onChange={e => setFormData({...formData, duracion_minutos: e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
        </div>

        {/* SELECTOR DE IMAGEN MULTIMODAL */}
        <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100">
          <label className="block text-xs font-bold text-stone-400 uppercase mb-3">Imagen del Combo</label>
          
          <div className="flex gap-2 mb-4">
            {['generica', 'archivo', 'url'].map(m => (
              <button 
                key={m} 
                type="button" 
                onClick={() => setMetodoImagen(m)}
                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg border transition-all ${metodoImagen === m ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-stone-400 border-stone-200'}`}
              >
                {m === 'generica' ? '🖼️ Genéricas' : m === 'archivo' ? '📁 Subir' : '🔗 Link'}
              </button>
            ))}
          </div>

          {/* VISTA SEGÚN MÉTODO */}
          {metodoImagen === 'generica' && (
            <div className="grid grid-cols-3 gap-2">
              {IMAGENES_GENERICAS.map(img => (
                <div 
                  key={img.id} 
                  onClick={() => setFormData({...formData, url_imagen: img.url})}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${formData.url_imagen === img.url ? 'border-teal-500 ring-2 ring-teal-200' : 'border-transparent'}`}
                >
                  <img src={img.url} alt={img.label} className="w-full h-16 object-cover" />
                  {formData.url_imagen === img.url && <div className="absolute inset-0 bg-teal-500/20 flex items-center justify-center text-white font-bold">✓</div>}
                </div>
              ))}
            </div>
          )}

          {metodoImagen === 'archivo' && (
            <div className="space-y-3">
              <input type="file" accept="image/*" onChange={handleArchivoChange} className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
              {/* CAMBIO AQUÍ: h-48, object-contain y bg-stone-100 */}
              {vistaPrevia && <img src={vistaPrevia} className="w-full h-48 object-contain bg-stone-100 rounded-xl border" />}
            </div>
          )}

          {metodoImagen === 'url' && (
            <input type="text" placeholder="https://ejemplo.com/imagen.jpg" value={formData.url_imagen} onChange={e => setFormData({...formData, url_imagen: e.target.value})} className="w-full px-4 py-2 border border-stone-200 rounded-xl text-sm" />
          )}
        </div>
      </div>

      {/* SELECCIÓN DE SERVICIOS */}
      <div className="flex flex-col h-full">
        <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Servicios Incluidos</h3>
        <input type="text" placeholder="Filtrar servicios..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-xl mb-4 text-sm" />
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-[400px]">
          {todosLosServicios.filter(s => s.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(s => {
            const isSelected = serviciosSeleccionados.includes(s.id)
            return (
              <div 
                key={s.id} 
                onClick={() => toggleServicio(s.id)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-white border-teal-500 shadow-md ring-1 ring-teal-500' : 'bg-white border-stone-100 opacity-70'}`}
              >
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={isSelected} readOnly className="w-5 h-5 text-teal-600 rounded cursor-pointer" />
                  <div>
                    <p className={`font-bold text-sm ${isSelected ? 'text-teal-700' : 'text-stone-600'}`}>{s.nombre}</p>
                    <p className="text-[10px] text-stone-400">{s.duracion_minutos} min | ${s.precio_actual}</p>
                  </div>
                </div>
                {isSelected && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); toggleServicio(s.id); }} className="text-red-400 hover:text-red-600 font-black text-lg p-1">×</button>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 pt-6 mt-auto">
          <button type="button" onClick={onCancelar} className="flex-1 py-3 text-stone-400 font-bold hover:text-stone-600 transition-colors">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="flex-[2] bg-teal-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-teal-700 transition-colors">
            {isSubmitting ? 'Guardando...' : (formData.id ? 'Actualizar Combo' : 'Crear Combo')}
          </button>
        </div>
      </div>
    </form>
  )
}