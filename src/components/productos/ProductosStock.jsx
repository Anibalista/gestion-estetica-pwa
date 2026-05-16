// src/components/productos/ProductosStock.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export function ProductosStock({ session, onEditar }) {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activos')
  const [filtroStock, setFiltroStock] = useState('todos')

  const [orden, setOrden] = useState({
    campo: 'descripcion',
    direccion: 'asc'
  })

  useEffect(() => {
    fetchProductos()
  }, [session.user.id])

  const fetchProductos = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('profesional_id', session.user.id)

    if (!error) {
      setProductos(data || [])
    }

    setLoading(false)
  }

  const toggleAnular = async (producto) => {
    const esActivo = producto.activo !== false
    const nuevoEstado = !esActivo
    const accion = nuevoEstado ? 'restaurar' : 'anular'

    if (!window.confirm(`¿Estás seguro de que deseas ${accion} el producto "${producto.descripcion}"?`)) return

    try {
      const { error } = await supabase
        .from('productos')
        .update({ activo: nuevoEstado })
        .eq('id', producto.id)

      if (error) throw error

      setProductos(prev =>
        prev.map(p =>
          p.id === producto.id
            ? { ...p, activo: nuevoEstado }
            : p
        )
      )
    } catch (error) {
      alert('Error al cambiar el estado: ' + error.message)
    }
  }

  const cambiarOrden = (campo) => {
    setOrden(prev => {
      if (prev.campo === campo) {
        return {
          campo,
          direccion: prev.direccion === 'asc' ? 'desc' : 'asc'
        }
      }

      return {
        campo,
        direccion: 'asc'
      }
    })
  }

  const obtenerStockTotal = (producto) => {
    const unidadesEnteras = Number(producto.unidades_enteras || 0)
    const cantidadSuelta = Number(producto.cantidad_suelta || 0)
    const dosificacion = Number(producto.dosificacion || 0)

    return cantidadSuelta + (unidadesEnteras * dosificacion)
  }

  const tieneStock = (producto) => {
    const unidadesEnteras = Number(producto.unidades_enteras || 0)
    const cantidadSuelta = Number(producto.cantidad_suelta || 0)

    return unidadesEnteras > 0 || cantidadSuelta > 0
  }

  const obtenerValorOrden = (producto, campo) => {
    if (campo === 'codigo') {
      return producto.codigo || ''
    }

    if (campo === 'descripcion') {
      return producto.descripcion || ''
    }

    if (campo === 'stock') {
      return obtenerStockTotal(producto)
    }

    if (campo === 'vencimiento') {
      if (!producto.proximo_vencimiento) return null

      const fecha = new Date(producto.proximo_vencimiento)

      if (Number.isNaN(fecha.getTime())) return null

      return fecha.getTime()
    }

    return ''
  }

  const compararValores = (a, b) => {
    if (a === null && b === null) return 0
    if (a === null) return 1
    if (b === null) return -1

    if (typeof a === 'number' && typeof b === 'number') {
      return a - b
    }

    return String(a).localeCompare(String(b), 'es', {
      sensitivity: 'base',
      numeric: true
    })
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha'

    const fechaObj = new Date(fecha)

    if (Number.isNaN(fechaObj.getTime())) return 'Sin fecha'

    return fechaObj.toLocaleDateString('es-AR')
  }

  const obtenerEstadoVencimiento = (fecha) => {
    if (!fecha) {
      return {
        texto: 'Sin vencimiento',
        clase: 'text-stone-400'
      }
    }

    const hoy = new Date()
    const fechaVencimiento = new Date(fecha)

    hoy.setHours(0, 0, 0, 0)
    fechaVencimiento.setHours(0, 0, 0, 0)

    if (Number.isNaN(fechaVencimiento.getTime())) {
      return {
        texto: 'Sin vencimiento',
        clase: 'text-stone-400'
      }
    }

    const dias = Math.ceil((fechaVencimiento - hoy) / 86400000)

    if (dias < 0) {
      return {
        texto: `Vencido hace ${Math.abs(dias)} días`,
        clase: 'text-red-600 font-bold'
      }
    }

    if (dias <= 30) {
      return {
        texto: `Vence en ${dias} días`,
        clase: 'text-red-500 font-bold'
      }
    }

    if (dias <= 60) {
      return {
        texto: `Vence en ${dias} días`,
        clase: 'text-orange-500 font-bold'
      }
    }

    if (dias <= 90) {
      return {
        texto: `Vence en ${dias} días`,
        clase: 'text-yellow-600 font-bold'
      }
    }

    return {
      texto: `Vence en ${dias} días`,
      clase: 'text-stone-400'
    }
  }

  const productosFiltrados = productos.filter(p => {
    const esActivo = p.activo !== false
    const productoTieneStock = tieneStock(p)

    const matchEstado =
      filtroEstado === 'todos' ||
      (filtroEstado === 'activos' && esActivo) ||
      (filtroEstado === 'anulados' && !esActivo)

    const matchStock =
      filtroStock === 'todos' ||
      (filtroStock === 'con-stock' && productoTieneStock) ||
      (filtroStock === 'sin-stock' && !productoTieneStock)

    const termino = busqueda.toLowerCase()

    const matchBusqueda = 
      (p.descripcion && p.descripcion.toLowerCase().includes(termino)) || 
      (p.codigo && p.codigo.toLowerCase().includes(termino))

    return matchEstado && matchStock && matchBusqueda
  })

  const productosOrdenados = [...productosFiltrados].sort((a, b) => {
    const valorA = obtenerValorOrden(a, orden.campo)
    const valorB = obtenerValorOrden(b, orden.campo)
    const resultado = compararValores(valorA, valorB)

    return orden.direccion === 'asc' ? resultado : resultado * -1
  })

  if (loading) {
    return (
      <div className="p-10 text-center text-stone-400">
        Cargando inventario...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      
      <div className="bg-stone-50 p-4 border-b border-stone-200 flex flex-col gap-4">
        
        <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
          <div className="relative w-full xl:w-1/3">
            <input 
              type="text" 
              placeholder="Buscar por código o descripción..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
            />

            <svg 
              className="w-5 h-5 text-stone-400 absolute left-3 top-2.5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <FiltroSelect
              label="Estado"
              value={filtroEstado}
              onChange={setFiltroEstado}
              options={[
                { value: 'activos', label: 'Activos' },
                { value: 'anulados', label: 'Anulados' },
                { value: 'todos', label: 'Todos' }
              ]}
            />

            <FiltroSelect
              label="Stock"
              value={filtroStock}
              onChange={setFiltroStock}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'con-stock', label: 'Con stock' },
                { value: 'sin-stock', label: 'Sin stock' }
              ]}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm text-stone-600">
          <thead className="bg-white border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-bold">
            <tr>
              <th className="px-6 py-4">
                <BotonOrden
                  label="Código"
                  campo="codigo"
                  orden={orden}
                  onClick={cambiarOrden}
                />
              </th>

              <th className="px-6 py-4">
                <BotonOrden
                  label="Nombre"
                  campo="descripcion"
                  orden={orden}
                  onClick={cambiarOrden}
                />
              </th>

              <th className="px-6 py-4 text-center">
                <div className="flex justify-center">
                  <BotonOrden
                    label="Stock"
                    campo="stock"
                    orden={orden}
                    onClick={cambiarOrden}
                  />
                </div>
              </th>

              <th className="px-6 py-4 text-center">
                <div className="flex justify-center">
                  <BotonOrden
                    label="Vencimiento"
                    campo="vencimiento"
                    orden={orden}
                    onClick={cambiarOrden}
                  />
                </div>
              </th>

              <th className="px-6 py-4 text-center">
                Precio Venta
              </th>

              <th className="px-6 py-4 text-right">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100">
            
            {productosOrdenados.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-stone-400 font-light">
                  No se encontraron productos con esos filtros.
                </td>
              </tr>
            ) : (
              productosOrdenados.map((p) => {
                const esActivo = p.activo !== false
                const unidadesEnteras = Number(p.unidades_enteras || 0)
                const stockMinimo = Number(p.stock_minimo || 0)
                const alertaStock = unidadesEnteras <= stockMinimo
                const vencimiento = obtenerEstadoVencimiento(p.proximo_vencimiento)

                return (
                  <tr 
                    key={p.id} 
                    className={`hover:bg-stone-50 group transition-colors ${!esActivo ? 'bg-stone-50 opacity-60 grayscale' : ''}`}
                  >
                    <td className="px-6 py-4 font-mono text-xs font-bold text-stone-500">
                      {p.codigo}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div 
                        className={`font-medium ${!esActivo ? 'text-stone-500 line-through' : 'text-stone-800'}`}
                        title={p.descripcion}
                      >
                        {p.descripcion}
                      </div>

                      <div className="text-xs text-stone-400 mt-0.5">
                        {p.dosificacion || 0} {p.unidad_medida || ''} | Costo: ${Number(p.costo_unidad || 0).toFixed(2)}
                      </div>

                      {!esActivo && (
                        <span className="inline-block mt-1 text-[9px] text-stone-500 font-bold uppercase tracking-widest bg-stone-200 px-2 py-0.5 rounded-full">
                          Anulado
                        </span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <div className={`font-bold text-sm ${alertaStock && esActivo ? 'text-red-500' : 'text-stone-700'}`}>
                        {unidadesEnteras} unid.
                      </div>

                      <div className="text-xs text-stone-400">
                        + {Number(p.cantidad_suelta || 0)} {p.unidad_medida || ''}
                      </div>

                      {alertaStock && esActivo && (
                        <span className="block text-[9px] text-red-500 font-bold uppercase tracking-widest mt-1">
                          Reponer
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="font-bold text-stone-700 text-sm">
                        {formatearFecha(p.proximo_vencimiento)}
                      </div>

                      <div className={`text-[10px] uppercase tracking-widest mt-1 ${vencimiento.clase}`}>
                        {vencimiento.texto}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center font-medium text-stone-800">
                      ${Number(p.precio_venta || 0).toFixed(2)}
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 group-hover:opacity-100 transition-opacity">
                        <button 
                          type="button"
                          onClick={() => onEditar(p)}
                          className="bg-stone-100 text-stone-600 px-3 py-1.5 rounded hover:bg-teal-100 hover:text-teal-700 transition-all text-xs font-bold"
                        >
                          EDITAR
                        </button>

                        <button 
                          type="button"
                          onClick={() => toggleAnular(p)}
                          className={`px-3 py-1.5 rounded transition-all text-xs font-bold ${
                            esActivo 
                              ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-800' 
                              : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                          }`}
                        >
                          {esActivo ? 'ANULAR' : 'RESTAURAR'}
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

function FiltroSelect({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
        {label}
      </span>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-stone-600 border border-stone-200 outline-none focus:ring-2 focus:ring-teal-500 min-w-[150px]"
      >
        {options.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function BotonOrden({ label, campo, orden, onClick }) {
  const activo = orden.campo === campo
  const flecha = orden.direccion === 'asc' ? '↑' : '↓'

  return (
    <button
      type="button"
      onClick={() => onClick(campo)}
      className={`flex items-center gap-2 uppercase text-[10px] tracking-wider font-bold transition-colors ${
        activo
          ? 'text-teal-600'
          : 'text-stone-400 hover:text-teal-600'
      }`}
      title={`Ordenar por ${label}`}
    >
      <span>{label}</span>
      <span className="text-sm leading-none">
        {activo ? flecha : '↕'}
      </span>
    </button>
  )
}