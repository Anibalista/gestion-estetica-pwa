// src/components/finanzas/InformesEstadisticos.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  AlertTriangle,
  Activity,
  BarChart3,
  Brain,
  CalendarDays,
  Download,
  LineChart as LineChartIcon,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

const ROLES_EMPRESA = ['Dueño', 'Administrador', 'Recepcionista']

const HORIZONTES = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensual', label: 'Mensual' }
]

const HISTORIALES = [
  { value: 30, label: '30 días' },
  { value: 60, label: '60 días' },
  { value: 90, label: '90 días' },
  { value: 180, label: '180 días' },
  { value: 365, label: '365 días' }
]

const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado'
]

export function InformesEstadisticos({
  session,
  empresaActiva,
  rolEmpresa
}) {
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [movimientos, setMovimientos] = useState([])

  const [horizonte, setHorizonte] = useState('semanal')
  const [diasHistorial, setDiasHistorial] = useState(90)
  const [fechaBase, setFechaBase] = useState(obtenerFechaInput(new Date()))

  const puedeVerEmpresaCompleta = ROLES_EMPRESA.includes(rolEmpresa)

  useEffect(() => {
    if (session?.user?.id && empresaActiva?.id) {
      cargarDatos()
    }
  }, [
    session?.user?.id,
    empresaActiva?.id,
    rolEmpresa,
    diasHistorial,
    fechaBase
  ])

  const cargarDatos = async () => {
    setLoading(true)
    setErrorCarga('')

    try {
      const rango = obtenerRangoHistorial(fechaBase, diasHistorial)

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
          fecha_operativa,
          created_at,
          profesional:profesionales!caja_movimientos_profesional_id_fkey (
            id,
            nombre_negocio
          )
        `)
        .eq('empresa_id', empresaActiva.id)
        .gte('fecha_operativa', rango.desde)
        .lte('fecha_operativa', rango.hasta)
        .order('fecha_operativa', { ascending: true })
        .order('created_at', { ascending: true })

      if (!puedeVerEmpresaCompleta) {
        query = query.eq('profesional_id', session.user.id)
      }

      const { data, error } = await query

      if (error) throw error

      setMovimientos(data || [])
    } catch (error) {
      console.error('Error cargando informes estadísticos:', error)
      setErrorCarga(error.message || 'No se pudieron cargar los informes estadísticos.')
      setMovimientos([])
    } finally {
      setLoading(false)
    }
  }

  const estadisticas = useMemo(() => {
    return procesarEstadisticas({
      movimientos,
      horizonte,
      fechaBase,
      diasHistorial
    })
  }, [movimientos, horizonte, fechaBase, diasHistorial])

  const exportarPDF = () => {
    const doc = new jsPDF()
    const fecha = new Date().toLocaleDateString('es-AR')

    doc.setFontSize(16)
    doc.text('Informe Estadístico Predictivo', 14, 18)

    doc.setFontSize(10)
    doc.text(`Empresa: ${empresaActiva?.nombre || 'Sin empresa'}`, 14, 26)
    doc.text(`Generado: ${fecha}`, 14, 32)
    doc.text(`Horizonte: ${horizonte === 'semanal' ? 'Semanal' : 'Mensual'}`, 14, 38)
    doc.text(`Historial usado: ${diasHistorial} días`, 14, 44)

    autoTable(doc, {
      startY: 52,
      head: [['Métrica', 'Valor']],
      body: [
        ['Real acumulado', formatearDinero(estadisticas.periodoActual.realAcumulado)],
        ['Previsto al día de hoy', formatearDinero(estadisticas.periodoActual.previstoAlDia)],
        ['Previsto total del período', formatearDinero(estadisticas.prediccion.previstoTotal)],
        ['Media diaria', formatearDinero(estadisticas.base.mediaDiaria)],
        ['Mediana diaria', formatearDinero(estadisticas.base.medianaDiaria)],
        ['Promedio móvil 7 días', formatearDinero(estadisticas.base.promedioMovil7)],
        ['Volatilidad', `${formatearNumero(estadisticas.base.volatilidadPorcentaje)}%`],
        ['Progreso real vs previsto', `${formatearNumero(estadisticas.periodoActual.progresoPorcentaje)}%`]
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Indicador', 'Detalle']],
      body: estadisticas.ideas.map((idea) => [
        idea.titulo,
        idea.descripcion
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Día', 'Promedio neto', 'Movimientos']],
      body: estadisticas.diasSemana.map((dia) => [
        dia.nombre,
        formatearDinero(dia.promedio),
        dia.cantidad
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }
    })

    doc.save(`informe-estadistico-${obtenerFechaInput(new Date())}.pdf`)
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
          No se pudieron cargar los informes estadísticos
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
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl font-light text-stone-800">
            Informes Estadísticos
          </h2>

          <p className="text-sm text-stone-500 font-light italic">
            Predicciones semanales y mensuales basadas en media, mediana y comportamiento histórico.
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
        horizonte={horizonte}
        setHorizonte={setHorizonte}
        diasHistorial={diasHistorial}
        setDiasHistorial={setDiasHistorial}
        fechaBase={fechaBase}
        setFechaBase={setFechaBase}
      />

      <PanelPrediccion estadisticas={estadisticas} horizonte={horizonte} />

      <ResumenEstadistico estadisticas={estadisticas} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GraficoProgreso estadisticas={estadisticas} horizonte={horizonte} />
        <GraficoTendencia estadisticas={estadisticas} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <IdeasPredictivas ideas={estadisticas.ideas} />
        <DiasFuertes estadisticas={estadisticas} />
      </div>

      <TablaPeriodo estadisticas={estadisticas} />
    </div>
  )
}

function PanelFiltros({
  horizonte,
  setHorizonte,
  diasHistorial,
  setDiasHistorial,
  fechaBase,
  setFechaBase
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Campo label="Predicción">
          <select
            value={horizonte}
            onChange={(e) => setHorizonte(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm bg-white text-stone-600 border border-stone-200 outline-none focus:ring-2 focus:ring-teal-500"
          >
            {HORIZONTES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Historial base">
          <select
            value={diasHistorial}
            onChange={(e) => setDiasHistorial(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl text-sm bg-white text-stone-600 border border-stone-200 outline-none focus:ring-2 focus:ring-teal-500"
          >
            {HISTORIALES.map((item) => (
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
      </div>
    </div>
  )
}

function PanelPrediccion({ estadisticas, horizonte }) {
  const progreso = estadisticas.periodoActual.progresoPorcentaje
  const estado = obtenerEstadoProgreso(progreso)

  return (
    <div className={`rounded-3xl border shadow-sm p-6 ${estado.claseContenedor}`}>
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className={`rounded-2xl p-3 ${estado.claseIcono}`}>
            <Brain className="w-8 h-8" />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2">
              Predicción {horizonte === 'semanal' ? 'semanal' : 'mensual'}
            </p>

            <h3 className="text-3xl font-black text-stone-800">
              {formatearDinero(estadisticas.prediccion.previstoTotal)}
            </h3>

            <p className="text-sm text-stone-600 mt-2">
              Previsión calculada combinando media diaria, mediana diaria y promedio móvil reciente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full xl:w-auto">
          <MiniDato
            titulo="Real acumulado"
            valor={formatearDinero(estadisticas.periodoActual.realAcumulado)}
          />

          <MiniDato
            titulo="Previsto a hoy"
            valor={formatearDinero(estadisticas.periodoActual.previstoAlDia)}
          />

          <MiniDato
            titulo="Progreso"
            valor={`${formatearNumero(progreso)}%`}
            destacado={estado.destacado}
          />
        </div>
      </div>

      <div className="mt-5 bg-white/70 border border-white rounded-2xl p-4">
        <p className={`font-bold ${estado.claseTexto}`}>
          {estado.mensaje}
        </p>
      </div>
    </div>
  )
}

function MiniDato({ titulo, valor, destacado = false }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-4 min-w-[170px]">
      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
        {titulo}
      </p>

      <p className={`text-xl font-black ${destacado ? 'text-teal-700' : 'text-stone-800'}`}>
        {valor}
      </p>
    </div>
  )
}

function ResumenEstadistico({ estadisticas }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
      <ResumenCard
        titulo="Media diaria"
        valor={formatearDinero(estadisticas.base.mediaDiaria)}
        descripcion="Promedio neto por día"
        Icon={Activity}
      />

      <ResumenCard
        titulo="Mediana diaria"
        valor={formatearDinero(estadisticas.base.medianaDiaria)}
        descripcion="Valor central histórico"
        Icon={Target}
      />

      <ResumenCard
        titulo="Prom. móvil 7d"
        valor={formatearDinero(estadisticas.base.promedioMovil7)}
        descripcion="Tendencia reciente"
        Icon={LineChartIcon}
      />

      <ResumenCard
        titulo="Mejor día"
        valor={formatearDinero(estadisticas.base.mejorDia.valor)}
        descripcion={estadisticas.base.mejorDia.fecha || 'Sin datos'}
        Icon={TrendingUp}
      />

      <ResumenCard
        titulo="Peor día"
        valor={formatearDinero(estadisticas.base.peorDia.valor)}
        descripcion={estadisticas.base.peorDia.fecha || 'Sin datos'}
        Icon={TrendingDown}
      />

      <ResumenCard
        titulo="Volatilidad"
        valor={`${formatearNumero(estadisticas.base.volatilidadPorcentaje)}%`}
        descripcion="Variación sobre media"
        Icon={BarChart3}
      />
    </div>
  )
}

function ResumenCard({ titulo, valor, descripcion, Icon }) {
  const negativo = String(valor).includes('-')

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
            {titulo}
          </p>

          <p className={`text-2xl font-black truncate ${negativo ? 'text-red-600' : 'text-stone-800'}`}>
            {valor}
          </p>

          <p className="text-xs text-stone-500 mt-1 truncate" title={descripcion}>
            {descripcion}
          </p>
        </div>

        <div className="text-teal-600 bg-teal-50 rounded-xl p-2 shadow-sm shrink-0">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function GraficoProgreso({ estadisticas, horizonte }) {
  const data = [
    {
      nombre: 'Real',
      valor: estadisticas.periodoActual.realAcumulado
    },
    {
      nombre: 'Previsto a hoy',
      valor: estadisticas.periodoActual.previstoAlDia
    },
    {
      nombre: horizonte === 'semanal' ? 'Previsto semana' : 'Previsto mes',
      valor: estadisticas.prediccion.previstoTotal
    }
  ]

  return (
    <PanelGrafico
      titulo="Real vs previsto"
      descripcion="Compara lo logrado contra lo esperado."
      Icon={Target}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
          <XAxis dataKey="nombre" tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(value) => formatearDinero(value)} />
          <Bar dataKey="valor" name="Monto" fill="#0d9488" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </PanelGrafico>
  )
}

function GraficoTendencia({ estadisticas }) {
  return (
    <PanelGrafico
      titulo="Tendencia diaria"
      descripcion="Neto diario del historial seleccionado."
      Icon={LineChartIcon}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={estadisticas.serieDiaria} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(value) => formatearDinero(value)} />
          <Legend />
          <Line type="monotone" dataKey="neto" name="Neto diario" stroke="#0d9488" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="promedioMovil" name="Prom. móvil 7d" stroke="#3b82f6" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </PanelGrafico>
  )
}

function IdeasPredictivas({ ideas }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
          <Sparkles className="w-5 h-5" />
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-stone-500">
            Ideas predictivas
          </h3>

          <p className="text-xs text-stone-400 mt-1">
            Lectura automática del comportamiento financiero.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {ideas.map((idea) => (
          <div
            key={idea.titulo}
            className={`rounded-2xl border p-4 ${idea.clase}`}
          >
            <p className="font-black text-stone-800">
              {idea.titulo}
            </p>

            <p className="text-sm text-stone-600 mt-1">
              {idea.descripcion}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DiasFuertes({ estadisticas }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
          <CalendarDays className="w-5 h-5" />
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-stone-500">
            Días fuertes y flojos
          </h3>

          <p className="text-xs text-stone-400 mt-1">
            Promedio neto por día de la semana.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {estadisticas.diasSemana.map((dia) => (
          <div
            key={dia.nombre}
            className="bg-stone-50 border border-stone-100 rounded-xl p-3 flex items-center justify-between gap-3"
          >
            <div>
              <p className="font-bold text-stone-800">
                {dia.nombre}
              </p>

              <p className="text-xs text-stone-500">
                {dia.cantidad} día(s) con datos
              </p>
            </div>

            <p className={`font-black ${dia.promedio < 0 ? 'text-red-600' : 'text-teal-700'}`}>
              {formatearDinero(dia.promedio)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function TablaPeriodo({ estadisticas }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-stone-100">
        <h3 className="text-xs font-black uppercase tracking-widest text-stone-500">
          Detalle diario del historial
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-stone-600">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-bold">
            <tr>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4 text-right">Ingresos</th>
              <th className="px-6 py-4 text-right">Egresos</th>
              <th className="px-6 py-4 text-right">Neto</th>
              <th className="px-6 py-4 text-right">Prom. móvil</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100">
            {estadisticas.serieDiaria.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-stone-400 font-light">
                  No hay movimientos para calcular estadísticas.
                </td>
              </tr>
            ) : (
              [...estadisticas.serieDiaria].reverse().map((dia) => (
                <tr key={dia.fecha} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-stone-800">
                    {formatearFecha(dia.fecha)}
                  </td>

                  <td className="px-6 py-4 text-right text-teal-700 font-bold">
                    {formatearDinero(dia.ingresos)}
                  </td>

                  <td className="px-6 py-4 text-right text-red-600 font-bold">
                    {formatearDinero(dia.egresos)}
                  </td>

                  <td className={`px-6 py-4 text-right font-black ${dia.neto < 0 ? 'text-red-600' : 'text-stone-800'}`}>
                    {formatearDinero(dia.neto)}
                  </td>

                  <td className="px-6 py-4 text-right text-stone-500">
                    {formatearDinero(dia.promedioMovil)}
                  </td>
                </tr>
              ))
            )}
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

function procesarEstadisticas({
  movimientos,
  horizonte,
  fechaBase,
  diasHistorial
}) {
  const rangoHistorial = obtenerRangoHistorial(fechaBase, diasHistorial)
  const periodoActual = obtenerPeriodoActual(fechaBase, horizonte)

  const dias = crearDiasVacios(rangoHistorial.desde, rangoHistorial.hasta)

  movimientos.forEach((movimiento) => {
    const fecha = movimiento.fecha_operativa

    if (!dias[fecha]) return

    const monto = Number(movimiento.monto || 0)
    const tipo = movimiento.tipo_movimiento

    dias[fecha].neto += monto

    if (tipo === 'Ingreso' && monto > 0) {
      dias[fecha].ingresos += monto
    } else if ((tipo === 'Egreso' || tipo === 'Anulacion') && monto < 0) {
      dias[fecha].egresos += Math.abs(monto)
    } else if (tipo === 'Ajuste') {
      if (monto >= 0) {
        dias[fecha].ingresos += monto
      } else {
        dias[fecha].egresos += Math.abs(monto)
      }
    }
  })

  const serieDiariaBase = Object.values(dias)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const serieDiaria = agregarPromedioMovil(serieDiariaBase, 7)

  const diasAntesDelPeriodo = serieDiaria.filter((dia) => {
    return dia.fecha < periodoActual.desde
  })

  const baseHistorica = diasAntesDelPeriodo.length > 0
    ? diasAntesDelPeriodo
    : serieDiaria

  const valoresHistoricos = baseHistorica.map((dia) => dia.neto)
  const valoresNoCero = valoresHistoricos.filter((valor) => valor !== 0)

  const mediaDiaria = calcularMedia(valoresHistoricos)
  const medianaDiaria = calcularMediana(valoresHistoricos)
  const promedioMovil7 = serieDiaria.length > 0
    ? serieDiaria[serieDiaria.length - 1].promedioMovil
    : 0

  const previstoDiario = calcularMedia([
    mediaDiaria,
    medianaDiaria,
    promedioMovil7
  ])

  const diasPeriodo = contarDias(periodoActual.desde, periodoActual.hasta)
  const diasTranscurridos = contarDias(periodoActual.desde, fechaBase)

  const previstoTotal = previstoDiario * diasPeriodo
  const previstoAlDia = previstoDiario * Math.min(diasTranscurridos, diasPeriodo)

  const diasDelPeriodo = serieDiaria.filter((dia) => {
    return dia.fecha >= periodoActual.desde && dia.fecha <= periodoActual.hasta
  })

  const realAcumulado = diasDelPeriodo
    .filter((dia) => dia.fecha <= fechaBase)
    .reduce((sum, dia) => sum + dia.neto, 0)

  const ingresosPeriodo = diasDelPeriodo
    .filter((dia) => dia.fecha <= fechaBase)
    .reduce((sum, dia) => sum + dia.ingresos, 0)

  const egresosPeriodo = diasDelPeriodo
    .filter((dia) => dia.fecha <= fechaBase)
    .reduce((sum, dia) => sum + dia.egresos, 0)

  const progresoPorcentaje = previstoAlDia !== 0
    ? (realAcumulado / previstoAlDia) * 100
    : realAcumulado > 0
      ? 100
      : 0

  const mejorDia = obtenerMejorDia(serieDiaria)
  const peorDia = obtenerPeorDia(serieDiaria)
  const desviacion = calcularDesviacion(valoresHistoricos, mediaDiaria)
  const volatilidadPorcentaje = Math.abs(mediaDiaria) > 0
    ? (desviacion / Math.abs(mediaDiaria)) * 100
    : 0

  const diasSemana = calcularDiasSemana(serieDiaria)

  const ideas = generarIdeas({
    progresoPorcentaje,
    volatilidadPorcentaje,
    mediaDiaria,
    medianaDiaria,
    promedioMovil7,
    mejorDiaSemana: diasSemana[0],
    peorDiaSemana: diasSemana[diasSemana.length - 1],
    realAcumulado,
    previstoAlDia
  })

  return {
    base: {
      mediaDiaria,
      medianaDiaria,
      promedioMovil7,
      mejorDia,
      peorDia,
      desviacion,
      volatilidadPorcentaje,
      diasConDatos: valoresNoCero.length
    },
    prediccion: {
      previstoDiario,
      previstoTotal,
      diasPeriodo
    },
    periodoActual: {
      desde: periodoActual.desde,
      hasta: periodoActual.hasta,
      diasPeriodo,
      diasTranscurridos,
      realAcumulado,
      ingresosPeriodo,
      egresosPeriodo,
      previstoAlDia,
      progresoPorcentaje
    },
    serieDiaria,
    diasSemana,
    ideas
  }
}

function generarIdeas({
  progresoPorcentaje,
  volatilidadPorcentaje,
  mediaDiaria,
  medianaDiaria,
  promedioMovil7,
  mejorDiaSemana,
  peorDiaSemana,
  realAcumulado,
  previstoAlDia
}) {
  const ideas = []

  if (progresoPorcentaje >= 110) {
    ideas.push({
      titulo: 'El negocio está por encima de lo previsto',
      descripcion: `El real acumulado supera la previsión al día de hoy. Vas en ${formatearNumero(progresoPorcentaje)}% del objetivo esperado.`,
      clase: 'bg-teal-50 border-teal-100'
    })
  } else if (progresoPorcentaje >= 85) {
    ideas.push({
      titulo: 'El negocio está cerca de lo previsto',
      descripcion: `El avance está dentro de un rango saludable. Real: ${formatearDinero(realAcumulado)} vs previsto: ${formatearDinero(previstoAlDia)}.`,
      clase: 'bg-blue-50 border-blue-100'
    })
  } else {
    ideas.push({
      titulo: 'Alerta de rendimiento bajo',
      descripcion: `El real acumulado está por debajo de lo previsto. Puede convenir activar promociones, recordatorios o campañas para turnos disponibles.`,
      clase: 'bg-red-50 border-red-100'
    })
  }

  if (volatilidadPorcentaje > 75) {
    ideas.push({
      titulo: 'Ingresos muy variables',
      descripcion: `La volatilidad está en ${formatearNumero(volatilidadPorcentaje)}%. Conviene revisar qué días o servicios generan saltos fuertes.`,
      clase: 'bg-amber-50 border-amber-100'
    })
  } else {
    ideas.push({
      titulo: 'Comportamiento relativamente estable',
      descripcion: `La variación diaria está controlada. Esto permite hacer predicciones más confiables para la semana o el mes.`,
      clase: 'bg-teal-50 border-teal-100'
    })
  }

  if (promedioMovil7 > mediaDiaria && promedioMovil7 > medianaDiaria) {
    ideas.push({
      titulo: 'Tendencia reciente positiva',
      descripcion: `El promedio móvil de 7 días está por encima de la media y la mediana. La actividad reciente viene mejorando.`,
      clase: 'bg-teal-50 border-teal-100'
    })
  } else if (promedioMovil7 < mediaDiaria && promedioMovil7 < medianaDiaria) {
    ideas.push({
      titulo: 'Tendencia reciente en baja',
      descripcion: `El promedio móvil reciente está por debajo de la media y la mediana. Revisá agenda, promociones y clientes dormidos.`,
      clase: 'bg-orange-50 border-orange-100'
    })
  }

  if (mejorDiaSemana?.cantidad > 0) {
    ideas.push({
      titulo: `Día fuerte: ${mejorDiaSemana.nombre}`,
      descripcion: `Ese día tiene el mejor promedio neto. Puede ser buen momento para ofrecer servicios premium o combos.`,
      clase: 'bg-teal-50 border-teal-100'
    })
  }

  if (peorDiaSemana?.cantidad > 0) {
    ideas.push({
      titulo: `Día flojo: ${peorDiaSemana.nombre}`,
      descripcion: `Ese día tiene el promedio más bajo. Puede servir para promociones, descuentos o campañas de captación.`,
      clase: 'bg-stone-50 border-stone-100'
    })
  }

  return ideas
}

function calcularDiasSemana(serieDiaria) {
  const mapa = DIAS_SEMANA.map((nombre, index) => ({
    index,
    nombre,
    total: 0,
    cantidad: 0,
    promedio: 0
  }))

  serieDiaria.forEach((dia) => {
    const fecha = crearFechaLocal(dia.fecha)
    const index = fecha.getDay()

    mapa[index].total += dia.neto
    mapa[index].cantidad += 1
  })

  return mapa
    .map((dia) => ({
      ...dia,
      promedio: dia.cantidad > 0 ? dia.total / dia.cantidad : 0
    }))
    .sort((a, b) => b.promedio - a.promedio)
}

function crearDiasVacios(desde, hasta) {
  const mapa = {}
  const inicio = crearFechaLocal(desde)
  const fin = crearFechaLocal(hasta)
  const cursor = new Date(inicio)

  while (cursor <= fin) {
    const fecha = obtenerFechaInput(cursor)

    mapa[fecha] = {
      fecha,
      label: formatearFechaCorta(fecha),
      ingresos: 0,
      egresos: 0,
      neto: 0,
      promedioMovil: 0
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return mapa
}

function agregarPromedioMovil(serie, ventana) {
  return serie.map((dia, index) => {
    const desde = Math.max(0, index - ventana + 1)
    const muestra = serie.slice(desde, index + 1)
    const promedioMovil = calcularMedia(muestra.map((item) => item.neto))

    return {
      ...dia,
      promedioMovil
    }
  })
}

function calcularMedia(valores) {
  if (!valores.length) return 0

  return valores.reduce((sum, valor) => sum + Number(valor || 0), 0) / valores.length
}

function calcularMediana(valores) {
  if (!valores.length) return 0

  const ordenados = [...valores]
    .map((valor) => Number(valor || 0))
    .sort((a, b) => a - b)

  const mitad = Math.floor(ordenados.length / 2)

  if (ordenados.length % 2 === 0) {
    return (ordenados[mitad - 1] + ordenados[mitad]) / 2
  }

  return ordenados[mitad]
}

function calcularDesviacion(valores, media) {
  if (!valores.length) return 0

  const varianza = valores.reduce((sum, valor) => {
    return sum + Math.pow(Number(valor || 0) - media, 2)
  }, 0) / valores.length

  return Math.sqrt(varianza)
}

function obtenerMejorDia(serie) {
  if (!serie.length) {
    return {
      fecha: '',
      valor: 0
    }
  }

  const mejor = [...serie].sort((a, b) => b.neto - a.neto)[0]

  return {
    fecha: formatearFecha(mejor.fecha),
    valor: mejor.neto
  }
}

function obtenerPeorDia(serie) {
  if (!serie.length) {
    return {
      fecha: '',
      valor: 0
    }
  }

  const peor = [...serie].sort((a, b) => a.neto - b.neto)[0]

  return {
    fecha: formatearFecha(peor.fecha),
    valor: peor.neto
  }
}

function obtenerEstadoProgreso(progreso) {
  if (progreso >= 110) {
    return {
      mensaje: 'Excelente: el real acumulado está superando lo previsto.',
      claseContenedor: 'bg-teal-50 border-teal-100',
      claseIcono: 'bg-white text-teal-700',
      claseTexto: 'text-teal-800',
      destacado: true
    }
  }

  if (progreso >= 85) {
    return {
      mensaje: 'Correcto: el negocio está cerca del rendimiento previsto.',
      claseContenedor: 'bg-blue-50 border-blue-100',
      claseIcono: 'bg-white text-blue-700',
      claseTexto: 'text-blue-800',
      destacado: true
    }
  }

  return {
    mensaje: 'Atención: el real acumulado está por debajo del previsto.',
    claseContenedor: 'bg-red-50 border-red-100',
    claseIcono: 'bg-white text-red-700',
    claseTexto: 'text-red-800',
    destacado: false
  }
}

function obtenerRangoHistorial(fechaBase, diasHistorial) {
  const fin = crearFechaLocal(fechaBase)
  const inicio = new Date(fin)

  inicio.setDate(inicio.getDate() - Number(diasHistorial || 90) + 1)

  return {
    desde: obtenerFechaInput(inicio),
    hasta: obtenerFechaInput(fin)
  }
}

function obtenerPeriodoActual(fechaBase, horizonte) {
  const fecha = crearFechaLocal(fechaBase)

  if (horizonte === 'mensual') {
    const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
    const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)

    return {
      desde: obtenerFechaInput(inicio),
      hasta: obtenerFechaInput(fin)
    }
  }

  const inicio = new Date(fecha)
  const dia = inicio.getDay()
  const diferencia = dia === 0 ? -6 : 1 - dia

  inicio.setDate(inicio.getDate() + diferencia)

  const fin = new Date(inicio)
  fin.setDate(inicio.getDate() + 6)

  return {
    desde: obtenerFechaInput(inicio),
    hasta: obtenerFechaInput(fin)
  }
}

function contarDias(desde, hasta) {
  const inicio = crearFechaLocal(desde)
  const fin = crearFechaLocal(hasta)

  const diferencia = Math.round((fin - inicio) / 86400000) + 1

  return Math.max(1, diferencia)
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

function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha'

  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR')
}

function formatearFechaCorta(fecha) {
  if (!fecha) return ''

  const [, mes, dia] = fecha.split('-')

  return `${dia}/${mes}`
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