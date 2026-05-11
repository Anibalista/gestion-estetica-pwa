// src/components/ventas/VentasLista.jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'

export function VentasLista({ session }) {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [fechaFiltro, setFechaFiltro] = useState('') // Si está vacío, es hoy
  const [clienteFiltro, setClienteFiltro] = useState('')
  const [medioPagoFiltro, setMedioPagoFiltro] = useState('Todos')
  const [verAnteriores, setVerAnteriores] = useState(false)

  useEffect(() => {
    fetchVentas()
  }, [session.user.id, fechaFiltro, verAnteriores])

  const fetchVentas = async () => {
    setLoading(true)

    let query = supabase
      .from('ventas')
      .select(`
        *,
        clientes ( nombre ),
        venta_detalles ( cantidad, descripcion, subtotal )
      `)
      .eq('profesional_id', session.user.id)
      .order('fecha_hora', { ascending: false })

    if (fechaFiltro) {
      query = query
        .gte('fecha_hora', `${fechaFiltro}T00:00:00`)
        .lte('fecha_hora', `${fechaFiltro}T23:59:59`)
    } else if (!verAnteriores) {
      const hoy = new Date().toISOString().split('T')[0]

      query = query.gte('fecha_hora', `${hoy}T00:00:00`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error cargando ventas:', error)
      setVentas([])
    } else {
      setVentas(data || [])
    }

    setLoading(false)
  }

  // Lógica de filtrado por cliente y medio de pago
  const ventasFiltradas = ventas.filter(v => {
    const nombreCliente = v.clientes?.nombre || ''

    const matchCliente =
      nombreCliente.toLowerCase().includes(clienteFiltro.toLowerCase()) ||
      !clienteFiltro

    const matchPago =
      medioPagoFiltro === 'Todos' ||
      v.medio_pago === medioPagoFiltro

    return matchCliente && matchPago
  })

  // CÁLCULO DE TOTALES DE LA TABLA
  // IMPORTANTE:
  // El total del listado se calcula usando monto_cobrado,
  // no monto_total.
  const totales = useMemo(() => {
    return ventasFiltradas.reduce((acc, v) => {
      const cantProductos = v.venta_detalles?.reduce((sum, d) => {
        return sum + (Number(d.cantidad) || 0)
      }, 0) || 0

      return {
        unidades: acc.unidades + cantProductos,
        monto: acc.monto + (Number(v.monto_cobrado) || 0)
      }
    }, {
      unidades: 0,
      monto: 0
    })
  }, [ventasFiltradas])

  const formatearDinero = (valor) => {
    const numero = Number(valor) || 0

    return numero.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-stone-400">
        Cargando ventas...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* FILTROS RESPONSIVE */}
      <div className="bg-stone-50 p-4 border-b border-stone-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="date"
            value={fechaFiltro}
            onChange={e => setFechaFiltro(e.target.value)}
            className="px-4 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
          />

          <input
            type="text"
            placeholder="Filtrar por cliente..."
            value={clienteFiltro}
            onChange={e => setClienteFiltro(e.target.value)}
            className="px-4 py-2 border border-stone-200 rounded-xl text-sm outline-none"
          />

          <select
            value={medioPagoFiltro}
            onChange={e => setMedioPagoFiltro(e.target.value)}
            className="px-4 py-2 border border-stone-200 rounded-xl text-sm outline-none"
          >
            <option value="Todos">Todos los pagos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Tarjeta">Tarjeta</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-500 uppercase">
            <input
              type="checkbox"
              checked={verAnteriores}
              onChange={e => setVerAnteriores(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded"
            />
            Cargar historial completo
          </label>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm text-stone-600">
          <thead className="bg-white border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-bold sticky top-0">
            <tr>
              <th className="px-6 py-4">Ticket / Hora</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Productos</th>
              <th className="px-6 py-4 text-center">Medio</th>
              <th className="px-6 py-4 text-right">Total Cobrado</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100">
            {ventasFiltradas.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="px-6 py-10 text-center text-stone-400"
                >
                  No se encontraron ventas para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              ventasFiltradas.map(v => (
                <tr
                  key={v.id}
                  className="hover:bg-stone-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-stone-700">
                      {v.numero_venta}
                    </div>

                    <div className="text-[10px] text-stone-400">
                      {new Date(v.fecha_hora).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })} hs
                    </div>
                  </td>

                  <td className="px-6 py-4 font-medium text-stone-800">
                    {v.clientes?.nombre || 'Consumidor Final'}
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-xs text-stone-500">
                      {v.venta_detalles?.map(d => `${d.cantidad}x ${d.descripcion}`).join(', ')}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className="text-[10px] font-bold uppercase bg-stone-100 px-2 py-1 rounded text-stone-500">
                      {v.medio_pago}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right font-black text-stone-800">
                    ${formatearDinero(v.monto_cobrado)}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* FILA DE TOTALES */}
          <tfoot className="bg-stone-800 text-white font-bold sticky bottom-0">
            <tr>
              <td
                colSpan="2"
                className="px-6 py-4 uppercase tracking-widest text-xs text-stone-400"
              >
                Totales del Periodo
              </td>

              <td className="px-6 py-4 text-teal-400">
                {totales.unidades} unidades
              </td>

              <td></td>

              <td className="px-6 py-4 text-right text-xl text-teal-400">
                ${formatearDinero(totales.monto)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}