// src/components/ventas/VentaFormulario.jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'

export function VentaFormulario({
  session,
  empresaActiva,
  rolEmpresa,
  onGuardar,
  onCancelar
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [filtroProducto, setFiltroProducto] = useState('')

  const [formData, setFormData] = useState({
    cliente_id: '',
    medio_pago: 'Efectivo',
    monto_cobrado: ''
  })

  const [carrito, setCarrito] = useState([])

  useEffect(() => {
    if (empresaActiva?.id) {
      cargarCatalogos()
    }
  }, [session.user.id, empresaActiva?.id])

  const cargarCatalogos = async () => {
    try {
      const [clientesResponse, productosPersonalesResponse, productosEmpresaResponse] = await Promise.all([
        supabase
          .from('cliente_profesional')
          .select('clientes(id, nombre, telefono)')
          .eq('profesional_id', session.user.id),

        supabase
          .from('productos')
          .select('*')
          .eq('profesional_id', session.user.id)
          .eq('alcance_stock', 'Profesional')
          .eq('activo', true),

        supabase
          .from('productos')
          .select('*')
          .eq('empresa_id', empresaActiva.id)
          .eq('alcance_stock', 'Empresa')
          .eq('activo', true)
      ])

      if (clientesResponse.error) throw clientesResponse.error
      if (productosPersonalesResponse.error) throw productosPersonalesResponse.error
      if (productosEmpresaResponse.error) throw productosEmpresaResponse.error

      const clientesOrdenados = (clientesResponse.data || [])
        .map(d => d.clientes)
        .filter(Boolean)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))

      const productosUnidos = [
        ...(productosPersonalesResponse.data || []),
        ...(productosEmpresaResponse.data || [])
      ]

      const productosSinDuplicados = Array.from(
        new Map(productosUnidos.map((producto) => [producto.id, producto])).values()
      ).sort((a, b) => String(a.descripcion || '').localeCompare(String(b.descripcion || '')))

      setClientes(clientesOrdenados)
      setProductos(productosSinDuplicados)
    } catch (error) {
      console.error('Error cargando catálogos:', error)
      setFeedback({
        tipo: 'error',
        mensaje: 'No se pudieron cargar clientes o productos: ' + error.message
      })
    }
  }

  const productosFiltrados = useMemo(() => {
    const filtro = normalizarTexto(filtroProducto)

    if (!filtro) return productos

    return productos.filter((producto) => {
      const codigo = normalizarTexto(producto.codigo)
      const descripcion = normalizarTexto(producto.descripcion)
      const nombre = normalizarTexto(producto.nombre)

      return (
        codigo.includes(filtro) ||
        descripcion.includes(filtro) ||
        nombre.includes(filtro)
      )
    })
  }, [productos, filtroProducto])

  const montoTotal = useMemo(() => {
    return carrito.reduce((acc, item) => acc + (item.cantidad * item.precio_unitario), 0)
  }, [carrito])

  const agregarProducto = (productoId) => {
    if (!productoId) return

    const prod = productos.find(p => p.id === productoId)

    if (!prod) return

    setCarrito(prev => {
      const existe = prev.find(i => i.producto_id === prod.id)

      if (existe) {
        return prev.map(i =>
          i.producto_id === prod.id
            ? {
                ...i,
                cantidad: i.cantidad + 1,
                subtotal: (i.cantidad + 1) * i.precio_unitario
              }
            : i
        )
      }

      return [
        ...prev,
        {
          producto_id: prod.id,
          codigo: prod.codigo,
          descripcion: prod.descripcion,
          alcance_stock: prod.alcance_stock || 'Profesional',
          cantidad: 1,
          precio_unitario: Number(prod.precio_venta || 0),
          subtotal: Number(prod.precio_venta || 0)
        }
      ]
    })
  }

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev =>
      prev.map(item => {
        if (item.producto_id === id) {
          const nuevaCant = Math.max(1, item.cantidad + delta)

          return {
            ...item,
            cantidad: nuevaCant,
            subtotal: nuevaCant * item.precio_unitario
          }
        }

        return item
      })
    )
  }

  const quitarProducto = (id) => {
    setCarrito(prev => prev.filter(i => i.producto_id !== id))
  }

  const generarNumeroVenta = async () => {
    const hoy = new Date()
    const yy = String(hoy.getFullYear()).slice(-2)
    const mm = String(hoy.getMonth() + 1).padStart(2, '0')
    const dd = String(hoy.getDate()).padStart(2, '0')
    const prefijo = `${yy}${mm}${dd}`

    const { data, error } = await supabase
      .from('ventas')
      .select('numero_venta')
      .eq('profesional_id', session.user.id)
      .like('numero_venta', `${prefijo}-%`)
      .order('numero_venta', { ascending: false })
      .limit(1)

    if (error) throw error

    if (data && data.length > 0) {
      const ultimoNum = parseInt(data[0].numero_venta.split('-')[1], 10)
      const nuevoNum = String(ultimoNum + 1).padStart(4, '0')

      return `${prefijo}-${nuevoNum}`
    }

    return `${prefijo}-0001`
  }

  const registrarMovimientoCaja = async ({ ventaId, numeroVenta, montoCobrado }) => {
    const { error } = await supabase.rpc('registrar_movimiento_caja', {
      p_empresa_id: empresaActiva.id,
      p_profesional_id: session.user.id,
      p_medio_pago: formData.medio_pago,
      p_tipo_movimiento: 'Ingreso',
      p_monto: montoCobrado,
      p_descripcion: `Venta de productos ${numeroVenta}`,
      p_categoria: 'Venta',
      p_observaciones: null,
      p_venta_id: ventaId,
      p_sesion_id: null,
      p_creado_por: session.user.id,
      p_movimiento_relacionado_id: null
    })

    if (error) throw error
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    setFeedback(null)

    if (!empresaActiva?.id) {
      setFeedback({
        tipo: 'error',
        mensaje: 'Debes seleccionar una empresa activa antes de registrar ventas.'
      })
      return
    }

    if (carrito.length === 0) {
      setFeedback({
        tipo: 'error',
        mensaje: 'Agrega al menos un producto al carrito.'
      })
      return
    }

    const productosEnNegativo = []

    carrito.forEach(item => {
      const prodOriginal = productos.find(p => p.id === item.producto_id)

      if (prodOriginal && (Number(prodOriginal.unidades_enteras || 0) - item.cantidad) < 0) {
        productosEnNegativo.push(item.descripcion)
      }
    })

    if (productosEnNegativo.length > 0) {
      const confirmar = window.confirm(
        `⚠️ ADVERTENCIA DE STOCK:\n\nLos siguientes productos quedarán con stock NEGATIVO:\n- ${productosEnNegativo.join('\n- ')}\n\n¿Deseas continuar con la venta de todas formas?`
      )

      if (!confirmar) return
    }

    setIsSubmitting(true)

    try {
      const numVenta = await generarNumeroVenta()
      const montoCobrado = formData.monto_cobrado
        ? parseFloat(formData.monto_cobrado)
        : montoTotal

      const { data: ventaId, error } = await supabase.rpc('procesar_venta_con_stock', {
        p_venta: {
          numero_venta: numVenta,
          profesional_id: session.user.id,
          empresa_id: empresaActiva.id,
          cliente_id: formData.cliente_id || null,
          monto_total: montoTotal,
          monto_cobrado: montoCobrado,
          medio_pago: formData.medio_pago,
          estado: 'Completada'
        },
        p_detalles: carrito.map(item => ({
          producto_id: item.producto_id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal
        }))
      })

      if (error) throw error

      let ventaIdFinal = ventaId

      if (!ventaIdFinal) {
        const { data: ventaCreada, error: errorBuscarVenta } = await supabase
          .from('ventas')
          .select('id')
          .eq('numero_venta', numVenta)
          .eq('profesional_id', session.user.id)
          .maybeSingle()

        if (errorBuscarVenta) throw errorBuscarVenta

        ventaIdFinal = ventaCreada?.id
      }

      if (!ventaIdFinal) {
        throw new Error('La venta se creó, pero no se pudo obtener su ID para registrar la caja.')
      }

      await registrarMovimientoCaja({
        ventaId: ventaIdFinal,
        numeroVenta: numVenta,
        montoCobrado
      })

      alert(`Venta exitosa: ${numVenta}`)
      onGuardar()
    } catch (error) {
      console.error('Error al guardar venta:', error)

      setFeedback({
        tipo: 'error',
        mensaje: error.message
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleGuardar} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-xl font-light text-stone-800 mb-1">
          Nueva Venta Mostrador
        </h3>

        <p className="text-xs text-stone-400 mb-6">
          Empresa activa:{' '}
          <span className="font-bold text-teal-600">
            {empresaActiva?.nombre || 'Sin empresa'}
          </span>
        </p>

        {feedback && (
          <div
            className={`mb-5 p-4 rounded-xl text-sm font-bold ${
              feedback.tipo === 'error'
                ? 'bg-red-50 text-red-700 border border-red-100'
                : 'bg-green-50 text-green-700 border border-green-100'
            }`}
          >
            {feedback.mensaje}
          </div>
        )}

        <div className="space-y-5">
          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
              Cliente opcional
            </span>

            <select
              value={formData.cliente_id}
              onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="">-- Consumidor Final --</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
              Medio de pago
            </span>

            <select
              value={formData.medio_pago}
              onChange={(e) => setFormData({ ...formData, medio_pago: e.target.value })}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none font-bold text-stone-600 bg-white"
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Tarjeta">Tarjeta</option>
            </select>

            <p className="text-xs text-stone-400 mt-1">
              Transferencia y tarjeta impactan en caja Mercado Pago.
            </p>
          </label>

          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
              Monto cobrado ($)
            </span>

            <input
              type="number"
              step="0.01"
              value={formData.monto_cobrado}
              onChange={(e) => setFormData({ ...formData, monto_cobrado: e.target.value })}
              placeholder={montoTotal.toString()}
              className="w-full px-4 py-3 border border-teal-200 bg-teal-50 rounded-xl outline-none font-black text-teal-800"
            />
          </label>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 flex flex-col">
        <h3 className="text-xl font-light text-stone-800 mb-5">
          Productos a facturar
        </h3>

        <div className="space-y-3 mb-4">
          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
              Buscar producto
            </span>

            <input
              type="search"
              value={filtroProducto}
              onChange={(e) => setFiltroProducto(e.target.value)}
              placeholder="Filtrar por código, nombre o descripción..."
              className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 bg-white text-stone-700"
            />
          </label>

          <select
            onChange={(e) => {
              agregarProducto(e.target.value)
              e.target.value = ''
            }}
            className="w-full px-4 py-3 border border-teal-300 rounded-xl outline-none cursor-pointer text-teal-800 font-bold bg-teal-50 shadow-sm"
          >
            <option value="">
              {productosFiltrados.length === 0
                ? 'No hay productos para ese filtro'
                : '+ Escanear o seleccionar producto...'}
            </option>

            {productosFiltrados.map(p => (
              <option key={p.id} value={p.id}>
                {p.codigo} - {p.descripcion} (${Number(p.precio_venta || 0).toFixed(2)}) · {p.alcance_stock === 'Empresa' ? 'Empresa' : 'Personal'}
              </option>
            ))}
          </select>

          {filtroProducto && (
            <div className="flex items-center justify-between gap-3 text-xs text-stone-400">
              <span>
                {productosFiltrados.length} producto(s) encontrados.
              </span>

              <button
                type="button"
                onClick={() => setFiltroProducto('')}
                className="font-bold text-teal-600 hover:text-teal-700"
              >
                Limpiar filtro
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3 min-h-[260px]">
          {carrito.length === 0 ? (
            <div className="h-full flex items-center justify-center border border-dashed border-stone-200 rounded-2xl text-stone-400 text-center px-4">
              El carrito está vacío.
            </div>
          ) : (
            carrito.map((item) => (
              <div
                key={item.producto_id}
                className="bg-stone-50 border border-stone-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="font-bold text-stone-800 leading-snug break-words"
                    title={item.descripcion}
                  >
                    {item.descripcion}
                  </p>

                  <p className="text-xs text-stone-500 mt-1">
                    {item.codigo ? `${item.codigo} · ` : ''}
                    ${Number(item.precio_unitario || 0).toFixed(2)} c/u · {item.alcance_stock === 'Empresa' ? 'Empresa' : 'Personal'}
                  </p>
                </div>

                <div className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-3 shrink-0 border-t border-stone-200 pt-3 sm:border-t-0 sm:pt-0">
                  <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-2 py-1">
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(item.producto_id, -1)}
                      className="w-8 h-8 rounded-lg font-black text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                      title="Quitar una unidad"
                    >
                      -
                    </button>

                    <span className="font-black text-stone-800 min-w-[28px] text-center">
                      {item.cantidad}
                    </span>

                    <button
                      type="button"
                      onClick={() => cambiarCantidad(item.producto_id, 1)}
                      className="w-8 h-8 rounded-lg font-black text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                      title="Agregar una unidad"
                    >
                      +
                    </button>
                  </div>

                  <p className="font-black text-stone-800 text-right min-w-[100px]">
                    ${Number(item.subtotal || 0).toFixed(2)}
                  </p>

                  <button
                    type="button"
                    onClick={() => quitarProducto(item.producto_id)}
                    className="w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 font-black text-lg flex items-center justify-center transition-colors"
                    title="Quitar producto"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-stone-100 mt-6 pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
            <span className="text-sm font-bold text-stone-500">
              Total a pagar
            </span>

            <span className="text-3xl font-black text-teal-700 break-all">
              ${montoTotal.toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onCancelar}
              className="flex-1 px-5 py-3 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-5 py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:bg-stone-300 transition-colors"
            >
              {isSubmitting ? 'Procesando...' : 'Facturar Venta'}
            </button>
          </div>
        </div>
      </section>
    </form>
  )
}

function normalizarTexto(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}