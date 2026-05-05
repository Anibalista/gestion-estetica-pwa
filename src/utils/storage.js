// src/utils/storage.js
import { supabase } from '../supabaseClient'

/**
 * Sube un archivo a un bucket de Supabase
 * @param {File} file - El archivo del input file
 * @param {string} bucket - Nombre del bucket (ej: 'combos')
 * @param {string} folder - Carpeta (ej: id del profesional o nombre negocio)
 * @returns {string} - La URL pública del archivo
 */
export const uploadImage = async (file, bucket, folder) => {
  try {
    // 1. Limpiar el nombre del archivo para evitar errores de URL
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    // 2. Subir el archivo
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // 3. Obtener la URL pública
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
    return data.publicUrl
  } catch (error) {
    console.error('Error en uploadImage:', error.message)
    throw error
  }
}

// Lista de imágenes genéricas hardcodeadas para facilitar el uso
export const IMAGENES_GENERICAS = [
  { id: 'zen', url: 'https://ukbvytobegdzwpetfshd.supabase.co/storage/v1/object/public/combos/genericas/zen.png', label: 'Zen' },
  { id: 'aromaterapia', url: 'https://ukbvytobegdzwpetfshd.supabase.co/storage/v1/object/public/combos/genericas/aromaterapia.png', label: 'Aromaterapia' },
  { id: 'facial', url: 'https://ukbvytobegdzwpetfshd.supabase.co/storage/v1/object/public/combos/genericas/cuidado_facial.png', label: 'Facial' },
  { id: 'masaje', url: 'https://ukbvytobegdzwpetfshd.supabase.co/storage/v1/object/public/combos/genericas/masaje_en_curso.png', label: 'Masaje' },
  { id: 'camilla', url: 'https://ukbvytobegdzwpetfshd.supabase.co/storage/v1/object/public/combos/genericas/camilla.png', label: 'Camilla' },
  { id: 'regalo', url: 'https://ukbvytobegdzwpetfshd.supabase.co/storage/v1/object/public/combos/genericas/regalo.png', label: 'Regalo' },
]