// src/components/clientes/ClienteDetalle.jsx

export function ClienteDetalle({ cliente }) {
  if (!cliente) return null;

  return (
    <div className="p-8 text-center text-stone-500">
      <h3 className="text-2xl text-stone-800 mb-2">{cliente.nombre}</h3>
      <p>Tel: {cliente.telefono}</p>
      <div className="mt-8 p-8 border-2 border-dashed border-stone-200 rounded-xl">
        <p>Próximamente: Historial de sesiones y evolución de {cliente.nombre.split(' ')[0]}</p>
      </div>
    </div>
  )
}