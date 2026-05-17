// src/components/productos/ProductoFormulario.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { capitalizarNombres } from '../../utils/formatters'

export function ProductoFormulario({
  productoInicial,
  session,
  empresaActiva,
  rolEmpresa,
  onGuardadoExitoso,
  onCancelar
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const puedeCrearStockEmpresa = ['Dueño', 'Administrador', 'Recepcionista'].includes(rolEmpresa)

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
    stock_minimo: 0,
    alcance_stock: 'Profesional'
  })

  useEffect(() => {
    if (productoInicial) {
      const fechaVencimiento = productoInicial.proximo_vencimiento
        ? productoInicial.proximo_vencimiento.split('T')[0]
        : ''

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
        stock_minimo: productoInicial.stock_minimo || 0,
        alcance_stock: productoInicial.alcance_stock || 'Profesional'
      })
    } else {
      setFormData({
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
        stock_minimo: 0,
        alcance_stock: 'Profesional'
      })

      buscarSiguienteCodigo()
    }
  }, [productoInicial, session.user.id, empresaActiva?.id])

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
        const ultimoCodigo = parseInt(data[0].codigo, 10)

        setFormData(prev => ({
          ...prev,
          codigo: (ultimoCodigo + 1).toString()
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          codigo: '1000000'
        }))
      }
    } catch (err) {
      console.error('Error buscando código:', err)
    }
  }

  const handleChange = (campo, valor) => {
    setFormData(prev => ({
      ...prev,
      [campo]: valor
    }))
  }

  const validarCodigoUnico = async () => {
    let query = supabase
      .from('productos')
      .select('id')
      .eq('codigo', formData.codigo.trim())

    if (formData.alcance_stock === 'Empresa') {
      query = query
        .eq('empresa_id', empresaActiva.id)
        .eq('alcance_stock', 'Empresa')
    } else {
      query = query
        .eq('profesional_id', session.user.id)
        .eq('alcance_stock', 'Profesional')
    }

    const { data, error } = await query.maybeSingle()

    if (error) throw error

    if (data && data.id !== formData.id) {
      return false
    }

    return true
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFeedback(null)

    try {
      if (!empresaActiva?.id) {
        setFeedback({
          tipo: 'error',
          mensaje: 'Debes seleccionar una empresa activa antes de guardar productos.'
        })
        setIsSubmitting(false)
        return
      }

      if (formData.alcance_stock === 'Empresa' && !puedeCrearStockEmpresa) {
        setFeedback({
          tipo: 'error',
          mensaje: 'Tu rol actual no permite crear stock de empresa.'
        })
        setIsSubmitting(false)
        return
      }

      if (!formData.codigo.trim()) {
        setFeedback({
          tipo: 'error',
          mensaje: 'El código es obligatorio.'
        })
        setIsSubmitting(false)
        return
      }

      if (!formData.descripcion.trim()) {
        setFeedback({
          tipo: 'error',
          mensaje: 'La descripción es obligatoria.'
        })
        setIsSubmitting(false)
        return
      }

      const codigoDisponible = await validarCodigoUnico()

      if (!codigoDisponible) {
        setFeedback({
          tipo: 'error',
          mensaje: `El código ${formData.codigo} ya está en uso para ese tipo de stock.`
        })
        setIsSubmitting(false)
        return
      }

      const datosAEnviar = {
        profesional_id: session.user.id,
        empresa_id: empresaActiva.id,
        alcance_stock: formData.alcance_stock,
        codigo: formData.codigo.trim(),
        descripcion: capitalizarNombres(formData.descripcion),
        dosificacion: parseFloat(formData.dosificacion) || 0,
        unidad_medida: formData.unidad_medida,
        cantidad_suelta: formData.cantidad_suelta ? parseFloat(formData.cantidad_suelta) : null,
        unidades_enteras: formData.unidades_enteras ? parseInt(formData.unidades_enteras, 10) : null,
        precio_venta: parseFloat(formData.precio_venta) || 0,
        costo_unidad: parseFloat(formData.costo_unidad) || 0,
        proximo_vencimiento: formData.proximo_vencimiento || null,
        stock_minimo: parseInt(formData.stock_minimo, 10) || 0
      }

      if (formData.id) {
        const { error } = await supabase
          .from('productos')
          .update(datosAEnviar)
          .eq('id', formData.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('productos')
          .insert([datosAEnviar])

        if (error) throw error
      }

      setFeedback({
        tipo: 'exito',
        mensaje: '¡Producto guardado exitosamente!'
      })

      setTimeout(() => onGuardadoExitoso(), 1000)
    } catch (error) {
      console.error(error)

      setFeedback({
        tipo: 'error',
        mensaje: 'Error de BD: ' + error.message
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleGuardar} className="p-6 max-w-5xl mx-auto">
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-bold ${
            feedback.tipo === 'exito'
              ? 'bg-green-50 text-green-700 border border-green-100'
              : 'bg-red-50 text-red-700 border border-red-100'
          }`}
        >
          {feedback.mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 space-y-6">
          <div className="bg-stone-50 border border-stone-100 rounded-2xl p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">
              Identificación
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo label="Código *">
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => handleChange('codigo', e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-mono text-teal-700 font-bold"
                />
              </Campo>

              <Campo label="Tipo de stock">
                <select
                  value={formData.alcance_stock}
                  onChange={(e) => handleChange('alcance_stock', e.target.value)}
                  disabled={!puedeCrearStockEmpresa && formData.alcance_stock !== 'Empresa'}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Profesional">Stock personal</option>
                  {puedeCrearStockEmpresa && (
                    <option value="Empresa">Stock de empresa</option>
                  )}
                </select>
              </Campo>

              <div className="md:col-span-2">
                <Campo label="Descripción / Nombre *">
                  <input
                    type="text"
                    value={formData.descripcion}
                    onChange={(e) => handleChange('descripcion', e.target.value)}
                    placeholder="Ej: Crema exfoliante facial"
                    className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </Campo>
              </div>
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-100 rounded-2xl p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">
              Medidas y costos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Campo label="Dosificación *">
                <input
                  type="number"
                  step="0.01"
                  value={formData.dosificacion}
                  onChange={(e) => handleChange('dosificacion', e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </Campo>

              <Campo label="Unidad *">
                <select
                  value={formData.unidad_medida}
                  onChange={(e) => handleChange('unidad_medida', e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="cc">cc</option>
                  <option value="ml">ml</option>
                  <option value="grs">grs</option>
                  <option value="kg">kg</option>
                  <option value="lts">lts</option>
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                </select>
              </Campo>

              <Campo label="Costo unitario ($) *">
                <input
                  type="number"
                  step="0.01"
                  value={formData.costo_unidad}
                  onChange={(e) => handleChange('costo_unidad', e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </Campo>

              <Campo label="Precio venta ($) *">
                <input
                  type="number"
                  step="0.01"
                  value={formData.precio_venta}
                  onChange={(e) => handleChange('precio_venta', e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </Campo>
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-100 rounded-2xl p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">
              Stock e inventario
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Campo label="Unidades enteras">
                <input
                  type="number"
                  value={formData.unidades_enteras}
                  onChange={(e) => handleChange('unidades_enteras', e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </Campo>

              <Campo label="Stock suelto">
                <input
                  type="number"
                  step="0.01"
                  value={formData.cantidad_suelta}
                  onChange={(e) => handleChange('cantidad_suelta', e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </Campo>

              <Campo label="Stock mínimo">
                <input
                  type="number"
                  value={formData.stock_minimo}
                  onChange={(e) => handleChange('stock_minimo', e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </Campo>

              <Campo label="Próx. vencimiento">
                <input
                  type="date"
                  value={formData.proximo_vencimiento}
                  onChange={(e) => handleChange('proximo_vencimiento', e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-stone-600"
                />
              </Campo>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-teal-700 mb-3">
              Contexto
            </h3>

            <p className="text-sm text-stone-600">
              Empresa activa:
            </p>

            <p className="font-black text-stone-800 mt-1">
              {empresaActiva?.nombre || 'Sin empresa'}
            </p>

            <p className="text-xs text-stone-500 mt-3">
              El stock personal solo lo ve la profesional que lo creó. El stock de empresa queda disponible para la empresa activa.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onCancelar}
              className="w-full px-5 py-3 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-colors"
            >
              Cancelar y volver
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-5 py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:bg-stone-300 transition-colors"
            >
              {isSubmitting
                ? 'Guardando...'
                : formData.id
                  ? 'Actualizar Producto'
                  : 'Guardar Producto'}
            </button>
          </div>
        </aside>
      </div>
    </form>
  )
}

function Campo({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
        {label}
      </span>
      {children}
    </label>
  )
}