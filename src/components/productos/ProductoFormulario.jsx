// src/components/productos/ProductoFormulario.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { capitalizarNombres } from '../../utils/formatters'

export function ProductoFormulario({ productoInicial, session, onGuardadoExitoso, onCancelar }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const [formData, setFormData] = useState({
    id: null,
    codigo: '',
    descripcion: '',
    dosificacion: '',
    unidad_medida: 'cc',
    cantidad_suelta: '',
    unidades_enteras: '',
    precio_venta: '',
    costo_unidad: '',
    proximo_vencimiento: '',
    stock_minimo: 0
  })

  // 1. CARGA INICIAL Y AUTOGENERACIÓN DE CÓDIGO
  useEffect(() => {
    if (productoInicial) {
      // MODO EDICIÓN
      const fechaVencimiento = productoInicial.proximo_vencimiento 
        ? productoInicial.proximo_vencimiento.split('T')[0] 
        : '';

      setFormData({
        id: productoInicial.id,
        codigo: productoInicial.codigo || '',
        descripcion: productoInicial.descripcion || '',
        dosificacion: productoInicial.dosificacion || '',
        unidad_medida: productoInicial.unidad_medida || 'cc',
        cantidad_suelta: productoInicial.cantidad_suelta || '',
        unidades_enteras: productoInicial.unidades_enteras || '',
        precio_venta: productoInicial.precio_venta || '',
        costo_unidad: productoInicial.costo_unidad || '',
        proximo_vencimiento: fechaVencimiento,
        stock_minimo: productoInicial.stock_minimo || 0
      })
    } else {
      // MODO NUEVO: Buscar el siguiente código
      buscarSiguienteCodigo()
    }
  }, [productoInicial, session.user.id])

  const buscarSiguienteCodigo = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('codigo')
        .eq('profesional_id', session.user.id)
        .gte('codigo', '1000000')
        .lte('codigo', '1999999')
        .order('codigo', { ascending: false })
        .limit(1)

      if (error) throw error

      if (data && data.length > 0) {
        const ultimoCodigo = parseInt(data[0].codigo)
        setFormData(prev => ({ ...prev, codigo: (ultimoCodigo + 1).toString() }))
      } else {
        setFormData(prev => ({ ...prev, codigo: '1000000' }))
      }
    } catch (err) {
      console.error("Error buscando código:", err)
    }
  }

  const handleChange = (campo, valor) => {
    setFormData(prev => ({ ...prev, [campo]: valor }))
  }

  // 2. GUARDADO Y VALIDACIONES
  const handleGuardar = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFeedback(null)

    try {
      // A. Validar Unicidad del Código
      const { data: existente, error: errExist } = await supabase
        .from('productos')
        .select('id')
        .eq('codigo', formData.codigo)
        .eq('profesional_id', session.user.id)
        .maybeSingle()

      if (errExist) throw errExist

      // Si existe y NO soy yo mismo editándome, lanzar error
      if (existente && existente.id !== formData.id) {
        setFeedback({ tipo: 'error', mensaje: `El código ${formData.codigo} ya está en uso por otro producto.` })
        setIsSubmitting(false)
        return
      }

      // B. Preparar Datos Limpios
      const datosAEnviar = {
        profesional_id: session.user.id,
        codigo: formData.codigo.trim(),
        descripcion: capitalizarNombres(formData.descripcion),
        dosificacion: parseFloat(formData.dosificacion) || 0,
        unidad_medida: formData.unidad_medida,
        cantidad_suelta: formData.cantidad_suelta ? parseFloat(formData.cantidad_suelta) : null,
        unidades_enteras: formData.unidades_enteras ? parseInt(formData.unidades_enteras) : null,
        precio_venta: parseFloat(formData.precio_venta),
        costo_unidad: parseFloat(formData.costo_unidad),
        proximo_vencimiento: formData.proximo_vencimiento ? formData.proximo_vencimiento : null,
        stock_minimo: parseInt(formData.stock_minimo) || 0
      }

      // C. Insertar o Actualizar
      if (formData.id) {
        const { error } = await supabase.from('productos').update(datosAEnviar).eq('id', formData.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('productos').insert([datosAEnviar])
        if (error) throw error
      }

      setFeedback({ tipo: 'exito', mensaje: '¡Producto guardado exitosamente!' })
      setTimeout(() => onGuardadoExitoso(), 1500)

    } catch (error) {
      console.error(error)
      setFeedback({ tipo: 'error', mensaje: 'Error de BD: ' + error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleGuardar} className="p-6 space-y-8">
      {feedback && (
        <div className={`p-4 rounded-lg text-sm font-medium ${feedback.tipo === 'exito' ? 'bg-teal-50 text-teal-800' : 'bg-red-50 text-red-800'}`}>
          {feedback.mensaje}
        </div>
      )}

      {/* SECCIÓN 1: IDENTIFICACIÓN */}
      <div className="bg-stone-50 p-5 rounded-xl border border-stone-100 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Código *</label>
          <input required type="text" value={formData.codigo} onChange={(e) => handleChange('codigo', e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-mono text-teal-700 font-bold" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Descripción / Nombre *</label>
          <input required type="text" value={formData.descripcion} onChange={(e) => handleChange('descripcion', e.target.value)} placeholder="Ej: Crema Exfoliante Facial" className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
      </div>

      {/* SECCIÓN 2: MEDIDAS Y COSTOS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Dosificación *</label>
          <input required type="number" step="0.01" placeholder="Ej: 1000" value={formData.dosificacion} onChange={(e) => handleChange('dosificacion', e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Unidad de Medida *</label>
          <select value={formData.unidad_medida} onChange={(e) => handleChange('unidad_medida', e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-teal-500">
            <option value="cc">cc</option>
            <option value="ml">ml</option>
            <option value="grs">grs</option>
            <option value="kg">kg</option>
            <option value="lts">lts</option>
            <option value="mm">mm</option>
            <option value="cm">cm</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Costo Unitario ($) *</label>
          <input required type="number" step="0.01" value={formData.costo_unidad} onChange={(e) => handleChange('costo_unidad', e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Precio Venta ($) *</label>
          <input required type="number" step="0.01" value={formData.precio_venta} onChange={(e) => handleChange('precio_venta', e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
      </div>

      {/* SECCIÓN 3: STOCK E INVENTARIO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Unidades (Botes)</label>
          <input type="number" value={formData.unidades_enteras} onChange={(e) => handleChange('unidades_enteras', e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Stock Suelto</label>
          <input type="number" step="0.01" placeholder="En uso" value={formData.cantidad_suelta} onChange={(e) => handleChange('cantidad_suelta', e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Stock Mínimo (Alerta)</label>
          <input type="number" value={formData.stock_minimo} onChange={(e) => handleChange('stock_minimo', e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Próx. Vencimiento</label>
          <input type="date" value={formData.proximo_vencimiento} onChange={(e) => handleChange('proximo_vencimiento', e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-stone-600" />
        </div>
      </div>

      {/* BOTONERA */}
      <div className="flex justify-end items-center gap-4 pt-6 border-t border-stone-100">
        
        {/* BOTÓN CANCELAR */}
        <button 
          type="button" // IMPORTANTE: type="button" para que no intente enviar el form
          onClick={onCancelar}
          className="text-stone-400 hover:text-stone-600 font-medium text-sm transition-colors"
        >
          Cancelar y volver
        </button>

        {/* BOTÓN GUARDAR */}
        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 font-bold disabled:opacity-50 transition shadow-md w-full md:w-auto"
        >
          {isSubmitting ? 'Guardando...' : (formData.id ? 'Actualizar Producto' : 'Guardar Producto')}
        </button>
        
      </div>
    </form>
  )
}