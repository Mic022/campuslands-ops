import { useApi } from '../useApi.js'
import { Consulta, Vacio } from './Estado.jsx'

export default function Datos() {
  const consulta = useApi('/datos/reporte')
  return (
    <Consulta consulta={consulta} textoCarga="Cargando reporte de carga…">
      {(rep) => (
        <>
          <p className="sub">Generado: {rep.generado_en}</p>

          <h2>Archivos leídos</h2>
          <table>
            <thead><tr><th>Archivo</th><th>Entidad</th><th>Codificación</th><th>Resultado</th></tr></thead>
            <tbody>
              {rep.archivos.map((a) => (
                <tr key={a.archivo}>
                  <td><code>{a.archivo}</code></td>
                  <td>{a.entidad}</td>
                  <td>{a.codificacion ?? '—'}</td>
                  <td>
                    {a.error ? <span className="chip inhabilitado">{a.error}</span>
                      : a.aviso ? <span className="chip mantenimiento">{a.aviso}</span>
                      : a.mojibake_reparado ? 'Leído (codificación reparada)' : 'Leído'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Resumen por entidad</h2>
          <table>
            <thead><tr><th>Entidad</th><th className="num">Leídos</th><th className="num">Cargados</th><th className="num">Cuarentena</th><th className="num">Corregidos</th></tr></thead>
            <tbody>
              {rep.resumen.map((r) => (
                <tr key={r.entidad}>
                  <td>{r.entidad}</td>
                  <td className="num">{r.leidos}</td>
                  <td className="num">{r.cargados}</td>
                  <td className="num">{r.en_cuarentena}</td>
                  <td className="num">{r.corregidos}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Registros en cuarentena</h2>
          {Object.values(rep.detalle).every((e) => !e.cuarentena.length) ? (
            <Vacio texto="Ningún registro quedó en cuarentena." />
          ) : (
            <table>
              <thead><tr><th>Entidad</th><th className="num">Fila</th><th>ID origen</th><th>Motivo</th></tr></thead>
              <tbody>
                {Object.values(rep.detalle).flatMap((e) =>
                  e.cuarentena.map((c) => (
                    <tr key={`${e.entidad}-${c.fila}`}>
                      <td>{e.entidad}</td>
                      <td className="num">{c.fila}</td>
                      <td>{c.id_origen ?? '—'}</td>
                      <td>{c.motivo}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          )}
        </>
      )}
    </Consulta>
  )
}
