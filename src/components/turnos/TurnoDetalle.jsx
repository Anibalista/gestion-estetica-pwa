// src/components/turnos/TurnoDetalle.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export function TurnoDetalle({ turno, onVolver }) {
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (turno) fetchInsumos()
  }, [turno])

  const fetchInsumos = async () => {
    setLoading(true)

    try {
      const detalles = turno?.sesion_detalles || []
      const servicioIdsDirectos = detalles
        .map((detalle) => detalle.servicio_id)
        .filter(Boolean)

      const comboIds = detalles
        .map((detalle) => detalle.combo_id)
        .filter(Boolean)

      let servicioIdsDeCombos = []

      if (comboIds.length > 0) {
        const { data: comboServicios, error: errorComboServicios } = await supabase
          .from('combo_servicios')
          .select('combo_id, servicio_id')
          .in('combo_id', comboIds)

        if (errorComboServicios) throw errorComboServicios

        servicioIdsDeCombos = (comboServicios || [])
          .map((item) => item.servicio_id)
          .filter(Boolean)
      }

      const servicioIds = Array.from(new Set([
        ...servicioIdsDirectos,
        ...servicioIdsDeCombos
      ]))

      if (servicioIds.length === 0) {
        setInsumos([])
        return
      }

      const { data, error } = await supabase
        .from('costo_servicio')
        .select(`
          id,
          servicio_id,
          producto_id,
          descripcion,
          monto,
          cantidad_suelta_usada,
          unidades_usadas,
          productos (
            id,
            descripcion,
            unidad_medida,
            alcance_stock,
            empresa_id,
            profesional_id
          )
        `)
        .in('servicio_id', servicioIds)

      if (error) throw error

      setInsumos(agruparInsumos(data || []))
    } catch (err) {
      console.error('Error cargando insumos:', err)
      setInsumos([])
    } finally {
      setLoading(false)
    }
  }

  const agruparInsumos = (items) => {
    const mapa = {}

    items.forEach((item) => {
      const key = item.producto_id || item.descripcion || item.id

      if (!mapa[key]) {
        mapa[key] = {
          id: key,
          descripcion: item.descripcion || item.productos?.descripcion || 'Gasto sin descripción',
          unidadMedida: item.productos?.unidad_medida || '',
          alcanceStock: item.productos?.alcance_stock || 'Profesional',
          monto: 0,
          cantidadSuelta: 0,
          unidades: 0
        }
      }

      mapa[key].monto += Number(item.monto || 0)
      mapa[key].cantidadSuelta += Number(item.cantidad_suelta_usada || 0)
      mapa[key].unidades += Number(item.unidades_usadas || 0)
    })

    return Object.values(mapa)
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha'

    const fechaObj = new Date(fecha)

    if (Number.isNaN(fechaObj.getTime())) return 'Sin fecha'

    return fechaObj.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatearDinero = (valor) => {
    return `$${Number(valor || 0).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  const obtenerTextoCantidad = (insumo) => {
    const partes = []

    if (Number(insumo.unidades || 0) > 0) {
      partes.push(`${insumo.unidades} un.`)
    }

    if (Number(insumo.cantidadSuelta || 0) > 0) {
      partes.push(`${insumo.cantidadSuelta} ${insumo.unidadMedida}`.trim())
    }

    return partes.length > 0 ? partes.join(' + ') : 'Sin cantidad configurada'
  }

  if (!turno) {
    return (
      <div className="p-8 text-center text-stone-400">
        No hay sesión seleccionada.
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto animate-fadeIn">
      <button
        type="button"
        onClick={onVolver}
        className="mb-6 text-stone-400 hover:text-stone-800 transition flex items-center gap-2 text-sm font-medium"
      >
        ← Volver a la agenda
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-teal-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold">
                {turno.clientes?.nombre?.charAt(0) || '?'}
              </div>

              <div>
                <h2 className="text-xl font-bold text-stone-800">
                  {turno.clientes?.nombre || 'Cliente sin nombre'}
                </h2>
                <p className="text-sm text-stone-500">
                  {turno.clientes?.telefono || 'Sin teléfono'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-t border-stone-100">
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                  Fecha y Hora
                </p>
                <p className="text-sm font-medium text-stone-700 capitalize">
                  {formatearFecha(turno.fecha_hora)}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                  Estado
                </p>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                  turno.estado === 'Cobrada'
                    ? 'bg-teal-100 text-teal-700'
                    : turno.estado === 'Anulada'
                      ? 'bg-red-100 text-red-700'
                      : turno.estado === 'Ausente'
                        ? 'bg-stone-200 text-stone-700'
                        : 'bg-orange-100 text-orange-700'
                }`}>
                  {turno.estado}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-100">
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                  Medio de pago
                </p>
                <p className="text-sm font-medium text-stone-700">
                  {turno.medio_pago || 'Sin medio'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                  Cobrado
                </p>
                <p className="text-sm font-black text-teal-700">
                  {formatearDinero(turno.monto_cobrado || 0)}
                </p>
              </div>
            </div>
          </div>

          {turno.a_domicilio && (
            <div className="bg-teal-50/50 border border-teal-100 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-teal-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                🏠 Dirección de Atención
              </h3>
              <div className="text-stone-700 space-y-1">
                <p className="text-lg font-medium">
                  {turno.clientes?.direcciones?.calle} {turno.clientes?.direcciones?.numero}
                </p>
                <p className="text-sm text-stone-600">
                  {turno.clientes?.direcciones?.barrio}
                </p>
                {turno.clientes?.direcciones?.observaciones && (
                  <p className="mt-3 p-3 bg-white/60 rounded-xl text-xs italic border border-teal-100">
                    &quot;{turno.clientes?.direcciones?.observaciones}&quot;
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-3">
              Observaciones de la Sesión
            </h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              {turno.observaciones || 'Sin observaciones registradas para esta cita.'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-stone-800 rounded-3xl p-6 text-white shadow-xl">
            <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">
              Servicios contratados
            </h3>

            <ul className="space-y-3">
              {turno.sesion_detalles?.map((det, i) => (
                <li key={det.id || i} className="flex justify-between items-center border-b border-stone-700 pb-2 gap-3">
                  <span className="text-sm font-medium">
                    {det.servicios?.nombre || det.combos?.nombre || 'Detalle sin nombre'}
                  </span>
                  <span className="text-xs text-stone-400 shrink-0">
                    {formatearDinero(det.precio_cobrado)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-4 border-t border-stone-600 flex justify-between items-end">
              <span className="text-xs text-stone-400">
                Total a cobrar:
              </span>
              <span className="text-2xl font-black text-teal-400">
                {formatearDinero(turno.monto_total)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">
              Insumos necesarios
            </h3>

            {loading ? (
              <p className="text-xs text-stone-400">
                Calculando...
              </p>
            ) : insumos.length > 0 ? (
              <ul className="space-y-3">
                {insumos.map((insumo) => (
                  <li key={insumo.id} className="flex gap-3 items-start">
                    <span className="text-teal-600">💧</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-stone-700 truncate" title={insumo.descripcion}>
                        {insumo.descripcion}
                      </p>
                      <p className="text-[10px] text-stone-400 uppercase">
                        {obtenerTextoCantidad(insumo)}
                      </p>
                      <p className="text-[10px] text-stone-400 uppercase">
                        {insumo.alcanceStock === 'Empresa' ? 'Stock empresa' : 'Stock personal'} · Costo: {formatearDinero(insumo.monto)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-400 italic">
                No se registraron insumos específicos para estos servicios.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
