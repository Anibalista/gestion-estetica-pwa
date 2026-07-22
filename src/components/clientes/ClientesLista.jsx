// src/components/clientes/ClientesLista.jsx

import { useMemo, useState } from 'react'

export function ClientesLista({
  clientes,
  isLoading,
  onNuevo,
  onEditar,
  onVerDetalle,
  onDesvincular
}) {
  const [filtro, setFiltro] = useState('')
  const [columnaOrden, setColumnaOrden] = useState('nombre')
  const [direccionOrden, setDireccionOrden] = useState('asc')

  const formatearFechaLocal = (fechaStr) => {
    if (!fechaStr) return '---'

    const [anio, mes, dia] = fechaStr.split('-')

    if (!anio || !mes || !dia) return '---'

    return `${dia}/${mes}/${anio}`
  }

  const normalizarTexto = (valor) => {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  }

  const normalizarTelefono = (valor) => {
    return String(valor || '').replace(/\D/g, '')
  }

  const obtenerDireccion = (cliente) => {
    if (Array.isArray(cliente?.direcciones)) {
      return cliente.direcciones[0] || null
    }

    return cliente?.direcciones || null
  }

  const clientesFiltradosYOrdenados = useMemo(() => {
    const textoFiltro = normalizarTexto(filtro)
    const telefonoFiltro = normalizarTelefono(filtro)

    const filtrados = (clientes || []).filter((cliente) => {
      if (!textoFiltro && !telefonoFiltro) return true

      const nombre = normalizarTexto(cliente.nombre)
      const telefonoTexto = normalizarTexto(cliente.telefono)
      const telefonoNumerico = normalizarTelefono(cliente.telefono)

      const coincideNombre = nombre.includes(textoFiltro)

      const coincideTelefonoTexto =
        telefonoTexto.includes(textoFiltro)

      const coincideTelefonoNumerico =
        telefonoFiltro.length > 0 &&
        telefonoNumerico.includes(telefonoFiltro)

      return (
        coincideNombre ||
        coincideTelefonoTexto ||
        coincideTelefonoNumerico
      )
    })

    return [...filtrados].sort((clienteA, clienteB) => {
      let valorA = ''
      let valorB = ''

      if (columnaOrden === 'nombre') {
        valorA = normalizarTexto(clienteA.nombre)
        valorB = normalizarTexto(clienteB.nombre)
      }

      if (columnaOrden === 'telefono') {
        valorA = normalizarTelefono(clienteA.telefono)
        valorB = normalizarTelefono(clienteB.telefono)
      }

      if (columnaOrden === 'fecha_nacimiento') {
        valorA = clienteA.fecha_nacimiento || ''
        valorB = clienteB.fecha_nacimiento || ''
      }

      const comparacion = valorA.localeCompare(valorB, 'es', {
        numeric: true,
        sensitivity: 'base'
      })

      return direccionOrden === 'asc'
        ? comparacion
        : comparacion * -1
    })
  }, [clientes, filtro, columnaOrden, direccionOrden])

  const ordenarPor = (columna) => {
    if (columnaOrden === columna) {
      setDireccionOrden((actual) =>
        actual === 'asc' ? 'desc' : 'asc'
      )

      return
    }

    setColumnaOrden(columna)
    setDireccionOrden('asc')
  }

  const obtenerFlechaOrden = (columna) => {
    if (columnaOrden !== columna) {
      return '↕'
    }

    return direccionOrden === 'asc' ? '↑' : '↓'
  }

  const importarClientes = () => {
    alert(
      'La importación estará disponible cuando se defina el formato del archivo y los campos de patologías o fichas.'
    )
  }

  const exportarClientes = () => {
    alert(
      'La exportación se configurará junto con el formato de importación de clientes.'
    )
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-stone-400">
        Cargando clientes...
      </div>
    )
  }

  if (clientes.length === 0) {
    return (
      <div className="p-12 text-center text-stone-400">
        <p className="text-lg font-light">
          Aún no hay clientes registrados.
        </p>

        <button
          type="button"
          onClick={onNuevo}
          className="mt-4 text-teal-600 hover:text-teal-700 font-medium"
        >
          Crear el primer cliente →
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* FILTRO Y ACCIONES */}
      <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex-1 max-w-2xl">
            <label
              htmlFor="filtro-clientes"
              className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2"
            >
              Buscar cliente
            </label>

            <div className="relative">
              <input
                id="filtro-clientes"
                type="search"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar por nombre o teléfono..."
                autoComplete="off"
                className="w-full pl-10 pr-10 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm text-stone-700"
              />

              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                🔍
              </span>

              {filtro && (
                <button
                  type="button"
                  onClick={() => setFiltro('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                  title="Limpiar búsqueda"
                >
                  ×
                </button>
              )}
            </div>

            <p className="text-xs text-stone-400 mt-2">
              Mostrando {clientesFiltradosYOrdenados.length} de{' '}
              {clientes.length} cliente(s).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={importarClientes}
              className="px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-600 text-sm font-bold hover:bg-stone-100 transition-colors"
              title="Importación pendiente de configuración"
            >
              Importar clientes
            </button>

            <button
              type="button"
              onClick={exportarClientes}
              className="px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-600 text-sm font-bold hover:bg-stone-100 transition-colors"
              title="Exportación pendiente de configuración"
            >
              Exportar clientes
            </button>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-stone-600">
          <thead className="bg-stone-50 border-b border-stone-200 text-xs uppercase text-stone-500 font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">
                <button
                  type="button"
                  onClick={() => ordenarPor('nombre')}
                  className="flex items-center gap-2 uppercase tracking-wider hover:text-teal-600 transition-colors"
                  title="Ordenar por nombre"
                >
                  <span>Nombre</span>
                  <span className="text-sm">
                    {obtenerFlechaOrden('nombre')}
                  </span>
                </button>
              </th>

              <th className="px-6 py-4">
                <button
                  type="button"
                  onClick={() => ordenarPor('telefono')}
                  className="flex items-center gap-2 uppercase tracking-wider hover:text-teal-600 transition-colors"
                  title="Ordenar por teléfono"
                >
                  <span>Teléfono</span>
                  <span className="text-sm">
                    {obtenerFlechaOrden('telefono')}
                  </span>
                </button>
              </th>

              <th className="px-6 py-4">
                <button
                  type="button"
                  onClick={() => ordenarPor('fecha_nacimiento')}
                  className="flex items-center gap-2 uppercase tracking-wider hover:text-teal-600 transition-colors"
                  title="Ordenar por fecha de nacimiento"
                >
                  <span>Nacimiento</span>
                  <span className="text-sm">
                    {obtenerFlechaOrden('fecha_nacimiento')}
                  </span>
                </button>
              </th>

              <th className="px-6 py-4">
                Domicilio
              </th>

              <th className="px-6 py-4 text-right">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100">
            {clientesFiltradosYOrdenados.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="px-6 py-12 text-center text-stone-400"
                >
                  <p className="text-lg font-light">
                    No se encontraron clientes.
                  </p>

                  <p className="text-xs mt-1">
                    Revisá el nombre o teléfono ingresado.
                  </p>

                  <button
                    type="button"
                    onClick={() => setFiltro('')}
                    className="mt-4 text-teal-600 hover:text-teal-700 font-bold"
                  >
                    Limpiar búsqueda
                  </button>
                </td>
              </tr>
            ) : (
              clientesFiltradosYOrdenados.map((cliente) => {
                const direccion = obtenerDireccion(cliente)

                return (
                  <tr
                    key={cliente.id}
                    onClick={() => onVerDetalle(cliente)}
                    className="hover:bg-stone-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4 font-medium text-stone-800">
                      {cliente.nombre || 'Sin nombre'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {cliente.telefono || 'Sin teléfono'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatearFechaLocal(
                        cliente.fecha_nacimiento
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {direccion ? (
                        <div className="relative flex items-center group/tooltip w-fit">
                          <span className="text-teal-600 text-lg cursor-help transition-transform hover:scale-110">
                            🏠
                          </span>

                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-stone-800 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none">
                            <p className="font-bold text-teal-300 mb-1">
                              Dirección registrada
                            </p>

                            <p>
                              {[direccion.calle, direccion.numero]
                                .filter(Boolean)
                                .join(' ') || 'Sin calle registrada'}
                            </p>

                            {direccion.barrio && (
                              <p>{direccion.barrio}</p>
                            )}

                            {direccion.observaciones && (
                              <p className="mt-1 pt-1 border-t border-stone-600 text-stone-300 italic">
                                “{direccion.observaciones}”
                              </p>
                            )}

                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800" />
                          </div>
                        </div>
                      ) : (
                        <span className="text-stone-300">
                          -
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditar(cliente)
                          }}
                          className="text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-md transition-colors font-medium text-xs active:scale-95"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDesvincular(cliente)
                          }}
                          className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors font-medium text-xs active:scale-95"
                        >
                          Desvincular
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