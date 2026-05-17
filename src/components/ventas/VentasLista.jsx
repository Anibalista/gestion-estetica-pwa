// src/components/ventas/VentasLista.jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'

export function VentasLista({
  session,
  empresaActiva,
  rolEmpresa
}) {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)

  const [fechaFiltro, setFechaFiltro] = useState('')
  const [clienteFiltro, setClienteFiltro] = useState('')
  const [medioPagoFiltro, setMedioPagoFiltro] = useState('Todos')
  const [verAnteriores, setVerAnteriores] = useState(false)

  const puedeVerEmpresaCompleta = ['Dueño', 'Administrador', 'Recepcionista'].includes(rolEmpresa)

  useEffect(() => {
    if (empresaActiva?.id) {
      fetchVentas()
    }
  }, [session.user.id, empresaActiva?.id, fechaFiltro, verAnteriores])

  const fetchVentas = async () => {
    setLoading(true)

    let query = supabase
      .from('ventas')
      .select(`
        *,
        clientes ( nombre ),
        profesionales ( nombre_negocio ),
        venta_detalles (
          cantidad,
          descripcion,
          subtotal
        )
      `)
      .eq('empresa_id', empresaActiva.id)
      .order('fecha_hora', { ascending: false })

    if (!puedeVerEmpresaCompleta) {
      query = query.eq('profesional_id', session.user.id)
    }

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
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
            />

            <input
              type="text"
              placeholder="Filtrar por cliente..."
              value={clienteFiltro}
              onChange={(e) => setClienteFiltro(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
            />

            <select
              value={medioPagoFiltro}
              onChange={(e) => setMedioPagoFiltro(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="Todos">Todos los pagos</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Tarjeta">Tarjeta</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-stone-600">
            <input
              type="checkbox"
              checked={verAnteriores}
              onChange={(e) => setVerAnteriores(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded"
            />
            Cargar historial completo
          </label>
        </div>

        <p className="text-xs text-stone-400 mt-3">
          Empresa activa:{' '}
          <span className="font-bold text-teal-600">
            {empresaActiva?.nombre || 'Sin empresa'}
          </span>
          {' · '}
          {puedeVerEmpresaCompleta
            ? 'Mostrando ventas de la empresa'
            : 'Mostrando solo tus ventas'}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-600">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Ticket / Hora</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Profesional</th>
                <th className="px-6 py-4">Productos</th>
                <th className="px-6 py-4">Medio</th>
                <th className="px-6 py-4 text-right">Total Cobrado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100">
              {ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-stone-400 font-light">
                    No se encontraron ventas para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                ventasFiltradas.map(v => (
                  <tr key={v.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-mono text-xs font-bold text-stone-700">
                        {v.numero_venta}
                      </p>

                      <p className="text-xs text-stone-400 mt-1">
                        {new Date(v.fecha_hora).toLocaleDateString('es-AR')}{' '}
                        {new Date(v.fecha_hora).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} hs
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      {v.clientes?.nombre || 'Consumidor Final'}
                    </td>

                    <td className="px-6 py-4">
                      {v.profesionales?.nombre_negocio || 'Sin profesional'}
                    </td>

                    <td className="px-6 py-4 max-w-md">
                      <p className="truncate" title={v.venta_detalles?.map(d => `${d.cantidad}x ${d.descripcion}`).join(', ')}>
                        {v.venta_detalles?.map(d => `${d.cantidad}x ${d.descripcion}`).join(', ')}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[10px] font-black uppercase tracking-widest">
                        {v.medio_pago}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right font-black text-stone-800">
                      ${formatearDinero(v.monto_cobrado)}
                    </td>
                  </tr>
                ))
              )}

              <tr className="bg-teal-50 border-t border-teal-100">
                <td colSpan="3" className="px-6 py-4 font-black text-teal-800">
                  Totales del período
                </td>

                <td className="px-6 py-4 font-bold text-teal-800">
                  {totales.unidades} unidades
                </td>

                <td className="px-6 py-4" />

                <td className="px-6 py-4 text-right font-black text-teal-800">
                  ${formatearDinero(totales.monto)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}