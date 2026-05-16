// src/components/productos/ReportesAlertas.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  AlertTriangle,
  CalendarClock,
  DollarSign,
  FileText,
  Hourglass,
  Info,
  PackageSearch,
  Percent,
  RefreshCw,
  TrendingUp,
  Warehouse,
  Boxes
} from 'lucide-react'

const PERIODOS_ROTACION = [
  { value: '30', label: '30 días' },
  { value: '90', label: '90 días' },
  { value: 'anio', label: 'Año actual' },
  { value: 'todo', label: 'Todo' }
]

const DIAS_SIN_MOVIMIENTO = [
  { value: 30, label: '+30 días' },
  { value: 60, label: '+60 días' },
  { value: 90, label: '+90 días' },
  { value: 180, label: '+180 días' }
]

export function ReportesAlertas({ session }) {
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [periodoRotacion, setPeriodoRotacion] = useState('90')
  const [tipoMargen, setTipoMargen] = useState('porcentaje')
  const [diasSinMovimiento, setDiasSinMovimiento] = useState(90)

  const [productos, setProductos] = useState([])
  const [ventas, setVentas] = useState([])
  const [sesiones, setSesiones] = useState([])
  const [costosServicio, setCostosServicio] = useState([])
  const [comboServicios, setComboServicios] = useState([])

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
        productosResponse,
        ventasResponse,
        sesionesResponse,
        costosResponse,
        comboServiciosResponse
      ] = await Promise.all([
        supabase
          .from('productos')
          .select(`
            id,
            profesional_id,
            codigo,
            descripcion,
            dosificacion,
            unidad_medida,
            cantidad_suelta,
            unidades_enteras,
            precio_venta,
            costo_unidad,
            proximo_vencimiento,
            stock_minimo,
            activo
          `)
          .eq('profesional_id', session.user.id)
          .eq('activo', true),

        supabase
          .from('ventas')
          .select(`
            id,
            profesional_id,
            fecha_hora,
            estado,
            venta_detalles (
              id,
              producto_id,
              descripcion,
              cantidad,
              precio_unitario,
              subtotal
            )
          `)
          .eq('profesional_id', session.user.id)
          .eq('estado', 'Completada'),

        supabase
          .from('sesiones')
          .select(`
            id,
            profesional_id,
            fecha_hora,
            estado,
            sesion_detalles (
              id,
              servicio_id,
              combo_id
            )
          `)
          .eq('profesional_id', session.user.id)
          .eq('estado', 'Cobrada'),

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
          `)
          .not('producto_id', 'is', null),

        supabase
          .from('combo_servicios')
          .select(`
            combo_id,
            servicio_id
          `)
      ])

      if (productosResponse.error) throw productosResponse.error
      if (ventasResponse.error) throw ventasResponse.error
      if (sesionesResponse.error) throw sesionesResponse.error
      if (costosResponse.error) throw costosResponse.error
      if (comboServiciosResponse.error) throw comboServiciosResponse.error

      setProductos(productosResponse.data || [])
      setVentas(ventasResponse.data || [])
      setSesiones(sesionesResponse.data || [])
      setCostosServicio(costosResponse.data || [])
      setComboServicios(comboServiciosResponse.data || [])

    } catch (error) {
      console.error('Error al cargar reportes y alertas:', error)
      setErrorCarga(error.message || 'No se pudieron cargar los reportes y alertas.')
    } finally {
      setLoading(false)
    }
  }

  const datosProcesados = useMemo(() => {
    return procesarDatos({
      productos,
      ventas,
      sesiones,
      costosServicio,
      comboServicios,
      periodoRotacion,
      tipoMargen,
      diasSinMovimiento
    })
  }, [
    productos,
    ventas,
    sesiones,
    costosServicio,
    comboServicios,
    periodoRotacion,
    tipoMargen,
    diasSinMovimiento
  ])

  const generarPDF = (tipo) => {
    const config = obtenerConfigPDF(tipo, datosProcesados, diasSinMovimiento)

    if (!config || config.filas.length === 0) return

    const doc = new jsPDF()
    const fecha = new Date().toLocaleDateString('es-AR')

    doc.setFontSize(16)
    doc.text(config.titulo, 14, 18)

    doc.setFontSize(10)
    doc.text(`Fecha: ${fecha}`, 14, 26)
    doc.text(`Profesional: ${session?.user?.email || 'Sin email'}`, 14, 32)

    autoTable(doc, {
      startY: 42,
      head: [config.columnas],
      body: config.filas,
      styles: {
        fontSize: 8
      },
      headStyles: {
        fillColor: [13, 148, 136]
      }
    })

    doc.save(`${config.nombreArchivo}-${obtenerFechaArchivo()}.pdf`)
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
      <HeaderReportes />

      <ResumenGeneral datos={datosProcesados} diasSinMovimiento={diasSinMovimiento} />

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <TablaReposicion
          productos={datosProcesados.productosAReponer}
          onExportar={() => generarPDF('reposicion')}
        />

        <TablaVencimientos
          productos={datosProcesados.productosPorVencer}
          onExportar={() => generarPDF('vencimientos')}
        />

        <TablaSinMovimientos
          productos={datosProcesados.productosSinMovimientos}
          diasSinMovimiento={diasSinMovimiento}
          setDiasSinMovimiento={setDiasSinMovimiento}
          onExportar={() => generarPDF('sin-movimientos')}
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TopFlopCard
          titulo="Rotación por ventas"
          descripcion="Productos más y menos vendidos en el período seleccionado."
          topTitulo="Top ventas"
          flopTitulo="Flop ventas"
          topItems={datosProcesados.topVentas}
          flopItems={datosProcesados.flopVentas}
          unidad="ventas"
          periodoRotacion={periodoRotacion}
          setPeriodoRotacion={setPeriodoRotacion}
        />

        <TopFlopCard
          titulo="Rotación por insumos"
          descripcion="Productos más y menos utilizados como insumo en sesiones cobradas."
          topTitulo="Top insumos"
          flopTitulo="Flop insumos"
          topItems={datosProcesados.topInsumos}
          flopItems={datosProcesados.flopInsumos}
          unidad="usos"
          periodoRotacion={periodoRotacion}
          setPeriodoRotacion={setPeriodoRotacion}
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MargenCard
          productos={datosProcesados.productosMayorMargen}
          tipoMargen={tipoMargen}
          setTipoMargen={setTipoMargen}
        />

        <AyudaCard diasSinMovimiento={diasSinMovimiento} />
      </section>
    </div>
  )
}

function HeaderReportes() {
  return (
    <div className="px-2">
      <h2 className="text-2xl font-light text-stone-800">
        Reportes - Alertas
      </h2>
      <p className="text-sm text-stone-500 font-light italic">
        Reposición, rotación, vencimientos, stock quieto y margen de productos.
      </p>
    </div>
  )
}

function ResumenGeneral({ datos, diasSinMovimiento }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      <ResumenCard
        titulo="A reponer"
        valor={datos.productosAReponer.length}
        descripcion="Unidades enteras bajo mínimo"
        Icon={PackageSearch}
      />

      <ResumenCard
        titulo="Vencimientos"
        valor={datos.productosPorVencer.length}
        descripcion="Vencidos o próximos 90 días"
        Icon={CalendarClock}
      />

      <ResumenCard
        titulo="Sin movimiento"
        valor={datos.productosSinMovimientos.length}
        descripcion={`Stock quieto +${diasSinMovimiento} días`}
        Icon={Hourglass}
      />

      <ResumenCard
        titulo="Productos activos"
        valor={datos.totalProductos}
        descripcion="Con ficha activa"
        Icon={Boxes}
      />

      <ResumenCard
        titulo="Con stock"
        valor={datos.totalConStock}
        descripcion="Suelto o unidades"
        Icon={Warehouse}
      />
    </div>
  )
}

function ResumenCard({ titulo, valor, descripcion, Icon }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5">
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

        <div className="text-teal-600 bg-teal-50 rounded-xl p-2">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function TablaReposicion({ productos, onExportar }) {
  return (
    <PanelTabla
      titulo="Productos a reponer"
      descripcion="Se compara unidades enteras contra stock mínimo."
      exportLabel="PDF reposición"
      onExportar={onExportar}
      disabledExport={productos.length === 0}
    >
      {productos.length === 0 ? (
        <EmptyState mensaje="No hay productos para reponer." />
      ) : (
        productos.map((producto) => (
          <ProductoMiniRow
            key={producto.id}
            titulo={producto.descripcion}
            subtitulo={`Código ${producto.codigo}`}
            derecha={`${producto.unidadesEnteras} / mín. ${producto.stockMinimo}`}
            badge="Reponer"
            badgeClass="bg-red-100 text-red-700"
          />
        ))
      )}
    </PanelTabla>
  )
}

function TablaVencimientos({ productos, onExportar }) {
  return (
    <PanelTabla
      titulo="Alerta de vencimientos"
      descripcion="Amarillo 90 días, naranja 60 días, rojo 30 días o vencido."
      exportLabel="PDF vencimientos"
      onExportar={onExportar}
      disabledExport={productos.length === 0}
    >
      {productos.length === 0 ? (
        <EmptyState mensaje="No hay vencimientos próximos." />
      ) : (
        productos.map((producto) => (
          <ProductoMiniRow
            key={producto.id}
            titulo={producto.descripcion}
            subtitulo={producto.proximoVencimientoTexto}
            derecha={producto.diasVencimiento < 0 ? 'Vencido' : `${producto.diasVencimiento} días`}
            badge={producto.nivelVencimientoLabel}
            badgeClass={producto.nivelVencimientoClass}
          />
        ))
      )}
    </PanelTabla>
  )
}

function TablaSinMovimientos({
  productos,
  diasSinMovimiento,
  setDiasSinMovimiento,
  onExportar
}) {
  return (
    <PanelTabla
      titulo="Stock sin movimientos"
      descripcion={`Productos con stock actual sin ventas ni uso como insumo por más de ${diasSinMovimiento} días.`}
      exportLabel="PDF quietos"
      onExportar={onExportar}
      disabledExport={productos.length === 0}
      extraControls={
        <div className="flex flex-wrap gap-1 mt-3">
          {DIAS_SIN_MOVIMIENTO.map((opcion) => (
            <button
              key={opcion.value}
              type="button"
              onClick={() => setDiasSinMovimiento(opcion.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                diasSinMovimiento === opcion.value
                  ? 'bg-teal-600 text-white'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {opcion.label}
            </button>
          ))}
        </div>
      }
    >
      {productos.length === 0 ? (
        <EmptyState mensaje="No hay productos quietos con stock." />
      ) : (
        productos.map((producto) => (
          <ProductoMiniRow
            key={producto.id}
            titulo={producto.descripcion}
            subtitulo={producto.ultimoMovimientoTexto}
            derecha={producto.diasSinMovimiento === null ? 'Nunca' : `${producto.diasSinMovimiento} días`}
            badge="Quieto"
            badgeClass="bg-stone-200 text-stone-700"
          />
        ))
      )}
    </PanelTabla>
  )
}

function PanelTabla({
  titulo,
  descripcion,
  exportLabel,
  onExportar,
  disabledExport,
  extraControls,
  children
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      <div className="p-5 border-b border-stone-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-stone-800 uppercase tracking-widest">
              {titulo}
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              {descripcion}
            </p>
          </div>

          <button
            type="button"
            onClick={onExportar}
            disabled={disabledExport}
            className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shrink-0"
          >
            <FileText className="w-4 h-4" />
            {exportLabel}
          </button>
        </div>

        {extraControls}
      </div>

      <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

function ProductoMiniRow({ titulo, subtitulo, derecha, badge, badgeClass }) {
  return (
    <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-bold text-stone-800 truncate" title={titulo}>
          {titulo}
        </p>
        <p className="text-xs text-stone-500 truncate" title={subtitulo}>
          {subtitulo}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-black text-stone-700">
          {derecha}
        </p>
        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${badgeClass}`}>
          {badge}
        </span>
      </div>
    </div>
  )
}

function TopFlopCard({
  titulo,
  descripcion,
  topTitulo,
  flopTitulo,
  topItems,
  flopItems,
  unidad,
  periodoRotacion,
  setPeriodoRotacion
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
      <div className="mb-5 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-widest">
            {titulo}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {descripcion}
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          {PERIODOS_ROTACION.map((periodo) => (
            <button
              key={periodo.value}
              type="button"
              onClick={() => setPeriodoRotacion(periodo.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                periodoRotacion === periodo.value
                  ? 'bg-teal-600 text-white'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {periodo.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <h4 className="text-xs font-black text-teal-700 uppercase tracking-widest mb-3">
            {topTitulo}
          </h4>

          <div className="space-y-3">
            {topItems.length === 0 ? (
              <EmptyState mensaje="Sin movimientos." />
            ) : (
              topItems.map((item, index) => (
                <RankingRow
                  key={item.id}
                  index={index}
                  titulo={item.descripcion}
                  subtitulo={item.codigo}
                  valor={`${formatearNumero(item.valorRotacion)} ${unidad}`}
                />
              ))
            )}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black text-stone-500 uppercase tracking-widest mb-3">
            {flopTitulo}
          </h4>

          <div className="space-y-3">
            {flopItems.length === 0 ? (
              <EmptyState mensaje="Sin productos con stock." />
            ) : (
              flopItems.map((item, index) => (
                <RankingRow
                  key={item.id}
                  index={index}
                  titulo={item.descripcion}
                  subtitulo={item.codigo}
                  valor={`${formatearNumero(item.valorRotacion)} ${unidad}`}
                  muted
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MargenCard({ productos, tipoMargen, setTipoMargen }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
      <div className="mb-5 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-widest">
            Mayor ratio de ganancia
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Ordenado según el selector: porcentaje de margen o ganancia en pesos.
          </p>
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setTipoMargen('porcentaje')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              tipoMargen === 'porcentaje'
                ? 'bg-teal-600 text-white'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            Porcentaje
          </button>

          <button
            type="button"
            onClick={() => setTipoMargen('plata')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              tipoMargen === 'plata'
                ? 'bg-teal-600 text-white'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Dinero
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {productos.length === 0 ? (
          <EmptyState mensaje="No hay productos con precio y costo válidos." />
        ) : (
          productos.map((producto, index) => (
            <RankingRow
              key={producto.id}
              index={index}
              titulo={producto.descripcion}
              subtitulo={`Venta ${formatearDinero(producto.precioVenta)} / Costo ${formatearDinero(producto.costoUnidad)}`}
              valor={tipoMargen === 'porcentaje'
                ? `${formatearNumero(producto.margenPorcentaje)}%`
                : formatearDinero(producto.gananciaUnitaria)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function AyudaCard({ diasSinMovimiento }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-teal-600" />
        <h3 className="text-sm font-black text-stone-800 uppercase tracking-widest">
          Criterios usados
        </h3>
      </div>

      <div className="space-y-3 text-sm text-stone-600">
        <p>
          <strong>Reposición:</strong> compara unidades enteras contra stock mínimo.
        </p>

        <p>
          <strong>Rotación por ventas:</strong> cuenta ventas completadas.
        </p>

        <p>
          <strong>Rotación por insumos:</strong> cuenta sesiones cobradas donde el producto fue usado como insumo.
        </p>

        <p>
          <strong>Sin movimientos:</strong> solo muestra productos con stock actual y más de {diasSinMovimiento} días sin ventas ni uso como insumo.
        </p>

        <p>
          <strong>Vencimientos:</strong> amarillo hasta 90 días, naranja hasta 60 días, rojo hasta 30 días o vencido.
        </p>
      </div>
    </div>
  )
}

function RankingRow({ index, titulo, subtitulo, valor, muted = false }) {
  return (
    <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
      muted
        ? 'bg-stone-50 border-stone-100'
        : 'bg-teal-50/60 border-teal-100'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
          muted
            ? 'bg-stone-200 text-stone-600'
            : 'bg-teal-100 text-teal-700'
        }`}>
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

function EmptyState({ mensaje }) {
  return (
    <div className="p-5 text-center text-stone-400 border border-dashed border-stone-200 rounded-xl text-sm">
      {mensaje}
    </div>
  )
}

function procesarDatos({
  productos,
  ventas,
  sesiones,
  costosServicio,
  comboServicios,
  periodoRotacion,
  tipoMargen,
  diasSinMovimiento
}) {
  const ahora = new Date()
  const inicioPeriodo = obtenerInicioPeriodo(periodoRotacion, ahora)

  const productosBase = productos.map(normalizarProducto)
  const productoPorId = indexarPorId(productosBase)
  const serviciosPorComboId = agruparServiciosPorCombo(comboServicios)
  const costosPorServicioId = agruparCostosPorServicio(costosServicio)

  const metricasPorProducto = crearMetricasIniciales(productosBase)

  procesarVentas({
    ventas,
    inicioPeriodo,
    metricasPorProducto,
    productoPorId
  })

  procesarSesionesComoInsumos({
    sesiones,
    inicioPeriodo,
    metricasPorProducto,
    productoPorId,
    costosPorServicioId,
    serviciosPorComboId
  })

  const productosConMetricas = productosBase.map((producto) => {
    const metricas = metricasPorProducto[producto.id] || crearMetricaVacia()

    const ultimoMovimiento = obtenerFechaMasReciente([
      metricas.ultimaVenta,
      metricas.ultimoUsoInsumo
    ])

    const diasSinMovimientoCalculado = ultimoMovimiento
      ? diferenciaDias(ultimoMovimiento, ahora)
      : null

    const gananciaUnitaria = producto.precioVenta - producto.costoUnidad
    const margenPorcentaje = producto.precioVenta > 0
      ? (gananciaUnitaria / producto.precioVenta) * 100
      : 0

    return {
      ...producto,
      ventasCantidad: metricas.ventasCantidad,
      ventasOperaciones: metricas.ventasOperaciones,
      usosInsumo: metricas.usosInsumo,
      ultimaVenta: metricas.ultimaVenta,
      ultimoUsoInsumo: metricas.ultimoUsoInsumo,
      ultimoMovimiento,
      diasSinMovimiento: diasSinMovimientoCalculado,
      ultimoMovimientoTexto: ultimoMovimiento
        ? `Último movimiento: ${formatearFecha(ultimoMovimiento)}`
        : 'Sin movimientos registrados',
      gananciaUnitaria,
      margenPorcentaje
    }
  })

  const productosConStock = productosConMetricas.filter(tieneStockActual)

  const productosAReponer = productosConMetricas
    .filter((producto) => producto.stockMinimo > 0)
    .filter((producto) => producto.unidadesEnteras <= producto.stockMinimo)
    .sort((a, b) => a.unidadesEnteras - b.unidadesEnteras)

  const productosPorVencer = productosConStock
    .map((producto) => agregarInfoVencimiento(producto, ahora))
    .filter((producto) => producto.diasVencimiento !== null)
    .filter((producto) => producto.diasVencimiento <= 90)
    .sort((a, b) => a.diasVencimiento - b.diasVencimiento)

  const productosSinMovimientos = productosConStock
    .filter((producto) => producto.diasSinMovimiento === null || producto.diasSinMovimiento > diasSinMovimiento)
    .sort((a, b) => {
      if (a.diasSinMovimiento === null && b.diasSinMovimiento === null) return 0
      if (a.diasSinMovimiento === null) return -1
      if (b.diasSinMovimiento === null) return 1
      return b.diasSinMovimiento - a.diasSinMovimiento
    })

  const productosParaVenta = productosConStock.map((producto) => ({
    ...producto,
    valorRotacion: producto.ventasCantidad
  }))

  const productosInsumos = productosConStock
    .filter((producto) => esProductoInsumo(producto.id, costosServicio))
    .map((producto) => ({
      ...producto,
      valorRotacion: producto.usosInsumo
    }))

  const topVentas = ordenarDesc(productosParaVenta, 'valorRotacion')
    .filter((producto) => producto.valorRotacion > 0)
    .slice(0, 5)

  const flopVentas = ordenarAsc(productosParaVenta, 'valorRotacion')
    .slice(0, 5)

  const topInsumos = ordenarDesc(productosInsumos, 'valorRotacion')
    .filter((producto) => producto.valorRotacion > 0)
    .slice(0, 5)

  const flopInsumos = ordenarAsc(productosInsumos, 'valorRotacion')
    .slice(0, 5)

  const productosMayorMargen = productosConMetricas
    .filter((producto) => producto.precioVenta > 0 && producto.costoUnidad >= 0)
    .sort((a, b) => {
      if (tipoMargen === 'plata') {
        return b.gananciaUnitaria - a.gananciaUnitaria
      }

      return b.margenPorcentaje - a.margenPorcentaje
    })
    .slice(0, 5)

  return {
    totalProductos: productosConMetricas.length,
    totalConStock: productosConStock.length,
    productosAReponer,
    productosPorVencer,
    productosSinMovimientos,
    topVentas,
    flopVentas,
    topInsumos,
    flopInsumos,
    productosMayorMargen
  }
}

function normalizarProducto(producto) {
  const cantidadSuelta = Number(producto.cantidad_suelta || 0)
  const unidadesEnteras = Number(producto.unidades_enteras || 0)
  const dosificacion = Number(producto.dosificacion || 0)

  return {
    id: producto.id,
    codigo: producto.codigo || 'Sin código',
    descripcion: producto.descripcion || 'Producto sin descripción',
    unidadMedida: producto.unidad_medida || '',
    dosificacion,
    cantidadSuelta,
    unidadesEnteras,
    stockMinimo: Number(producto.stock_minimo || 0),
    precioVenta: Number(producto.precio_venta || 0),
    costoUnidad: Number(producto.costo_unidad || 0),
    proximoVencimiento: producto.proximo_vencimiento || null,
    stockTotalSuelto: cantidadSuelta + (unidadesEnteras * dosificacion)
  }
}

function crearMetricasIniciales(productos) {
  const metricas = {}

  productos.forEach((producto) => {
    metricas[producto.id] = crearMetricaVacia()
  })

  return metricas
}

function crearMetricaVacia() {
  return {
    ventasCantidad: 0,
    ventasOperaciones: 0,
    usosInsumo: 0,
    ultimaVenta: null,
    ultimoUsoInsumo: null
  }
}

function procesarVentas({ ventas, inicioPeriodo, metricasPorProducto, productoPorId }) {
  ventas.forEach((venta) => {
    const fechaVenta = parsearFecha(venta.fecha_hora)

    if (!fechaVenta) return

    venta.venta_detalles?.forEach((detalle) => {
      if (!detalle.producto_id || !productoPorId[detalle.producto_id]) return

      const metrica = metricasPorProducto[detalle.producto_id]

      metrica.ultimaVenta = obtenerFechaMasReciente([metrica.ultimaVenta, fechaVenta])

      if (!estaDentroDelPeriodo(fechaVenta, inicioPeriodo)) return

      metrica.ventasCantidad += Number(detalle.cantidad || 0)
      metrica.ventasOperaciones += 1
    })
  })
}

function procesarSesionesComoInsumos({
  sesiones,
  inicioPeriodo,
  metricasPorProducto,
  productoPorId,
  costosPorServicioId,
  serviciosPorComboId
}) {
  sesiones.forEach((sesion) => {
    const fechaSesion = parsearFecha(sesion.fecha_hora)

    if (!fechaSesion) return

    const serviciosSesion = expandirServiciosSesion(sesion.sesion_detalles || [], serviciosPorComboId)
    const productosUsados = new Set()

    serviciosSesion.forEach((servicioId) => {
      const costos = costosPorServicioId[servicioId] || []

      costos.forEach((costo) => {
        if (!costo.producto_id || !productoPorId[costo.producto_id]) return

        const metrica = metricasPorProducto[costo.producto_id]

        metrica.ultimoUsoInsumo = obtenerFechaMasReciente([metrica.ultimoUsoInsumo, fechaSesion])

        if (!estaDentroDelPeriodo(fechaSesion, inicioPeriodo)) return

        productosUsados.add(costo.producto_id)
      })
    })

    productosUsados.forEach((productoId) => {
      metricasPorProducto[productoId].usosInsumo += 1
    })
  })
}

function expandirServiciosSesion(detalles, serviciosPorComboId) {
  const servicios = []

  detalles.forEach((detalle) => {
    if (detalle.servicio_id) {
      servicios.push(detalle.servicio_id)
    }

    if (detalle.combo_id) {
      const serviciosCombo = serviciosPorComboId[detalle.combo_id] || []
      servicios.push(...serviciosCombo)
    }
  })

  return servicios
}

function agruparCostosPorServicio(costosServicio) {
  const agrupado = {}

  costosServicio.forEach((costo) => {
    if (!costo.servicio_id) return

    if (!agrupado[costo.servicio_id]) {
      agrupado[costo.servicio_id] = []
    }

    agrupado[costo.servicio_id].push(costo)
  })

  return agrupado
}

function agruparServiciosPorCombo(comboServicios) {
  const agrupado = {}

  comboServicios.forEach((item) => {
    if (!item.combo_id || !item.servicio_id) return

    if (!agrupado[item.combo_id]) {
      agrupado[item.combo_id] = []
    }

    agrupado[item.combo_id].push(item.servicio_id)
  })

  return agrupado
}

function agregarInfoVencimiento(producto, ahora) {
  const fechaVencimiento = parsearFecha(producto.proximoVencimiento)

  if (!fechaVencimiento) {
    return {
      ...producto,
      diasVencimiento: null,
      proximoVencimientoTexto: 'Sin vencimiento cargado',
      nivelVencimientoLabel: 'Sin fecha',
      nivelVencimientoClass: 'bg-stone-100 text-stone-500'
    }
  }

  const dias = diferenciaDias(ahora, fechaVencimiento)

  let nivelVencimientoLabel = 'Precaución'
  let nivelVencimientoClass = 'bg-yellow-100 text-yellow-700'

  if (dias <= 30) {
    nivelVencimientoLabel = dias < 0 ? 'Vencido' : 'Crítico'
    nivelVencimientoClass = 'bg-red-100 text-red-700'
  } else if (dias <= 60) {
    nivelVencimientoLabel = 'Atención'
    nivelVencimientoClass = 'bg-orange-100 text-orange-700'
  }

  return {
    ...producto,
    diasVencimiento: dias,
    proximoVencimientoTexto: `Vence: ${formatearFecha(fechaVencimiento)}`,
    nivelVencimientoLabel,
    nivelVencimientoClass
  }
}

function obtenerConfigPDF(tipo, datos, diasSinMovimiento) {
  if (tipo === 'reposicion') {
    return {
      titulo: 'Productos a reponer',
      nombreArchivo: 'productos-a-reponer',
      columnas: ['Código', 'Producto', 'Unidades', 'Stock mínimo', 'Costo unidad'],
      filas: datos.productosAReponer.map((producto) => [
        producto.codigo,
        producto.descripcion,
        producto.unidadesEnteras,
        producto.stockMinimo,
        formatearDinero(producto.costoUnidad)
      ])
    }
  }

  if (tipo === 'vencimientos') {
    return {
      titulo: 'Alerta de vencimientos',
      nombreArchivo: 'alerta-vencimientos',
      columnas: ['Código', 'Producto', 'Vencimiento', 'Días', 'Nivel'],
      filas: datos.productosPorVencer.map((producto) => [
        producto.codigo,
        producto.descripcion,
        producto.proximoVencimientoTexto,
        producto.diasVencimiento,
        producto.nivelVencimientoLabel
      ])
    }
  }

  if (tipo === 'sin-movimientos') {
    return {
      titulo: `Productos sin movimientos por más de ${diasSinMovimiento} días`,
      nombreArchivo: 'productos-sin-movimientos',
      columnas: ['Código', 'Producto', 'Unidades', 'Cantidad suelta', 'Último movimiento', 'Días sin movimiento'],
      filas: datos.productosSinMovimientos.map((producto) => [
        producto.codigo,
        producto.descripcion,
        producto.unidadesEnteras,
        producto.cantidadSuelta,
        producto.ultimoMovimientoTexto,
        producto.diasSinMovimiento === null ? 'Sin movimientos' : producto.diasSinMovimiento
      ])
    }
  }

  return null
}

function obtenerInicioPeriodo(periodo, ahora) {
  if (periodo === 'todo') return null

  const inicio = new Date(ahora)

  if (periodo === '30') {
    inicio.setDate(inicio.getDate() - 30)
    inicio.setHours(0, 0, 0, 0)
    return inicio
  }

  if (periodo === '90') {
    inicio.setDate(inicio.getDate() - 90)
    inicio.setHours(0, 0, 0, 0)
    return inicio
  }

  if (periodo === 'anio') {
    return new Date(ahora.getFullYear(), 0, 1)
  }

  return null
}

function estaDentroDelPeriodo(fecha, inicioPeriodo) {
  if (!inicioPeriodo) return true

  return fecha >= inicioPeriodo
}

function tieneStockActual(producto) {
  return Number(producto.unidadesEnteras || 0) > 0 || Number(producto.cantidadSuelta || 0) > 0
}

function esProductoInsumo(productoId, costosServicio) {
  return costosServicio.some((costo) => costo.producto_id === productoId)
}

function indexarPorId(items) {
  const indexado = {}

  items.forEach((item) => {
    indexado[item.id] = item
  })

  return indexado
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

function diferenciaDias(desde, hasta) {
  const inicio = new Date(desde)
  const fin = new Date(hasta)

  inicio.setHours(0, 0, 0, 0)
  fin.setHours(0, 0, 0, 0)

  return Math.ceil((fin - inicio) / 86400000)
}

function ordenarDesc(items, key) {
  return [...items].sort((a, b) => Number(b[key] || 0) - Number(a[key] || 0))
}

function ordenarAsc(items, key) {
  return [...items].sort((a, b) => Number(a[key] || 0) - Number(b[key] || 0))
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