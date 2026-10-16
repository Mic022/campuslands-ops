/**
 * Geometría 3D y metadatos de presentación visual para los espacios oficiales del campus.
 * (docs/integracion-frontend.md §1 y §3).
 *
 * Los datos operativos (nombre, tipo, aforo, aforoPermitido, estado) SIEMPRE provienen del backend.
 */

export interface EspacioLayout3D {
  piso: number
  coordenadas3D: [number, number, number]
  dimensiones3D: [number, number, number]
  colorTema?: string
}

export const LAYOUT_3D_ESPACIOS: Record<string, EspacioLayout3D> = {
  auditorio: {
    piso: 1,
    coordenadas3D: [-3.5, 0.6, -1.8],
    dimensiones3D: [4.0, 1.2, 3.2],
    colorTema: '#38BDF8'
  },
  cosmos: {
    piso: 1,
    coordenadas3D: [0.8, 0.6, -1.8],
    dimensiones3D: [3.2, 1.2, 2.6],
    colorTema: '#818CF8'
  },
  skylab: {
    piso: 1,
    coordenadas3D: [4.8, 0.6, -1.8],
    dimensiones3D: [3.0, 1.2, 2.6],
    colorTema: '#34D399'
  },
  spooki: {
    piso: 1,
    coordenadas3D: [-4.0, 0.6, 1.8],
    dimensiones3D: [2.5, 1.2, 2.0],
    colorTema: '#F472B6'
  },
  apolo: {
    piso: 1,
    coordenadas3D: [-1.2, 0.6, 1.8],
    dimensiones3D: [2.5, 1.2, 2.0],
    colorTema: '#FBBF24'
  },
  artemis: {
    piso: 1,
    coordenadas3D: [1.6, 0.6, 1.8],
    dimensiones3D: [2.5, 1.2, 2.0],
    colorTema: '#A78BFA'
  },
  blanca: {
    piso: 2,
    coordenadas3D: [-3.8, 2.2, -1.8],
    dimensiones3D: [2.2, 1.1, 2.0],
    colorTema: '#E2E8F0'
  },
  azul: {
    piso: 2,
    coordenadas3D: [-1.2, 2.2, -1.8],
    dimensiones3D: [2.2, 1.1, 2.0],
    colorTema: '#38BDF8'
  },
  'sala-verde-1': {
    piso: 2,
    coordenadas3D: [1.5, 2.2, -1.8],
    dimensiones3D: [2.0, 1.1, 1.8],
    colorTema: '#10B981'
  },
  'sala-verde-2': {
    piso: 2,
    coordenadas3D: [4.0, 2.2, -1.8],
    dimensiones3D: [2.0, 1.1, 1.8],
    colorTema: '#10B981'
  },
  'sala-amarilla-1': {
    piso: 2,
    coordenadas3D: [-2.5, 2.2, 1.8],
    dimensiones3D: [2.0, 1.1, 1.8],
    colorTema: '#FBBF24'
  },
  'sala-amarilla-2': {
    piso: 2,
    coordenadas3D: [1.5, 2.2, 1.8],
    dimensiones3D: [2.0, 1.1, 1.8],
    colorTema: '#FBBF24'
  }
}

export function obtenerLayout3D(id: string): EspacioLayout3D {
  return (
    LAYOUT_3D_ESPACIOS[id] || {
      piso: 1,
      coordenadas3D: [0, 0.6, 0],
      dimensiones3D: [2.5, 1.2, 2.2],
      colorTema: '#38BDF8'
    }
  )
}
