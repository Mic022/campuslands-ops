import { useApi } from '../useApi.js'
import { Consulta, Vacio } from './Estado.jsx'

const TITULOS = { aula: 'Aulas', cubiculo: 'Cubículos' }
const EQUIPAMIENTO = { computadores: 'Computadores', tv: 'TV (sin computadores)' }

export default function Espacios() {
  const consulta = useApi('/espacios')
  return (
    <Consulta consulta={consulta} textoCarga="Cargando espacios…">
      {(espacios) => {
        if (!espacios.length) return <Vacio texto="No hay espacios cargados. Ejecuta reset_db." />
        const porTipo = Object.groupBy
          ? Object.groupBy(espacios, (e) => e.tipo)
          : espacios.reduce((acc, e) => ({ ...acc, [e.tipo]: [...(acc[e.tipo] ?? []), e] }), {})
        return Object.entries(porTipo).map(([tipo, lista]) => (
          <section key={tipo}>
            <h2>{TITULOS[tipo] ?? tipo} <span className="contador">{lista.length}</span></h2>
            <table>
              <thead>
                <tr><th>ID</th><th>Nombre</th><th className="num">Aforo</th><th>Equipamiento</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {lista.map((e) => (
                  <tr key={e.id}>
                    <td><code>{e.id}</code></td>
                    <td>{e.nombre}</td>
                    <td className="num">{e.aforo}</td>
                    <td>{EQUIPAMIENTO[e.equipamiento] ?? '—'}</td>
                    <td><span className={`chip ${e.estado}`}>{e.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      }}
    </Consulta>
  )
}
