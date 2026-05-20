// src/components/perfil/MiEmpresa.jsx
import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  CheckCircle2,
  Image,
  Link,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Save,
  UploadCloud,
  X
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { uploadImage } from '../../utils/storage'
import logoDefault from '../../assets/logo-2026.png'

const ROLES_QUE_EDITAN_EMPRESA = ['Dueño', 'Administrador']

export function MiEmpresa({
  session,
  empresaActiva,
  rolEmpresa,
  onEmpresaActualizada
}) {
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const [metodoLogo, setMetodoLogo] = useState('archivo')
  const [archivoLogo, setArchivoLogo] = useState(null)
  const [vistaPreviaLogo, setVistaPreviaLogo] = useState('')
  const [logoRoto, setLogoRoto] = useState(false)

  const [formData, setFormData] = useState({
    id: '',
    nombre: '',
    plan: '',
    activo: true,
    url_logo: '',
    cantidad_profesionales: 1,
    cuit: '',
    telefono_contacto: '',
    created_at: ''
  })

  const puedeEditar = ROLES_QUE_EDITAN_EMPRESA.includes(rolEmpresa)

  const logoVisible = useMemo(() => {
    if (vistaPreviaLogo) return vistaPreviaLogo
    if (!logoRoto && formData.url_logo) return formData.url_logo

    return logoDefault
  }, [vistaPreviaLogo, formData.url_logo, logoRoto])

  useEffect(() => {
    if (empresaActiva?.id) {
      cargarEmpresa()
    }
  }, [empresaActiva?.id])

  useEffect(() => {
    return () => {
      if (vistaPreviaLogo?.startsWith('blob:')) {
        URL.revokeObjectURL(vistaPreviaLogo)
      }
    }
  }, [vistaPreviaLogo])

  const cargarEmpresa = async () => {
    setLoading(true)
    setFeedback(null)

    try {
      const { data, error } = await supabase
        .from('empresas')
        .select(`
          id,
          nombre,
          plan,
          activo,
          url_logo,
          cantidad_profesionales,
          cuit,
          telefono_contacto,
          created_at
        `)
        .eq('id', empresaActiva.id)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        throw new Error('No se encontró la empresa activa.')
      }

      setFormData({
        id: data.id,
        nombre: data.nombre || '',
        plan: data.plan || 'Free',
        activo: data.activo !== false,
        url_logo: data.url_logo || '',
        cantidad_profesionales: data.cantidad_profesionales || 1,
        cuit: data.cuit || '',
        telefono_contacto: data.telefono_contacto || '',
        created_at: data.created_at || ''
      })

      setArchivoLogo(null)
      setVistaPreviaLogo('')
      setMetodoLogo(data.url_logo ? 'url' : 'archivo')
      setLogoRoto(false)
    } catch (error) {
      console.error('Error cargando empresa:', error)

      setFeedback({
        tipo: 'error',
        mensaje: 'No se pudo cargar la empresa: ' + error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const cambiarCampo = (campo, valor) => {
    setFormData((prev) => ({
      ...prev,
      [campo]: valor
    }))

    if (campo === 'url_logo') {
      setLogoRoto(false)
    }
  }

  const handleArchivoLogoChange = (e) => {
    const file = e.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setFeedback({
        tipo: 'error',
        mensaje: 'El archivo seleccionado debe ser una imagen.'
      })
      return
    }

    if (vistaPreviaLogo?.startsWith('blob:')) {
      URL.revokeObjectURL(vistaPreviaLogo)
    }

    setArchivoLogo(file)
    setVistaPreviaLogo(URL.createObjectURL(file))
    setMetodoLogo('archivo')
    setLogoRoto(false)
  }

  const quitarLogo = () => {
    if (vistaPreviaLogo?.startsWith('blob:')) {
      URL.revokeObjectURL(vistaPreviaLogo)
    }

    setArchivoLogo(null)
    setVistaPreviaLogo('')
    setLogoRoto(false)

    setFormData((prev) => ({
      ...prev,
      url_logo: ''
    }))
  }

  const guardarEmpresa = async (e) => {
    e.preventDefault()

    if (!puedeEditar) {
      setFeedback({
        tipo: 'error',
        mensaje: 'Tu rol actual no permite modificar datos de la empresa.'
      })
      return
    }

    if (!formData.nombre.trim()) {
      setFeedback({
        tipo: 'error',
        mensaje: 'El nombre de la empresa es obligatorio.'
      })
      return
    }

    if (!formData.cuit.trim()) {
      setFeedback({
        tipo: 'error',
        mensaje: 'El CUIT es obligatorio.'
      })
      return
    }

    setGuardando(true)
    setFeedback(null)

    try {
      let urlLogoFinal = formData.url_logo?.trim() || null

      if (metodoLogo === 'archivo' && archivoLogo) {
        urlLogoFinal = await uploadImage(
          archivoLogo,
          'combos',
          `empresas/${formData.id}/logo`
        )
      }

      const datosActualizados = {
        nombre: formData.nombre.trim(),
        cuit: formData.cuit.trim(),
        telefono_contacto: formData.telefono_contacto?.trim() || null,
        url_logo: urlLogoFinal
      }

      const { data, error } = await supabase
        .from('empresas')
        .update(datosActualizados)
        .eq('id', formData.id)
        .select(`
          id,
          nombre,
          plan,
          activo,
          url_logo,
          cantidad_profesionales,
          cuit,
          telefono_contacto,
          created_at
        `)
        .single()

      if (error) throw error

      setFormData({
        id: data.id,
        nombre: data.nombre || '',
        plan: data.plan || 'Free',
        activo: data.activo !== false,
        url_logo: data.url_logo || '',
        cantidad_profesionales: data.cantidad_profesionales || 1,
        cuit: data.cuit || '',
        telefono_contacto: data.telefono_contacto || '',
        created_at: data.created_at || ''
      })

      setArchivoLogo(null)
      setVistaPreviaLogo('')
      setMetodoLogo(data.url_logo ? 'url' : 'archivo')
      setLogoRoto(false)

      window.dispatchEvent(new CustomEvent('empresa-activa-actualizada', {
        detail: data
      }))

      if (onEmpresaActualizada) {
        await onEmpresaActualizada(data)
      }

      setFeedback({
        tipo: 'exito',
        mensaje: 'Datos de la empresa actualizados correctamente.'
      })
    } catch (error) {
      console.error('Error guardando empresa:', error)

      setFeedback({
        tipo: 'error',
        mensaje: 'No se pudo guardar la empresa: ' + error.message
      })
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-stone-400">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col gap-6 overflow-y-auto pb-10">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 px-1">
        <div>
          <h2 className="text-2xl font-light text-stone-800">
            Mi Empresa
          </h2>

          <p className="text-sm text-stone-500 font-light italic">
            Datos generales, identificación y logo principal de la empresa activa.
          </p>

          <p className="text-xs text-stone-400 mt-1">
            Rol actual:{' '}
            <span className="font-bold text-teal-600">
              {rolEmpresa || 'Profesional'}
            </span>
            {' · '}
            {puedeEditar ? 'Podés editar los datos.' : 'Vista de solo lectura.'}
          </p>
        </div>

        <button
          type="button"
          onClick={cargarEmpresa}
          className="px-4 py-3 rounded-2xl bg-white border border-stone-200 text-stone-700 text-sm font-bold hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl border p-4 text-sm font-bold ${
            feedback.tipo === 'exito'
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-red-50 border-red-100 text-red-700'
          }`}
        >
          {feedback.mensaje}
        </div>
      )}

      {!puedeEditar && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-amber-800 flex items-start gap-3">
          <LockKeyhole className="w-5 h-5 shrink-0 mt-0.5" />

          <div>
            <p className="font-black">
              Solo lectura
            </p>

            <p className="text-sm mt-1">
              Solo los roles Dueño y Administrador pueden modificar los datos de empresa.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={guardarEmpresa} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
              <Building2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-black text-stone-800">
                Datos de la empresa
              </h3>

              <p className="text-xs text-stone-400">
                Estos datos se usan para identificar la empresa activa dentro del sistema.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Campo label="Nombre de empresa">
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => cambiarCampo('nombre', e.target.value)}
                disabled={!puedeEditar}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-stone-100 disabled:text-stone-400"
              />
            </Campo>

            <Campo label="CUIT">
              <input
                type="text"
                value={formData.cuit}
                onChange={(e) => cambiarCampo('cuit', e.target.value)}
                disabled={!puedeEditar}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-stone-100 disabled:text-stone-400"
              />
            </Campo>

            <Campo label="Teléfono de contacto">
              <input
                type="text"
                value={formData.telefono_contacto}
                onChange={(e) => cambiarCampo('telefono_contacto', e.target.value)}
                disabled={!puedeEditar}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-stone-100 disabled:text-stone-400"
              />
            </Campo>

            <Campo label="Plan">
              <input
                type="text"
                value={formData.plan}
                disabled
                className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none bg-stone-100 text-stone-400"
              />
            </Campo>

            <Campo label="Cantidad de profesionales">
              <input
                type="number"
                value={formData.cantidad_profesionales}
                disabled
                className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none bg-stone-100 text-stone-400"
              />
            </Campo>

            <Campo label="Estado">
              <input
                type="text"
                value={formData.activo ? 'Activa' : 'Inactiva'}
                disabled
                className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none bg-stone-100 text-stone-400"
              />
            </Campo>
          </div>
        </section>

        <aside className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
              <Image className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-black text-stone-800">
                Logo principal
              </h3>

              <p className="text-xs text-stone-400">
                Se muestra en el centro del header.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5 flex items-center justify-center min-h-[180px]">
            <img
              src={logoVisible}
              alt="Logo de empresa"
              className="max-h-36 max-w-full object-contain"
              onError={() => setLogoRoto(true)}
            />
          </div>

          {puedeEditar && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoLogo('archivo')}
                  className={`rounded-xl border px-4 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    metodoLogo === 'archivo'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  Subir
                </button>

                <button
                  type="button"
                  onClick={() => setMetodoLogo('url')}
                  className={`rounded-xl border px-4 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    metodoLogo === 'url'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Link className="w-4 h-4" />
                  URL
                </button>
              </div>

              {metodoLogo === 'archivo' && (
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleArchivoLogoChange}
                    className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                  />

                  {archivoLogo && (
                    <div className="flex items-center justify-between gap-3 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-stone-700 truncate">
                          {archivoLogo.name}
                        </p>

                        <p className="text-xs text-stone-400">
                          Se subirá al guardar cambios.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setArchivoLogo(null)
                          setVistaPreviaLogo('')
                        }}
                        className="text-stone-400 hover:text-red-500 transition-colors"
                        title="Quitar archivo"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {metodoLogo === 'url' && (
                <Campo label="URL del logo">
                  <input
                    type="url"
                    value={formData.url_logo}
                    onChange={(e) => cambiarCampo('url_logo', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </Campo>
              )}

              {(formData.url_logo || vistaPreviaLogo || archivoLogo) && (
                <button
                  type="button"
                  onClick={quitarLogo}
                  className="w-full px-4 py-2.5 rounded-xl border border-red-100 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors"
                >
                  Quitar logo y usar predeterminado
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={guardando || !puedeEditar}
            className="w-full mt-6 px-5 py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:bg-stone-300 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {guardando ? 'Guardando...' : 'Guardar empresa'}
          </button>
        </aside>
      </form>

      <section className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>

          <div>
            <h3 className="font-black text-stone-800">
              Información administrativa
            </h3>

            <p className="text-xs text-stone-400">
              Datos de lectura para control interno.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoBox titulo="ID de empresa" valor={formData.id} />
          <InfoBox titulo="Creada el" valor={formatearFecha(formData.created_at)} />
          <InfoBox titulo="Permiso actual" valor={rolEmpresa || 'Profesional'} />
        </div>
      </section>
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

function InfoBox({ titulo, valor }) {
  return (
    <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4 min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
        {titulo}
      </p>

      <p className="text-sm font-bold text-stone-700 mt-2 truncate" title={valor}>
        {valor || 'Sin dato'}
      </p>
    </div>
  )
}

function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha'

  return new Date(fecha).toLocaleDateString('es-AR')
}