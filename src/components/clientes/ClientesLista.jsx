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
        <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase text-xs font-bold">
          <tr>
            <th className="px-6 py-4">Nombre Completo</th>
            <th className="px-6 py-4">Teléfono</th>
            <th className="px-6 py-4">Fecha de Nac.</th>
            <th className="px-6 py-4">Última Sesión</th>
            <th className="px-6 py-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {clientes.map((cliente) => (
            <tr 
              key={cliente.id} 
              onClick={() => onVerDetalle(cliente)}
              className="hover:bg-teal-50 cursor-pointer transition-colors group"
            >
              <td className="px-6 py-4 font-medium text-stone-800">{cliente.nombre}</td>
              <td className="px-6 py-4">{cliente.telefono}</td>
              
              {/* CAMBIO AQUÍ: Usamos nuestra función manual */}
              <td className="px-6 py-4">
                {formatearFechaLocal(cliente.fecha_nacimiento)}
              </td>
              
              <td className="px-6 py-4 text-stone-400">Pronto...</td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditar(cliente); }}
                    className="text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-md transition-colors font-medium text-xs"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDesvincular(cliente); }}
                    className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors font-medium text-xs"
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