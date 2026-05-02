// src/components/turnos/TurnoFormulario.jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'

export function TurnoFormulario({ session, turnoInicial, onGuardar, onCancelar }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  
  // Catálogos
  const [clientes, setClientes] = useState([])
  const [catalogo, setCatalogo] = useState([]) // Uniremos servicios y combos aquí para la lista
  const [turnosExistentes, setTurnosExistentes] = useState([])

  const [formData, setFormData] = useState({
    id: null,
    cliente_id: '',
    fecha: '',
    hora: '',
    observaciones: '',
    estado: 'Pendiente',
    monto_cobrado: ''
  })

  // El Carrito ahora guarda los IDs y tipos para hacer toggle fácilmente
  const [carrito, setCarrito] = useState([]) 

  // 1. CARGA INICIAL
  useEffect(() => {
    const cargarTodo = async () => {
      // Clientes
      const { data: clis } = await supabase.from('cliente_profesional').select('clientes(id, nombre, telefono)').eq('profesional_id', session.user.id)
      setClientes(clis?.map(d => d.clientes).filter(Boolean).sort((a,b) => a.nombre.localeCompare(b.nombre)) || [])

      // Servicios y Combos
      const { data: servs } = await supabase.from('servicio_profesional').select('servicios(*)').eq('profesional_id', session.user.id).eq('servicios.activo', true)
      const { data: cmbs } = await supabase.from('combos').select('*').eq('profesional_id', session.user.id).eq('activo', true)
      
      const listaServicios = (servs?.map(d => d.servicios) || []).map(s => ({ ...s, tipoItem: 'servicio', idUnico: `serv_${s.id}` }))
      const listaCombos = (cmbs || []).map(c => ({ ...c, tipoItem: 'combo', idUnico: `combo_${c.id}` }))
      
      setCatalogo([...listaCombos, ...listaServicios])

      // Turnos para validar choques
      const { data: tExistentes } = await supabase.from('sesiones')
        .select('id, fecha_hora, duracion_total')
        .eq('profesional_id', session.user.id)
        .neq('estado', 'Anulada')
      setTurnosExistentes(tExistentes || [])
    }
    cargarTodo()

    if (turnoInicial) {
      const fechaObj = new Date(turnoInicial.fecha_hora)
      const anio = fechaObj.getFullYear()
      const mes = String(fechaObj.getMonth() + 1).padStart(2, '0')
      const dia = String(fechaObj.getDate()).padStart(2, '0')
      const horas = String(fechaObj.getHours()).padStart(2, '0')
      const mins = String(fechaObj.getMinutes()).padStart(2, '0')

      setFormData({
        id: turnoInicial.id,
        cliente_id: turnoInicial.cliente_id,
        observaciones: turnoInicial.observaciones || '', 
        estado: turnoInicial.estado,
        fecha: `${anio}-${mes}-${dia}`,
        hora: `${horas}:${mins}`,
        monto_cobrado: turnoInicial.monto_cobrado ?? ''
      })

      const itemsGuardados = turnoInicial.sesion_detalles?.map(d => ({
        tipoItem: d.servicio_id ? 'servicio' : 'combo',
        id: d.servicio_id || d.combo_id,
        idUnico: d.servicio_id ? `serv_${d.servicio_id}` : `combo_${d.combo_id}`,
        nombre: d.servicios?.nombre || d.combos?.nombre,
        precio_actual: d.precio_cobrado,
        duracion_minutos: d.servicios?.duracion_minutos || d.combos?.duracion_minutos || 0
      })) || []
      
      setCarrito(itemsGuardados)
    }
  }, [session.user.id, turnoInicial])

  // 2. CÁLCULOS DINÁMICOS
  const totales = useMemo(() => {
    return {
      monto: carrito.reduce((acc, i) => acc + Number(i.precio_actual), 0),
      duracion: carrito.reduce((acc, i) => acc + (i.duracion_minutos || 0), 0)
    }
  }, [carrito])

  // Si cambia el estado a "Cobrada" y no hay monto cobrado, sugerir el total
  useEffect(() => {
    if (formData.estado === 'Cobrada' && !formData.monto_cobrado && totales.monto > 0) {
      setFormData(prev => ({ ...prev, monto_cobrado: totales.monto }))
    }
  }, [formData.estado, totales.monto])

  // 3. MANEJO DEL CARRITO (CHECKBOX)
  const toggleItem = (item) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.idUnico === item.idUnico)
      if (existe) return prev.filter(i => i.idUnico !== item.idUnico) // Quitar
      return [...prev, item] // Agregar
    })
  }

  // 4. VALIDACIONES Y GUARDADO
  const validarDisponibilidad = () => {
    if (!formData.fecha || !formData.hora) {
      setFeedback({ tipo: 'error', mensaje: 'Falta la fecha o la hora.' });
      return false;
    }
    if (carrito.length === 0) {
      setFeedback({ tipo: 'error', mensaje: 'Debes seleccionar al menos un servicio o combo.' });
      return false;
    }

    const inicioNuevo = new Date(`${formData.fecha}T${formData.hora}:00`);
    const finNuevo = new Date(inicioNuevo.getTime() + totales.duracion * 60000);

    const choque = turnosExistentes.find(t => {
      if (t.id === formData.id) return false;
      const inicioE = new Date(t.fecha_hora);
      const finE = new Date(inicioE.getTime() + (t.duracion_total || 0) * 60000);
      return (inicioNuevo < finE && finNuevo > inicioE);
    });

    if (choque) {
      setFeedback({ tipo: 'error', mensaje: '⚠️ El horario choca con otro turno. Terminará a las ' + finNuevo.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
      return false;
    }

    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const fechaCita = new Date(`${formData.fecha}T00:00:00`);
    
    if (fechaCita < hoy && formData.estado === 'Pendiente') {
      setFeedback({ tipo: 'error', mensaje: '⚠️ Una cita de un día pasado no puede estar "Pendiente". Selecciona Cobrada, Ausente o Anulada.' });
      return false;
    }

    return true;
  }

  const handleGuardar = async (e) => {
    e.preventDefault();
    setFeedback(null);
    if (!validarDisponibilidad()) return;
    
    setIsSubmitting(true);
    try {
      const datosSesion = {
        cliente_id: formData.cliente_id,
        profesional_id: session.user.id,
        fecha_hora: `${formData.fecha}T${formData.hora}:00`,
        monto_total: totales.monto,
        duracion_total: totales.duracion,
        monto_cobrado: parseFloat(formData.monto_cobrado) || 0,
        observaciones: formData.observaciones,
        estado: formData.estado
      };

      let sesionId = formData.id;
      if (sesionId) {
        await supabase.from('sesiones').update(datosSesion).eq('id', sesionId);
        await supabase.from('sesion_detalles').delete().eq('sesion_id', sesionId);
      } else {
        const { data, error } = await supabase.from('sesiones').insert([datosSesion]).select().single();
        if (error) throw error;
        sesionId = data.id;
      }

      const lineas = carrito.map(i => ({
        sesion_id: sesionId,
        servicio_id: i.tipoItem === 'servicio' ? i.id : null,
        combo_id: i.tipoItem === 'combo' ? i.id : null,
        precio_cobrado: i.precio_actual
      }));
      await supabase.from('sesion_detalles').insert(lineas);

      onGuardar();
    } catch (error) {
      setFeedback({ tipo: 'error', mensaje: "Error BD: " + error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Ordenar catálogo: seleccionados primero
  const catalogoOrdenado = [...catalogo].sort((a, b) => {
    const aSel = carrito.some(i => i.idUnico === a.idUnico);
    const bSel = carrito.some(i => i.idUnico === b.idUnico);
    if (aSel && !bSel) return -1;
    if (!aSel && bSel) return 1;
    return a.nombre.localeCompare(b.nombre);
  }).filter(item => item.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <form onSubmit={handleGuardar} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* COLUMNA IZQUIERDA: DATOS DE LA CITA */}
      <div className="space-y-6">
        
        {feedback && (
          <div className={`p-4 rounded-xl text-sm font-bold ${feedback.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-teal-50 text-teal-700'}`}>
            {feedback.mensaje}
          </div>
        )}

        <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100 space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-2">Paciente *</label>
            <select required value={formData.cliente_id} onChange={e => setFormData({...formData, cliente_id: e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 bg-white">
              <option value="">-- Seleccionar Paciente --</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} {c.telefono ? `(${c.telefono})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-2">Fecha *</label>
              <input required type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-2">Hora *</label>
              <input required type="time" value={formData.hora} onChange={e => setFormData({...formData, hora: e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-2">Estado</label>
              <select value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold">
                <option value="Pendiente">⏳ Pendiente</option>
                <option value="Cobrada">✅ Cobrada</option>
                <option value="Ausente">❌ Ausente</option>
                <option value="Anulada">🚫 Anulada</option>
              </select>
            </div>
            <div className={`${formData.estado === 'Cobrada' ? 'opacity-100' : 'opacity-50'}`}>
              <label className="block text-xs font-bold text-teal-600 uppercase mb-2">Cobro Real ($)</label>
              <input type="number" step="0.01" value={formData.monto_cobrado} onChange={e => setFormData({...formData, monto_cobrado: e.target.value})} placeholder={totales.monto.toString()} className="w-full px-4 py-3 border border-teal-200 bg-teal-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-black text-teal-800" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-2">Notas de la sesión</label>
            <textarea rows="2" value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})} placeholder="Ej: Poner foco en cervicales..." className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"></textarea>
          </div>
        </div>
      </div>

      {/* COLUMNA DERECHA: SELECCIÓN DE SERVICIOS (ESTILO COMBOS) */}
      <div className="flex flex-col h-[600px]">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-3">Servicios a Realizar</h3>
          <input type="text" placeholder="Filtrar servicios o combos..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none text-sm bg-stone-50" />
        </div>

        <div className="flex-1 overflow-y-auto border border-stone-100 rounded-2xl p-2 space-y-2 bg-stone-50/30">
          {catalogoOrdenado.map(item => {
            const isSelected = carrito.some(i => i.idUnico === item.idUnico);
            return (
              <div 
                key={item.idUnico} 
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-white border-teal-500 shadow-md ring-1 ring-teal-500' : 'bg-white border-stone-100 hover:border-stone-300'}`}
                onClick={() => toggleItem(item)}
              >
                <div className="flex items-center gap-3">
                   <input type="checkbox" readOnly checked={isSelected} className="w-5 h-5 text-teal-600 rounded cursor-pointer pointer-events-none" />
                   <div>
                     <p className={`font-bold text-sm ${isSelected ? 'text-teal-700' : 'text-stone-600'}`}>
                       {item.tipoItem === 'combo' ? '🎁 ' : ''}{item.nombre}
                     </p>
                     <p className="text-[10px] text-stone-400 uppercase tracking-widest">{item.duracion_minutos} min</p>
                   </div>
                </div>
                <div className="font-bold text-stone-800">${item.precio_actual}</div>
              </div>
            )
          })}
        </div>

        {/* Totales y Botonera */}
        <div className="pt-4 border-t border-stone-200 mt-4">
          <div className="flex justify-between items-center mb-4 px-2">
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Duración Estimada</p>
              <p className="text-lg font-bold text-stone-600">{totales.duracion} min</p>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">A Cobrar (Lista)</p>
               <p className="text-3xl font-black text-stone-800">${totales.monto.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button type="button" onClick={onCancelar} className="flex-1 py-3 text-stone-500 font-bold hover:bg-stone-100 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-[2] bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 shadow-md transition-all">
              {isSubmitting ? 'Guardando...' : (formData.id ? 'Actualizar Turno' : 'Agendar Turno')}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}