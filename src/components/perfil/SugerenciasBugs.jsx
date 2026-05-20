// src/components/perfil/SugerenciasBugs.jsx
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  FileImage,
  Lightbulb,
  MonitorSmartphone,
  RefreshCw,
  Send,
  UploadCloud,
  X
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { uploadImage } from '../../utils/storage'

const TIPOS = [
  {
    value: 'Sugerencia',
    label: 'Sugerencia',
    descripcion: 'Una idea para mejorar la app',
    icono: Lightbulb
  },
  {
    value: 'Bug',
    label: 'Bug / Error',
    descripcion: 'Algo no funciona como debería',
    icono: Bug
  }
]

const SECCIONES = [
  'App en general',
  'Inicio',
  'Turnos / Citas',
  'Registrar sesión',
  'Ver turnos',
  'Informes - Productividad',
  'Productos',
  'Venta de productos',
  'Registrar producto - insumo',
  'Administrar stock',
  'Insumos - costos',
  'Reportes - alertas',
  'Clientes',
  'Nuevo cliente',
  'Ver clientes',
  'Informes - ideas',
  'Servicios',
  'Registrar servicio',
  'Ver servicios',
  'Combos',
  'Informes - administración',
  'Finanzas',
  'Cierre de caja',
  'Reportes comparativos',
  'Ver transacciones',
  'Informes estadísticos',
  'Personalizar app',
  'Mi empresa',
  'Menú / Sidebar',
  'Login'
]

const DISPOSITIVOS = [
  'Móvil',
  'PC',
  'Ambos'
]

const PRIORIDADES = [
  {
    value: 'Baja',
    label: 'Baja',
    descripcion: 'No impide trabajar'
  },
  {
    value: 'Media',
    label: 'Media',
    descripcion: 'Molesta, pero se puede seguir usando'
  },
  {
    value: 'Alta',
    label: 'Alta',
    descripcion: 'Complica una tarea importante'
  },
  {
    value: 'Urgente',
    label: 'Urgente',
    descripcion: 'Impide trabajar'
  }
]

export function SugerenciasBugs({
  session,
  empresaActiva
}) {
  const [guardando, setGuardando] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const [captura, setCaptura] = useState(null)
  const [vistaPrevia, setVistaPrevia] = useState('')

  const [formData, setFormData] = useState({
    tipo: 'Sugerencia',
    seccion: 'App en general',
    dispositivo: 'PC',
    prioridad: 'Media',
    comentario: ''
  })

  const tipoSeleccionado = useMemo(() => {
    return TIPOS.find((tipo) => tipo.value === formData.tipo) || TIPOS[0]
  }, [formData.tipo])

  const cambiarCampo = (campo, valor) => {
    setFormData((prev) => ({
      ...prev,
      [campo]: valor
    }))
  }

  const handleCapturaChange = (e) => {
    const file = e.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setFeedback({
        tipo: 'error',
        mensaje: 'La captura debe ser una imagen.'
      })
      return
    }

    if (vistaPrevia?.startsWith('blob:')) {
      URL.revokeObjectURL(vistaPrevia)
    }

    setCaptura(file)
    setVistaPrevia(URL.createObjectURL(file))
    setFeedback(null)
  }

  const quitarCaptura = () => {
    if (vistaPrevia?.startsWith('blob:')) {
      URL.revokeObjectURL(vistaPrevia)
    }

    setCaptura(null)
    setVistaPrevia('')
  }

  const limpiarFormulario = () => {
    quitarCaptura()

    setFormData({
      tipo: 'Sugerencia',
      seccion: 'App en general',
      dispositivo: 'PC',
      prioridad: 'Media',
      comentario: ''
    })
  }

  const enviarReporte = async (e) => {
    e.preventDefault()

    if (!session?.user?.id) {
      setFeedback({
        tipo: 'error',
        mensaje: 'No se encontró la sesión del usuario.'
      })
      return
    }

    if (!formData.comentario.trim()) {
      setFeedback({
        tipo: 'error',
        mensaje: 'Escribí una sugerencia o una descripción del error.'
      })
      return
    }

    if (formData.comentario.trim().length < 10) {
      setFeedback({
        tipo: 'error',
        mensaje: 'El comentario es muy corto. Agregá un poco más de detalle.'
      })
      return
    }

    setGuardando(true)
    setFeedback(null)

    try {
      let capturaUrl = null

      if (captura) {
        capturaUrl = await uploadImage(
          captura,
          'combos',
          `sugerencias-bugs/${session.user.id}`
        )
      }

      const payload = {
        empresa_id: empresaActiva?.id || null,
        profesional_id: session.user.id,
        tipo: formData.tipo,
        seccion: formData.seccion,
        dispositivo: formData.dispositivo,
        prioridad: formData.prioridad,
        comentario: formData.comentario.trim(),
        captura_url: capturaUrl,
        user_agent: navigator.userAgent || null,
        estado: 'Pendiente'
      }

      const { error } = await supabase
        .from('sugerencias_bugs')
        .insert(payload)

      if (error) throw error

      limpiarFormulario()

      setFeedback({
        tipo: 'exito',
        mensaje: 'Reporte enviado correctamente. Gracias por ayudar a mejorar la app.'
      })
    } catch (error) {
      console.error('Error enviando sugerencia o bug:', error)

      setFeedback({
        tipo: 'error',
        mensaje: 'No se pudo enviar el reporte: ' + error.message
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col gap-6 overflow-y-auto pb-10">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 px-1">
        <div>
          <h2 className="text-2xl font-light text-stone-800">
            Sugerencias y Bugs
          </h2>

          <p className="text-sm text-stone-500 font-light italic">
            Enviá ideas de mejora o reportá errores para revisar el sistema.
          </p>

          <p className="text-xs text-stone-400 mt-1">
            Empresa activa:{' '}
            <span className="font-bold text-teal-600">
              {empresaActiva?.nombre || 'Sin empresa'}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={limpiarFormulario}
          className="px-4 py-3 rounded-2xl bg-white border border-stone-200 text-stone-700 text-sm font-bold hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Limpiar
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl border p-4 text-sm font-bold flex items-start gap-3 ${
            feedback.tipo === 'exito'
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-red-50 border-red-100 text-red-700'
          }`}
        >
          {feedback.tipo === 'exito' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          )}

          <span>{feedback.mensaje}</span>
        </div>
      )}

      <form
        onSubmit={enviarReporte}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
      >
        <section className="xl:col-span-2 bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
              <tipoSeleccionado.icono className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-black text-stone-800">
                Detalle del reporte
              </h3>

              <p className="text-xs text-stone-400">
                Cuanto más claro sea el reporte, más fácil será corregirlo o implementarlo.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">
                ¿Qué querés enviar?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TIPOS.map((tipo) => {
                  const Icono = tipo.icono
                  const activo = formData.tipo === tipo.value

                  return (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => cambiarCampo('tipo', tipo.value)}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        activo
                          ? 'bg-teal-50 border-teal-300'
                          : 'bg-white border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icono className={`w-5 h-5 shrink-0 ${activo ? 'text-teal-700' : 'text-stone-400'}`} />

                        <div>
                          <p className="font-black text-stone-800">
                            {tipo.label}
                          </p>

                          <p className="text-xs text-stone-500 mt-1">
                            {tipo.descripcion}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Campo label="Sección / vista">
                <select
                  value={formData.seccion}
                  onChange={(e) => cambiarCampo('seccion', e.target.value)}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {SECCIONES.map((seccion) => (
                    <option key={seccion} value={seccion}>
                      {seccion}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Dispositivo">
                <select
                  value={formData.dispositivo}
                  onChange={(e) => cambiarCampo('dispositivo', e.target.value)}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {DISPOSITIVOS.map((dispositivo) => (
                    <option key={dispositivo} value={dispositivo}>
                      {dispositivo}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Prioridad">
                <select
                  value={formData.prioridad}
                  onChange={(e) => cambiarCampo('prioridad', e.target.value)}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {PRIORIDADES.map((prioridad) => (
                    <option key={prioridad.value} value={prioridad.value}>
                      {prioridad.label}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>

            <Campo label={formData.tipo === 'Bug' ? 'Descripción del error' : 'Sugerencia'}>
              <textarea
                value={formData.comentario}
                onChange={(e) => cambiarCampo('comentario', e.target.value)}
                rows={8}
                placeholder={
                  formData.tipo === 'Bug'
                    ? 'Contá qué estabas haciendo, qué esperabas que pase y qué pasó realmente...'
                    : 'Contá tu idea, en qué sección ayudaría y por qué sería útil...'
                }
                className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </Campo>

            <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-white text-teal-700 rounded-xl p-2 border border-stone-100">
                  <FileImage className="w-5 h-5" />
                </div>

                <div>
                  <p className="font-black text-stone-800">
                    Captura opcional
                  </p>

                  <p className="text-xs text-stone-400 mt-1">
                    Podés adjuntar una captura del error o de la parte que querés mejorar.
                  </p>
                </div>
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={handleCapturaChange}
                className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              />

              {vistaPrevia && (
                <div className="mt-4 relative rounded-2xl border border-stone-200 bg-white p-3">
                  <img
                    src={vistaPrevia}
                    alt="Captura del reporte"
                    className="w-full max-h-72 object-contain rounded-xl bg-stone-100"
                  />

                  <button
                    type="button"
                    onClick={quitarCaptura}
                    className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white text-red-600 border border-red-100 shadow-sm hover:bg-red-50 flex items-center justify-center transition-colors"
                    title="Quitar captura"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 h-fit">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
              <MonitorSmartphone className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-black text-stone-800">
                Resumen
              </h3>

              <p className="text-xs text-stone-400">
                Revisá antes de enviar.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <ResumenLinea label="Tipo" valor={formData.tipo} />
            <ResumenLinea label="Sección" valor={formData.seccion} />
            <ResumenLinea label="Dispositivo" valor={formData.dispositivo} />
            <ResumenLinea label="Prioridad" valor={formData.prioridad} />
            <ResumenLinea label="Captura" valor={captura ? 'Adjunta' : 'No adjunta'} />
          </div>

          <div className="mt-5 p-4 rounded-2xl bg-stone-50 border border-stone-100 text-xs text-stone-500">
            También se guardará información técnica básica del navegador para ayudar a reproducir errores.
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full mt-6 px-5 py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:bg-stone-300 transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            {guardando ? 'Enviando...' : 'Enviar reporte'}
          </button>
        </aside>
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

function ResumenLinea({ label, valor }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-2">
      <span className="text-stone-400 font-bold">
        {label}
      </span>

      <span className="font-black text-stone-700 text-right">
        {valor}
      </span>
    </div>
  )
}