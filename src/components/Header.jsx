// src/components/Header.jsx
import { useEffect, useState } from 'react'
import {
  Building2,
  Bug,
  LogOut,
  Menu,
  Palette,
  UserCircle
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo-2026.png'

export function Header({
  session,
  isMenuOpen,
  setIsMenuOpen,
  handleLogout,
  setVistaActiva,
  empresaActiva,
  onAbrirSelectorEmpresa
}) {
  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false)
  const [logoEmpresaRoto, setLogoEmpresaRoto] = useState(false)
  const [preferenciasPerfil, setPreferenciasPerfil] = useState({
    avatar_tipo: 'iniciales',
    url_avatar: '',
    color_primario: '#0d9488'
  })

  const inicial = session?.user?.email?.charAt(0).toUpperCase() || 'P'

  useEffect(() => {
    if (session?.user?.id) {
      cargarPreferenciasPerfil()
    }
  }, [session?.user?.id])

  useEffect(() => {
    setLogoEmpresaRoto(false)
  }, [empresaActiva?.id, empresaActiva?.url_logo])

  useEffect(() => {
    const actualizarPreferencias = () => {
      if (session?.user?.id) {
        cargarPreferenciasPerfil()
      }
    }

    window.addEventListener('preferencias-ui-actualizadas', actualizarPreferencias)
    window.addEventListener('focus', actualizarPreferencias)

    return () => {
      window.removeEventListener('preferencias-ui-actualizadas', actualizarPreferencias)
      window.removeEventListener('focus', actualizarPreferencias)
    }
  }, [session?.user?.id])

  const cargarPreferenciasPerfil = async () => {
    try {
      const { data, error } = await supabase
        .from('preferencias_ui_profesional')
        .select(`
          avatar_tipo,
          url_avatar,
          color_primario
        `)
        .eq('profesional_id', session.user.id)
        .maybeSingle()

      if (error) throw error

      setPreferenciasPerfil({
        avatar_tipo: data?.avatar_tipo || 'iniciales',
        url_avatar: data?.url_avatar || '',
        color_primario: data?.color_primario || '#0d9488'
      })
    } catch (error) {
      console.error('No se pudo cargar el avatar del perfil:', error.message)

      setPreferenciasPerfil({
        avatar_tipo: 'iniciales',
        url_avatar: '',
        color_primario: '#0d9488'
      })
    }
  }

  const navegarA = (vista) => {
    setVistaActiva(vista)
    setMenuPerfilAbierto(false)
  }

  const manejarClickHamburguesa = (e) => {
    e.stopPropagation()
    setIsMenuOpen(!isMenuOpen)
  }

  const manejarClickLogo = (e) => {
    e.stopPropagation()

    if (onAbrirSelectorEmpresa) {
      onAbrirSelectorEmpresa()
    }
  }

  const manejarClickPerfil = (e) => {
    e.stopPropagation()
    cargarPreferenciasPerfil()
    setMenuPerfilAbierto(!menuPerfilAbierto)
  }

  return (
    <header className="bg-white border-b border-stone-200 h-26 flex items-center justify-between px-4 shrink-0 shadow-sm relative z-40">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={manejarClickHamburguesa}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          title="Abrir menú"
        >
          <Menu className="w-6 h-6 text-stone-600" />
        </button>
      </div>

      <div className="flex-1 flex justify-center">
        <button
          type="button"
          onClick={manejarClickLogo}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
          title="Cambiar empresa activa"
        >
          <img
            src={!logoEmpresaRoto && empresaActiva?.url_logo ? empresaActiva.url_logo : logo}
            alt={empresaActiva?.nombre || 'Logo'}
            className="h-24 w-auto object-contain"
            onError={() => setLogoEmpresaRoto(true)}
          />

          <div className="hidden md:flex flex-col items-start leading-tight">
            <span className="font-medium tracking-widest text-stone-500 text-sm uppercase">
              {empresaActiva?.nombre || 'Seleccionar empresa'}
            </span>

            {empresaActiva?.plan && (
              <span className="text-[10px] font-black tracking-widest text-teal-600 uppercase">
                {empresaActiva.plan}
              </span>
            )}
          </div>
        </button>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={manejarClickPerfil}
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 border-2 border-white ring-2 ring-stone-100 overflow-hidden"
          title="Abrir perfil"
        >
          <AvatarUsuario
            preferencias={preferenciasPerfil}
            inicial={inicial}
            sizeClassName="w-full h-full"
            textClassName="text-sm"
          />
        </button>

        {menuPerfilAbierto && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuPerfilAbierto(false)}
            />

            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-stone-100 z-50 overflow-hidden transform origin-top-right transition-all">
              <div className="p-4 border-b border-stone-100 bg-stone-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-sm shrink-0">
                    <AvatarUsuario
                      preferencias={preferenciasPerfil}
                      inicial={inicial}
                      sizeClassName="w-full h-full"
                      textClassName="text-lg"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">
                      Cuenta activa
                    </p>

                    <p className="text-sm font-medium text-stone-700 truncate">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>

                <div className="mt-3 p-3 rounded-xl bg-white border border-stone-100">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                    Empresa activa
                  </p>

                  <p className="text-sm font-bold text-stone-700 truncate mt-1">
                    {empresaActiva?.nombre || 'Sin empresa seleccionada'}
                  </p>
                </div>
              </div>

              <div className="p-2 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuPerfilAbierto(false)
                    onAbrirSelectorEmpresa?.()
                  }}
                  className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-stone-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  Cambiar empresa
                </button>

                <button
                  type="button"
                  onClick={() => navegarA('personalizar')}
                  className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-stone-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-colors"
                >
                  <Palette className="w-4 h-4" />
                  Personalizar App
                </button>

                <button
                  type="button"
                  onClick={() => navegarA('empresa')}
                  className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-stone-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-colors"
                >
                  <UserCircle className="w-4 h-4" />
                  Mi Empresa
                </button>

                <button
                  type="button"
                  onClick={() => navegarA('mejoras')}
                  className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-stone-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-colors"
                >
                  <Bug className="w-4 h-4" />
                  Sugerencias y Bugs
                </button>
              </div>

              <div className="p-2 border-t border-stone-100 bg-red-50/30">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full text-center px-3 py-3 text-sm font-bold text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl transition-colors active:scale-95"
                >
                  <LogOut className="w-5 h-5" />
                  CERRAR SESIÓN
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

function AvatarUsuario({
  preferencias,
  inicial,
  sizeClassName = 'w-10 h-10',
  textClassName = 'text-sm'
}) {
  const [imagenRota, setImagenRota] = useState(false)

  const avatarTipo = preferencias?.avatar_tipo || 'iniciales'
  const urlAvatar = preferencias?.url_avatar || ''
  const colorAvatar = preferencias?.color_primario || '#0d9488'

  useEffect(() => {
    setImagenRota(false)
  }, [urlAvatar])

  if (avatarTipo === 'imagen' && urlAvatar && !imagenRota) {
    return (
      <img
        src={urlAvatar}
        alt="Avatar de usuario"
        className={`${sizeClassName} object-cover`}
        onError={() => setImagenRota(true)}
      />
    )
  }

  return (
    <div
      className={`${sizeClassName} flex items-center justify-center text-white font-black ${textClassName}`}
      style={{
        backgroundColor: avatarTipo === 'color'
          ? colorAvatar
          : '#0d9488'
      }}
      title={
        avatarTipo === 'imagen' && imagenRota
          ? 'No se pudo cargar la imagen. Se muestra la inicial.'
          : 'Avatar de usuario'
      }
    >
      {inicial}
    </div>
  )
}