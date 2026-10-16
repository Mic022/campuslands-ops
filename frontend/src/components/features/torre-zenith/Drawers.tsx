import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarPlus, ShieldCheck, X } from 'lucide-react'
import { SALAS_GEOMETRIA } from '../../../data/torreZenithNivel6'
import { reservasApi } from '../../../services/reservasApi'
import { EstadoVisual, ReservaPrivada, SalaEstado, SalaId } from '../../../types/torreZenith'
import { EstadoChip, Muestra, Toast, boton, fechaCorta, panel } from './comun'
import { ReservationRow } from './ReservationRow'

const Cajon: React.FC<{ titulo: string; onCerrar: () => void; children: React.ReactNode }> = ({ titulo, onCerrar, children }) => (
  <motion.aside
    initial={{ opacity: 0, x: 24 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 24 }}
    transition={{ type: 'spring', damping: 26, stiffness: 280 }}
    className={`${panel} absolute bottom-3 right-3 top-3 z-40 flex w-[calc(100%-1.5rem)] flex-col sm:w-[380px]`}
  >
    <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
      <h3 className="text-sm font-bold text-white">{titulo}</h3>
      <button onClick={onCerrar} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer" aria-label="Cerrar">
        <X className="h-4 w-4" />
      </button>
    </header>
    <div className="flex-1 overflow-y-auto p-3">{children}</div>
  </motion.aside>
)

// ---------- Listado de las diez salas ----------

interface RoomListDrawerProps {
  nombres: Record<SalaId, string>
  estados: Record<SalaId, EstadoVisual>
  salas: Partial<Record<SalaId, SalaEstado>>
  seleccion: SalaId | null
  onElegir: (id: SalaId) => void
  onReservar: (id: SalaId) => void
  onCerrar: () => void
}

export const RoomListDrawer: React.FC<RoomListDrawerProps> = ({ nombres, estados, salas, seleccion, onElegir, onReservar, onCerrar }) => (
  <Cajon titulo="Salas del Nivel 6 (10)" onCerrar={onCerrar}>
    <ul className="space-y-1.5">
      {[...SALAS_GEOMETRIA]
        .sort((a, b) => nombres[a.id].localeCompare(nombres[b.id], 'es'))
        .map(g => {
          const s = salas[g.id]
          return (
            <li key={g.id}>
              <div
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition ${
                  seleccion === g.id ? 'border-cyan-400/70 bg-cyan-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'
                }`}
              >
                <button onClick={() => onElegir(g.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer">
                  <Muestra color={g.color} className="h-4 w-4" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{nombres[g.id]}</span>
                    <span className="block text-[11px] text-slate-400">
                      {s ? `${s.aforo_maximo} pers.` : '—'}
                      {s?.proxima_reserva && ` · próx. ${fechaCorta(s.proxima_reserva.fecha)} ${s.proxima_reserva.hora_inicio}`}
                    </span>
                  </span>
                </button>
                <EstadoChip estado={estados[g.id]} />
                <button
                  onClick={() => onReservar(g.id)}
                  disabled={!s || s.estado !== 'disponible'}
                  className="rounded-lg p-1.5 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  title={`Reservar ${nombres[g.id]}`}
                  aria-label={`Reservar ${nombres[g.id]}`}
                >
                  <CalendarPlus className="h-4 w-4" />
                </button>
              </div>
            </li>
          )
        })}
    </ul>
  </Cajon>
)

// ---------- Mis reservas + modo operador ----------

interface MyReservationsDrawerProps {
  admin: boolean
  version: number
  nombres: Record<SalaId, string>
  onCambio: () => void
  onCerrar: () => void
  onToast: Toast
}

export const MyReservationsDrawer: React.FC<MyReservationsDrawerProps> = ({ admin, version, nombres, onCambio, onCerrar, onToast }) => {
  const [pestana, setPestana] = useState<'mias' | 'todas'>('mias')
  const [lista, setLista] = useState<ReservaPrivada[]>([])
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando')
  const [mensajeError, setMensajeError] = useState('')

  const cargar = async () => {
    setEstado('cargando')
    try {
      setLista(pestana === 'todas' && admin ? await reservasApi.todasLasReservas() : await reservasApi.misReservas())
      setEstado('ok')
    } catch (e) {
      setMensajeError((e as Error).message)
      setEstado('error')
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pestana, admin, version])

  const color = (id: SalaId) => SALAS_GEOMETRIA.find(g => g.id === id)?.color

  return (
    <Cajon titulo="Reservas" onCerrar={onCerrar}>
      <div className="mb-3 flex gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
        <button
          onClick={() => setPestana('mias')}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold cursor-pointer ${pestana === 'mias' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
        >
          Mis reservas
        </button>
        <button
          onClick={() => setPestana('todas')}
          disabled={!admin}
          title={admin ? undefined : 'Requiere modo operador'}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${pestana === 'todas' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
        >
          Todas (operador)
        </button>
      </div>

      {pestana === 'mias' && (
        <p className="mb-2 text-[11px] text-slate-500">
          Se muestran las reservas creadas desde este navegador; solo tú (o un operador) puedes cancelarlas.
        </p>
      )}

      {estado === 'cargando' && <p className="text-sm text-slate-400">Cargando…</p>}
      {estado === 'error' && <p className="text-sm text-rose-400">{mensajeError}</p>}
      {estado === 'ok' &&
        (lista.length ? (
          <ul className="space-y-1.5">
            {lista.map(r => (
              <ReservationRow
                key={r.id}
                reserva={r}
                salaNombre={nombres[r.sala_id] ?? r.sala_id}
                salaColor={color(r.sala_id)}
                admin={admin}
                onCambio={() => {
                  cargar()
                  onCambio()
                }}
                onToast={onToast}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">
            Aún no hay reservas {pestana === 'mias' ? 'hechas desde este navegador' : 'registradas'}.
          </p>
        ))}

      <p className="mt-5 flex items-start gap-2 border-t border-slate-800 pt-3 text-[11px] leading-snug text-slate-400">
        <ShieldCheck className={`mt-px h-3.5 w-3.5 shrink-0 ${admin ? 'text-amber-300' : 'text-slate-500'}`} />
        {admin
          ? 'Modo operador activo por tu rol de administrador: mantenimiento e historial completo habilitados.'
          : 'El modo operador (mantenimiento e historial completo) está disponible para el rol administrador.'}
      </p>
    </Cajon>
  )
}
