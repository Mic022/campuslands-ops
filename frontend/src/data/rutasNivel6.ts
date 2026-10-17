/**
 * Red de circulación del Nivel 6 para los personajes del gemelo 3D.
 *
 * Son puntos de paso en las zonas comunes (pasillos, lobby, coworking, cafetería) unidos por
 * tramos rectos que no atraviesan muros, núcleos ni salas. Las salas solo se alcanzan por su
 * puerta y únicamente cuando tienen una reserva activa (ver scenes/torre-zenith/personas).
 *
 * Coordenadas en PÍXELES del plano, como el resto de data/torreZenithNivel6.ts.
 */
import { P } from './torreZenithNivel6'

export const NODOS: Record<string, P> = {
  // Ala oeste: plazoleta frente a Spooki/Artemis/Apolo y pasillo central
  oeste: [198, 332],
  oeste2: [268, 340],
  oeste3: [338, 340],
  // Lobby de ascensores (punto de llegada) y franja central
  ascensor: [418, 302],
  lobby1: [384, 324],
  lobby2: [465, 324],
  lobby3: [552, 324],
  lobby4: [650, 322],
  // Franja norte del lobby (barra de fachada), por el hueco entre ascensores y escalera
  norte1: [465, 226],
  norte0: [404, 225],
  norte2: [536, 225],
  // Coworking: franja de escritorios y pasos entre las mesas hexagonales
  cw0: [662, 286],
  cw1: [712, 277],   // entre los escritorios y la jardinera
  cw2: [812, 280],
  pasoCentro: [812, 320], // hueco entre mesas hexagonales
  este05: [812, 352],
  pasoAzul: [860, 310],
  pasoAzul2: [859, 344],
  pasoBlanca: [905, 304],
  // Pasillo este-oeste del coworking
  este0: [764, 352],
  este1: [859, 352],
  este2: [906, 352],
  este3: [990, 352],
  este4: [1052, 356],
  // Frente del auditorio y cafetería
  auditorio: [956, 300],
  cafe0: [1029, 318],
  cafe1: [1029, 266],
  cafe2: [1080, 262],
  cafe3: [988, 266],
  // Bajada junto a Cosmos hacia Sala Verde
  verde0: [753, 440],
  verde1: [698, 452],
  verde2: [670, 466], // pasillo entre la zona de estudio y la Sala Verde
  verde3: [670, 540],
  // Pasillo hacia el sur del coworking
  sur0: [904, 450],
  sur1: [904, 530],
  sur2: [904, 576],
  sur3: [820, 578],
  sur4: [962, 586]
}

export const ARISTAS: [string, string][] = [
  ['oeste', 'oeste2'], ['oeste2', 'oeste3'], ['oeste3', 'lobby1'],
  ['lobby1', 'ascensor'], ['ascensor', 'lobby2'], ['lobby1', 'lobby2'], ['lobby2', 'lobby3'], ['lobby3', 'lobby4'],
  ['lobby2', 'norte1'], ['norte1', 'norte0'], ['norte1', 'norte2'],
  ['lobby4', 'cw0'], ['cw0', 'cw1'], ['cw1', 'cw2'], ['cw2', 'pasoCentro'], ['pasoCentro', 'este05'],
  ['cw2', 'pasoAzul'], ['pasoAzul', 'pasoAzul2'], ['pasoAzul2', 'este1'],
  ['este0', 'este05'], ['este05', 'este1'], ['este1', 'este2'], ['este2', 'este3'], ['este3', 'este4'],
  ['pasoBlanca', 'este2'],
  ['este3', 'auditorio'], ['este3', 'cafe0'], ['cafe0', 'cafe1'], ['cafe1', 'cafe2'], ['cafe1', 'cafe3'], ['cafe3', 'auditorio'],
  ['este0', 'verde0'], ['verde0', 'verde1'], ['verde1', 'verde2'], ['verde2', 'verde3'],
  ['este2', 'sur0'], ['sur0', 'sur1'], ['sur1', 'sur2'], ['sur2', 'sur3'], ['sur2', 'sur4']
]

/** Dónde aparecen y desaparecen las personas que llegan a una reserva (salida de ascensores). */
export const NODO_LLEGADA = 'ascensor'
