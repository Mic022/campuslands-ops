import { useApi } from '../useApi.js'
import { Consulta } from './Estado.jsx'

function Tarjeta({ titulo, valor, detalle }) {
  return (
    <div className="tarjeta">
      <span className="tarjeta-titulo">{titulo}</span>
      <span className="tarjeta-valor">{valor}</span>
      {detalle && <span className="tarjeta-detalle">{detalle}</span>}
    </div>
  )
}

function suma(obj) {
  return Object.values(obj).reduce((a, b) => a + b, 0)
}

function desglose(obj) {
  const partes = Object.entries(obj).map(([k, v]) => `${v} ${k}`)
  return partes.length ? partes.join(' · ') : 'sin registros'
}

export default function Panel() {
  const consulta = useApi('/resumen')
  return (
    <Consulta consulta={consulta} textoCarga="Calculando el estado del campus…">
      {(r) => (
        <div className="grilla-tarjetas">
          <Tarjeta titulo="Espacios" valor={suma(r.espacios_por_tipo)} detalle={desglose(r.espacios_por_tipo)} />
          <Tarjeta titulo="Aforo total" valor={r.aforo_total} detalle="personas" />
          <Tarjeta titulo="Reservas activas hoy" valor={r.reservas_activas_hoy} />
          <Tarjeta titulo="Recursos" valor={suma(r.recursos_por_estado)} detalle={desglose(r.recursos_por_estado)} />
          <Tarjeta titulo="Préstamos activos" valor={r.prestamos_activos} />
          <Tarjeta
            titulo="Incidencias abiertas"
            valor={suma(r.incidencias_abiertas_por_prioridad)}
            detalle={desglose(r.incidencias_abiertas_por_prioridad)}
          />
        </div>
      )}
    </Consulta>
  )
}
