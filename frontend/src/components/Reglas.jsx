import { useApi } from '../useApi.js'
import { Consulta } from './Estado.jsx'

const ETIQUETAS = {
  hora_apertura: 'Hora de apertura',
  hora_cierre: 'Hora de cierre',
  max_horas_reserva: 'Duración máxima de reserva (h)',
  factor_aforo: 'Factor de aforo permitido',
  max_prestamos_activos: 'Préstamos activos por persona',
  prioridades_bloqueantes: 'Prioridades que bloquean',
  umbral_confianza_ia: 'Umbral de confianza de la IA',
}

export default function Reglas() {
  const reglas = useApi('/reglas')
  const catalogos = useApi('/catalogos')
  return (
    <>
      <h2>Parámetros vigentes</h2>
      <p className="sub">Se leen de <code>backend/app/config/reglas.py</code>.</p>
      <Consulta consulta={reglas}>
        {(r) => (
          <table>
            <tbody>
              {Object.entries(r).map(([k, v]) => (
                <tr key={k}>
                  <td>{ETIQUETAS[k] ?? k}</td>
                  <td><code>{Array.isArray(v) ? v.join(', ') : String(v)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Consulta>

      <h2>Catálogos</h2>
      <p className="sub">Se leen de <code>backend/app/config/catalogos.py</code>.</p>
      <Consulta consulta={catalogos}>
        {(c) => (
          <table>
            <tbody>
              {Object.entries(c).map(([k, v]) => (
                <tr key={k}><td>{k}</td><td>{v.map((x) => <span key={x} className="chip">{x}</span>)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Consulta>
    </>
  )
}
