// src/components/Clientes.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// Importamos nuestros submódulos
import { ClientesLista } from './clientes/ClientesLista'
import { ClienteFormulario } from './clientes/ClienteFormulario'
import { ClienteDetalle } from './clientes/ClienteDetalle'

export function Clientes({ session }) {
  const [modo, setModo] = useState('lista') // 'lista' | 'formulario' | 'detalle'
  const [clientes, setClientes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Guardamos qué cliente se seleccionó para editar o ver el detalle
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null) 

  // Cargar datos al iniciar o al volver a la lista
  useEffect(() => {
    if (modo === 'lista') fetchClientes()
  }, [modo])

  const fetchClientes = async () => {
  setIsLoading(true)
  try {
    const { data, error } = await supabase
      .from('cliente_profesional')
      .select(`
        cliente_id,
        clientes (
          *,
          patologias (*) 
        )
      `)
      .eq('profesional_id', session.user.id)

    if (error) throw error

    const dataFormateada = data.map(item => {
      const c = item.clientes;
      if (!c) return null;

      // LÓGICA ROBUSTA: Detecta si es array u objeto
      let patData = null;
      if (c.patologias) {
        patData = Array.isArray(c.patologias) ? c.patologias[0] : c.patologias;
      }

      return {
        ...c,
        patologias: patData
      };
    }).filter(Boolean); // Elimina nulos si los hay

    setClientes(dataFormateada)
  } catch (error) {
    console.error("Error cargando clientes:", error.message)
  } finally {
    setIsLoading(false)
  }
}

  // MANEJADORES
  const abrirNuevo = () => {
    setClienteSeleccionado(null)
    setModo('formulario')
  }

  const abrirEdicion = (cliente) => {
    console.log("CLIENTE A EDITAR:", cliente); // <--- Agrega esta línea
    setClienteSeleccionado(cliente)
    setModo('formulario')
  }

  const verDetalle = (cliente) => {
    setClienteSeleccionado(cliente)
    setModo('detalle')
  }

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto">
      
      {/* HEADER DE NAVEGACIÓN */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-light text-stone-800">
          {modo === 'detalle' ? 'Ficha Médica' : 'Pacientes / Clientes'}
        </h2>
        
        {modo === 'lista' ? (
          <button onClick={abrirNuevo} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm font-medium">
            + Nuevo Cliente
          </button>
        ) : (
          <button onClick={() => setModo('lista')} className="text-stone-500 hover:text-stone-800 transition flex items-center gap-2">
            ← Volver a la lista
          </button>
        )}
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        
        {modo === 'lista' && (
          <ClientesLista 
            clientes={clientes} 
            isLoading={isLoading}
            onNuevo={abrirNuevo}
            onEditar={abrirEdicion}
            onVerDetalle={verDetalle}
            onDesvincular={(cli) => alert(`Desvincular a ${cli.nombre} en construcción`)}
          />
        )}

        {modo === 'formulario' && (
          <>
            <div className="bg-stone-50 border-b border-stone-200 px-6 py-4">
              <h3 className="font-medium text-stone-700">{clienteSeleccionado ? 'Editar Cliente' : 'Registro de Nuevo Cliente'}</h3>
            </div>
            <ClienteFormulario 
              clienteInicial={clienteSeleccionado}
              session={session}
              onGuardadoExitoso={() => setModo('lista')} 
            />
          </>
        )}

        {modo === 'detalle' && (
          <ClienteDetalle cliente={clienteSeleccionado} />
        )}

      </div>
    </div>
  )
}