"""Inicio de sesión, sesiones, registro, recuperación de contraseña y usuarios de prueba.

Principios:
- El rol sale siempre de la base de datos, nunca de lo que envía el navegador.
- Las respuestas no revelan si una cuenta existe (salvo a quien ya demostró conocer la clave).
- Claves y tokens nunca se guardan ni se registran en claro.
"""
import logging
import math
from datetime import timedelta

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.auth import correo
from app.auth.limitador import limitador
from app.auth.seguridad import (
    clave_aleatoria,
    hashear_clave,
    huella,
    incumplimientos,
    necesita_rehash,
    token_nuevo,
    verificar_clave,
)
from app.config import settings
from app.config.permisos import ROL_ADMIN, ROL_USUARIO
from app.models import Sesion, TokenRecuperacion, Usuario, ahora
from app.repositories import usuarios as repo
from app.repositories.auditoria import auditar
from app.rules.base import (
    DemasiadosIntentosError,
    NoAutenticadoError,
    PermisoError,
    ReglaNegocioError,
    ResultadoRegla,
)
from app.schemas.auth import RegistroEntrada

log = logging.getLogger("campus-ops.seguridad")

MENSAJE_CREDENCIALES = "Usuario o clave incorrectos."
MENSAJE_TOKEN_INVALIDO = "El enlace de recuperación no es válido o ya caducó. Solicita uno nuevo."
# La última actividad se refresca como mucho una vez por minuto: evita una escritura por petición.
REFRESCO_ACTIVIDAD = timedelta(seconds=60)


def _rechazo(codigo: str, mensaje: str) -> ReglaNegocioError:
    return ReglaNegocioError(ResultadoRegla(False, codigo, mensaje))


def _demasiados(prefijo: str, espera_s: float) -> DemasiadosIntentosError:
    minutos = max(1, math.ceil(espera_s / 60))
    return DemasiadosIntentosError(f"{prefijo} Intenta de nuevo en {minutos} min.", int(espera_s) + 1)


def exigir_clave_valida(clave: str, confirmacion: str | None, *datos_personales: str) -> None:
    """Confirmación y política de contraseñas; responde 409 con todos los requisitos incumplidos."""
    if confirmacion is not None and clave != confirmacion:
        raise _rechazo("AUTH-CLAVE", "Las contraseñas no coinciden.")
    errores = incumplimientos(clave, datos_personales)
    if errores:
        raise _rechazo("AUTH-CLAVE", " ".join(errores))


# ---------- Usuarios de prueba ----------

def sembrar_usuarios(db: Session) -> dict[str, str]:
    """Crea los usuarios de prueba que falten (solo fuera de producción).

    Devuelve las claves que tuvo que generar porque no estaban en .env; se muestran una sola vez
    en la consola local y nunca se guardan en claro.
    """
    generadas: dict[str, str] = {}
    if not settings.SEMBRAR_USUARIOS_DEMO:
        return generadas

    def asegurar(usuario: str, nombre: str, rol: str, clave: str) -> None:
        usuario = usuario.strip().lower()
        if db.get(Usuario, usuario):
            return
        if not clave:
            clave = clave_aleatoria()
            generadas[usuario] = clave
        db.add(Usuario(usuario=usuario, nombre=nombre, rol=rol, clave_hash=hashear_clave(clave)))
        auditar(db, "usuario", usuario, "crear", None, rol, "sistema", "usuario de prueba")

    asegurar(settings.ADMIN_USUARIO, "Administración", ROL_ADMIN, settings.ADMIN_CLAVE)
    for usuario in settings.USUARIOS_DEMO:
        asegurar(usuario, usuario.capitalize(), ROL_USUARIO, settings.USUARIO_CLAVE)
    db.commit()
    return generadas


# ---------- Inicio de sesión ----------

def _limites_login(identificador: str, ip: str | None) -> None:
    ventana = settings.LOGIN_BLOQUEO_MIN * 60
    espera = max(
        limitador.excedido(f"login:id:{identificador}", settings.LOGIN_MAX_INTENTOS, ventana),
        limitador.excedido(f"login:ip:{ip}", settings.LOGIN_MAX_POR_IP, ventana),
    )
    if espera:
        raise _demasiados("Demasiados intentos fallidos.", espera)


def _registrar_fallo(db: Session, usuario: Usuario | None, identificador: str, ip: str | None) -> None:
    # También se cuenta si la cuenta no existe: así el bloqueo no revela qué cuentas existen.
    limitador.registrar(f"login:id:{identificador}")
    limitador.registrar(f"login:ip:{ip}")
    if usuario is None:
        log.info("login fallido: cuenta inexistente ip=%s", ip)
        return
    usuario.intentos_fallidos = (usuario.intentos_fallidos or 0) + 1
    auditar(db, "usuario", usuario.usuario, "login_fallido", None, None, usuario.nombre,
            f"ip={ip} intento={usuario.intentos_fallidos}")
    if usuario.intentos_fallidos >= settings.LOGIN_MAX_INTENTOS:
        usuario.bloqueado_hasta = ahora() + timedelta(minutes=settings.LOGIN_BLOQUEO_MIN)
        usuario.intentos_fallidos = 0
        auditar(db, "usuario", usuario.usuario, "bloqueo_temporal", None, None, usuario.nombre, f"ip={ip}")
    db.add(usuario)
    db.commit()


def autenticar(db: Session, identificador: str, clave: str, ip: str | None = None) -> Usuario:
    """Valida usuario/correo y clave. Lanza 401 genérico, 403 si la cuenta está desactivada o 429."""
    identificador = identificador.strip().lower()
    _limites_login(identificador, ip)
    usuario = repo.por_identificador(db, identificador)

    # Bloqueo persistente de la cuenta: mismo mensaje y mismo coste que el limitador en memoria.
    if usuario and usuario.bloqueado_hasta and usuario.bloqueado_hasta > ahora():
        verificar_clave(clave, None)
        raise _demasiados("Demasiados intentos fallidos.", (usuario.bloqueado_hasta - ahora()).total_seconds())

    # Se verifica siempre contra algún hash para no revelar por el tiempo de respuesta si el usuario existe.
    if not verificar_clave(clave, usuario.clave_hash if usuario else None):
        _registrar_fallo(db, usuario, identificador, ip)
        raise NoAutenticadoError(MENSAJE_CREDENCIALES, "AUTH-CREDENCIALES")

    # Solo quien conoce la clave llega aquí: decirle que la cuenta está desactivada no filtra nada.
    if not usuario.activo:
        auditar(db, "usuario", usuario.usuario, "login_rechazado", None, None, usuario.nombre, f"cuenta desactivada ip={ip}")
        db.commit()
        raise PermisoError("Tu cuenta está desactivada. Contacta a un administrador.", "AUTH-CUENTA-INACTIVA")

    limitador.limpiar(f"login:id:{identificador}")
    usuario.intentos_fallidos = 0
    usuario.bloqueado_hasta = None
    if necesita_rehash(usuario.clave_hash):   # migra hashes PBKDF2 heredados a Argon2id
        usuario.clave_hash = hashear_clave(clave)
    return usuario


def iniciar_sesion(
    db: Session, identificador: str, clave: str, recordar: bool, ip: str | None
) -> tuple[Usuario, str, Sesion]:
    """Autentica y crea la sesión en el servidor. Devuelve (usuario, token para la cookie, sesión)."""
    usuario = autenticar(db, identificador, clave, ip)
    momento = ahora()
    usuario.ultimo_acceso = momento
    db.add(usuario)

    token = token_nuevo()
    vida = timedelta(days=settings.SESION_RECORDAR_DIAS) if recordar else timedelta(hours=settings.TOKEN_HORAS)
    sesion = Sesion(
        token_hash=huella(token),
        csrf_token=token_nuevo(),
        usuario=usuario.usuario,
        recordar=recordar,
        creada_en=momento,
        ultima_actividad=momento,
        expira_en=momento + vida,
        ip=ip,
    )
    db.add(sesion)
    auditar(db, "usuario", usuario.usuario, "login", None, None, usuario.nombre, f"ip={ip} recordar={recordar}")
    db.commit()
    db.refresh(usuario)
    db.refresh(sesion)
    return usuario, token, sesion


# ---------- Sesión ----------

def sesion_desde_token(db: Session, token: str | None) -> tuple[Usuario, Sesion]:
    """Usuario y sesión vigentes para el token de la cookie, o NoAutenticadoError (401)."""
    if not token:
        raise NoAutenticadoError("Inicia sesión para continuar.")
    sesion = repo.sesion_por_huella(db, huella(token))
    momento = ahora()
    if sesion is None or sesion.revocada_en is not None:
        raise NoAutenticadoError("La sesión no es válida. Inicia sesión de nuevo.", "AUTH-SESION-INVALIDA")
    inactiva = momento - sesion.ultima_actividad > timedelta(minutes=settings.SESION_INACTIVIDAD_MIN)
    if sesion.expira_en <= momento or (inactiva and not sesion.recordar):
        raise NoAutenticadoError("Tu sesión caducó. Inicia sesión de nuevo.", "AUTH-SESION-CADUCADA")

    usuario = db.get(Usuario, sesion.usuario)
    if usuario is None or not usuario.activo:
        sesion.revocada_en = momento
        db.add(sesion)
        db.commit()
        raise NoAutenticadoError("Tu cuenta ya no tiene acceso.", "AUTH-SESION-INVALIDA")

    if momento - sesion.ultima_actividad > REFRESCO_ACTIVIDAD:
        sesion.ultima_actividad = momento
        db.add(sesion)
        db.commit()
        db.refresh(sesion)
        db.refresh(usuario)
    return usuario, sesion


def cerrar_sesion(db: Session, token: str | None, ip: str | None) -> None:
    """Revoca la sesión en el servidor (si existe). Idempotente."""
    if not token:
        return
    sesion = repo.sesion_por_huella(db, huella(token))
    if sesion is None or sesion.revocada_en is not None:
        return
    sesion.revocada_en = ahora()
    db.add(sesion)
    auditar(db, "usuario", sesion.usuario, "logout", None, None, sesion.usuario, f"ip={ip}")
    db.commit()


# ---------- Alta de cuentas ----------

def registrar(db: Session, datos: RegistroEntrada, ip: str | None) -> Usuario:
    """Registro público: siempre rol 'usuario'. El esquema rechaza cualquier campo 'rol' del cliente."""
    if not settings.REGISTRO_PUBLICO:
        raise PermisoError("El registro público está deshabilitado. Pide una cuenta a un administrador.",
                           "AUTH-REGISTRO-CERRADO")
    espera = limitador.excedido(f"registro:ip:{ip}", 10, 60 * 60)
    if espera:
        raise _demasiados("Demasiados registros desde esta conexión.", espera)
    exigir_clave_valida(datos.clave, datos.confirmacion, datos.usuario, datos.email)
    usuario = crear_usuario(db, datos.nombre, datos.usuario, datos.email, datos.clave, ROL_USUARIO,
                            actor=datos.nombre, origen=f"registro público ip={ip}")
    limitador.registrar(f"registro:ip:{ip}")
    return usuario


def crear_usuario(
    db: Session, nombre: str, usuario: str, email: str | None, clave: str, rol: str, actor: str, origen: str,
) -> Usuario:
    if db.get(Usuario, usuario):
        raise _rechazo("AUTH-USUARIO-EN-USO", "Ese nombre de usuario ya está en uso.")
    if email and repo.existe_email(db, email):
        raise _rechazo("AUTH-EMAIL-EN-USO", "Ya existe una cuenta con ese correo.")
    if repo.existe_nombre(db, nombre):
        # El nombre es el solicitante de reservas y préstamos: si se repitiera, dos personas
        # podrían gestionar las reservas de la otra.
        raise _rechazo("AUTH-NOMBRE-EN-USO", "Ya existe una cuenta con ese nombre. Agrega tu segundo apellido.")
    nuevo = Usuario(usuario=usuario, nombre=nombre, email=email, rol=rol, clave_hash=hashear_clave(clave))
    db.add(nuevo)
    try:
        db.flush()
    except IntegrityError:  # carrera entre dos altas iguales
        db.rollback()
        raise _rechazo("AUTH-USUARIO-EN-USO", "Ya existe una cuenta con ese correo o usuario.")
    auditar(db, "usuario", usuario, "crear", None, rol, actor, origen)
    db.commit()
    db.refresh(nuevo)
    return nuevo


# ---------- Recuperación de contraseña ----------

def solicitar_recuperacion(db: Session, email: str, ip: str | None) -> None:
    """Genera y envía un enlace de un solo uso. Al cliente se le responde igual exista o no la cuenta."""
    espera = max(
        limitador.excedido(f"recuperar:ip:{ip}", 10, 60 * 60),
        limitador.excedido(f"recuperar:email:{email}", 3, 60 * 60),
    )
    if espera:
        raise _demasiados("Demasiadas solicitudes de recuperación.", espera)
    limitador.registrar(f"recuperar:ip:{ip}")
    limitador.registrar(f"recuperar:email:{email}")

    usuario = repo.por_email(db, email)
    if usuario is None or not usuario.activo:
        log.info("recuperación solicitada para un correo sin cuenta activa ip=%s", ip)
        return

    momento = ahora()
    repo.invalidar_tokens_recuperacion(db, usuario.usuario, momento)  # solo sirve el último enlace
    token = token_nuevo()
    db.add(TokenRecuperacion(
        token_hash=huella(token),
        usuario=usuario.usuario,
        creado_en=momento,
        expira_en=momento + timedelta(minutes=settings.RECUPERACION_MIN),
    ))
    auditar(db, "usuario", usuario.usuario, "recuperacion_solicitada", None, None, usuario.nombre, f"ip={ip}")
    db.commit()

    texto = (
        f"Hola, {usuario.nombre}:\n\n"
        "Recibimos una solicitud para restablecer tu contraseña de Campuslands Ops.\n"
        f"Abre este enlace (válido durante {settings.RECUPERACION_MIN} minutos y de un solo uso):\n\n"
        f"{settings.APP_URL}/restablecer?token={token}\n\n"
        "Si no fuiste tú, ignora este mensaje: tu contraseña no cambiará."
    )
    try:
        correo.enviar(usuario.email, "Restablece tu contraseña · Campuslands Ops", texto)
    except correo.CorreoNoConfigurado:
        log.warning("Recuperación de contraseña sin enviar: el servicio de correo no está configurado.")
    except Exception:
        log.exception("No se pudo enviar el correo de recuperación")


def restablecer(db: Session, token: str, clave: str, confirmacion: str) -> Usuario:
    registro = repo.token_recuperacion(db, huella(token))
    momento = ahora()
    usuario = db.get(Usuario, registro.usuario) if registro else None
    if (
        registro is None or registro.usado_en is not None or registro.expira_en <= momento
        or usuario is None or not usuario.activo
    ):
        raise _rechazo("AUTH-TOKEN-INVALIDO", MENSAJE_TOKEN_INVALIDO)
    exigir_clave_valida(clave, confirmacion, usuario.usuario, usuario.email or "")

    usuario.clave_hash = hashear_clave(clave)
    usuario.intentos_fallidos = 0
    usuario.bloqueado_hasta = None
    db.add(usuario)
    repo.invalidar_tokens_recuperacion(db, usuario.usuario, momento)  # este y cualquier otro pendiente
    repo.revocar_sesiones(db, usuario.usuario, momento)               # quien tenía la clave anterior sale
    limitador.limpiar(f"login:id:{usuario.usuario}")
    if usuario.email:
        limitador.limpiar(f"login:id:{usuario.email}")
    auditar(db, "usuario", usuario.usuario, "clave_restablecida", None, None, usuario.nombre, "sesiones revocadas")
    db.commit()
    db.refresh(usuario)
    return usuario
