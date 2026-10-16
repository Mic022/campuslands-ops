"""Catálogo de las diez salas reservables del Nivel 6 de Torre Zenith.

Fuente única de nombres, capacidades, colores (leyenda del plano) y equipamiento.
La geometría 3D vive en el frontend (frontend/src/features/torre-zenith/nivel6.ts)
y se enlaza con estas salas por su `id`, que no debe cambiar.
"""

TORRE = "Torre Zenith"
NIVEL = 6
AREA_M2 = 2560

SALAS_NIVEL6: list[dict] = [
    {
        "id": "sala-verde",
        "nombre": "Sala Verde",
        "tipo": "cabinas",
        "capacidad": 6,
        "color": "#3DD13D",
        "descripcion": "Tres cabinas de concentración junto a la escalera interna, para llamadas, "
                       "entrevistas y trabajo en pareja.",
        "equipamiento": ["3 cabinas acústicas", "Monitor 24\"", "Puertos USB-C", "Iluminación regulable"],
    },
    {
        "id": "sala-amarilla",
        "nombre": "Sala Amarilla",
        "tipo": "cabinas",
        "capacidad": 2,
        "color": "#F5D90A",
        "descripcion": "Dos cabinas individuales frente al área de coworking, ideales para videollamadas.",
        "equipamiento": ["2 cabinas acústicas", "Cámara web HD", "Diadema con micrófono"],
    },
    {
        "id": "auditorio",
        "nombre": "Auditorio",
        "tipo": "auditorio",
        "capacidad": 60,
        "color": "#4F7A3A",
        "descripcion": "Espacio amplio en la fachada curva para presentaciones, conferencias, "
                       "demo days y reuniones generales.",
        "equipamiento": ["Escenario", "Proyector láser", "Pantalla 150\"", "Sonido envolvente",
                         "Micrófonos inalámbricos", "Transmisión en vivo"],
    },
    {
        "id": "sala-azul",
        "nombre": "Sala Azul",
        "tipo": "cabinas",
        "capacidad": 2,
        "color": "#2F6FE4",
        "descripcion": "Cabina privada junto al auditorio para reuniones uno a uno.",
        "equipamiento": ["Pantalla 32\"", "Cámara web HD", "Pizarra de vidrio"],
    },
    {
        "id": "sala-blanca",
        "nombre": "Sala Blanca",
        "tipo": "reuniones",
        "capacidad": 6,
        "color": "#F1F5F9",
        "descripcion": "Nueva sala de reuniones con acabados blancos, contigua a la Sala Azul.",
        "equipamiento": ["Mesa para 6", "Pantalla 55\"", "Sistema de videoconferencia", "Pizarra blanca"],
    },
    {
        "id": "skylab",
        "nombre": "Skylab",
        "tipo": "aula",
        "capacidad": 20,
        "color": "#B4475C",
        "descripcion": "Laboratorio de formación del ala oeste para talleres prácticos.",
        "equipamiento": ["Proyector", "Pantalla 75\"", "Tomas en cada puesto", "Aire acondicionado"],
    },
    {
        "id": "salon-cosmos",
        "nombre": "Salón Cosmos",
        "tipo": "reuniones",
        "capacidad": 12,
        "color": "#86C77A",
        "descripcion": "Sala de juntas central con mesa de conferencias junto al núcleo de servicios.",
        "equipamiento": ["Mesa de juntas para 12", "Pantalla 86\"", "Videoconferencia", "Pizarra"],
    },
    {
        "id": "salon-artemis",
        "nombre": "Salón Artemis",
        "tipo": "aula",
        "capacidad": 32,
        "color": "#F2B35E",
        "descripcion": "Aula de formación del ala oeste con filas curvas de escritorios.",
        "equipamiento": ["Proyector", "Pantalla 86\"", "Sonido", "Tomas en cada puesto"],
    },
    {
        "id": "salon-apolo",
        "nombre": "Salón Apolo",
        "tipo": "aula",
        "capacidad": 30,
        "color": "#6EC6E6",
        "descripcion": "Aula de formación del ala oeste con filas curvas de escritorios.",
        "equipamiento": ["Proyector", "Pantalla 86\"", "Sonido", "Tomas en cada puesto"],
    },
    {
        "id": "salon-sputnik",
        "nombre": "Salón Sputnik",
        "tipo": "aula",
        "capacidad": 30,
        "color": "#C79BEA",
        "descripcion": "Aula de formación en la esquina noroeste con filas curvas de escritorios.",
        "equipamiento": ["Proyector", "Pantalla 86\"", "Sonido", "Tomas en cada puesto"],
    },
]
