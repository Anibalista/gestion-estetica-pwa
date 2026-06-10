// src/utils/fechas.js
// Helpers de fecha para la app.
// IMPORTANTE:
// La BD actual guarda fecha_hora como timestamptz, pero históricamente se cargó
// desde inputs date/time como hora operativa local. Por eso, para agenda y calendario
// leemos la fecha/hora escrita en el valor devuelto por Supabase, sin reconvertirla
// con new Date(), para evitar el desfase 18:00 -> 15:00.

export function obtenerPartesFechaHoraApp(valor) {
  if (!valor) {
    return {
      fecha: '',
      dia: '--/--/--',
      hora: '--:--'
    }
  }

  const texto = String(valor)
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/)

  if (match) {
    const [, anio, mes, dia, hora, minuto] = match

    return {
      fecha: `${anio}-${mes}-${dia}`,
      dia: `${dia}/${mes}/${anio}`,
      hora: `${hora}:${minuto}`
    }
  }

  const fecha = new Date(valor)

  if (Number.isNaN(fecha.getTime())) {
    return {
      fecha: '',
      dia: '--/--/--',
      hora: '--:--'
    }
  }

  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  const hora = String(fecha.getHours()).padStart(2, '0')
  const minuto = String(fecha.getMinutes()).padStart(2, '0')

  return {
    fecha: `${anio}-${mes}-${dia}`,
    dia: `${dia}/${mes}/${anio}`,
    hora: `${hora}:${minuto}`
  }
}

export function obtenerFechaInputApp(fecha = new Date()) {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

export function obtenerFechaInputDesdeValorApp(valor) {
  return obtenerPartesFechaHoraApp(valor).fecha
}

export function formatearFechaHoraApp(valor) {
  const partes = obtenerPartesFechaHoraApp(valor)

  return {
    dia: partes.dia,
    hora: partes.hora
  }
}

export function formatearFechaSoloApp(valor) {
  return obtenerPartesFechaHoraApp(valor).dia
}

export function formatearHoraApp(valor) {
  return obtenerPartesFechaHoraApp(valor).hora
}

export function inicioDiaAppISO(fechaInput) {
  if (!fechaInput) return null

  return `${fechaInput}T00:00:00`
}

export function finDiaAppISO(fechaInput) {
  if (!fechaInput) return null

  return `${fechaInput}T23:59:59`
}