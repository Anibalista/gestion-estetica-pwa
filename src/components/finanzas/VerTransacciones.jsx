// src/components/finanzas/VerTransacciones.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CreditCard,
  Download,
  Plus,
  RefreshCw,
  Search,
  Wallet,
  X
} from 'lucide-react'

const PERIODOS = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'anio', label: 'Año' },
  { value: 'todo', label: 'Todo' }
]

const TIPOS_MOVIMIENTO = ['Todos', 'Ingreso', 'Egreso', 'Ajuste', 'Anulacion']
const TIPOS_CAJA = ['Todas', 'Efectivo', 'Mercado Pago']
const MEDIOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta']

const CATEGORIAS = [
  'Sesion',
  'Venta',
  'Compra de insumos',
  'Proveedor',
  'Seña',
  'Retiro',
  'Gasto fijo',
  'Comision',
  'Ajuste manual',
  'Anulacion',
  'Otro'
]

export function VerTransacciones({
  session,
  empresaActiva,
  rolEmpresa
}) {
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [transacciones, setTransacciones] = useState([])

  const [periodo, setPeriodo] = useState('dia')
  const [fechaBase, setFechaBase] = useState(obtenerFechaInput(new Date()))
  const [tipoMovimiento, setTipoMovimiento] = useState('Todos')
  const [tipoCaja, setTipoCaja] = useState('Todas')
  const [busqueda, setBusqueda] = useState('')

  const [modalMovimiento, setModalMovimiento] = useState(false)
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false)
  const [feedbackMovimiento, setFeedbackMovimiento] = useState(null)

  const [formMovimiento, setFormMovimiento] = useState({
    tipo_movimiento: 'Egreso',
    medio_pago: 'Efectivo',
    categoria: 'Compra de insumos',
    descripcion: '',
    observaciones: '',
    monto: ''
  })

  const puedeVerEmpresaCompleta = ['Dueño', 'Administrador', 'Recepcionista'].includes(rolEmpresa)

  useEffect(() => {
    if (session?.user?.id && empresaActiva?.id) {
      cargarTransacciones()
    }
  }, [session?.user?.id, empresaActiva?.id, rolEmpresa, periodo, fechaBase])

  const cargarTransacciones = async () => {
    setLoading(true)
    setErrorCarga('')

    try {
      const rango = obtenerRangoFechas(periodo, fechaBase)

      let query = supabase
        .from('caja_movimientos')
        .select(`
          id,
          caja_id,
          empresa_id,
          profesional_id,
          tipo_movimiento,
          medio_pago,
          tipo_caja,
          monto,
          descripcion,
          categoria,
          observaciones,
          venta_id,
          sesion_id,
          creado_por,
          movimiento_relacionado_id,
          fecha_operativa,
          created_at,
          profesional:profesionales!caja_movimientos_profesional_id_fkey (
            id,
            nombre_negocio
          ),
          creador:profesionales!caja_movimientos_creado_por_fkey (
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
              nombre,
              telefono
            )
          )
        `)
        .eq('empresa_id', empresaActiva.id)
        .order('created_at', { ascending: false })

      if (!puedeVerEmpresaCompleta) {
        query = query.eq('profesional_id', session.user.id)
      }

      if (rango.desde && rango.hasta) {
        query = query
          .gte('fecha_operativa', rango.desde)
          .lte('fecha_operativa', rango.hasta)
      }

      const { data, error } = await query

      if (error) throw error

      setTransacciones(data || [])
    } catch (error) {
      console.error('Error cargando transacciones:', error)
      setErrorCarga(error.message || 'No se pudieron cargar las transacciones.')
      setTransacciones([])
    } finally {
      setLoading(false)
    }
  }

  const transaccionesFiltradas = useMemo(() => {
    return transacciones.filter((item) => {
      const matchTipoMovimiento =
        tipoMovimiento === 'Todos' ||
        item.tipo_movimiento === tipoMovimiento

      const matchTipoCaja =
        tipoCaja === 'Todas' ||
        item.tipo_caja === tipoCaja

      const termino = busqueda.trim().toLowerCase()

      const textoBusqueda = [
        item.descripcion,
        item.categoria,
        item.observaciones,
        item.medio_pago,
        item.tipo_caja,
        item.tipo_movimiento,
        item.profesional?.nombre_negocio,
        item.ventas?.numero_venta,
        item.sesiones?.clientes?.nombre,
        item.sesiones?.clientes?.telefono
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchBusqueda =
        !termino ||
        textoBusqueda.includes(termino)

      return matchTipoMovimiento && matchTipoCaja && matchBusqueda
    })
  }, [transacciones, tipoMovimiento, tipoCaja, busqueda])

  const totales = useMemo(() => {
    return transaccionesFiltradas.reduce((acc, item) => {
      const monto = Number(item.monto || 0)

      if (monto >= 0) {
        acc.ingresos += monto
      } else {
        acc.egresos += Math.abs(monto)
      }

      acc.neto += monto

      if (item.tipo_caja === 'Efectivo') {
        acc.efectivo += monto
      }

      if (item.tipo_caja === 'Mercado Pago') {
        acc.mercadoPago += monto
      }

      return acc
    }, {
      ingresos: 0,
      egresos: 0,
      neto: 0,
      efectivo: 0,
      mercadoPago: 0
    })
  }, [transaccionesFiltradas])

  const handleChangeMovimiento = (campo, valor) => {
    setFormMovimiento((prev) => ({
      ...prev,
      [campo]: valor
    }))
  }

  const guardarMovimientoManual = async (e) => {
    e.preventDefault()
    setFeedbackMovimiento(null)

    if (!empresaActiva?.id) {
      setFeedbackMovimiento({
        tipo: 'error',
        mensaje: 'Debes seleccionar una empresa activa.'
      })
      return
    }

    const monto = Number(formMovimiento.monto || 0)

    if (monto <= 0) {
      setFeedbackMovimiento({
        tipo: 'error',
        mensaje: 'El monto debe ser mayor a cero.'
      })
      return
    }

    if (!formMovimiento.descripcion.trim()) {
      setFeedbackMovimiento({
        tipo: 'error',
        mensaje: 'La descripción es obligatoria.'
      })
      return
    }

    if (formMovimiento.categoria === 'Otro' && !formMovimiento.observaciones.trim()) {
      setFeedbackMovimiento({
        tipo: 'error',
        mensaje: 'Si la categoría es Otro, cargá una observación.'
      })
      return
    }

    setGuardandoMovimiento(true)

    try {
      const { error } = await supabase.rpc('registrar_movimiento_caja', {
        p_empresa_id: empresaActiva.id,
        p_profesional_id: session.user.id,
        p_medio_pago: formMovimiento.medio_pago,
        p_tipo_movimiento: formMovimiento.tipo_movimiento,
        p_monto: monto,
        p_descripcion: formMovimiento.descripcion.trim(),
        p_categoria: formMovimiento.categoria,
        p_observaciones: formMovimiento.observaciones.trim() || null,
        p_venta_id: null,
        p_sesion_id: null,
        p_creado_por: session.user.id,
        p_movimiento_relacionado_id: null
      })

      if (error) throw error

      setModalMovimiento(false)
      setFormMovimiento({
        tipo_movimiento: 'Egreso',
        medio_pago: 'Efectivo',
        categoria: 'Compra de insumos',
        descripcion: '',
        observaciones: '',
        monto: ''
      })

      await cargarTransacciones()
    } catch (error) {
      console.error('Error guardando movimiento manual:', error)

      setFeedbackMovimiento({
        tipo: 'error',
        mensaje: error.message || 'No se pudo registrar el movimiento.'
      })
    } finally {
      setGuardandoMovimiento(false)
    }
  }

  const exportarCSV = () => {
    const filas = [
      [
        'Fecha',
        'Tipo',
        'Caja',
        'Medio de pago',
        'Categoria',
        'Descripcion',
        'Profesional',
        'Cliente',
        'Monto'
      ],
      ...transaccionesFiltradas.map((item) => [
        formatearFechaHora(item.created_at),
        item.tipo_movimiento,
        item.tipo_caja,
        item.medio_pago,
        item.categoria || '',
        limpiarCSV(item.descripcion || ''),
        limpiarCSV(item.profesional?.nombre_negocio || ''),
        limpiarCSV(item.sesiones?.clientes?.nombre || ''),
        Number(item.monto || 0)
      ])
    ]

    const csv = filas
      .map((fila) => fila.map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `transacciones-${empresaActiva?.nombre || 'empresa'}-${fechaBase}.csv`
    link.click()

    URL.revokeObjectURL(url)
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
          No se pudieron cargar las transacciones
        </h2>

        <p className="text-red-500 mb-6">
          {errorCarga}
        </p>

        <button
          type="button"
          onClick={cargarTransacciones}
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
            Ver Transacciones
          </h2>

          <p className="text-sm text-stone-500 font-light italic">
            Movimientos diarios de caja, ingresos, egresos, ajustes y anulaciones.
          </p>

          <p className="text-xs text-stone-400 mt-1">
            Empresa activa:{' '}
            <span className="font-bold text-teal-600">
              {empresaActiva?.nombre || 'Sin empresa'}
            </span>
            {' · '}
            {puedeVerEmpresaCompleta
              ? 'Mostrando movimientos de la empresa'
              : 'Mostrando solo tus movimientos'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={exportarCSV}
            className="px-4 py-3 rounded-2xl bg-white border border-stone-200 text-stone-700 text-sm font-bold hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() => {
              setFeedbackMovimiento(null)
              setModalMovimiento(true)
            }}
            className="px-4 py-3 rounded-2xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Movimiento manual
          </button>
        </div>
      </div>

      <ResumenTotales totales={totales} />

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <FiltroSelect
            label="Período"
            value={periodo}
            onChange={setPeriodo}
            options={PERIODOS}
          />

          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
              Fecha base
            </span>

            <input
              type="date"
              value={fechaBase}
              onChange={(e) => setFechaBase(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm bg-white text-stone-600 border border-stone-200 outline-none focus:ring-2 focus:ring-teal-500"
            />
          </label>

          <FiltroSelectSimple
            label="Movimiento"
            value={tipoMovimiento}
            onChange={setTipoMovimiento}
            options={TIPOS_MOVIMIENTO}
          />

          <FiltroSelectSimple
            label="Caja"
            value={tipoCaja}
            onChange={setTipoCaja}
            options={TIPOS_CAJA}
          />

          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
              Buscar
            </span>

            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />

              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Cliente, venta, categoría..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-white text-stone-600 border border-stone-200 outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </label>
        </div>
      </div>

      <TablaTransacciones transacciones={transaccionesFiltradas} />

      {modalMovimiento && (
        <ModalMovimiento
          formMovimiento={formMovimiento}
          feedbackMovimiento={feedbackMovimiento}
          guardandoMovimiento={guardandoMovimiento}
          onChange={handleChangeMovimiento}
          onGuardar={guardarMovimientoManual}
          onCerrar={() => setModalMovimiento(false)}
        />
      )}
    </div>
  )
}

function ResumenTotales({ totales }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      <ResumenCard
        titulo="Ingresos"
        valor={formatearDinero(totales.ingresos)}
        descripcion="Montos positivos"
        Icon={Wallet}
      />

      <ResumenCard
        titulo="Egresos"
        valor={formatearDinero(totales.egresos)}
        descripcion="Montos negativos"
        Icon={Banknote}
      />

      <ResumenCard
        titulo="Neto"
        valor={formatearDinero(totales.neto)}
        descripcion="Ingresos - egresos"
        Icon={CalendarDays}
      />

      <ResumenCard
        titulo="Efectivo"
        valor={formatearDinero(totales.efectivo)}
        descripcion="Caja efectivo"
        Icon={Banknote}
      />

      <ResumenCard
        titulo="Mercado Pago"
        valor={formatearDinero(totales.mercadoPago)}
        descripcion="Transferencia + tarjeta"
        Icon={CreditCard}
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

          <p className="text-xs text-stone-500 mt-1">
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

function TablaTransacciones({ transacciones }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-stone-600">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-bold">
            <tr>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Movimiento</th>
              <th className="px-6 py-4">Caja / Pago</th>
              <th className="px-6 py-4">Detalle</th>
              <th className="px-6 py-4">Profesional</th>
              <th className="px-6 py-4 text-right">Monto</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100">
            {transacciones.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-stone-400 font-light">
                  No hay transacciones para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              transacciones.map((item) => {
                const monto = Number(item.monto || 0)
                const esNegativo = monto < 0

                return (
                  <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-stone-700">
                        {formatearFecha(item.fecha_operativa)}
                      </p>

                      <p className="text-xs text-stone-400">
                        {formatearHora(item.created_at)}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${obtenerClaseMovimiento(item.tipo_movimiento)}`}>
                        {item.tipo_movimiento}
                      </span>

                      <p className="text-xs text-stone-400 mt-1">
                        {item.categoria || 'Sin categoría'}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-bold text-stone-700">
                        {item.tipo_caja}
                      </p>

                      <p className="text-xs text-stone-400">
                        {item.medio_pago}
                      </p>
                    </td>

                    <td className="px-6 py-4 max-w-md">
                      <p className="font-medium text-stone-700 truncate" title={item.descripcion || ''}>
                        {item.descripcion || 'Sin descripción'}
                      </p>

                      <p className="text-xs text-stone-400 truncate mt-1">
                        {item.ventas?.numero_venta
                          ? `Venta ${item.ventas.numero_venta}`
                          : item.sesiones?.clientes?.nombre
                            ? `Cliente: ${item.sesiones.clientes.nombre}`
                            : item.observaciones || 'Movimiento manual'}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      {item.profesional?.nombre_negocio || 'Sin profesional'}
                    </td>

                    <td className={`px-6 py-4 text-right font-black ${esNegativo ? 'text-red-600' : 'text-teal-700'}`}>
                      {formatearDinero(monto)}
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

function ModalMovimiento({
  formMovimiento,
  feedbackMovimiento,
  guardandoMovimiento,
  onChange,
  onGuardar,
  onCerrar
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={onGuardar}
        className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-stone-100 flex items-start justify-between gap-4 bg-stone-50">
          <div>
            <h2 className="text-xl font-light text-stone-800">
              Movimiento manual
            </h2>

            <p className="text-sm text-stone-500 mt-1">
              Registrá ingresos, egresos, ajustes o movimientos excepcionales.
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="p-2 rounded-xl text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {feedbackMovimiento && (
            <div className="p-4 rounded-xl text-sm font-bold bg-red-50 text-red-700 border border-red-100">
              {feedbackMovimiento.mensaje}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Tipo de movimiento">
              <select
                value={formMovimiento.tipo_movimiento}
                onChange={(e) => onChange('tipo_movimiento', e.target.value)}
                className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none bg-white focus:ring-2 focus:ring-teal-500"
              >
                <option value="Ingreso">Ingreso</option>
                <option value="Egreso">Egreso</option>
                <option value="Ajuste">Ajuste</option>
              </select>
            </Campo>

            <Campo label="Medio de pago">
              <select
                value={formMovimiento.medio_pago}
                onChange={(e) => onChange('medio_pago', e.target.value)}
                className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none bg-white focus:ring-2 focus:ring-teal-500"
              >
                {MEDIOS_PAGO.map((medio) => (
                  <option key={medio} value={medio}>
                    {medio}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Categoría">
              <select
                value={formMovimiento.categoria}
                onChange={(e) => onChange('categoria', e.target.value)}
                className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none bg-white focus:ring-2 focus:ring-teal-500"
              >
                {CATEGORIAS
                  .filter((categoria) => !['Sesion', 'Venta', 'Anulacion'].includes(categoria))
                  .map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
              </select>
            </Campo>

            <Campo label="Monto">
              <input
                type="number"
                step="0.01"
                value={formMovimiento.monto}
                onChange={(e) => onChange('monto', e.target.value)}
                className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              />
            </Campo>
          </div>

          <Campo label="Descripción">
            <input
              type="text"
              value={formMovimiento.descripcion}
              onChange={(e) => onChange('descripcion', e.target.value)}
              placeholder="Ej: compra de cremas, retiro de caja, ajuste por diferencia..."
              className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
            />
          </Campo>

          <Campo label="Observaciones">
            <textarea
              value={formMovimiento.observaciones}
              onChange={(e) => onChange('observaciones', e.target.value)}
              rows={3}
              placeholder="Obligatorio si la categoría es Otro."
              className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </Campo>
        </div>

        <div className="p-5 border-t border-stone-100 flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="px-5 py-3 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={guardandoMovimiento}
            className="px-5 py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:bg-stone-300 transition-colors"
          >
            {guardandoMovimiento ? 'Guardando...' : 'Guardar movimiento'}
          </button>
        </div>
      </form>
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

function FiltroSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
        {label}
      </span>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl text-sm bg-white text-stone-600 border border-stone-200 outline-none focus:ring-2 focus:ring-teal-500"
      >
        {options.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function FiltroSelectSimple({ label, value, onChange, options }) {
  return (
    <FiltroSelect
      label={label}
      value={value}
      onChange={onChange}
      options={options.map((option) => ({
        value: option,
        label: option
      }))}
    />
  )
}

function obtenerRangoFechas(periodo, fechaBase) {
  if (periodo === 'todo') {
    return {
      desde: null,
      hasta: null
    }
  }

  const fecha = crearFechaLocal(fechaBase)

  if (periodo === 'dia') {
    return {
      desde: obtenerFechaInput(fecha),
      hasta: obtenerFechaInput(fecha)
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
      hasta: obtenerFechaInput(fin)
    }
  }

  if (periodo === 'mes') {
    const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
    const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)

    return {
      desde: obtenerFechaInput(inicio),
      hasta: obtenerFechaInput(fin)
    }
  }

  if (periodo === 'anio') {
    const inicio = new Date(fecha.getFullYear(), 0, 1)
    const fin = new Date(fecha.getFullYear(), 11, 31)

    return {
      desde: obtenerFechaInput(inicio),
      hasta: obtenerFechaInput(fin)
    }
  }

  return {
    desde: null,
    hasta: null
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

function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha'

  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR')
}

function formatearHora(fecha) {
  if (!fecha) return ''

  return new Date(fecha).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatearFechaHora(fecha) {
  if (!fecha) return ''

  return new Date(fecha).toLocaleString('es-AR')
}

function formatearDinero(valor) {
  const numero = Number(valor || 0)

  return `$${numero.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

function obtenerClaseMovimiento(tipo) {
  if (tipo === 'Ingreso') return 'bg-teal-100 text-teal-700'
  if (tipo === 'Egreso') return 'bg-red-100 text-red-700'
  if (tipo === 'Anulacion') return 'bg-orange-100 text-orange-700'
  if (tipo === 'Ajuste') return 'bg-blue-100 text-blue-700'

  return 'bg-stone-100 text-stone-600'
}

function limpiarCSV(valor) {
  return String(valor || '').replace(/\n/g, ' ').replace(/\r/g, ' ')
}