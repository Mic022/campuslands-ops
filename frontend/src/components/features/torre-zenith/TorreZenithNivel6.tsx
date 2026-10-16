import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { SALAS_GEOMETRIA } from '../../../data/torreZenithNivel6'
import { reservasApi, tokenAdmin } from '../../../services/reservasApi'
import { EstadoVisual, Nivel6Estado, ReglasReserva, SalaEstado, SalaId } from '../../../types/torreZenith'
import { FloorPlan3D } from '../../../scenes/torre-zenith/FloorPlan3D'
import { ComandoCamara, PeticionCamara } from '../../../scenes/torre-zenith/CameraRig'
import { Toast, fechaLarga } from './comun'
import { FloorNavigation } from './FloorNavigation'
import { LevelSummary, RoomStatusLegend } from './LevelPanels'
import { MyReservationsDrawer, RoomListDrawer } from './Drawers'
import { RoomInfoPanel } from './RoomInfoPanel'
import { RoomDetailsModal } from './RoomDetailsModal'
import { ReservationForm } from './ReservationForm'

const REGLAS_POR_DEFECTO: ReglasReserva = { hora_apertura: 6, hora_cierre: 22, max_horas_reserva: 4, factor_aforo: 1 }
const REFRESCO_MS = 20_000

function soportaWebGL() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Plano interactivo del Nivel 6 de Torre Zenith con reservas reales contra el backend. */
export const TorreZenithNivel6: React.FC<{ onToast: Toast }> = ({ onToast }) => {
  const [datos, setDatos] = useState<Nivel6Estado | null>(null)
  const [carga, setCarga] = useState<'cargando' | 'ok' | 'error'>('cargando')
  const [ultimaSync, setUltimaSync] = useState<Date | null>(null)
  const [consulta, setConsulta] = useState<{ fecha: string; hora: string } | null>(null)
  const [reglas, setReglas] = useState<ReglasReserva>(REGLAS_POR_DEFECTO)

  const [seleccion, setSeleccion] = useState<SalaId | null>(null)
  // En pantallas estrechas las diez etiquetas se solapan: arrancan ocultas.
  const [mostrarNombres, setMostrarNombres] = useState(() => window.innerWidth >= 640)
  const [murosVisibles, setMurosVisibles] = useState(true)
  const [vista, setVista] = useState<'3d' | 'superior'>('3d')
  const [comando, setComando] = useState<ComandoCamara | null>(null)
  const [cajon, setCajon] = useState<'lista' | 'reservas' | null>(null)
  const [detalles, setDetalles] = useState<SalaId | null>(null)
  const [formulario, setFormulario] = useState<{ abierto: boolean; sala: SalaId | null }>({ abierto: false, sala: null })
  const [admin, setAdmin] = useState(false)
  const [version, setVersion] = useState(0)
  const webgl = useMemo(soportaWebGL, [])
  const n = useRef(0)

  const camara = (c: PeticionCamara) => setComando({ ...c, n: ++n.current })

  // ---------- Datos ----------

  const cargar = useCallback(async () => {
    setCarga(prev => (prev === 'ok' ? 'ok' : 'cargando'))
    try {
      setDatos(await reservasApi.getNivel6(consulta ?? undefined))
      setCarga('ok')
      setUltimaSync(new Date())
    } catch {
      setCarga('error')
    }
  }, [consulta])

  useEffect(() => {
    cargar()
    const t = window.setInterval(cargar, REFRESCO_MS)
    const alVolver = () => document.visibilityState === 'visible' && cargar()
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [cargar])

  useEffect(() => {
    reservasApi.getReglas().then(setReglas).catch(() => undefined)
    const t = tokenAdmin.leer()
    if (t) reservasApi.verificarAdmin(t).then(() => setAdmin(true)).catch(() => tokenAdmin.guardar(null))
  }, [])

  const refrescar = () => {
    setVersion(v => v + 1)
    cargar()
  }

  const salas = useMemo(() => {
    const m: Partial<Record<SalaId, SalaEstado>> = {}
    if (carga !== 'error') datos?.salas.forEach(s => (m[s.id] = s))
    return m
  }, [datos, carga])

  const nombres = useMemo(
    () => Object.fromEntries(SALAS_GEOMETRIA.map(g => [g.id, salas[g.id]?.nombre ?? g.nombre])) as Record<SalaId, string>,
    [salas]
  )

  // Sin datos del servidor el estado es "desconocido": nunca se supone disponibilidad.
  const estados = useMemo(
    () =>
      Object.fromEntries(
        SALAS_GEOMETRIA.map(g => [g.id, (salas[g.id]?.ocupacion ?? 'desconocido') as EstadoVisual])
      ) as Record<SalaId, EstadoVisual>,
    [salas]
  )

  // ---------- Acciones ----------

  const elegir = (id: SalaId, enfocar = true) => {
    setSeleccion(id)
    if (enfocar) camara({ tipo: 'enfocar', salaId: id })
  }

  const abrirReserva = (id: SalaId | null) => setFormulario({ abierto: true, sala: id })

  const geoSel = SALAS_GEOMETRIA.find(g => g.id === seleccion)
  const salaSel = seleccion ? salas[seleccion] ?? null : null
  const consultaActual = carga === 'ok' && datos ? datos.consulta : null

  return (
    <div className="marco-espacial relative h-[calc(100dvh-9rem)] min-h-[600px] w-full overflow-hidden rounded-2xl bg-[#03050D]">
      {webgl ? (
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center gap-3 text-cyan-400">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <span className="font-mono text-xs">Construyendo el Nivel 6…</span>
            </div>
          }
        >
          <FloorPlan3D
            nombres={nombres}
            estados={estados}
            seleccion={seleccion}
            mostrarNombres={mostrarNombres}
            murosVisibles={murosVisibles}
            comando={comando}
            onSeleccionar={id => elegir(id)}
          />
        </Suspense>
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-400">
          Este navegador no soporta WebGL. Usa el listado de salas (botón de lista) para consultar y reservar.
        </div>
      )}

      {/* Título */}
      <div className="pointer-events-none absolute left-1/2 top-3 hidden -translate-x-1/2 text-center lg:block">
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-cyan-400/90">Torre Zenith · Plano arquitectónico</p>
        <p className="titulo-aurora text-base font-black">Nivel 6 — 10 salas reservables</p>
        {consulta && <p className="text-[11px] capitalize text-amber-300">Consultando {fechaLarga(consulta.fecha)} · {consulta.hora}</p>}
      </div>

      {/* Panel superior izquierdo */}
      <div className="absolute left-3 right-3 top-16 z-30 max-h-[calc(100%-13rem)] sm:right-auto sm:top-3 sm:w-[340px] sm:max-h-[calc(100%-12rem)]">
        <AnimatePresence mode="wait">
          {seleccion && geoSel && (
            <RoomInfoPanel
              key={seleccion}
              nombre={nombres[seleccion]}
              color={geoSel.color}
              sala={salaSel}
              estado={estados[seleccion]}
              consulta={consultaActual}
              reglas={reglas}
              onCerrar={() => setSeleccion(null)}
              onDetalles={() => setDetalles(seleccion)}
              onReservar={() => abrirReserva(seleccion)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Navegación */}
      <div className="absolute left-3 right-3 top-3 z-30 sm:left-auto">
        <FloorNavigation
          vista={vista}
          mostrarNombres={mostrarNombres}
          murosVisibles={murosVisibles}
          onReiniciar={() => {
            setVista('3d')
            camara({ tipo: 'reiniciar' })
          }}
          onVista={v => {
            setVista(v)
            camara({ tipo: v === '3d' ? '3d' : 'superior' })
          }}
          onAcercar={() => camara({ tipo: 'acercar' })}
          onAlejar={() => camara({ tipo: 'alejar' })}
          onNombres={() => setMostrarNombres(v => !v)}
          onMuros={() => setMurosVisibles(v => !v)}
          onLista={() => setCajon(c => (c === 'lista' ? null : 'lista'))}
          onReservas={() => setCajon(c => (c === 'reservas' ? null : 'reservas'))}
        />
      </div>

      {/* Panel inferior izquierdo */}
      <div className="absolute bottom-3 left-3 right-[4.25rem] z-20 sm:right-auto sm:w-[340px]">
        <LevelSummary
          datos={datos}
          carga={carga}
          enVivo={!consulta}
          consulta={consultaActual ?? consulta}
          ultimaSync={ultimaSync}
          onConsulta={setConsulta}
          onReintentar={cargar}
        />
      </div>

      {/* Panel inferior derecho */}
      <div className="absolute bottom-3 right-3 z-20">
        <RoomStatusLegend nombres={nombres} onElegir={id => elegir(id)} />
      </div>

      <AnimatePresence>
        {cajon === 'lista' && (
          <RoomListDrawer
            nombres={nombres}
            estados={estados}
            salas={salas}
            seleccion={seleccion}
            onElegir={id => elegir(id)}
            onReservar={id => abrirReserva(id)}
            onCerrar={() => setCajon(null)}
          />
        )}
        {cajon === 'reservas' && (
          <MyReservationsDrawer
            admin={admin}
            version={version}
            nombres={nombres}
            onAdmin={setAdmin}
            onCambio={refrescar}
            onCerrar={() => setCajon(null)}
            onToast={onToast}
          />
        )}
      </AnimatePresence>

      <RoomDetailsModal
        sala={detalles ? salas[detalles] ?? null : null}
        estado={detalles ? estados[detalles] : 'desconocido'}
        reglas={reglas}
        admin={admin}
        onCerrar={() => setDetalles(null)}
        onReservar={() => {
          const id = detalles
          setDetalles(null)
          abrirReserva(id)
        }}
        onCambio={refrescar}
        onToast={onToast}
      />

      <ReservationForm
        abierta={formulario.abierto}
        salaInicial={formulario.sala}
        salas={SALAS_GEOMETRIA.map(g => salas[g.id]).filter((s): s is SalaEstado => Boolean(s))}
        reglas={reglas}
        onCerrar={() => setFormulario(f => ({ ...f, abierto: false }))}
        onReservada={(r, salaNombre) => {
          onToast('exito', `${salaNombre} reservada el ${r.fecha} de ${r.hora_inicio} a ${r.hora_fin}.`, `RESERVA #${r.id}`)
          refrescar()
        }}
        onVerMisReservas={() => {
          setFormulario(f => ({ ...f, abierto: false }))
          setCajon('reservas')
        }}
      />
    </div>
  )
}
