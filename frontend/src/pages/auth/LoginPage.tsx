import React, { useEffect, useRef, useState } from 'react'
import { AtSign } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { navegar, useRuta } from '../../auth/rutas'
import { usePolitica } from '../../auth/usePolitica'
import { validarIdentificador } from '../../auth/validacion'
import { authApi } from '../../services/api/authApi'
import { ApiError } from '../../services/api/baseClient'
import { AvisoAcceso, AvisoDatos, BotonAcceso, CampoClave, CampoTexto, Casilla, EstadoBoton } from '../../components/auth/CamposAcceso'
import { AuthLayout } from './AuthLayout'
import { AVISOS_LLEGADA, avisoDeError } from './estados'
import { EnlaceInterno } from './EnlaceInterno'

export const LoginPage: React.FC = () => {
  const { establecerSesion } = useAuth()
  const { params } = useRuta()
  const { politica } = usePolitica()

  // Se leen una vez y se limpian de la URL (al recargar no reaparece el aviso).
  const [inicial] = useState(() => ({
    motivo: params.get('motivo') ?? '',
    usuario: params.get('usuario') ?? '',
    siguiente: params.get('siguiente') ?? ''
  }))
  useEffect(() => {
    if (inicial.motivo || inicial.usuario) {
      navegar(inicial.siguiente ? `/login?siguiente=${encodeURIComponent(inicial.siguiente)}` : '/login', { reemplazar: true })
    }
  }, [inicial])

  const [usuario, setUsuario] = useState(inicial.usuario)
  const [clave, setClave] = useState('')
  const [recordar, setRecordar] = useState(false)
  const [errores, setErrores] = useState<{ usuario?: string | null; clave?: string | null }>({})
  const [aviso, setAviso] = useState<AvisoDatos | null>(AVISOS_LLEGADA[inicial.motivo] ?? null)
  const [estado, setEstado] = useState<EstadoBoton>('normal')
  const enviando = useRef(false)
  const refUsuario = useRef<HTMLInputElement>(null)
  const refClave = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(inicial.usuario ? refClave : refUsuario).current?.focus()
  }, [inicial.usuario])

  const validar = () => {
    const e = {
      usuario: validarIdentificador(usuario),
      clave: clave ? null : 'Escribe tu contraseña.'
    }
    setErrores(e)
    if (e.usuario) refUsuario.current?.focus()
    else if (e.clave) refClave.current?.focus()
    return !e.usuario && !e.clave
  }

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (enviando.current) return // evita envíos duplicados por doble clic o Enter repetido
    if (!validar()) {
      setAviso({ tono: 'error', titulo: 'Revisa los campos marcados' })
      return
    }
    enviando.current = true
    setEstado('cargando')
    setAviso(null)
    try {
      const sesion = await authApi.login({ usuario: usuario.trim(), clave, recordar })
      setEstado('exito')
      // Breve confirmación visual; después la sesión se activa y se entra a la app.
      window.setTimeout(() => establecerSesion(sesion), 450)
    } catch (err) {
      enviando.current = false
      setEstado('error')
      setAviso(avisoDeError(err, 'No pudimos iniciar sesión'))
      if ((err as ApiError).codigo === 'AUTH-CREDENCIALES') {
        setClave('')
        refClave.current?.focus()
      }
      window.setTimeout(() => setEstado(e => (e === 'error' ? 'normal' : e)), 1400)
    }
  }

  return (
    <AuthLayout
      eyebrow="Acceso seguro"
      titulo="Bienvenido de nuevo"
      subtitulo="Inicia sesión para continuar en tu espacio de trabajo"
      pie={
        politica?.registro_publico !== false && (
          <>
            ¿Aún no tienes cuenta?{' '}
            <EnlaceInterno a="/registro" className="font-semibold text-sky-300">Crear una cuenta</EnlaceInterno>
          </>
        )
      }
    >
      <AvisoAcceso aviso={aviso} onCerrar={() => setAviso(null)} />
      <form onSubmit={enviar} noValidate>
        <CampoTexto
          ref={refUsuario}
          etiqueta="Usuario o correo electrónico"
          icono={<AtSign />}
          name="usuario"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="tu.usuario o nombre@campuslands.com"
          value={usuario}
          maxLength={254}
          error={errores.usuario}
          onChange={e => {
            setUsuario(e.target.value)
            if (errores.usuario) setErrores(x => ({ ...x, usuario: null }))
          }}
          onBlur={() => usuario && setErrores(x => ({ ...x, usuario: validarIdentificador(usuario) }))}
        />
        <CampoClave
          ref={refClave}
          etiqueta="Contraseña"
          name="clave"
          autoComplete="current-password"
          placeholder="••••••••••"
          value={clave}
          maxLength={128}
          error={errores.clave}
          onChange={e => {
            setClave(e.target.value)
            if (errores.clave) setErrores(x => ({ ...x, clave: null }))
          }}
        />
        <div className="mb-6 mt-1 flex flex-wrap items-start justify-between gap-3">
          <Casilla
            marcada={recordar}
            onCambio={setRecordar}
            descripcion={`Mantiene la sesión ${politica?.recordar_dias ?? 14} días. No lo uses en equipos compartidos.`}
          >
            Recordar sesión
          </Casilla>
          <EnlaceInterno a="/recuperar" className="text-[13px] font-medium text-sky-300">
            ¿Olvidaste tu contraseña?
          </EnlaceInterno>
        </div>
        <BotonAcceso estado={estado} textoCargando="Verificando credenciales…" textoExito="Acceso concedido">
          Iniciar sesión
        </BotonAcceso>
      </form>
    </AuthLayout>
  )
}
