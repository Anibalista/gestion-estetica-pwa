// src/App.jsx
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { Login } from './components/auth/Login'
import { Dashboard } from './components/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)

  useEffect(() => {
    let mounted = true

    const cargarSesion = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        console.error('Error al obtener sesión:', error.message)
      }

      setSession(data?.session || null)
      setLoadingSession(false)
    }

    cargarSesion()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, sessionActual) => {
      setSession(sessionActual)
      setLoadingSession(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center text-stone-500">
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-8 text-center">
          <p className="text-sm font-medium">
            Iniciando sesión...
          </p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return <Dashboard session={session} />
}

export default App