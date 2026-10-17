/** Traducción de respuestas de la API y motivos de llegada a avisos visibles en las pantallas de acceso. */
import type { AvisoDatos } from '../../components/auth/CamposAcceso'
import { ApiError } from '../../services/api/baseClient'

export const AVISOS_LLEGADA: Record<string, AvisoDatos> = {
  expirada: { tono: 'advertencia', titulo: 'Tu sesión caducó', mensaje: 'Por seguridad, inicia sesión de nuevo para continuar.' },
  salida: { tono: 'exito', titulo: 'Cerraste sesión correctamente', mensaje: 'Tu sesión se invalidó también en el servidor.' },
  registro: { tono: 'exito', titulo: 'Cuenta creada', mensaje: 'Ya puedes iniciar sesión con tu usuario y contraseña.' },
  restablecida: { tono: 'exito', titulo: 'Contraseña actualizada', mensaje: 'Inicia sesión con tu nueva contraseña.' }
}

/** Aviso para un error de la API; los mensajes del backend ya son seguros para mostrar. */
export function avisoDeError(err: unknown, tituloPorDefecto = 'No se pudo completar la solicitud'): AvisoDatos {
  const e = err as ApiError
  if (!e || e.status === 0 || e.codigo === 'RED') {
    return { tono: 'error', titulo: 'Sin conexión con el servidor', mensaje: 'Comprueba tu conexión a internet o que el servicio esté en marcha e inténtalo de nuevo.' }
  }
  if (e.status >= 500) {
    return { tono: 'error', titulo: 'Error del servidor', mensaje: 'Algo falló de nuestro lado. Inténtalo de nuevo en unos minutos.' }
  }
  switch (e.codigo) {
    case 'AUTH-CREDENCIALES':
      return { tono: 'error', titulo: 'No pudimos iniciar sesión', mensaje: 'El usuario, el correo o la contraseña no son correctos.' }
    case 'AUTH-CUENTA-INACTIVA':
      return { tono: 'advertencia', titulo: 'Cuenta desactivada', mensaje: e.message }
    case 'AUTH-429':
      return { tono: 'advertencia', titulo: 'Acceso bloqueado temporalmente', mensaje: e.message }
    case 'AUTH-ORIGEN':
    case 'AUTH-CSRF':
      return { tono: 'error', titulo: 'Solicitud rechazada por seguridad', mensaje: 'Recarga la página e inténtalo de nuevo.' }
    case 'AUTH-TOKEN-INVALIDO':
      return { tono: 'error', titulo: 'Enlace no válido', mensaje: e.message }
    default:
      return { tono: 'error', titulo: tituloPorDefecto, mensaje: e.message }
  }
}

/** Errores 422 del backend por campo ({campo, mensaje}) para mostrarlos junto a cada input. */
export function erroresPorCampo(err: unknown): Record<string, string> {
  const e = err as ApiError
  const errores: Record<string, string> = {}
  for (const d of e?.detalles ?? []) if (d.campo && !errores[d.campo]) errores[d.campo] = d.mensaje
  return errores
}
