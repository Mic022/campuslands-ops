import { useEffect, useRef, useState } from 'react'
import { api, leerSesion } from '../api.js'
import { useApi } from '../useApi.js'
import { ErrorApi } from './Estado.jsx'

// La IA interpreta lo que escribes; qué espacio conviene lo calculan las reglas del backend.
// Nada se guarda hasta que confirmas con un botón (POST /reservas o POST /incidencias).

const EJEMPLOS = [
  'Necesito un salón con computadores para 30 personas mañana de 10 a 12',
  'Una sala sin equipos, con TV, para 8 personas el viernes a las 3 por 2 horas',
  '¿Qué espacios hay para 20 personas sin computadores?',
  'El TV de Cosmos no enciende',
]

const EQUIPAMIENTO = { computadores: '💻 Computadores', tv: '📺 TV, sin computadores' }

function hora(iso) {
  return iso?.slice(11, 16)
}

function fechaHora(iso) {
  return `${iso.slice(0, 10)} ${hora(iso)}`
}

function esAdmin() {
  return leerSesion()?.usuario?.rol === 'admin'
}

// ---------- Tarjeta de un espacio recomendado: se reserva con un clic ----------

function TarjetaEspacio({ item, destacado, onReservado }) {
  const sesion = leerSesion()
  const [solicitante, setSolicitante] = useState(item.reserva.solicitante ?? (esAdmin() ? '' : sesion?.usuario?.nombre ?? ''))
  const [estado, setEstado] = useState({ enviando: false, hecha: null, error: null })

  async function reservar() {
    setEstado({ enviando: true, hecha: null, error: null })
    try {
      const reserva = await api('/reservas', { method: 'POST', body: { ...item.reserva, solicitante } })
      setEstado({ enviando: false, hecha: reserva, error: null })
      onReservado?.(reserva, item)
    } catch (error) {
      setEstado({ enviando: false, hecha: null, error })
    }
  }

  return (
    <div className={`tarjeta recomendacion${destacado ? ' destacada' : ''}`}>
      <div className="fila-titulo">
        <strong>{item.nombre}</strong>
        {destacado && <span className="chip disponible">Más adecuado</span>}
      </div>
      <span className="tarjeta-detalle">
        {EQUIPAMIENTO[item.equipamiento]} · admite {item.aforo_permitido} · {fechaHora(item.inicio)}–{hora(item.fin)}
      </span>
      <span>{item.motivo}</span>
      {estado.hecha ? (
        <p className="aviso ok">Reserva #{estado.hecha.id} creada a nombre de {estado.hecha.solicitante}.</p>
      ) : (
        <div className="acciones">
          <input
            aria-label="A nombre de"
            placeholder="A nombre de…"
            value={solicitante}
            onChange={(e) => setSolicitante(e.target.value)}
            disabled={!esAdmin() || estado.enviando}
          />
          <button onClick={reservar} disabled={estado.enviando || !solicitante.trim()}>
            {estado.enviando ? 'Reservando…' : 'Reservar'}
          </button>
        </div>
      )}
      {estado.error && <ErrorApi error={estado.error} />}
    </div>
  )
}

// ---------- Resultado de una búsqueda (asistente o buscador manual) ----------

export function ResultadoReserva({ recomendacion, solicitado, onReservado }) {
  if (!recomendacion) return null
  if (recomendacion.error) {
    return <div className="aviso error"><span><strong>{recomendacion.error.codigo}</strong> · {recomendacion.error.mensaje}</span></div>
  }
  const { recomendados, alternativas, descartados } = recomendacion
  return (
    <div className="resultado">
      {solicitado && !solicitado.reserva && (
        <p className="aviso alerta">
          <strong>{solicitado.nombre}</strong> no sirve: {solicitado.motivo} <code>{solicitado.codigo}</code>
        </p>
      )}
      {recomendados.length > 0 && (
        <div className="grilla-tarjetas">
          {recomendados.map((item, i) => (
            <TarjetaEspacio key={item.espacio_id} item={item} destacado={i === 0} onReservado={onReservado} />
          ))}
        </div>
      )}
      {alternativas.length > 0 && (
        <>
          <h3>Otras horas ese día</h3>
          <div className="grilla-tarjetas">
            {alternativas.map((item) => (
              <TarjetaEspacio key={`${item.espacio_id}-${item.inicio}`} item={item} onReservado={onReservado} />
            ))}
          </div>
        </>
      )}
      {descartados.length > 0 && (
        <details>
          <summary>Por qué se descartaron {descartados.length} espacios</summary>
          <ul className="descartes">
            {descartados.map((d) => (
              <li key={d.espacio_id}><strong>{d.nombre}</strong> <code>{d.codigo}</code> {d.motivo}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

// ---------- Borrador de incidencia: la persona confirma o ajusta ----------

function BorradorIncidencia({ borrador, catalogos, onRegistrada }) {
  const [form, setForm] = useState({
    titulo: borrador.titulo,
    descripcion: borrador.descripcion,
    categoria: borrador.categoria ?? '',
    prioridad: borrador.prioridad ?? '',
    area_responsable: borrador.area_responsable ?? '',
  })
  const [estado, setEstado] = useState({ enviando: false, hecha: null, error: null })
  const p = borrador.propuesta_ia
  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })
  const completo = form.titulo.trim() && form.descripcion.trim() && form.categoria && form.prioridad && form.area_responsable

  async function registrar() {
    setEstado({ enviando: true, hecha: null, error: null })
    try {
      const incidencia = await api('/incidencias', {
        method: 'POST',
        body: { ...form, espacio_id: borrador.espacio_id, recurso_id: borrador.recurso_id, propuesta_ia: p },
      })
      setEstado({ enviando: false, hecha: incidencia, error: null })
      onRegistrada?.(incidencia)
    } catch (error) {
      setEstado({ enviando: false, hecha: null, error })
    }
  }

  const opciones = (lista) => (lista ?? []).map((v) => <option key={v} value={v}>{v}</option>)

  return (
    <div className="tarjeta borrador">
      <div className="fila-titulo">
        <strong>Reporte de falla</strong>
        {p ? (
          <span className={`chip ${borrador.requiere_revision ? 'mantenimiento' : 'disponible'}`}>
            IA · confianza {Math.round(p.confianza * 100)} %{borrador.requiere_revision ? ' · revisar' : ''}
          </span>
        ) : (
          <span className="chip mantenimiento">Clasificación manual</span>
        )}
      </div>
      <span className="tarjeta-detalle">
        {borrador.espacio_id ? `Espacio: ${borrador.espacio_id}` : 'Sin espacio'} · {borrador.recurso_id ? `Recurso: ${borrador.recurso_id}` : 'sin recurso'}
      </span>
      {p && <span className="tarjeta-detalle">Justificación de la IA: {p.justificacion}</span>}
      {estado.hecha ? (
        <p className="aviso ok">Incidencia #{estado.hecha.id} registrada ({estado.hecha.origen_triaje}).</p>
      ) : (
        <div className="formulario">
          <label>Título<input value={form.titulo} onChange={cambiar('titulo')} maxLength={120} /></label>
          <label>Descripción<textarea value={form.descripcion} onChange={cambiar('descripcion')} rows={2} /></label>
          <div className="fila">
            <label>Categoría<select value={form.categoria} onChange={cambiar('categoria')}><option value="">—</option>{opciones(catalogos?.categoria)}</select></label>
            <label>Prioridad<select value={form.prioridad} onChange={cambiar('prioridad')}><option value="">—</option>{opciones(catalogos?.prioridad)}</select></label>
            <label>Área<select value={form.area_responsable} onChange={cambiar('area_responsable')}><option value="">—</option>{opciones(catalogos?.area)}</select></label>
          </div>
          <button onClick={registrar} disabled={estado.enviando || !completo}>
            {estado.enviando ? 'Registrando…' : 'Confirmar y registrar'}
          </button>
        </div>
      )}
      {estado.error && <ErrorApi error={estado.error} />}
    </div>
  )
}

// ---------- Buscador manual: funciona sin IA ----------

function fechaLocal(dias) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function BuscadorManual() {
  const manana = fechaLocal(1)
  const [form, setForm] = useState({ asistentes: 10, fecha: manana, inicio: '10:00', fin: '12:00', equipos: '' })
  const [estado, setEstado] = useState({ buscando: false, resultado: null, error: null })
  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  async function buscar(e) {
    e.preventDefault()
    setEstado({ buscando: true, resultado: null, error: null })
    const params = new URLSearchParams({
      asistentes: form.asistentes,
      inicio: `${form.fecha}T${form.inicio}`,
      fin: `${form.fecha}T${form.fin}`,
    })
    if (form.equipos) params.set('con_equipos', form.equipos)
    try {
      setEstado({ buscando: false, resultado: await api(`/recomendaciones?${params}`), error: null })
    } catch (error) {
      setEstado({ buscando: false, resultado: null, error })
    }
  }

  return (
    <section>
      <h2>Buscador de espacios <span className="contador">sin IA</span></h2>
      <form className="formulario fila" onSubmit={buscar}>
        <label>Personas<input type="number" min="1" value={form.asistentes} onChange={cambiar('asistentes')} required /></label>
        <label>Día<input type="date" value={form.fecha} onChange={cambiar('fecha')} required /></label>
        <label>Desde<input type="time" value={form.inicio} onChange={cambiar('inicio')} required /></label>
        <label>Hasta<input type="time" value={form.fin} onChange={cambiar('fin')} required /></label>
        <label>Equipos
          <select value={form.equipos} onChange={cambiar('equipos')}>
            <option value="">Me da igual</option>
            <option value="true">Con computadores</option>
            <option value="false">Sin computadores (TV)</option>
          </select>
        </label>
        <button type="submit" disabled={estado.buscando}>{estado.buscando ? 'Buscando…' : 'Buscar'}</button>
      </form>
      {estado.error && <ErrorApi error={estado.error} />}
      {estado.resultado && (
        estado.resultado.recomendados.length || estado.resultado.alternativas.length || estado.resultado.error
          ? <ResultadoReserva recomendacion={estado.resultado} />
          : <p className="aviso vacio">Ningún espacio cumple esa necesidad ese día.</p>
      )}
    </section>
  )
}

// ---------- Chat ----------

function Respuesta({ datos, catalogos, onNota }) {
  return (
    <>
      {datos.recomendacion && (
        <ResultadoReserva
          recomendacion={datos.recomendacion}
          solicitado={datos.solicitado}
          onReservado={(r, item) => onNota(`Reserva #${r.id} creada: ${item.nombre} el ${fechaHora(r.inicio)}–${hora(r.fin)} a nombre de ${r.solicitante}.`)}
        />
      )}
      {!datos.recomendacion && datos.espacios?.length > 0 && (
        <div className="espacios-que-sirven">
          {datos.espacios.map((e) => (
            <span key={e.espacio_id} className="chip">{e.nombre} · {e.aforo_permitido} · {EQUIPAMIENTO[e.equipamiento]}</span>
          ))}
        </div>
      )}
      {datos.incidencia && (
        <BorradorIncidencia
          borrador={datos.incidencia}
          catalogos={catalogos}
          onRegistrada={(i) => onNota(`Incidencia #${i.id} registrada con prioridad ${i.prioridad}.`)}
        />
      )}
    </>
  )
}

export default function Asistente() {
  const [conversacion, setConversacion] = useState([
    { rol: 'asistente', texto: 'Hola. Dime qué necesitas reservar (personas, con o sin computadores, día y hora) o qué falla quieres reportar.' },
  ])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [iaCaida, setIaCaida] = useState(false)
  const catalogos = useApi('/catalogos').datos
  const final = useRef(null)

  useEffect(() => { final.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }) }, [conversacion])

  const agregarNota = (nota) => setConversacion((c) => [...c, { rol: 'asistente', texto: nota }])

  async function enviar(mensaje) {
    const limpio = mensaje.trim()
    if (!limpio || enviando) return
    const nueva = [...conversacion, { rol: 'usuario', texto: limpio }]
    setConversacion(nueva)
    setTexto('')
    setEnviando(true)
    setError(null)
    try {
      const mensajes = nueva.slice(1).map(({ rol, texto }) => ({ rol, texto }))
      const datos = await api('/asistente', { method: 'POST', body: { mensajes } })
      setConversacion((c) => [...c, { rol: 'asistente', texto: datos.mensaje, datos }])
      setIaCaida(false)
    } catch (err) {
      setError(err)
      if (err.codigo === 'IA-503') setIaCaida(true)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="asistente">
      <p className="sub">
        La IA entiende tu mensaje; el sistema elige el espacio con las reglas de reserva (nunca te propone uno ocupado)
        y nada se guarda hasta que confirmas.
      </p>
      <div className="chat" aria-live="polite">
        {conversacion.map((m, i) => (
          <div key={i} className={`burbuja ${m.rol}`}>
            <p>{m.texto}</p>
            {m.datos && <Respuesta datos={m.datos} catalogos={catalogos} onNota={agregarNota} />}
          </div>
        ))}
        {enviando && <div className="burbuja asistente"><p className="pensando">Analizando con IA…</p></div>}
        <div ref={final} />
      </div>

      {error && (
        <div className="aviso error" role="alert">
          <span>
            <strong>{error.codigo}</strong> · {error.message}
            {iaCaida && ' Usa el buscador manual de abajo: funciona sin IA.'}
          </span>
        </div>
      )}

      <form className="entrada" onSubmit={(e) => { e.preventDefault(); enviar(texto) }}>
        <input
          aria-label="Mensaje para el asistente"
          placeholder="Ej.: salón con computadores para 30 personas mañana de 10 a 12"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={1000}
          disabled={enviando}
        />
        <button type="submit" disabled={enviando || !texto.trim()}>{enviando ? 'Enviando…' : 'Enviar'}</button>
      </form>
      <div className="ejemplos">
        {EJEMPLOS.map((e) => (
          <button key={e} type="button" onClick={() => enviar(e)} disabled={enviando}>{e}</button>
        ))}
      </div>

      {iaCaida ? <BuscadorManual /> : (
        <details>
          <summary>Buscar sin IA</summary>
          <BuscadorManual />
        </details>
      )}
    </div>
  )
}
