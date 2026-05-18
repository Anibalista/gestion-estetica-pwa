// src/components/finanzas/ReportesComparativos.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Download,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet
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
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'

const PERIODOS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'anio', label: 'Año' },
  { value: 'todo', label: 'Todo' },
  { value: 'personalizado', label: 'Personalizado' }
]

const COMPARACIONES = [
  { value: 'periodo-anterior', label: 'Período anterior' },
  { value: 'mes-anterior', label: 'Mes anterior' },
  { value: 'anio-anterior', label: 'Año anterior' }
]

const ROLES_EMPRESA = ['Dueño', 'Administrador', 'Recepcionista']

export function ReportesComparativos({
  session,
  empresaActiva,
  rolEmpresa
}) {
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')

  const [periodo, setPeriodo] = useState('mes')
  const [comparacion, setComparacion] = useState('periodo-anterior')
  const [fechaBase, setFechaBase] = useState(obtenerFechaInput(new Date()))
  const [fechaDesde, setFechaDesde] = useState(obtenerFechaInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [fechaHasta, setFechaHasta] = useState(obtenerFechaInput(new Date()))

  const [movimientosActuales, setMovimientosActuales] = useState([])
  const [movimientosComparados, setMovimientosComparados] = useState([])

  const puedeVerEmpresaCompleta = ROLES_EMPRESA.includes(rolEmpresa)

  useEffect(() => {
    if (session?.user?.id && empresaActiva?.id) {
      cargarReportes()
    }
  }, [
    session?.user?.id,
    empresaActiva?.id,
    rolEmpresa,
    periodo,
    comparacion,
    fechaBase,
    fechaDesde,
    fechaHasta
  ])

  const rangos = useMemo(() => {
    const actual = obtenerRangoActual({
      periodo,
      fechaBase,
      fechaDesde,
      fechaHasta
    })

    const comparado = obtenerRangoComparado(actual, comparacion)

    return {
      actual,
      comparado
    }
  }, [periodo, fechaBase, fechaDesde, fechaHasta, comparacion])

  const cargarReportes = async () => {
    setLoading(true)
    setErrorCarga('')

    try {
      const [actualResponse, comparadoResponse] = await Promise.all([
        cargarMovimientosRango(rangos.actual),
        cargarMovimientosRango(rangos.comparado)
      ])

      if (actualResponse.error) throw actualResponse.error
      if (comparadoResponse.error) throw comparadoResponse.error

      setMovimientosActuales(actualResponse.data || [])
      setMovimientosComparados(comparadoResponse.data || [])
    } catch (error) {
      console.error('Error cargando reportes comparativos:', error)
      setErrorCarga(error.message || 'No se pudieron cargar los reportes comparativos.')
      setMovimientosActuales([])
      setMovimientosComparados([])
    } finally {
      setLoading(false)
    }
  }

  const cargarMovimientosRango = async (rango) => {
    let query = supabase
      .from('caja_movimientos')
      .select(`
        id,
        empresa_id,
        profesional_id,
        tipo_movimiento,
        medio_pago,
        tipo_caja,
        monto,
        descripcion,
        categoria,
        observaciones,
        fecha_operativa,
        created_at,
        profesional:profesionales!caja_movimientos_profesional_id_fkey (
          id,
          nombre_negocio
        ),
        ventas (
          id,
          numero_venta
        ),
        sesiones (
          id,
          clientes (
            id,
            nombre
          )
        )
      `)
      .eq('empresa_id', empresaActiva.id)
      .order('fecha_operativa', { ascending: true })
      .order('created_at', { ascending: true })

    if (!puedeVerEmpresaCompleta) {
      query = query.eq('profesional_id', session.user.id)
    }

    if (rango.desde && rango.hasta) {
      query = query
        .gte('fecha_operativa', rango.desde)
        .lte('fecha_operativa', rango.hasta)
    }

    return query
  }

  const datosActuales = useMemo(() => {
    return procesarMovimientos(movimientosActuales)
  }, [movimientosActuales])

  const datosComparados = useMemo(() => {
    return procesarMovimientos(movimientosComparados)
  }, [movimientosComparados])

  const comparativas = useMemo(() => {
    return {
      ingresos: calcularComparativa(datosActuales.ingresos, datosComparados.ingresos),
      egresos: calcularComparativa(datosActuales.egresos, datosComparados.egresos),
      neto: calcularComparativa(datosActuales.neto, datosComparados.neto),
      sesiones: calcularComparativa(datosActuales.cantidadSesiones, datosComparados.cantidadSesiones),
      ventas: calcularComparativa(datosActuales.cantidadVentas, datosComparados.cantidadVentas),
      ticketPromedio: calcularComparativa(datosActuales.ticketPromedio, datosComparados.ticketPromedio)
    }
  }, [datosActuales, datosComparados])

  const serieComparativa = useMemo(() => {
    return unirSeries(datosActuales.serieDiaria, datosComparados.serieDiaria)
  }, [datosActuales, datosComparados])

  const exportarPDF = () => {
    const doc = new jsPDF()
    const fecha = new Date().toLocaleDateString('es-AR')

    doc.setFontSize(16)
    doc.text('Reporte Comparativo Financiero', 14, 18)

    doc.setFontSize(10)
    doc.text(`Empresa: ${empresaActiva?.nombre || 'Sin empresa'}`, 14, 26)
    doc.text(`Generado: ${fecha}`, 14, 32)
    doc.text(`Período actual: ${formatearRango(rangos.actual)}`, 14, 38)
    doc.text(`Período comparado: ${formatearRango(rangos.comparado)}`, 14, 44)

    autoTable(doc, {
      startY: 52,
      head: [['Métrica', 'Actual', 'Comparado', 'Diferencia', 'Variación']],
      body: [
        [
          'Ingresos',
          formatearDinero(datosActuales.ingresos),
          formatearDinero(datosComparados.ingresos),
          formatearDinero(comparativas.ingresos.diferencia),
          `${formatearNumero(comparativas.ingresos.porcentaje)}%`
        ],
        [
          'Egresos',
          formatearDinero(datosActuales.egresos),
          formatearDinero(datosComparados.egresos),
          formatearDinero(comparativas.egresos.diferencia),
          `${formatearNumero(comparativas.egresos.porcentaje)}%`
        ],
        [
          'Neto',
          formatearDinero(datosActuales.neto),
          formatearDinero(datosComparados.neto),
          formatearDinero(comparativas.neto.diferencia),
          `${formatearNumero(comparativas.neto.porcentaje)}%`
        ],
        [
          'Sesiones cobradas',
          datosActuales.cantidadSesiones,
          datosComparados.cantidadSesiones,
          comparativas.sesiones.diferencia,
          `${formatearNumero(comparativas.sesiones.porcentaje)}%`
        ],
        [
          'Ventas',
          datosActuales.cantidadVentas,
          datosComparados.cantidadVentas,
          comparativas.ventas.diferencia,
          `${formatearNumero(comparativas.ventas.porcentaje)}%`
        ],
        [
          'Ticket promedio',
          formatearDinero(datosActuales.ticketPromedio),
          formatearDinero(datosComparados.ticketPromedio),
          formatearDinero(comparativas.ticketPromedio.diferencia),
          `${formatearNumero(comparativas.ticketPromedio.porcentaje)}%`
        ]
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Origen', 'Monto actual', 'Monto comparado']],
      body: [
        ['Sesiones', formatearDinero(datosActuales.ingresosSesiones), formatearDinero(datosComparados.ingresosSesiones)],
        ['Ventas', formatearDinero(datosActuales.ingresosVentas), formatearDinero(datosComparados.ingresosVentas)],
        ['Ajustes', formatearDinero(datosActuales.ajustes), formatearDinero(datosComparados.ajustes)],
        ['Anulaciones', formatearDinero(datosActuales.anulaciones), formatearDinero(datosComparados.anulaciones)]
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Profesional', 'Ingresos', 'Movimientos']],
      body: datosActuales.rankingProfesionales.slice(0, 10).map((item) => [
        item.nombre,
        formatearDinero(item.ingresos),
        item.cantidad
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    doc.save(`reporte-comparativo-${obtenerFechaInput(new Date())}.pdf`)
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
          No se pudieron cargar los reportes
        </h2>

        <p className="text-red-500 mb-6">
          {errorCarga}
        </p>

        <button
          type="button"
          onClick={cargarReportes}
          className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col gap-6 overflow-y-auto pb-10">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl font-light text-stone-800">
            Reportes Comparativos
          </h2>

          <p className="text-sm text-stone-500 font-light italic">
            Comparación financiera entre períodos usando movimientos reales de caja.
          </p>

          <p className="text-xs text-stone-400 mt-1">
            Empresa activa:{' '}
            <span className="font-bold text-teal-600">
              {empresaActiva?.nombre || 'Sin empresa'}
            </span>
            {' · '}
            {puedeVerEmpresaCompleta
              ? 'Mostrando datos de la empresa'
              : 'Mostrando solo tus movimientos'}
          </p>
        </div>

        <button
          type="button"
          onClick={exportarPDF}
          className="px-4 py-3 rounded-2xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>

      <PanelFiltros
        periodo={periodo}
        setPeriodo={setPeriodo}
        comparacion={comparacion}
        setComparacion={setComparacion}
        fechaBase={fechaBase}
        setFechaBase={setFechaBase}
        fechaDesde={fechaDesde}
        setFechaDesde={setFechaDesde}
        fechaHasta={fechaHasta}
        setFechaHasta={setFechaHasta}
      />

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-stone-600">
          <div>
            <span className="font-black text-stone-400 uppercase tracking-widest text-[10px]">
              Período actual
            </span>
            <p className="font-bold text-stone-800 mt-1">
              {formatearRango(rangos.actual)}
            </p>
          </div>

          <div>
            <span className="font-black text-stone-400 uppercase tracking-widest text-[10px]">
              Período comparado
            </span>
            <p className="font-bold text-stone-800 mt-1">
              {formatearRango(rangos.comparado)}
            </p>
          </div>
        </div>
      </div>

      <ResumenComparativo
        datosActuales={datosActuales}
        datosComparados={datosComparados}
        comparativas={comparativas}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GraficoIngresosEgresos
          datosActuales={datosActuales}
          datosComparados={datosComparados}
        />

        <GraficoEvolucion
          serie={serieComparativa}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DistribucionMedios datos={datosActuales.distribucionMedios} />

        <RankingProfesionales
          ranking={datosActuales.rankingProfesionales}
          puedeVerEmpresaCompleta={puedeVerEmpresaCompleta}
        />
      </div>

      <DetalleOrigenes
        datosActuales={datosActuales}
        datosComparados={datosComparados}
      />
    </div>
  )
}

function PanelFiltros({
  periodo,
  setPeriodo,
  comparacion,
  setComparacion,
  fechaBase,
  setFechaBase,
  fechaDesde,
  setFechaDesde,
  fechaHasta,
  setFechaHasta
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <Campo label="Período actual">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm bg-white text-stone-600 border border-stone-200 outline-none focus:ring-2 focus:ring-teal-500"
          >
            {PERIODOS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Comparar contra">
          <select
            value={comparacion}
            onChange={(e) => setComparacion(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm bg-white text-stone-600 border border-stone-200 outline-none focus:ring-2 focus:ring-teal-500"
          >
            {COMPARACIONES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Fecha base">
          <input
            type="date"
            value={fechaBase}
            onChange={(e) => setFechaBase(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm bg-white text-stone-600 border border-stone-200 outline-none focus:ring-2 focus:ring-teal-500"
          />
        </Campo>

        {periodo === 'personalizado' && (
          <>
            <Campo label="Desde">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm bg-white text-stone-600 border border-stone-200 outline-none focus:ring-2 focus:ring-teal-500"
              />
            </Campo>

            <Campo label="Hasta">
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm bg-white text-stone-600 border border-stone-200 outline-none focus:ring-2 focus:ring-teal-500"
              />
            </Campo>
          </>
        )}
      </div>
    </div>
  )
}

function ResumenComparativo({ datosActuales, datosComparados, comparativas }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
      <CardComparativa
        titulo="Ingresos"
        actual={datosActuales.ingresos}
        comparado={datosComparados.ingresos}
        comparativa={comparativas.ingresos}
        formato="dinero"
        positivoMayor
        Icon={TrendingUp}
      />

      <CardComparativa
        titulo="Egresos"
        actual={datosActuales.egresos}
        comparado={datosComparados.egresos}
        comparativa={comparativas.egresos}
        formato="dinero"
        positivoMayor={false}
        Icon={TrendingDown}
      />

      <CardComparativa
        titulo="Neto"
        actual={datosActuales.neto}
        comparado={datosComparados.neto}
        comparativa={comparativas.neto}
        formato="dinero"
        positivoMayor
        Icon={Wallet}
      />

      <CardComparativa
        titulo="Sesiones"
        actual={datosActuales.cantidadSesiones}
        comparado={datosComparados.cantidadSesiones}
        comparativa={comparativas.sesiones}
        formato="numero"
        positivoMayor
        Icon={CalendarDays}
      />

      <CardComparativa
        titulo="Ventas"
        actual={datosActuales.cantidadVentas}
        comparado={datosComparados.cantidadVentas}
        comparativa={comparativas.ventas}
        formato="numero"
        positivoMayor
        Icon={BarChart3}
      />

      <CardComparativa
        titulo="Ticket prom."
        actual={datosActuales.ticketPromedio}
        comparado={datosComparados.ticketPromedio}
        comparativa={comparativas.ticketPromedio}
        formato="dinero"
        positivoMayor
        Icon={LineChartIcon}
      />
    </div>
  )
}

function CardComparativa({
  titulo,
  actual,
  comparado,
  comparativa,
  formato,
  positivoMayor = true,
  Icon
}) {
  const sube = comparativa.diferencia > 0
  const baja = comparativa.diferencia < 0
  const esBueno = positivoMayor ? sube : baja
  const esMalo = positivoMayor ? baja : sube

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
            {titulo}
          </p>

          <p className="text-2xl font-black text-stone-800 truncate">
            {formato === 'dinero' ? formatearDinero(actual) : formatearNumero(actual)}
          </p>

          <p className="text-xs text-stone-400 mt-1">
            Antes: {formato === 'dinero' ? formatearDinero(comparado) : formatearNumero(comparado)}
          </p>
        </div>

        <div className="text-teal-600 bg-teal-50 rounded-xl p-2 shadow-sm shrink-0">
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className={`mt-4 flex items-center gap-2 text-xs font-black ${
        esBueno
          ? 'text-teal-600'
          : esMalo
            ? 'text-red-600'
            : 'text-stone-400'
      }`}>
        {sube ? (
          <ArrowUpRight className="w-4 h-4" />
        ) : baja ? (
          <ArrowDownRight className="w-4 h-4" />
        ) : (
          <span className="w-4 h-4" />
        )}

        <span>
          {formatearNumero(comparativa.porcentaje)}%
        </span>
      </div>
    </div>
  )
}

function GraficoIngresosEgresos({ datosActuales, datosComparados }) {
  const data = [
    {
      nombre: 'Actual',
      ingresos: datosActuales.ingresos,
      egresos: datosActuales.egresos,
      neto: datosActuales.neto
    },
    {
      nombre: 'Comparado',
      ingresos: datosComparados.ingresos,
      egresos: datosComparados.egresos,
      neto: datosComparados.neto
    }
  ]

  return (
    <PanelGrafico
      titulo="Ingresos vs egresos"
      descripcion="Comparación directa entre período actual y período comparado."
      Icon={BarChart3}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
          <XAxis dataKey="nombre" tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(value) => formatearDinero(value)} />
          <Legend />
          <Bar dataKey="ingresos" name="Ingresos" fill="#0d9488" radius={[8, 8, 0, 0]} />
          <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[8, 8, 0, 0]} />
          <Bar dataKey="neto" name="Neto" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </PanelGrafico>
  )
}

function GraficoEvolucion({ serie }) {
  return (
    <PanelGrafico
      titulo="Evolución diaria"
      descripcion="Ingresos, egresos y neto del período actual."
      Icon={LineChartIcon}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={serie} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(value) => formatearDinero(value)} />
          <Legend />
          <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#0d9488" strokeWidth={3} />
          <Line type="monotone" dataKey="egresos" name="Egresos" stroke="#ef4444" strokeWidth={3} />
          <Line type="monotone" dataKey="neto" name="Neto" stroke="#3b82f6" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </PanelGrafico>
  )
}

function DistribucionMedios({ datos }) {
  return (
    <PanelGrafico
      titulo="Distribución por medio de pago"
      descripcion="Ingresos positivos agrupados por medio de pago."
      Icon={PieChartIcon}
    >
      {datos.length === 0 ? (
        <EmptyState mensaje="No hay ingresos para graficar." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datos}
              dataKey="monto"
              nameKey="medio"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={4}
            >
              {datos.map((entry, index) => (
                <Cell
                  key={`cell-${entry.medio}`}
                  fill={['#0d9488', '#3b82f6', '#f59e0b', '#ef4444'][index % 4]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatearDinero(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </PanelGrafico>
  )
}

function RankingProfesionales({ ranking, puedeVerEmpresaCompleta }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
          <TrendingUp className="w-5 h-5" />
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-stone-500">
            Ranking por profesional
          </h3>

          <p className="text-xs text-stone-400 mt-1">
            {puedeVerEmpresaCompleta
              ? 'Ingresos positivos por profesional.'
              : 'Tu rendimiento en el período actual.'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {ranking.length === 0 ? (
          <EmptyState mensaje="No hay ingresos por profesional." />
        ) : (
          ranking.slice(0, 8).map((item, index) => (
            <div
              key={item.id || item.nombre}
              className="bg-stone-50 rounded-xl border border-stone-100 p-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-black shrink-0">
                  {index + 1}
                </span>

                <div className="min-w-0">
                  <p className="font-bold text-stone-800 truncate" title={item.nombre}>
                    {item.nombre}
                  </p>

                  <p className="text-xs text-stone-500">
                    {item.cantidad} movimiento(s)
                  </p>
                </div>
              </div>

              <p className="font-black text-stone-800 shrink-0">
                {formatearDinero(item.ingresos)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function DetalleOrigenes({ datosActuales, datosComparados }) {
  const filas = [
    {
      nombre: 'Sesiones',
      actual: datosActuales.ingresosSesiones,
      comparado: datosComparados.ingresosSesiones
    },
    {
      nombre: 'Ventas',
      actual: datosActuales.ingresosVentas,
      comparado: datosComparados.ingresosVentas
    },
    {
      nombre: 'Egresos',
      actual: datosActuales.egresos,
      comparado: datosComparados.egresos
    },
    {
      nombre: 'Anulaciones',
      actual: datosActuales.anulaciones,
      comparado: datosComparados.anulaciones
    },
    {
      nombre: 'Ajustes',
      actual: datosActuales.ajustes,
      comparado: datosComparados.ajustes
    }
  ]

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-stone-100">
        <h3 className="text-xs font-black uppercase tracking-widest text-stone-500">
          Detalle por origen
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-stone-600">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-bold">
            <tr>
              <th className="px-6 py-4">Origen</th>
              <th className="px-6 py-4 text-right">Actual</th>
              <th className="px-6 py-4 text-right">Comparado</th>
              <th className="px-6 py-4 text-right">Diferencia</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100">
            {filas.map((fila) => {
              const diferencia = fila.actual - fila.comparado

              return (
                <tr key={fila.nombre} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-stone-800">
                    {fila.nombre}
                  </td>

                  <td className="px-6 py-4 text-right">
                    {formatearDinero(fila.actual)}
                  </td>

                  <td className="px-6 py-4 text-right">
                    {formatearDinero(fila.comparado)}
                  </td>

                  <td className={`px-6 py-4 text-right font-black ${diferencia < 0 ? 'text-red-600' : 'text-teal-700'}`}>
                    {formatearDinero(diferencia)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PanelGrafico({ titulo, descripcion, Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
          <Icon className="w-5 h-5" />
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-stone-500">
            {titulo}
          </h3>

          <p className="text-xs text-stone-400 mt-1">
            {descripcion}
          </p>
        </div>
      </div>

      <div className="h-80 w-full min-w-0">
        {children}
      </div>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
        {label}
      </span>
      {children}
    </label>
  )
}

function EmptyState({ mensaje }) {
  return (
    <div className="h-full min-h-[220px] flex items-center justify-center text-stone-400 border border-dashed border-stone-200 rounded-xl text-sm">
      {mensaje}
    </div>
  )
}

function procesarMovimientos(movimientos) {
  const acumulado = {
    ingresos: 0,
    egresos: 0,
    neto: 0,
    ajustes: 0,
    anulaciones: 0,
    ingresosSesiones: 0,
    ingresosVentas: 0,
    cantidadSesiones: 0,
    cantidadVentas: 0,
    ticketPromedio: 0,
    distribucionMedios: [],
    rankingProfesionales: [],
    serieDiaria: []
  }

  const medios = {}
  const profesionales = {}
  const dias = {}
  let cantidadOperacionesIngreso = 0

  movimientos.forEach((item) => {
    const monto = Number(item.monto || 0)
    const tipo = item.tipo_movimiento
    const categoria = item.categoria || ''
    const fecha = item.fecha_operativa || obtenerFechaInput(new Date())
    const medio = item.medio_pago || 'Sin medio'

    if (!dias[fecha]) {
      dias[fecha] = {
        fecha,
        label: formatearFechaCorta(fecha),
        ingresos: 0,
        egresos: 0,
        neto: 0
      }
    }

    acumulado.neto += monto
    dias[fecha].neto += monto

    if (tipo === 'Ingreso' && monto > 0) {
      acumulado.ingresos += monto
      dias[fecha].ingresos += monto
      cantidadOperacionesIngreso += 1

      if (!medios[medio]) {
        medios[medio] = {
          medio,
          monto: 0
        }
      }

      medios[medio].monto += monto

      const profesionalId = item.profesional_id || 'sin-id'
      const nombreProfesional = item.profesional?.nombre_negocio || 'Sin profesional'

      if (!profesionales[profesionalId]) {
        profesionales[profesionalId] = {
          id: profesionalId,
          nombre: nombreProfesional,
          ingresos: 0,
          cantidad: 0
        }
      }

      profesionales[profesionalId].ingresos += monto
      profesionales[profesionalId].cantidad += 1

      if (categoria === 'Sesion') {
        acumulado.ingresosSesiones += monto
        acumulado.cantidadSesiones += 1
      }

      if (categoria === 'Venta') {
        acumulado.ingresosVentas += monto
        acumulado.cantidadVentas += 1
      }
    }

    if ((tipo === 'Egreso' || tipo === 'Anulacion') && monto < 0) {
      acumulado.egresos += Math.abs(monto)
      dias[fecha].egresos += Math.abs(monto)

      if (tipo === 'Anulacion') {
        acumulado.anulaciones += Math.abs(monto)
      }
    }

    if (tipo === 'Ajuste') {
      acumulado.ajustes += monto

      if (monto >= 0) {
        acumulado.ingresos += monto
        dias[fecha].ingresos += monto
      } else {
        acumulado.egresos += Math.abs(monto)
        dias[fecha].egresos += Math.abs(monto)
      }
    }
  })

  acumulado.ticketPromedio = cantidadOperacionesIngreso > 0
    ? acumulado.ingresos / cantidadOperacionesIngreso
    : 0

  acumulado.distribucionMedios = Object.values(medios)
    .sort((a, b) => b.monto - a.monto)

  acumulado.rankingProfesionales = Object.values(profesionales)
    .sort((a, b) => b.ingresos - a.ingresos)

  acumulado.serieDiaria = Object.values(dias)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  return acumulado
}

function obtenerRangoActual({ periodo, fechaBase, fechaDesde, fechaHasta }) {
  if (periodo === 'todo') {
    return {
      desde: null,
      hasta: null,
      label: 'Todo'
    }
  }

  if (periodo === 'personalizado') {
    return {
      desde: fechaDesde,
      hasta: fechaHasta,
      label: 'Personalizado'
    }
  }

  const fecha = crearFechaLocal(fechaBase)

  if (periodo === 'hoy') {
    return {
      desde: obtenerFechaInput(fecha),
      hasta: obtenerFechaInput(fecha),
      label: 'Hoy'
    }
  }

  if (periodo === 'semana') {
    const inicio = new Date(fecha)
    const dia = inicio.getDay()
    const diferencia = dia === 0 ? -6 : 1 - dia

    inicio.setDate(inicio.getDate() + diferencia)

    const fin = new Date(inicio)
    fin.setDate(inicio.getDate() + 6)

    return {
      desde: obtenerFechaInput(inicio),
      hasta: obtenerFechaInput(fin),
      label: 'Semana'
    }
  }

  if (periodo === 'mes') {
    const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
    const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)

    return {
      desde: obtenerFechaInput(inicio),
      hasta: obtenerFechaInput(fin),
      label: 'Mes'
    }
  }

  if (periodo === 'anio') {
    const inicio = new Date(fecha.getFullYear(), 0, 1)
    const fin = new Date(fecha.getFullYear(), 11, 31)

    return {
      desde: obtenerFechaInput(inicio),
      hasta: obtenerFechaInput(fin),
      label: 'Año'
    }
  }

  return {
    desde: null,
    hasta: null,
    label: 'Todo'
  }
}

function obtenerRangoComparado(rangoActual, comparacion) {
  if (!rangoActual.desde || !rangoActual.hasta) {
    return {
      desde: null,
      hasta: null,
      label: 'Todo'
    }
  }

  const desde = crearFechaLocal(rangoActual.desde)
  const hasta = crearFechaLocal(rangoActual.hasta)

  if (comparacion === 'mes-anterior') {
    const desdeComparado = new Date(desde)
    const hastaComparado = new Date(hasta)

    desdeComparado.setMonth(desdeComparado.getMonth() - 1)
    hastaComparado.setMonth(hastaComparado.getMonth() - 1)

    return {
      desde: obtenerFechaInput(desdeComparado),
      hasta: obtenerFechaInput(hastaComparado),
      label: 'Mes anterior'
    }
  }

  if (comparacion === 'anio-anterior') {
    const desdeComparado = new Date(desde)
    const hastaComparado = new Date(hasta)

    desdeComparado.setFullYear(desdeComparado.getFullYear() - 1)
    hastaComparado.setFullYear(hastaComparado.getFullYear() - 1)

    return {
      desde: obtenerFechaInput(desdeComparado),
      hasta: obtenerFechaInput(hastaComparado),
      label: 'Año anterior'
    }
  }

  const dias = Math.max(1, Math.round((hasta - desde) / 86400000) + 1)

  const hastaComparado = new Date(desde)
  hastaComparado.setDate(hastaComparado.getDate() - 1)

  const desdeComparado = new Date(hastaComparado)
  desdeComparado.setDate(desdeComparado.getDate() - dias + 1)

  return {
    desde: obtenerFechaInput(desdeComparado),
    hasta: obtenerFechaInput(hastaComparado),
    label: 'Período anterior'
  }
}

function unirSeries(serieActual) {
  return serieActual.map((item) => ({
    label: item.label,
    ingresos: item.ingresos,
    egresos: item.egresos,
    neto: item.neto
  }))
}

function calcularComparativa(actual, comparado) {
  const diferencia = Number(actual || 0) - Number(comparado || 0)

  if (!comparado) {
    return {
      diferencia,
      porcentaje: actual ? 100 : 0
    }
  }

  return {
    diferencia,
    porcentaje: (diferencia / Math.abs(comparado)) * 100
  }
}

function crearFechaLocal(valor) {
  if (!valor) return new Date()

  const [anio, mes, dia] = valor.split('-').map(Number)

  return new Date(anio, mes - 1, dia)
}

function obtenerFechaInput(fecha) {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

function formatearFechaCorta(fecha) {
  if (!fecha) return ''

  const [anio, mes, dia] = fecha.split('-')

  return `${dia}/${mes}`
}

function formatearRango(rango) {
  if (!rango.desde || !rango.hasta) return 'Todo el historial'

  if (rango.desde === rango.hasta) {
    return formatearFecha(rango.desde)
  }

  return `${formatearFecha(rango.desde)} al ${formatearFecha(rango.hasta)}`
}

function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha'

  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR')
}

function formatearDinero(valor) {
  const numero = Number(valor || 0)

  return `$${numero.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

function formatearNumero(valor) {
  return Number(valor || 0).toLocaleString('es-AR', {
    maximumFractionDigits: 2
  })
}