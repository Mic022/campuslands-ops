/** Política de acceso publicada por el backend (requisitos de contraseña, registro, recuperación). */
import { useEffect, useState } from 'react'
import { authApi, PoliticaAcceso } from '../services/api/authApi'

let cache: Promise<PoliticaAcceso> | null = null

export function usePolitica() {
  const [politica, setPolitica] = useState<PoliticaAcceso | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let vigente = true
    cache ??= authApi.politica()
    cache
      .then(p => vigente && setPolitica(p))
      .catch(() => {
        cache = null // se reintenta en la próxima pantalla
        if (vigente) setError(true)
      })
    return () => {
      vigente = false
    }
  }, [])

  return { politica, error }
}
