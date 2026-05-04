// src/components/clientes/ClienteDetalle.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export function ClienteDetalle({ cliente }) {
  const [sesiones, setSesiones] = useState([])
  const [loadingSesiones, setLoadingSesiones] = useState(true)

  // Extraemos patologías y direcciones (pueden venir como objeto directo o array según Supabase)
  const pat = Array.isArray(cliente?.patologias) ? cliente.patologias[0] : cliente?.patologias;
  const dir = Array.isArray(cliente?.direcciones) ? cliente.direcciones[0] : cliente?.direcciones;

  // Calculamos si tiene alertas médicas para resaltarlas
  const tieneAlertas = pat && (pat.hipertension || pat.diabetes || pat.varices || pat.cirugias_recientes);

  useEffect(() => {
    if (cliente?.id) {
      fetchHistorialSesiones(cliente.id)
    }
  }, [cliente])

  const fetchHistorialSesiones = async (clienteId) => {
    setLoadingSesiones(true)
    try {
      const { data, error } = await supabase
        .from('sesiones')
        .select(`
          *,
          sesion_detalles (
            servicios ( nombre ),
            combos ( nombre )
          )
        `)
        .eq('cliente_id', clienteId)
        .order('fecha_hora', { ascending: false }) // Del más nuevo al más viejo

      if (error) throw error
      setSesiones(data || [])
    } catch (error) {
      console.error("Error al cargar el historial:", error)
    } finally {
      setLoadingSesiones(false)
    }
  }

  // Función para calcular la edad
  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return 'Edad no registrada';
    const hoy = new Date();
    const cumple = new Date(fechaNac);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
      edad--;
    }
    return `${edad} años`;
  }

  const formatearFechaHora = (fechaStr) => {
    const opciones = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(fechaStr).toLocaleDateString('es-AR', opciones);
  }

  if (!cliente) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      
      {/* 1. CABECERA: DATOS DEL CLIENTE */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-2xl font-black shrink-0">
            {cliente.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-800">{cliente.nombre}</h2>
            <div className="flex gap-4 text-sm text-stone-500 mt-1">
              <span className="flex items-center gap-1">📱 {cliente.telefono}</span>
              <span className="flex items-center gap-1">🎂 {calcularEdad(cliente.fecha_nacimiento)}</span>
            </div>
          </div>
        </div>
        
        {/* Domicilio (Si tiene) */}
        {dir && (
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-sm text-stone-600 max-w-xs">
            <p className="font-bold text-stone-700 flex items-center gap-2 mb-1">🏠 Atención a Domicilio</p>
            <p>{dir.calle} {dir.numero}</p>
            {dir.barrio && <p>{dir.barrio}</p>}
            {dir.observaciones && <p className="text-xs italic text-stone-500 mt-1">"{dir.observaciones}"</p>}
          </div>
        )}
      </div>

      {/* 2. FICHA MÉDICA (PATOLOGÍAS) */}
      <div className={`rounded-2xl p-6 border shadow-sm ${tieneAlertas ? 'bg-red-50 border-red-100' : 'bg-white border-stone-200'}`}>
        <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-stone-700">
          <span className="text-lg">🏥</span> Ficha Médica
        </h3>
        
        {pat ? (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 flex flex-wrap gap-2">
              <Badge activa={pat.hipertension} label="Hipertensión" />
              <Badge activa={pat.diabetes} label="Diabetes" />
              <Badge activa={pat.varices} label="Várices" />
              <Badge activa={pat.cirugias_recientes} label="Cirugías Recientes" />
              {!tieneAlertas && <span className="px-3 py-1 bg-stone-100 text-stone-500 rounded-full text-xs font-bold">Sin alertas principales</span>}
            </div>
            
            {pat.observaciones_extra && (
              <div className="flex-1 bg-white/60 p-4 rounded-xl border border-stone-200/50">
                <p className="text-xs font-bold text-stone-500 uppercase mb-1">Otras Observaciones</p>
                <p className="text-sm text-stone-700">{pat.observaciones_extra}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-stone-500 italic">No hay registros médicos para este paciente.</p>
        )}
      </div>

      {/* 3. HISTORIAL DE SESIONES (TIMELINE) */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
        <h3 className="text-sm font-bold text-stone-700 uppercase tracking-widest mb-6 flex items-center gap-2">
          <span className="text-lg">💆‍♀️</span> Historial de Sesiones
        </h3>

        {loadingSesiones ? (
          <div className="text-center text-stone-400 py-8">Cargando historial...</div>
        ) : sesiones.length === 0 ? (
          <div className="text-center text-stone-400 py-12 bg-stone-50 rounded-xl border-2 border-dashed border-stone-200">
            <p>Este paciente aún no tiene sesiones registradas.</p>
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-stone-200 before:to-transparent">
            {sesiones.map((sesion) => (
              <div key={sesion.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                
                {/* Marcador Central */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-teal-100 text-teal-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                  ✓
                </div>

                {/* Tarjeta de la sesión */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded">
                      {formatearFechaHora(sesion.fecha_hora)}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${sesion.estado === 'Pendiente' ? 'bg-orange-100 text-orange-700' : 'bg-stone-100 text-stone-500'}`}>
                      {sesion.estado}
                    </span>
                  </div>

                  {/* Lista de Servicios Realizados */}
                  <div className="mb-3">
                    <ul className="text-sm font-bold text-stone-700 list-disc list-inside">
                      {sesion.sesion_detalles?.map((det, index) => (
                        <li key={index}>
                          {det.servicios?.nombre || det.combos?.nombre || 'Servicio eliminado'}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Comentarios del Masajista */}
                  {sesion.observaciones ? (
                    <div className="text-sm text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-100">
                      <span className="font-bold text-stone-400 block text-xs uppercase mb-1">Notas:</span>
                      {sesion.observaciones}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 italic">Sin comentarios en esta sesión.</p>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

// Componente visual para las "píldoras" de patologías
function Badge({ activa, label }) {
  if (!activa) return null;
  return (
    <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-bold">
      {label}
    </span>
  )
}