// src/components/ventas/VentaFormulario.jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'

export function VentaFormulario({ session, onGuardar, onCancelar }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])

  const [formData, setFormData] = useState({
    cliente_id: '',
    medio_pago: 'Efectivo',
    monto_cobrado: ''
  })

  // Carrito de productos
  const [carrito, setCarrito] = useState([])

  useEffect(() => {
    const cargarCatalogos = async () => {
      // Clientes
      const { data: clis } = await supabase.from('cliente_profesional').select('clientes(id, nombre, telefono)').eq('profesional_id', session.user.id)
      setClientes(clis?.map(d => d.clientes).filter(Boolean).sort((a,b) => a.nombre.localeCompare(b.nombre)) || [])

      // Productos activos
      const { data: prods } = await supabase.from('productos').select('*').eq('profesional_id', session.user.id).eq('activo', true).order('descripcion', { ascending: true })
      setProductos(prods || [])
    }
    cargarCatalogos()
  }, [session.user.id])

  // CÁLCULO DE TOTALES
  const montoTotal = useMemo(() => {
    return carrito.reduce((acc, item) => acc + (item.cantidad * item.precio_unitario), 0)
  }, [carrito])

  // LÓGICA DEL CARRITO
  const agregarProducto = (productoId) => {
    if (!productoId) return;
    const prod = productos.find(p => p.id === productoId);
    
    setCarrito(prev => {
      const existe = prev.find(i => i.producto_id === prod.id)
      if (existe) {
        return prev.map(i => i.producto_id === prod.id ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario } : i)
      }
      return [...prev, {
        producto_id: prod.id,
        descripcion: prod.descripcion,
        cantidad: 1,
        precio_unitario: prod.precio_venta,
        subtotal: prod.precio_venta
      }]
    })
  }

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev => prev.map(item => {
      if (item.producto_id === id) {
        const nuevaCant = Math.max(1, item.cantidad + delta) // Mínimo 1
        return { ...item, cantidad: nuevaCant, subtotal: nuevaCant * item.precio_unitario }
      }
      return item
    }))
  }

  const quitarProducto = (id) => {
    setCarrito(prev => prev.filter(i => i.producto_id !== id))
  }

  // GENERADOR DE NÚMERO DE VENTA
  const generarNumeroVenta = async () => {
    const hoy = new Date();
    const yy = String(hoy.getFullYear()).slice(-2);
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const prefijo = `${yy}${mm}${dd}`; // Ej: 260502

    const { data } = await supabase
      .from('ventas')
      .select('numero_venta')
      .eq('profesional_id', session.user.id)
      .like('numero_venta', `${prefijo}-%`)
      .order('numero_venta', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const ultimoNum = parseInt(data[0].numero_venta.split('-')[1], 10);
      const nuevoNum = String(ultimoNum + 1).padStart(4, '0');
      return `${prefijo}-${nuevoNum}`;
    } else {
      return `${prefijo}-0001`;
    }
  }

  // GUARDADO
  const handleGuardar = async (e) => {
    e.preventDefault();
    if (carrito.length === 0) return;

    // 1. VERIFICAR STOCK ANTES DE PROCESAR
    let productosEnNegativo = [];
    carrito.forEach(item => {
      const prodOriginal = productos.find(p => p.id === item.producto_id);
      if (prodOriginal && (prodOriginal.unidades_enteras - item.cantidad) < 0) {
        productosEnNegativo.push(item.descripcion);
      }
    });

    if (productosEnNegativo.length > 0) {
      const confirmar = window.confirm(
        `⚠️ ADVERTENCIA DE STOCK:\n\nLos siguientes productos quedarán con stock NEGATIVO:\n- ${productosEnNegativo.join('\n- ')}\n\n¿Deseas continuar con la venta de todas formas?`
      );
      if (!confirmar) return;
    }

    setIsSubmitting(true);
    try {
      const numVenta = await generarNumeroVenta();

      // Llamamos a la función RPC de Supabase que creamos en el Paso 1
      const { data, error } = await supabase.rpc('procesar_venta_con_stock', {
        p_venta: {
          numero_venta: numVenta,
          profesional_id: session.user.id,
          cliente_id: formData.cliente_id || null,
          monto_total: montoTotal,
          monto_cobrado: formData.monto_cobrado ? parseFloat(formData.monto_cobrado) : montoTotal,
          medio_pago: formData.medio_pago
        },
        p_detalles: carrito.map(item => ({
          producto_id: item.producto_id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal
        }))
      });

      if (error) throw error;

      alert(`Venta exitosa: ${numVenta}`);
      onGuardar();
    } catch (error) {
      setFeedback({ tipo: 'error', mensaje: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleGuardar} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white">
      {/* IZQUIERDA: DATOS DE VENTA */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-stone-700 uppercase tracking-widest border-b pb-2">Nueva Venta Mostrador</h3>
        
        {feedback && (
          <div className="p-4 rounded-xl text-sm font-bold bg-red-50 text-red-700 border border-red-200">
            {feedback.mensaje}
          </div>
        )}

        <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100 space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-2">Cliente (Opcional)</label>
            <select value={formData.cliente_id} onChange={e => setFormData({...formData, cliente_id: e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 bg-white">
              <option value="">-- Consumidor Final --</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-2">Medio de Pago</label>
              <select value={formData.medio_pago} onChange={e => setFormData({...formData, medio_pago: e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none font-bold text-stone-600">
                <option value="Efectivo">💵 Efectivo</option>
                <option value="Transferencia">📱 Transferencia</option>
                <option value="Tarjeta">💳 Tarjeta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-teal-600 uppercase mb-2">Monto Cobrado ($)</label>
              <input type="number" step="0.01" value={formData.monto_cobrado} onChange={e => setFormData({...formData, monto_cobrado: e.target.value})} placeholder={montoTotal.toString()} className="w-full px-4 py-3 border border-teal-200 bg-teal-50 rounded-xl outline-none font-black text-teal-800" />
            </div>
          </div>
        </div>
      </div>

      {/* DERECHA: CARRITO (PUNTO DE VENTA) */}
      <div className="flex flex-col bg-stone-50 rounded-2xl border border-stone-200 p-5 h-[500px]">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Productos a facturar</h3>
        
        {/* Selector de productos */}
        <select onChange={(e) => { agregarProducto(e.target.value); e.target.value = ""; }} className="w-full px-4 py-3 mb-4 border border-teal-300 rounded-xl outline-none cursor-pointer text-teal-800 font-bold bg-teal-50 shadow-sm">
          <option value="">🛒 + Escanear o buscar producto...</option>
          {productos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.descripcion} (${p.precio_venta})</option>)}
        </select>

        {/* Lista del Carrito */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {carrito.length === 0 ? (
            <div className="text-center p-8 text-stone-400 text-xs font-medium border-2 border-dashed border-stone-200 rounded-xl">El carrito está vacío.</div>
          ) : (
            carrito.map((item) => (
              <div key={item.producto_id} className="flex flex-col sm:flex-row justify-between items-center bg-white p-3 rounded-xl border border-stone-100 shadow-sm gap-2">
                <div className="flex-1 w-full truncate">
                  <p className="text-sm font-bold text-stone-700 truncate">{item.descripcion}</p>
                  <p className="text-[10px] text-stone-400 font-mono">${item.precio_unitario} c/u</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Controles de Cantidad */}
                  <div className="flex items-center bg-stone-100 rounded-lg">
                    <button type="button" onClick={() => cambiarCantidad(item.producto_id, -1)} className="px-3 py-1 font-bold text-stone-500 hover:text-stone-800">-</button>
                    <span className="px-2 font-black text-sm">{item.cantidad}</span>
                    <button type="button" onClick={() => cambiarCantidad(item.producto_id, 1)} className="px-3 py-1 font-bold text-stone-500 hover:text-stone-800">+</button>
                  </div>
                  
                  <div className="font-black text-teal-700 min-w-[60px] text-right">${item.subtotal}</div>
                  
                  <button type="button" onClick={() => quitarProducto(item.producto_id)} className="text-red-300 hover:text-red-500 font-black text-lg px-2">×</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totales y Botones */}
        <div className="pt-4 border-t border-stone-200 mt-4">
          <div className="flex justify-between items-end mb-4">
            <span className="font-bold text-stone-500 uppercase tracking-widest text-xs">Total a Pagar</span>
            <span className="text-4xl font-black text-stone-800">${montoTotal.toFixed(2)}</span>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onCancelar} className="flex-1 py-3 text-stone-500 font-bold hover:bg-stone-200 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-[2] bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 shadow-md transition-all">
              {isSubmitting ? 'Procesando...' : 'Facturar Venta'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}