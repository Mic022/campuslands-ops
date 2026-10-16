import { useEffect, useState } from 'react'
import { api } from './api.js'

export default function App() {
  const [estado, setEstado] = useState({ cargando: true, error: null, catalogos: null })

  async function cargar() {
    setEstado({ cargando: true, error: null, catalogos: null })
    try {
      await api('/health')
      const catalogos = await api('/catalogos')
      setEstado({ cargando: false, error: null, catalogos })
    } catch (e) {
      setEstado({ cargando: false, error: e, catalogos: null })
    }
  }

  useEffect(() => { cargar() }, [])

  return (
    <main className="contenedor">
      <h1>Campus Ops</h1>
      <p className="sub">Sistema Central de Gestión Operativa</p>

      {estado.cargando && <p className="aviso">Conectando con el backend…</p>}

      {estado.error && (
        <div className="aviso error">
          <strong>{estado.error.codigo}</strong> · {estado.error.message}
          <button onClick={cargar}>Reintentar</button>
        </div>
      )}

      {estado.catalogos && (
        <div className="aviso ok">
          Backend conectado. Prioridades: {estado.catalogos.prioridad.join(', ')}
        </div>
      )}
    </main>
  )
}
