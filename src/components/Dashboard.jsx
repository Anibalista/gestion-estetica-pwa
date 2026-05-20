// src/components/Dashboard.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { InicioDashboard } from './inicio/InicioDashboard'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Clientes } from './Clientes'
import { Productos } from './Productos'
import { Servicios } from './Servicios'
import { Combos } from './Combos'
import { Turnos } from './Turnos'
import { Ventas } from './Ventas'
import { Insumos } from './productos/Insumos'
import { ReportesAlertas } from './productos/ReportesAlertas'
import { InformesProductividad } from './turnos/InformesProductividad'
import { InformesIdeas } from './clientes/InformesIdeas'
import { InformesAdministracion } from './servicios/InformesAdministracion'
import { EmpresaSelector } from './EmpresaSelector'
import { ReportesComparativos } from './finanzas/ReportesComparativos'
import { InformesEstadisticos } from './finanzas/InformesEstadisticos'
import { CierreCaja } from './finanzas/CierreCaja'
import { VerTransacciones } from './finanzas/VerTransacciones'
import { Building2, Loader2 } from 'lucide-react'
import { PersonalizarApp } from './perfil/PersonalizarApp'
import { MiEmpresa } from './perfil/MiEmpresa'
import { SugerenciasBugs } from './perfil/SugerenciasBugs'
import { applyUIPreferences } from '../utils/themeManager'

export function Dashboard({ session }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [vistaActiva, setVistaActiva] = useState('inicio')

  const [loadingEmpresas, setLoadingEmpresas] = useState(true)
  const [errorEmpresas, setErrorEmpresas] = useState('')
  const [empresasUsuario, setEmpresasUsuario] = useState([])
  const [empresaActiva, setEmpresaActiva] = useState(null)
  const [vinculoEmpresaActiva, setVinculoEmpresaActiva] = useState(null)
  const [selectorEmpresaAbierto, setSelectorEmpresaAbierto] = useState(false)
  const [selectorEmpresaObligatorio, setSelectorEmpresaObligatorio] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      cargarEmpresasUsuario()
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) {
      cargarPreferenciasUI()
    }
  }, [session?.user?.id])

  const cargarPreferenciasUI = async () => {
    try {
      const { data, error } = await supabase
        .from('preferencias_ui_profesional')
        .select(`
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

      if (data) {
        applyUIPreferences(data)
      }
    } catch (error) {
      console.error('No se pudieron cargar las preferencias UI:', error.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const cerrarMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false)
    }
  }

  const obtenerKeyEmpresaActiva = () => {
    return `empresa_activa_${session.user.id}`
  }

  const cargarEmpresasUsuario = async () => {
    setLoadingEmpresas(true)
    setErrorEmpresas('')

    try {
      const [empresasResponse, profesionalResponse] = await Promise.all([
        supabase
          .from('empresa_profesional')
          .select(`
            empresa_id,
            profesional_id,
            rol,
            activo,
            fecha_vinculo,
            empresas (
              id,
              nombre,
              plan,
              activo,
              url_logo,
              cantidad_profesionales,
              cuit,
              telefono_contacto,
              created_at
            )
          `)
          .eq('profesional_id', session.user.id)
          .eq('activo', true),

        supabase
          .from('profesionales')
          .select('empresa_activa_id')
          .eq('id', session.user.id)
          .maybeSingle()
      ])

      if (empresasResponse.error) throw empresasResponse.error
      if (profesionalResponse.error) throw profesionalResponse.error

      const empresasActivas = (empresasResponse.data || [])
        .map((item) => ({
          empresa_id: item.empresa_id,
          profesional_id: item.profesional_id,
          rol: item.rol,
          activo: item.activo,
          fecha_vinculo: item.fecha_vinculo,
          empresa: item.empresas
        }))
        .filter((item) => item.empresa)
        .filter((item) => item.empresa.activo !== false)

      setEmpresasUsuario(empresasActivas)

      if (empresasActivas.length === 0) {
        setEmpresaActiva(null)
        setVinculoEmpresaActiva(null)
        setSelectorEmpresaAbierto(true)
        setSelectorEmpresaObligatorio(true)
        return
      }

      const empresaGuardadaId = localStorage.getItem(obtenerKeyEmpresaActiva())
      const empresaPerfilId = profesionalResponse.data?.empresa_activa_id

      const empresaLocal = empresasActivas.find((item) => item.empresa.id === empresaGuardadaId)
      const empresaPerfil = empresasActivas.find((item) => item.empresa.id === empresaPerfilId)

      if (empresaLocal) {
        aplicarEmpresaActiva(empresaLocal, false)
        return
      }

      if (empresaPerfil) {
        aplicarEmpresaActiva(empresaPerfil, false)
        return
      }

      if (empresasActivas.length === 1) {
        aplicarEmpresaActiva(empresasActivas[0], true)
        return
      }

      setEmpresaActiva(null)
      setVinculoEmpresaActiva(null)
      setSelectorEmpresaAbierto(true)
      setSelectorEmpresaObligatorio(true)

    } catch (error) {
      console.error('Error al cargar empresas:', error)
      setErrorEmpresas(error.message || 'No se pudieron cargar las empresas vinculadas.')
      setSelectorEmpresaAbierto(true)
      setSelectorEmpresaObligatorio(true)
    } finally {
      setLoadingEmpresas(false)
    }
  }

  const manejarEmpresaActualizada = async () => {
    await cargarEmpresasUsuario()
  }

  const aplicarEmpresaActiva = async (vinculo, guardarEnBD = false) => {
    if (!vinculo?.empresa) return

    setEmpresaActiva(vinculo.empresa)
    setVinculoEmpresaActiva(vinculo)
    localStorage.setItem(obtenerKeyEmpresaActiva(), vinculo.empresa.id)

    setSelectorEmpresaAbierto(false)
    setSelectorEmpresaObligatorio(false)

    if (guardarEnBD) {
      await guardarEmpresaActivaEnPerfil(vinculo.empresa.id)
    }
  }

  const seleccionarEmpresa = async (vinculo) => {
    await aplicarEmpresaActiva(vinculo, true)
    setVistaActiva('inicio')
  }

  const guardarEmpresaActivaEnPerfil = async (empresaId) => {
    try {
      const { error } = await supabase
        .from('profesionales')
        .update({
          empresa_activa_id: empresaId
        })
        .eq('id', session.user.id)

      if (error) throw error
    } catch (error) {
      console.error('No se pudo guardar empresa activa en perfil:', error.message)
    }
  }

  const abrirSelectorEmpresa = () => {
    setSelectorEmpresaAbierto(true)
    setSelectorEmpresaObligatorio(!empresaActiva)
  }

  const vistasEnConstruccion = {
    'registrar-atencion': {
      titulo: 'Registrar Atención',
      descripcion: 'Acá vamos a registrar una atención realizada, asociarla a un cliente, turno, servicio, profesional y monto cobrado.',
      icono: '📝'
    },
    'reportes-comparativos': {
      titulo: 'Reportes Comparativos',
      descripcion: 'Acá vamos a comparar períodos, ventas, servicios, productos, clientes y rendimiento financiero.',
      icono: '📈'
    },
    'informes-estadisticos': {
      titulo: 'Informes Estadísticos',
      descripcion: 'Acá vamos a mostrar estadísticas financieras, ingresos por período, medios de pago y evolución del negocio.',
      icono: '📉'
    }
  }

  const vistaConstruccion = vistasEnConstruccion[vistaActiva]
  const mostrarInsumos = vistaActiva === 'insumos' || vistaActiva === 'insumos-costos'
  const mostrarReportesAlertas = vistaActiva === 'reportes-alertas'
  const mostrarInformesProductividad = vistaActiva === 'informes-productividad'
  const mostrarInformesIdeas = vistaActiva === 'informes-ideas'
  const mostrarInformesAdministracion = vistaActiva === 'informes-administracion'
  const mostrarVerTransacciones = vistaActiva === 'ver-transacciones'
  const mostrarCierreCaja = vistaActiva === 'cierre-caja'
  const mostrarReportesComparativos = vistaActiva === 'reportes-comparativos'
  const mostrarInformesEstadisticos = vistaActiva === 'informes-estadisticos'

  if (loadingEmpresas) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center text-stone-500">
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
          <p className="text-sm font-medium">
            Preparando empresas vinculadas...
          </p>
        </div>
      </div>
    )
  }

  if (!empresaActiva && empresasUsuario.length === 0) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <div className="max-w-xl bg-white rounded-3xl shadow-sm border border-stone-200 p-8 text-center">
          <Building2 className="w-14 h-14 mx-auto text-teal-600 mb-4" />

          <h1 className="text-2xl font-light text-stone-800 mb-3">
            No hay empresa vinculada
          </h1>

          <p className="text-stone-500 mb-6">
            Este usuario necesita estar vinculado a una empresa activa en empresa_profesional para usar la app con la nueva lógica financiera.
          </p>

          {errorEmpresas && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-2xl p-3 mb-4">
              {errorEmpresas}
            </p>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="px-5 py-3 rounded-2xl bg-stone-800 text-white text-sm font-bold hover:bg-stone-900 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-stone-100 flex flex-col text-stone-800 font-sans"
      onClick={cerrarMenu}
    >
      <Header 
        session={session} 
        isMenuOpen={isMenuOpen} 
        setIsMenuOpen={setIsMenuOpen} 
        handleLogout={handleLogout} 
        setVistaActiva={setVistaActiva}
        empresaActiva={empresaActiva}
        onAbrirSelectorEmpresa={abrirSelectorEmpresa}
      />

      <EmpresaSelector
        abierto={selectorEmpresaAbierto}
        obligatorio={selectorEmpresaObligatorio}
        empresas={empresasUsuario}
        empresaActiva={empresaActiva}
        loading={loadingEmpresas}
        error={errorEmpresas}
        onSeleccionar={seleccionarEmpresa}
        onCerrar={() => {
          if (!selectorEmpresaObligatorio) {
            setSelectorEmpresaAbierto(false)
          }
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isMenuOpen={isMenuOpen} 
          setVistaActiva={setVistaActiva} 
          setIsMenuOpen={setIsMenuOpen} 
        />

        <main className="flex-1 p-6 overflow-y-auto">
          
          {vistaActiva === 'inicio' && (
            <InicioDashboard
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
              setVistaActiva={setVistaActiva}
            />
          )}

          {(vistaActiva === 'clientes' || vistaActiva === 'nuevo-cliente') && (
            <Clientes 
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
              initialModo={vistaActiva === 'nuevo-cliente' ? 'formulario' : 'lista'} 
            />
          )}

          {(vistaActiva === 'registrar-producto' || vistaActiva === 'stock') && (
            <Productos 
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
              initialModo={vistaActiva === 'registrar-producto' ? 'registrar' : 'stock'} 
            />
          )}

          {(vistaActiva === 'ver-servicios' || vistaActiva === 'nuevo-servicio') && (
            <Servicios 
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
              initialModo={vistaActiva} 
            />
          )}

          {vistaActiva === 'combos' && (
            <Combos 
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
              initialModo="lista" 
            />
          )}

          {(vistaActiva === 'agenda' || vistaActiva === 'nuevo-turno') && (
            <Turnos 
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
              initialModo={vistaActiva} 
            />
          )}

          {vistaActiva === 'ventas' && (
            <Ventas 
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
              initialModo="historial" 
            />
          )}

          {mostrarInsumos && (
            <Insumos
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
            />
          )}

          {mostrarReportesAlertas && (
            <ReportesAlertas
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
            />
          )}

          {mostrarInformesProductividad && (
            <InformesProductividad
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
            />
          )}

          {mostrarInformesIdeas && (
            <InformesIdeas
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
            />
          )}

          {mostrarInformesAdministracion && (
            <InformesAdministracion
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
            />
          )}

          {mostrarVerTransacciones && (
            <VerTransacciones
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
            />
          )}

          {mostrarCierreCaja && (
            <CierreCaja
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
            />
          )}

          {mostrarReportesComparativos && (
            <ReportesComparativos
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
            />
          )}

          {mostrarInformesEstadisticos && (
            <InformesEstadisticos
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
            />
          )}

          {vistaActiva === 'personalizar' && (
            <PersonalizarApp
              session={session}
              empresaActiva={empresaActiva}
            />
          )}

          {vistaActiva === 'empresa' && (
            <MiEmpresa
              session={session}
              empresaActiva={empresaActiva}
              rolEmpresa={vinculoEmpresaActiva?.rol}
              onEmpresaActualizada={manejarEmpresaActualizada}
            />
          )}

          {vistaActiva === 'mejoras' && (
            <SugerenciasBugs
              session={session}
              empresaActiva={empresaActiva}
            />
          )}

          {vistaConstruccion && !mostrarInsumos && !mostrarReportesAlertas && !mostrarInformesProductividad && !mostrarInformesIdeas && !mostrarInformesAdministracion && !mostrarVerTransacciones && !mostrarCierreCaja && !mostrarReportesComparativos && !mostrarInformesEstadisticos && (
            <VistaEnConstruccion
              icono={vistaConstruccion.icono}
              titulo={vistaConstruccion.titulo}
              descripcion={vistaConstruccion.descripcion}
            />
          )}

        </main>
      </div>
    </div>
  )
}


function VistaEnConstruccion({ icono, titulo, descripcion }) {
  return (
    <div className="border-2 border-dashed border-stone-300 rounded-xl min-h-full flex items-center justify-center text-stone-400 bg-stone-50/50 p-6">
      <div className="max-w-2xl text-center bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
        <span className="text-5xl mb-4 block">
          {icono}
        </span>

        <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-2">
          En construcción
        </p>

        <h2 className="text-2xl font-light text-stone-800 mb-3">
          {titulo}
        </h2>

        <p className="text-stone-500">
          {descripcion}
        </p>
      </div>
    </div>
  )
}

function VistaPerfilEnConstruccion({ icono, titulo, descripcion }) {
  return (
    <div className="max-w-3xl mx-auto p-8 text-center bg-white rounded-2xl shadow-sm border border-stone-200 mt-10">
      <span className="text-5xl mb-4 block">
        {icono}
      </span>

      <h2 className="text-2xl font-light text-stone-800 mb-2">
        {titulo}
      </h2>

      <p className="text-stone-500">
        {descripcion}
      </p>
    </div>
  )
}