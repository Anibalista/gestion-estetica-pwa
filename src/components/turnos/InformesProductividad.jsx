// src/components/turnos/InformesProductividad.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  BarChart3,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Clock,
  DollarSign,
  Download,
  FileText,
  PieChart as PieIcon,
  RefreshCw,
  TrendingUp,
  Wallet,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

const PERIODOS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'anio', label: 'Año' },
  { value: 'todo', label: 'Todo' }
]

const ESTADO_COLORES = {
  Cobrada: '#0d9488',
  Pendiente: '#f59e0b',
  Anulada: '#ef4444',
  Ausente: '#78716c'
}

export function InformesProductividad({ session, empresaActiva, rolEmpresa }) {
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [periodo, setPeriodo] = useState('mes')
  const [sesiones, setSesiones] = useState([])
  const [comboServicios, setComboServicios] = useState([])

  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    resumen: true,
    ingresos: true,
    comparativos: false,
    estados: false,
    rankings: false,
    horarios: false,
    ausencias: false
  })

  useEffect(() => {
    if (session?.user?.id && empresaActiva?.id) {
      cargarDatos()
    }
  }, [session?.user?.id, empresaActiva?.id])

  const cargarDatos = async () => {
    setLoading(true)
    setErrorCarga('')

    try {
      const puedeVerEmpresaCompleta = ['Dueño', 'Administrador', 'Recepcionista'].includes(rolEmpresa)

      let sesionesQuery = supabase
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
          duracion_total,
          a_domicilio,
          medio_pago,
          clientes (
            id,
            nombre,
            telefono
          ),
          sesion_detalles (
            id,
            servicio_id,
            combo_id,
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

      if (!puedeVerEmpresaCompleta) {
        sesionesQuery = sesionesQuery.eq('profesional_id', session.user.id)
      }

      const [sesionesResponse, comboServiciosResponse] = await Promise.all([
        sesionesQuery,

        supabase
          .from('combo_servicios')
          .select(`
            combo_id,
            servicio_id,
            servicios (
              id,
              nombre,
              duracion_minutos
            )
          `)
      ])

      if (sesionesResponse.error) throw sesionesResponse.error
      if (comboServiciosResponse.error) throw comboServiciosResponse.error

      setSesiones(sesionesResponse.data || [])
      setComboServicios(comboServiciosResponse.data || [])

    } catch (error) {
      console.error('Error al cargar informes de productividad:', error)
      setErrorCarga(error.message || 'No se pudieron cargar los informes de productividad.')
    } finally {
      setLoading(false)
    }
  }

  const datos = useMemo(() => {
    return procesarProductividad({
      sesiones,
      comboServicios,
      periodo
    })
  }, [sesiones, comboServicios, periodo])

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
    doc.text('Informe de Productividad - Sesiones', 14, 18)

    doc.setFontSize(10)
    doc.text(`Fecha: ${fecha}`, 14, 26)
    doc.text(`Período: ${obtenerLabelPeriodo(periodo)}`, 14, 32)
    doc.text(`Profesional: ${session?.user?.email || 'Sin email'}`, 14, 38)
    doc.text(`Empresa: ${empresaActiva?.nombre || 'Sin empresa'}`, 14, 44)

    autoTable(doc, {
      startY: 46,
      head: [['Métrica', 'Valor']],
      body: [
        ['Sesiones cobradas', datos.resumen.cobradas],
        ['Sesiones pendientes', datos.resumen.pendientes],
        ['Sesiones anuladas', datos.resumen.anuladas],
        ['Sesiones ausentes', datos.resumen.ausentes],
        ['Ingreso real cobrado', formatearDinero(datos.resumen.ingresoReal)],
        ['Ideal a cobrar en cobradas', formatearDinero(datos.resumen.idealCobradas)],
        ['Promedio cobrado por sesión', formatearDinero(datos.resumen.promedioCobrado)],
        ['Duración total trabajada', `${datos.resumen.duracionTotal} min`],
        ['Promedio duración por sesión', `${formatearNumero(datos.resumen.promedioDuracion)} min`]
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Comparativo', 'Monto']],
      body: [
        ['Monto real cobrado', formatearDinero(datos.resumen.ingresoReal)],
        ['Monto ideal a cobrar en sesiones cobradas', formatearDinero(datos.resumen.idealCobradas)],
        ['Monto estimado pendiente', formatearDinero(datos.resumen.idealPendientes)],
        ['Monto perdido / no cobrado por anuladas', formatearDinero(datos.resumen.idealAnuladas)],
        ['Monto perdido / no cobrado por ausentes', formatearDinero(datos.resumen.idealAusentes)]
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Estado', 'Cantidad']],
      body: datos.estadosPie.map((item) => [item.name, item.value]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Top servicios', 'Cantidad', 'Ingreso', 'Minutos']],
      body: datos.topServicios.map((item) => [
        item.nombre,
        item.cantidad,
        formatearDinero(item.ingreso),
        item.minutos
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Top combos', 'Cantidad', 'Ingreso', 'Minutos']],
      body: datos.topCombos.map((item) => [
        item.nombre,
        item.cantidad,
        formatearDinero(item.ingreso),
        item.minutos
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    doc.save(`informe-productividad-${obtenerFechaArchivo()}.pdf`)
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
        titulo="Resumen general"
        descripcion="Vista rápida del rendimiento de sesiones en el período seleccionado."
        Icon={ClipboardList}
        abierta={seccionesAbiertas.resumen}
        onToggle={() => alternarSeccion('resumen')}
      >
        <ResumenGeneral datos={datos} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Ingresos vs sesiones"
        descripcion="Relación entre cantidad de sesiones cobradas e ingresos reales."
        Icon={TrendingUp}
        abierta={seccionesAbiertas.ingresos}
        onToggle={() => alternarSeccion('ingresos')}
      >
        <GraficoIngresosSesiones datos={datos.ingresosVsSesiones} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Comparativos de montos"
        descripcion="Monto cobrado real, ideal a cobrar, anuladas, ausentes y pendientes."
        Icon={Wallet}
        abierta={seccionesAbiertas.comparativos}
        onToggle={() => alternarSeccion('comparativos')}
      >
        <ComparativosMontos datos={datos} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Estados de sesiones"
        descripcion="Distribución de sesiones cobradas, anuladas, ausentes y pendientes."
        Icon={PieIcon}
        abierta={seccionesAbiertas.estados}
        onToggle={() => alternarSeccion('estados')}
      >
        <EstadosSesiones datos={datos.estadosPie} />
      </SeccionContraible>

      <SeccionContraible
        titulo="Servicios y combos más realizados"
        descripcion="Ranking separado de servicios individuales y combos."
        Icon={BarChart3}
        abierta={seccionesAbiertas.rankings}
        onToggle={() => alternarSeccion('rankings')}
      >
        <RankingsServicios
          topServicios={datos.topServicios}
          topCombos={datos.topCombos}
        />
      </SeccionContraible>

      <SeccionContraible
        titulo="Horarios y días más productivos"
        descripcion="Ayuda a detectar cuándo se trabaja más y cuándo se cobra más."
        Icon={Clock}
        abierta={seccionesAbiertas.horarios}
        onToggle={() => alternarSeccion('horarios')}
      >
        <HorariosProductivos
          porDiaSemana={datos.porDiaSemana}
          porFranja={datos.porFranja}
        />
      </SeccionContraible>

      <SeccionContraible
        titulo="Ausencias y anulaciones"
        descripcion="Pérdida estimada y cantidad de sesiones no concretadas."
        Icon={XCircle}
        abierta={seccionesAbiertas.ausencias}
        onToggle={() => alternarSeccion('ausencias')}
      >
        <AusenciasAnulaciones datos={datos} />
      </SeccionContraible>
    </div>
  )
}

function HeaderInformes({ periodo, setPeriodo, onExportar }) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 px-2">
      <div>
        <h2 className="text-2xl font-light text-stone-800">
          Informes - Productividad
        </h2>
        <p className="text-sm text-stone-500 font-light italic">
          Análisis de sesiones, ingresos, tiempos, servicios y estados.
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
        titulo="Cobradas"
        valor={datos.resumen.cobradas}
        descripcion="Sesiones realizadas"
        Icon={CalendarClock}
      />

      <ResumenCard
        titulo="Ingreso real"
        valor={formatearDinero(datos.resumen.ingresoReal)}
        descripcion="Monto cobrado"
        Icon={DollarSign}
      />

      <ResumenCard
        titulo="Promedio"
        valor={formatearDinero(datos.resumen.promedioCobrado)}
        descripcion="Cobrado por sesión"
        Icon={TrendingUp}
      />

      <ResumenCard
        titulo="Duración"
        valor={`${datos.resumen.duracionTotal} min`}
        descripcion="Tiempo total trabajado"
        Icon={Clock}
      />

      <ResumenCard
        titulo="Pendientes"
        valor={datos.resumen.pendientes}
        descripcion="Sesiones sin cobrar"
        Icon={FileText}
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

function GraficoIngresosSesiones({ datos }) {
  return (
    <div className="w-full min-w-0 min-h-[320px]">
      <div className="h-80 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={datos} 
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="#f5f5f4" 
            />

            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 12, fill: '#a8a29e' }} 
              axisLine={false} 
              tickLine={false} 
            />

            <YAxis 
              yAxisId="dinero" 
              tick={{ fontSize: 12, fill: '#a8a29e' }} 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={(v) => formatearDinero(v)} 
            />

            <YAxis 
              yAxisId="sesiones" 
              orientation="right" 
              tick={{ fontSize: 12, fill: '#a8a29e' }} 
              axisLine={false} 
              tickLine={false} 
            />

            <Tooltip 
              formatter={(value, name) => 
                name === 'Ingresos' 
                  ? [formatearDinero(value), name] 
                  : [value, name]
              } 
            />

            <Legend />

            <Bar 
              yAxisId="dinero" 
              dataKey="ingresos" 
              name="Ingresos" 
              fill="#0d9488" 
              radius={[8, 8, 0, 0]} 
            />

            <Line 
              yAxisId="sesiones" 
              type="monotone" 
              dataKey="sesiones" 
              name="Sesiones cobradas" 
              stroke="#3b82f6" 
              strokeWidth={3} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ComparativosMontos({ datos }) {
  const data = [
    { label: 'Real cobrado', valor: datos.resumen.ingresoReal },
    { label: 'Ideal cobradas', valor: datos.resumen.idealCobradas },
    { label: 'Pendiente', valor: datos.resumen.idealPendientes },
    { label: 'Anuladas', valor: datos.resumen.idealAnuladas },
    { label: 'Ausentes', valor: datos.resumen.idealAusentes }
  ]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatearDinero(v)} />
            <Tooltip formatter={(value) => [formatearDinero(value), 'Monto']} />
            <Bar dataKey="valor" name="Monto" fill="#0d9488" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.map((item) => (
          <div key={item.label} className="bg-stone-50 border border-stone-100 rounded-2xl p-4">
            <p className="text-xs font-black uppercase tracking-widest text-stone-400">
              {item.label}
            </p>
            <p className="text-xl font-black text-stone-800 mt-2">
              {formatearDinero(item.valor)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function EstadosSesiones({ datos }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datos}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={110}
              label
            >
              {datos.map((entry) => (
                <Cell key={entry.name} fill={ESTADO_COLORES[entry.name] || '#a8a29e'} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        {datos.map((item) => (
          <div key={item.name} className="bg-stone-50 border border-stone-100 rounded-xl p-4 flex items-center justify-between">
            <p className="font-bold text-stone-700">
              {item.name}
            </p>
            <p className="text-xl font-black text-stone-800">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function RankingsServicios({ topServicios, topCombos }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <RankingCard titulo="Top servicios individuales" items={topServicios} />
      <RankingCard titulo="Top combos" items={topCombos} />
    </div>
  )
}

function RankingCard({ titulo, items }) {
  return (
    <div className="bg-stone-50 rounded-2xl border border-stone-100 p-5">
      <h4 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">
        {titulo}
      </h4>

      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyState mensaje="Sin datos para este período." />
        ) : (
          items.map((item, index) => (
            <RankingRow
              key={item.id}
              index={index}
              titulo={item.nombre}
              subtitulo={`${item.cantidad} sesiones · ${item.minutos} min`}
              valor={formatearDinero(item.ingreso)}
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

      <p className="font-black text-stone-700 shrink-0">
        {valor}
      </p>
    </div>
  )
}

function HorariosProductivos({ porDiaSemana, porFranja }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <MiniBarChart titulo="Productividad por día" data={porDiaSemana} />
      <MiniBarChart titulo="Productividad por franja horaria" data={porFranja} />
    </div>
  )
}

function MiniBarChart({ titulo, data }) {
  return (
    <div className="bg-stone-50 border border-stone-100 rounded-2xl p-5">
      <h4 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">
        {titulo}
      </h4>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="sesiones" name="Sesiones" fill="#0d9488" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function AusenciasAnulaciones({ datos }) {
  const data = [
    {
      label: 'Anuladas',
      cantidad: datos.resumen.anuladas,
      monto: datos.resumen.idealAnuladas
    },
    {
      label: 'Ausentes',
      cantidad: datos.resumen.ausentes,
      monto: datos.resumen.idealAusentes
    }
  ]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatearDinero(v)} />
            <Tooltip formatter={(value, name) => name === 'Monto' ? [formatearDinero(value), name] : [value, name]} />
            <Legend />
            <Bar dataKey="monto" name="Monto estimado no cobrado" fill="#ef4444" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.map((item) => (
          <div key={item.label} className="bg-stone-50 border border-stone-100 rounded-2xl p-4">
            <p className="text-xs font-black uppercase tracking-widest text-stone-400">
              {item.label}
            </p>
            <p className="text-2xl font-black text-stone-800 mt-2">
              {item.cantidad}
            </p>
            <p className="text-sm text-red-500 font-bold mt-1">
              {formatearDinero(item.monto)}
            </p>
          </div>
        ))}
      </div>
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

function procesarProductividad({ sesiones, comboServicios, periodo }) {
  const ahora = new Date()
  const inicioPeriodo = obtenerInicioPeriodo(periodo, ahora)
  const serviciosPorComboId = agruparServiciosPorCombo(comboServicios)

  const sesionesFiltradas = sesiones.filter((sesion) => {
    const fecha = parsearFecha(sesion.fecha_hora)

    if (!fecha) return false
    if (!inicioPeriodo) return true

    return fecha >= inicioPeriodo
  })

  const resumen = crearResumen(sesionesFiltradas)
  const ingresosVsSesiones = crearSeriePeriodo(sesionesFiltradas, periodo)
  const estadosPie = crearEstadosPie(sesionesFiltradas)
  const topServicios = crearTopServicios(sesionesFiltradas, serviciosPorComboId)
  const topCombos = crearTopCombos(sesionesFiltradas)
  const porDiaSemana = crearProductividadPorDia(sesionesFiltradas)
  const porFranja = crearProductividadPorFranja(sesionesFiltradas)

  return {
    resumen,
    ingresosVsSesiones,
    estadosPie,
    topServicios,
    topCombos,
    porDiaSemana,
    porFranja
  }
}

function crearResumen(sesiones) {
  const cobradas = sesiones.filter((s) => s.estado === 'Cobrada')
  const pendientes = sesiones.filter((s) => s.estado === 'Pendiente')
  const anuladas = sesiones.filter((s) => s.estado === 'Anulada')
  const ausentes = sesiones.filter((s) => s.estado === 'Ausente')

  const ingresoReal = sumar(cobradas, 'monto_cobrado')
  const idealCobradas = sumar(cobradas, 'monto_total')
  const idealPendientes = sumar(pendientes, 'monto_total')
  const idealAnuladas = sumar(anuladas, 'monto_total')
  const idealAusentes = sumar(ausentes, 'monto_total')
  const duracionTotal = sumar(cobradas, 'duracion_total')

  return {
    total: sesiones.length,
    cobradas: cobradas.length,
    pendientes: pendientes.length,
    anuladas: anuladas.length,
    ausentes: ausentes.length,
    ingresoReal,
    idealCobradas,
    idealPendientes,
    idealAnuladas,
    idealAusentes,
    promedioCobrado: cobradas.length > 0 ? ingresoReal / cobradas.length : 0,
    duracionTotal,
    promedioDuracion: cobradas.length > 0 ? duracionTotal / cobradas.length : 0
  }
}

function crearSeriePeriodo(sesiones, periodo) {
  const mapa = {}

  sesiones
    .filter((s) => s.estado === 'Cobrada')
    .forEach((sesion) => {
      const fecha = parsearFecha(sesion.fecha_hora)
      if (!fecha) return

      const label = obtenerLabelFecha(fecha, periodo)

      if (!mapa[label]) {
        mapa[label] = {
          label,
          ingresos: 0,
          sesiones: 0
        }
      }

      mapa[label].ingresos += Number(sesion.monto_cobrado || 0)
      mapa[label].sesiones += 1
    })

  return Object.values(mapa)
}

function crearEstadosPie(sesiones) {
  const estados = ['Cobrada', 'Pendiente', 'Anulada', 'Ausente']

  return estados.map((estado) => ({
    name: estado,
    value: sesiones.filter((s) => s.estado === estado).length
  }))
}

function crearTopServicios(sesiones, serviciosPorComboId) {
  const mapa = {}

  sesiones
    .filter((s) => s.estado === 'Cobrada')
    .forEach((sesion) => {
      const detalles = sesion.sesion_detalles || []

      detalles.forEach((detalle) => {
        if (detalle.servicio_id) {
          const id = detalle.servicio_id
          const nombre = detalle.servicios?.nombre || 'Servicio sin nombre'
          const duracion = Number(detalle.servicios?.duracion_minutos || 0)

          if (!mapa[id]) {
            mapa[id] = {
              id,
              nombre,
              cantidad: 0,
              ingreso: 0,
              minutos: 0
            }
          }

          mapa[id].cantidad += 1
          mapa[id].ingreso += Number(detalle.precio_cobrado || 0)
          mapa[id].minutos += duracion
        }

        if (detalle.combo_id) {
          const serviciosDelCombo = serviciosPorComboId[detalle.combo_id] || []

          serviciosDelCombo.forEach((servicio) => {
            const id = servicio.id
            const nombre = servicio.nombre || 'Servicio sin nombre'
            const duracion = Number(servicio.duracion_minutos || 0)

            if (!mapa[id]) {
              mapa[id] = {
                id,
                nombre,
                cantidad: 0,
                ingreso: 0,
                minutos: 0
              }
            }

            mapa[id].cantidad += 1
            mapa[id].ingreso += Number(detalle.precio_cobrado || 0)
            mapa[id].minutos += duracion
          })
        }
      })
    })

  return Object.values(mapa)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)
}

function crearTopCombos(sesiones) {
  const mapa = {}

  sesiones
    .filter((s) => s.estado === 'Cobrada')
    .forEach((sesion) => {
      const detalles = sesion.sesion_detalles || []

      detalles.forEach((detalle) => {
        if (!detalle.combo_id) return

        const id = detalle.combo_id
        const nombre = detalle.combos?.nombre || 'Combo sin nombre'
        const duracion = Number(detalle.combos?.duracion_minutos || 0)

        if (!mapa[id]) {
          mapa[id] = {
            id,
            nombre,
            cantidad: 0,
            ingreso: 0,
            minutos: 0
          }
        }

        mapa[id].cantidad += 1
        mapa[id].ingreso += Number(detalle.precio_cobrado || 0)
        mapa[id].minutos += duracion
      })
    })

  return Object.values(mapa)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)
}

function crearProductividadPorDia(sesiones) {
  const dias = [
    { label: 'Dom', sesiones: 0 },
    { label: 'Lun', sesiones: 0 },
    { label: 'Mar', sesiones: 0 },
    { label: 'Mié', sesiones: 0 },
    { label: 'Jue', sesiones: 0 },
    { label: 'Vie', sesiones: 0 },
    { label: 'Sáb', sesiones: 0 }
  ]

  sesiones
    .filter((s) => s.estado === 'Cobrada')
    .forEach((sesion) => {
      const fecha = parsearFecha(sesion.fecha_hora)
      if (!fecha) return

      dias[fecha.getDay()].sesiones += 1
    })

  return dias
}

function crearProductividadPorFranja(sesiones) {
  const franjas = [
    { label: 'Mañana', sesiones: 0 },
    { label: 'Tarde', sesiones: 0 },
    { label: 'Noche', sesiones: 0 }
  ]

  sesiones
    .filter((s) => s.estado === 'Cobrada')
    .forEach((sesion) => {
      const fecha = parsearFecha(sesion.fecha_hora)
      if (!fecha) return

      const hora = fecha.getHours()

      if (hora < 12) {
        franjas[0].sesiones += 1
      } else if (hora < 19) {
        franjas[1].sesiones += 1
      } else {
        franjas[2].sesiones += 1
      }
    })

  return franjas
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
      duracion_minutos: Number(item.servicios?.duracion_minutos || 0)
    })
  })

  return mapa
}

function obtenerInicioPeriodo(periodo, ahora) {
  const inicio = new Date(ahora)

  if (periodo === 'hoy') {
    inicio.setHours(0, 0, 0, 0)
    return inicio
  }

  if (periodo === 'semana') {
    const dia = inicio.getDay()
    const diferencia = dia === 0 ? -6 : 1 - dia
    inicio.setDate(inicio.getDate() + diferencia)
    inicio.setHours(0, 0, 0, 0)
    return inicio
  }

  if (periodo === 'mes') {
    return new Date(inicio.getFullYear(), inicio.getMonth(), 1)
  }

  if (periodo === 'anio') {
    return new Date(inicio.getFullYear(), 0, 1)
  }

  return null
}

function obtenerLabelFecha(fecha, periodo) {
  if (periodo === 'hoy') {
    return `${String(fecha.getHours()).padStart(2, '0')}:00`
  }

  if (periodo === 'semana') {
    return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][fecha.getDay()]
  }

  if (periodo === 'anio') {
    return ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][fecha.getMonth()]
  }

  if (periodo === 'todo') {
    return `${fecha.getMonth() + 1}/${fecha.getFullYear()}`
  }

  return String(fecha.getDate()).padStart(2, '0')
}

function obtenerLabelPeriodo(periodo) {
  const item = PERIODOS.find((p) => p.value === periodo)

  return item?.label || periodo
}

function parsearFecha(valor) {
  if (!valor) return null

  const fecha = new Date(valor)

  if (Number.isNaN(fecha.getTime())) return null

  return fecha
}

function sumar(items, campo) {
  return items.reduce((total, item) => {
    return total + Number(item[campo] || 0)
  }, 0)
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