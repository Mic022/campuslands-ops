import React, { useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Center, Text } from '@react-three/drei'
import { Espacio, Incidencia } from '../types/domain'
import { RoomMesh } from './RoomMesh'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { 
  Building2, 
  RotateCcw, 
  Eye, 
  AlertTriangle, 
  Users, 
  Cpu, 
  MapPin, 
  Calendar,
  Layers
} from 'lucide-react'

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
    <div className="relative w-full h-[620px] rounded-2xl overflow-hidden glass-panel border border-slate-800/80 shadow-2xl bg-gradient-to-b from-slate-950 via-[#0B0F19] to-slate-950">
      {/* 3D Canvas R3F */}
      <Suspense fallback={
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-cyan-400">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Renderizando Gemelo Digital 3D...</span>
        </div>
      }>
        <Canvas
          shadows
          camera={{ position: [0, 9, 13], fov: 42 }}
          key={cameraKey}
        >
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[8, 14, 8]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[-8, 10, -6]} intensity={0.5} color="#00F2FE" />
          <pointLight position={[8, 10, 6]} intensity={0.5} color="#8B5CF6" />

          {/* OrbitControls con restricciones ergonómicas */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={22}
            maxPolarAngle={Math.PI / 2.1}
            dampingFactor={0.05}
          />

          <Center>
            <group>
              {/* Placa Piso 1 (y = 0) */}
              <mesh position={[0.5, -0.05, -0.5]} receiveShadow>
                <boxGeometry args={[13.5, 0.1, 7]} />
                <meshStandardMaterial
                  color="#0F172A"
                  roughness={0.6}
                  metalness={0.3}
                  transparent
                  opacity={0.8}
                />
              </mesh>

              {/* Placa Piso 2 (y = 1.6) */}
              {(filtroPiso === 'todos' || filtroPiso === 2) && (
                <mesh position={[0.5, 1.55, 0.5]} receiveShadow>
                  <boxGeometry args={[12, 0.08, 5.5]} />
                  <meshStandardMaterial
                    color="#162032"
                    roughness={0.5}
                    metalness={0.4}
                    transparent
                    opacity={0.6}
                  />
                </mesh>
              )}

              {/* Mallas de cada espacio */}
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

              {/* Rótulo 3D del Campus */}
              <Text
                position={[0, -0.3, 3.8]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.45}
                color="#38BDF8"
                anchorX="center"
                anchorY="middle"
              >
                CAMPUSLANDS CORE FACILITY · 3D TWIN
              </Text>
            </group>
          </Center>

          {/* Cuadrícula estética en el suelo */}
          <Grid
            position={[0, -0.2, 0]}
            args={[24, 24]}
            cellSize={0.6}
            cellThickness={0.8}
            cellColor="#1E293B"
            sectionSize={3}
            sectionThickness={1.2}
            sectionColor="#0284C7"
            fadeDistance={24}
            fadeStrength={1.5}
          />
        </Canvas>
      </Suspense>

      {/* Controles de Vista y Filtros Superiores */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 shadow-lg">
          <div className="flex items-center gap-1 text-xs font-mono text-slate-400 px-2 py-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>NIVEL:</span>
          </div>
          {(['todos', 1, 2] as const).map(piso => (
            <button
              key={piso}
              onClick={() => setFiltroPiso(piso)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filtroPiso === piso
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {piso === 'todos' ? 'Campus Completo' : `Piso ${piso}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleResetCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-200 hover:text-white hover:bg-slate-800 transition-colors shadow-lg cursor-pointer"
            title="Centrar perspectiva isométrica"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Reset Cámara</span>
          </button>

          <button
            onClick={onSwitchTo2D}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-200 hover:text-white hover:bg-slate-800 transition-colors shadow-lg cursor-pointer"
            title="Ver plano esquemático 2D plano"
          >
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            <span>Ver Modo 2D</span>
          </button>
        </div>
      </div>

      {/* Tarjeta de Inspección Flotante del Espacio Seleccionado */}
      {selectedEspacio && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md pointer-events-auto">
          <div className="glass-panel border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase bg-slate-800 px-2 py-0.5 rounded text-cyan-400">
                    {selectedEspacio.id} · Piso {selectedEspacio.piso}
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
                <h4 className="text-base font-bold text-white mt-1.5">
                  {selectedEspacio.nombre}
                </h4>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400">Aforo Máximo</span>
                <p className="text-lg font-mono font-bold text-cyan-400">
                  {selectedEspacio.capacidad} <span className="text-xs font-normal text-slate-400">pax</span>
                </p>
              </div>
            </div>

            {/* Alerta si el espacio está inhabilitado por RN-04 */}
            {incidenciaActiva && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 flex items-start gap-2.5 text-xs text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold text-rose-300">
                    RN-04: Espacio Bloqueado por Incidencia [{incidenciaActiva.codigo}]
                  </strong>
                  <p className="text-[11px] text-rose-300/90 mt-0.5">
                    {incidenciaActiva.titulo} · Prioridad: {incidenciaActiva.prioridad.toUpperCase()}
                  </p>
                </div>
              </div>
            )}

            {/* Equipamiento instalado */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedEspacio.equipamiento.map((item, idx) => (
                <span
                  key={idx}
                  className="text-[11px] bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded text-slate-300"
                >
                  {item}
                </span>
              ))}
            </div>

            {/* Acciones */}
            <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Haz click en cualquier módulo 3D
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

      {/* Leyenda 3D Inferior Derecha */}
      <div className="hidden lg:flex absolute bottom-4 right-4 flex-col gap-1.5 bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300">
        <span className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Convención 3D</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
          <span>Disponible para reserva</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B]" />
          <span>Mantenimiento operativo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#EF4444]" />
          <span>Inhabilitado / Falla crítica (RN-04)</span>
        </div>
      </div>
    </div>
  )
}
