import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ThreeEvent, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ALTURA_MURO, GeometriaSala } from '../../data/torreZenithNivel6'
import { EstadoVisual, SalaId } from '../../types/torreZenith'
import { amueblar, aMundoPoli, centroide, muros } from './geometria'
import { COLOR_ESTADO, formaDe, texturaBaldosa } from './materiales'
import { RoomFurniture } from './RoomFurniture'
import { RoomLabel } from './RoomLabel'
import { RoomWalls } from './RoomWalls'

interface Room3DProps {
  geo: GeometriaSala
  nombre: string
  estado: EstadoVisual
  seleccionada: boolean
  mostrarNombre: boolean
  murosVisibles: boolean
  onSeleccionar: (id: SalaId) => void
}

const BLANCO_MURO = new THREE.Color('#E6EAF0')

/** Una sala reservable: piso de color, muros con puertas, mobiliario, etiqueta y animaciones. */
export const Room3D: React.FC<Room3DProps> = ({
  geo,
  nombre,
  estado,
  seleccionada,
  mostrarNombre,
  murosVisibles,
  onSeleccionar
}) => {
  const [hover, setHover] = useState(false)
  const pulso = useRef(0)
  const barrido = useRef<THREE.LineLoop>(null)

  const datos = useMemo(() => {
    const poli = aMundoPoli(geo.poligono)
    const { tramos, vanos } = muros(poli, geo.puertas, geo.ladosFachada)
    // Sobre el piso blanco de la Sala Blanca las sillas van en gris para que se distingan.
    const colorSillas = geo.color.toUpperCase() === '#F1F5F9' ? '#64748B' : geo.color
    const { muebles, mamparas } = amueblar(poli, vanos, geo.distribucion, geo.capacidad, colorSillas)
    const piso = new THREE.ShapeGeometry(formaDe(poli))
    const contorno = new THREE.BufferGeometry().setFromPoints(poli.map(([x, z]) => new THREE.Vector3(x, 0, z)))
    return { poli, tramos, vanos, muebles, mamparas, piso, contorno, centro: centroide(poli) }
  }, [geo])

  const color = useMemo(() => new THREE.Color(geo.color), [geo.color])
  const esBlanca = geo.color.toUpperCase() === '#F1F5F9'

  const mats = useMemo(
    () => ({
      piso: new THREE.MeshStandardMaterial({
        color: geo.color, map: texturaBaldosa(), roughness: 0.65, emissive: geo.color, emissiveIntensity: 0.06
      }),
      muro: new THREE.MeshStandardMaterial({ color: BLANCO_MURO.clone(), roughness: 0.85 }),
      acento: new THREE.MeshStandardMaterial({
        color: esBlanca ? '#CBD5E1' : geo.color, emissive: geo.color, emissiveIntensity: esBlanca ? 0.05 : 0.35
      }),
      led: new THREE.MeshBasicMaterial({ color: COLOR_ESTADO.desconocido, toneMapped: false }),
      vidrio: new THREE.MeshPhysicalMaterial({
        color: esBlanca ? '#E2E8F0' : geo.color, transparent: true, opacity: 0.32, roughness: 0.1, depthWrite: false
      }),
      borde: new THREE.LineBasicMaterial({ color: esBlanca ? '#94A3B8' : geo.color, transparent: true, opacity: 0.9 }),
      barrido: new THREE.LineBasicMaterial({ color: '#67E8F9', transparent: true, opacity: 0, toneMapped: false })
    }),
    [geo.color, esBlanca]
  )

  useEffect(() => {
    if (seleccionada) pulso.current = 1
  }, [seleccionada])

  useEffect(() => () => {
    document.body.style.cursor = 'auto'
  }, [])

  const colorLed = useMemo(() => new THREE.Color(COLOR_ESTADO[estado]), [estado])
  const objetivoMuro = useMemo(() => BLANCO_MURO.clone().lerp(color, esBlanca ? 0 : 0.35), [color, esBlanca])

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-dt * 6)
    pulso.current = Math.max(0, pulso.current - dt * 0.9)

    // Piso: brillo según cursor / selección + destello breve al seleccionar.
    const respiracion = seleccionada ? 0.1 * (1 + Math.sin(state.clock.elapsedTime * 3)) : 0
    const base = seleccionada ? 0.32 : hover ? 0.24 : 0.06
    const objetivo = base + respiracion + pulso.current * 0.6
    mats.piso.emissiveIntensity += (objetivo - mats.piso.emissiveIntensity) * k

    mats.muro.color.lerp(seleccionada || hover ? objetivoMuro : BLANCO_MURO, k)
    mats.led.color.lerp(colorLed, k)

    // Barrido: un contorno que sube del piso a la corona del muro tras seleccionar.
    if (barrido.current) {
      const t = 1 - pulso.current
      barrido.current.position.y = 0.03 + t * ALTURA_MURO
      mats.barrido.opacity = pulso.current > 0 ? Math.sin(Math.PI * t) : 0
    }
  })

  const seleccionar = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return // fue un arrastre de cámara, no un clic
    e.stopPropagation()
    onSeleccionar(geo.id)
  }

  return (
    <group
      onClick={seleccionar}
      onPointerOver={e => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = 'auto'
      }}
    >
      <mesh geometry={datos.piso} material={mats.piso} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow />
      <lineLoop geometry={datos.contorno} material={mats.borde} position={[0, 0.02, 0]} />
      <lineLoop ref={barrido} geometry={datos.contorno} material={mats.barrido} />

      <RoomWalls
        tramos={datos.tramos}
        vanos={datos.vanos}
        mamparas={datos.mamparas}
        materialMuro={mats.muro}
        materialAcento={mats.acento}
        materialLed={mats.led}
        materialVidrio={mats.vidrio}
        visibles={murosVisibles}
        abiertas={hover || seleccionada}
      />
      <RoomFurniture muebles={datos.muebles} />

      {(mostrarNombre || hover || seleccionada) && (
        <RoomLabel
          posicion={[datos.centro[0], 0.3, datos.centro[1] + (geo.desplazarEtiqueta ?? 0)]}
          nombre={nombre}
          color={geo.color}
          estado={estado}
          seleccionada={seleccionada}
          resaltada={hover}
          onClick={() => onSeleccionar(geo.id)}
        />
      )}
    </group>
  )
}
