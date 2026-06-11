// src/components/turnos/TurnosLista.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import {
  formatearFechaHoraApp,
  formatearHoraApp,
  inicioDiaAppISO,
  obtenerFechaInputApp,
  obtenerFechaInputDesdeValorApp
} from '../../utils/fechas'

const MEDIOS_PAGO = [
  'Efectivo',
  'Transferencia',
  'Tarjeta'
]

const ESTADOS = [
  'Pendiente',
  'Cobrada',
  'Ausente',
  'Anulada'
]

function crearFechaLocalDesdeValorApp(valor) {
  const fecha = obtenerFechaInputDesdeValorApp(valor)
  const hora = formatearHoraApp(valor)

  if (!fecha || !hora || hora === '--:--') return new Date(NaN)

  return new Date(`${fecha}T${hora}:00`)
}

function obtenerMontoBaseTurno(turno) {
  const cobrado = Number(turno?.monto_cobrado || 0)

  if (cobrado > 0) return cobrado

  return Number(turno?.monto_total || 0)
}

export function TurnosLista({
  session,
  empresaActiva,
  rolEmpresa,
  onEditar,
  onVerDetalle
}) {
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardandoId, setGuardandoId] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [filtroMedioPago, setFiltroMedioPago] = useState('Todos')
  const [verAnteriores, setVerAnteriores] = useState(false)
  const [ordenFecha, setOrdenFecha] = useState('asc')
  const [ediciones, setEdiciones] = useState({})

  const formatearFechaHora = (isoString) => {
    return formatearFechaHoraApp(isoString)
  }

  const cambiarOrdenFecha = () => {
    setOrdenFecha(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const obtenerEdicionTurno = (turno) => {
    const edicion = ediciones[turno.id]

    if (edicion) return edicion

    return {
      estado: turno.estado || 'Pendiente',
      medio_pago: turno.medio_pago || 'Efectivo',
      monto_cobrado: obtenerMontoBaseTurno(turno)
    }
  }

  const tieneCambiosPendientes = (turno) => {
    const edicion = ediciones[turno.id]

    if (!edicion) return false

    const estadoOriginal = turno.estado || 'Pendiente'
    const medioOriginal = turno.medio_pago || 'Efectivo'
    const montoOriginal = Number(obtenerMontoBaseTurno(turno) || 0)

    const estadoEditado = edicion.estado || 'Pendiente'
    const medioEditado = edicion.medio_pago || 'Efectivo'
    const montoEditado = Number(edicion.monto_cobrado || 0)

    return (
      estadoEditado !== estadoOriginal ||
      (estadoEditado === 'Cobrada' && medioEditado !== medioOriginal) ||
      (estadoEditado === 'Cobrada' && montoEditado !== montoOriginal)
    )
  }

  const cambiarEdicion = (turno, campo, valor) => {
    setEdiciones(prev => {
      const base = prev[turno.id] || {
        estado: turno.estado || 'Pendiente',
        medio_pago: turno.medio_pago || 'Efectivo',
        monto_cobrado: obtenerMontoBaseTurno(turno)
      }

      const nuevaEdicion = {
        ...base,
        [campo]: valor
      }

      if (campo === 'estado') {
        if (valor === 'Cobrada') {
          nuevaEdicion.medio_pago = nuevaEdicion.medio_pago || turno.medio_pago || 'Efectivo'
          nuevaEdicion.monto_cobrado = Number(nuevaEdicion.monto_cobrado || 0) > 0
            ? nuevaEdicion.monto_cobrado
            : obtenerMontoBaseTurno(turno)
        } else {
          nuevaEdicion.medio_pago = ''
          nuevaEdicion.monto_cobrado = 0
        }
      }

      return {
        ...prev,
        [turno.id]: nuevaEdicion
      }
    })
  }

  const cancelarEdicion = (turnoId) => {
    setEdiciones(prev => {
      const copia = { ...prev }
      delete copia[turnoId]
      return copia
    })
  }

  const guardarCambiosTurno = async (turno) => {
    if (!empresaActiva?.id) {
      alert('Debes seleccionar una empresa activa antes de guardar cambios.')
      return
    }

    const edicion = obtenerEdicionTurno(turno)

    if (edicion.estado === 'Cobrada') {
      if (!edicion.medio_pago) {
        alert('Seleccioná un medio de pago para cobrar la sesión.')
        return
      }

      if (Number(edicion.monto_cobrado || 0) <= 0) {
        alert('El monto cobrado debe ser mayor a cero.')
        return
      }
    }

    const confirmar = window.confirm(
      `Guardar cambios del turno de ${turno.clientes?.nombre || 'paciente'}?\n\n` +
      `Estado: ${edicion.estado}\n` +
      `Monto: ${edicion.estado === 'Cobrada' ? '$' + Number(edicion.monto_cobrado || 0).toFixed(2) : 'Sin cobro'}\n` +
      `Medio: ${edicion.estado === 'Cobrada' ? edicion.medio_pago : 'Sin medio de pago'}`
    )

    if (!confirmar) return

    setGuardandoId(turno.id)

    try {
      const { error } = await supabase.rpc('reconciliar_cobro_sesion', {
        p_sesion_id: turno.id,
        p_empresa_id: turno.empresa_id || empresaActiva.id,
        p_profesional_id: turno.profesional_id || session.user.id,
        p_estado: edicion.estado,
        p_monto_cobrado: edicion.estado === 'Cobrada'
          ? Number(edicion.monto_cobrado || 0)
          : 0,
        p_medio_pago: edicion.estado === 'Cobrada'
          ? edicion.medio_pago
          : null,
        p_fecha_operativa: obtenerFechaInputDesdeValorApp(turno.fecha_hora),
        p_creado_por: session.user.id,
        p_created_at: new Date().toISOString(),
        p_observaciones: turno.observaciones || null
      })

      if (error) throw error

      cancelarEdicion(turno.id)
      await fetchTurnos()
    } catch (err) {
      console.error('Error al guardar cambios del turno:', err.message)
      alert('No se pudieron guardar los cambios. ' + err.message)
    } finally {
      setGuardandoId(null)
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
      setEdiciones({})
    } catch (err) {
      console.error('Error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const turnosFiltrados = turnos.filter(t => {
    const edicion = obtenerEdicionTurno(t)

    const matchEstado =
      filtroEstado === 'Todos' ||
      edicion.estado === filtroEstado

    const matchMedioPago =
      filtroMedioPago === 'Todos' ||
      edicion.medio_pago === filtroMedioPago

    const matchBusqueda =
      t.clientes?.nombre
        ?.toLowerCase()
        .includes(busqueda.toLowerCase())

    return matchEstado && matchMedioPago && matchBusqueda
  })

  const turnosOrdenados = [...turnosFiltrados].sort((a, b) => {
    const fechaA = String(a.fecha_hora || '')
    const fechaB = String(b.fecha_hora || '')

    if (ordenFecha === 'asc') {
      return fechaA.localeCompare(fechaB)
    }

    return fechaB.localeCompare(fechaA)
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
                const edicion = obtenerEdicionTurno(t)
                const hayCambios = tieneCambiosPendientes(t)
                const ahora = new Date()
                const fechaTurno = crearFechaLocalDesdeValorApp(t.fecha_hora)
                const diferenciaMinutos = (fechaTurno - ahora) / 60000
                const esProximo = diferenciaMinutos > 0 && diferenciaMinutos <= 60

                const finTurnoMasTolerancia = new Date(
                  fechaTurno.getTime() + ((t.duracion_total || 0) + 15) * 60000
                )

                const esCritico =
                  edicion.estado === 'Pendiente' &&
                  ahora > finTurnoMasTolerancia

                const horariolocal = formatearFechaHora(t.fecha_hora)

                return (
                  <tr
                    key={t.id}
                    className={`transition-all border-b border-stone-100 ${
                      hayCambios
                        ? 'bg-amber-50 hover:bg-amber-100'
                        : esCritico
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

                      {hayCambios && (
                        <div className="text-[10px] text-amber-600 font-black uppercase tracking-widest mt-1">
                          Sin guardar
                        </div>
                      )}
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
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
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

                    <td className="px-6 py-4 text-center min-w-[140px]">
                      {edicion.estado === 'Cobrada' ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={edicion.monto_cobrado}
                          onChange={(e) => cambiarEdicion(t, 'monto_cobrado', e.target.value)}
                          className="w-28 px-3 py-2 rounded-xl border border-teal-200 bg-teal-50 text-teal-800 text-center text-sm font-black outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      ) : (
                        <div className="text-sm font-black text-stone-700">
                          ${Number(t.monto_total || 0).toFixed(2)}
                        </div>
                      )}

                      <div className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">
                        {t.duracion_total || 0} min
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <select
                        value={edicion.estado}
                        onChange={(e) => cambiarEdicion(t, 'estado', e.target.value)}
                        className={`px-2 py-1 rounded-full text-[10px] font-black uppercase shadow-sm border cursor-pointer outline-none transition-all ${
                          edicion.estado === 'Cobrada'
                            ? 'bg-teal-100 text-teal-700 border-teal-200'
                            : edicion.estado === 'Anulada'
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : edicion.estado === 'Ausente'
                                ? 'bg-stone-200 text-stone-600 border-stone-300'
                                : (edicion.estado === 'Pendiente' && esCritico)
                                  ? 'bg-red-600 text-white border-red-700 animate-pulse'
                                  : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}
                      >
                        {ESTADOS.map(estado => (
                          <option key={estado} value={estado}>
                            {estado === 'Pendiente' && esCritico ? '⚠️ Revisar' : estado}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {edicion.estado === 'Cobrada' ? (
                        <select
                          value={edicion.medio_pago || 'Efectivo'}
                          onChange={(e) => cambiarEdicion(t, 'medio_pago', e.target.value)}
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
                        {hayCambios && (
                          <>
                            <button
                              type="button"
                              onClick={() => guardarCambiosTurno(t)}
                              disabled={guardandoId === t.id}
                              className="bg-teal-600 text-white hover:bg-teal-700 px-3 py-2 rounded-xl transition-all shadow-sm text-[10px] font-black uppercase tracking-widest disabled:bg-stone-300"
                              title="Guardar cambios"
                            >
                              {guardandoId === t.id ? 'Guardando...' : 'Guardar'}
                            </button>

                            <button
                              type="button"
                              onClick={() => cancelarEdicion(t.id)}
                              disabled={guardandoId === t.id}
                              className="bg-white border border-stone-200 text-stone-500 hover:text-red-600 px-3 py-2 rounded-xl transition-all shadow-sm text-[10px] font-black uppercase tracking-widest"
                              title="Cancelar cambios"
                            >
                              Cancelar
                            </button>
                          </>
                        )}

                        <button
                          type="button"
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
                          type="button"
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
