"""Quién puede hacer qué. Fuente única: una dependencia global aplica esta tabla a todas las rutas.

Las rutas se escriben como en los routers (plantilla de FastAPI). Lo que no está en
PUBLICAS ni en SOLO_ADMIN lo puede usar cualquier usuario autenticado.
"""

ROL_ADMIN = "admin"
ROL_USUARIO = "usuario"
ROLES = {ROL_ADMIN, ROL_USUARIO}

# Sin iniciar sesión.
PUBLICAS = {
    ("GET", "/api/health"),
    ("POST", "/api/auth/login"),
    ("GET", "/api/catalogos"),
    ("GET", "/api/reglas"),
}

# Solo administradores.
SOLO_ADMIN = {
    ("POST", "/api/espacios"),
    ("PATCH", "/api/espacios/{espacio_id}"),
    ("POST", "/api/recursos"),
    ("PATCH", "/api/recursos/{recurso_id}"),
    ("PATCH", "/api/recursos/{recurso_id}/estado"),
    ("POST", "/api/prestamos/{prestamo_id}/devolucion"),
    ("PATCH", "/api/incidencias/{incidencia_id}"),
    ("GET", "/api/datos/reporte"),
    ("GET", "/api/auditoria"),
}

# Un usuario solo puede actuar a su propio nombre (el admin puede hacerlo por cualquiera):
#   crear reserva / préstamo → el 'solicitante' del cuerpo debe ser él
#   cancelar reserva         → la reserva debe ser suya
A_SU_NOMBRE = {("POST", "/api/reservas"), ("POST", "/api/prestamos")}
SOLO_PROPIAS = {("POST", "/api/reservas/{reserva_id}/cancelar")}
