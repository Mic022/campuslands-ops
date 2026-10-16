import React from 'react'
import { Html } from '@react-three/drei'
import { EstadoVisual } from '../../types/torreZenith'
import { COLOR_ESTADO } from './materiales'

export const ETIQUETA_ESTADO: Record<EstadoVisual, string> = {
  disponible: 'Disponible',
  reservada: 'Reservada',
  mantenimiento: 'Mantenimiento',
  desconocido: 'Sin datos'
}

interface RoomLabelProps {
  posicion: [number, number, number]
  nombre: string
  color: string
  estado: EstadoVisual
  seleccionada: boolean
  resaltada: boolean
  onClick: () => void
}

/** Etiqueta flotante discreta con el nombre y el indicador de estado, anclada al centro del piso de la sala. */
export const RoomLabel: React.FC<RoomLabelProps> = ({ posicion, nombre, color, estado, seleccionada, resaltada, onClick }) => {
  const ce = COLOR_ESTADO[estado]
  return (
    <Html position={posicion} center zIndexRange={[20, 0]}>
      <button
        type="button"
        onClick={onClick}
        className={`flex flex-col items-center transition-transform duration-200 cursor-pointer ${
          seleccionada ? 'scale-110' : resaltada ? 'scale-105' : ''
        }`}
      >
        <span
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-semibold text-white shadow-lg ${
            seleccionada ? 'border-cyan-300/80 bg-slate-900/90 shadow-cyan-500/30' : 'border-slate-600/70 bg-slate-900/90'
          }`}
        >
          <span className="h-2.5 w-2.5 rounded-sm ring-1 ring-white/40" style={{ background: color }} />
          {nombre}
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: ce, boxShadow: `0 0 8px ${ce}` }}
            title={ETIQUETA_ESTADO[estado]}
          />
        </span>
      </button>
    </Html>
  )
}
