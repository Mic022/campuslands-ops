import React from 'react'
import { Box, CalendarCheck, Layers, List, Map, RotateCcw, Tag, UsersRound, ZoomIn, ZoomOut } from 'lucide-react'

interface FloorNavigationProps {
  vista: '3d' | 'superior'
  mostrarNombres: boolean
  murosVisibles: boolean
  mostrarPersonas: boolean
  onReiniciar: () => void
  onVista: (v: '3d' | 'superior') => void
  onAcercar: () => void
  onAlejar: () => void
  onNombres: () => void
  onMuros: () => void
  onPersonas: () => void
  onLista: () => void
  onReservas: () => void
}

const Boton: React.FC<{ titulo: string; activo?: boolean; onClick: () => void; children: React.ReactNode }> = ({
  titulo,
  activo,
  onClick,
  children
}) => (
  <button
    onClick={onClick}
    title={titulo}
    aria-label={titulo}
    aria-pressed={activo}
    className={`group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition cursor-pointer ${
      activo
        ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
        : 'border-slate-700/80 bg-slate-900/80 text-slate-300 hover:border-slate-500 hover:text-white'
    }`}
  >
    {children}
    <span className="pointer-events-none absolute right-full mr-2 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-slate-200 opacity-0 shadow-lg transition group-hover:opacity-100 sm:block">
      {titulo}
    </span>
  </button>
)

const Separador = () => <span className="mx-0.5 h-px w-6 shrink-0 self-center bg-slate-700 max-sm:h-6 max-sm:w-px" />

/** Controles de cámara y capas de la escena. */
export const FloorNavigation: React.FC<FloorNavigationProps> = p => (
  <nav className="flex gap-1.5 overflow-x-auto rounded-xl border border-slate-700/70 bg-slate-950/95 p-1.5 shadow-2xl sm:flex-col">
    <Boton titulo="Restablecer cámara" onClick={p.onReiniciar}><RotateCcw className="h-4 w-4" /></Boton>
    <Boton titulo="Vista 3D" activo={p.vista === '3d'} onClick={() => p.onVista('3d')}><Box className="h-4 w-4" /></Boton>
    <Boton titulo="Vista superior (plano)" activo={p.vista === 'superior'} onClick={() => p.onVista('superior')}><Map className="h-4 w-4" /></Boton>
    <Separador />
    <Boton titulo="Acercar" onClick={p.onAcercar}><ZoomIn className="h-4 w-4" /></Boton>
    <Boton titulo="Alejar" onClick={p.onAlejar}><ZoomOut className="h-4 w-4" /></Boton>
    <Separador />
    <Boton titulo={p.mostrarNombres ? 'Ocultar nombres' : 'Mostrar nombres'} activo={p.mostrarNombres} onClick={p.onNombres}><Tag className="h-4 w-4" /></Boton>
    <Boton titulo={p.murosVisibles ? 'Ocultar paredes' : 'Mostrar paredes'} activo={p.murosVisibles} onClick={p.onMuros}><Layers className="h-4 w-4" /></Boton>
    <Boton titulo={p.mostrarPersonas ? 'Ocultar personas' : 'Mostrar personas'} activo={p.mostrarPersonas} onClick={p.onPersonas}><UsersRound className="h-4 w-4" /></Boton>
    <Separador />
    <Boton titulo="Listado de salas" onClick={p.onLista}><List className="h-4 w-4" /></Boton>
    <Boton titulo="Mis reservas" onClick={p.onReservas}><CalendarCheck className="h-4 w-4" /></Boton>
  </nav>
)
