// src/components/turnos/TurnoFormulario.jsx
import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import {
  formatearHoraApp,
  obtenerFechaInputDesdeValorApp
} from '../../utils/fechas'

const MEDIOS_PAGO = [
  'Efectivo',
  'Transferencia',
  'Tarjeta'
]

function crearFechaLocalParaComparar(fecha, hora) {
  if (!fecha || !hora) return new Date(NaN)

  return new Date(`${fecha}T${hora}:00`)
}

function crearFechaLocalDesdeValorApp(valor) {
  const fecha = obtenerFechaInputDesdeValorApp(valor)
  const hora = formatearHoraApp(valor)

  return crearFechaLocalParaComparar(fecha, hora)
}

export function TurnoFormulario({
  session,
  empresaActiva,
  rolEmpresa,
  turnoInicial,
  onGuardar,
  onCancelar
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [confirmarSuperposicion, setConfirmarSuperposicion] = useState(false)

  // Misma clave durante toda esta apertura del formulario.
  // Evita que doble click/reintentos creen otra sesión distinta.
  const idempotencyKeyRef = useRef(crypto.randomUUID())

  // Buscador clientes
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [mostrarClientes, setMostrarClientes] = useState(false)

  // Catálogos
  const [clientes, setClientes] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [turnosExistentes, setTurnosExistentes] = useState([])

  const [formData, setFormData] = useState({
    id: null,
    cliente_id: '',
    fecha: '',
    hora: '',
    observaciones: '',
    estado: 'Pendiente',
    monto_cobrado: '',
    medio_pago: 'Efectivo',
    duracion_manual: ''
  })

  // Estados para el domicilio
  const [aDomicilio, setADomicilio] = useState(false)
  const [direccion, setDireccion] = useState({
    calle: '',
    numero: '',
    barrio: '',
    observaciones: ''
  })

  const [carrito, setCarrito] = useState([])

  // 1. CARGA INICIAL
  useEffect(() => {
    let cargaCancelada = false

    const cargarTodo = async () => {
      if (!session?.user?.id) return

      try {
        let queryTurnos = supabase
          .from('sesiones')
          .select('id, fecha_hora, duracion_total, clientes(nombre)')
          .eq('profesional_id', session.user.id)
          .neq('estado', 'Anulada')

        if (empresaActiva?.id) {
          queryTurnos = queryTurnos.eq('empresa_id', empresaActiva.id)
        }

        const [
          clientesResponse,
          serviciosResponse,
          combosResponse,
          turnosResponse
        ] = await Promise.all([
          supabase
            .from('cliente_profesional')
            .select('clientes(id, nombre, telefono)')
            .eq('profesional_id', session.user.id),

          supabase
            .from('servicio_profesional')
            .select(`
              servicios!inner (
                id,
                nombre,
                activo,
                precio_actual,
                descripcion,
                duracion_minutos,
                beneficios
              )
            `)
            .eq('profesional_id', session.user.id)
            .eq('servicios.activo', true),

          supabase
            .from('combos')
            .select('*')
            .eq('profesional_id', session.user.id)
            .eq('activo', true),

          queryTurnos
        ])

        if (clientesResponse.error) {
          throw new Error(
            `No se pudieron cargar los pacientes: ${clientesResponse.error.message}`
          )
        }

        if (serviciosResponse.error) {
          throw new Error(
            `No se pudieron cargar los servicios: ${serviciosResponse.error.message}`
          )
        }

        if (combosResponse.error) {
          throw new Error(
            `No se pudieron cargar los combos: ${combosResponse.error.message}`
          )
        }

        if (turnosResponse.error) {
          throw new Error(
            `No se pudo comprobar la agenda: ${turnosResponse.error.message}`
          )
        }

        if (cargaCancelada) return

        const clientesFormateados = (clientesResponse.data || [])
          .map(item => item.clientes)
          .filter(Boolean)
          .sort((a, b) =>
            String(a.nombre || '').localeCompare(
              String(b.nombre || ''),
              'es',
              { sensitivity: 'base' }
            )
          )

        const listaServicios = (serviciosResponse.data || [])
          .map(item => item.servicios)
          .filter(Boolean)
          .map(servicio => ({
            ...servicio,
            tipoItem: 'servicio',
            idUnico: `serv_${servicio.id}`
          }))

        const listaCombos = (combosResponse.data || [])
          .filter(Boolean)
          .map(combo => ({
            ...combo,
            tipoItem: 'combo',
            idUnico: `combo_${combo.id}`
          }))

        setClientes(clientesFormateados)
        setCatalogo([...listaCombos, ...listaServicios])
        setTurnosExistentes(turnosResponse.data || [])
      } catch (error) {
        console.error('Error cargando datos del formulario de turnos:', error)

        if (cargaCancelada) return

        setClientes([])
        setCatalogo([])
        setTurnosExistentes([])
        setFeedback({
          tipo: 'error',
          mensaje:
            error.message ||
            'No se pudieron cargar los datos necesarios para registrar la sesión.'
        })
      }
    }

    cargarTodo()

    return () => {
      cargaCancelada = true
    }
  }, [session?.user?.id, empresaActiva?.id])

  // CARGAR DATOS DEL TURNO EN EDICIÓN
  useEffect(() => {
    if (!turnoInicial) return

    const fechaBD = obtenerFechaInputDesdeValorApp(turnoInicial.fecha_hora)
    const horaBD = formatearHoraApp(turnoInicial.fecha_hora)

    setFormData({
      id: turnoInicial.id,
      cliente_id: turnoInicial.cliente_id,
      observaciones: turnoInicial.observaciones || '',
      estado: turnoInicial.estado,
      fecha: fechaBD,
      hora: horaBD,
      monto_cobrado: turnoInicial.monto_cobrado ?? '',
      medio_pago: turnoInicial.medio_pago || 'Efectivo',
      duracion_manual: turnoInicial.duracion_total || ''
    })

    setADomicilio(turnoInicial.a_domicilio || false)

    const itemsGuardados =
      turnoInicial.sesion_detalles?.map(detalle => ({
        tipoItem: detalle.servicio_id ? 'servicio' : 'combo',
        id: detalle.servicio_id || detalle.combo_id,
        idUnico: detalle.servicio_id
          ? `serv_${detalle.servicio_id}`
          : `combo_${detalle.combo_id}`,
        nombre: detalle.servicios?.nombre || detalle.combos?.nombre,
        precio_actual: detalle.precio_cobrado,
        duracion_minutos:
          detalle.servicios?.duracion_minutos ||
          detalle.combos?.duracion_minutos ||
          0
      })) || []

    setCarrito(itemsGuardados)
  }, [turnoInicial])

  // Autocompletar texto del cliente seleccionado
  useEffect(() => {
    if (formData.cliente_id && clientes.length > 0) {
      const cliente = clientes.find(c => c.id === formData.cliente_id)

      if (cliente) {
        setBusquedaCliente(
          `${cliente.nombre}${
            cliente.telefono ? ` (${cliente.telefono})` : ''
          }`
        )
      }
    }
  }, [formData.cliente_id, clientes])

  // Buscar dirección cuando el cliente cambia
  useEffect(() => {
    const fetchDireccion = async () => {
      if (!formData.cliente_id) return

      try {
        const { data } = await supabase
          .from('direcciones')
          .select('*')
          .eq('cliente_id', formData.cliente_id)
          .maybeSingle()

        if (data) {
          setDireccion({
            calle: data.calle || '',
            numero: data.numero || '',
            barrio: data.barrio || '',
            observaciones: data.observaciones || ''
          })
        } else {
          setDireccion({
            calle: '',
            numero: '',
            barrio: '',
            observaciones: ''
          })
        }
      } catch (err) {
        console.error(err)
      }
    }

    fetchDireccion()
  }, [formData.cliente_id])

  const handleDireccionChange = e => {
    setDireccion(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // 2. CÁLCULOS DINÁMICOS
  const totales = useMemo(() => {
    return {
      monto: carrito.reduce(
        (acc, i) => acc + Number(i.precio_actual || 0),
        0
      ),
      duracion_servicios: carrito.reduce(
        (acc, i) => acc + (i.duracion_minutos || 0),
        0
      )
    }
  }, [carrito])

  // Filtro clientes
  const clientesFiltrados = clientes.filter(c =>
    `${c.nombre} ${c.telefono || ''}`
      .toLowerCase()
      .includes(busquedaCliente.toLowerCase())
  )

  // Autocompletar duración manual
  useEffect(() => {
    if (
      !formData.duracion_manual &&
      totales.duracion_servicios > 0 &&
      !turnoInicial
    ) {
      setFormData(prev => ({
        ...prev,
        duracion_manual: totales.duracion_servicios
      }))
    }
  }, [totales.duracion_servicios, turnoInicial, formData.duracion_manual])

  // Autocompletar cobro y medio de pago cuando pasa a Cobrada
  useEffect(() => {
    if (formData.estado === 'Cobrada') {
      setFormData(prev => ({
        ...prev,
        monto_cobrado:
          prev.monto_cobrado || totales.monto || '',
        medio_pago:
          prev.medio_pago || 'Efectivo'
      }))
    }
  }, [formData.estado, totales.monto])

  // Si deja de estar cobrada, limpiamos el medio de pago.
  // El monto cobrado no se borra por seguridad, por si el usuario vuelve atrás sin querer.
  useEffect(() => {
    if (formData.estado !== 'Cobrada' && formData.medio_pago) {
      setFormData(prev => ({
        ...prev,
        medio_pago: ''
      }))
    }
  }, [formData.estado])

  // 3. MANEJO DEL CARRITO
  const toggleItem = item => {
    setCarrito(prev => {
      const existe = prev.find(i => i.idUnico === item.idUnico)

      if (existe) {
        return prev.filter(i => i.idUnico !== item.idUnico)
      }

      return [...prev, item]
    })
  }

  // 4. GUARDADO
  const handleGuardar = async e => {
    e.preventDefault()

    // Protección inmediata de UI contra doble submit.
    if (isSubmitting) return

    setFeedback(null)

    if (!empresaActiva?.id) {
      setFeedback({
        tipo: 'error',
        mensaje: 'Debes seleccionar una empresa activa antes de registrar una sesión.'
      })
      return
    }

    if (!formData.fecha || !formData.hora) {
      setFeedback({
        tipo: 'error',
        mensaje: 'Falta la fecha o la hora.'
      })
      return
    }

    if (!formData.cliente_id) {
      setFeedback({
        tipo: 'error',
        mensaje: 'Debes seleccionar un paciente.'
      })
      return
    }

    if (carrito.length === 0) {
      setFeedback({
        tipo: 'error',
        mensaje: 'Debes seleccionar al menos un servicio o combo.'
      })
      return
    }

    if (formData.estado === 'Cobrada' && !formData.medio_pago) {
      setFeedback({
        tipo: 'error',
        mensaje: 'Debes seleccionar un medio de pago para cobrar la sesión.'
      })
      return
    }

    const inicioNuevo = crearFechaLocalParaComparar(
      formData.fecha,
      formData.hora
    )

    const duracionActual =
      parseInt(formData.duracion_manual) ||
      totales.duracion_servicios

    const finNuevo = new Date(
      inicioNuevo.getTime() + duracionActual * 60000
    )

    const choque = turnosExistentes.find(t => {
      if (t.id === formData.id) return false

      const inicioE = crearFechaLocalDesdeValorApp(t.fecha_hora)

      const finE = new Date(
        inicioE.getTime() + (t.duracion_total + 10) * 60000
      )

      return inicioNuevo < finE && finNuevo > inicioE
    })

    if (choque && !confirmarSuperposicion) {
      const horaChoque = choque.fecha_hora
        .split('T')[1]
        .slice(0, 5)

      setFeedback({
        tipo: 'alerta',
        mensaje: `⚠️ Superposición detectada: Tienes un turno a las ${horaChoque}hs con ${choque.clientes?.nombre}.`
      })

      setConfirmarSuperposicion(true)
      return
    }

    setIsSubmitting(true)

    try {
      const montoCobrado =
        formData.estado === 'Cobrada'
          ? parseFloat(formData.monto_cobrado) || 0
          : 0

      const detalles = carrito.map(item => ({
        tipoItem: item.tipoItem,
        id: item.id,
        precio_cobrado: Number(item.precio_actual || 0)
      }))

      // Una sola transacción PostgreSQL guarda:
      // sesión + detalles + reconciliación financiera.
      // Si falla caja, todo hace rollback.
      const { data: sesionId, error } = await supabase.rpc(
        'guardar_sesion_atomica',
        {
          p_empresa_id: empresaActiva.id,
          p_cliente_id: formData.cliente_id,
          p_fecha_hora: `${formData.fecha}T${formData.hora}:00`,
          p_fecha_operativa: formData.fecha,
          p_monto_total: totales.monto,
          p_estado: formData.estado,
          p_duracion_total: duracionActual,
          p_a_domicilio: aDomicilio,
          p_detalles: detalles,
          p_sesion_id: formData.id || null,
          p_idempotency_key: formData.id
            ? null
            : idempotencyKeyRef.current,
          p_monto_cobrado: montoCobrado,
          p_medio_pago:
            formData.estado === 'Cobrada'
              ? formData.medio_pago
              : null,
          p_observaciones: formData.observaciones || null
        }
      )

      if (error) throw error

      // La dirección pertenece al cliente, no al asiento financiero.
      // Si esto falla, la sesión ya quedó guardada, pero reintentar este
      // mismo formulario no duplica la sesión por idempotency_key.
      if (aDomicilio && formData.cliente_id) {
        const { error: errorDireccion } = await supabase
          .from('direcciones')
          .upsert(
            {
              cliente_id: formData.cliente_id,
              calle: direccion.calle,
              numero: direccion.numero,
              barrio: direccion.barrio,
              observaciones: direccion.observaciones
            },
            { onConflict: 'cliente_id' }
          )

        if (errorDireccion) {
          console.error(
            'Sesión guardada, pero falló la dirección:',
            errorDireccion
          )

          setFeedback({
            tipo: 'error',
            mensaje:
              `La sesión ${sesionId ? 'se guardó correctamente' : 'fue procesada'}, ` +
              'pero no se pudo guardar la dirección. Volvé a intentar.'
          })
          return
        }
      }

      onGuardar()
    } catch (error) {
      console.error('Error guardando sesión:', error)

      setFeedback({
        tipo: 'error',
        mensaje: 'Error: ' + (
          error.message ||
          'No se pudo guardar la sesión.'
        )
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const catalogoOrdenado = [...catalogo]
    .sort((a, b) => {
      const aSel = carrito.some(
        i => i.idUnico === a.idUnico
      )

      const bSel = carrito.some(
        i => i.idUnico === b.idUnico
      )

      if (aSel && !bSel) return -1
      if (!aSel && bSel) return 1

      return a.nombre.localeCompare(b.nombre)
    })
    .filter(item =>
      item.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase())
    )

  return (
    <form
      onSubmit={handleGuardar}
      className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white"
    >
      {/* COLUMNA IZQUIERDA */}
      <div className="space-y-6">
        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm font-bold border ${
              feedback.tipo === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {feedback.mensaje}

            {feedback.tipo === 'alerta' && (
              <p className="mt-2 text-xs font-normal">
                Pulsa "Confirmar de todos modos" abajo para ignorar.
              </p>
            )}
          </div>
        )}

        <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100 space-y-4">
          {/* SELECT CON BUSCADOR */}
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-2">
              Paciente *
            </label>

            <div className="relative">
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={busquedaCliente}
                onChange={e => {
                  setBusquedaCliente(e.target.value)
                  setMostrarClientes(true)
                  setFormData({
                    ...formData,
                    cliente_id: ''
                  })
                }}
                onFocus={() => setMostrarClientes(true)}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />

              {mostrarClientes && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {clientesFiltrados.length > 0 ? (
                    clientesFiltrados.map(c => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => {
                          setFormData({
                            ...formData,
                            cliente_id: c.id
                          })

                          setBusquedaCliente(
                            `${c.nombre}${
                              c.telefono
                                ? ` (${c.telefono})`
                                : ''
                            }`
                          )

                          setMostrarClientes(false)
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-teal-50 border-b border-stone-100 last:border-b-0"
                      >
                        <p className="font-semibold text-stone-700">
                          {c.nombre}
                        </p>

                        {c.telefono && (
                          <p className="text-xs text-stone-400">
                            {c.telefono}
                          </p>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-stone-400">
                      No se encontraron pacientes
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-2">
                Fecha *
              </label>

              <input
                required
                type="date"
                value={formData.fecha}
                onChange={e =>
                  setFormData({
                    ...formData,
                    fecha: e.target.value
                  })
                }
                className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-2">
                Hora *
              </label>

              <input
                required
                type="time"
                value={formData.hora}
                onChange={e =>
                  setFormData({
                    ...formData,
                    hora: e.target.value
                  })
                }
                className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-2">
              Duración Total (minutos) *
            </label>

            <input
              required
              type="number"
              value={formData.duracion_manual}
              onChange={e =>
                setFormData({
                  ...formData,
                  duracion_manual: e.target.value
                })
              }
              className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-teal-700"
            />

            <p className="text-[10px] text-stone-400 mt-1">
              Sugerido por servicios:{' '}
              {totales.duracion_servicios} min
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div className={`grid grid-cols-1 ${formData.estado === 'Cobrada' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-2">
                Estado
              </label>

              <select
                value={formData.estado}
                onChange={e =>
                  setFormData({
                    ...formData,
                    estado: e.target.value
                  })
                }
                className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
              >
                <option value="Pendiente">⏳ Pendiente</option>
                <option value="Cobrada">✅ Cobrada</option>
                <option value="Ausente">❌ Ausente</option>
                <option value="Anulada">🚫 Anulada</option>
              </select>
            </div>

            <div className={`${formData.estado === 'Cobrada' ? 'opacity-100' : 'opacity-50'}`}>
              <label className="block text-xs font-bold text-teal-600 uppercase mb-2">
                Cobro Real ($)
              </label>

              <input
                type="number"
                step="0.01"
                value={formData.monto_cobrado}
                onChange={e =>
                  setFormData({
                    ...formData,
                    monto_cobrado: e.target.value
                  })
                }
                placeholder={totales.monto.toString()}
                disabled={formData.estado !== 'Cobrada'}
                className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-black ${
                  formData.estado === 'Cobrada'
                    ? 'border-teal-200 bg-teal-50 text-teal-800'
                    : 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed'
                }`}
              />
            </div>

            {formData.estado === 'Cobrada' && (
              <div>
                <label className="block text-xs font-bold text-teal-600 uppercase mb-2">
                  Medio de pago *
                </label>

                <select
                  required
                  value={formData.medio_pago || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      medio_pago: e.target.value
                    })
                  }
                  className="w-full px-4 py-3 border border-teal-200 bg-teal-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-teal-800"
                >
                  <option value="">Seleccionar...</option>

                  {MEDIOS_PAGO.map(medio => (
                    <option key={medio} value={medio}>
                      {medio}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-2">
              Notas de la sesión
            </label>

            <textarea
              rows="2"
              value={formData.observaciones}
              onChange={e =>
                setFormData({
                  ...formData,
                  observaciones: e.target.value
                })
              }
              placeholder="Ej: Poner foco en cervicales..."
              className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* DOMICILIO */}
        <div className="border border-stone-200 rounded-2xl overflow-hidden mt-6">
          <button
            type="button"
            onClick={() => setADomicilio(!aDomicilio)}
            className={`w-full px-5 py-4 flex items-center justify-between transition-colors focus:outline-none ${
              aDomicilio
                ? 'bg-teal-50/50 border-b border-stone-200'
                : 'bg-stone-50 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-xl ${aDomicilio ? 'text-teal-600' : 'text-stone-400 grayscale'}`}>
                🏠
              </span>

              <div className="text-left">
                <p className={`font-bold ${aDomicilio ? 'text-teal-800' : 'text-stone-600'}`}>
                  Atención a domicilio
                </p>

                <p className="text-xs text-stone-500 font-normal">
                  Agendar turno en la dirección del paciente
                </p>
              </div>
            </div>

            <div className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${
              aDomicilio ? 'bg-teal-500' : 'bg-stone-300'
            }`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                aDomicilio ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </div>
          </button>

          {aDomicilio && (
            <div className="p-5 bg-white grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                  Calle
                </label>

                <input
                  type="text"
                  name="calle"
                  value={direccion.calle}
                  onChange={handleDireccionChange}
                  className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                  Nro
                </label>

                <input
                  type="text"
                  name="numero"
                  value={direccion.numero}
                  onChange={handleDireccionChange}
                  className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                  Barrio
                </label>

                <input
                  type="text"
                  name="barrio"
                  value={direccion.barrio}
                  onChange={handleDireccionChange}
                  className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* COLUMNA DERECHA */}
      <div className="flex flex-col h-[600px]">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-3">
            Servicios a Realizar
          </h3>

          <input
            type="text"
            placeholder="Filtrar..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none text-sm bg-stone-50"
          />
        </div>

        <div className="flex-1 overflow-y-auto border border-stone-100 rounded-2xl p-2 space-y-2 bg-stone-50/30">
          {catalogoOrdenado.map(item => {
            const isSelected = carrito.some(i => i.idUnico === item.idUnico)

            return (
              <div
                key={item.idUnico}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-teal-500 shadow-md ring-1 ring-teal-500'
                    : 'bg-white border-stone-100'
                }`}
                onClick={() => toggleItem(item)}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    readOnly
                    checked={isSelected}
                    className="w-5 h-5 text-teal-600 rounded"
                  />

                  <div>
                    <p className={`font-bold text-sm ${
                      isSelected ? 'text-teal-700' : 'text-stone-600'
                    }`}>
                      {item.nombre}
                    </p>

                    <p className="text-[10px] text-stone-400 uppercase tracking-widest">
                      {item.duracion_minutos} min
                    </p>
                  </div>
                </div>

                <div className="font-bold text-stone-800">
                  ${item.precio_actual}
                </div>
              </div>
            )
          })}
        </div>

        <div className="pt-4 border-t border-stone-200 mt-4">
          <div className="flex justify-between items-center mb-4 px-2">
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                Duración Estimada
              </p>

              <p className="text-lg font-bold text-stone-600">
                {formData.duracion_manual || 0} min
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                A Cobrar (Lista)
              </p>

              <p className="text-3xl font-black text-stone-800">
                ${totales.monto.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancelar}
              disabled={isSubmitting}
              className="flex-1 py-3 text-stone-500 font-bold hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-[2] text-white py-3 rounded-xl font-bold shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                confirmarSuperposicion
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              {isSubmitting
                ? 'Guardando...'
                : confirmarSuperposicion
                  ? 'Confirmar de todos modos'
                  : formData.id
                    ? 'Actualizar Turno'
                    : 'Agendar Turno'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}