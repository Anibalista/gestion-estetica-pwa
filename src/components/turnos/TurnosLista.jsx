// src/components/turnos/TurnosLista.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import {
  formatearFechaHoraApp,
  inicioDiaAppISO,
  obtenerFechaInputApp,
  obtenerFechaInputDesdeValorApp
} from '../../utils/fechas'

const MEDIOS_PAGO = [
  'Efectivo',
  'Transferencia',
  'Tarjeta'
]

export function TurnosLista({
  session,
  empresaActiva,
  rolEmpresa,
  onEditar,
  onVerDetalle
}) {
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [filtroMedioPago, setFiltroMedioPago] = useState('Todos')
  const [verAnteriores, setVerAnteriores] = useState(false)
  const [ordenFecha, setOrdenFecha] = useState('asc')

  const formatearFechaHora = (isoString) => {
    return formatearFechaHoraApp(isoString)
  }

  const cambiarOrdenFecha = () => {
    setOrdenFecha(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const registrarIngresoCajaSesion = async (turno, datosActualizar) => {
  if (!empresaActiva?.id) {
    throw new Error('No hay empresa activa seleccionada.')
  }

  const montoCobrado = Number(datosActualizar.monto_cobrado || turno.monto_cobrado || turno.monto_total || 0)

  if (montoCobrado <= 0) {
    throw new Error('El monto cobrado debe ser mayor a cero.')
  }

  const medioPago = datosActualizar.medio_pago || turno.medio_pago || 'Efectivo'

  const { data: movimientoExistente, error: errorMovimientoExistente } = await supabase
    .from('caja_movimientos')
    .select('id')
    .eq('sesion_id', turno.id)
    .eq('tipo_movimiento', 'Ingreso')
    .maybeSingle()

  if (errorMovimientoExistente) throw errorMovimientoExistente

  if (movimientoExistente) return

  const { error } = await supabase.rpc('registrar_movimiento_caja', {
    p_empresa_id: empresaActiva.id,
    p_profesional_id: session.user.id,
    p_medio_pago: medioPago,
    p_tipo_movimiento: 'Ingreso',
    p_monto: montoCobrado,
    p_descripcion: `Cobro de sesión`,
    p_categoria: 'Sesion',
    p_observaciones: turno.observaciones || null,
    p_venta_id: null,
    p_sesion_id: turno.id,
    p_creado_por: session.user.id,
    p_movimiento_relacionado_id: null,
    p_fecha_operativa: obtenerFechaInputDesdeValorApp(turno.fecha_hora),
    p_created_at: new Date().toISOString()
  })

  if (error) throw error
}

  const registrarAnulacionCajaSesion = async (turno) => {
    const { data: ingreso, error: errorIngreso } = await supabase
      .from('caja_movimientos')
      .select('id, monto, medio_pago, fecha_operativa')
      .eq('sesion_id', turno.id)
      .eq('tipo_movimiento', 'Ingreso')
      .maybeSingle()

    if (errorIngreso) throw errorIngreso
    if (!ingreso) return

    const { data: anulacionExistente, error: errorAnulacionExistente } = await supabase
      .from('caja_movimientos')
      .select('id')
      .eq('movimiento_relacionado_id', ingreso.id)
      .eq('tipo_movimiento', 'Anulacion')
      .maybeSingle()

    if (errorAnulacionExistente) throw errorAnulacionExistente
    if (anulacionExistente) return

    const { error } = await supabase.rpc('registrar_movimiento_caja', {
      p_empresa_id: empresaActiva.id,
      p_profesional_id: session.user.id,
      p_medio_pago: ingreso.medio_pago || turno.medio_pago || 'Efectivo',
      p_tipo_movimiento: 'Anulacion',
      p_monto: Math.abs(Number(ingreso.monto || 0)),
      p_descripcion: 'Anulación de cobro de sesión',
      p_categoria: 'Anulacion',
      p_observaciones: `Anulación automática por cambio de estado de sesión.`,
      p_venta_id: null,
      p_sesion_id: turno.id,
      p_creado_por: session.user.id,
      p_movimiento_relacionado_id: ingreso.id,
      p_fecha_operativa: ingreso.fecha_operativa || obtenerFechaInputDesdeValorApp(turno.fecha_hora),
      p_created_at: new Date().toISOString()
    })

    if (error) throw error
  }

  const actualizarEstado = async (id, nuevoEstado) => {
    try {
      const turnoActual = turnos.find(t => t.id === id)

      if (!turnoActual) return

      if (!empresaActiva?.id) {
        alert('Debes seleccionar una empresa activa antes de cobrar sesiones.')
        return
      }

      const estadoAnterior = turnoActual.estado

      const datosActualizar = {
        estado: nuevoEstado,
        empresa_id: turnoActual.empresa_id || empresaActiva.id
      }

      if (nuevoEstado === 'Cobrada') {
        datosActualizar.monto_cobrado =
          Number(turnoActual.monto_cobrado) > 0
            ? Number(turnoActual.monto_cobrado)
            : Number(turnoActual.monto_total) || 0

        datosActualizar.medio_pago = turnoActual.medio_pago || 'Efectivo'
      } else {
        datosActualizar.monto_cobrado = 0
        datosActualizar.medio_pago = null
      }

      const { error } = await supabase
        .from('sesiones')
        .update(datosActualizar)
        .eq('id', id)

      if (error) throw error

      if (nuevoEstado === 'Cobrada' && estadoAnterior !== 'Cobrada') {
        await registrarIngresoCajaSesion(turnoActual, datosActualizar)
      }

      if (estadoAnterior === 'Cobrada' && nuevoEstado !== 'Cobrada') {
        await registrarAnulacionCajaSesion(turnoActual)
      }

      setTurnos(prev =>
        prev.map(t =>
          t.id === id
            ? {
                ...t,
                estado: nuevoEstado,
                empresa_id: datosActualizar.empresa_id,
                monto_cobrado: datosActualizar.monto_cobrado,
                medio_pago: datosActualizar.medio_pago
              }
            : t
        )
      )
    } catch (err) {
      console.error('Error al actualizar estado:', err.message)
      alert('No se pudo actualizar el estado. ' + err.message)
    }
  }

  const actualizarMedioPago = async (id, nuevoMedioPago) => {
    try {
      const turnoActual = turnos.find(t => t.id === id)

      if (!turnoActual) return

      if (!empresaActiva?.id) {
        alert('Debes seleccionar una empresa activa antes de modificar el medio de pago.')
        return
      }

      if (turnoActual.estado === 'Cobrada') {
        await registrarAnulacionCajaSesion(turnoActual)
      }

      const { error } = await supabase
        .from('sesiones')
        .update({
          medio_pago: nuevoMedioPago,
          empresa_id: turnoActual.empresa_id || empresaActiva.id
        })
        .eq('id', id)

      if (error) throw error

      const turnoActualizado = {
        ...turnoActual,
        medio_pago: nuevoMedioPago,
        empresa_id: turnoActual.empresa_id || empresaActiva.id
      }

      if (turnoActual.estado === 'Cobrada') {
        await registrarIngresoCajaSesion(turnoActualizado, {
          monto_cobrado: turnoActual.monto_cobrado,
          medio_pago: nuevoMedioPago
        })
      }

      setTurnos(prev =>
        prev.map(t =>
          t.id === id
            ? {
                ...t,
                medio_pago: nuevoMedioPago,
                empresa_id: turnoActual.empresa_id || empresaActiva.id
              }
            : t
        )
      )
    } catch (err) {
      console.error('Error al actualizar medio de pago:', err.message)
      alert('No se pudo actualizar el medio de pago. ' + err.message)
    }
  }

  useEffect(() => {
    if (empresaActiva?.id) {
      fetchTurnos()
    }
  }, [session.user.id, empresaActiva?.id, verAnteriores])

  const fetchTurnos = async () => {
    setLoading(true)

    try {
      let query = supabase
      .from('sesiones')
      .select(`
        *,
        clientes ( nombre, telefono, direcciones ( * ) ),
        sesion_detalles (
          servicio_id,
          combo_id,
          precio_cobrado,
          servicios ( nombre, duracion_minutos ),
          combos ( nombre, duracion_minutos )
        )
      `)
      .eq('profesional_id', session.user.id)
      .eq('empresa_id', empresaActiva.id)
      .order('fecha_hora', { ascending: true })

      if (!verAnteriores) {
        const hoy = obtenerFechaInputApp(new Date())

        query = query.gte('fecha_hora', inicioDiaAppISO(hoy))
      }

      const { data, error } = await query

      if (error) throw error

      setTurnos(data || [])
    } catch (err) {
      console.error('Error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const turnosFiltrados = turnos.filter(t => {
    const matchEstado =
      filtroEstado === 'Todos' ||
      t.estado === filtroEstado

    const matchMedioPago =
      filtroMedioPago === 'Todos' ||
      t.medio_pago === filtroMedioPago

    const matchBusqueda =
      t.clientes?.nombre
        ?.toLowerCase()
        .includes(busqueda.toLowerCase())

    return matchEstado && matchMedioPago && matchBusqueda
  })

  const turnosOrdenados = [...turnosFiltrados].sort((a, b) => {
    const fechaA = new Date(a.fecha_hora).getTime()
    const fechaB = new Date(b.fecha_hora).getTime()

    if (ordenFecha === 'asc') {
      return fechaA - fechaB
    }

    return fechaB - fechaA
  })

  if (loading) {
    return (
      <div className="p-10 text-center text-stone-400 font-light">
        Cargando agenda...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* FILTROS */}
      <div className="bg-stone-50 p-4 border-b border-stone-200 space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por paciente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm"
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

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-500 uppercase bg-white px-4 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 transition-colors">
            <input
              type="checkbox"
              checked={verAnteriores}
              onChange={(e) => setVerAnteriores(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded cursor-pointer"
            />
            Ver días anteriores
          </label>
        </div>

        <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
          <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar">
            {['Todos', 'Pendiente', 'Cobrada', 'Ausente', 'Anulada'].map(est => (
              <button
                key={est}
                type="button"
                onClick={() => setFiltroEstado(est)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  filtroEstado === est
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-white text-stone-400 border border-stone-200 hover:border-stone-400'
                }`}
              >
                {est}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 whitespace-nowrap">
              Medio de pago
            </span>

            <select
              value={filtroMedioPago}
              onChange={(e) => setFiltroMedioPago(e.target.value)}
              className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white text-stone-500 border border-stone-200 outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Todos">Todos</option>

              {MEDIOS_PAGO.map(medio => (
                <option key={medio} value={medio}>
                  {medio}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm text-stone-600">
          <thead className="bg-white border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-bold">
            <tr>
              <th className="px-6 py-4">
                <button
                  type="button"
                  onClick={cambiarOrdenFecha}
                  className="flex items-center gap-2 uppercase text-[10px] tracking-wider font-bold text-stone-400 hover:text-teal-600 transition-colors"
                  title={ordenFecha === 'asc' ? 'Ordenar de más nuevo a más antiguo' : 'Ordenar de más antiguo a más nuevo'}
                >
                  <span>Cita</span>
                  <span className="text-sm leading-none">
                    {ordenFecha === 'asc' ? '↑' : '↓'}
                  </span>
                </button>
              </th>

              <th className="px-6 py-4">Paciente</th>
              <th className="px-6 py-4">Detalle</th>
              <th className="px-6 py-4 text-center">Cobro</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-center">Medio de pago</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100">
            {turnosOrdenados.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="px-6 py-10 text-center text-stone-400"
                >
                  No se encontraron turnos con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              turnosOrdenados.map((t) => {
                const ahora = new Date()
                const fechaTurno = new Date(t.fecha_hora)
                const diferenciaMinutos = (fechaTurno - ahora) / 60000
                const esProximo = diferenciaMinutos > 0 && diferenciaMinutos <= 60

                const finTurnoMasTolerancia = new Date(
                  fechaTurno.getTime() + ((t.duracion_total || 0) + 15) * 60000
                )

                const esCritico =
                  t.estado === 'Pendiente' &&
                  ahora > finTurnoMasTolerancia

                const horariolocal = formatearFechaHora(t.fecha_hora)

                return (
                  <tr
                    key={t.id}
                    className={`transition-all border-b border-stone-100 ${
                      esCritico
                        ? 'bg-red-50 hover:bg-red-100'
                        : esProximo
                          ? 'bg-teal-50/50 hover:bg-teal-50'
                          : 'hover:bg-stone-50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className={`font-black text-sm ${
                        esCritico
                          ? 'text-red-600 animate-pulse'
                          : esProximo
                            ? 'text-teal-600'
                            : 'text-stone-700'
                      }`}>
                        {horariolocal.hora}
                      </div>

                      <div className="text-[10px] text-stone-400 font-medium">
                        {horariolocal.dia}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-bold text-stone-800 flex items-center gap-2">
                        {t.clientes?.nombre}
                        {t.a_domicilio && (
                          <span
                            title="Cita a Domicilio"
                            className="text-teal-600"
                          >
                            🏠
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-stone-400 font-mono">
                        {t.clientes?.telefono}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {t.sesion_detalles?.map((d, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md border border-stone-200"
                          >
                            {d.servicios?.nombre || d.combos?.nombre}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-black text-stone-700">
                        ${t.estado === 'Cobrada'
                          ? Number(t.monto_cobrado || 0).toFixed(2)
                          : Number(t.monto_total || 0).toFixed(2)}
                      </div>

                      <div className="text-[10px] text-stone-400 uppercase tracking-widest">
                        {t.duracion_total || 0} min
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <select
                        value={t.estado}
                        onChange={(e) => actualizarEstado(t.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-[10px] font-black uppercase shadow-sm border cursor-pointer outline-none transition-all ${
                          t.estado === 'Cobrada'
                            ? 'bg-teal-100 text-teal-700 border-teal-200'
                            : t.estado === 'Anulada'
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : t.estado === 'Ausente'
                                ? 'bg-stone-200 text-stone-600 border-stone-300'
                                : (t.estado === 'Pendiente' && esCritico)
                                  ? 'bg-red-600 text-white border-red-700 animate-pulse'
                                  : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="Pendiente">
                          {t.estado === 'Pendiente' && esCritico
                            ? '⚠️ Revisar'
                            : 'Pendiente'}
                        </option>

                        <option value="Cobrada">Cobrada</option>
                        <option value="Ausente">Ausente</option>
                        <option value="Anulada">Anulada</option>
                      </select>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {t.estado === 'Cobrada' ? (
                        <select
                          value={t.medio_pago || 'Efectivo'}
                          onChange={(e) => actualizarMedioPago(t.id, e.target.value)}
                          className="px-2 py-1 rounded-full text-[10px] font-black uppercase shadow-sm border cursor-pointer outline-none transition-all bg-teal-50 text-teal-700 border-teal-200 focus:ring-2 focus:ring-teal-500"
                        >
                          {MEDIOS_PAGO.map(medio => (
                            <option key={medio} value={medio}>
                              {medio}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[10px] text-stone-300 uppercase font-bold">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onVerDetalle(t)}
                          className="bg-white border border-stone-200 text-stone-400 hover:text-teal-600 p-2 rounded-xl transition-all shadow-sm"
                          title="Ver Ficha"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>

                        <button
                          onClick={() => onEditar(t)}
                          className="bg-white border border-stone-200 text-stone-400 hover:text-teal-600 p-2 rounded-xl transition-all shadow-sm"
                          title="Editar"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L20 6.172a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
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