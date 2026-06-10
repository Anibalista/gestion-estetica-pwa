// src/components/inicio/InicioDashboard.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import {
  finDiaAppISO,
  formatearFechaSoloApp,
  formatearHoraApp,
  inicioDiaAppISO,
  obtenerFechaInputApp,
  obtenerFechaInputDesdeValorApp
} from '../../utils/fechas'
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Eye,
  Gift,
  PackageSearch,
  Pencil,
  RefreshCw,
  Star,
  UserRound,
  UsersRound
} from 'lucide-react'

const ROLES_EMPRESA = ['Dueño', 'Administrador', 'Recepcionista']

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
]

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function InicioDashboard({
  session,
  empresaActiva,
  rolEmpresa,
  setVistaActiva
}) {
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')

  const [fechaVista, setFechaVista] = useState(() => new Date())
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => obtenerFechaInput(new Date()))

  const [sesiones, setSesiones] = useState([])
  const [productos, setProductos] = useState([])
  const [clientesVinculados, setClientesVinculados] = useState([])

  const [tarjetasAbiertas, setTarjetasAbiertas] = useState({
    resumen: true,
    reposicion: true,
    frecuentes: false,
    olvidados: false,
    proximosCumpleanos: false
  })

  const puedeVerEmpresaCompleta = ROLES_EMPRESA.includes(rolEmpresa)

  const diasCalendario = useMemo(() => {
    return construirDiasCalendario(fechaVista)
  }, [fechaVista])

  useEffect(() => {
    if (session?.user?.id && empresaActiva?.id) {
      cargarDatosInicio()
    }
  }, [session?.user?.id, empresaActiva?.id, rolEmpresa, fechaVista])

  const cargarDatosInicio = async () => {
    setLoading(true)
    setErrorCarga('')

    try {
      const primerDiaVisible = diasCalendario[0]?.fecha
      const ultimoDiaVisible = diasCalendario[diasCalendario.length - 1]?.fecha

      const inicioMes = obtenerPrimerDiaMes(fechaVista)
      const finMes = obtenerUltimoDiaMes(fechaVista)

      let querySesiones = supabase
        .from('sesiones')
        .select(`
          id,
          cliente_id,
          profesional_id,
          empresa_id,
          fecha_hora,
          monto_total,
          monto_cobrado,
          estado,
          medio_pago,
          observaciones,
          a_domicilio,
          clientes (
            id,
            nombre,
            telefono,
            fecha_nacimiento,
            created_at
          ),
          sesion_detalles (
            id,
            precio_cobrado,
            servicios (
              id,
              nombre,
              duracion_minutos
            ),
            combos (
              id,
              nombre,
              duracion_minutos
            )
          )
        `)
        .eq('empresa_id', empresaActiva.id)
        .gte('fecha_hora', inicioDiaAppISO(primerDiaVisible))
        .lte('fecha_hora', finDiaAppISO(ultimoDiaVisible))
        .order('fecha_hora', { ascending: true })

      if (!puedeVerEmpresaCompleta) {
        querySesiones = querySesiones.eq('profesional_id', session.user.id)
      }

      const queryProductosPersonales = supabase
        .from('productos')
        .select('*')
        .eq('profesional_id', session.user.id)
        .eq('alcance_stock', 'Profesional')
        .eq('activo', true)

      const queryProductosEmpresa = supabase
        .from('productos')
        .select('*')
        .eq('empresa_id', empresaActiva.id)
        .eq('alcance_stock', 'Empresa')
        .eq('activo', true)

      const queryClientes = supabase
        .from('cliente_profesional')
        .select(`
          cliente_id,
          profesional_id,
          fecha_vinculo,
          clientes (
            id,
            nombre,
            telefono,
            fecha_nacimiento,
            created_at
          )
        `)
        .eq('profesional_id', session.user.id)

      let querySesionesMes = supabase
        .from('sesiones')
        .select(`
          id,
          cliente_id,
          profesional_id,
          empresa_id,
          fecha_hora,
          monto_cobrado,
          estado,
          clientes (
            id,
            nombre,
            telefono,
            fecha_nacimiento,
            created_at
          )
        `)
        .eq('empresa_id', empresaActiva.id)
        .gte('fecha_hora', inicioDiaAppISO(inicioMes))
        .lte('fecha_hora', finDiaAppISO(finMes))

      if (!puedeVerEmpresaCompleta) {
        querySesionesMes = querySesionesMes.eq('profesional_id', session.user.id)
      }

      const [
        sesionesResponse,
        productosPersonalesResponse,
        productosEmpresaResponse,
        clientesResponse,
        sesionesMesResponse
      ] = await Promise.all([
        querySesiones,
        queryProductosPersonales,
        queryProductosEmpresa,
        queryClientes,
        querySesionesMes
      ])

      if (sesionesResponse.error) throw sesionesResponse.error
      if (productosPersonalesResponse.error) throw productosPersonalesResponse.error
      if (productosEmpresaResponse.error) throw productosEmpresaResponse.error
      if (clientesResponse.error) throw clientesResponse.error
      if (sesionesMesResponse.error) throw sesionesMesResponse.error

      const productosUnidos = [
        ...(productosPersonalesResponse.data || []),
        ...(productosEmpresaResponse.data || [])
      ]

      const productosSinDuplicados = Array.from(
        new Map(productosUnidos.map((producto) => [producto.id, producto])).values()
      )

      const sesionesCombinadas = [
        ...(sesionesResponse.data || []),
        ...(sesionesMesResponse.data || [])
      ]

      const sesionesSinDuplicados = Array.from(
        new Map(sesionesCombinadas.map((sesion) => [sesion.id, sesion])).values()
      )

      setSesiones(sesionesSinDuplicados)
      setProductos(productosSinDuplicados)
      setClientesVinculados((clientesResponse.data || []).map((item) => item.clientes).filter(Boolean))
    } catch (error) {
      console.error('Error cargando inicio:', error)
      setErrorCarga(error.message || 'No se pudo cargar la pantalla de inicio.')
      setSesiones([])
      setProductos([])
      setClientesVinculados([])
    } finally {
      setLoading(false)
    }
  }

  const sesionesPorDia = useMemo(() => {
    return agruparSesionesPorDia(sesiones)
  }, [sesiones])

  const sesionesDelDia = useMemo(() => {
    return sesionesPorDia[fechaSeleccionada] || []
  }, [sesionesPorDia, fechaSeleccionada])

  const resumenDia = useMemo(() => {
    return calcularResumenDia(sesionesDelDia)
  }, [sesionesDelDia])

  const productosBajoStock = useMemo(() => {
    return productos
      .filter((producto) => {
        const stockMinimo = Number(producto.stock_minimo || 0)
        const unidadesEnteras = Number(producto.unidades_enteras || 0)

        return stockMinimo > 0 && unidadesEnteras <= stockMinimo
      })
      .sort((a, b) => Number(a.unidades_enteras || 0) - Number(b.unidades_enteras || 0))
      .slice(0, 8)
  }, [productos])

  const clientesFrecuentes = useMemo(() => {
    return calcularClientesFrecuentesMes(sesiones, fechaVista)
  }, [sesiones, fechaVista])

  const clientesOlvidados = useMemo(() => {
    return calcularClientesOlvidados(clientesVinculados, sesiones)
  }, [clientesVinculados, sesiones])

  const proximosCumpleanos = useMemo(() => {
    return calcularProximosCumpleanos(clientesVinculados)
  }, [clientesVinculados])

  const cambiarMes = (cantidad) => {
    const nuevaFecha = new Date(fechaVista)

    nuevaFecha.setMonth(nuevaFecha.getMonth() + cantidad)
    setFechaVista(nuevaFecha)
  }

  const seleccionarDia = (fecha) => {
    setFechaSeleccionada(fecha)
  }

  const alternarTarjeta = (clave) => {
    setTarjetasAbiertas((prev) => ({
      ...prev,
      [clave]: !prev[clave]
    }))
  }

  const navegarTurnos = () => {
    setVistaActiva('agenda')
  }

  const navegarNuevoTurno = () => {
    setVistaActiva('nuevo-turno')
  }

  const navegarStock = () => {
    setVistaActiva('stock')
  }

  const navegarClientes = () => {
    setVistaActiva('clientes')
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-stone-400">
        <RefreshCw className="w-10 h-10 animate-spin" />
      </div>
    )
  }

  if (errorCarga) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center bg-white rounded-2xl shadow-sm border border-red-100 mt-10">
        <AlertTriangle className="w-14 h-14 mx-auto text-red-500 mb-4" />

        <h2 className="text-2xl font-light text-stone-800 mb-2">
          No se pudo cargar el inicio
        </h2>

        <p className="text-red-500 mb-6">
          {errorCarga}
        </p>

        <button
          type="button"
          onClick={cargarDatosInicio}
          className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col gap-6 overflow-y-auto pb-10">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 px-1">
        <div>
          <h2 className="text-2xl font-light text-stone-800">
            Inicio
          </h2>

          <p className="text-sm text-stone-500 font-light italic">
            Agenda rápida, sesiones del día y alertas importantes.
          </p>

          <p className="text-xs text-stone-400 mt-1">
            Empresa activa:{' '}
            <span className="font-bold text-teal-600">
              {empresaActiva?.nombre || 'Sin empresa'}
            </span>
            {' · '}
            {puedeVerEmpresaCompleta
              ? 'Mostrando agenda de la empresa'
              : 'Mostrando tu agenda'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={navegarNuevoTurno}
            className="px-4 py-3 rounded-2xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
          >
            <CalendarDays className="w-4 h-4" />
            Registrar sesión
          </button>

          <button
            type="button"
            onClick={cargarDatosInicio}
            className="px-4 py-3 rounded-2xl bg-white border border-stone-200 text-stone-700 text-sm font-bold hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      <section className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-stone-400">
              Calendario
            </p>

            <h3 className="text-2xl font-black text-stone-800 mt-1">
              {MESES[fechaVista.getMonth()]} {fechaVista.getFullYear()}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => cambiarMes(-1)}
              className="w-10 h-10 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 flex items-center justify-center transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => {
                const hoy = new Date()
                setFechaVista(hoy)
                setFechaSeleccionada(obtenerFechaInput(hoy))
              }}
              className="px-4 h-10 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 text-sm font-bold transition-colors"
            >
              Hoy
            </button>

            <button
              type="button"
              onClick={() => cambiarMes(1)}
              className="w-10 h-10 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 flex items-center justify-center transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <CalendarioMensual
          diasCalendario={diasCalendario}
          fechaVista={fechaVista}
          fechaSeleccionada={fechaSeleccionada}
          sesionesPorDia={sesionesPorDia}
          onSeleccionarDia={seleccionarDia}
        />
      </section>

      <section className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-stone-400">
              Sesiones del día
            </p>

            <h3 className="text-xl font-black text-stone-800 mt-1">
              {formatearFecha(fechaSeleccionada)}
            </h3>
          </div>

          <button
            type="button"
            onClick={navegarTurnos}
            className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-sm font-bold hover:bg-stone-200 transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Abrir agenda
          </button>
        </div>

        <ListaSesionesDia
          sesiones={sesionesDelDia}
          onVerAgenda={navegarTurnos}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TarjetaContraible
          titulo="Resumen del día"
          descripcion="Estado rápido de las sesiones seleccionadas."
          icono={<Clock className="w-5 h-5" />}
          abierta={tarjetasAbiertas.resumen}
          onToggle={() => alternarTarjeta('resumen')}
        >
          <ResumenDelDia resumen={resumenDia} />
        </TarjetaContraible>

        <TarjetaContraible
          titulo="Reposición de insumos"
          descripcion="Productos activos con stock bajo o igual al mínimo."
          icono={<PackageSearch className="w-5 h-5" />}
          abierta={tarjetasAbiertas.reposicion}
          onToggle={() => alternarTarjeta('reposicion')}
        >
          <ListaReposicion
            productos={productosBajoStock}
            onAbrirStock={navegarStock}
          />
        </TarjetaContraible>

        <TarjetaContraible
          titulo="Clientes frecuentes del mes"
          descripcion="Clientes con más sesiones cobradas en el mes visible."
          icono={<Star className="w-5 h-5" />}
          abierta={tarjetasAbiertas.frecuentes}
          onToggle={() => alternarTarjeta('frecuentes')}
        >
          <ListaClientesFrecuentes clientes={clientesFrecuentes} />
        </TarjetaContraible>

        <TarjetaContraible
          titulo="Clientes olvidados"
          descripcion="Clientes sin sesión cobrada hace 90 días o más."
          icono={<UsersRound className="w-5 h-5" />}
          abierta={tarjetasAbiertas.olvidados}
          onToggle={() => alternarTarjeta('olvidados')}
        >
          <ListaClientesOlvidados
            clientes={clientesOlvidados}
            onAbrirClientes={navegarClientes}
          />
        </TarjetaContraible>

        <TarjetaContraible
          titulo="Próximos cumpleaños"
          descripcion="Clientes con cumpleaños cercanos para fidelización."
          icono={<Gift className="w-5 h-5" />}
          abierta={tarjetasAbiertas.proximosCumpleanos}
          onToggle={() => alternarTarjeta('proximosCumpleanos')}
        >
          <ListaCumpleanos clientes={proximosCumpleanos} />
        </TarjetaContraible>
      </div>
    </div>
  )
}

function CalendarioMensual({
  diasCalendario,
  fechaVista,
  fechaSeleccionada,
  sesionesPorDia,
  onSeleccionarDia
}) {
  const hoy = obtenerFechaInput(new Date())
  const mesActual = fechaVista.getMonth()
  const anioActual = fechaVista.getFullYear()

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50">
          {DIAS_SEMANA.map((dia) => (
            <div
              key={dia}
              className="px-3 py-3 text-center text-[11px] font-black uppercase tracking-widest text-stone-400"
            >
              {dia}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {diasCalendario.map((dia) => {
            const fechaObj = crearFechaLocal(dia.fecha)
            const esMesVisible = fechaObj.getMonth() === mesActual && fechaObj.getFullYear() === anioActual
            const esHoy = dia.fecha === hoy
            const seleccionado = dia.fecha === fechaSeleccionada
            const sesionesDia = sesionesPorDia[dia.fecha] || []
            const indicador = obtenerIndicadorDia(dia.fecha, sesionesDia)

            return (
              <button
                key={dia.fecha}
                type="button"
                onClick={() => onSeleccionarDia(dia.fecha)}
                className={`min-h-[96px] border-r border-b border-stone-100 p-3 text-left transition-colors hover:bg-teal-50/60 ${
                  seleccionado ? 'bg-teal-50' : 'bg-white'
                } ${!esMesVisible ? 'text-stone-300 bg-stone-50/40' : 'text-stone-700'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-full text-lg font-black ${
                      esHoy
                        ? 'bg-teal-600 text-white shadow-sm'
                        : seleccionado
                          ? 'text-teal-700'
                          : ''
                    }`}
                  >
                    {fechaObj.getDate()}
                  </span>

                  {sesionesDia.length > 0 && (
                    <span className="text-[10px] font-black bg-stone-100 text-stone-500 rounded-full px-2 py-1">
                      {sesionesDia.length}
                    </span>
                  )}
                </div>

                {seleccionado && (
                  <div className="mt-1 h-1 w-10 rounded-full bg-teal-600" />
                )}

                {indicador && (
                  <div className={`mt-3 text-[10px] leading-tight font-bold ${indicador.clase}`}>
                    {indicador.texto}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ListaSesionesDia({ sesiones, onVerAgenda }) {
  if (sesiones.length === 0) {
    return (
      <div className="p-8 text-center text-stone-400">
        No hay sesiones registradas para este día.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-stone-600">
        <thead className="bg-stone-50 border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-bold">
          <tr>
            <th className="px-6 py-4">Cita</th>
            <th className="px-6 py-4">Paciente</th>
            <th className="px-6 py-4">Detalle</th>
            <th className="px-6 py-4">Estado</th>
            <th className="px-6 py-4 text-right">Acciones</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-stone-100">
          {sesiones.map((sesion) => (
            <tr key={sesion.id} className="hover:bg-stone-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <p className="font-black text-stone-800">
                  {formatearHora(sesion.fecha_hora)}
                </p>

                <p className="text-xs text-stone-400 mt-1">
                  {formatearFechaSolo(sesion.fecha_hora)}
                </p>
              </td>

              <td className="px-6 py-4">
                <p className="font-bold text-stone-800">
                  {sesion.clientes?.nombre || 'Sin cliente'}
                  {sesion.a_domicilio && (
                    <span className="ml-2" title="A domicilio">
                      🏠
                    </span>
                  )}
                </p>

                <p className="text-xs text-stone-400 mt-1">
                  {sesion.clientes?.telefono || 'Sin teléfono'}
                </p>
              </td>

              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {(sesion.sesion_detalles || []).length === 0 ? (
                    <span className="text-xs text-stone-400">
                      Sin detalle
                    </span>
                  ) : (
                    sesion.sesion_detalles.map((detalle) => (
                      <span
                        key={detalle.id}
                        className="inline-flex px-2 py-1 rounded-lg bg-stone-100 text-stone-600 text-[10px] font-bold"
                      >
                        {detalle.servicios?.nombre || detalle.combos?.nombre || 'Detalle'}
                      </span>
                    ))
                  )}
                </div>
              </td>

              <td className="px-6 py-4">
                <EstadoSesion estado={sesion.estado} />
              </td>

              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onVerAgenda}
                    className="w-9 h-9 rounded-xl bg-stone-100 text-stone-600 hover:bg-teal-100 hover:text-teal-700 inline-flex items-center justify-center transition-colors"
                    title="Ver en agenda"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onVerAgenda}
                    className="w-9 h-9 rounded-xl bg-stone-100 text-stone-600 hover:bg-teal-100 hover:text-teal-700 inline-flex items-center justify-center transition-colors"
                    title="Editar desde agenda"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TarjetaContraible({
  titulo,
  descripcion,
  icono,
  abierta,
  onToggle,
  children
}) {
  return (
    <section className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="bg-teal-50 text-teal-700 rounded-xl p-2 shrink-0">
            {icono}
          </div>

          <div>
            <h3 className="font-black text-stone-800">
              {titulo}
            </h3>

            <p className="text-xs text-stone-400 mt-1">
              {descripcion}
            </p>
          </div>
        </div>

        {abierta ? (
          <ChevronUp className="w-5 h-5 text-stone-400 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-stone-400 shrink-0" />
        )}
      </button>

      {abierta && (
        <div className="p-5 pt-0">
          {children}
        </div>
      )}
    </section>
  )
}

function ResumenDelDia({ resumen }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MiniResumen titulo="Pendientes" valor={resumen.pendientes} />
      <MiniResumen titulo="Cobradas" valor={resumen.cobradas} />
      <MiniResumen titulo="Anuladas/Ausentes" valor={resumen.canceladas} />
      <MiniResumen titulo="Cobrado" valor={formatearDinero(resumen.montoCobrado)} />
    </div>
  )
}

function MiniResumen({ titulo, valor }) {
  return (
    <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
        {titulo}
      </p>

      <p className="text-xl font-black text-stone-800 mt-2">
        {valor}
      </p>
    </div>
  )
}

function ListaReposicion({ productos, onAbrirStock }) {
  if (productos.length === 0) {
    return (
      <EstadoVacio
        texto="No hay productos por debajo del stock mínimo."
        accion="Abrir stock"
        onAccion={onAbrirStock}
      />
    )
  }

  return (
    <div className="space-y-3">
      {productos.map((producto) => (
        <div
          key={producto.id}
          className="bg-stone-50 border border-stone-100 rounded-2xl p-4 flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="font-bold text-stone-800 truncate" title={producto.descripcion}>
              {producto.descripcion}
            </p>

            <p className="text-xs text-stone-500 mt-1">
              Código {producto.codigo} · {producto.alcance_stock === 'Empresa' ? 'Empresa' : 'Personal'}
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="font-black text-red-600">
              {Number(producto.unidades_enteras || 0)} unid.
            </p>

            <p className="text-[10px] text-stone-400">
              mín. {Number(producto.stock_minimo || 0)}
            </p>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAbrirStock}
        className="w-full px-4 py-3 rounded-2xl bg-stone-100 text-stone-700 text-sm font-bold hover:bg-stone-200 transition-colors"
      >
        Abrir administración de stock
      </button>
    </div>
  )
}

function ListaClientesFrecuentes({ clientes }) {
  if (clientes.length === 0) {
    return (
      <EstadoVacio texto="Todavía no hay clientes frecuentes este mes." />
    )
  }

  return (
    <div className="space-y-3">
      {clientes.map((cliente, index) => (
        <div
          key={cliente.id}
          className="bg-stone-50 border border-stone-100 rounded-2xl p-4 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-black text-sm shrink-0">
              {index + 1}
            </span>

            <div className="min-w-0">
              <p className="font-bold text-stone-800 truncate">
                {cliente.nombre}
              </p>

              <p className="text-xs text-stone-500">
                {cliente.telefono || 'Sin teléfono'}
              </p>
            </div>
          </div>

          <p className="font-black text-stone-800 shrink-0">
            {cliente.cantidad} sesión(es)
          </p>
        </div>
      ))}
    </div>
  )
}

function ListaClientesOlvidados({ clientes, onAbrirClientes }) {
  if (clientes.length === 0) {
    return (
      <EstadoVacio
        texto="No se detectaron clientes olvidados."
        accion="Ver clientes"
        onAccion={onAbrirClientes}
      />
    )
  }

  return (
    <div className="space-y-3">
      {clientes.map((cliente) => (
        <div
          key={cliente.id}
          className="bg-stone-50 border border-stone-100 rounded-2xl p-4 flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="font-bold text-stone-800 truncate">
              {cliente.nombre}
            </p>

            <p className="text-xs text-stone-500">
              {cliente.telefono || 'Sin teléfono'}
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="font-black text-orange-600">
              {cliente.diasSinSesion} días
            </p>

            <p className="text-[10px] text-stone-400">
              sin sesión cobrada
            </p>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAbrirClientes}
        className="w-full px-4 py-3 rounded-2xl bg-stone-100 text-stone-700 text-sm font-bold hover:bg-stone-200 transition-colors"
      >
        Abrir clientes
      </button>
    </div>
  )
}

function ListaCumpleanos({ clientes }) {
  if (clientes.length === 0) {
    return (
      <EstadoVacio texto="No hay cumpleaños próximos cargados." />
    )
  }

  return (
    <div className="space-y-3">
      {clientes.map((cliente) => (
        <div
          key={cliente.id}
          className="bg-stone-50 border border-stone-100 rounded-2xl p-4 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-pink-50 text-pink-600 rounded-xl p-2 shrink-0">
              <Gift className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <p className="font-bold text-stone-800 truncate">
                {cliente.nombre}
              </p>

              <p className="text-xs text-stone-500">
                {cliente.fechaTexto}
              </p>
            </div>
          </div>

          <p className="font-black text-pink-600 shrink-0">
            {cliente.diasFaltantes === 0 ? 'Hoy' : `${cliente.diasFaltantes} días`}
          </p>
        </div>
      ))}
    </div>
  )
}

function EstadoVacio({ texto, accion, onAccion }) {
  return (
    <div className="border border-dashed border-stone-200 rounded-2xl p-6 text-center text-stone-400">
      <UserRound className="w-10 h-10 mx-auto mb-3 text-stone-300" />

      <p className="text-sm">
        {texto}
      </p>

      {accion && (
        <button
          type="button"
          onClick={onAccion}
          className="mt-4 px-4 py-2 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold hover:bg-stone-200 transition-colors"
        >
          {accion}
        </button>
      )}
    </div>
  )
}

function EstadoSesion({ estado }) {
  const clases = {
    Pendiente: 'bg-yellow-100 text-yellow-800',
    Cobrada: 'bg-teal-100 text-teal-800',
    Anulada: 'bg-red-100 text-red-700',
    Ausente: 'bg-orange-100 text-orange-700'
  }

  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${clases[estado] || 'bg-stone-100 text-stone-600'}`}>
      {estado}
    </span>
  )
}

function construirDiasCalendario(fechaVista) {
  const anio = fechaVista.getFullYear()
  const mes = fechaVista.getMonth()

  const primerDiaMes = new Date(anio, mes, 1)
  const diaSemana = primerDiaMes.getDay()
  const offsetLunes = diaSemana === 0 ? -6 : 1 - diaSemana

  const inicio = new Date(primerDiaMes)

  inicio.setDate(primerDiaMes.getDate() + offsetLunes)

  return Array.from({ length: 42 }, (_, index) => {
    const fecha = new Date(inicio)

    fecha.setDate(inicio.getDate() + index)

    return {
      fecha: obtenerFechaInput(fecha)
    }
  })
}

function agruparSesionesPorDia(sesiones) {
  return sesiones.reduce((acc, sesion) => {
    const fecha = obtenerFechaInputDesdeValorApp(sesion.fecha_hora)

    if (!acc[fecha]) {
      acc[fecha] = []
    }

    acc[fecha].push(sesion)

    return acc
  }, {})
}

function obtenerIndicadorDia(fecha, sesionesDia) {
  if (!sesionesDia.length) return null

  const hoy = obtenerFechaInput(new Date())
  const esPasado = fecha < hoy

  if (esPasado) {
    const cobradas = sesionesDia.filter((sesion) => sesion.estado === 'Cobrada').length

    if (cobradas === 0) return null

    return {
      texto: `Cobradas ${cobradas}`,
      clase: 'text-teal-700'
    }
  }

  const pendientes = sesionesDia.filter((sesion) => sesion.estado === 'Pendiente').length

  if (pendientes === 0) return null

  return {
    texto: `Pendientes ${pendientes}`,
    clase: 'text-yellow-700'
  }
}

function calcularResumenDia(sesionesDia) {
  return sesionesDia.reduce((acc, sesion) => {
    if (sesion.estado === 'Pendiente') {
      acc.pendientes += 1
    }

    if (sesion.estado === 'Cobrada') {
      acc.cobradas += 1
      acc.montoCobrado += Number(sesion.monto_cobrado || 0)
    }

    if (sesion.estado === 'Anulada' || sesion.estado === 'Ausente') {
      acc.canceladas += 1
    }

    return acc
  }, {
    pendientes: 0,
    cobradas: 0,
    canceladas: 0,
    montoCobrado: 0
  })
}

function calcularClientesFrecuentesMes(sesiones, fechaVista) {
  const inicioMes = obtenerPrimerDiaMes(fechaVista)
  const finMes = obtenerUltimoDiaMes(fechaVista)
  const mapa = {}

  sesiones
    .filter((sesion) => {
      const fecha = obtenerFechaInputDesdeValorApp(sesion.fecha_hora)

      return fecha >= inicioMes && fecha <= finMes && sesion.estado === 'Cobrada' && sesion.clientes
    })
    .forEach((sesion) => {
      const cliente = sesion.clientes

      if (!mapa[cliente.id]) {
        mapa[cliente.id] = {
          id: cliente.id,
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          cantidad: 0
        }
      }

      mapa[cliente.id].cantidad += 1
    })

  return Object.values(mapa)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)
}

function calcularClientesOlvidados(clientes, sesiones) {
  const hoy = new Date()
  const ultimasSesiones = {}

  sesiones
    .filter((sesion) => sesion.estado === 'Cobrada' && sesion.cliente_id)
    .forEach((sesion) => {
      const fecha = new Date(sesion.fecha_hora)
      const actual = ultimasSesiones[sesion.cliente_id]

      if (!actual || fecha > actual) {
        ultimasSesiones[sesion.cliente_id] = fecha
      }
    })

  return clientes
    .map((cliente) => {
      const ultimaSesion = ultimasSesiones[cliente.id]
      const fechaRegistro = cliente.created_at ? new Date(cliente.created_at) : null
      const referencia = ultimaSesion || fechaRegistro
      const diasSinSesion = referencia
        ? Math.floor((hoy - referencia) / 86400000)
        : 999

      return {
        ...cliente,
        diasSinSesion,
        ultimaSesion
      }
    })
    .filter((cliente) => cliente.diasSinSesion >= 90)
    .sort((a, b) => b.diasSinSesion - a.diasSinSesion)
    .slice(0, 8)
}

function calcularProximosCumpleanos(clientes) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  return clientes
    .filter((cliente) => Boolean(cliente.fecha_nacimiento))
    .map((cliente) => {
      const nacimiento = crearFechaLocal(cliente.fecha_nacimiento)
      let proximo = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate())

      if (proximo < hoy) {
        proximo = new Date(hoy.getFullYear() + 1, nacimiento.getMonth(), nacimiento.getDate())
      }

      const diasFaltantes = Math.ceil((proximo - hoy) / 86400000)

      return {
        ...cliente,
        diasFaltantes,
        fechaTexto: proximo.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: 'long'
        })
      }
    })
    .filter((cliente) => cliente.diasFaltantes <= 30)
    .sort((a, b) => a.diasFaltantes - b.diasFaltantes)
    .slice(0, 8)
}

function obtenerPrimerDiaMes(fecha) {
  return obtenerFechaInput(new Date(fecha.getFullYear(), fecha.getMonth(), 1))
}

function obtenerUltimoDiaMes(fecha) {
  return obtenerFechaInput(new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0))
}

function crearFechaLocal(valor) {
  if (!valor) return new Date()

  const [anio, mes, dia] = valor.split('-').map(Number)

  return new Date(anio, mes - 1, dia)
}

function obtenerFechaInput(fecha) {
  return obtenerFechaInputApp(fecha)
}

function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha'

  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatearFechaSolo(fecha) {
  return formatearFechaSoloApp(fecha)
}

function formatearHora(fecha) {
  return formatearHoraApp(fecha)
}

function formatearDinero(valor) {
  const numero = Number(valor || 0)

  return `$${numero.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}