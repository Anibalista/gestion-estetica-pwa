// src/components/servicios/ServicioFormulario.jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { capitalizarNombres, capitalizarPrimeraLetra } from '../../utils/formatters'

function ProductoAutofiltro({ productos, productoId, onSeleccionar }) {
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState(false)

  const productoSeleccionado = productos.find(p => p.id === productoId)

  const textoVisible = productoSeleccionado
    ? productoSeleccionado.descripcion
    : busqueda

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    if (!texto) return productos

    return productos.filter(p => {
      const descripcion = String(p.descripcion || '').toLowerCase()
      const codigo = String(p.codigo || '').toLowerCase()

      return descripcion.includes(texto) || codigo.includes(texto)
    })
  }, [busqueda, productos])

  const seleccionarProducto = (producto) => {
    onSeleccionar(producto.id)
    setBusqueda('')
    setAbierto(false)
  }

  const limpiarProducto = () => {
    onSeleccionar('')
    setBusqueda('')
    setAbierto(false)
  }

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={textoVisible}
        onChange={(e) => {
          setBusqueda(e.target.value)
          setAbierto(true)

          if (productoSeleccionado) {
            onSeleccionar('')
          }
        }}
        onFocus={() => setAbierto(true)}
        placeholder="Buscar producto..."
        className="w-full text-xs px-2 py-2 border border-stone-200 rounded outline-none focus:ring-1 focus:ring-teal-500 bg-white"
      />

      {productoSeleccionado && (
        <button
          type="button"
          onClick={limpiarProducto}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-red-500 text-sm"
          title="Quitar producto"
        >
          ×
        </button>
      )}

      {abierto && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-stone-200 rounded-lg shadow-lg">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={limpiarProducto}
            className="w-full text-left px-3 py-2 text-xs hover:bg-stone-50 border-b border-stone-100"
          >
            <span className="block font-semibold text-stone-700">
              Gasto libre
            </span>
            <span className="block text-[10px] text-stone-400">
              Sin producto asociado
            </span>
          </button>

          {productosFiltrados.length === 0 ? (
            <div className="px-3 py-3 text-xs text-stone-400">
              No se encontraron productos.
            </div>
          ) : (
            productosFiltrados.map(producto => (
              <button
                key={producto.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => seleccionarProducto(producto)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-teal-50 border-b border-stone-100 last:border-b-0"
              >
                <span className="block font-semibold text-stone-700 leading-tight">
                  {producto.descripcion}
                </span>
                <span className="block text-[10px] text-stone-400 leading-tight mt-0.5">
                  Código: {producto.codigo || 'Sin código'} · {producto.unidad_medida || 'Sin unidad'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function ServicioFormulario({ servicioInicial, session, onGuardar, onCancelar }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const [productosDisponibles, setProductosDisponibles] = useState([])

  const [formData, setFormData] = useState({
    id: null,
    nombre: '',
    descripcion: '',
    precio_actual: '',
    duracion_minutos: '',
    beneficios: ''
  })

  const [costos, setCostos] = useState([])

  useEffect(() => {
    const cargarProductos = async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('id, codigo, descripcion, dosificacion, unidad_medida, costo_unidad')
        .eq('profesional_id', session.user.id)
        .eq('activo', true)
        .order('descripcion', { ascending: true })

      if (error) {
        console.error(error)
        return
      }

      if (data) setProductosDisponibles(data)
    }

    cargarProductos()

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
        const { data, error } = await supabase
          .from('costo_servicio')
          .select('*')
          .eq('servicio_id', servicioInicial.id)

        if (error) {
          console.error(error)
          return
        }

        if (data) {
          setCostos(data.map(c => ({
            ...c,
            _tempId: crypto.randomUUID()
          })))
        }
      }

      cargarCostos()
    }
  }, [servicioInicial, session.user.id])

  const handleChange = (campo, valor) => {
    setFormData(prev => ({ ...prev, [campo]: valor }))
  }

  const calcularMontoProducto = (producto, cantidadSuelta, unidadesEnteras) => {
    try {
      if (!producto) return ''

      const costoUnidad = Number(producto.costo_unidad)
      const dosificacion = Number(producto.dosificacion)

      const cantidad = Number(cantidadSuelta) || 0
      const unidades = parseInt(unidadesEnteras, 10) || 0

      if (!Number.isFinite(costoUnidad) || costoUnidad < 0) return ''

      const divisorDosificacion =
        Number.isFinite(dosificacion) && dosificacion > 0
          ? dosificacion
          : 1

      const costoPorCantidadSuelta = costoUnidad * (1 / divisorDosificacion) * cantidad
      const costoPorUnidadesEnteras = costoUnidad * unidades

      const total = costoPorCantidadSuelta + costoPorUnidadesEnteras

      if (!Number.isFinite(total)) return ''

      return total.toFixed(2)
    } catch (error) {
      console.error('Error calculando costo del producto:', error)
      return ''
    }
  }

  const agregarCosto = () => {
    setCostos(prev => [
      ...prev,
      {
        _tempId: crypto.randomUUID(),
        producto_id: '',
        descripcion: '',
        monto: '',
        cantidad_suelta_usada: '',
        unidades_usadas: ''
      }
    ])
  }

  const actualizarCosto = (idTemp, campo, valor) => {
    setCostos(prev => prev.map(c => {
      if (c._tempId !== idTemp) return c

      const actualizado = {
        ...c,
        [campo]: valor
      }

      if (campo === 'producto_id') {
        const producto = productosDisponibles.find(p => p.id === valor)

        if (producto) {
          actualizado.descripcion = producto.descripcion || ''
          actualizado.cantidad_suelta_usada = c.cantidad_suelta_usada || ''
          actualizado.unidades_usadas = c.unidades_usadas || ''
          actualizado.monto = calcularMontoProducto(
            producto,
            actualizado.cantidad_suelta_usada,
            actualizado.unidades_usadas
          )
        } else {
          actualizado.producto_id = ''
          actualizado.cantidad_suelta_usada = ''
          actualizado.unidades_usadas = ''
        }

        return actualizado
      }

      if (
        campo === 'cantidad_suelta_usada' ||
        campo === 'unidades_usadas'
      ) {
        if (actualizado.producto_id) {
          const producto = productosDisponibles.find(p => p.id === actualizado.producto_id)

          actualizado.monto = calcularMontoProducto(
            producto,
            actualizado.cantidad_suelta_usada,
            actualizado.unidades_usadas
          )
        }

        return actualizado
      }

      return actualizado
    }))
  }

  const eliminarCosto = (idTemp) => {
    setCostos(prev => prev.filter(c => c._tempId !== idTemp))
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFeedback(null)

    try {
      const datosServicio = {
        nombre: capitalizarNombres(formData.nombre),
        descripcion: capitalizarPrimeraLetra(formData.descripcion),
        precio_actual: parseFloat(formData.precio_actual) || 0,
        duracion_minutos: parseInt(formData.duracion_minutos) || null,
        beneficios: capitalizarPrimeraLetra(formData.beneficios)
      }

      let servicioId = formData.id

      if (servicioId) {
        const { error: errServ } = await supabase
          .from('servicios')
          .update(datosServicio)
          .eq('id', servicioId)

        if (errServ) throw errServ

        const { error: errDeleteCostos } = await supabase
          .from('costo_servicio')
          .delete()
          .eq('servicio_id', servicioId)

        if (errDeleteCostos) throw errDeleteCostos
      } else {
        const { data: nuevoServ, error: errServ } = await supabase
          .from('servicios')
          .insert([datosServicio])
          .select()
          .single()

        if (errServ) throw errServ

        servicioId = nuevoServ.id

        const { error: errRel } = await supabase
          .from('servicio_profesional')
          .insert([{
            servicio_id: servicioId,
            profesional_id: session.user.id
          }])

        if (errRel) throw errRel
      }

      if (costos.length > 0) {
        const costosAInsertar = costos
          .filter(c => {
            const descripcion = String(c.descripcion || '').trim()
            const monto = parseFloat(c.monto)

            return descripcion || Number.isFinite(monto)
          })
          .map(c => ({
            servicio_id: servicioId,
            producto_id: c.producto_id || null,
            descripcion: capitalizarPrimeraLetra(c.descripcion),
            monto: parseFloat(c.monto) || 0,
            cantidad_suelta_usada: c.producto_id && c.cantidad_suelta_usada
              ? parseFloat(c.cantidad_suelta_usada)
              : null,
            unidades_usadas: c.producto_id && c.unidades_usadas
              ? parseInt(c.unidades_usadas)
              : null
          }))

        if (costosAInsertar.length > 0) {
          const { error: errCostos } = await supabase
            .from('costo_servicio')
            .insert(costosAInsertar)

          if (errCostos) throw errCostos
        }
      }

      setFeedback({
        tipo: 'exito',
        mensaje: '¡Servicio guardado exitosamente!'
      })

      setTimeout(() => onGuardar(), 1500)
    } catch (error) {
      console.error(error)
      setFeedback({
        tipo: 'error',
        mensaje: 'Error al guardar: ' + error.message
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalCostos = costos.reduce((acc, c) => {
    const monto = parseFloat(c.monto)
    return acc + (Number.isFinite(monto) ? monto : 0)
  }, 0)

  return (
    <form onSubmit={handleGuardar} className="p-6 space-y-8">
      {feedback && (
        <div className={`p-4 rounded-lg text-sm font-medium ${feedback.tipo === 'exito' ? 'bg-teal-50 text-teal-800' : 'bg-red-50 text-red-800'}`}>
          {feedback.mensaje}
        </div>
      )}

      {/* BLOQUE 1: DATOS DEL SERVICIO */}
      <div className="bg-stone-50 p-5 rounded-xl border border-stone-100 space-y-4">
        <h3 className="text-sm font-bold text-stone-600 uppercase mb-4 border-b border-stone-200 pb-2">
          Detalles del Servicio
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
              Nombre del Servicio *
            </label>
            <input
              required
              type="text"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Ej: Masaje Descontracturante"
              className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-medium text-stone-700"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
                Precio Público ($) *
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.precio_actual}
                onChange={(e) => handleChange('precio_actual', e.target.value)}
                className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-bold text-teal-700"
              />
            </div>

            <div className="w-1/3">
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
                Duración
              </label>
              <input
                type="number"
                placeholder="Min."
                value={formData.duracion_minutos}
                onChange={(e) => handleChange('duracion_minutos', e.target.value)}
                className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
            Descripción corta
          </label>
          <textarea
            rows="2"
            value={formData.descripcion}
            onChange={(e) => handleChange('descripcion', e.target.value)}
            placeholder="¿En qué consiste el tratamiento?"
            className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
            Beneficios (Saldrá en el popup de la lista)
          </label>
          <textarea
            rows="3"
            value={formData.beneficios}
            onChange={(e) => handleChange('beneficios', e.target.value)}
            placeholder="Mejora la circulación, alivia tensiones musculares..."
            className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* BLOQUE 2: INSUMOS Y COSTOS */}
      <div>
        <div className="flex justify-between items-end border-b border-stone-200 pb-2 mb-4">
          <h3 className="text-sm font-bold text-stone-600 uppercase">
            Insumos y Gastos Asociados
          </h3>

          <p className="text-xs font-bold text-red-500 uppercase tracking-widest bg-red-50 px-3 py-1 rounded">
            Costo Total: ${totalCostos.toFixed(2)}
          </p>
        </div>

        <div className="space-y-3">
          {costos.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-stone-200 rounded-lg text-stone-400 text-sm">
              No has registrado insumos. Toda la venta será contada como ganancia neta.
            </div>
          ) : (
            costos.map((costo) => {
              const tieneProducto = Boolean(costo.producto_id)

              return (
                <div
                  key={costo._tempId}
                  className="flex flex-col md:flex-row gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200 relative group items-start md:items-center"
                >
                  {/* 1. Selector de Producto Opcional con autofiltro */}
                  <div className="w-full md:w-1/4">
                    <ProductoAutofiltro
                      productos={productosDisponibles}
                      productoId={costo.producto_id || ''}
                      onSeleccionar={(productoId) => actualizarCosto(costo._tempId, 'producto_id', productoId)}
                    />
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

                  {/* 3. Cantidades, habilitadas solo si hay producto */}
                  <div className="flex gap-2 w-full md:w-1/4">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Cant. fraccionada"
                      value={costo.cantidad_suelta_usada}
                      onChange={(e) => actualizarCosto(costo._tempId, 'cantidad_suelta_usada', e.target.value)}
                      disabled={!tieneProducto}
                      className={`w-1/2 text-xs px-2 py-2 border border-stone-200 rounded outline-none ${
                        tieneProducto
                          ? 'bg-white focus:ring-1 focus:ring-teal-500'
                          : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                      }`}
                      title="Cantidad que gasta de stock suelto"
                    />

                    <input
                      type="number"
                      min="0"
                      placeholder="Botes enteros"
                      value={costo.unidades_usadas}
                      onChange={(e) => actualizarCosto(costo._tempId, 'unidades_usadas', e.target.value)}
                      disabled={!tieneProducto}
                      className={`w-1/2 text-xs px-2 py-2 border border-stone-200 rounded outline-none ${
                        tieneProducto
                          ? 'bg-white focus:ring-1 focus:ring-teal-500'
                          : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                      }`}
                      title="Cantidad de envases enteros gastados"
                    />
                  </div>

                  {/* 4. Monto del Gasto y Eliminar */}
                  <div className="flex gap-2 w-full md:w-1/4">
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Costo ($) *"
                      value={costo.monto}
                      onChange={(e) => actualizarCosto(costo._tempId, 'monto', e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-red-200 rounded outline-none bg-red-50 text-red-700 font-bold"
                      title="Se calcula automático si hay producto, pero podés editarlo manualmente"
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
              )
            })
          )}

          <button
            type="button"
            onClick={agregarCosto}
            className="text-sm text-teal-600 font-bold hover:text-teal-800 transition-colors flex items-center gap-1 mt-2"
          >
            + Agregar Insumo / Gasto Fijo
          </button>
        </div>
      </div>

      {/* BOTONERA */}
      <div className="flex justify-end items-center gap-4 pt-6 border-t border-stone-100">
        <button
          type="button"
          onClick={onCancelar}
          className="text-stone-400 hover:text-stone-600 font-medium text-sm transition-colors cursor-pointer"
        >
          Cancelar y volver
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 font-bold disabled:opacity-50 transition shadow-md w-full md:w-auto cursor-pointer"
        >
          {isSubmitting ? 'Guardando...' : (formData.id ? 'Actualizar Servicio' : 'Guardar Servicio')}
        </button>
      </div>
    </form>
  )
}