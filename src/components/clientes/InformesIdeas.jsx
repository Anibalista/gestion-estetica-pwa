// src/components/clientes/InformesIdeas.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Baby,
  Cake,
  CalendarClock,
  ChevronDown,
  Clock,
  Download,
  HeartHandshake,
  Phone,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  AlertTriangle,
  Wrench
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'

const DIAS_CLIENTE_ACTIVO = 90
const PROXIMOS_CUMPLEANIOS = 30

export function InformesIdeas({ session }) {
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [vinculos, setVinculos] = useState([])
  const [sesiones, setSesiones] = useState([])

  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    resumen: true,
    captacion: true,
    rankings: false,
    cumpleanios: false,
    recuperar: false,
    fidelizacion: false,
    calidad: false
  })

  useEffect(() => {
    if (session?.user?.id) {
      cargarDatos()
    }
  }, [session?.user?.id])

  const cargarDatos = async () => {
    setLoading(true)
    setErrorCarga('')

    try {
      const [vinculosResponse, sesionesResponse] = await Promise.all([
        supabase
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
              created_at,
              direcciones (
                id,
                calle,
                numero,
                barrio,
                observaciones
              )
            )
          `)
          .eq('profesional_id', session.user.id),

        supabase
          .from('sesiones')
          .select(`
            id,
            cliente_id,
            profesional_id,
            fecha_hora,
            monto_total,
            monto_cobrado,
            estado,
            duracion_total,
            sesion_detalles (
              id,
              servicio_id,
              combo_id,
              precio_cobrado,
              servicios (
                id,
                nombre
              ),
              combos (
                id,
                nombre
              )
            )
          `)
          .eq('profesional_id', session.user.id)
      ])

      if (vinculosResponse.error) throw vinculosResponse.error
      if (sesionesResponse.error) throw sesionesResponse.error

      setVinculos(vinculosResponse.data || [])
      setSesiones(sesionesResponse.data || [])

    } catch (error) {
      console.error('Error al cargar informes de clientes:', error)
      setErrorCarga(error.message || 'No se pudieron cargar los informes de clientes.')
    } finally {
      setLoading(false)
    }
  }

  const datos = useMemo(() => {
    return procesarClientes({
      vinculos,
      sesiones
    })
  }, [vinculos, sesiones])

  const alternarSeccion = (seccion) => {
    setSeccionesAbiertas((prev) => ({
      ...prev,
      [seccion]: !prev[seccion]
    }))
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    const fecha = new Date().toLocaleDateString('es-AR')

    doc.setFontSize(16)
    doc.text('Informe de Clientes - Ideas y Fidelización', 14, 18)

    doc.setFontSize(10)
    doc.text(`Fecha: ${fecha}`, 14, 26)
    doc.text(`Profesional: ${session?.user?.email || 'Sin email'}`, 14, 32)

    autoTable(doc, {
      startY: 42,
      head: [['Métrica', 'Valor']],
      body: [
        ['Clientes vinculados', datos.resumen.totalClientes],
        ['Clientes activos', datos.resumen.clientesActivos],
        ['Clientes dormidos', datos.resumen.clientesDormidos],
        ['Nuevos este mes', datos.resumen.nuevosEsteMes],
        ['Promedio mensual de nuevos clientes', formatearNumero(datos.resumen.promedioMensualNuevos)],
        ['Cumpleaños próximos 30 días', datos.cumpleanios.proximos30.length]
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Mes', 'Clientes nuevos']],
      body: datos.captacion.mensual.map((item) => [
        item.label,
        item.nuevos
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Clientes a recuperar', 'Última sesión', 'Días sin volver', 'Teléfono']],
      body: datos.clientesARecuperar.slice(0, 10).map((cliente) => [
        cliente.nombre,
        cliente.ultimaSesionTexto,
        cliente.diasDesdeUltimaSesion === null ? 'Nunca' : cliente.diasDesdeUltimaSesion,
        cliente.telefono || ''
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Clientes VIP sugeridos', 'Sesiones', 'Facturación', 'Última sesión']],
      body: datos.clientesVIP.slice(0, 10).map((cliente) => [
        cliente.nombre,
        cliente.sesionesCobradas,
        formatearDinero(cliente.facturacionSesiones),
        cliente.ultimaSesionTexto
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Cumpleaños próximos', 'Fecha', 'Días', 'Teléfono']],
      body: datos.cumpleanios.proximos30.map((cliente) => [
        cliente.nombre,
        cliente.cumpleaniosTexto,
        cliente.diasHastaCumpleanios,
        cliente.telefono || ''
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    doc.save(`informe-clientes-ideas-${obtenerFechaArchivo()}.pdf`)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-stone-400">
        <RefreshCw className="w-10 h-10 animate-spin" />
      </div>
    )
  }

  if (errorCarga) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center bg-white rounded-2xl shadow-sm border border-red-100 mt-10">
        <AlertTriangle className="w-14 h-14 mx-auto text-red-500 mb-4" />

        <h2 className="text-2xl font-light text-stone-800 mb-2">
          No se pudieron cargar los informes
        </h2>

        <p className="text-red-500 mb-6">
          {errorCarga}
        </p>

        <button
          type="button"
          onClick={cargarDatos}
          className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col gap-6 overflow-y-auto pb-10">
      <HeaderInformes onExportar={exportarPDF} />

      <SeccionContraible
        titulo="Resumen de clientela"
        descripcion="Estado general de la base de clientes vinculada al profesional."
        Icon={Users}
        abierta={seccionesAbiertas.resumen}
        onToggle={() => alternarSeccion('resumen')}
      >
        <ResumenGeneral datos={datos} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Flujo de captación"
        descripcion="Altas de clientes por mes usando la fecha de vínculo con el profesional."
        Icon={TrendingUp}
        abierta={seccionesAbiertas.captacion}
        onToggle={() => alternarSeccion('captacion')}
      >
        <CaptacionClientes datos={datos.captacion} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Rankings de clientes"
        descripcion="Frecuencia, facturación, ausencias y tiempo sin volver."
        Icon={Star}
        abierta={seccionesAbiertas.rankings}
        onToggle={() => alternarSeccion('rankings')}
      >
        <RankingsClientes datos={datos} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Cumpleaños"
        descripcion="Clientes que cumplen años hoy, pronto o dentro de los próximos 30 días."
        Icon={Cake}
        abierta={seccionesAbiertas.cumpleanios}
        onToggle={() => alternarSeccion('cumpleanios')}
      >
        <CumpleaniosClientes datos={datos.cumpleanios} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Clientes a recuperar"
        descripcion="Clientes dormidos o con oportunidad clara de seguimiento."
        Icon={HeartHandshake}
        abierta={seccionesAbiertas.recuperar}
        onToggle={() => alternarSeccion('recuperar')}
      >
        <ClientesRecuperar datos={datos} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Ideas de fidelización"
        descripcion="Sugerencias accionables para cuidar la clientela y mejorar la recurrencia."
        Icon={Sparkles}
        abierta={seccionesAbiertas.fidelizacion}
        onToggle={() => alternarSeccion('fidelizacion')}
      >
        <IdeasFidelizacion datos={datos} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Calidad de datos"
        descripcion="Datos faltantes o incompletos que conviene completar."
        Icon={Wrench}
        abierta={seccionesAbiertas.calidad}
        onToggle={() => alternarSeccion('calidad')}
      >
        <CalidadDatos datos={datos.calidadDatos} />
      </SeccionContraible>
    </div>
  )
}

function HeaderInformes({ onExportar }) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 px-2">
      <div>
        <h2 className="text-2xl font-light text-stone-800">
          Informes - Ideas
        </h2>
        <p className="text-sm text-stone-500 font-light italic">
          Fidelización, captación, cumpleaños, rankings y oportunidades sobre clientes.
        </p>
      </div>

      <button
        type="button"
        onClick={onExportar}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-2xl text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        Exportar PDF
      </button>
    </div>
  )
}

function SeccionContraible({ titulo, descripcion, Icon, abierta, onToggle, children }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between gap-4 hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
            <Icon className="w-5 h-5" />
          </div>

          <div>
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-widest">
              {titulo}
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              {descripcion}
            </p>
          </div>
        </div>

        <ChevronDown className={`w-5 h-5 text-stone-400 transition-transform ${abierta ? 'rotate-180' : ''}`} />
      </button>

      {abierta && (
        <div className="p-5 border-t border-stone-100">
          {children}
        </div>
      )}
    </section>
  )
}

function ResumenGeneral({ datos }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      <ResumenCard
        titulo="Clientes"
        valor={datos.resumen.totalClientes}
        descripcion="Vinculados al profesional"
        Icon={Users}
      />

      <ResumenCard
        titulo="Activos"
        valor={datos.resumen.clientesActivos}
        descripcion={`Sesión cobrada en menos de ${DIAS_CLIENTE_ACTIVO} días`}
        Icon={UserCheck}
      />

      <ResumenCard
        titulo="Dormidos"
        valor={datos.resumen.clientesDormidos}
        descripcion={`Sin sesión cobrada hace ${DIAS_CLIENTE_ACTIVO} días o más`}
        Icon={Clock}
      />

      <ResumenCard
        titulo="Nuevos este mes"
        valor={datos.resumen.nuevosEsteMes}
        descripcion="Por fecha de vínculo"
        Icon={UserPlus}
      />

      <ResumenCard
        titulo="Promedio mensual"
        valor={formatearNumero(datos.resumen.promedioMensualNuevos)}
        descripcion="Clientes nuevos"
        Icon={Baby}
      />
    </div>
  )
}

function ResumenCard({ titulo, valor, descripcion, Icon }) {
  return (
    <div className="bg-stone-50 rounded-2xl border border-stone-100 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
            {titulo}
          </p>
          <p className="text-2xl font-black text-stone-800">
            {valor}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            {descripcion}
          </p>
        </div>

        <div className="text-teal-600 bg-white rounded-xl p-2 shadow-sm">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function CaptacionClientes({ datos }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 bg-stone-50 border border-stone-100 rounded-2xl p-5">
        <h4 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">
          Clientes nuevos por mes
        </h4>

        <div className="h-80 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos.mensual} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="nuevos" name="Clientes nuevos" fill="#0d9488" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <DatoSimple
          titulo="Promedio mensual"
          valor={formatearNumero(datos.promedioMensual)}
          detalle="Promedio desde el primer vínculo registrado"
        />

        <DatoSimple
          titulo="Mejor mes"
          valor={datos.mejorMes?.label || 'Sin datos'}
          detalle={`${datos.mejorMes?.nuevos || 0} clientes nuevos`}
        />

        <DatoSimple
          titulo="Este mes"
          valor={datos.nuevosEsteMes}
          detalle="Clientes vinculados durante el mes actual"
        />
      </div>
    </div>
  )
}

function DatoSimple({ titulo, valor, detalle }) {
  return (
    <div className="bg-stone-50 border border-stone-100 rounded-2xl p-5">
      <p className="text-xs font-black uppercase tracking-widest text-stone-400">
        {titulo}
      </p>
      <p className="text-2xl font-black text-stone-800 mt-2">
        {valor}
      </p>
      <p className="text-xs text-stone-500 mt-1">
        {detalle}
      </p>
    </div>
  )
}

function RankingsClientes({ datos }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <RankingCard
        titulo="Clientes más frecuentes"
        items={datos.rankings.masFrecuentes}
        valueFormatter={(cliente) => `${cliente.sesionesCobradas} sesiones`}
      />

      <RankingCard
        titulo="Clientes que más facturaron"
        items={datos.rankings.masFacturaron}
        valueFormatter={(cliente) => formatearDinero(cliente.facturacionSesiones)}
      />

      <RankingCard
        titulo="Clientes con más ausencias"
        items={datos.rankings.masAusencias}
        valueFormatter={(cliente) => `${cliente.ausencias} ausencias`}
      />

      <RankingCard
        titulo="Más tiempo sin volver"
        items={datos.rankings.masTiempoSinVolver}
        valueFormatter={(cliente) => cliente.diasDesdeUltimaSesion === null ? 'Nunca' : `${cliente.diasDesdeUltimaSesion} días`}
      />
    </div>
  )
}

function RankingCard({ titulo, items, valueFormatter }) {
  return (
    <div className="bg-stone-50 rounded-2xl border border-stone-100 p-5">
      <h4 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">
        {titulo}
      </h4>

      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyState mensaje="Sin datos suficientes." />
        ) : (
          items.map((cliente, index) => (
            <ClienteRow
              key={cliente.id}
              index={index}
              cliente={cliente}
              valor={valueFormatter(cliente)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function CumpleaniosClientes({ datos }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <ListaClientes
        titulo="Cumplen hoy"
        items={datos.hoy}
        empty="No hay cumpleaños hoy."
        valueFormatter={(cliente) => cliente.telefono || 'Sin teléfono'}
      />

      <ListaClientes
        titulo="Próximos 7 días"
        items={datos.proximos7}
        empty="No hay cumpleaños en los próximos 7 días."
        valueFormatter={(cliente) => `${cliente.diasHastaCumpleanios} días`}
      />

      <ListaClientes
        titulo="Próximos 30 días"
        items={datos.proximos30}
        empty="No hay cumpleaños en los próximos 30 días."
        valueFormatter={(cliente) => `${cliente.diasHastaCumpleanios} días`}
      />
    </div>
  )
}

function ClientesRecuperar({ datos }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <ListaClientes
        titulo="Clientes dormidos"
        items={datos.clientesARecuperar}
        empty="No hay clientes dormidos para recuperar."
        valueFormatter={(cliente) => cliente.diasDesdeUltimaSesion === null ? 'Nunca vino' : `${cliente.diasDesdeUltimaSesion} días`}
      />

      <ListaClientes
        titulo="Frecuentes sin próximo turno"
        items={datos.frecuentesSinTurnoFuturo}
        empty="No hay clientes frecuentes sin turno futuro."
        valueFormatter={(cliente) => `${cliente.sesionesCobradas} sesiones`}
      />
    </div>
  )
}

function IdeasFidelizacion({ datos }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <ListaClientes
        titulo="Clientes VIP sugeridos"
        items={datos.clientesVIP}
        empty="Todavía no hay suficientes datos para sugerir VIP."
        valueFormatter={(cliente) => `${cliente.sesionesCobradas} sesiones`}
      />

      <ListaClientes
        titulo="Clientes de una sola visita"
        items={datos.clientesUnaSolaVisita}
        empty="No hay clientes de una sola visita."
        valueFormatter={(cliente) => cliente.ultimaSesionTexto}
      />

      <ListaClientes
        titulo="Seguimiento sugerido"
        items={datos.seguimientoSugerido}
        empty="No hay seguimientos sugeridos."
        valueFormatter={(cliente) => cliente.motivoSeguimiento}
      />

      <div className="bg-stone-50 rounded-2xl border border-stone-100 p-5">
        <h4 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">
          Ideas accionables
        </h4>

        <div className="space-y-3 text-sm text-stone-600">
          <p>
            <strong>Cumpleaños:</strong> enviar saludo personalizado y ofrecer un beneficio suave, sin sonar invasivo.
          </p>

          <p>
            <strong>Clientes dormidos:</strong> escribir con una excusa de cuidado: “Hace un tiempo no te veo, ¿querés que coordinemos un turno?”.
          </p>

          <p>
            <strong>Clientes VIP:</strong> ofrecer prioridad horaria, recordatorios o promociones exclusivas.
          </p>

          <p>
            <strong>Una sola visita:</strong> enviar seguimiento a los 15 o 30 días para saber cómo se sintieron.
          </p>
        </div>
      </div>
    </div>
  )
}

function CalidadDatos({ datos }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <ListaClientes
        titulo="Sin cumpleaños"
        items={datos.sinCumpleanios}
        empty="Todos tienen cumpleaños cargado."
        valueFormatter={() => 'Falta fecha'}
      />

      <ListaClientes
        titulo="Sin teléfono útil"
        items={datos.sinTelefono}
        empty="Todos tienen teléfono cargado."
        valueFormatter={() => 'Revisar'}
      />

      <ListaClientes
        titulo="Sin dirección"
        items={datos.sinDireccion}
        empty="Todos tienen dirección cargada."
        valueFormatter={() => 'Completar'}
      />
    </div>
  )
}

function ListaClientes({ titulo, items, empty, valueFormatter }) {
  return (
    <div className="bg-stone-50 rounded-2xl border border-stone-100 p-5">
      <h4 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">
        {titulo}
      </h4>

      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyState mensaje={empty} />
        ) : (
          items.map((cliente, index) => (
            <ClienteRow
              key={cliente.id}
              index={index}
              cliente={cliente}
              valor={valueFormatter(cliente)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ClienteRow({ index, cliente, valor }) {
  return (
    <div className="bg-white rounded-xl border border-stone-100 p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-black shrink-0">
          {index + 1}
        </span>

        <div className="min-w-0">
          <p className="font-bold text-stone-800 truncate" title={cliente.nombre}>
            {cliente.nombre}
          </p>
          <p className="text-xs text-stone-500 truncate" title={cliente.telefono || 'Sin teléfono'}>
            {cliente.telefono || 'Sin teléfono'}
          </p>
        </div>
      </div>

      <p className="font-black text-stone-700 shrink-0 text-right text-sm" title={String(valor)}>
        {valor}
      </p>
    </div>
  )
}

function EmptyState({ mensaje }) {
  return (
    <div className="p-5 text-center text-stone-400 border border-dashed border-stone-200 rounded-xl text-sm">
      {mensaje}
    </div>
  )
}

function procesarClientes({ vinculos, sesiones }) {
  const hoy = new Date()
  const clientesBase = normalizarClientes(vinculos)
  const metricasPorCliente = crearMetricasIniciales(clientesBase)

  sesiones.forEach((sesion) => {
    if (!sesion.cliente_id || !metricasPorCliente[sesion.cliente_id]) return

    const fechaSesion = parsearFecha(sesion.fecha_hora)
    const metricas = metricasPorCliente[sesion.cliente_id]

    if (!fechaSesion) return

    if (sesion.estado === 'Cobrada') {
      metricas.sesionesCobradas += 1
      metricas.facturacionSesiones += Number(sesion.monto_cobrado || 0)
      metricas.ultimaSesionCobrada = obtenerFechaMasReciente([metricas.ultimaSesionCobrada, fechaSesion])

      procesarPreferencias(metricas, sesion)
    }

    if (sesion.estado === 'Ausente') {
      metricas.ausencias += 1
    }

    if (sesion.estado === 'Anulada') {
      metricas.anuladas += 1
    }

    if (sesion.estado === 'Pendiente' && fechaSesion >= inicioDia(hoy)) {
      metricas.turnosFuturos += 1
    }
  })

  const clientes = clientesBase.map((cliente) => {
    const metricas = metricasPorCliente[cliente.id] || crearMetricaVacia()
    const diasDesdeUltimaSesion = metricas.ultimaSesionCobrada
      ? diferenciaDias(metricas.ultimaSesionCobrada, hoy)
      : null

    const diasDesdeVinculo = cliente.fechaVinculo
      ? diferenciaDias(cliente.fechaVinculo, hoy)
      : null

    const estaActivo = diasDesdeUltimaSesion !== null && diasDesdeUltimaSesion < DIAS_CLIENTE_ACTIVO

    const estaDormido =
      (diasDesdeUltimaSesion !== null && diasDesdeUltimaSesion >= DIAS_CLIENTE_ACTIVO) ||
      (diasDesdeUltimaSesion === null && diasDesdeVinculo !== null && diasDesdeVinculo >= DIAS_CLIENTE_ACTIVO)

    const cumple = calcularCumpleanios(cliente.fechaNacimiento, hoy)

    return {
      ...cliente,
      ...metricas,
      diasDesdeUltimaSesion,
      diasDesdeVinculo,
      estaActivo,
      estaDormido,
      ultimaSesionTexto: metricas.ultimaSesionCobrada
        ? formatearFecha(metricas.ultimaSesionCobrada)
        : 'Sin sesiones cobradas',
      diasHastaCumpleanios: cumple.dias,
      cumpleaniosTexto: cumple.texto,
      servicioFavorito: obtenerPreferido(metricas.servicios),
      comboFavorito: obtenerPreferido(metricas.combos)
    }
  })

  const captacion = calcularCaptacion(clientes, hoy)
  const cumpleanios = calcularListasCumpleanios(clientes)
  const clientesDormidos = clientes.filter((cliente) => cliente.estaDormido)

  const clientesVIP = [...clientes]
    .filter((cliente) => cliente.sesionesCobradas > 0)
    .sort((a, b) => {
      if (b.facturacionSesiones !== a.facturacionSesiones) {
        return b.facturacionSesiones - a.facturacionSesiones
      }

      return b.sesionesCobradas - a.sesionesCobradas
    })
    .slice(0, 10)

  const clientesUnaSolaVisita = [...clientes]
    .filter((cliente) => cliente.sesionesCobradas === 1)
    .sort((a, b) => {
      const diasA = a.diasDesdeUltimaSesion ?? 0
      const diasB = b.diasDesdeUltimaSesion ?? 0

      return diasB - diasA
    })
    .slice(0, 10)

  const frecuentesSinTurnoFuturo = [...clientes]
    .filter((cliente) => cliente.sesionesCobradas >= 2)
    .filter((cliente) => cliente.turnosFuturos === 0)
    .sort((a, b) => b.sesionesCobradas - a.sesionesCobradas)
    .slice(0, 10)

  const seguimientoSugerido = generarSeguimientoSugerido(clientes)

  const rankings = {
    masFrecuentes: [...clientes]
      .filter((cliente) => cliente.sesionesCobradas > 0)
      .sort((a, b) => b.sesionesCobradas - a.sesionesCobradas)
      .slice(0, 5),

    masFacturaron: [...clientes]
      .filter((cliente) => cliente.facturacionSesiones > 0)
      .sort((a, b) => b.facturacionSesiones - a.facturacionSesiones)
      .slice(0, 5),

    masAusencias: [...clientes]
      .filter((cliente) => cliente.ausencias > 0)
      .sort((a, b) => b.ausencias - a.ausencias)
      .slice(0, 5),

    masTiempoSinVolver: [...clientes]
      .filter((cliente) => cliente.sesionesCobradas > 0)
      .sort((a, b) => {
        const diasA = a.diasDesdeUltimaSesion ?? 0
        const diasB = b.diasDesdeUltimaSesion ?? 0
        return diasB - diasA
      })
      .slice(0, 5)
  }

  const calidadDatos = {
    sinCumpleanios: clientes.filter((cliente) => !cliente.fechaNacimiento).slice(0, 10),
    sinTelefono: clientes.filter((cliente) => !cliente.telefono || cliente.telefono.trim().length < 6).slice(0, 10),
    sinDireccion: clientes.filter((cliente) => !cliente.direccion).slice(0, 10)
  }

  return {
    resumen: {
      totalClientes: clientes.length,
      clientesActivos: clientes.filter((cliente) => cliente.estaActivo).length,
      clientesDormidos: clientesDormidos.length,
      nuevosEsteMes: captacion.nuevosEsteMes,
      promedioMensualNuevos: captacion.promedioMensual
    },
    captacion,
    rankings,
    cumpleanios,
    clientesARecuperar: clientesDormidos
      .sort((a, b) => {
        const diasA = a.diasDesdeUltimaSesion ?? a.diasDesdeVinculo ?? 0
        const diasB = b.diasDesdeUltimaSesion ?? b.diasDesdeVinculo ?? 0
        return diasB - diasA
      })
      .slice(0, 10),
    clientesVIP,
    clientesUnaSolaVisita,
    frecuentesSinTurnoFuturo,
    seguimientoSugerido,
    calidadDatos
  }
}

function normalizarClientes(vinculos) {
  return vinculos
    .filter((vinculo) => vinculo.clientes)
    .map((vinculo) => {
      const cliente = vinculo.clientes
      const direccion = Array.isArray(cliente.direcciones)
        ? cliente.direcciones[0] || null
        : cliente.direcciones || null

      return {
        id: cliente.id,
        nombre: cliente.nombre || 'Cliente sin nombre',
        telefono: cliente.telefono || '',
        fechaNacimiento: cliente.fecha_nacimiento || null,
        fechaRegistro: parsearFecha(cliente.created_at),
        fechaVinculo: parsearFecha(vinculo.fecha_vinculo || cliente.created_at),
        direccion
      }
    })
}

function crearMetricasIniciales(clientes) {
  const metricas = {}

  clientes.forEach((cliente) => {
    metricas[cliente.id] = crearMetricaVacia()
  })

  return metricas
}

function crearMetricaVacia() {
  return {
    sesionesCobradas: 0,
    facturacionSesiones: 0,
    ultimaSesionCobrada: null,
    ausencias: 0,
    anuladas: 0,
    turnosFuturos: 0,
    servicios: {},
    combos: {}
  }
}

function procesarPreferencias(metricas, sesion) {
  sesion.sesion_detalles?.forEach((detalle) => {
    if (detalle.servicio_id) {
      const nombre = detalle.servicios?.nombre || 'Servicio sin nombre'

      metricas.servicios[nombre] = (metricas.servicios[nombre] || 0) + 1
    }

    if (detalle.combo_id) {
      const nombre = detalle.combos?.nombre || 'Combo sin nombre'

      metricas.combos[nombre] = (metricas.combos[nombre] || 0) + 1
    }
  })
}

function obtenerPreferido(mapa) {
  const entradas = Object.entries(mapa || {})

  if (entradas.length === 0) return 'Sin datos'

  entradas.sort((a, b) => b[1] - a[1])

  return entradas[0][0]
}

function calcularCaptacion(clientes, hoy) {
  const meses = crearUltimos12Meses(hoy)
  const mapa = {}

  meses.forEach((item) => {
    mapa[item.key] = {
      ...item,
      nuevos: 0
    }
  })

  clientes.forEach((cliente) => {
    if (!cliente.fechaVinculo) return

    const key = obtenerKeyMes(cliente.fechaVinculo)

    if (mapa[key]) {
      mapa[key].nuevos += 1
    }
  })

  const mensual = Object.values(mapa)
  const total = mensual.reduce((sum, item) => sum + item.nuevos, 0)
  const mejorMes = [...mensual].sort((a, b) => b.nuevos - a.nuevos)[0] || null
  const keyMesActual = obtenerKeyMes(hoy)
  const nuevosEsteMes = mapa[keyMesActual]?.nuevos || 0

  const primeraFecha = clientes
    .map((cliente) => cliente.fechaVinculo)
    .filter(Boolean)
    .sort((a, b) => a - b)[0]

  const cantidadMeses = primeraFecha
    ? Math.max(calcularCantidadMeses(primeraFecha, hoy), 1)
    : 1

  return {
    mensual,
    total,
    mejorMes,
    nuevosEsteMes,
    promedioMensual: clientes.length / cantidadMeses
  }
}

function crearUltimos12Meses(hoy) {
  return Array.from({ length: 12 }, (_, index) => {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - 11 + index, 1)

    return {
      key: obtenerKeyMes(fecha),
      label: fecha.toLocaleDateString('es-AR', {
        month: 'short',
        year: '2-digit'
      })
    }
  })
}

function obtenerKeyMes(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
}

function calcularCantidadMeses(desde, hasta) {
  return ((hasta.getFullYear() - desde.getFullYear()) * 12) + (hasta.getMonth() - desde.getMonth()) + 1
}

function calcularListasCumpleanios(clientes) {
  const conCumple = clientes
    .filter((cliente) => cliente.diasHastaCumpleanios !== null)
    .sort((a, b) => a.diasHastaCumpleanios - b.diasHastaCumpleanios)

  return {
    hoy: conCumple.filter((cliente) => cliente.diasHastaCumpleanios === 0),
    proximos7: conCumple.filter((cliente) => cliente.diasHastaCumpleanios > 0 && cliente.diasHastaCumpleanios <= 7),
    proximos30: conCumple.filter((cliente) => cliente.diasHastaCumpleanios >= 0 && cliente.diasHastaCumpleanios <= PROXIMOS_CUMPLEANIOS)
  }
}

function calcularCumpleanios(fechaNacimiento, hoy) {
  if (!fechaNacimiento) {
    return {
      dias: null,
      texto: 'Sin cumpleaños cargado'
    }
  }

  const fecha = parsearFecha(fechaNacimiento)

  if (!fecha) {
    return {
      dias: null,
      texto: 'Sin cumpleaños cargado'
    }
  }

  const cumpleEsteAnio = new Date(hoy.getFullYear(), fecha.getMonth(), fecha.getDate())
  const proximoCumple = cumpleEsteAnio < inicioDia(hoy)
    ? new Date(hoy.getFullYear() + 1, fecha.getMonth(), fecha.getDate())
    : cumpleEsteAnio

  return {
    dias: diferenciaDias(hoy, proximoCumple),
    texto: proximoCumple.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit'
    })
  }
}

function generarSeguimientoSugerido(clientes) {
  return clientes
    .map((cliente) => {
      if (cliente.diasHastaCumpleanios !== null && cliente.diasHastaCumpleanios <= 7) {
        return {
          ...cliente,
          motivoSeguimiento: 'Cumpleaños próximo'
        }
      }

      if (cliente.estaDormido) {
        return {
          ...cliente,
          motivoSeguimiento: 'Cliente dormido'
        }
      }

      if (cliente.sesionesCobradas === 1 && cliente.diasDesdeUltimaSesion !== null && cliente.diasDesdeUltimaSesion >= 30) {
        return {
          ...cliente,
          motivoSeguimiento: 'Una visita y no volvió'
        }
      }

      if (cliente.sesionesCobradas >= 2 && cliente.turnosFuturos === 0 && cliente.diasDesdeUltimaSesion !== null && cliente.diasDesdeUltimaSesion >= 45) {
        return {
          ...cliente,
          motivoSeguimiento: 'Frecuente sin próximo turno'
        }
      }

      return null
    })
    .filter(Boolean)
    .slice(0, 10)
}

function parsearFecha(valor) {
  if (!valor) return null

  const fecha = new Date(valor)

  if (Number.isNaN(fecha.getTime())) return null

  return fecha
}

function obtenerFechaMasReciente(fechas) {
  const fechasValidas = fechas.filter(Boolean)

  if (fechasValidas.length === 0) return null

  return fechasValidas.reduce((mayor, fecha) => {
    return fecha > mayor ? fecha : mayor
  }, fechasValidas[0])
}

function inicioDia(fecha) {
  const copia = new Date(fecha)
  copia.setHours(0, 0, 0, 0)
  return copia
}

function diferenciaDias(desde, hasta) {
  const inicio = inicioDia(desde)
  const fin = inicioDia(hasta)

  return Math.ceil((fin - inicio) / 86400000)
}

function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha'

  return fecha.toLocaleDateString('es-AR')
}

function formatearDinero(valor) {
  return `$${Number(valor || 0).toLocaleString('es-AR')}`
}

function formatearNumero(valor) {
  return Number(valor || 0).toLocaleString('es-AR', {
    maximumFractionDigits: 2
  })
}

function obtenerFechaArchivo() {
  const fecha = new Date()
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}