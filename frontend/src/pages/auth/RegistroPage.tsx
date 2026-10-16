import React, { useRef, useState } from 'react'
import { AtSign, Lock, UserRound, UserSquare2 } from 'lucide-react'
import { navegar } from '../../auth/rutas'
import { usePolitica } from '../../auth/usePolitica'
import {
  POLITICA_POR_DEFECTO,
  requisitosClave,
  validarEmail,
  validarNombre,
  validarUsuario
} from '../../auth/validacion'
import { authApi } from '../../services/api/authApi'
import { AvisoAcceso, AvisoDatos, BotonAcceso, CampoClave, CampoTexto, EstadoBoton, RequisitosClave } from '../../components/auth/CamposAcceso'
import { AuthLayout } from './AuthLayout'
import { EnlaceInterno } from './EnlaceInterno'
import { avisoDeError, erroresPorCampo } from './estados'

type Campo = 'nombre' | 'usuario' | 'email' | 'clave' | 'confirmacion'

export const RegistroPage: React.FC = () => {
  const { politica, error: errorPolitica } = usePolitica()
  const reglas = politica?.clave ?? POLITICA_POR_DEFECTO
  const [datos, setDatos] = useState<Record<Campo, string>>({ nombre: '', usuario: '', email: '', clave: '', confirmacion: '' })
  const [errores, setErrores] = useState<Partial<Record<Campo, string | null>>>({})
  const [aviso, setAviso] = useState<AvisoDatos | null>(null)
  const [estado, setEstado] = useState<EstadoBoton>('normal')
  const enviando = useRef(false)
  const formulario = useRef<HTMLFormElement>(null)

  const requisitos = requisitosClave(datos.clave, reglas, [datos.usuario, datos.email])

  const validarCampo = (campo: Campo, d = datos): string | null => {
    switch (campo) {
      case 'nombre': return validarNombre(d.nombre)
      case 'usuario': return validarUsuario(d.usuario)
      case 'email': return validarEmail(d.email)
      case 'clave':
        if (!d.clave) return 'Crea una contraseña.'
        return requisitosClave(d.clave, reglas, [d.usuario, d.email]).every(r => r.cumple)
          ? null : 'La contraseña no cumple todos los requisitos.'
      case 'confirmacion':
        if (!d.confirmacion) return 'Confirma tu contraseña.'
        return d.confirmacion === d.clave ? null : 'Las contraseñas no coinciden.'
    }
  }

  const cambiar = (campo: Campo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevos = { ...datos, [campo]: e.target.value }
    setDatos(nuevos)
    if (errores[campo]) setErrores(x => ({ ...x, [campo]: validarCampo(campo, nuevos) }))
  }
  const alSalir = (campo: Campo) => () => datos[campo] && setErrores(x => ({ ...x, [campo]: validarCampo(campo) }))

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (enviando.current) return
    const campos: Campo[] = ['nombre', 'usuario', 'email', 'clave', 'confirmacion']
    const nuevos = Object.fromEntries(campos.map(c => [c, validarCampo(c)])) as Record<Campo, string | null>
    setErrores(nuevos)
    const primero = campos.find(c => nuevos[c])
    if (primero) {
      formulario.current?.querySelector<HTMLInputElement>(`[name="${primero}"]`)?.focus()
      setAviso({ tono: 'error', titulo: 'Revisa los campos marcados' })
      return
    }
    enviando.current = true
    setEstado('cargando')
    setAviso(null)
    try {
      const creado = await authApi.registro({
        nombre: datos.nombre.trim().replace(/\s+/g, ' '),
        usuario: datos.usuario.trim().toLowerCase(),
        email: datos.email.trim().toLowerCase(),
        clave: datos.clave,
        confirmacion: datos.confirmacion
      })
      setEstado('exito')
      window.setTimeout(
        () => navegar(`/login?motivo=registro&usuario=${encodeURIComponent(creado.usuario)}`, { reemplazar: true }),
        700
      )
    } catch (err) {
      enviando.current = false
      setEstado('error')
      const porCampo = erroresPorCampo(err)
      const codigo = (err as { codigo?: string }).codigo
      if (codigo === 'AUTH-USUARIO-EN-USO') porCampo.usuario = (err as Error).message
      if (codigo === 'AUTH-EMAIL-EN-USO') porCampo.email = (err as Error).message
      if (codigo === 'AUTH-NOMBRE-EN-USO') porCampo.nombre = (err as Error).message
      if (codigo === 'AUTH-CLAVE') porCampo.clave = (err as Error).message
      setErrores(x => ({ ...x, ...porCampo }))
      setAviso(avisoDeError(err, 'No se pudo crear la cuenta'))
      window.setTimeout(() => setEstado(e => (e === 'error' ? 'normal' : e)), 1400)
    }
  }

  if (politica && !politica.registro_publico) {
    return (
      <AuthLayout eyebrow="Registro" titulo="Registro no disponible" subtitulo="Las cuentas las crea un administrador de la plataforma.">
        <AvisoAcceso aviso={{ tono: 'info', titulo: 'Solicita tu cuenta', mensaje: 'Pide acceso al equipo administrador de Campuslands.' }} />
        <EnlaceInterno a="/login" className="block text-center text-sm font-semibold text-sky-300">Volver a iniciar sesión</EnlaceInterno>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      eyebrow="Nueva cuenta"
      titulo="Crea tu cuenta"
      subtitulo="Accede a reservas, préstamos e incidencias del campus"
      pie={<>¿Ya tienes cuenta? <EnlaceInterno a="/login" className="font-semibold text-sky-300">Inicia sesión</EnlaceInterno></>}
    >
      <AvisoAcceso
        aviso={aviso ?? (errorPolitica ? { tono: 'advertencia', titulo: 'No se pudo consultar la política de contraseñas', mensaje: 'Se muestran los requisitos por defecto; el servidor validará los vigentes.' } : null)}
        onCerrar={aviso ? () => setAviso(null) : undefined}
      />
      <form ref={formulario} onSubmit={enviar} noValidate>
        <CampoTexto etiqueta="Nombre completo" icono={<UserRound />} name="nombre" autoComplete="name" placeholder="Nombre y apellidos"
          value={datos.nombre} maxLength={120} error={errores.nombre} onChange={cambiar('nombre')} onBlur={alSalir('nombre')}
          ayuda="Así figurarás en tus reservas y préstamos." />
        <div className="grid gap-x-3 sm:grid-cols-2">
          <CampoTexto etiqueta="Usuario" icono={<UserSquare2 />} name="usuario" autoComplete="username" autoCapitalize="none"
            spellCheck={false} placeholder="ana.perez" value={datos.usuario} maxLength={32} error={errores.usuario}
            onChange={cambiar('usuario')} onBlur={alSalir('usuario')} />
          <CampoTexto etiqueta="Correo electrónico" icono={<AtSign />} name="email" type="email" autoComplete="email"
            autoCapitalize="none" spellCheck={false} placeholder="nombre@correo.com" value={datos.email} maxLength={254}
            error={errores.email} onChange={cambiar('email')} onBlur={alSalir('email')} />
        </div>
        <CampoClave etiqueta="Contraseña" name="clave" autoComplete="new-password" placeholder="Crea una contraseña segura"
          value={datos.clave} maxLength={reglas.max_largo} error={errores.clave} onChange={cambiar('clave')} />
        <RequisitosClave requisitos={requisitos} clave={datos.clave} />
        <CampoTexto etiqueta="Confirmar contraseña" icono={<Lock />} name="confirmacion" type="password" autoComplete="new-password"
          placeholder="Repite la contraseña" value={datos.confirmacion} maxLength={reglas.max_largo} error={errores.confirmacion}
          onChange={cambiar('confirmacion')} onBlur={alSalir('confirmacion')} />
        <p className="mb-5 text-[12px] leading-relaxed text-slate-500">
          Las cuentas nuevas tienen el rol <strong className="font-semibold text-slate-300">Usuario</strong>. Los permisos de
          administración solo los asigna un administrador.
        </p>
        <BotonAcceso estado={estado} textoCargando="Creando cuenta…" textoExito="Cuenta creada">
          Crear cuenta
        </BotonAcceso>
      </form>
    </AuthLayout>
  )
}
