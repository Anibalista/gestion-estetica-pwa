// src/components/Dashboard.jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Clientes } from './Clientes'
import { Productos } from './Productos'
import { Servicios } from './Servicios'
import { Combos } from './Combos'
import { Turnos } from './Turnos'
import { Ventas } from './Ventas'

export function Dashboard({ session }) {
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