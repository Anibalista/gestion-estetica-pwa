// src/components/turnos/TurnoDetalle.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export function TurnoDetalle({ turno, onVolver }) {
const [insumos, setInsumos] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
    if (turno) fetchInsumos()
}, [turno])

const fetchInsumos = async () => {
    setLoading(true)
    try {
      // Buscamos los insumos configurados para los servicios de este turno
    const servicioIds = turno.sesion_detalles
        ?.map(d => d.servicio_id)
        .filter(Boolean) || []

    if (servicioIds.length > 0) {
        const { data } = await supabase
        .from('costo_servicio')
        .select('*, productos(descripcion, unidad_medida)')
        .in('servicio_id', servicioIds)
        setInsumos(data || [])
    }
    } catch (err) {
    console.error("Error cargando insumos:", err)
    } finally {
    setLoading(false)
    }
}

const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-AR', { 
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' 
    })
}

return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto animate-fadeIn">
    <button onClick={onVolver} className="mb-6 text-stone-400 hover:text-stone-800 transition flex items-center gap-2 text-sm font-medium">
        ← Volver a la agenda
    </button>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: CLIENTE Y CITA */}
        <div className="lg:col-span-2 space-y-6">
        
          {/* FICHA RESUMEN */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-teal-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold">
                {turno.clientes?.nombre?.charAt(0)}
            </div>
            <div>
                <h2 className="text-xl font-bold text-stone-800">{turno.clientes?.nombre}</h2>
                <p className="text-sm text-stone-500">{turno.clientes?.telefono}</p>
            </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-t border-stone-100">
            <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Fecha y Hora</p>
                <p className="text-sm font-medium text-stone-700 capitalize">{formatearFecha(turno.fecha_hora)}</p>
            </div>
            <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Estado</p>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                turno.estado === 'Cobrada' ? 'bg-teal-100 text-teal-700' : 
                turno.estado === 'Anulada' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                }`}>
                {turno.estado}
                </span>
            </div>
            </div>
        </div>

          {/* DOMICILIO (SI TIENE) */}
        {turno.a_domicilio && (
            <div className="bg-teal-50/50 border border-teal-100 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-teal-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                🏠 Dirección de Atención
            </h3>
            <div className="text-stone-700 space-y-1">
                <p className="text-lg font-medium">{turno.clientes?.direcciones?.calle} {turno.clientes?.direcciones?.numero}</p>
                <p className="text-sm text-stone-600">{turno.clientes?.direcciones?.barrio}</p>
                {turno.clientes?.direcciones?.observaciones && (
                <p className="mt-3 p-3 bg-white/60 rounded-xl text-xs italic border border-teal-100">
                    "{turno.clientes?.direcciones?.observaciones}"
                </p>
                )}
            </div>
            </div>
        )}

          {/* OBSERVACIONES */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-3">Observaciones de la Sesión</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
            {turno.observaciones || "Sin observaciones registradas para esta cita."}
            </p>
        </div>
        </div>

        {/* COLUMNA DERECHA: SERVICIOS E INSUMOS */}
        <div className="space-y-6">
        <div className="bg-stone-800 rounded-3xl p-6 text-white shadow-xl">
            <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">Servicios contratados</h3>
            <ul className="space-y-3">
            {turno.sesion_detalles?.map((det, i) => (
                <li key={i} className="flex justify-between items-center border-b border-stone-700 pb-2">
                <span className="text-sm font-medium">{det.servicios?.nombre || det.combos?.nombre}</span>
                <span className="text-xs text-stone-400">${det.precio_cobrado}</span>
                </li>
            ))}
            </ul>
            <div className="mt-6 pt-4 border-t border-stone-600 flex justify-between items-end">
            <span className="text-xs text-stone-400">Total a cobrar:</span>
            <span className="text-2xl font-black text-teal-400">${turno.monto_total}</span>
            </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Insumos necesarios</h3>
            {loading ? (
            <p className="text-xs text-stone-400">Calculando...</p>
            ) : insumos.length > 0 ? (
            <ul className="space-y-3">
                {insumos.map((ins, i) => {
                    // Priorizamos la descripción del costo sobre la del producto
                    const nombreMostrar = ins.descripcion || ins.productos?.descripcion || "Gasto sin descripción";
                    
                    // Verificamos si hay alguna cantidad para mostrar
                    const tieneCantidad = ins.unidades_usadas || ins.cantidad_suelta_usada;
                    const textoCantidad = ins.unidades_usadas 
                        ? `${ins.unidades_usadas} un.` 
                        : `${ins.cantidad_suelta_usada} ${ins.productos?.unidad_medida || ''}`;

                    return (
                        <li key={i} className="flex gap-3 items-start">
                            <span className="text-teal-600">💧</span>
                            <div>
                                <p className="text-sm font-bold text-stone-700">{nombreMostrar}</p>
                                {tieneCantidad && (
                                    <p className="text-[10px] text-stone-400 uppercase">
                                        {textoCantidad}
                                    </p>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
            ) : (
            <p className="text-xs text-stone-400 italic">No se registraron insumos específicos para estos servicios.</p>
            )}
        </div>
        </div>

    </div>
    </div>
)
}