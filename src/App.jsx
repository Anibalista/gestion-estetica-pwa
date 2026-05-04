import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Clientes } from './components/Clientes'
import { Productos } from './components/Productos'
import { Servicios } from './components/Servicios'
import { Combos } from './components/Combos'
import { Turnos } from './components/Turnos'
import { Ventas } from './components/Ventas'
//Prueba Git

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!session) {
    return <Login />
  }
  
  return <Dashboard session={session} />
}

// ------------------------------------------------------------------
// COMPONENTE 1: EL LOGIN y REGISTRO
// ------------------------------------------------------------------
function Login() {
  const [loading, setLoading] = useState(false)
  const [vista, setVista] = useState('login') // Puede ser 'login' o 'registro'
  const [planSeleccionado, setPlanSeleccionado] = useState('Free')

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    })
    if (error) {
      alert('Error: ' + error.message)
      setLoading(false)
    }
  }

  // --- PANTALLA DE REGISTRO ---
  if (vista === 'registro') {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-stone-100 max-w-md w-full animate-fadeIn">
          <div className="text-center mb-8">
            <span className="text-4xl">👋</span>
            <h2 className="text-2xl font-bold text-stone-800 mt-2">Únete a Silmar</h2>
            <p className="text-sm text-stone-500 mt-1">Completa tus datos y te contactaremos para activar tu cuenta y configurar tu plan.</p>
          </div>

          {/* Usamos FormSubmit para enviar el email mágicamente */}
          <form action="https://formsubmit.co/ANIBALISTA.SISTEMAS@GMAIL.COM" method="POST" className="space-y-5">
            
            {/* Configuraciones ocultas de FormSubmit */}
            <input type="hidden" name="_subject" value="Nueva Solicitud de Profesional - Silmar" />
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_template" value="table" />

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Nombre Completo</label>
              <input type="text" name="Nombre" required className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500" />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Email de contacto</label>
              <input type="email" name="Email" required className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500" />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Teléfono / WhatsApp</label>
              <input type="text" name="Telefono" required className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500" />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Plan de Interés</label>
              <select name="Plan" value={planSeleccionado} onChange={(e) => setPlanSeleccionado(e.target.value)} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 bg-white font-bold text-stone-700">
                <option value="Free">Plan Free (Prueba gratuita)</option>
                <option value="Unipersonal">Plan Unipersonal</option>
                <option value="Estetica">Plan Estética (Múltiples box)</option>
                <option value="Full">Plan Full (Gestión total)</option>
              </select>
            </div>

            {/* Este campo solo aparece si eligen Estética o Full */}
            {(planSeleccionado === 'Estetica' || planSeleccionado === 'Full') && (
              <div className="animate-fadeIn p-4 bg-teal-50 rounded-xl border border-teal-100">
                <label className="block text-xs font-bold text-teal-800 uppercase mb-1">Nombre de la Empresa / Local</label>
                <input type="text" name="Empresa" required className="w-full px-4 py-2 border border-teal-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white" placeholder="Ej: Centro de Estética Belleza" />
              </div>
            )}

            <button type="submit" className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-teal-700 transition-all mt-4">
              Enviar Solicitud
            </button>
          </form>

          <button onClick={() => setVista('login')} className="w-full mt-6 text-sm text-stone-400 font-bold hover:text-stone-600 transition-colors">
            ← Volver al inicio de sesión
          </button>
        </div>
      </div>
    )
  }

  // --- PANTALLA DE LOGIN NORMAL ---
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-lg border border-stone-100 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🌿</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-800 mb-2">Silmar Gestión</h1>
        <p className="text-stone-500 mb-8">Inicia sesión para gestionar tu negocio</p>
        
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border-2 border-stone-100 text-stone-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-stone-50 hover:border-stone-200 transition-all disabled:opacity-50"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          {loading ? 'Conectando...' : 'Ingresar con Google'}
        </button>

        <div className="mt-8 pt-6 border-t border-stone-100">
          <p className="text-sm text-stone-500">
            ¿Quieres usar esta app en tu estética? <br/>
            <button onClick={() => setVista('registro')} className="text-teal-600 font-bold hover:text-teal-800 mt-2 border border-teal-100 bg-teal-50 px-4 py-2 rounded-lg transition-colors">
              Solicitar una cuenta
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// COMPONENTE 2: EL PANEL DE CONTROL (DASHBOARD)
// ------------------------------------------------------------------
function Dashboard({ session }) {
  const [isMenuOpen, setIsMenuOpen] = useState(true)
  const [vistaActiva, setVistaActiva] = useState('inicio') 

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col text-stone-800 font-sans">
      
      <Header 
        session={session} 
        isMenuOpen={isMenuOpen} 
        setIsMenuOpen={setIsMenuOpen} 
        handleLogout={handleLogout} 
        setVistaActiva={setVistaActiva}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isMenuOpen={isMenuOpen} 
          setVistaActiva={setVistaActiva} 
          setIsMenuOpen={setIsMenuOpen} 
        />

        <main className="flex-1 p-6 overflow-y-auto">
          
          {vistaActiva === 'inicio' && (
            <div className="border-2 border-dashed border-stone-300 rounded-xl h-full flex flex-col items-center justify-center text-stone-400 bg-stone-50/50">
              <h2 className="text-2xl font-light text-stone-600 mb-2">¡Hola, {session.user.email.split('@')[0]}!</h2>
              <p className="text-lg font-light">Este es tu resumen diario.</p>
            </div>
          )}

          {/* VISTAS... (El resto queda exactamente igual) */}
          {(vistaActiva === 'clientes' || vistaActiva === 'nuevo-cliente') && (
            <Clientes session={session} initialModo={vistaActiva === 'nuevo-cliente' ? 'formulario' : 'lista'} />
          )}

          {(vistaActiva === 'registrar-producto' || vistaActiva === 'stock') && (
            <Productos session={session} initialModo={vistaActiva === 'registrar-producto' ? 'registrar' : 'stock'} />
          )}

          {(vistaActiva === 'ver-servicios' || vistaActiva === 'nuevo-servicio') && (
            <Servicios session={session} initialModo={vistaActiva} />
          )}

          {vistaActiva === 'combos' && (
            <Combos session={session} initialModo="lista" />
          )}

          {(vistaActiva === 'agenda' || vistaActiva === 'nuevo-turno') && (
            <Turnos session={session} initialModo={vistaActiva} />
          )}

          {vistaActiva === 'ventas' && (
            <Ventas session={session} initialModo="historial" />
          )}

          {/* NUEVAS VISTAS DE PERFIL (En Construcción) */}
          {vistaActiva === 'personalizar' && (
            <div className="max-w-3xl mx-auto p-8 text-center bg-white rounded-2xl shadow-sm border border-stone-200 mt-10">
              <span className="text-5xl mb-4 block">🎨</span>
              <h2 className="text-2xl font-light text-stone-800 mb-2">Personalizar App</h2>
              <p className="text-stone-500">Aquí agregaremos la opción para cambiar colores, logos y el diseño de la PWA.</p>
            </div>
          )}

          {vistaActiva === 'empresa' && (
            <div className="max-w-3xl mx-auto p-8 text-center bg-white rounded-2xl shadow-sm border border-stone-200 mt-10">
              <span className="text-5xl mb-4 block">🏢</span>
              <h2 className="text-2xl font-light text-stone-800 mb-2">Mi Empresa</h2>
              <p className="text-stone-500">Aquí cargaremos el CUIT, dirección comercial, redes sociales y nombre legal.</p>
            </div>
          )}

          {vistaActiva === 'mejoras' && (
            <div className="max-w-3xl mx-auto p-8 text-center bg-white rounded-2xl shadow-sm border border-stone-200 mt-10">
              <span className="text-5xl mb-4 block">💡</span>
              <h2 className="text-2xl font-light text-stone-800 mb-2">Buzón de Mejoras</h2>
              <p className="text-stone-500">Un formulario simple para que reportes errores o pidas nuevas funciones.</p>
            </div>
          )}

          {['insumos', 'admin-productos', 'reportes-productos'].includes(vistaActiva) && (
            <div className="border-2 border-dashed border-stone-300 rounded-xl h-full flex items-center justify-center text-stone-400 bg-stone-50/50">
              <p className="text-lg font-light">El módulo de <span className="font-bold text-stone-600">{vistaActiva}</span> está en construcción 🚧</p>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

export default App