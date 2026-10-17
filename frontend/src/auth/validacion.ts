/**
 * Validaciones de formulario en el navegador. Dan respuesta inmediata, pero el backend vuelve a
 * validar todo: estas reglas reflejan la política que publica GET /api/auth/politica.
 */
import type { PoliticaClave } from '../services/api/authApi'

export const EMAIL_RE = /^[a-z0-9.!#&'*+=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i
export const USUARIO_RE = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])$/i

export const POLITICA_POR_DEFECTO: PoliticaClave = {
  min_largo: 10,
  max_largo: 128,
  mayuscula: true,
  minuscula: true,
  numero: true,
  simbolo: false
}

export function validarIdentificador(valor: string): string | null {
  const v = valor.trim()
  if (!v) return 'Escribe tu usuario o correo electrónico.'
  if (v.includes('@') && !EMAIL_RE.test(v)) return 'El correo electrónico no tiene un formato válido.'
  return null
}

export function validarEmail(valor: string): string | null {
  const v = valor.trim()
  if (!v) return 'Escribe tu correo electrónico.'
  if (!EMAIL_RE.test(v)) return 'El correo electrónico no tiene un formato válido.'
  return null
}

export function validarUsuario(valor: string): string | null {
  const v = valor.trim()
  if (!v) return 'Elige un nombre de usuario.'
  if (!USUARIO_RE.test(v)) return 'Usa de 3 a 32 caracteres: letras, números, punto, guion o guion bajo.'
  return null
}

export function validarNombre(valor: string): string | null {
  const v = valor.trim().replace(/\s+/g, ' ')
  if (!v) return 'Escribe tu nombre completo.'
  if (v.length < 3) return 'El nombre es demasiado corto.'
  if (/[<>{}[\]\\/@$%^*=|~`"]/.test(v)) return 'El nombre contiene caracteres no permitidos.'
  return null
}

export interface Requisito {
  id: string
  texto: string
  cumple: boolean
}

export function requisitosClave(clave: string, p: PoliticaClave, personales: string[] = []): Requisito[] {
  const lista: Requisito[] = [
    { id: 'largo', texto: `Al menos ${p.min_largo} caracteres`, cumple: clave.length >= p.min_largo && clave.length <= p.max_largo }
  ]
  if (p.mayuscula) lista.push({ id: 'may', texto: 'Una letra mayúscula', cumple: /[A-ZÁÉÍÓÚÑ]/.test(clave) })
  if (p.minuscula) lista.push({ id: 'min', texto: 'Una letra minúscula', cumple: /[a-záéíóúñ]/.test(clave) })
  if (p.numero) lista.push({ id: 'num', texto: 'Un número', cumple: /\d/.test(clave) })
  if (p.simbolo) lista.push({ id: 'sim', texto: 'Un símbolo', cumple: /[^\w\s]/.test(clave) })
  const minuscula = clave.toLowerCase()
  const datos = personales.map(d => d.toLowerCase().split('@')[0]).filter(d => d.length >= 4)
  lista.push({
    id: 'personal',
    texto: 'Sin tu usuario ni tu correo',
    cumple: clave.length > 0 && !datos.some(d => minuscula.includes(d))
  })
  lista.push({ id: 'espacios', texto: 'Sin espacios al inicio ni al final', cumple: clave.length > 0 && clave === clave.trim() })
  return lista
}

/** 0–4: cuántos requisitos extra cumple además del mínimo (solo orientativo para la barra). */
export function fortalezaClave(clave: string): number {
  if (!clave) return 0
  let puntos = 0
  if (clave.length >= 10) puntos++
  if (clave.length >= 14) puntos++
  if (/[A-Z]/.test(clave) && /[a-z]/.test(clave)) puntos++
  if (/\d/.test(clave) && /[^\w\s]/.test(clave)) puntos++
  return puntos
}
