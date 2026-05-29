// src/components/finanzas/CierreCaja.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  History,
  LockKeyhole,
  RefreshCw,
  Save,
  Wallet
} from 'lucide-react'

const ROLES_CIERRAN_HOY = ['Dueño', 'Administrador', 'Recepcionista']
const ROLES_CIERRAN_HISTORICO = ['Dueño', 'Administrador']

export function CierreCaja({
  session,
  empresaActiva,
  rolEmpresa
}) {
  const [loading, setLoading] = useState(true)
  const [cerrando, setCerrando] = useState(false)
  const [errorCarga, setErrorCarga] = useState('')

  const [fechaConsulta, setFechaConsulta] = useState(obtenerFechaInput(new Date()))
  const [movimientos, setMovimientos] = useState([])
  const [cierreExistente, setCierreExistente] = useState(null)
  const [detallesCierre, setDetallesCierre] = useState([])
  const [cierresPrevios, setCierresPrevios] = useState([])
  const [movimientosPendientes, setMovimientosPendientes] = useState([])

  const [montoContadoEfectivo, setMontoContadoEfectivo] = useState('')
  const [montoContadoMercadoPago, setMontoContadoMercadoPago] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const esHoy = fechaConsulta === obtenerFechaInput(new Date())
  const esHistorico = !esHoy
  const hayMovimientosPendientes = movimientosPendientes.length > 0

  const puedeCerrarCajaHoy = ROLES_CIERRAN_HOY.includes(rolEmpresa)
  const puedeCerrarCajaHistorica = ROLES_CIERRAN_HISTORICO.includes(rolEmpresa)

  const puedeCerrarFechaSeleccionada = esHoy
    ? puedeCerrarCajaHoy
    : puedeCerrarCajaHistorica

  useEffect(() => {
    if (session?.user?.id && empresaActiva?.id) {
      cargarDatos()
    }
  }, [session?.user?.id, empresaActiva?.id, fechaConsulta])

  const cargarDatos = async () => {
    setLoading(true)
    setErrorCarga('')

    try {
      const [
        movimientosResponse,
        movimientosPendientesResponse,
        cierreResponse,
        cierresPreviosResponse
      ] = await Promise.all([
        supabase
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
            cierre_diario_id,
            profesional:profesionales!caja_movimientos_profesional_id_fkey (
              id,
              nombre_negocio
            )
          `)
          .eq('empresa_id', empresaActiva.id)
          .eq('fecha_operativa', fechaConsulta)
          .order('created_at', { ascending: false }),

        supabase
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
            cierre_diario_id,
            profesional:profesionales!caja_movimientos_profesional_id_fkey (
              id,
              nombre_negocio
            )
          `)
          .eq('empresa_id', empresaActiva.id)
          .eq('fecha_operativa', fechaConsulta)
          .is('cierre_diario_id', null)
          .order('created_at', { ascending: false }),

        supabase
          .from('cierres_diarios')
          .select(`
            id,
            empresa_id,
            fecha_operativa,
            numero_cierre,
            cerrado_por,
            total_sistema,
            total_contado,
            diferencia_total,
            observaciones_generales,
            fecha_cierre,
            cerrador:profesionales!cierres_diarios_cerrado_por_fkey (
              id,
              nombre_negocio
            )
          `)
          .eq('empresa_id', empresaActiva.id)
          .eq('fecha_operativa', fechaConsulta)
          .order('numero_cierre', { ascending: false }),

        supabase
          .from('cierres_diarios')
          .select(`
            id,
            empresa_id,
            fecha_operativa,
            numero_cierre,
            total_sistema,
            total_contado,
            diferencia_total,
            fecha_cierre,
            cerrador:profesionales!cierres_diarios_cerrado_por_fkey (
              id,
              nombre_negocio
            )
          `)
          .eq('empresa_id', empresaActiva.id)
          .order('fecha_operativa', { ascending: false })
          .order('numero_cierre', { ascending: false })
          .limit(10)
      ])

      if (movimientosResponse.error) throw movimientosResponse.error
      if (movimientosPendientesResponse.error) throw movimientosPendientesResponse.error
      if (cierreResponse.error) throw cierreResponse.error
      if (cierresPreviosResponse.error) throw cierresPreviosResponse.error

      const cierresDelDia = cierreResponse.data || []
      const ultimoCierre = cierresDelDia[0] || null

      setMovimientos(movimientosResponse.data || [])
      setMovimientosPendientes(movimientosPendientesResponse.data || [])
      setCierreExistente(ultimoCierre)
      setCierresPrevios(cierresPreviosResponse.data || [])

      if (ultimoCierre?.id) {
        const { data: detalles, error: errorDetalles } = await supabase
          .from('cierres_caja')
          .select('*')
          .eq('cierre_diario_id', ultimoCierre.id)
          .order('tipo_caja', { ascending: true })

        if (errorDetalles) throw errorDetalles

        setDetallesCierre(detalles || [])
      } else {
        setDetallesCierre([])
      }
    } catch (error) {
      console.error('Error cargando cierre de caja:', error)
      setErrorCarga(error.message || 'No se pudo cargar el cierre de caja.')
    } finally {
      setLoading(false)
    }
  }

  const resumen = useMemo(() => {
    return movimientosPendientes.reduce((acc, item) => {
      const monto = Number(item.monto || 0)

      if (item.tipo_caja === 'Efectivo') {
        acc.efectivo += monto
      }

      if (item.tipo_caja === 'Mercado Pago') {
        acc.mercadoPago += monto
      }

      if (monto >= 0) {
        acc.ingresos += monto
      } else {
        acc.egresos += Math.abs(monto)
      }

      acc.total += monto

      return acc
    }, {
      efectivo: 0,
      mercadoPago: 0,
      ingresos: 0,
      egresos: 0,
      total: 0
    })
  }, [movimientosPendientes])

  const diferenciaEfectivo = Number(montoContadoEfectivo || 0) - resumen.efectivo
  const diferenciaMercadoPago = Number(montoContadoMercadoPago || 0) - resumen.mercadoPago
  const totalContado = Number(montoContadoEfectivo || 0) + Number(montoContadoMercadoPago || 0)
  const diferenciaTotal = totalContado - resumen.total

  const volverAHoy = () => {
    setFechaConsulta(obtenerFechaInput(new Date()))
  }

  const limpiarFormularioCierre = () => {
    setMontoContadoEfectivo('')
    setMontoContadoMercadoPago('')
    setObservaciones('')
  }

  const cerrarCaja = async (e) => {
    e.preventDefault()

    if (!puedeCerrarFechaSeleccionada) {
      alert(
        esHoy
          ? 'Tu rol no tiene permiso para cerrar caja.'
          : 'Solo Dueño o Administrador pueden cerrar cajas de fechas anteriores.'
      )
      return
    }

    if (!empresaActiva?.id) {
      alert('Debes seleccionar una empresa activa.')
      return
    }

    if (!hayMovimientosPendientes) {
      alert('No hay movimientos pendientes de cierre para esta fecha.')
      return
    }

    const tipoCierre = esHoy
      ? 'caja del día actual'
      : `caja histórica del ${formatearFecha(fechaConsulta)}`

    const confirmar = window.confirm(
      `Vas a cerrar la ${tipoCierre}.\n\n` +
      `Fecha operativa: ${formatearFecha(fechaConsulta)}\n` +
      `Fecha/hora de registro del cierre: ahora\n\n` +
      `Sistema: ${formatearDinero(resumen.total)}\n` +
      `Contado: ${formatearDinero(totalContado)}\n` +
      `Diferencia: ${formatearDinero(diferenciaTotal)}\n\n` +
      `Las transacciones conservarán su fecha original. ¿Confirmás el cierre?`
    )

    if (!confirmar) return

    setCerrando(true)

    try {
      const { error } = await supabase.rpc('cerrar_caja_diaria', {
        p_empresa_id: empresaActiva.id,
        p_fecha_operativa: fechaConsulta,
        p_monto_contado_efectivo: Number(montoContadoEfectivo || 0),
        p_monto_contado_mercado_pago: Number(montoContadoMercadoPago || 0),
        p_cerrado_por: session.user.id,
        p_observaciones_generales: observaciones.trim() || null,
        p_fecha_cierre: new Date().toISOString()
      })

      if (error) throw error

      limpiarFormularioCierre()
      await cargarDatos()
    } catch (error) {
      console.error('Error cerrando caja:', error)
      alert('No se pudo cerrar la caja. ' + error.message)
    } finally {
      setCerrando(false)
    }
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
          No se pudo cargar el cierre
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
      <HeaderCierre
        empresaActiva={empresaActiva}
        fechaConsulta={fechaConsulta}
        setFechaConsulta={setFechaConsulta}
        esHoy={esHoy}
        onVolverHoy={volverAHoy}
        onActualizar={cargarDatos}
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 flex flex-col gap-6">
          {esHistorico && (
            <AvisoCierreHistorico
              fechaConsulta={fechaConsulta}
              rolEmpresa={rolEmpresa}
              puedeCerrarCajaHistorica={puedeCerrarCajaHistorica}
              hayMovimientosPendientes={hayMovimientosPendientes}
            />
          )}

          {cierreExistente && (
            <>
              <CierreRealizado
                cierre={cierreExistente}
                detalles={detallesCierre}
              />

              {hayMovimientosPendientes && (
                <AvisoMovimientosPendientes
                  movimientosPendientes={movimientosPendientes}
                  resumen={resumen}
                  esHoy={esHoy}
                />
              )}

              {!hayMovimientosPendientes && esHoy && (
                <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 text-teal-800">
                  <h3 className="font-black">
                    No hay movimientos pendientes
                  </h3>

                  <p className="text-sm mt-1">
                    La caja del día ya fue cerrada y no se registraron movimientos nuevos después del cierre.
                  </p>
                </div>
              )}

              <TablaMovimientos
                movimientos={movimientos}
                titulo="Todos los movimientos registrados en esta fecha"
              />
            </>
          )}

          {!cierreExistente && !esHoy && (
            <>
              <SinCierreHistorico
                fechaConsulta={fechaConsulta}
                resumen={resumen}
                puedeCerrarCajaHistorica={puedeCerrarCajaHistorica}
                hayMovimientosPendientes={hayMovimientosPendientes}
              />

              {!hayMovimientosPendientes && (
                <>
                  <ResumenCaja resumen={resumen} />

                  <TablaMovimientos
                    movimientos={movimientos}
                    titulo="Movimientos registrados en esta fecha"
                  />
                </>
              )}
            </>
          )}

          {hayMovimientosPendientes && puedeCerrarFechaSeleccionada && (
            <>
              <ResumenCaja resumen={resumen} />

              <FormularioCierre
                cerrarCaja={cerrarCaja}
                cerrando={cerrando}
                cierreExistente={cierreExistente}
                esHoy={esHoy}
                fechaConsulta={fechaConsulta}
                resumen={resumen}
                montoContadoEfectivo={montoContadoEfectivo}
                setMontoContadoEfectivo={setMontoContadoEfectivo}
                montoContadoMercadoPago={montoContadoMercadoPago}
                setMontoContadoMercadoPago={setMontoContadoMercadoPago}
                diferenciaEfectivo={diferenciaEfectivo}
                diferenciaMercadoPago={diferenciaMercadoPago}
                totalContado={totalContado}
                diferenciaTotal={diferenciaTotal}
                observaciones={observaciones}
                setObservaciones={setObservaciones}
                hayMovimientosPendientes={hayMovimientosPendientes}
              />

              <TablaMovimientos
                movimientos={movimientosPendientes}
                titulo={
                  cierreExistente
                    ? 'Movimientos pendientes de cierre'
                    : esHoy
                      ? 'Movimientos incluidos en el cierre'
                      : 'Movimientos históricos pendientes de cierre'
                }
              />
            </>
          )}

          {hayMovimientosPendientes && !puedeCerrarFechaSeleccionada && (
            <>
              <ResumenCaja resumen={resumen} />

              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-amber-800 flex gap-3">
                <LockKeyhole className="w-5 h-5 shrink-0 mt-0.5" />

                <div>
                  <h3 className="font-black">
                    Hay movimientos pendientes, pero tu rol no puede cerrarlos
                  </h3>

                  <p className="text-sm mt-1">
                    {esHoy
                      ? 'Solicitá a un usuario con permiso de cierre de caja.'
                      : 'Las cajas históricas solo pueden ser cerradas por Dueño o Administrador.'}
                  </p>
                </div>
              </div>

              <TablaMovimientos
                movimientos={movimientosPendientes}
                titulo="Movimientos pendientes de cierre"
              />
            </>
          )}

          {esHoy && !hayMovimientosPendientes && !cierreExistente && (
            <>
              <ResumenCaja resumen={resumen} />

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 text-center">
                <FileCheck2 className="w-14 h-14 mx-auto text-stone-300 mb-4" />

                <h3 className="text-xl font-light text-stone-800 mb-2">
                  Sin movimientos pendientes
                </h3>

                <p className="text-stone-500">
                  Todavía no hay movimientos para cerrar en la fecha seleccionada.
                </p>
              </div>
            </>
          )}
        </div>

        <aside className="xl:col-span-1">
          <HistorialCierres
            cierres={cierresPrevios}
            fechaConsulta={fechaConsulta}
            onSeleccionarFecha={setFechaConsulta}
          />
        </aside>
      </div>
    </div>
  )
}

function FormularioCierre({
  cerrarCaja,
  cerrando,
  cierreExistente,
  esHoy,
  fechaConsulta,
  resumen,
  montoContadoEfectivo,
  setMontoContadoEfectivo,
  montoContadoMercadoPago,
  setMontoContadoMercadoPago,
  diferenciaEfectivo,
  diferenciaMercadoPago,
  totalContado,
  diferenciaTotal,
  observaciones,
  setObservaciones,
  hayMovimientosPendientes
}) {
  return (
    <form
      onSubmit={cerrarCaja}
      className="grid grid-cols-1 xl:grid-cols-3 gap-6"
    >
      <section className="xl:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
            <FileCheck2 className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-lg font-light text-stone-800">
              {esHoy
                ? cierreExistente
                  ? 'Conteo de movimientos pendientes'
                  : 'Conteo del día'
                : 'Conteo de caja histórica pendiente'}
            </h3>

            <p className="text-xs text-stone-400">
              {esHoy
                ? cierreExistente
                  ? 'Cargá lo contado únicamente para los movimientos posteriores al último cierre.'
                  : 'Cargá lo contado por la profesional o administradora.'
                : `Estás cerrando movimientos pendientes del ${formatearFecha(fechaConsulta)}. La fecha operativa no se moverá al día actual.`}
            </p>
          </div>
        </div>

        {!esHoy && (
          <div className="mb-5 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-amber-800 text-sm">
            <strong>Atención:</strong> este cierre se registrará ahora, pero corresponderá operativamente al día{' '}
            <strong>{formatearFecha(fechaConsulta)}</strong>.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Campo label="Efectivo contado">
            <input
              type="number"
              step="0.01"
              value={montoContadoEfectivo}
              onChange={(e) => setMontoContadoEfectivo(e.target.value)}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-lg font-black text-stone-800"
              placeholder="0.00"
            />
          </Campo>

          <Campo label="Mercado Pago contado">
            <input
              type="number"
              step="0.01"
              value={montoContadoMercadoPago}
              onChange={(e) => setMontoContadoMercadoPago(e.target.value)}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-lg font-black text-stone-800"
              placeholder="0.00"
            />
          </Campo>

          <DiferenciaBox
            titulo="Diferencia efectivo"
            sistema={resumen.efectivo}
            contado={Number(montoContadoEfectivo || 0)}
            diferencia={diferenciaEfectivo}
          />

          <DiferenciaBox
            titulo="Diferencia Mercado Pago"
            sistema={resumen.mercadoPago}
            contado={Number(montoContadoMercadoPago || 0)}
            diferencia={diferenciaMercadoPago}
          />

          <div className="md:col-span-2">
            <Campo label="Observaciones generales">
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={4}
                placeholder={
                  esHoy
                    ? 'Ej: cierre normal, diferencia por vuelto, transferencia pendiente...'
                    : 'Ej: cierre histórico porque la caja quedó pendiente del día anterior...'
                }
                className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </Campo>
          </div>
        </div>
      </section>

      <aside className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 h-fit">
        <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-4">
          Resumen final
        </h3>

        <div className="space-y-3">
          <ResumenLinea label="Sistema" valor={resumen.total} />
          <ResumenLinea label="Contado" valor={totalContado} />
          <ResumenLinea label="Diferencia" valor={diferenciaTotal} destacar />
        </div>

        <button
          type="submit"
          disabled={cerrando || !hayMovimientosPendientes}
          className="w-full mt-6 px-5 py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:bg-stone-300 transition-colors flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />

          {cerrando
            ? 'Cerrando...'
            : esHoy
              ? cierreExistente
                ? 'Cerrar movimientos pendientes'
                : 'Cerrar caja del día'
              : 'Cerrar caja histórica'}
        </button>
      </aside>
    </form>
  )
}

function HeaderCierre({
  empresaActiva,
  fechaConsulta,
  setFechaConsulta,
  esHoy,
  onVolverHoy,
  onActualizar
}) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 px-2">
      <div>
        <h2 className="text-2xl font-light text-stone-800">
          Cierre de Caja
        </h2>

        <p className="text-sm text-stone-500 font-light italic">
          Compará el monto del sistema contra el dinero contado del día.
        </p>

        <p className="text-xs text-stone-400 mt-1">
          Empresa activa:{' '}
          <span className="font-bold text-teal-600">
            {empresaActiva?.nombre || 'Sin empresa'}
          </span>
          {' · '}
          Fecha consultada: {formatearFecha(fechaConsulta)}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <label className="bg-white border border-stone-200 rounded-2xl px-4 py-2 shadow-sm">
          <span className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
            Fecha
          </span>

          <input
            type="date"
            value={fechaConsulta}
            onChange={(e) => setFechaConsulta(e.target.value)}
            className="outline-none text-sm font-bold text-stone-700 bg-transparent"
          />
        </label>

        {!esHoy && (
          <button
            type="button"
            onClick={onVolverHoy}
            className="px-4 py-3 rounded-2xl bg-white border border-stone-200 text-stone-700 text-sm font-bold hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
          >
            <CalendarDays className="w-4 h-4" />
            Volver a hoy
          </button>
        )}

        <button
          type="button"
          onClick={onActualizar}
          className="px-4 py-3 rounded-2xl bg-white border border-stone-200 text-stone-700 text-sm font-bold hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>
    </div>
  )
}

function AvisoCierreHistorico({
  fechaConsulta,
  rolEmpresa,
  puedeCerrarCajaHistorica,
  hayMovimientosPendientes
}) {
  if (!hayMovimientosPendientes) {
    return null
  }

  return (
    <div className={`rounded-2xl border p-5 flex gap-3 ${
      puedeCerrarCajaHistorica
        ? 'bg-amber-50 border-amber-100 text-amber-800'
        : 'bg-red-50 border-red-100 text-red-700'
    }`}>
      {puedeCerrarCajaHistorica ? (
        <History className="w-5 h-5 shrink-0 mt-0.5" />
      ) : (
        <LockKeyhole className="w-5 h-5 shrink-0 mt-0.5" />
      )}

      <div>
        <h3 className="font-black">
          Caja histórica pendiente: {formatearFecha(fechaConsulta)}
        </h3>

        <p className="text-sm mt-1">
          {puedeCerrarCajaHistorica
            ? 'Podés cerrar esta fecha anterior porque tu rol es Dueño o Administrador. Las transacciones conservarán su fecha original.'
            : `Tu rol actual (${rolEmpresa || 'Sin rol'}) no puede cerrar fechas anteriores. Solicitá a un Dueño o Administrador.`}
        </p>
      </div>
    </div>
  )
}

function AvisoMovimientosPendientes({
  movimientosPendientes,
  resumen,
  esHoy
}) {
  return (
    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-amber-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h3 className="font-black text-amber-800">
          {esHoy
            ? 'Hay movimientos pendientes después del último cierre'
            : 'Hay movimientos históricos pendientes de cierre'}
        </h3>

        <p className="text-sm text-amber-700 mt-1">
          Se detectaron {movimientosPendientes.length} movimiento(s) que todavía no están incluidos en ningún cierre.
        </p>
      </div>

      <div className="bg-white border border-amber-100 rounded-2xl px-5 py-3 text-right shrink-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
          Pendiente sistema
        </p>

        <p className="text-xl font-black text-stone-800">
          {formatearDinero(resumen.total)}
        </p>
      </div>
    </div>
  )
}

function ResumenCaja({ resumen }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      <ResumenCard titulo="Ingresos" valor={resumen.ingresos} descripcion="Montos positivos" Icon={Wallet} />
      <ResumenCard titulo="Egresos" valor={resumen.egresos} descripcion="Montos negativos" Icon={Banknote} />
      <ResumenCard titulo="Total sistema" valor={resumen.total} descripcion="Neto pendiente" Icon={FileCheck2} />
      <ResumenCard titulo="Efectivo" valor={resumen.efectivo} descripcion="Caja efectivo" Icon={Banknote} />
      <ResumenCard titulo="Mercado Pago" valor={resumen.mercadoPago} descripcion="Transferencia + tarjeta" Icon={CreditCard} />
    </div>
  )
}

function ResumenCard({ titulo, valor, descripcion, Icon }) {
  const negativo = Number(valor || 0) < 0

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
            {titulo}
          </p>

          <p className={`text-2xl font-black truncate ${negativo ? 'text-red-600' : 'text-stone-800'}`}>
            {formatearDinero(valor)}
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

function DiferenciaBox({ titulo, sistema, contado, diferencia }) {
  const positivo = diferencia > 0
  const negativo = diferencia < 0
  const exacto = diferencia === 0

  return (
    <div className={`rounded-2xl border p-4 ${
      exacto
        ? 'bg-teal-50 border-teal-100'
        : negativo
          ? 'bg-red-50 border-red-100'
          : 'bg-amber-50 border-amber-100'
    }`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">
        {titulo}
      </p>

      <div className="space-y-1 text-sm">
        <p className="flex justify-between">
          <span className="text-stone-500">Sistema</span>
          <strong>{formatearDinero(sistema)}</strong>
        </p>

        <p className="flex justify-between">
          <span className="text-stone-500">Contado</span>
          <strong>{formatearDinero(contado)}</strong>
        </p>

        <p className={`flex justify-between pt-2 border-t border-white/70 font-black ${
          negativo ? 'text-red-600' : positivo ? 'text-amber-700' : 'text-teal-700'
        }`}>
          <span>Diferencia</span>
          <span>{formatearDinero(diferencia)}</span>
        </p>
      </div>
    </div>
  )
}

function CierreRealizado({ cierre, detalles }) {
  return (
    <div className="bg-white rounded-2xl border border-teal-100 shadow-sm p-8 text-center">
      <CheckCircle2 className="w-16 h-16 mx-auto text-teal-600 mb-4" />

      <p className="text-xs font-black uppercase tracking-widest text-teal-600 mb-2">
        Cierre registrado
      </p>

      <h3 className="text-2xl font-light text-stone-800 mb-2">
        Caja cerrada del {formatearFecha(cierre.fecha_operativa)}
      </h3>

      <p className="text-stone-500 mb-2">
        Este cierre ya fue guardado y se muestra en modo solo lectura.
      </p>

      <p className="text-xs text-stone-400 mb-6">
        Cierre #{cierre.numero_cierre || 1} · Cerrado por: {cierre.cerrador?.nombre_negocio || 'Sin profesional'} · {formatearFechaHora(cierre.fecha_cierre)}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-6">
        <ResumenCard titulo="Sistema" valor={cierre.total_sistema} descripcion="Total esperado" Icon={FileCheck2} />
        <ResumenCard titulo="Contado" valor={cierre.total_contado} descripcion="Total contado" Icon={Wallet} />
        <ResumenCard titulo="Diferencia" valor={cierre.diferencia_total} descripcion="Contado - sistema" Icon={AlertTriangle} />
      </div>

      <div className="max-w-3xl mx-auto bg-stone-50 border border-stone-100 rounded-2xl overflow-hidden text-left">
        <table className="w-full text-sm text-stone-600">
          <thead className="bg-white text-stone-400 uppercase text-[10px] tracking-widest font-black">
            <tr>
              <th className="px-5 py-3">Caja</th>
              <th className="px-5 py-3 text-right">Sistema</th>
              <th className="px-5 py-3 text-right">Contado</th>
              <th className="px-5 py-3 text-right">Diferencia</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100">
            {detalles.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-5 py-8 text-center text-stone-400">
                  No hay detalles cargados para este cierre.
                </td>
              </tr>
            ) : (
              detalles.map((detalle) => (
                <tr key={detalle.id}>
                  <td className="px-5 py-3 font-bold">{detalle.tipo_caja}</td>
                  <td className="px-5 py-3 text-right">{formatearDinero(detalle.monto_sistema)}</td>
                  <td className="px-5 py-3 text-right">{formatearDinero(detalle.monto_contado)}</td>
                  <td className={`px-5 py-3 text-right font-black ${Number(detalle.diferencia || 0) === 0 ? 'text-teal-700' : 'text-red-600'}`}>
                    {formatearDinero(detalle.diferencia)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {cierre.observaciones_generales && (
        <p className="text-sm text-stone-500 mt-5">
          <strong>Observaciones:</strong> {cierre.observaciones_generales}
        </p>
      )}
    </div>
  )
}

function SinCierreHistorico({
  fechaConsulta,
  resumen,
  puedeCerrarCajaHistorica,
  hayMovimientosPendientes
}) {
  return (
    <div className="bg-amber-50 rounded-2xl border border-amber-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="bg-white text-amber-600 rounded-xl p-2 shadow-sm">
          <History className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-amber-800">
            No hay cierre registrado para el {formatearFecha(fechaConsulta)}
          </h3>

          <p className="text-sm text-amber-700 mt-1">
            {hayMovimientosPendientes && puedeCerrarCajaHistorica
              ? 'Se detectaron movimientos pendientes. Podés cerrar esta caja histórica sin mover las transacciones de fecha.'
              : 'Se muestran los movimientos de esa fecha en modo consulta.'}
          </p>
        </div>
      </div>

      <div className="bg-white border border-amber-100 rounded-2xl px-5 py-3 text-right">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
          Total pendiente
        </p>

        <p className="text-xl font-black text-stone-800">
          {formatearDinero(resumen.total)}
        </p>
      </div>
    </div>
  )
}

function HistorialCierres({ cierres, fechaConsulta, onSeleccionarFecha }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden sticky top-0">
      <div className="p-5 border-b border-stone-100 flex items-center gap-3">
        <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
          <History className="w-5 h-5" />
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-stone-500">
            Cierres previos
          </h3>

          <p className="text-xs text-stone-400">
            Últimos cierres registrados.
          </p>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {cierres.length === 0 ? (
          <div className="p-5 text-center text-sm text-stone-400 border border-dashed border-stone-200 rounded-xl">
            Todavía no hay cierres registrados.
          </div>
        ) : (
          cierres.map((cierre) => {
            const activo = cierre.fecha_operativa === fechaConsulta

            return (
              <button
                key={cierre.id}
                type="button"
                onClick={() => onSeleccionarFecha(cierre.fecha_operativa)}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${
                  activo
                    ? 'bg-teal-50 border-teal-200'
                    : 'bg-white border-stone-100 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-stone-800">
                    {formatearFecha(cierre.fecha_operativa)}
                  </p>

                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    Number(cierre.diferencia_total || 0) === 0
                      ? 'text-teal-600'
                      : 'text-red-600'
                  }`}>
                    {Number(cierre.diferencia_total || 0) === 0 ? 'OK' : 'Dif.'}
                  </span>
                </div>

                <p className="text-xs text-stone-500 mt-1">
                  Cierre #{cierre.numero_cierre || 1} · Sistema: {formatearDinero(cierre.total_sistema)}
                </p>

                <p className="text-xs text-stone-500">
                  Diferencia: {formatearDinero(cierre.diferencia_total)}
                </p>

                <p className="text-[10px] text-stone-400 mt-1 truncate">
                  {cierre.cerrador?.nombre_negocio || 'Sin profesional'}
                </p>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function TablaMovimientos({ movimientos, titulo }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-stone-100">
        <h3 className="text-xs font-black uppercase tracking-widest text-stone-500">
          {titulo}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-stone-600">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-bold">
            <tr>
              <th className="px-6 py-4">Hora</th>
              <th className="px-6 py-4">Movimiento</th>
              <th className="px-6 py-4">Caja</th>
              <th className="px-6 py-4">Detalle</th>
              <th className="px-6 py-4">Profesional</th>
              <th className="px-6 py-4">Cierre</th>
              <th className="px-6 py-4 text-right">Monto</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100">
            {movimientos.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-stone-400 font-light">
                  No hay movimientos registrados en esta fecha.
                </td>
              </tr>
            ) : (
              movimientos.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4">{formatearHora(item.created_at)}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold">{item.tipo_movimiento}</p>
                    <p className="text-xs text-stone-400">{item.categoria || 'Sin categoría'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold">{item.tipo_caja}</p>
                    <p className="text-xs text-stone-400">{item.medio_pago}</p>
                  </td>
                  <td className="px-6 py-4">{item.descripcion || item.categoria || 'Sin detalle'}</td>
                  <td className="px-6 py-4">{item.profesional?.nombre_negocio || 'Sin profesional'}</td>
                  <td className="px-6 py-4">
                    {item.cierre_diario_id ? (
                      <span className="inline-flex px-2 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-widest">
                        Cerrado
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className={`px-6 py-4 text-right font-black ${Number(item.monto || 0) < 0 ? 'text-red-600' : 'text-teal-700'}`}>
                    {formatearDinero(item.monto)}
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

function ResumenLinea({ label, valor, destacar = false }) {
  return (
    <div className={`flex items-center justify-between py-2 border-b border-stone-100 ${destacar ? 'text-lg font-black' : 'text-sm'}`}>
      <span className="text-stone-500">{label}</span>
      <span className={Number(valor || 0) < 0 ? 'text-red-600' : 'text-stone-800'}>
        {formatearDinero(valor)}
      </span>
    </div>
  )
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

function formatearFechaHora(fecha) {
  if (!fecha) return ''

  return new Date(fecha).toLocaleString('es-AR')
}

function formatearHora(fecha) {
  if (!fecha) return ''

  return new Date(fecha).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatearDinero(valor) {
  const numero = Number(valor || 0)

  return `$${numero.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}