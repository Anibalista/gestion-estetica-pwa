// src/components/clientes/ClientesLista.jsx

export function ClientesLista({ clientes, isLoading, onNuevo, onEditar, onVerDetalle, onDesvincular }) {
  
  // FUNCIÓN PARA FORMATEAR FECHA SIN ERROR DE ZONA HORARIA
  const formatearFechaLocal = (fechaStr) => {
    if (!fechaStr) return '---';
    // fechaStr viene de la BD como "YYYY-MM-DD"
    // Lo dividimos por el guion y lo rearmamos manualmente
    const [anio, mes, dia] = fechaStr.split('-');
    return `${dia}/${mes}/${anio}`;
  };

  if (isLoading) {
    return <div className="p-12 text-center text-stone-400">Cargando clientes...</div>
  }

  if (clientes.length === 0) {
    return (
      <div className="p-12 text-center text-stone-400">
        <p className="text-lg font-light">Aún no hay clientes registrados.</p>
        <button onClick={onNuevo} className="mt-4 text-teal-600 hover:text-teal-700 font-medium">
          Crear el primer cliente →
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-stone-600">
        <thead className="bg-stone-50 border-b border-stone-200 text-xs uppercase text-stone-500 font-bold tracking-wider">
          <tr>
            <th className="px-6 py-4">Nombre</th>
            <th className="px-6 py-4">Teléfono</th>
            <th className="px-6 py-4">Nacimiento</th>
            <th className="px-6 py-4">Domicilio</th> {/* CAMBIO: Nuevo título de columna */}
            <th className="px-6 py-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {clientes.map((cliente) => (
            <tr 
              key={cliente.id} 
              onClick={() => onVerDetalle(cliente)}
              className="hover:bg-stone-50/80 cursor-pointer transition-colors group"
            >
              <td className="px-6 py-4 font-medium text-stone-800">{cliente.nombre}</td>
              <td className="px-6 py-4">{cliente.telefono}</td>
              <td className="px-6 py-4">
                {formatearFechaLocal(cliente.fecha_nacimiento)}
              </td>
              
              {/* CAMBIO AQUÍ: Celda de Domicilio con Tooltip CSS */}
              <td className="px-6 py-4">
                {cliente.direcciones ? (
                  <div className="relative flex items-center group/tooltip w-fit">
                    <span className="text-teal-600 text-lg cursor-help transition-transform hover:scale-110">🏠</span>
                    
                    {/* El Tooltip (Oculto por defecto, visible en hover) */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-stone-800 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none">
                      <p className="font-bold text-teal-300 mb-1">Dirección Registrada</p>
                      <p>{cliente.direcciones.calle} {cliente.direcciones.numero}</p>
                      {cliente.direcciones.barrio && <p>{cliente.direcciones.barrio}</p>}
                      {cliente.direcciones.observaciones && (
                        <p className="mt-1 pt-1 border-t border-stone-600 text-stone-300 italic">
                          "{cliente.direcciones.observaciones}"
                        </p>
                      )}
                      {/* Flechita inferior del globo */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
                    </div>
                  </div>
                ) : (
                  <span className="text-stone-300">-</span>
                )}
              </td>
              
              {/* ACCIONES */}
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditar(cliente); }}
                    className="text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-md transition-colors font-medium text-xs active:scale-95"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDesvincular(cliente); }}
                    className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors font-medium text-xs active:scale-95"
                  >
                    Desvincular
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}