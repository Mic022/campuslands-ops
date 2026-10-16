import * as THREE from 'three'
import { EstadoVisual } from '../../types/torreZenith'

export const COLOR_ESTADO: Record<EstadoVisual, string> = {
  disponible: '#22C55E',
  reservada: '#FACC15',
  mantenimiento: '#EF4444',
  desconocido: '#94A3B8'
}

let baldosa: THREE.CanvasTexture | null = null

/** Textura procedural de baldosa (60 cm) que se multiplica por el color de cada piso. */
export function texturaBaldosa(): THREE.CanvasTexture {
  if (baldosa) return baldosa
  const lado = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = lado
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#d9dee6'
  ctx.fillRect(0, 0, lado, lado)
  // Variación sutil para que el piso no se vea plano.
  for (let i = 0; i < 900; i++) {
    const g = 205 + Math.floor(Math.random() * 30)
    ctx.fillStyle = `rgba(${g},${g + 3},${g + 8},0.25)`
    ctx.fillRect(Math.random() * lado, Math.random() * lado, 2, 2)
  }
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, lado - 3, lado - 3)
  baldosa = new THREE.CanvasTexture(canvas)
  baldosa.wrapS = baldosa.wrapT = THREE.RepeatWrapping
  // Las UV de ShapeGeometry están en unidades de escena; 1 baldosa = 0,6 m ≈ 0,35 u.
  baldosa.repeat.set(1 / 0.35, 1 / 0.35)
  baldosa.colorSpace = THREE.SRGBColorSpace
  baldosa.anisotropy = 4
  return baldosa
}

/** Forma 2D (plano XY) de un polígono en coordenadas de escena [x, z]. */
export function formaDe(poli: [number, number][]): THREE.Shape {
  const s = new THREE.Shape()
  poli.forEach(([x, z], i) => (i === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z)))
  s.closePath()
  return s
}
