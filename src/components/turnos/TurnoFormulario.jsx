// src/components/turnos/TurnoFormulario.jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'

export function TurnoFormulario({ session, turnoInicial, onGuardar, onCancelar }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [confirmarSuperposicion, setConfirmarSuperposicion] = useState(false)

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
    const cargarTodo = async () => {
      const { data: clis } = await supabase
        .from('cliente_profesional')
        .select('clientes(id, nombre, telefono)')
        .eq('profesional_id', session.user.id)

      setClientes(
        clis
          ?.map(d => d.clientes)
          .filter(Boolean)
          .sort((a, b) => a.nombre.localeCompare(b.nombre)) || []
      )

      const { data: servs } = await supabase
        .from('servicio_profesional')
        .select('servicios(*)')
        .eq('profesional_id', session.user.id)
        .eq('servicios.activo', true)

      const { data: cmbs } = await supabase
        .from('combos')
        .select('*')
        .eq('profesional_id', session.user.id)
        .eq('activo', true)

      const listaServicios = (servs?.map(d => d.servicios) || []).map(s => ({
        ...s,
        tipoItem: 'servicio',
        idUnico: `serv_${s.id}`
      }))

      const listaCombos = (cmbs || []).map(c => ({
        ...c,
        tipoItem: 'combo',
        idUnico: `combo_${c.id}`
      }))

      setCatalogo([...listaCombos, ...listaServicios])

      const { data: tExistentes } = await supabase
        .from('sesiones')
        .select('id, fecha_hora, duracion_total, clientes(nombre)')
        .eq('profesional_id', session.user.id)
        .neq('estado', 'Anulada')

      setTurnosExistentes(tExistentes || [])
    }

    cargarTodo()

    if (turnoInicial) {
      const [fechaBD, horaFullBD] = turnoInicial.fecha_hora.split('T')
      const horaBD = horaFullBD.slice(0, 5)

      setFormData({
        id: turnoInicial.id,
        cliente_id: turnoInicial.cliente_id,
        observaciones: turnoInicial.observaciones || '',
        estado: turnoInicial.estado,
        fecha: fechaBD,
        hora: horaBD,
        monto_cobrado: turnoInicial.monto_cobrado ?? '',
        duracion_manual: turnoInicial.duracion_total || ''
      })

      setADomicilio(turnoInicial.a_domicilio || false)

      const itemsGuardados =
        turnoInicial.sesion_detalles?.map(d => ({
          tipoItem: d.servicio_id ? 'servicio' : 'combo',
          id: d.servicio_id || d.combo_id,
          idUnico: d.servicio_id
            ? `serv_${d.servicio_id}`
            : `combo_${d.combo_id}`,
          nombre: d.servicios?.nombre || d.combos?.nombre,
          precio_actual: d.precio_cobrado,
          duracion_minutos:
            d.servicios?.duracion_minutos ||
            d.combos?.duracion_minutos ||
            0
        })) || []

      setCarrito(itemsGuardados)
    }
  }, [session.user.id, turnoInicial])

  // NUEVO: autocompletar texto del cliente seleccionado
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
        (acc, i) => acc + Number(i.precio_actual),
        0
      ),
      duracion_servicios: carrito.reduce(
        (acc, i) => acc + (i.duracion_minutos || 0),
        0
      )
    }
  }, [carrito])

  // NUEVO: filtro clientes
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
  }, [totales.duracion_servicios, turnoInicial])

  // Autocompletar cobro
  useEffect(() => {
    if (
      formData.estado === 'Cobrada' &&
      !formData.monto_cobrado &&
      totales.monto > 0
    ) {
      setFormData(prev => ({
        ...prev,
        monto_cobrado: totales.monto
      }))
    }
  }, [formData.estado, totales.monto])

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
    setFeedback(null)

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

    const inicioNuevo = new Date(
      `${formData.fecha}T${formData.hora}:00`
    )

    const duracionActual =
      parseInt(formData.duracion_manual) ||
      totales.duracion_servicios

    const finNuevo = new Date(
      inicioNuevo.getTime() + duracionActual * 60000
    )

    // Validación de choque
    const choque = turnosExistentes.find(t => {
      if (t.id === formData.id) return false

      const [fE, hE] = t.fecha_hora.split('T')

      const inicioE = new Date(`${fE}T${hE.slice(0, 8)}`)

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
      const datosSesion = {
        cliente_id: formData.cliente_id,
        profesional_id: session.user.id,
        fecha_hora: `${formData.fecha}T${formData.hora}:00`,
        monto_total: totales.monto,
        duracion_total: duracionActual,
        monto_cobrado:
          parseFloat(formData.monto_cobrado) || 0,
        observaciones: formData.observaciones,
        estado: formData.estado,
        a_domicilio: aDomicilio
      }

      let sesionId = formData.id

      if (sesionId) {
        await supabase
          .from('sesiones')
          .update(datosSesion)
          .eq('id', sesionId)

        await supabase
          .from('sesion_detalles')
          .delete()
          .eq('sesion_id', sesionId)
      } else {
        const { data, error } = await supabase
          .from('sesiones')
          .insert([datosSesion])
          .select()
          .single()

        if (error) throw error

        sesionId = data.id
      }

      const lineas = carrito.map(i => ({
        sesion_id: sesionId,
        servicio_id:
          i.tipoItem === 'servicio' ? i.id : null,
        combo_id: i.tipoItem === 'combo' ? i.id : null,
        precio_cobrado: i.precio_actual
      }))

      await supabase
        .from('sesion_detalles')
        .insert(lineas)

      if (aDomicilio && formData.cliente_id) {
        await supabase
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
      }

      onGuardar()
    } catch (error) {
      setFeedback({
        tipo: 'error',
        mensaje: 'Error: ' + error.message
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
          {/* NUEVO SELECT CON BUSCADOR */}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-2">Estado</label>
              <select value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold">
                <option value="Pendiente">⏳ Pendiente</option>
                <option value="Cobrada">✅ Cobrada</option>
                <option value="Ausente">❌ Ausente</option>
                <option value="Anulada">🚫 Anulada</option>
              </select>
            </div>
            <div className={`${formData.estado === 'Cobrada' ? 'opacity-100' : 'opacity-50'}`}>
              <label className="block text-xs font-bold text-teal-600 uppercase mb-2">Cobro Real ($)</label>
              <input type="number" step="0.01" value={formData.monto_cobrado} onChange={e => setFormData({...formData, monto_cobrado: e.target.value})} placeholder={totales.monto.toString()} className="w-full px-4 py-3 border border-teal-200 bg-teal-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-black text-teal-800" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-2">Notas de la sesión</label>
            <textarea rows="2" value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})} placeholder="Ej: Poner foco en cervicales..." className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"></textarea>
          </div>
        </div>

        {/* DOMICILIO */}
        <div className="border border-stone-200 rounded-2xl overflow-hidden mt-6">
          <button type="button" onClick={() => setADomicilio(!aDomicilio)} className={`w-full px-5 py-4 flex items-center justify-between transition-colors focus:outline-none ${aDomicilio ? 'bg-teal-50/50 border-b border-stone-200' : 'bg-stone-50 hover:bg-stone-100'}`}>
            <div className="flex items-center gap-3">
              <span className={`text-xl ${aDomicilio ? 'text-teal-600' : 'text-stone-400 grayscale'}`}>🏠</span>
              <div className="text-left">
                <p className={`font-bold ${aDomicilio ? 'text-teal-800' : 'text-stone-600'}`}>Atención a domicilio</p>
                <p className="text-xs text-stone-500 font-normal">Agendar turno en la dirección del paciente</p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${aDomicilio ? 'bg-teal-500' : 'bg-stone-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${aDomicilio ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </div>
          </button>
          {aDomicilio && (
            <div className="p-5 bg-white grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Calle</label>
                <input type="text" name="calle" value={direccion.calle} onChange={handleDireccionChange} className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:border-teal-500" />
              </div>
              <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Nro</label>
              <input type="text" name="numero" value={direccion.numero} onChange={handleDireccionChange} className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:border-teal-500" /></div>
              <div><label className="block text-xs font-bold text-stone-500 uppercase mb-1">Barrio</label>
              <input type="text" name="barrio" value={direccion.barrio} onChange={handleDireccionChange} className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:border-teal-500" /></div>
            </div>
          )}
        </div>
      </div>

      {/* COLUMNA DERECHA */}
      <div className="flex flex-col h-[600px]">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-3">Servicios a Realizar</h3>
          <input type="text" placeholder="Filtrar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none text-sm bg-stone-50" />
        </div>

        <div className="flex-1 overflow-y-auto border border-stone-100 rounded-2xl p-2 space-y-2 bg-stone-50/30">
          {catalogoOrdenado.map(item => {
            const isSelected = carrito.some(i => i.idUnico === item.idUnico);
            return (
              <div key={item.idUnico} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-white border-teal-500 shadow-md ring-1 ring-teal-500' : 'bg-white border-stone-100'}`} onClick={() => toggleItem(item)}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" readOnly checked={isSelected} className="w-5 h-5 text-teal-600 rounded" />
                  <div>
                    <p className={`font-bold text-sm ${isSelected ? 'text-teal-700' : 'text-stone-600'}`}>{item.nombre}</p>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest">{item.duracion_minutos} min</p>
                  </div>
                </div>
                <div className="font-bold text-stone-800">${item.precio_actual}</div>
              </div>
            )
          })}
        </div>

        <div className="pt-4 border-t border-stone-200 mt-4">
          <div className="flex justify-between items-center mb-4 px-2">
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Duración Estimada</p>
              <p className="text-lg font-bold text-stone-600">{formData.duracion_manual || 0} min</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">A Cobrar (Lista)</p>
              <p className="text-3xl font-black text-stone-800">${totales.monto.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button type="button" onClick={onCancelar} className="flex-1 py-3 text-stone-500 font-bold hover:bg-stone-100 rounded-xl transition-colors">Cancelar</button>
            <button 
                type="submit" 
                disabled={isSubmitting} 
                className={`flex-[2] text-white py-3 rounded-xl font-bold shadow-md transition-all ${confirmarSuperposicion ? 'bg-amber-600 hover:bg-amber-700' : 'bg-teal-600 hover:bg-teal-700'}`}
            >
              {isSubmitting ? 'Guardando...' : (confirmarSuperposicion ? 'Confirmar de todos modos' : (formData.id ? 'Actualizar Turno' : 'Agendar Turno'))}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}