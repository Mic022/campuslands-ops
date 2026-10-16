// Estados comunes: carga, error con reintento y vacío.
export function Cargando({ texto = 'Cargando…' }) {
  return <p className="aviso" role="status">{texto}</p>
}

export function ErrorApi({ error, onReintentar }) {
  return (
    <div className="aviso error" role="alert">
      <span><strong>{error.codigo}</strong> · {error.message}</span>
      {onReintentar && <button onClick={onReintentar}>Reintentar</button>}
    </div>
  )
}

export function Vacio({ texto }) {
  return <p className="aviso vacio">{texto}</p>
}

// Envuelve una respuesta de useApi y solo pinta children cuando hay datos.
export function Consulta({ consulta, textoCarga, children }) {
  if (consulta.cargando && !consulta.datos) return <Cargando texto={textoCarga} />
  if (consulta.error) return <ErrorApi error={consulta.error} onReintentar={consulta.recargar} />
  return children(consulta.datos)
}
