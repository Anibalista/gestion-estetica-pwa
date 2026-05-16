// src/components/auth/Login.jsx
import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import './Login.css'
import logo from '../../assets/logo-sin-fondo.png'
import { CalendarDays, Users, Wallet, Package } from 'lucide-react'

export function Login() {
  const [loading, setLoading] = useState(false)
  const [vista, setVista] = useState('login')
  const [planSeleccionado, setPlanSeleccionado] = useState('Free')
  const [email, setEmail] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) { alert('Error: ' + error.message); setLoading(false); }
  }

  const handleMagicLink = async () => {
    if (!email) { alert("Ingresa tu correo."); return; }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) alert('Error: ' + error.message)
    else alert('¡Enlace enviado! Revisa tu email.')
    setLoading(false)
  }

  return (
    <div className="login-page">
      <section className="login-left">
        <div className="overlay"></div>
        <div className="left-content">
          <div className="badge">SaaS de Gestión</div>
          <h1>
            Gestiona tu centro<br />
            de estética, enfócate<br />
            <span>en lo que importa</span>
          </h1>
          <div className="features">
            <div className="feature-item">
              <CalendarDays size={28} />
              <p>Agenda y citas</p>
            </div>

            <div className="feature-item">
              <Users size={28} />
              <p>Clientes e historial</p>
            </div>

            <div className="feature-item">
              <Wallet size={28} />
              <p>Ventas e ingresos</p>
            </div>

            <div className="feature-item">
              <Package size={28} />
              <p>Productos e inventario</p>
            </div>
          </div>
        </div>
      </section>

      <section className="login-right">
        {vista === 'login' ? (
          <div className="login-card animate-fadeIn">
            <div className="logo-box">
              <img src={logo} alt="EsteticApp" className="logo" />
              <div>
                <h2>EsteticApp</h2>
                <p>Gestión para centros de estética</p>
              </div>
            </div>

            <div className="welcome-box">
              <h3>Bienvenida <span className="material-symbols-outlined">favorite</span></h3>
              <p>Inicia sesión para continuar</p>
            </div>

            <div className="magic-card">
              <div className="magic-header">
                <div className="mail-icon">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div>
                  <h4>Magic Link</h4>
                  <p>Acceso rápido por correo</p>
                </div>
              </div>
              <input type="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="magic-btn" onClick={handleMagicLink} disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar enlace mágico'}
              </button>
            </div>

            <div className="divider"><span>o continúa con</span></div>

            <button className="google-btn" onClick={handleGoogleLogin} disabled={loading}>
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
              Continuar con Google
            </button>

            <p className="request-account">
              ¿Aún no tienes cuenta?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setVista('registro'); }}>Solicitar cuenta</a>
            </p>
          </div>
        ) : (
          <div className="login-card animate-fadeIn">
            <div className="logo-box">
              <img src={logo} alt="EsteticApp" className="logo" />
              <div>
                <h2>EsteticApp</h2>
                <p>Forma parte de la red profesional</p>
              </div>
            </div>

            <div className="welcome-box">
              <h3>Solicitud <span className="material-symbols-outlined">description</span></h3>
              <p>Cuéntanos sobre tu negocio</p>
            </div>

            <form action="https://formsubmit.co/ANIBALISTA.SISTEMAS@GMAIL.COM" method="POST" className="register-form">
              <input type="hidden" name="_subject" value="Nueva Solicitud EsteticApp" />
              
              <div className="input-group">
                <label>Nombre Completo</label>
                <input type="text" name="Nombre" required placeholder="Tu nombre y apellido" />
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>WhatsApp</label>
                  <input type="text" name="Telefono" required placeholder="Cod. área + nro" />
                </div>
                <div className="input-group">
                  <label>Plan Elegido</label>
                  <select name="Plan" value={planSeleccionado} onChange={(e) => setPlanSeleccionado(e.target.value)}>
                    <option value="Free">Free</option>
                    <option value="Unipersonal">Unipersonal</option>
                    <option value="Full">Full</option>
                  </select>
                </div>
              </div>

              {/* CAMPOS CONDICIONALES */}
              {(planSeleccionado === 'Unipersonal' || planSeleccionado === 'Full') && (
                <div className="input-group animate-fadeIn">
                  <label>Nombre de la Empresa / Centro</label>
                  <input type="text" name="Empresa" required placeholder="Ej: Centro Estético Aura" />
                </div>
              )}

              {planSeleccionado === 'Full' && (
                <div className="input-group animate-fadeIn">
                  <label>Cantidad de Colaboradores</label>
                  <input type="number" name="Colaboradores" required placeholder="¿Cuántos profesionales integran el equipo?" min="1" />
                </div>
              )}

              <div className="input-group">
                <label>Email de contacto</label>
                <input type="email" name="Email" required placeholder="tu@correo.com" />
              </div>

              <button type="submit" className="submit-btn">
                Enviar Solicitud
              </button>
            </form>

            <span className="back-link" onClick={() => setVista('login')}>
              ← Volver al inicio de sesión
            </span>
          </div>
        )}
      </section>
    </div>
  )
}