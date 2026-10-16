import { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'

// Carga una ruta GET y expone {datos, cargando, error, recargar}.
export function useApi(ruta) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null })

  const recargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    try {
      const datos = await api(ruta)
      setEstado({ datos, cargando: false, error: null })
    } catch (error) {
      setEstado({ datos: null, cargando: false, error })
    }
  }, [ruta])

  useEffect(() => { recargar() }, [recargar])

  return { ...estado, recargar }
}
