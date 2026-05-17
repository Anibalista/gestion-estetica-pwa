// src/components/auth/Login.jsx
import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import './Login.css'
import logo from '../../assets/logo-sin-fondo.png'
import {
  CalendarDays,
  Users,
  Wallet,
  Package,
  Mail,
  Heart
} from 'lucide-react'

export function Login() {
  const [loading, setLoading] = useState(false)
  const [vista, setVista] = useState('login')
  const [planSeleccionado, setPlanSeleccionado] = useState('Free')
  const [email, setEmail] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)

    const redirectTo = window.location.origin

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo
      }
    })

    if (error) {
      alert('Error: ' + error.message)
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!email) {
      alert('Ingresa tu correo.')
      return
    }

    setLoading(true)

    const redirectTo = window.location.origin

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo
      }
    })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('¡Enlace enviado! Revisa tu email.')
    }

    setLoading(false)
  }

  return (
    <div className="login-page">
      <section className="login-left">
        <div className="overlay" />

        <div className="left-content">
          <span className="badge">
            SaaS de Gestión
          </span>

          <h1>
            Gestiona tu centro
            <br />
            de estética, enfócate
            <br />
            <span>en lo que importa</span>
          </h1>

          <div className="features">
            <div className="feature-item">
              <CalendarDays size={24} strokeWidth={1.8} />
              <p>Agenda y citas</p>
            </div>

            <div className="feature-item">
              <Users size={24} strokeWidth={1.8} />
              <p>Clientes e historial</p>
            </div>

            <div className="feature-item">
              <Wallet size={24} strokeWidth={1.8} />
              <p>Ventas e ingresos</p>
            </div>

            <div className="feature-item">
              <Package size={24} strokeWidth={1.8} />
              <p>Productos e inventario</p>
            </div>
          </div>
        </div>
      </section>

      <section className="login-right">
        <div className="login-card animate-fadeIn">
          {vista === 'login' ? (
            <>
              <div className="logo-box">
                <img src={logo} alt="EsteticApp" className="logo" />

                <div>
                  <h2>EsteticApp</h2>
                  <p>Gestión para centros de estética</p>
                </div>
              </div>

              <div className="welcome-box">
                <h3>
                  Bienvenida <Heart size={28} />
                </h3>

                <p>
                  Inicia sesión para continuar
                </p>
              </div>

              <div className="magic-card">
                <div className="magic-header">
                  <div className="mail-icon">
                    <Mail size={28} strokeWidth={1.8} />
                  </div>

                  <div>
                    <h4>Magic Link</h4>
                    <p>Acceso rápido por correo</p>
                  </div>
                </div>

                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={loading}
                  className="magic-btn"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace mágico'}
                </button>
              </div>

              <div className="divider">
                <span>o continúa con</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="google-btn"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                />
                {loading ? 'Conectando...' : 'Continuar con Google'}
              </button>

              <p className="request-account">
                ¿Aún no tienes cuenta?
                <a
                  href="#solicitar-cuenta"
                  onClick={(e) => {
                    e.preventDefault()
                    setVista('registro')
                  }}
                >
                  Solicitar cuenta
                </a>
              </p>
            </>
          ) : (
            <>
              <div className="logo-box">
                <img src={logo} alt="EsteticApp" className="logo" />

                <div>
                  <h2>EsteticApp</h2>
                  <p>Forma parte de la red profesional</p>
                </div>
              </div>

              <div className="welcome-box">
                <h3>Solicitud</h3>
                <p>Cuéntanos sobre tu negocio</p>
              </div>

              <form className="register-form">
                <div className="input-row">
                  <div className="input-group">
                    <label>Nombre Completo</label>
                    <input type="text" />
                  </div>

                  <div className="input-group">
                    <label>WhatsApp</label>
                    <input type="text" />
                  </div>
                </div>

                <div className="input-group">
                  <label>Plan Elegido</label>
                  <select
                    value={planSeleccionado}
                    onChange={(e) => setPlanSeleccionado(e.target.value)}
                  >
                    <option value="Free">Free</option>
                    <option value="Unipersonal">Unipersonal</option>
                    <option value="Full">Full</option>
                  </select>
                </div>

                {(planSeleccionado === 'Unipersonal' || planSeleccionado === 'Full') && (
                  <div className="input-group">
                    <label>Nombre de la Empresa / Centro</label>
                    <input type="text" />
                  </div>
                )}

                {planSeleccionado === 'Full' && (
                  <div className="input-group">
                    <label>Cantidad de Colaboradores</label>
                    <input type="number" min="1" />
                  </div>
                )}

                <div className="input-group">
                  <label>Email de contacto</label>
                  <input type="email" />
                </div>

                <button type="button" className="submit-btn">
                  Enviar Solicitud
                </button>

                <a
                  href="#volver"
                  className="back-link"
                  onClick={(e) => {
                    e.preventDefault()
                    setVista('login')
                  }}
                >
                  ← Volver al inicio de sesión
                </a>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  )
}