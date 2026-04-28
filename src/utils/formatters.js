// src/utils/formatters.js

/**
 * Capitaliza la primera letra de CADA palabra.
 * Ideal para: Nombres, Apellidos, Ciudades.
 * Ej: "maría gómez" -> "María Gómez"
 */
export const capitalizarNombres = (texto) => {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
};

/**
 * Capitaliza SOLO la primera letra de toda la oración.
 * Ideal para: Descripciones, Productos, Servicios, Observaciones.
 * Ej: "masaje descontracturante de espalda" -> "Masaje descontracturante de espalda"
 */
export const capitalizarPrimeraLetra = (texto) => {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};