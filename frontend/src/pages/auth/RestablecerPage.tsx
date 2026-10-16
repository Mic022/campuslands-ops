import React, { useEffect, useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { navegar, useRuta } from '../../auth/rutas'
import { usePolitica } from '../../auth/usePolitica'
import { POLITICA_POR_DEFECTO, requisitosClave } from '../../auth/validacion'
import { authApi } from '../../services/api/authApi'
import { AvisoAcceso, AvisoDatos, BotonAcceso, CampoClave, CampoTexto, EstadoBoton, RequisitosClave } from '../../components/auth/CamposAcceso'
import { AuthLayout } from './AuthLayout'
import { EnlaceInterno } from './EnlaceInterno'
import { avisoDeError } from './estados'

export const RestablecerPage: React.FC = () => {
  const { params } = useRuta()
  const { politica } = usePolitica()
  const reglas = politica?.clave ?? POLITICA_POR_DEFECTO

  // El token se guarda en memoria y se quita de la URL: no queda en el historial ni viaja en Referer.
  const [token] = useState(() => params.get('token') ?? '')
  useEffect(() => {
    if (params.get('token')) navegar('/restablecer', { reemplazar: true })
  }, [params])

  const [clave, setClave] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [errores, setErrores] = useState<{ clave?: string | null; confirmacion?: string | null }>({})
  const [aviso, setAviso] = useState<AvisoDatos | null>(
    token ? null : { tono: 'error', titulo: 'Enlace incompleto', mensaje: 'Abre el enlace completo que recibiste por correo o solicita uno nuevo.' }
  )
  const [estado, setEstado] = useState<EstadoBoton>('normal')
  const enviando = useRef(false)
  const requisitos = requisitosClave(clave, reglas)

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (enviando.current || !token) return
    const e = {
      clave: !clave ? 'Crea una contraseña.' : requisitos.every(r => r.cumple) ? null : 'La contraseña no cumple todos los requisitos.',
      confirmacion: !confirmacion ? 'Confirma tu contraseña.' : confirmacion === clave ? null : 'Las contraseñas no coinciden.'
    }
    setErrores(e)
    if (e.clave || e.confirmacion) return
    enviando.current = true
    setEstado('cargando')
    setAviso(null)
    try {
      await authApi.restablecer({ token, clave, confirmacion })
      setEstado('exito')
      window.setTimeout(() => navegar('/login?motivo=restablecida', { reemplazar: true }), 700)
    } catch (err) {
      enviando.current = false
      setEstado('error')
      setAviso(avisoDeError(err, 'No se pudo cambiar la contraseña'))
      window.setTimeout(() => setEstado(s => (s === 'error' ? 'normal' : s)), 1400)
    }
  }

  return (
    <AuthLayout
      eyebrow="Recuperar acceso"
      titulo="Crea una nueva contraseña"
      subtitulo="Al guardarla se cerrarán todas tus sesiones abiertas"
      pie={<EnlaceInterno a="/recuperar" className="font-semibold text-sky-300">Solicitar un enlace nuevo</EnlaceInterno>}
    >
      <AvisoAcceso aviso={aviso} onCerrar={token ? () => setAviso(null) : undefined} />
      <form onSubmit={enviar} noValidate>
        <CampoClave etiqueta="Nueva contraseña" name="clave" autoComplete="new-password" value={clave} maxLength={reglas.max_largo}
          disabled={!token} error={errores.clave} onChange={e => { setClave(e.target.value); setErrores(x => ({ ...x, clave: null })) }} autoFocus />
        <RequisitosClave requisitos={requisitos} clave={clave} />
        <CampoTexto etiqueta="Confirmar contraseña" icono={<Lock />} name="confirmacion" type="password" autoComplete="new-password"
          value={confirmacion} maxLength={reglas.max_largo} disabled={!token} error={errores.confirmacion}
          onChange={e => { setConfirmacion(e.target.value); setErrores(x => ({ ...x, confirmacion: null })) }} />
        <div className="mt-2">
          <BotonAcceso estado={estado} textoCargando="Guardando…" textoExito="Contraseña actualizada" disabled={!token}>
            Guardar contraseña
          </BotonAcceso>
        </div>
      </form>
    </AuthLayout>
  )
}
