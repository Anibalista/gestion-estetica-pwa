// src/components/perfil/PersonalizarApp.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import {
  CheckCircle2,
  Image,
  Link,
  Loader2,
  Monitor,
  Palette,
  RefreshCw,
  Save,
  Sparkles,
  Type,
  UploadCloud,
  UserCircle,
  X
} from 'lucide-react'
import {
  APP_THEMES,
  applyUIPreferences,
  clearSavedTheme,
  getBrowserPreferredTheme,
  saveTheme
} from '../../utils/themeManager'
import { uploadImage } from '../../utils/storage'

const TEMA_SISTEMA = {
  id: 'sistema',
  nombre: 'Sistema',
  descripcion: 'Usa la preferencia del navegador',
  preview: ['#f5f5f4', '#ffffff', '#0d9488']
}

const THEME_PREVIEWS = {
  normal: ['#f5f5f4', '#ffffff', '#0d9488'],
  dark: ['#0f172a', '#1e293b', '#2dd4bf'],
  healthy: ['#f3f7f0', '#ffffff', '#7aa95c'],
  glitter: ['#fffaf0', '#ffffff', '#c99700'],
  glamour: ['#fff1f5', '#ffffff', '#db7093']
}

const TEMA_OPCIONES = [
  TEMA_SISTEMA,
  ...APP_THEMES.map((theme) => ({
    ...theme,
    preview: THEME_PREVIEWS[theme.id] || THEME_PREVIEWS.normal
  }))
]

const TAMANOS_FUENTE = [
  {
    id: 'chico',
    nombre: 'Chico',
    descripcion: 'Más compacto, ideal para pantallas chicas'
  },
  {
    id: 'mediano',
    nombre: 'Mediano',
    descripcion: 'Tamaño recomendado por defecto'
  },
  {
    id: 'grande',
    nombre: 'Grande',
    descripcion: 'Más cómodo para lectura'
  }
]

const DENSIDADES = [
  {
    id: 'comoda',
    nombre: 'Cómoda',
    descripcion: 'Más aire entre tarjetas y controles'
  },
  {
    id: 'compacta',
    nombre: 'Compacta',
    descripcion: 'Más información visible en pantalla'
  }
]

const AVATARES = [
  {
    id: 'iniciales',
    nombre: 'Iniciales',
    descripcion: 'Muestra la inicial del correo'
  },
  {
    id: 'color',
    nombre: 'Color',
    descripcion: 'Avatar simple con color personalizado'
  },
  {
    id: 'imagen',
    nombre: 'Imagen',
    descripcion: 'Subí una imagen o usá una URL'
  }
]

const COLORES_AVATAR = [
  '#0d9488',
  '#7aa95c',
  '#c99700',
  '#db7093',
  '#3b82f6',
  '#9333ea',
  '#ef4444',
  '#111827'
]

export function PersonalizarApp({
  session,
  empresaActiva
}) {
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const [metodoImagenAvatar, setMetodoImagenAvatar] = useState('archivo')
  const [archivoAvatar, setArchivoAvatar] = useState(null)
  const [vistaPreviaAvatar, setVistaPreviaAvatar] = useState('')

  const [preferencias, setPreferencias] = useState({
    tema: 'sistema',
    tamano_fuente: 'mediano',
    densidad_ui: 'comoda',
    avatar_tipo: 'iniciales',
    url_avatar: '',
    color_primario: '#0d9488',
    color_secundario: '#0f766e'
  })

  const inicialUsuario = useMemo(() => {
    return session?.user?.email?.charAt(0).toUpperCase() || 'P'
  }, [session?.user?.email])

  useEffect(() => {
    if (session?.user?.id) {
      cargarPreferencias()
    }
  }, [session?.user?.id])

  useEffect(() => {
    return () => {
      if (vistaPreviaAvatar?.startsWith('blob:')) {
        URL.revokeObjectURL(vistaPreviaAvatar)
      }
    }
  }, [vistaPreviaAvatar])

  const cargarPreferencias = async () => {
    setLoading(true)
    setFeedback(null)

    try {
      const { data, error } = await supabase
        .from('preferencias_ui_profesional')
        .select(`
          profesional_id,
          tema,
          tamano_fuente,
          densidad_ui,
          avatar_tipo,
          url_avatar,
          color_primario,
          color_secundario
        `)
        .eq('profesional_id', session.user.id)
        .maybeSingle()

      if (error) throw error

      const preferenciasBD = {
        tema: data?.tema || 'sistema',
        tamano_fuente: data?.tamano_fuente || 'mediano',
        densidad_ui: data?.densidad_ui || 'comoda',
        avatar_tipo: data?.avatar_tipo || 'iniciales',
        url_avatar: data?.url_avatar || '',
        color_primario: data?.color_primario || '#0d9488',
        color_secundario: data?.color_secundario || '#0f766e'
      }

      setPreferencias(preferenciasBD)
      setArchivoAvatar(null)
      setVistaPreviaAvatar('')
      setMetodoImagenAvatar(preferenciasBD.url_avatar ? 'url' : 'archivo')

      applyUIPreferences({
        ...preferenciasBD,
        tema: preferenciasBD.tema === 'sistema' ? null : preferenciasBD.tema
      })
    } catch (error) {
      console.error('Error cargando preferencias UI:', error)

      setFeedback({
        tipo: 'error',
        mensaje: 'No se pudieron cargar las preferencias: ' + error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const cambiarPreferencia = (campo, valor) => {
    const nuevasPreferencias = {
      ...preferencias,
      [campo]: valor
    }

    if (campo === 'avatar_tipo' && valor !== 'imagen') {
      setArchivoAvatar(null)
      setVistaPreviaAvatar('')
    }

    if (campo === 'avatar_tipo' && valor === 'imagen' && !preferencias.url_avatar) {
      setMetodoImagenAvatar('archivo')
    }

    setPreferencias(nuevasPreferencias)

    applyUIPreferences({
      ...nuevasPreferencias,
      tema: nuevasPreferencias.tema === 'sistema' ? null : nuevasPreferencias.tema
    })
  }

  const handleArchivoAvatarChange = (e) => {
    const file = e.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setFeedback({
        tipo: 'error',
        mensaje: 'El archivo seleccionado debe ser una imagen.'
      })
      return
    }

    if (vistaPreviaAvatar?.startsWith('blob:')) {
      URL.revokeObjectURL(vistaPreviaAvatar)
    }

    setArchivoAvatar(file)
    setVistaPreviaAvatar(URL.createObjectURL(file))

    setPreferencias((prev) => ({
      ...prev,
      avatar_tipo: 'imagen'
    }))

    setMetodoImagenAvatar('archivo')
  }

  const quitarImagenAvatar = () => {
    if (vistaPreviaAvatar?.startsWith('blob:')) {
      URL.revokeObjectURL(vistaPreviaAvatar)
    }

    setArchivoAvatar(null)
    setVistaPreviaAvatar('')

    setPreferencias((prev) => ({
      ...prev,
      url_avatar: '',
      avatar_tipo: 'iniciales'
    }))
  }

  const guardarPreferencias = async () => {
    setGuardando(true)
    setFeedback(null)

    try {
      const temaParaBD = preferencias.tema === 'sistema' ? null : preferencias.tema

      let urlAvatarFinal = null

      if (preferencias.avatar_tipo === 'imagen') {
        if (metodoImagenAvatar === 'archivo' && archivoAvatar) {
          urlAvatarFinal = await uploadImage(
            archivoAvatar,
            'combos',
            `avatars/${session.user.id}`
          )
        } else {
          urlAvatarFinal = preferencias.url_avatar?.trim() || null
        }

        if (!urlAvatarFinal) {
          throw new Error('Para usar avatar de imagen, subí un archivo o ingresá una URL.')
        }
      }

      const payload = {
        profesional_id: session.user.id,
        tema: temaParaBD,
        tamano_fuente: preferencias.tamano_fuente,
        densidad_ui: preferencias.densidad_ui,
        avatar_tipo: preferencias.avatar_tipo,
        url_avatar: preferencias.avatar_tipo === 'imagen'
          ? urlAvatarFinal
          : null,
        color_primario: preferencias.color_primario || null,
        color_secundario: preferencias.color_secundario || null
      }

      const { error } = await supabase
        .from('preferencias_ui_profesional')
        .upsert(payload, {
          onConflict: 'profesional_id'
        })

      if (error) throw error

      if (temaParaBD) {
        saveTheme(temaParaBD)
      } else {
        clearSavedTheme()
      }

      applyUIPreferences(payload)

      setPreferencias((prev) => ({
        ...prev,
        ...payload,
        tema: payload.tema || 'sistema',
        url_avatar: payload.url_avatar || ''
      }))

      setArchivoAvatar(null)
      setVistaPreviaAvatar('')
      setMetodoImagenAvatar(payload.url_avatar ? 'url' : 'archivo')
      
      window.dispatchEvent(new CustomEvent('preferencias-ui-actualizadas'))

      setFeedback({
        tipo: 'exito',
        mensaje: 'Preferencias guardadas correctamente.'
      })
    } catch (error) {
      console.error('Error guardando preferencias UI:', error)

      setFeedback({
        tipo: 'error',
        mensaje: 'No se pudieron guardar las preferencias: ' + error.message
      })
    } finally {
      setGuardando(false)
    }
  }

  const restaurarSistema = () => {
    if (vistaPreviaAvatar?.startsWith('blob:')) {
      URL.revokeObjectURL(vistaPreviaAvatar)
    }

    const preferenciasSistema = {
      ...preferencias,
      tema: 'sistema',
      tamano_fuente: 'mediano',
      densidad_ui: 'comoda',
      avatar_tipo: 'iniciales',
      url_avatar: '',
      color_primario: '#0d9488',
      color_secundario: '#0f766e'
    }

    setArchivoAvatar(null)
    setVistaPreviaAvatar('')
    setMetodoImagenAvatar('archivo')
    setPreferencias(preferenciasSistema)
    clearSavedTheme()

    applyUIPreferences({
      ...preferenciasSistema,
      tema: null
    })
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
            Personalizar App
          </h2>

          <p className="text-sm text-stone-500 font-light italic">
            Elegí tema visual, avatar y preferencias generales de interfaz.
          </p>

          <p className="text-xs text-stone-400 mt-1">
            Empresa activa:{' '}
            <span className="font-bold text-teal-600">
              {empresaActiva?.nombre || 'Sin empresa'}
            </span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={restaurarSistema}
            className="px-4 py-3 rounded-2xl bg-white border border-stone-200 text-stone-700 text-sm font-bold hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Restaurar
          </button>

          <button
            type="button"
            onClick={guardarPreferencias}
            disabled={guardando}
            className="px-4 py-3 rounded-2xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:bg-stone-300 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {guardando ? 'Guardando...' : 'Guardar preferencias'}
          </button>
        </div>
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

      <section className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
            <Palette className="w-5 h-5" />
          </div>

          <div>
            <h3 className="font-black text-stone-800">
              Tema visual
            </h3>

            <p className="text-xs text-stone-400">
              Si elegís Sistema, la app usa la preferencia clara/oscura del navegador.
              Preferencia actual del navegador: {getBrowserPreferredTheme() === 'dark' ? 'oscuro' : 'claro'}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {TEMA_OPCIONES.map((tema) => {
            const activo = preferencias.tema === tema.id

            return (
              <button
                key={tema.id}
                type="button"
                onClick={() => cambiarPreferencia('tema', tema.id)}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  activo
                    ? 'border-teal-300 bg-teal-50 shadow-sm'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-stone-800">
                      {tema.nombre}
                    </p>

                    <p className="text-xs text-stone-500 mt-1">
                      {tema.descripcion}
                    </p>
                  </div>

                  {activo && (
                    <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  {tema.preview.map((color) => (
                    <span
                      key={color}
                      className="w-8 h-8 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
              <Type className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-black text-stone-800">
                Lectura e interfaz
              </h3>

              <p className="text-xs text-stone-400">
                Configuración general para adaptar la app a la pantalla y comodidad.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <GrupoOpciones
              titulo="Tamaño de fuente"
              opciones={TAMANOS_FUENTE}
              valor={preferencias.tamano_fuente}
              onChange={(valor) => cambiarPreferencia('tamano_fuente', valor)}
            />

            <GrupoOpciones
              titulo="Densidad visual"
              opciones={DENSIDADES}
              valor={preferencias.densidad_ui}
              onChange={(valor) => cambiarPreferencia('densidad_ui', valor)}
            />
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
              <UserCircle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-black text-stone-800">
                Ícono de usuario
              </h3>

              <p className="text-xs text-stone-400">
                Podés usar iniciales, color, imagen subida desde el dispositivo o una URL externa.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-5">
            <VistaPreviaAvatar
              preferencias={preferencias}
              inicialUsuario={inicialUsuario}
              vistaPreviaAvatar={vistaPreviaAvatar}
            />

            <div className="flex-1 space-y-5">
              <GrupoOpciones
                titulo="Tipo de avatar"
                opciones={AVATARES}
                valor={preferencias.avatar_tipo}
                onChange={(valor) => cambiarPreferencia('avatar_tipo', valor)}
              />

              {preferencias.avatar_tipo === 'imagen' && (
                <div className="space-y-4 bg-stone-50 border border-stone-100 rounded-2xl p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMetodoImagenAvatar('archivo')}
                      className={`rounded-xl border px-4 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        metodoImagenAvatar === 'archivo'
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <UploadCloud className="w-4 h-4" />
                      Subir imagen
                    </button>

                    <button
                      type="button"
                      onClick={() => setMetodoImagenAvatar('url')}
                      className={`rounded-xl border px-4 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        metodoImagenAvatar === 'url'
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <Link className="w-4 h-4" />
                      Usar URL
                    </button>
                  </div>

                  {metodoImagenAvatar === 'archivo' && (
                    <div className="space-y-3">
                      <label className="block">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
                          Imagen desde dispositivo
                        </span>

                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleArchivoAvatarChange}
                          className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                        />
                      </label>

                      {archivoAvatar && (
                        <div className="flex items-center justify-between gap-3 bg-white border border-stone-200 rounded-xl px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-stone-700 truncate">
                              {archivoAvatar.name}
                            </p>

                            <p className="text-xs text-stone-400">
                              Se subirá al guardar preferencias.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setArchivoAvatar(null)
                              setVistaPreviaAvatar('')
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

                  {metodoImagenAvatar === 'url' && (
                    <label className="block">
                      <span className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">
                        URL de imagen
                      </span>

                      <div className="relative">
                        <Image className="w-4 h-4 text-stone-400 absolute left-3 top-3" />

                        <input
                          type="url"
                          value={preferencias.url_avatar}
                          onChange={(e) => cambiarPreferencia('url_avatar', e.target.value)}
                          placeholder="https://..."
                          className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </label>
                  )}

                  {(preferencias.url_avatar || vistaPreviaAvatar || archivoAvatar) && (
                    <button
                      type="button"
                      onClick={quitarImagenAvatar}
                      className="w-full px-4 py-2.5 rounded-xl border border-red-100 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors"
                    >
                      Quitar imagen y volver a iniciales
                    </button>
                  )}
                </div>
              )}

              {preferencias.avatar_tipo === 'color' && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">
                    Color de avatar
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {COLORES_AVATAR.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => cambiarPreferencia('color_primario', color)}
                        className={`w-9 h-9 rounded-full border-2 transition-all ${
                          preferencias.color_primario === color
                            ? 'border-stone-800 scale-110'
                            : 'border-white shadow-sm'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-teal-50 text-teal-700 rounded-xl p-2">
            <Sparkles className="w-5 h-5" />
          </div>

          <div>
            <h3 className="font-black text-stone-800">
              Vista previa
            </h3>

            <p className="text-xs text-stone-400">
              Ejemplo de cómo se verán tarjetas, botones y textos principales.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-stone-400">
              Tarjeta
            </p>

            <p className="text-xl font-black text-stone-800 mt-2">
              $125.000
            </p>

            <p className="text-sm text-stone-500 mt-1">
              Ingresos estimados del mes.
            </p>
          </div>

          <div className="rounded-2xl border border-teal-100 bg-teal-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-teal-700">
              Destacado
            </p>

            <p className="text-xl font-black text-stone-800 mt-2">
              Agenda activa
            </p>

            <p className="text-sm text-stone-500 mt-1">
              Tema aplicado en tiempo real.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col justify-between">
            <Monitor className="w-8 h-8 text-teal-600 mb-4" />

            <button
              type="button"
              className="px-4 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors"
            >
              Botón principal
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function GrupoOpciones({
  titulo,
  opciones,
  valor,
  onChange
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">
        {titulo}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {opciones.map((opcion) => {
          const activo = valor === opcion.id

          return (
            <button
              key={opcion.id}
              type="button"
              onClick={() => onChange(opcion.id)}
              className={`rounded-2xl border p-3 text-left transition-all ${
                activo
                  ? 'border-teal-300 bg-teal-50'
                  : 'border-stone-200 bg-white hover:bg-stone-50'
              }`}
            >
              <p className="font-black text-stone-800">
                {opcion.nombre}
              </p>

              <p className="text-xs text-stone-500 mt-1">
                {opcion.descripcion}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function VistaPreviaAvatar({
  preferencias,
  inicialUsuario,
  vistaPreviaAvatar
}) {
  const [imagenRota, setImagenRota] = useState(false)

  const urlImagen = vistaPreviaAvatar || preferencias.url_avatar

  useEffect(() => {
    setImagenRota(false)
  }, [urlImagen])

  if (preferencias.avatar_tipo === 'imagen' && urlImagen && !imagenRota) {
    return (
      <div className="w-32 h-32 rounded-3xl border border-stone-200 bg-stone-50 overflow-hidden shrink-0">
        <img
          src={urlImagen}
          alt="Avatar"
          className="w-full h-full object-cover"
          onError={() => setImagenRota(true)}
        />
      </div>
    )
  }

  return (
    <div
      className="w-32 h-32 rounded-3xl border border-stone-200 flex items-center justify-center text-white text-5xl font-black shrink-0 shadow-sm"
      style={{
        backgroundColor: preferencias.avatar_tipo === 'color'
          ? preferencias.color_primario || '#0d9488'
          : '#0d9488'
      }}
      title={
        preferencias.avatar_tipo === 'imagen' && imagenRota
          ? 'No se pudo cargar la imagen. Se muestra la inicial.'
          : 'Avatar por inicial'
      }
    >
      {inicialUsuario}
    </div>
  )
}