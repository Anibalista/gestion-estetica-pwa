// src/components/productos/Insumos.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'

export function Insumos({ session, empresaActiva, rolEmpresa }) {
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [insumos, setInsumos] = useState([])
  const [pedido, setPedido] = useState([])
  const [datosMensual, setDatosMensual] = useState([])
  const [datosAnual, setDatosAnual] = useState([])
  const [datosAcumulado, setDatosAcumulado] = useState([])
  const [periodoAcumulado, setPeriodoAcumulado] = useState('mensual')
  const [topInsumos, setTopInsumos] = useState([])
  const [topServicios, setTopServicios] = useState([])
  const [resumen, setResumen] = useState({
    totalInsumos: 0,
    valorStock: 0,
    costoMes: 0,
    serviciosMes: 0,
    costoPromedioServicio: 0
  })

  useEffect(() => {
    if (session?.user?.id && empresaActiva?.id) {
      cargarReportes()
    }
  }, [session?.user?.id, empresaActiva?.id, rolEmpresa])

  useEffect(() => {
    if (session?.user?.id && empresaActiva?.id) {
      cargarReportes()
    }
  }, [periodoAcumulado])

  const filtrarSesionesPorRol = (sesionesOriginales) => {
    if (!Array.isArray(sesionesOriginales)) {
      return []
    }

    const rolesQueVenEmpresaCompleta = [
      'Dueño',
      'Administrador',
      'Recepcionista'
    ]

    if (rolesQueVenEmpresaCompleta.includes(rolEmpresa)) {
      return sesionesOriginales
    }

    return sesionesOriginales.filter((sesion) => {
      return sesion.profesional_id === session.user.id
    })
  }

  const cargarReportes = async () => {
    setLoading(true)
    setErrorCarga('')

    try {
      const [
        productosPersonalesResponse,
        productosEmpresaResponse,
        costosResponse,
        sesionesResponse,
        comboServiciosResponse,
        serviciosResponse
      ] = await Promise.all([
        supabase
          .from('productos')
          .select(`
            id,
            profesional_id,
            empresa_id,
            alcance_stock,
            codigo,
            descripcion,
            dosificacion,
            unidad_medida,
            cantidad_suelta,
            unidades_enteras,
            precio_venta,
            costo_unidad,
            proximo_vencimiento,
            stock_minimo,
            activo
          `)
          .eq('profesional_id', session.user.id)
          .eq('alcance_stock', 'Profesional')
          .eq('activo', true),

        supabase
          .from('productos')
          .select(`
            id,
            profesional_id,
            empresa_id,
            alcance_stock,
            codigo,
            descripcion,
            dosificacion,
            unidad_medida,
            cantidad_suelta,
            unidades_enteras,
            precio_venta,
            costo_unidad,
            proximo_vencimiento,
            stock_minimo,
            activo
          `)
          .eq('empresa_id', empresaActiva.id)
          .eq('alcance_stock', 'Empresa')
          .eq('activo', true),

        supabase
          .from('costo_servicio')
          .select(`
            id,
            servicio_id,
            producto_id,
            descripcion,
            monto,
            cantidad_suelta_usada,
            unidades_usadas
          `)
          .not('producto_id', 'is', null),

        supabase
          .from('sesiones')
          .select(`
            id,
            fecha_hora,
            monto_cobrado,
            estado,
            profesional_id,
            empresa_id,
            sesion_detalles (
              id,
              servicio_id,
              combo_id,
              precio_cobrado
            )
          `)
          .eq('empresa_id', empresaActiva.id)
          .eq('estado', 'Cobrada'),

        supabase
          .from('combo_servicios')
          .select(`
            combo_id,
            servicio_id
          `),

        supabase
          .from('servicios')
          .select(`
            id,
            nombre,
            activo,
            precio_actual,
            descripcion,
            duracion_minutos,
            beneficios
          `)
      ])

      if (productosPersonalesResponse.error) throw productosPersonalesResponse.error
      if (productosEmpresaResponse.error) throw productosEmpresaResponse.error
      if (costosResponse.error) throw costosResponse.error
      if (sesionesResponse.error) throw sesionesResponse.error
      if (comboServiciosResponse.error) throw comboServiciosResponse.error
      if (serviciosResponse.error) throw serviciosResponse.error

      const productosUnidos = [
        ...(productosPersonalesResponse.data || []),
        ...(productosEmpresaResponse.data || [])
      ]

      const productos = Array.from(
        new Map(productosUnidos.map((producto) => [producto.id, producto])).values()
      )

      const idsProductos = new Set(productos.map((producto) => producto.id))
      const costosServicios = (costosResponse.data || [])
        .filter((costo) => !costo.producto_id || idsProductos.has(costo.producto_id))
      const sesiones = filtrarSesionesPorRol(sesionesResponse.data || [], session.user.id, rolEmpresa)
      const comboServicios = comboServiciosResponse.data || []
      const servicios = serviciosResponse.data || []

      const insumosCalculados = generarListadoInsumos(productos, costosServicios)

      const datosGraficos = generarGraficos({
        sesiones,
        costosServicios,
        comboServicios,
        servicios,
        periodo: periodoAcumulado
      })

      setInsumos(insumosCalculados)
      setDatosMensual(datosGraficos.diasDelMes)
      setDatosAnual(datosGraficos.mesesDelAnio)
      setDatosAcumulado(datosGraficos.acumulado)
      setTopInsumos(generarTopInsumos(insumosCalculados, costosServicios))
      setTopServicios(datosGraficos.topServicios)
      setResumen(generarResumen(insumosCalculados, datosGraficos))

    } catch (error) {
      console.error('Error al generar reportes:', error)
      setErrorCarga(error.message || 'No se pudieron cargar los reportes de insumos.')
    } finally {
      setLoading(false)
    }
  }

  const generarListadoInsumos = (productos, costosServicios) => {
    const productosVinculados = new Set(
      costosServicios
        .filter((costo) => costo.producto_id)
        .map((costo) => costo.producto_id)
    )

    const consumoPorProducto = {}

    costosServicios.forEach((costo) => {
      if (!costo.producto_id) return

      if (!consumoPorProducto[costo.producto_id]) {
        consumoPorProducto[costo.producto_id] = {
          cantidadSueltaUsada: 0,
          unidadesUsadas: 0,
          costoTotalConfigurado: 0,
          cantidadConfiguraciones: 0
        }
      }

      consumoPorProducto[costo.producto_id].cantidadSueltaUsada += Number(costo.cantidad_suelta_usada || 0)
      consumoPorProducto[costo.producto_id].unidadesUsadas += Number(costo.unidades_usadas || 0)
      consumoPorProducto[costo.producto_id].costoTotalConfigurado += Number(costo.monto || 0)
      consumoPorProducto[costo.producto_id].cantidadConfiguraciones += 1
    })

    return productos
      .filter((producto) => productosVinculados.has(producto.id))
      .map((producto) => {
        const cantidadSuelta = Number(producto.cantidad_suelta || 0)
        const unidadesEnteras = Number(producto.unidades_enteras || 0)
        const dosificacion = Number(producto.dosificacion || 0)
        const costoUnidad = Number(producto.costo_unidad || 0)
        const stockMinimo = Number(producto.stock_minimo || 0)

        const stockTotalSuelto = cantidadSuelta + (unidadesEnteras * dosificacion)
        const valorStock = unidadesEnteras * costoUnidad
        const consumo = consumoPorProducto[producto.id] || {
          cantidadSueltaUsada: 0,
          unidadesUsadas: 0,
          costoTotalConfigurado: 0,
          cantidadConfiguraciones: 0
        }

        const cantidadSugeridaPedido = Math.max(stockMinimo - unidadesEnteras, 1)

        return {
          id: producto.id,
          codigo: producto.codigo,
          descripcion: producto.descripcion,
          dosificacion,
          unidadMedida: producto.unidad_medida,
          cantidadSuelta,
          unidadesEnteras,
          stockMinimo,
          costoUnidad,
          valorStock,
          stockTotalSuelto,
          proximoVencimiento: producto.proximo_vencimiento,
          cantidadSueltaUsadaConfigurada: consumo.cantidadSueltaUsada,
          unidadesUsadasConfiguradas: consumo.unidadesUsadas,
          costoTotalConfigurado: consumo.costoTotalConfigurado,
          cantidadConfiguraciones: consumo.cantidadConfiguraciones,
          cantidadSugeridaPedido
        }
      })
      .sort((a, b) => {
        if (a.unidadesEnteras !== b.unidadesEnteras) {
          return a.unidadesEnteras - b.unidadesEnteras
        }

        return a.cantidadSuelta - b.cantidadSuelta
      })
  }

  const generarGraficos = ({ sesiones, costosServicios, comboServicios, servicios, periodo }) => {
    const costoPorServicioId = {}
    const serviciosPorComboId = {}
    const nombreServicioPorId = {}

    servicios.forEach((servicio) => {
      nombreServicioPorId[servicio.id] = servicio.nombre
    })

    costosServicios.forEach((costo) => {
      if (!costo.servicio_id) return

      if (!costoPorServicioId[costo.servicio_id]) {
        costoPorServicioId[costo.servicio_id] = 0
      }

      costoPorServicioId[costo.servicio_id] += Number(costo.monto || 0)
    })

    comboServicios.forEach((item) => {
      if (!item.combo_id || !item.servicio_id) return

      if (!serviciosPorComboId[item.combo_id]) {
        serviciosPorComboId[item.combo_id] = []
      }

      serviciosPorComboId[item.combo_id].push(item.servicio_id)
    })

    const hoy = new Date()
    const mesActual = String(hoy.getMonth() + 1).padStart(2, '0')
    const anioActual = String(hoy.getFullYear())

    const diasDelMes = Array.from(
      { length: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate() }, 
      (_, i) => ({
        dia: String(i + 1).padStart(2, '0'),
        ingresos: 0,
        costos: 0,
        ganancia: 0
      })
    )

    const mesesDelAnio = [
      'Ene', 
      'Feb', 
      'Mar', 
      'Abr', 
      'May', 
      'Jun', 
      'Jul', 
      'Ago', 
      'Sep', 
      'Oct', 
      'Nov', 
      'Dic'
    ].map((mes, index) => ({
      mes,
      numMes: String(index + 1).padStart(2, '0'),
      ingresos: 0,
      costos: 0,
      ganancia: 0
    }))

    const acumuladoBase = crearBaseAcumulado(periodo, hoy)
    const topServiciosMap = {}

    sesiones.forEach((sesion) => {
      if (!sesion.fecha_hora) return

      const fecha = new Date(sesion.fecha_hora)

      if (Number.isNaN(fecha.getTime())) return

      const anio = String(fecha.getFullYear())
      const mes = String(fecha.getMonth() + 1).padStart(2, '0')
      const dia = String(fecha.getDate()).padStart(2, '0')
      const ingreso = Number(sesion.monto_cobrado || 0)

      const detallesCalculados = calcularCostoSesionExpandida(
        sesion.sesion_detalles || [],
        costoPorServicioId,
        serviciosPorComboId
      )

      const costoSesion = detallesCalculados.costoTotal
      const cantidadServiciosSesion = detallesCalculados.servicios.length

      detallesCalculados.servicios.forEach((servicioId) => {
        if (!servicioId) return

        if (!topServiciosMap[servicioId]) {
          topServiciosMap[servicioId] = {
            id: servicioId,
            nombre: nombreServicioPorId[servicioId] || 'Servicio sin nombre',
            costo: 0,
            cantidad: 0
          }
        }

        topServiciosMap[servicioId].costo += Number(costoPorServicioId[servicioId] || 0)
        topServiciosMap[servicioId].cantidad += 1
      })

      if (anio === anioActual && mes === mesActual) {
        const diaData = diasDelMes.find((item) => item.dia === dia)

        if (diaData) {
          diaData.ingresos += ingreso
          diaData.costos += costoSesion
          diaData.ganancia += ingreso - costoSesion
        }
      }

      if (anio === anioActual) {
        const mesData = mesesDelAnio.find((item) => item.numMes === mes)

        if (mesData) {
          mesData.ingresos += ingreso
          mesData.costos += costoSesion
          mesData.ganancia += ingreso - costoSesion
        }
      }

      const acumuladoItem = buscarItemAcumulado(acumuladoBase, fecha, periodo)

      if (acumuladoItem) {
        acumuladoItem.costos += costoSesion
        acumuladoItem.servicios += cantidadServiciosSesion
      }
    })

    let costoAcumulado = 0
    let serviciosAcumulados = 0

    const acumulado = acumuladoBase.map((item) => {
      costoAcumulado += item.costos
      serviciosAcumulados += item.servicios

      return {
        ...item,
        costosAcumulados: costoAcumulado,
        serviciosAcumulados,
        costoPromedio: serviciosAcumulados > 0 ? costoAcumulado / serviciosAcumulados : 0
      }
    })

    const topServicios = Object.values(topServiciosMap)
      .sort((a, b) => b.costo - a.costo)
      .slice(0, 5)

    return {
      diasDelMes,
      mesesDelAnio,
      acumulado,
      topServicios
    }
  }

  const crearBaseAcumulado = (periodo, hoy) => {
    if (periodo === 'semanal') {
      const inicioSemana = obtenerInicioSemana(hoy)

      return Array.from({ length: 7 }, (_, index) => {
        const fecha = new Date(inicioSemana)
        fecha.setDate(inicioSemana.getDate() + index)

        return {
          label: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][index],
          fechaReferencia: fecha,
          costos: 0,
          servicios: 0
        }
      })
    }

    if (periodo === 'anual') {
      return [
        'Ene', 
        'Feb', 
        'Mar', 
        'Abr', 
        'May', 
        'Jun', 
        'Jul', 
        'Ago', 
        'Sep', 
        'Oct', 
        'Nov', 
        'Dic'
      ].map((mes, index) => ({
        label: mes,
        mes: index,
        anio: hoy.getFullYear(),
        costos: 0,
        servicios: 0
      }))
    }

    return Array.from(
      { length: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate() },
      (_, index) => ({
        label: String(index + 1).padStart(2, '0'),
        dia: index + 1,
        mes: hoy.getMonth(),
        anio: hoy.getFullYear(),
        costos: 0,
        servicios: 0
      })
    )
  }

  const buscarItemAcumulado = (items, fecha, periodo) => {
    if (periodo === 'semanal') {
      return items.find((item) => mismaFecha(item.fechaReferencia, fecha))
    }

    if (periodo === 'anual') {
      return items.find((item) => (
        item.anio === fecha.getFullYear() &&
        item.mes === fecha.getMonth()
      ))
    }

    return items.find((item) => (
      item.anio === fecha.getFullYear() &&
      item.mes === fecha.getMonth() &&
      item.dia === fecha.getDate()
    ))
  }

  const obtenerInicioSemana = (fecha) => {
    const copia = new Date(fecha)
    const diaSemana = copia.getDay()
    const diferencia = diaSemana === 0 ? -6 : 1 - diaSemana

    copia.setDate(copia.getDate() + diferencia)
    copia.setHours(0, 0, 0, 0)

    return copia
  }

  const mismaFecha = (a, b) => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }

  const calcularCostoSesionExpandida = (detalles, costoPorServicioId, serviciosPorComboId) => {
    let costoTotal = 0
    const servicios = []

    detalles.forEach((detalle) => {
      if (detalle.servicio_id) {
        servicios.push(detalle.servicio_id)
        costoTotal += Number(costoPorServicioId[detalle.servicio_id] || 0)
      }

      if (detalle.combo_id) {
        const serviciosDelCombo = serviciosPorComboId[detalle.combo_id] || []

        serviciosDelCombo.forEach((servicioId) => {
          servicios.push(servicioId)
          costoTotal += Number(costoPorServicioId[servicioId] || 0)
        })
      }
    })

    return {
      costoTotal,
      servicios
    }
  }

  const generarTopInsumos = (insumosCalculados, costosServicios) => {
    const insumoPorId = {}

    insumosCalculados.forEach((insumo) => {
      insumoPorId[insumo.id] = insumo
    })

    const usos = {}

    costosServicios.forEach((costo) => {
      if (!costo.producto_id || !insumoPorId[costo.producto_id]) return

      if (!usos[costo.producto_id]) {
        usos[costo.producto_id] = {
          id: costo.producto_id,
          nombre: insumoPorId[costo.producto_id].descripcion,
          unidadMedida: insumoPorId[costo.producto_id].unidadMedida,
          cantidadSueltaUsada: 0,
          unidadesUsadas: 0,
          costo: 0
        }
      }

      usos[costo.producto_id].cantidadSueltaUsada += Number(costo.cantidad_suelta_usada || 0)
      usos[costo.producto_id].unidadesUsadas += Number(costo.unidades_usadas || 0)
      usos[costo.producto_id].costo += Number(costo.monto || 0)
    })

    return Object.values(usos)
      .sort((a, b) => {
        const usoA = a.cantidadSueltaUsada + a.unidadesUsadas
        const usoB = b.cantidadSueltaUsada + b.unidadesUsadas

        return usoB - usoA
      })
      .slice(0, 5)
  }

  const generarResumen = (insumosCalculados, datosGraficos) => {
    const valorStock = insumosCalculados.reduce((total, insumo) => {
      return total + Number(insumo.valorStock || 0)
    }, 0)

    const hoy = new Date()
    const diaActual = String(hoy.getDate()).padStart(2, '0')
    const datosHastaHoy = datosGraficos.diasDelMes.filter((item) => item.dia <= diaActual)

    const costoMes = datosHastaHoy.reduce((total, item) => {
      return total + Number(item.costos || 0)
    }, 0)

    const serviciosMes = datosGraficos.acumulado.length > 0
      ? datosGraficos.acumulado[datosGraficos.acumulado.length - 1].serviciosAcumulados
      : 0

    return {
      totalInsumos: insumosCalculados.length,
      valorStock,
      costoMes,
      serviciosMes,
      costoPromedioServicio: serviciosMes > 0 ? costoMes / serviciosMes : 0
    }
  }

  const agregarAlPedido = (insumo) => {
    setPedido((prev) => {
      const existe = prev.find((item) => item.id === insumo.id)

      if (existe) {
        return prev.map((item) => {
          if (item.id !== insumo.id) return item

          return {
            ...item,
            cantidadPedido: Number(item.cantidadPedido || 0) + 1
          }
        })
      }

      return [
        ...prev,
        {
          id: insumo.id,
          codigo: insumo.codigo,
          descripcion: insumo.descripcion,
          unidadMedida: insumo.unidadMedida,
          unidadesEnteras: insumo.unidadesEnteras,
          cantidadSuelta: insumo.cantidadSuelta,
          stockMinimo: insumo.stockMinimo,
          costoUnidad: insumo.costoUnidad,
          cantidadPedido: Number(insumo.cantidadSugeridaPedido || 1),
          observaciones: ''
        }
      ]
    })
  }

  const actualizarCantidadPedido = (id, cantidad) => {
    const cantidadSegura = Math.max(Number(cantidad || 0), 0)

    setPedido((prev) => (
      prev.map((item) => {
        if (item.id !== id) return item

        return {
          ...item,
          cantidadPedido: cantidadSegura
        }
      })
    ))
  }

  const actualizarObservacionPedido = (id, observaciones) => {
    setPedido((prev) => (
      prev.map((item) => {
        if (item.id !== id) return item

        return {
          ...item,
          observaciones
        }
      })
    ))
  }

  const quitarDelPedido = (id) => {
    setPedido((prev) => prev.filter((item) => item.id !== id))
  }

  const vaciarPedido = () => {
    setPedido([])
  }

  const generarPedidoPDF = () => {
    if (pedido.length === 0) return

    const doc = new jsPDF()
    const fecha = new Date().toLocaleDateString('es-AR')

    doc.setFontSize(16)
    doc.text('Pedido de Insumos', 14, 18)

    doc.setFontSize(10)
    doc.text(`Fecha: ${fecha}`, 14, 26)
    doc.text(`Profesional: ${session?.user?.email || 'Sin email'}`, 14, 32)

    autoTable(doc, {
      startY: 42,
      head: [[
        'Código',
        'Producto',
        'Stock unidades',
        'Stock mínimo',
        'Cantidad a pedir',
        'Costo unidad',
        'Observaciones'
      ]],
      body: pedido.map((item) => [
        item.codigo,
        item.descripcion,
        item.unidadesEnteras,
        item.stockMinimo,
        item.cantidadPedido,
        formatearDinero(item.costoUnidad),
        item.observaciones || ''
      ]),
      styles: {
        fontSize: 8
      },
      headStyles: {
        fillColor: [13, 148, 136]
      }
    })

    const totalEstimado = pedido.reduce((total, item) => {
      return total + (Number(item.cantidadPedido || 0) * Number(item.costoUnidad || 0))
    }, 0)

    const finalY = doc.lastAutoTable?.finalY || 42

    doc.setFontSize(11)
    doc.text(`Total estimado: ${formatearDinero(totalEstimado)}`, 14, finalY + 12)

    doc.save(`pedido-insumos-${obtenerFechaArchivo()}.pdf`)
  }

  const generarPedidoExcel = () => {
    if (pedido.length === 0) return

    const encabezados = [
      'Codigo',
      'Producto',
      'Unidad de medida',
      'Stock unidades',
      'Cantidad suelta',
      'Stock minimo',
      'Cantidad a pedir',
      'Costo unidad',
      'Total estimado',
      'Observaciones'
    ]

    const filas = pedido.map((item) => [
      item.codigo,
      item.descripcion,
      item.unidadMedida,
      item.unidadesEnteras,
      item.cantidadSuelta,
      item.stockMinimo,
      item.cantidadPedido,
      item.costoUnidad,
      Number(item.cantidadPedido || 0) * Number(item.costoUnidad || 0),
      item.observaciones || ''
    ])

    const contenido = [
      encabezados,
      ...filas
    ]
      .map((fila) => fila.map(escaparCSV).join(';'))
      .join('\n')

    const blob = new Blob([`\uFEFF${contenido}`], {
      type: 'text/csv;charset=utf-8;'
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `pedido-insumos-${obtenerFechaArchivo()}.csv`
    link.click()

    URL.revokeObjectURL(url)
  }

  const escaparCSV = (valor) => {
    const texto = String(valor ?? '')

    if (texto.includes(';') || texto.includes('"') || texto.includes('\n')) {
      return `"${texto.replace(/"/g, '""')}"`
    }

    return texto
  }

  const obtenerFechaArchivo = () => {
    const fecha = new Date()
    const anio = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const dia = String(fecha.getDate()).padStart(2, '0')

    return `${anio}-${mes}-${dia}`
  }

  const formatearDinero = (valor) => {
    return `$${Number(valor || 0).toLocaleString('es-AR')}`
  }

  const formatearNumero = (valor) => {
    return Number(valor || 0).toLocaleString('es-AR', {
      maximumFractionDigits: 2
    })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-stone-400">
        <span className="material-symbols-outlined animate-spin text-4xl">
          refresh
        </span>
      </div>
    )
  }

  if (errorCarga) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center bg-white rounded-2xl shadow-sm border border-red-100 mt-10">
        <span className="text-5xl mb-4 block">
          ⚠️
        </span>

        <h2 className="text-2xl font-light text-stone-800 mb-2">
          No se pudieron cargar los reportes
        </h2>

        <p className="text-red-500 mb-6">
          {errorCarga}
        </p>

        <button
          type="button"
          onClick={cargarReportes}
          className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col gap-6 overflow-y-auto pb-10">
      
      <div className="px-2">
        <h2 className="text-2xl font-light text-stone-800">
          Insumos y Costos
        </h2>
        <p className="text-sm text-stone-500 font-light italic">
          Control de insumos, costos, stock disponible y pedidos de reposición.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <ResumenCard
          titulo="Insumos"
          valor={resumen.totalInsumos}
          descripcion="Productos usados como insumo"
          icono="inventory_2"
        />

        <ResumenCard
          titulo="Valor stock"
          valor={formatearDinero(resumen.valorStock)}
          descripcion="Estimado por unidades enteras"
          icono="payments"
        />

        <ResumenCard
          titulo="Costo período"
          valor={formatearDinero(resumen.costoMes)}
          descripcion="Costo acumulado del mes"
          icono="trending_down"
        />

        <ResumenCard
          titulo="Servicios"
          valor={resumen.serviciosMes}
          descripcion="Servicios acumulados"
          icono="spa"
        />

        <ResumenCard
          titulo="Costo prom."
          valor={formatearDinero(resumen.costoPromedioServicio)}
          descripcion="Promedio por servicio"
          icono="calculate"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-stone-800">
              Insumos registrados
            </h3>
            <p className="text-sm text-stone-500">
              Productos vinculados a costos de servicios, ordenados por menor stock.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generarPedidoPDF}
              disabled={pedido.length === 0}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
            >
              Generar PDF
            </button>

            <button
              type="button"
              onClick={generarPedidoExcel}
              disabled={pedido.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
            >
              Generar Excel
            </button>

            <button
              type="button"
              onClick={vaciarPedido}
              disabled={pedido.length === 0}
              className="px-4 py-2 rounded-xl bg-stone-200 text-stone-600 text-sm font-bold hover:bg-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Vaciar pedido
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Insumo</th>
                <th className="px-4 py-3 text-right">Suelto</th>
                <th className="px-4 py-3 text-right">Unidades</th>
                <th className="px-4 py-3 text-right">Dosificación</th>
                <th className="px-4 py-3 text-right">Stock mínimo</th>
                <th className="px-4 py-3 text-right">Costo unidad</th>
                <th className="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100">
              {insumos.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-stone-400">
                    No hay productos vinculados como insumos en costos de servicios.
                  </td>
                </tr>
              ) : (
                insumos.map((insumo) => (
                  <tr key={insumo.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-mono text-xs text-stone-500">
                      {insumo.codigo}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-bold text-stone-800">
                        {insumo.descripcion}
                      </p>
                      <p className="text-xs text-stone-400">
                        {insumo.unidadMedida}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatearNumero(insumo.cantidadSuelta)}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-stone-800">
                      {formatearNumero(insumo.unidadesEnteras)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatearNumero(insumo.dosificacion)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatearNumero(insumo.stockMinimo)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatearDinero(insumo.costoUnidad)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => agregarAlPedido(insumo)}
                        className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold hover:bg-teal-100 transition-colors"
                      >
                        Añadir a pedido
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pedido.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-teal-100 overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <h3 className="text-lg font-bold text-stone-800">
              Pedido actual
            </h3>
            <p className="text-sm text-stone-500">
              Ajustá cantidades antes de generar PDF o Excel.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-teal-50 text-teal-700 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-right">Stock unidades</th>
                  <th className="px-4 py-3 text-right">Cantidad a pedir</th>
                  <th className="px-4 py-3 text-left">Observaciones</th>
                  <th className="px-4 py-3 text-center">Quitar</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100">
                {pedido.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-stone-800">
                        {item.descripcion}
                      </p>
                      <p className="text-xs text-stone-400">
                        {item.codigo}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {item.unidadesEnteras}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min="0"
                        value={item.cantidadPedido}
                        onChange={(e) => actualizarCantidadPedido(item.id, e.target.value)}
                        className="w-24 text-right border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.observaciones}
                        onChange={(e) => actualizarObservacionPedido(item.id, e.target.value)}
                        placeholder="Opcional"
                        className="w-full border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => quitarDelPedido(item.id)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="text-sm font-bold text-stone-800 mb-6 flex items-center gap-2 uppercase tracking-widest">
            <span className="text-teal-600 material-symbols-outlined">
              calendar_month
            </span> 
            Balance del Mes Actual
          </h3>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={datosMensual} 
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  stroke="#f5f5f4" 
                />

                <XAxis 
                  dataKey="dia" 
                  tick={{ fontSize: 12, fill: '#a8a29e' }} 
                  axisLine={false} 
                  tickLine={false} 
                />

                <YAxis 
                  tick={{ fontSize: 12, fill: '#a8a29e' }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(valor) => formatearDinero(valor)} 
                />

                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)' 
                  }}
                  formatter={(value, name) => [formatearDinero(value), name]}
                />

                <Legend 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} 
                />

                <Line 
                  type="monotone" 
                  name="Ingresos" 
                  dataKey="ingresos" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={false} 
                  activeDot={{ r: 6 }} 
                />

                <Line 
                  type="monotone" 
                  name="Costos" 
                  dataKey="costos" 
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  dot={false} 
                  activeDot={{ r: 6 }} 
                />

                <Line 
                  type="monotone" 
                  name="Ganancia" 
                  dataKey="ganancia" 
                  stroke="#14b8a6" 
                  strokeWidth={3} 
                  dot={false} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="text-sm font-bold text-stone-800 mb-6 flex items-center gap-2 uppercase tracking-widest">
            <span className="text-teal-600 material-symbols-outlined">
              event_note
            </span> 
            Balance del Año
          </h3>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={datosAnual} 
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  stroke="#f5f5f4" 
                />

                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 12, fill: '#a8a29e' }} 
                  axisLine={false} 
                  tickLine={false} 
                />

                <YAxis 
                  tick={{ fontSize: 12, fill: '#a8a29e' }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(valor) => formatearDinero(valor)} 
                />

                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)' 
                  }}
                  formatter={(value, name) => [formatearDinero(value), name]}
                />

                <Legend 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} 
                />

                <Line 
                  type="monotone" 
                  name="Ingresos" 
                  dataKey="ingresos" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 4 }} 
                  activeDot={{ r: 6 }} 
                />

                <Line 
                  type="monotone" 
                  name="Costos" 
                  dataKey="costos" 
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  dot={{ r: 4 }} 
                  activeDot={{ r: 6 }} 
                />

                <Line 
                  type="monotone" 
                  name="Ganancia" 
                  dataKey="ganancia" 
                  stroke="#14b8a6" 
                  strokeWidth={3} 
                  dot={{ r: 4 }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2 uppercase tracking-widest">
              <span className="text-teal-600 material-symbols-outlined">
                monitoring
              </span>
              Acumulado de costos vs servicios
            </h3>
            <p className="text-sm text-stone-500 mt-1">
              Compara el costo acumulado de insumos con la cantidad de servicios realizados.
            </p>
          </div>

          <div className="flex gap-2">
            <PeriodoButton
              activo={periodoAcumulado === 'semanal'}
              onClick={() => setPeriodoAcumulado('semanal')}
            >
              Semanal
            </PeriodoButton>

            <PeriodoButton
              activo={periodoAcumulado === 'mensual'}
              onClick={() => setPeriodoAcumulado('mensual')}
            >
              Mensual
            </PeriodoButton>

            <PeriodoButton
              activo={periodoAcumulado === 'anual'}
              onClick={() => setPeriodoAcumulado('anual')}
            >
              Anual
            </PeriodoButton>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={datosAcumulado}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="#f5f5f4" 
              />

              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12, fill: '#a8a29e' }} 
                axisLine={false} 
                tickLine={false} 
              />

              <YAxis 
                yAxisId="dinero"
                tick={{ fontSize: 12, fill: '#a8a29e' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(valor) => formatearDinero(valor)}
              />

              <YAxis 
                yAxisId="servicios"
                orientation="right"
                tick={{ fontSize: 12, fill: '#a8a29e' }} 
                axisLine={false} 
                tickLine={false}
              />

              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)' 
                }}
                formatter={(value, name) => {
                  if (name === 'Costos acumulados' || name === 'Costo promedio') {
                    return [formatearDinero(value), name]
                  }

                  return [value, name]
                }}
              />

              <Legend 
                iconType="circle" 
                wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} 
              />

              <Bar
                yAxisId="dinero"
                name="Costos acumulados"
                dataKey="costosAcumulados"
                fill="#ef4444"
                radius={[8, 8, 0, 0]}
              />

              <Line
                yAxisId="servicios"
                type="monotone"
                name="Servicios acumulados"
                dataKey="serviciosAcumulados"
                stroke="#0d9488"
                strokeWidth={3}
              />

              <Line
                yAxisId="dinero"
                type="monotone"
                name="Costo promedio"
                dataKey="costoPromedio"
                stroke="#3b82f6"
                strokeWidth={3}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TopCard titulo="Top 5 insumos más utilizados">
          {topInsumos.length === 0 ? (
            <EmptyTop mensaje="Todavía no hay costos con insumos vinculados." />
          ) : (
            topInsumos.map((item, index) => (
              <TopRow
                key={item.id}
                index={index}
                titulo={item.nombre}
                detalle={`${formatearNumero(item.cantidadSueltaUsada)} ${item.unidadMedida} / ${formatearNumero(item.unidadesUsadas)} unidades`}
                valor={formatearDinero(item.costo)}
              />
            ))
          )}
        </TopCard>

        <TopCard titulo="Top 5 servicios con mayor costo">
          {topServicios.length === 0 ? (
            <EmptyTop mensaje="Todavía no hay servicios cobrados con costos calculables." />
          ) : (
            topServicios.map((item, index) => (
              <TopRow
                key={item.id}
                index={index}
                titulo={item.nombre}
                detalle={`${item.cantidad} servicios realizados`}
                valor={formatearDinero(item.costo)}
              />
            ))
          )}
        </TopCard>
      </div>
    </div>
  )
}

function ResumenCard({ titulo, valor, descripcion, icono }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
            {titulo}
          </p>
          <p className="text-2xl font-black text-stone-800">
            {valor}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            {descripcion}
          </p>
        </div>

        <span className="material-symbols-outlined text-teal-600 bg-teal-50 rounded-xl p-2">
          {icono}
        </span>
      </div>
    </div>
  )
}

function PeriodoButton({ activo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
        activo
          ? 'bg-teal-600 text-white'
          : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
      }`}
    >
      {children}
    </button>
  )
}

function TopCard({ titulo, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
      <h3 className="text-sm font-bold text-stone-800 mb-5 uppercase tracking-widest">
        {titulo}
      </h3>

      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

function TopRow({ index, titulo, detalle, valor }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-stone-50 border border-stone-100">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-black shrink-0">
          {index + 1}
        </span>

        <div className="min-w-0">
          <p className="font-bold text-stone-800 truncate">
            {titulo}
          </p>
          <p className="text-xs text-stone-500">
            {detalle}
          </p>
        </div>
      </div>

      <p className="font-black text-stone-700 shrink-0">
        {valor}
      </p>
    </div>
  )
}

function EmptyTop({ mensaje }) {
  return (
    <div className="p-6 text-center text-stone-400 border border-dashed border-stone-200 rounded-xl">
      {mensaje}
    </div>
  )

function filtrarSesionesPorRol(sesiones, profesionalId, rolEmpresa) {
  const puedeVerEmpresaCompleta = ['Dueño', 'Administrador', 'Recepcionista'].includes(rolEmpresa)

  if (puedeVerEmpresaCompleta) return sesiones

  return sesiones.filter((sesion) => sesion.profesional_id === profesionalId)
}

}