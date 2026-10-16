import React, { useState, useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Center, Text, Sparkles, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { Espacio, Incidencia } from '../types/domain'
import { RoomMesh } from './RoomMesh'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { 
  RotateCcw, 
  Eye, 
  AlertTriangle, 
  Users, 
  Calendar,
  Layers,
  Sparkles as SparklesIcon,
  Compass,
  Radio
} from 'lucide-react'

// Componente de Radar / Escáner Holográfico que barre el suelo del campus
function HolographicRadar() {
  const radarRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (radarRef.current) {
      radarRef.current.rotation.y = state.clock.elapsedTime * 0.5
    }
  })

  return (
    <group ref={radarRef} position={[0, -0.08, 0]}>
      {/* Anillo de escaneo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1, 14, 64]} />
        <meshBasicMaterial
          color="#00F5FF"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Haz direccional de escaneo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 14, 32, 1, 0, Math.PI / 4]} />
        <meshBasicMaterial
          color="#9D4EDD"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

interface CampusScene3DProps {
  espacios: Espacio[]
  incidencias: Incidencia[]
  onSelectEspacio: (espacio: Espacio) => void
  onReservarEspacio: (espacio: Espacio) => void
  onSwitchTo2D: () => void
}

export const CampusScene3D: React.FC<CampusScene3DProps> = ({
  espacios,
  incidencias,
  onSelectEspacio,
  onReservarEspacio,
  onSwitchTo2D
}) => {
  const [selectedEspacio, setSelectedEspacio] = useState<Espacio | null>(espacios[0] || null)
  const [filtroPiso, setFiltroPiso] = useState<number | 'todos'>('todos')
  const [cameraKey, setCameraKey] = useState(0)

  const espaciosFiltrados = espacios.filter(e => 
    filtroPiso === 'todos' ? true : e.piso === filtroPiso
  )

  const incidenciaActiva = selectedEspacio?.incidenciaActivaId
    ? incidencias.find(i => i.id === selectedEspacio.incidenciaActivaId)
    : null

  const handleResetCamera = () => {
    setCameraKey(prev => prev + 1)
  }

  return (
    <div className="relative w-full h-[640px] rounded-3xl overflow-hidden holo-panel border border-white/10 shadow-2xl bg-gradient-to-b from-[#02050E] via-[#060B1C] to-[#02050E]">
      {/* Canvas 3D R3F con Estrellas y Partículas */}
      <Suspense fallback={
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-cyan-400">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin glow-cyan" />
          <span className="text-xs font-mono tracking-widest uppercase">Inicializando Gemelo Digital Holográfico...</span>
        </div>
      }>
        <Canvas
          shadows
          camera={{ position: [0, 10, 14], fov: 40 }}
          key={cameraKey}
        >
          {/* Estrellas de fondo profundo */}
          <Stars radius={45} depth={25} count={1400} factor={4} saturation={1} fade speed={1.2} />

          {/* Partículas 3D flotantes luminosas */}
          <Sparkles count={120} scale={[24, 10, 24]} size={2.5} speed={0.4} color="#00F5FF" />
          <Sparkles count={80} scale={[20, 8, 20]} size={2} speed={0.3} color="#9D4EDD" />

          {/* Iluminación Dual Neón */}
          <ambientLight intensity={0.45} />
          <directionalLight
            position={[10, 16, 10]}
            intensity={1.4}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[-10, 8, -8]} intensity={1.8} color="#00F5FF" distance={25} />
          <pointLight position={[10, 8, 8]} intensity={1.8} color="#FF007A" distance={25} />
          <pointLight position={[0, 12, 0]} intensity={1.0} color="#9D4EDD" distance={20} />

          {/* Controles orbitales con inercia */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={4}
            maxDistance={22}
            maxPolarAngle={Math.PI / 2.15}
            dampingFactor={0.06}
          />

          <Center>
            <group>
              {/* Placa Holográfica Piso 1 (y = 0) */}
              <mesh position={[0.5, -0.06, -0.5]} receiveShadow>
                <boxGeometry args={[14, 0.1, 7.5]} />
                <meshPhysicalMaterial
                  color="#070E22"
                  roughness={0.2}
                  metalness={0.8}
                  transparent
                  opacity={0.85}
                  clearcoat={0.5}
                />
              </mesh>

              {/* Borde exterior de la placa */}
              <lineSegments position={[0.5, -0.06, -0.5]}>
                <edgesGeometry args={[new THREE.BoxGeometry(14, 0.1, 7.5)]} />
                <lineBasicMaterial color="#00F5FF" transparent opacity={0.4} />
              </lineSegments>

              {/* Placa Piso 2 (y = 1.6) */}
              {(filtroPiso === 'todos' || filtroPiso === 2) && (
                <group position={[0.5, 1.55, 0.5]}>
                  <mesh receiveShadow>
                    <boxGeometry args={[12.5, 0.08, 6]} />
                    <meshPhysicalMaterial
                      color="#0C1533"
                      roughness={0.3}
                      metalness={0.8}
                      transparent
                      opacity={0.65}
                      clearcoat={0.4}
                    />
                  </mesh>
                  <lineSegments>
                    <edgesGeometry args={[new THREE.BoxGeometry(12.5, 0.08, 6)]} />
                    <lineBasicMaterial color="#9D4EDD" transparent opacity={0.5} />
                  </lineSegments>
                </group>
              )}

              {/* Salas 3D */}
              {espaciosFiltrados.map(esp => (
                <RoomMesh
                  key={esp.id}
                  espacio={esp}
                  isSelected={selectedEspacio?.id === esp.id}
                  onSelect={(e) => {
                    setSelectedEspacio(e)
                    onSelectEspacio(e)
                  }}
                />
              ))}

              {/* Radar en el suelo */}
              <HolographicRadar />

              {/* Rótulo 3D Flotante */}
              <Text
                position={[0, -0.3, 4.2]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.48}
                color="#00F5FF"
                anchorX="center"
                anchorY="middle"
              >
                CAMPUSLANDS CORE TWIN · REALTIME TELEMETRY
              </Text>
            </group>
          </Center>

          {/* Cuadrícula Holográfica en el Suelo */}
          <Grid
            position={[0, -0.2, 0]}
            args={[28, 28]}
            cellSize={0.7}
            cellThickness={0.9}
            cellColor="#101D42"
            sectionSize={3.5}
            sectionThickness={1.4}
            sectionColor="#00F5FF"
            fadeDistance={26}
            fadeStrength={1.8}
          />
        </Canvas>
      </Suspense>

      {/* Controles Superiores Flotantes */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto holo-panel p-1.5 rounded-2xl border border-white/10 shadow-xl">
          <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 px-2 py-1">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>NIVEL:</span>
          </div>
          {(['todos', 1, 2] as const).map(piso => (
            <button
              key={piso}
              onClick={() => setFiltroPiso(piso)}
              className={`px-3.5 py-1 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                filtroPiso === piso
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-lg shadow-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {piso === 'todos' ? 'Todo el Hub' : `Piso 0${piso}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleResetCamera}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-mono bg-slate-900/80 backdrop-blur-md border border-white/10 text-slate-200 hover:text-cyan-400 hover:border-cyan-500/40 transition-all shadow-xl cursor-pointer"
            title="Restablecer posición de cámara"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Centrar Perspectiva</span>
          </button>

          <button
            onClick={onSwitchTo2D}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-mono bg-slate-900/80 backdrop-blur-md border border-white/10 text-slate-200 hover:text-purple-400 hover:border-purple-500/40 transition-all shadow-xl cursor-pointer"
            title="Conmutar a vista esquemática 2D"
          >
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            <span>Modo 2D Ligero</span>
          </button>
        </div>
      </div>

      {/* Tarjeta de Inspección Flotante del Espacio */}
      {selectedEspacio && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md pointer-events-auto">
          <div className="holo-panel border border-cyan-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl bg-gradient-to-br from-slate-950/95 via-[#0A1024]/95 to-slate-950/95">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded-lg">
                    {selectedEspacio.id} · PISO {selectedEspacio.piso}
                  </span>
                  <Badge
                    label={selectedEspacio.estado}
                    variant={
                      selectedEspacio.estado === 'disponible' 
                        ? 'emerald' 
                        : selectedEspacio.estado === 'mantenimiento' 
                        ? 'amber' 
                        : 'rose'
                    }
                    size="sm"
                  />
                </div>
                <h4 className="text-lg font-black text-white mt-1.5 tracking-tight">
                  {selectedEspacio.nombre}
                </h4>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Capacidad</span>
                <p className="text-2xl font-mono font-black text-cyan-400 glow-cyan">
                  {selectedEspacio.capacidad} <span className="text-xs font-normal text-slate-400">pax</span>
                </p>
              </div>
            </div>

            {/* Alerta RN-04 si está inhabilitado */}
            {incidenciaActiva && (
              <div className="mt-3 p-3 rounded-2xl bg-rose-950/80 border border-rose-500/60 flex items-start gap-2.5 text-xs text-rose-200 shadow-lg shadow-rose-950/50">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold text-rose-300 uppercase tracking-wide">
                    RN-04: Acceso Restringido por {incidenciaActiva.codigo}
                  </strong>
                  <p className="text-[11px] text-rose-200/90 mt-0.5">
                    {incidenciaActiva.titulo} · Prioridad: {(incidenciaActiva.prioridad || 'abierta').toUpperCase()}
                  </p>
                </div>
              </div>
            )}

            {/* Equipamiento Instalado */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(selectedEspacio.equipamiento || []).map((item, idx) => (
                <span
                  key={idx}
                  className="text-[11px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl text-slate-300"
                >
                  {item}
                </span>
              ))}
            </div>

            {/* Acciones */}
            <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-white/10">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                Haz click en las salas 3D
              </span>
              <Button
                variant={selectedEspacio.estado === 'disponible' ? 'cyan' : 'outline'}
                size="sm"
                icon={<Calendar className="w-3.5 h-3.5" />}
                onClick={() => onReservarEspacio(selectedEspacio)}
              >
                {selectedEspacio.estado === 'disponible' ? 'Reservar Espacio' : 'Ver Detalles'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Leyenda Holográfica Inferior Derecha */}
      <div className="hidden lg:flex absolute bottom-4 right-4 flex-col gap-2 holo-panel p-3.5 rounded-2xl border border-white/10 text-xs font-mono text-slate-300">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Estado Holográfico</span>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00FF9D] shadow-[0_0_10px_#00FF9D]" />
          <span>Operativo / Disponible</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFB703] shadow-[0_0_10px_#FFB703]" />
          <span>Mantenimiento Preventivo</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF2A55] shadow-[0_0_12px_#FF2A55]" />
          <span>Falla Crítica / Bloqueado (RN-04)</span>
        </div>
      </div>
    </div>
  )
}
