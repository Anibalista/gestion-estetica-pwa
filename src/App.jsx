import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Clientes } from './components/Clientes'
import { Productos } from './components/Productos'
import { Servicios } from './components/Servicios'
import { Combos } from './components/Combos'
import { Turnos } from './components/Turnos'

function App() {
  // 1. USE STATE: Nuestra memoria. Arranca en "null" (no sabemos si hay sesión).
  const [session, setSession] = useState(null)

  // 2. USE EFFECT: Se ejecuta una sola vez cuando la app arranca.
  useEffect(() => {
    // A. Preguntamos a Supabase: "¿Tenemos una sesión guardada?"
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // B. Nos quedamos "escuchando". Si el usuario hace clic en el link del correo, 
    // Supabase nos avisa por aquí, y actualizamos nuestra memoria.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // (Limpieza interna de React al cerrar)
    return () => subscription.unsubscribe()
  }, [])

  // 3. EL RUTEADOR MANUAL: 
  // Si la memoria dice que NO hay sesión, mostramos el componente Login.
  if (!session) {
    return <Login />
  }
  
  // Si SÍ hay sesión, mostramos el componente Dashboard.
  return <Dashboard session={session} />
}

// ------------------------------------------------------------------
// COMPONENTE 1: EL LOGIN (Es exactamente lo que ya teníamos)
// ------------------------------------------------------------------
function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  // Función 1: Autenticación con Google
  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:5173/'
      }
    })
    if (error) {
      setIsError(true)
      setMessage(error.message)
      setLoading(false)
    }
  }

  // Función 2: Autenticación con Link Mágico (OTP)
  const handleMagicLinkLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setIsError(false)

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: 'http://localhost:5173/'
      }
    })

    if (error) {
      setIsError(true)
      setMessage(error.message)
    } else {
      setMessage('¡Revisa tu correo! Te enviamos el enlace mágico.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-stone-800 tracking-wide">Bienvenida</h1>
          <p className="text-stone-500 mt-2 text-sm">Elige cómo quieres acceder</p>
        </div>

        {/* BOTÓN DE GOOGLE */}
        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium py-3 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? 'Cargando...' : 'Continuar con Google'}
        </button>

        {/* SEPARADOR "O" */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-stone-400">o mediante correo</span>
          </div>
        </div>

        {/* FORMULARIO MAGIC LINK */}
        <form onSubmit={handleMagicLinkLogin} className="space-y-4">
          <input
            type="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 rounded-lg transition-colors shadow-md disabled:opacity-70"
          >
            {loading ? 'Enviando...' : 'Enviar enlace mágico'}
          </button>
        </form>

        {/* MENSAJES */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg text-center text-sm ${isError ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-800'}`}>
            {message}
          </div>
        )}
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
        setVistaActiva={setVistaActiva} // <--- CABLE 1: Logo funcional
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isMenuOpen={isMenuOpen} setVistaActiva={setVistaActiva} />

        <main className="flex-1 p-6 overflow-y-auto">
          
          {vistaActiva === 'inicio' && (
            <div className="border-2 border-dashed border-stone-300 rounded-xl h-full flex flex-col items-center justify-center text-stone-400 bg-stone-50/50">
              <h2 className="text-2xl font-light text-stone-600 mb-2">¡Hola, {session.user.email.split('@')[0]}!</h2>
              <p className="text-lg font-light">Este es tu resumen diario.</p>
            </div>
          )}

          {/* VISTA CLIENTES */}
          {(vistaActiva === 'clientes' || vistaActiva === 'nuevo-cliente') && (
            <Clientes 
              session={session} 
              // CABLE 2: Diferenciamos si queremos lista o formulario
              initialModo={vistaActiva === 'nuevo-cliente' ? 'formulario' : 'lista'} 
            />
          )}

          {/* VISTA PRODUCTOS (NUEVA SECCIÓN CONECTADA) */}
          {(vistaActiva === 'registrar-producto' || vistaActiva === 'stock') && (
            <Productos 
              session={session} 
              initialModo={vistaActiva === 'registrar-producto' ? 'registrar' : 'stock'} 
            />
          )}

          {/* VISTA SERVICIOS */}
          {(vistaActiva === 'ver-servicios' || vistaActiva === 'nuevo-servicio') && (
            <Servicios 
              session={session} 
              initialModo={vistaActiva} 
            />
          )}

          {/* VISTA COMBOS */}
          {vistaActiva === 'combos' && (
            <Combos session={session} initialModo="lista" />
          )}

          {/* VISTA TURNOS (Agenda y Registro) */}
          {(vistaActiva === 'agenda' || vistaActiva === 'nuevo-turno') && (
            <Turnos 
              session={session} 
              initialModo={vistaActiva} 
            />
          )}

          {/* MÓDULOS EN CONSTRUCCIÓN */}
          {/* Asegúrate de que 'agenda' y 'nuevo-turno' YA NO ESTÉN en esta lista 👇 */}
          {['insumos', 'ventas', 'admin-productos', 'reportes-productos'].includes(vistaActiva) && (
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