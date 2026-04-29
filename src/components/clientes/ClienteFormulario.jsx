// src/components/clientes/ClienteFormulario.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { capitalizarNombres, capitalizarPrimeraLetra } from '../../utils/formatters'

export function ClienteFormulario({ clienteInicial, session, onGuardadoExitoso }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const [formData, setFormData] = useState({
    id: null,
    nombre: '',
    fecha_nacimiento: '',
    codigoPais: '+54',
    codigoArea: '',
    numeroLocal: '',
    hipertension: false,
    diabetes: false,
    varices: false,
    cirugias_recientes: false,
    observaciones_extra: ''
  })

  // 1. CARGA INICIAL
  useEffect(() => {
    if (clienteInicial) {
      let pais = '+54', area = '', local = '';
      if (clienteInicial.telefono) {
        const match = clienteInicial.telefono.match(/\((\+\d+)\)(\d+)-(\d+)/);
        if (match) {
          pais = match[1]; area = match[2]; local = match[3];
        } else {
          local = clienteInicial.telefono; 
        }
      }

      const fechaLimpia = clienteInicial.fecha_nacimiento 
        ? clienteInicial.fecha_nacimiento.split('T')[0] 
        : '';

      const pat = clienteInicial.patologias || {};

      setFormData({
        id: clienteInicial.id,
        nombre: clienteInicial.nombre || '',
        fecha_nacimiento: fechaLimpia,
        codigoPais: pais,
        codigoArea: area,
        numeroLocal: local,
        // Usamos Boolean() para asegurar que siempre sea true o false (nunca null)
        hipertension: Boolean(pat.hipertension),
        diabetes: Boolean(pat.diabetes),
        varices: Boolean(pat.varices),
        cirugias_recientes: Boolean(pat.cirugias_recientes),
        observaciones_extra: pat.observaciones_extra || ''
      })
    }
  }, [clienteInicial])

  // 2. EL GRAN ARREGLO: Función universal para actualizar campos usando 'prev'
  const handleChange = (campo, valor) => {
    setFormData(prev => ({ ...prev, [campo]: valor }))
  }

  // 3. GUARDADO EN BASE DE DATOS
  const handleGuardar = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFeedback(null)

    try {
      const nombreLimpio = capitalizarNombres(formData.nombre)
      const obsLimpias = capitalizarPrimeraLetra(formData.observaciones_extra)
      const telefonoFinal = `(${formData.codigoPais})${formData.codigoArea}-${formData.numeroLocal}`
      
      const fechaParaEnviar = formData.fecha_nacimiento && formData.fecha_nacimiento !== "" 
        ? formData.fecha_nacimiento 
        : null;

      let clienteId = formData.id;

      if (clienteId) {
        // --- ACTUALIZAR EXISTENTE ---
       

        const { error: errCli } = await supabase.from('clientes')
          .update({ nombre: nombreLimpio, telefono: telefonoFinal, fecha_nacimiento: fechaParaEnviar })
          .eq('id', clienteId)
        if (errCli) throw errCli

        const { error: errPat } = await supabase.from('patologias').upsert({
          cliente_id: clienteId,
          hipertension: formData.hipertension,
          diabetes: formData.diabetes,
          varices: formData.varices,
          cirugias_recientes: formData.cirugias_recientes,
          observaciones_extra: obsLimpias
        }, { onConflict: 'cliente_id' })
        if (errPat) throw errPat

      } else {
        // --- CREAR NUEVO ---
        clienteId = crypto.randomUUID()

        const { error: errCli } = await supabase.from('clientes').insert([{
          id: clienteId, nombre: nombreLimpio, telefono: telefonoFinal, fecha_nacimiento: fechaParaEnviar
        }])
        if (errCli) throw errCli

        const { error: errRel } = await supabase.from('cliente_profesional').insert([{
          cliente_id: clienteId, profesional_id: session.user.id 
        }])
        if (errRel) throw errRel

        const { error: errPat } = await supabase.from('patologias').insert([{
          cliente_id: clienteId,
          hipertension: formData.hipertension,
          diabetes: formData.diabetes,
          varices: formData.varices,
          cirugias_recientes: formData.cirugias_recientes,
          observaciones_extra: obsLimpias
        }])
        if (errPat) throw errPat
      }

      setFeedback({ tipo: 'exito', mensaje: '¡Datos guardados correctamente!' })
      setTimeout(() => onGuardadoExitoso(), 1500)

    } catch (error) {
      console.error(error)
      setFeedback({ tipo: 'error', mensaje: 'Error al guardar: ' + error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleGuardar} className="p-6 space-y-8">
      {feedback && (
        <div className={`p-4 rounded-lg text-sm font-medium ${feedback.tipo === 'exito' ? 'bg-teal-50 text-teal-800' : 'bg-red-50 text-red-800'}`}>
          {feedback.mensaje}
        </div>
      )}

      {/* 1. DATOS PERSONALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Nombre Completo *</label>
          <input required type="text" value={formData.nombre} onChange={(e) => handleChange('nombre', e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Fecha de Nacimiento</label>
          <input type="date" value={formData.fecha_nacimiento} onChange={(e) => handleChange('fecha_nacimiento', e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-stone-700" />
        </div>
      </div>

      {/* 2. TELÉFONO */}
      <div>
        <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Teléfono / WhatsApp *</label>
        <div className="flex gap-2">
          <select value={formData.codigoPais} onChange={(e) => handleChange('codigoPais', e.target.value)} className="w-24 px-2 py-2 border border-stone-200 rounded-lg outline-none bg-white">
            <option value="+54">🇦🇷 +54</option><option value="+598">🇺🇾 +598</option><option value="+56">🇨🇱 +56</option>
          </select>
          <input required type="number" placeholder="Área" value={formData.codigoArea} onChange={(e) => handleChange('codigoArea', e.target.value)} className="w-1/3 px-4 py-2 border border-stone-200 rounded-lg outline-none" />
          <input required type="number" placeholder="Número local" value={formData.numeroLocal} onChange={(e) => handleChange('numeroLocal', e.target.value)} className="flex-1 px-4 py-2 border border-stone-200 rounded-lg outline-none" />
        </div>
      </div>

      {/* 3. PATOLOGÍAS */}
      <div>
        <label className="block text-xs font-bold text-stone-400 uppercase mb-3">Antecedentes Médicos</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-100">
          <BooleanSelector label="Hipertensión" value={formData.hipertension} onChange={(val) => handleChange('hipertension', val)} />
          <BooleanSelector label="Diabetes" value={formData.diabetes} onChange={(val) => handleChange('diabetes', val)} />
          <BooleanSelector label="Várices" value={formData.varices} onChange={(val) => handleChange('varices', val)} />
          <BooleanSelector label="Cirugías Recientes" value={formData.cirugias_recientes} onChange={(val) => handleChange('cirugias_recientes', val)} />
        </div>
      </div>

      {/* 4. OBSERVACIONES */}
      <div>
        <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Otras Patologías / Notas</label>
        <textarea rows="3" value={formData.observaciones_extra} onChange={(e) => handleChange('observaciones_extra', e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"></textarea>
      </div>

      <div className="flex justify-end pt-4 border-t border-stone-100">
        <button type="submit" disabled={isSubmitting} className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 font-medium disabled:opacity-50 transition shadow-md">
          {isSubmitting ? 'Guardando...' : (formData.id ? 'Actualizar Cliente' : 'Guardar Cliente')}
        </button>
      </div>
    </form>
  )
}

function BooleanSelector({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
      <span className="text-sm font-medium text-stone-600">{label}</span>
      <div className="flex gap-2">
        <button type="button" onClick={() => onChange(true)} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${value ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}>SÍ</button>
        <button type="button" onClick={() => onChange(false)} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${!value ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}>NO</button>
      </div>
    </div>
  )
}