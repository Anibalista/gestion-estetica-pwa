// src/components/servicios/InformesAdministracion.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Flame,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Timer,
  TrendingUp,
  Wallet,
  Wrench
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts'

const PERIODOS = [
  { value: 'mes', label: 'Mes' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'anio', label: 'Año' },
  { value: 'todo', label: 'Todo' }
]

const MESES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic'
]

export function InformesAdministracion({ session }) {
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [periodo, setPeriodo] = useState('anio')

  const [servicios, setServicios] = useState([])
  const [costosServicio, setCostosServicio] = useState([])
  const [sesiones, setSesiones] = useState([])
  const [comboServicios, setComboServicios] = useState([])

  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    resumen: true,
    rentabilidad: true,
    productividad: false,
    constancia: false,
    temporada: false,
    marketing: false,
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
      const [
        serviciosResponse,
        costosResponse,
        sesionesResponse,
        comboServiciosResponse
      ] = await Promise.all([
        supabase
          .from('servicio_profesional')
          .select(`
            servicio_id,
            profesional_id,
            servicios (
              id,
              nombre,
              activo,
              precio_actual,
              descripcion,
              duracion_minutos,
              beneficios
            )
          `)
          .eq('profesional_id', session.user.id),

        supabase
          .from('costo_servicio')
          .select(`
            id,
            servicio_id,
            producto_id,
            descripcion,
            monto,
            cantidad_suelta_usada,
            unidades_usadas
          `),

        supabase
          .from('sesiones')
          .select(`
            id,
            profesional_id,
            fecha_hora,
            estado,
            monto_total,
            monto_cobrado,
            duracion_total,
            sesion_detalles (
              id,
              servicio_id,
              combo_id,
              precio_cobrado,
              servicios (
                id,
                nombre,
                duracion_minutos,
                precio_actual,
                beneficios
              ),
              combos (
                id,
                nombre,
                duracion_minutos,
                precio_actual
              )
            )
          `)
          .eq('profesional_id', session.user.id)
          .eq('estado', 'Cobrada'),

        supabase
          .from('combo_servicios')
          .select(`
            combo_id,
            servicio_id,
            combos!inner (
              id,
              profesional_id
            ),
            servicios (
              id,
              nombre,
              duracion_minutos,
              precio_actual,
              beneficios
            )
          `)
          .eq('combos.profesional_id', session.user.id)
      ])

      if (serviciosResponse.error) throw serviciosResponse.error
      if (costosResponse.error) throw costosResponse.error
      if (sesionesResponse.error) throw sesionesResponse.error
      if (comboServiciosResponse.error) throw comboServiciosResponse.error

      const serviciosDelProfesional = (serviciosResponse.data || [])
        .map((item) => item.servicios)
        .filter(Boolean)

      setServicios(serviciosDelProfesional)
      setCostosServicio(costosResponse.data || [])
      setSesiones(sesionesResponse.data || [])
      setComboServicios(comboServiciosResponse.data || [])

    } catch (error) {
      console.error('Error al cargar informes de administración:', error)
      setErrorCarga(error.message || 'No se pudieron cargar los informes de administración.')
    } finally {
      setLoading(false)
    }
  }

  const datos = useMemo(() => {
    return procesarAdministracion({
      servicios,
      costosServicio,
      sesiones,
      comboServicios,
      periodo
    })
  }, [servicios, costosServicio, sesiones, comboServicios, periodo])

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
    doc.text('Informe de Administración de Servicios', 14, 18)

    doc.setFontSize(10)
    doc.text(`Fecha: ${fecha}`, 14, 26)
    doc.text(`Período: ${obtenerLabelPeriodo(periodo)}`, 14, 32)
    doc.text(`Profesional: ${session?.user?.email || 'Sin email'}`, 14, 38)

    autoTable(doc, {
      startY: 46,
      head: [['Métrica', 'Valor']],
      body: [
        ['Servicios activos', datos.resumen.serviciosActivos],
        ['Servicios realizados', datos.resumen.serviciosRealizados],
        ['Ingresos estimados por servicios', formatearDinero(datos.resumen.ingresos)],
        ['Costos estimados', formatearDinero(datos.resumen.costos)],
        ['Ganancia estimada', formatearDinero(datos.resumen.ganancia)],
        ['Margen promedio', `${formatearNumero(datos.resumen.margenPromedio)}%`],
        ['Servicio más rentable/minuto', datos.resumen.mejorGananciaMinuto?.nombre || 'Sin datos'],
        ['Servicio más constante', datos.resumen.servicioMasConstante?.nombre || 'Sin datos']
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Servicio', 'Ingresos', 'Costos', 'Ganancia', 'Margen', 'Veces']],
      body: datos.rentabilidad.slice(0, 10).map((item) => [
        item.nombre,
        formatearDinero(item.ingreso),
        formatearDinero(item.costoReal),
        formatearDinero(item.gananciaReal),
        `${formatearNumero(item.margenReal)}%`,
        item.cantidad
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Servicio', 'Ganancia/min', 'Ingreso/min', 'Duración', 'Beneficios']],
      body: datos.productividadTiempo.slice(0, 10).map((item) => [
        item.nombre,
        formatearDinero(item.gananciaPorMinuto),
        formatearDinero(item.ingresoPorMinuto),
        `${item.duracion} min`,
        item.beneficios || 'Sin beneficios cargados'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Mes', 'Servicio líder', 'Cantidad']],
      body: datos.serviciosPorMes.map((item) => [
        item.mes,
        item.servicio || 'Sin datos',
        item.cantidad || 0
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    doc.save(`informe-servicios-administracion-${obtenerFechaArchivo()}.pdf`)
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
      <HeaderInformes
        periodo={periodo}
        setPeriodo={setPeriodo}
        onExportar={exportarPDF}
      />

      <SeccionContraible
        titulo="Resumen administrativo"
        descripcion="Foto general de rendimiento, costos, ingresos y oportunidades."
        Icon={FileText}
        abierta={seccionesAbiertas.resumen}
        onToggle={() => alternarSeccion('resumen')}
      >
        <ResumenGeneral datos={datos} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Rentabilidad y costos"
        descripcion="Ganancia estimada por servicio, costo cargado y margen."
        Icon={Wallet}
        abierta={seccionesAbiertas.rentabilidad}
        onToggle={() => alternarSeccion('rentabilidad')}
      >
        <RentabilidadCostos datos={datos} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Productividad por tiempo"
        descripcion="Servicios que más rinden en relación a duración, precio, costo y beneficios."
        Icon={Timer}
        abierta={seccionesAbiertas.productividad}
        onToggle={() => alternarSeccion('productividad')}
      >
        <ProductividadTiempo datos={datos} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Constancia de servicios"
        descripcion="Servicios repetidos a lo largo de semanas o meses, no solo los más vendidos."
        Icon={CalendarDays}
        abierta={seccionesAbiertas.constancia}
        onToggle={() => alternarSeccion('constancia')}
      >
        <ConstanciaServicios datos={datos} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Servicios famosos por temporada"
        descripcion="Qué servicios lideran en distintos meses del año para preparar insumos y campañas."
        Icon={Flame}
        abierta={seccionesAbiertas.temporada}
        onToggle={() => alternarSeccion('temporada')}
      >
        <ServiciosTemporada datos={datos} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Ideas de marketing y administración"
        descripcion="Sugerencias automáticas para vender mejor y ajustar la oferta."
        Icon={Lightbulb}
        abierta={seccionesAbiertas.marketing}
        onToggle={() => alternarSeccion('marketing')}
      >
        <IdeasAdministracion datos={datos} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Calidad de configuración"
        descripcion="Servicios sin costos, sin duración, sin beneficios o sin movimiento."
        Icon={Wrench}
        abierta={seccionesAbiertas.calidad}
        onToggle={() => alternarSeccion('calidad')}
      >
        <CalidadConfiguracion datos={datos} />
      </SeccionContraible>
    </div>
  )
}

function HeaderInformes({ periodo, setPeriodo, onExportar }) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 px-2">
      <div>
        <h2 className="text-2xl font-light text-stone-800">
          Informes - Administración
        </h2>
        <p className="text-sm text-stone-500 font-light italic">
          Rentabilidad, costos, productividad por tiempo, constancia y oportunidades de servicios.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="bg-white border border-stone-200 rounded-2xl p-2 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-black text-stone-400 mb-1 px-2">
            Período
          </p>

          <div className="flex flex-wrap gap-1">
            {PERIODOS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPeriodo(item.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  periodo === item.value
                    ? 'bg-teal-600 text-white'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
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
        titulo="Activos"
        valor={datos.resumen.serviciosActivos}
        descripcion="Servicios disponibles"
        Icon={Sparkles}
      />

      <ResumenCard
        titulo="Realizados"
        valor={datos.resumen.serviciosRealizados}
        descripcion="Servicios cobrados"
        Icon={BarChart3}
      />

      <ResumenCard
        titulo="Ganancia"
        valor={formatearDinero(datos.resumen.ganancia)}
        descripcion="Ingresos menos costos"
        Icon={Wallet}
      />

      <ResumenCard
        titulo="Margen prom."
        valor={`${formatearNumero(datos.resumen.margenPromedio)}%`}
        descripcion="Según servicios activos"
        Icon={TrendingUp}
      />

      <ResumenCard
        titulo="Mejor/min"
        valor={datos.resumen.mejorGananciaMinuto?.nombre || 'Sin datos'}
        descripcion="Ganancia por minuto"
        Icon={Clock}
      />
    </div>
  )
}

function ResumenCard({ titulo, valor, descripcion, Icon }) {
  return (
    <div className="bg-stone-50 rounded-2xl border border-stone-100 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
            {titulo}
          </p>
          <p className="text-2xl font-black text-stone-800 truncate" title={String(valor)}>
            {valor}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            {descripcion}
          </p>
        </div>

        <div className="text-teal-600 bg-white rounded-xl p-2 shadow-sm shrink-0">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function RentabilidadCostos({ datos }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="h-80 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos.rentabilidad.slice(0, 8)} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
            <XAxis dataKey="nombreCorto" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatearDinero(v)} />
            <Tooltip formatter={(value) => [formatearDinero(value), 'Monto']} />
            <Legend />
            <Bar dataKey="ingreso" name="Ingresos" fill="#0d9488" radius={[8, 8, 0, 0]} />
            <Bar dataKey="costoReal" name="Costos" fill="#ef4444" radius={[8, 8, 0, 0]} />
            <Bar dataKey="gananciaReal" name="Ganancia" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <RankingCard
        titulo="Servicios con mayor ganancia"
        items={datos.rentabilidad.slice(0, 8)}
        valueFormatter={(item) => formatearDinero(item.gananciaReal)}
        subFormatter={(item) => `${item.cantidad} veces · margen ${formatearNumero(item.margenReal)}%`}
      />
    </div>
  )
}

function ProductividadTiempo({ datos }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <RankingCard
        titulo="Mejor ganancia por minuto"
        items={datos.productividadTiempo.slice(0, 8)}
        valueFormatter={(item) => formatearDinero(item.gananciaPorMinuto)}
        subFormatter={(item) => `${item.duracion} min · ${item.beneficios || 'Sin beneficios cargados'}`}
      />

      <div className="bg-stone-50 rounded-2xl border border-stone-100 p-5">
        <h4 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">
          Beneficio comercial por tiempo
        </h4>

        <div className="space-y-3">
          {datos.productividadTiempo.slice(0, 8).map((item, index) => (
            <div key={item.id} className="bg-white rounded-xl border border-stone-100 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-stone-800 truncate" title={item.nombre}>
                    {index + 1}. {item.nombre}
                  </p>
                  <p className="text-xs text-stone-500 truncate" title={item.beneficios || 'Sin beneficios cargados'}>
                    {item.beneficios || 'Sin beneficios cargados'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-black text-stone-700">
                    {formatearDinero(item.ingresoPorMinuto)}/min
                  </p>
                  <p className="text-xs text-stone-400">
                    ingreso/min
                  </p>
                </div>
              </div>
            </div>
          ))}

          {datos.productividadTiempo.length === 0 && (
            <EmptyState mensaje="No hay datos suficientes." />
          )}
        </div>
      </div>
    </div>
  )
}

function ConstanciaServicios({ datos }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <RankingCard
        titulo="Servicios más constantes"
        items={datos.constancia.slice(0, 10)}
        valueFormatter={(item) => `${item.mesesActivos} meses`}
        subFormatter={(item) => `${item.cantidad} veces · ${item.semanasActivas} semanas con movimiento`}
      />

      <div className="h-80 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos.serieConstancia.slice(0, 12)} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="serviciosDistintos" name="Servicios distintos" stroke="#0d9488" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ServiciosTemporada({ datos }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-stone-50 rounded-2xl border border-stone-100 p-5">
        <h4 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">
          Servicio líder por mes
        </h4>

        <div className="space-y-3">
          {datos.serviciosPorMes.map((item) => (
            <div key={item.mes} className="bg-white rounded-xl border border-stone-100 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-stone-800">
                  {item.mes}
                </p>
                <p className="text-xs text-stone-500 truncate" title={item.servicio || 'Sin datos'}>
                  {item.servicio || 'Sin datos'}
                </p>
              </div>

              <p className="font-black text-stone-700">
                {item.cantidad || 0}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="h-96 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos.serviciosPorMes} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="cantidad" name="Cantidad líder" fill="#0d9488" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function IdeasAdministracion({ datos }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <ListaIdeas
        titulo="Servicios para promocionar"
        descripcion="Alta ganancia, pero baja cantidad realizada."
        items={datos.ideas.promocionar}
        valor={(item) => `${formatearDinero(item.gananciaUnitaria)} ganancia`}
      />

      <ListaIdeas
        titulo="Servicios estrella"
        descripcion="Buena constancia y buen margen."
        items={datos.ideas.estrella}
        valor={(item) => `${item.mesesActivos} meses activos`}
      />

      <ListaIdeas
        titulo="Servicios a revisar precio"
        descripcion="Mucho movimiento, pero margen bajo."
        items={datos.ideas.revisarPrecio}
        valor={(item) => `${formatearNumero(item.margenUnitario)}% margen`}
      />

      <div className="bg-stone-50 rounded-2xl border border-stone-100 p-5">
        <h4 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">
          Sugerencias prácticas
        </h4>

        <div className="space-y-3 text-sm text-stone-600">
          <p>
            <strong>Preparación de insumos:</strong> revisar los servicios líderes por mes antes de iniciar una campaña o temporada fuerte.
          </p>

          <p>
            <strong>Marketing:</strong> promocionar servicios de alta ganancia por minuto cuando haya huecos de agenda.
          </p>

          <p>
            <strong>Precios:</strong> si un servicio se hace mucho pero deja poco margen, puede necesitar ajuste de precio o reducción de costo.
          </p>

          <p>
            <strong>Oferta:</strong> los servicios constantes son buenos candidatos para combos, packs o mantenimiento mensual.
          </p>
        </div>
      </div>
    </div>
  )
}

function ListaIdeas({ titulo, descripcion, items, valor }) {
  return (
    <div className="bg-stone-50 rounded-2xl border border-stone-100 p-5">
      <h4 className="text-xs font-black uppercase tracking-widest text-stone-500">
        {titulo}
      </h4>
      <p className="text-xs text-stone-500 mt-1 mb-4">
        {descripcion}
      </p>

      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyState mensaje="Sin sugerencias por ahora." />
        ) : (
          items.map((item, index) => (
            <RankingRow
              key={item.id}
              index={index}
              titulo={item.nombre}
              subtitulo={`${item.cantidad} veces · ${item.duracion} min`}
              valor={valor(item)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function CalidadConfiguracion({ datos }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <MiniLista
        titulo="Sin costos cargados"
        items={datos.calidad.sinCostos}
        valor={() => 'Completar'}
      />

      <MiniLista
        titulo="Sin duración"
        items={datos.calidad.sinDuracion}
        valor={() => 'Falta tiempo'}
      />

      <MiniLista
        titulo="Sin beneficios"
        items={datos.calidad.sinBeneficios}
        valor={() => 'Falta texto'}
      />

      <MiniLista
        titulo="Sin movimiento"
        items={datos.calidad.sinMovimiento}
        valor={() => 'Sin sesiones'}
      />
    </div>
  )
}

function MiniLista({ titulo, items, valor }) {
  return (
    <div className="bg-stone-50 rounded-2xl border border-stone-100 p-5">
      <h4 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">
        {titulo}
      </h4>

      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyState mensaje="Todo en orden." />
        ) : (
          items.slice(0, 8).map((item, index) => (
            <RankingRow
              key={item.id}
              index={index}
              titulo={item.nombre}
              subtitulo={item.activo ? 'Activo' : 'Inactivo'}
              valor={valor(item)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function RankingCard({ titulo, items, valueFormatter, subFormatter }) {
  return (
    <div className="bg-stone-50 rounded-2xl border border-stone-100 p-5">
      <h4 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">
        {titulo}
      </h4>

      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyState mensaje="Sin datos suficientes." />
        ) : (
          items.map((item, index) => (
            <RankingRow
              key={item.id}
              index={index}
              titulo={item.nombre}
              subtitulo={subFormatter(item)}
              valor={valueFormatter(item)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function RankingRow({ index, titulo, subtitulo, valor }) {
  return (
    <div className="bg-white rounded-xl border border-stone-100 p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-black shrink-0">
          {index + 1}
        </span>

        <div className="min-w-0">
          <p className="font-bold text-stone-800 truncate" title={titulo}>
            {titulo}
          </p>
          <p className="text-xs text-stone-500 truncate" title={subtitulo}>
            {subtitulo}
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

function procesarAdministracion({ servicios, costosServicio, sesiones, comboServicios, periodo }) {
  const hoy = new Date()
  const inicioPeriodo = obtenerInicioPeriodo(periodo, hoy)

  const serviciosBase = servicios.map(normalizarServicio)
  const servicioPorId = indexarPorId(serviciosBase)

  const idsServiciosDelProfesional = new Set(
    serviciosBase.map((servicio) => servicio.id)
  )

  const costosFiltrados = costosServicio.filter((costo) => {
    return costo.servicio_id && idsServiciosDelProfesional.has(costo.servicio_id)
  })

  const costoPorServicio = agruparCostos(costosFiltrados)
  const serviciosPorCombo = agruparServiciosPorCombo(comboServicios)

  const metricas = crearMetricasServicios(serviciosBase, costoPorServicio)

  sesiones.forEach((sesion) => {
    const fecha = parsearFecha(sesion.fecha_hora)
    if (!fecha) return
    if (inicioPeriodo && fecha < inicioPeriodo) return

    const detalles = sesion.sesion_detalles || []

    detalles.forEach((detalle) => {
      if (detalle.servicio_id) {
        registrarServicio({
          id: detalle.servicio_id,
          fecha,
          ingreso: Number(detalle.precio_cobrado || detalle.servicios?.precio_actual || 0),
          metricas,
          servicioPorId
        })
      }

      if (detalle.combo_id) {
        const serviciosCombo = serviciosPorCombo[detalle.combo_id] || []
        const ingresoCombo = Number(detalle.precio_cobrado || detalle.combos?.precio_actual || 0)
        const ingresoPorServicio = serviciosCombo.length > 0 ? ingresoCombo / serviciosCombo.length : 0

        serviciosCombo.forEach((servicio) => {
          registrarServicio({
            id: servicio.id,
            fecha,
            ingreso: ingresoPorServicio,
            metricas,
            servicioPorId
          })
        })
      }
    })
  })

  const serviciosConMetricas = Object.values(metricas).map((item) => {
    const costoUnitario = Number(item.costoUnitario || 0)
    const precioActual = Number(item.precioActual || 0)
    const duracion = Number(item.duracion || 0)
    const gananciaUnitaria = precioActual - costoUnitario
    const margenUnitario = precioActual > 0 ? (gananciaUnitaria / precioActual) * 100 : 0
    const gananciaReal = item.ingreso - item.costoReal
    const margenReal = item.ingreso > 0 ? (gananciaReal / item.ingreso) * 100 : 0

    return {
      ...item,
      gananciaUnitaria,
      margenUnitario,
      gananciaReal,
      margenReal,
      ingresoPorMinuto: duracion > 0 ? precioActual / duracion : 0,
      costoPorMinuto: duracion > 0 ? costoUnitario / duracion : 0,
      gananciaPorMinuto: duracion > 0 ? gananciaUnitaria / duracion : 0,
      mesesActivos: item.meses.size,
      semanasActivas: item.semanas.size,
      nombreCorto: cortarTexto(item.nombre, 12)
    }
  })

  const realizados = serviciosConMetricas.filter((item) => item.cantidad > 0)
  const activos = serviciosConMetricas.filter((item) => item.activo)
  const ingresos = realizados.reduce((sum, item) => sum + item.ingreso, 0)
  const costos = realizados.reduce((sum, item) => sum + item.costoReal, 0)
  const ganancia = ingresos - costos

  const rentabilidad = [...realizados].sort((a, b) => b.gananciaReal - a.gananciaReal)
  const productividadTiempo = [...activos]
    .filter((item) => item.duracion > 0)
    .sort((a, b) => b.gananciaPorMinuto - a.gananciaPorMinuto)

  const constancia = [...realizados].sort((a, b) => {
    if (b.mesesActivos !== a.mesesActivos) return b.mesesActivos - a.mesesActivos
    if (b.semanasActivas !== a.semanasActivas) return b.semanasActivas - a.semanasActivas
    return b.cantidad - a.cantidad
  })

  const serviciosPorMes = calcularServiciosPorMes(sesiones, serviciosPorCombo, servicioPorId)
  const serieConstancia = calcularSerieConstancia(sesiones, serviciosPorCombo, servicioPorId)

  const margenPromedio = activos.length > 0
    ? activos.reduce((sum, item) => sum + item.margenUnitario, 0) / activos.length
    : 0

  const ideas = {
    promocionar: [...activos]
      .filter((item) => item.gananciaUnitaria > 0)
      .filter((item) => item.cantidad <= 2)
      .sort((a, b) => b.gananciaUnitaria - a.gananciaUnitaria)
      .slice(0, 5),

    estrella: [...activos]
      .filter((item) => item.cantidad > 0)
      .sort((a, b) => {
        const scoreA = a.mesesActivos * 2 + a.margenUnitario / 10 + a.cantidad
        const scoreB = b.mesesActivos * 2 + b.margenUnitario / 10 + b.cantidad
        return scoreB - scoreA
      })
      .slice(0, 5),

    revisarPrecio: [...activos]
      .filter((item) => item.cantidad >= 3)
      .filter((item) => item.margenUnitario < 35)
      .sort((a, b) => a.margenUnitario - b.margenUnitario)
      .slice(0, 5)
  }

  const calidad = {
    sinCostos: activos.filter((item) => item.costoUnitario <= 0),
    sinDuracion: activos.filter((item) => item.duracion <= 0),
    sinBeneficios: activos.filter((item) => !item.beneficios || item.beneficios.trim() === ''),
    sinMovimiento: activos.filter((item) => item.cantidad === 0)
  }

  return {
    resumen: {
      serviciosActivos: activos.length,
      serviciosRealizados: realizados.reduce((sum, item) => sum + item.cantidad, 0),
      ingresos,
      costos,
      ganancia,
      margenPromedio,
      mejorGananciaMinuto: productividadTiempo[0] || null,
      servicioMasConstante: constancia[0] || null
    },
    rentabilidad,
    productividadTiempo,
    constancia,
    serviciosPorMes,
    serieConstancia,
    ideas,
    calidad
  }
}

function normalizarServicio(servicio) {
  return {
    id: servicio.id,
    nombre: servicio.nombre || 'Servicio sin nombre',
    activo: servicio.activo !== false,
    precioActual: Number(servicio.precio_actual || 0),
    descripcion: servicio.descripcion || '',
    duracion: Number(servicio.duracion_minutos || 0),
    beneficios: servicio.beneficios || ''
  }
}

function crearMetricasServicios(servicios, costoPorServicio) {
  const metricas = {}

  servicios.forEach((servicio) => {
    metricas[servicio.id] = {
      ...servicio,
      costoUnitario: Number(costoPorServicio[servicio.id] || 0),
      cantidad: 0,
      ingreso: 0,
      costoReal: 0,
      minutos: 0,
      meses: new Set(),
      semanas: new Set()
    }
  })

  return metricas
}

function registrarServicio({ id, fecha, ingreso, metricas, servicioPorId }) {
  if (!id || !metricas[id] || !servicioPorId[id]) return

  const servicio = servicioPorId[id]

  metricas[id].cantidad += 1
  metricas[id].ingreso += Number(ingreso || 0)
  metricas[id].costoReal += Number(metricas[id].costoUnitario || 0)
  metricas[id].minutos += Number(servicio.duracion || 0)
  metricas[id].meses.add(obtenerKeyMes(fecha))
  metricas[id].semanas.add(obtenerKeySemana(fecha))
}

function calcularServiciosPorMes(sesiones, serviciosPorCombo, servicioPorId) {
  const mapa = {}

  MESES.forEach((mes, index) => {
    mapa[index] = {}
  })

  sesiones.forEach((sesion) => {
    const fecha = parsearFecha(sesion.fecha_hora)
    if (!fecha) return

    const mes = fecha.getMonth()
    const detalles = sesion.sesion_detalles || []

    detalles.forEach((detalle) => {
      if (detalle.servicio_id && servicioPorId[detalle.servicio_id]) {
        const nombre = servicioPorId[detalle.servicio_id].nombre
        mapa[mes][nombre] = (mapa[mes][nombre] || 0) + 1
      }

      if (detalle.combo_id) {
        const serviciosCombo = serviciosPorCombo[detalle.combo_id] || []

        serviciosCombo.forEach((servicio) => {
          if (!servicioPorId[servicio.id]) return

          const nombre = servicio.nombre
          mapa[mes][nombre] = (mapa[mes][nombre] || 0) + 1
        })
      }
    })
  })

  return MESES.map((mes, index) => {
    const entradas = Object.entries(mapa[index] || {}).sort((a, b) => b[1] - a[1])
    const lider = entradas[0]

    return {
      mes,
      servicio: lider?.[0] || '',
      cantidad: lider?.[1] || 0
    }
  })
}

function calcularSerieConstancia(sesiones, serviciosPorCombo, servicioPorId) {
  const mapa = {}

  sesiones.forEach((sesion) => {
    const fecha = parsearFecha(sesion.fecha_hora)
    if (!fecha) return

    const key = obtenerKeyMes(fecha)
    const label = fecha.toLocaleDateString('es-AR', {
      month: 'short',
      year: '2-digit'
    })

    if (!mapa[key]) {
      mapa[key] = {
        key,
        label,
        servicios: new Set()
      }
    }

    sesion.sesion_detalles?.forEach((detalle) => {
      if (detalle.servicio_id && servicioPorId[detalle.servicio_id]) {
        mapa[key].servicios.add(detalle.servicio_id)
      }

      if (detalle.combo_id) {
        const serviciosCombo = serviciosPorCombo[detalle.combo_id] || []

        serviciosCombo.forEach((servicio) => {
          if (!servicioPorId[servicio.id]) return

          mapa[key].servicios.add(servicio.id)
        })
      }
    })
  })

  return Object.values(mapa)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((item) => ({
      label: item.label,
      serviciosDistintos: item.servicios.size
    }))
}

function agruparCostos(costosServicio) {
  const mapa = {}

  costosServicio.forEach((costo) => {
    if (!costo.servicio_id) return

    if (!mapa[costo.servicio_id]) {
      mapa[costo.servicio_id] = 0
    }

    mapa[costo.servicio_id] += Number(costo.monto || 0)
  })

  return mapa
}

function agruparServiciosPorCombo(comboServicios) {
  const mapa = {}

  comboServicios.forEach((item) => {
    if (!item.combo_id || !item.servicio_id) return

    if (!mapa[item.combo_id]) {
      mapa[item.combo_id] = []
    }

    mapa[item.combo_id].push({
      id: item.servicio_id,
      nombre: item.servicios?.nombre || 'Servicio sin nombre',
      duracion: Number(item.servicios?.duracion_minutos || 0),
      precioActual: Number(item.servicios?.precio_actual || 0),
      beneficios: item.servicios?.beneficios || ''
    })
  })

  return mapa
}

function obtenerInicioPeriodo(periodo, hoy) {
  if (periodo === 'todo') return null

  const inicio = new Date(hoy)

  if (periodo === 'mes') {
    return new Date(inicio.getFullYear(), inicio.getMonth(), 1)
  }

  if (periodo === 'trimestre') {
    inicio.setMonth(inicio.getMonth() - 3)
    inicio.setHours(0, 0, 0, 0)
    return inicio
  }

  if (periodo === 'anio') {
    return new Date(inicio.getFullYear(), 0, 1)
  }

  return null
}

function obtenerLabelPeriodo(periodo) {
  const item = PERIODOS.find((p) => p.value === periodo)

  return item?.label || periodo
}

function indexarPorId(items) {
  const mapa = {}

  items.forEach((item) => {
    mapa[item.id] = item
  })

  return mapa
}

function parsearFecha(valor) {
  if (!valor) return null

  const fecha = new Date(valor)

  if (Number.isNaN(fecha.getTime())) return null

  return fecha
}

function obtenerKeyMes(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
}

function obtenerKeySemana(fecha) {
  const copia = new Date(fecha)
  const inicioAnio = new Date(copia.getFullYear(), 0, 1)
  const dias = Math.floor((copia - inicioAnio) / 86400000)
  const semana = Math.ceil((dias + inicioAnio.getDay() + 1) / 7)

  return `${copia.getFullYear()}-S${String(semana).padStart(2, '0')}`
}

function cortarTexto(texto, max) {
  if (!texto) return ''

  return texto.length > max ? `${texto.slice(0, max)}…` : texto
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