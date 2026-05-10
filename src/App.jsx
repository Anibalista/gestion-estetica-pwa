import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Login } from './components/auth/Login'
import { Dashboard } from './components/Dashboard'
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
// COMPONENTE 2: EL PANEL DE CONTROL (DASHBOARD)
// ------------------------------------------------------------------


export default App