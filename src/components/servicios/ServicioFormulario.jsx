// src/components/servicios/ServicioFormulario.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { capitalizarNombres, capitalizarPrimeraLetra } from '../../utils/formatters'

export function ServicioFormulario({ servicioInicial, session, onGuardar, onCancelar }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  // Lista de productos del profesional para el combo de insumos
  const [productosDisponibles, setProductosDisponibles] = useState([])

  // Estado principal del Servicio
  const [formData, setFormData] = useState({
    id: null,
    nombre: '',
    descripcion: '',
    precio_actual: '',
    duracion_minutos: '',
    beneficios: ''
  })

  // Estado para la tabla anidada de Costos/Insumos
  const [costos, setCostos] = useState([])

  // 1. CARGA INICIAL
  useEffect(() => {
    // A. Traer los productos para que el masajista pueda elegirlos como insumos
    const cargarProductos = async () => {
      const { data } = await supabase
        .from('productos')
        .select('id, descripcion, costo_unidad, unidad_medida')
        .eq('profesional_id', session.user.id)
        .eq('activo', true)
      if (data) setProductosDisponibles(data)
    }
    cargarProductos()

    // B. Si estamos editando, cargar los datos del servicio y sus costos
    if (servicioInicial) {
      setFormData({
        id: servicioInicial.id,
        nombre: servicioInicial.nombre || '',
        descripcion: servicioInicial.descripcion || '',
        precio_actual: servicioInicial.precio_actual || '',
        duracion_minutos: servicioInicial.duracion_minutos || '',
        beneficios: servicioInicial.beneficios || ''
      })

      const cargarCostos = async () => {
        const { data } = await supabase
          .from('costo_servicio')
          .select('*')
          .eq('servicio_id', servicioInicial.id)
        
        if (data) {
          // Le agregamos un id temporal a cada uno para poder mapearlos en React sin errores
          setCostos(data.map(c => ({ ...c, _tempId: crypto.randomUUID() })))
        }
      }
      cargarCostos()
    }
  }, [servicioInicial, session.user.id])

  // --- MANEJADORES DEL FORMULARIO PRINCIPAL ---
  const handleChange = (campo, valor) => {
    setFormData(prev => ({ ...prev, [campo]: valor }))
  }

  // --- MANEJADORES DE COSTOS (LA TABLA DINÁMICA) ---
  const agregarCosto = () => {
    setCostos([...costos, { 
      _tempId: crypto.randomUUID(), 
      producto_id: '', 
      descripcion: '', 
      monto: '', 
      cantidad_suelta_usada: '', 
      unidades_usadas: '' 
    }])
  }

  const actualizarCosto = (idTemp, campo, valor) => {
    setCostos(prev => prev.map(c => {
      if (c._tempId === idTemp) {
        const actualizado = { ...c, [campo]: valor }
        
        // Magia: Si selecciona un producto, le autocompletamos la descripción
        if (campo === 'producto_id' && valor) {
          const prod = productosDisponibles.find(p => p.id === valor)
          if (prod) actualizado.descripcion = `Insumo: ${prod.descripcion}`
        }
        return actualizado
      }
      return c
    }))
  }

  const eliminarCosto = (idTemp) => {
    setCostos(prev => prev.filter(c => c._tempId !== idTemp))
  }

  // --- GUARDADO EN BD ---
  const handleGuardar = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFeedback(null)

    try {
      // 1. Preparar datos del servicio
      const datosServicio = {
        nombre: capitalizarNombres(formData.nombre),
        descripcion: capitalizarPrimeraLetra(formData.descripcion),
        precio_actual: parseFloat(formData.precio_actual) || 0,
        duracion_minutos: parseInt(formData.duracion_minutos) || null,
        beneficios: capitalizarPrimeraLetra(formData.beneficios)
      }

      let servicioId = formData.id

      if (servicioId) {
        // ACTUALIZAR SERVICIO EXISTENTE
        const { error: errServ } = await supabase.from('servicios').update(datosServicio).eq('id', servicioId)
        if (errServ) throw errServ
        
        // Borramos todos los costos anteriores (es más seguro borrar y reescribir la lista completa)
        await supabase.from('costo_servicio').delete().eq('servicio_id', servicioId)

      } else {
        // CREAR NUEVO SERVICIO
        const { data: nuevoServ, error: errServ } = await supabase.from('servicios').insert([datosServicio]).select().single()
        if (errServ) throw errServ
        servicioId = nuevoServ.id

        // Vincular el servicio al profesional en la tabla intermedia N:M
        const { error: errRel } = await supabase.from('servicio_profesional').insert([{
          servicio_id: servicioId,
          profesional_id: session.user.id
        }])
        if (errRel) throw errRel
      }

      // 2. Insertar Costos (si hay alguno en la lista)
      if (costos.length > 0) {
        const costosAInsertar = costos.map(c => ({
          servicio_id: servicioId,
          producto_id: c.producto_id || null, // null si es un gasto manual (ej: luz, toallas)
          descripcion: capitalizarPrimeraLetra(c.descripcion),
          monto: parseFloat(c.monto) || 0,
          cantidad_suelta_usada: c.cantidad_suelta_usada ? parseFloat(c.cantidad_suelta_usada) : null,
          unidades_usadas: c.unidades_usadas ? parseInt(c.unidades_usadas) : null
        }))

        const { error: errCostos } = await supabase.from('costo_servicio').insert(costosAInsertar)
        if (errCostos) throw errCostos
      }

      setFeedback({ tipo: 'exito', mensaje: '¡Servicio guardado exitosamente!' })
      setTimeout(() => onGuardar(), 1500)

    } catch (error) {
      console.error(error)
      setFeedback({ tipo: 'error', mensaje: 'Error al guardar: ' + error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Costo total estimado en tiempo real para mostrar en el form
  const totalCostos = costos.reduce((acc, c) => acc + (parseFloat(c.monto) || 0), 0)

  return (
    <form onSubmit={handleGuardar} className="p-6 space-y-8">
      {feedback && (
        <div className={`p-4 rounded-lg text-sm font-medium ${feedback.tipo === 'exito' ? 'bg-teal-50 text-teal-800' : 'bg-red-50 text-red-800'}`}>
          {feedback.mensaje}
        </div>
      )}

      {/* BLOQUE 1: DATOS DEL SERVICIO */}
      <div className="bg-stone-50 p-5 rounded-xl border border-stone-100 space-y-4">
        <h3 className="text-sm font-bold text-stone-600 uppercase mb-4 border-b border-stone-200 pb-2">Detalles del Servicio</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Nombre del Servicio *</label>
            <input required type="text" value={formData.nombre} onChange={(e) => handleChange('nombre', e.target.value)} placeholder="Ej: Masaje Descontracturante" className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-medium text-stone-700" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Precio Público ($) *</label>
              <input required type="number" step="0.01" value={formData.precio_actual} onChange={(e) => handleChange('precio_actual', e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-bold text-teal-700" />
            </div>
            <div className="w-1/3">
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Duración</label>
              <input type="number" placeholder="Min." value={formData.duracion_minutos} onChange={(e) => handleChange('duracion_minutos', e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Descripción corta</label>
          <textarea rows="2" value={formData.descripcion} onChange={(e) => handleChange('descripcion', e.target.value)} placeholder="¿En qué consiste el tratamiento?" className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"></textarea>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Beneficios (Saldrá en el popup de la lista)</label>
          <textarea rows="3" value={formData.beneficios} onChange={(e) => handleChange('beneficios', e.target.value)} placeholder="Mejora la circulación, alivia tensiones musculares..." className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"></textarea>
        </div>
      </div>

      {/* BLOQUE 2: INSUMOS Y COSTOS */}
      <div>
        <div className="flex justify-between items-end border-b border-stone-200 pb-2 mb-4">
          <h3 className="text-sm font-bold text-stone-600 uppercase">Insumos y Gastos Asociados</h3>
          <p className="text-xs font-bold text-red-500 uppercase tracking-widest bg-red-50 px-3 py-1 rounded">Costo Total: ${totalCostos.toFixed(2)}</p>
        </div>

        <div className="space-y-3">
          {costos.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-stone-200 rounded-lg text-stone-400 text-sm">
              No has registrado insumos. Toda la venta será contada como ganancia neta.
            </div>
          ) : (
            costos.map((costo, index) => (
              <div key={costo._tempId} className="flex flex-col md:flex-row gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200 relative group items-start md:items-center">
                
                {/* 1. Selector de Producto Opcional */}
                <div className="w-full md:w-1/4">
                  <select 
                    value={costo.producto_id || ''} 
                    onChange={(e) => actualizarCosto(costo._tempId, 'producto_id', e.target.value)}
                    className="w-full text-xs px-2 py-2 border border-stone-200 rounded outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">Gasto libre (Sin producto)</option>
                    {productosDisponibles.map(p => (
                      <option key={p.id} value={p.id}>{p.descripcion} ({p.unidad_medida})</option>
                    ))}
                  </select>
                </div>

                {/* 2. Descripción del gasto */}
                <div className="w-full md:w-1/4">
                  <input 
                    required 
                    type="text" 
                    placeholder="Descripción *" 
                    value={costo.descripcion} 
                    onChange={(e) => actualizarCosto(costo._tempId, 'descripcion', e.target.value)} 
                    className="w-full text-xs px-3 py-2 border border-stone-200 rounded outline-none" 
                  />
                </div>

                {/* 3. Cantidades (Solo si usa producto) */}
                <div className="flex gap-2 w-full md:w-1/4">
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Cant. Fraccionada" 
                    value={costo.cantidad_suelta_usada} 
                    onChange={(e) => actualizarCosto(costo._tempId, 'cantidad_suelta_usada', e.target.value)} 
                    className="w-1/2 text-xs px-2 py-2 border border-stone-200 rounded outline-none" 
                    title="Cantidad que gasta de stock suelto"
                  />
                  <input 
                    type="number" 
                    placeholder="Botes enteros" 
                    value={costo.unidades_usadas} 
                    onChange={(e) => actualizarCosto(costo._tempId, 'unidades_usadas', e.target.value)} 
                    className="w-1/2 text-xs px-2 py-2 border border-stone-200 rounded outline-none" 
                    title="Cantidad de envases enteros gastados"
                  />
                </div>

                {/* 4. Monto del Gasto ($) y Eliminar */}
                <div className="flex gap-2 w-full md:w-1/4">
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    placeholder="Costo ($) *" 
                    value={costo.monto} 
                    onChange={(e) => actualizarCosto(costo._tempId, 'monto', e.target.value)} 
                    className="w-full text-xs px-3 py-2 border border-red-200 rounded outline-none bg-red-50 text-red-700 font-bold" 
                  />
                  <button 
                    type="button" 
                    onClick={() => eliminarCosto(costo._tempId)} 
                    className="bg-stone-200 hover:bg-red-500 hover:text-white text-stone-500 w-10 flex items-center justify-center rounded transition-colors"
                    title="Eliminar gasto"
                  >
                    ×
                  </button>
                </div>

              </div>
            ))
          )}
          
          <button type="button" onClick={agregarCosto} className="text-sm text-teal-600 font-bold hover:text-teal-800 transition-colors flex items-center gap-1 mt-2">
            + Agregar Insumo / Gasto Fijo
          </button>
        </div>
      </div>

      {/* BOTONERA */}
      <div className="flex justify-end items-center gap-4 pt-6 border-t border-stone-100">
        <button type="button" onClick={onCancelar} className="text-stone-400 hover:text-stone-600 font-medium text-sm transition-colors cursor-pointer">
          Cancelar y volver
        </button>
        <button type="submit" disabled={isSubmitting} className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 font-bold disabled:opacity-50 transition shadow-md w-full md:w-auto cursor-pointer">
          {isSubmitting ? 'Guardando...' : (formData.id ? 'Actualizar Servicio' : 'Guardar Servicio')}
        </button>
      </div>
    </form>
  )
}