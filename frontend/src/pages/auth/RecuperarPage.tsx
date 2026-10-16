import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AtSign, MailCheck } from 'lucide-react'
import { usePolitica } from '../../auth/usePolitica'
import { validarEmail } from '../../auth/validacion'
import { authApi } from '../../services/api/authApi'
import { AvisoAcceso, AvisoDatos, BotonAcceso, CampoTexto, EstadoBoton } from '../../components/auth/CamposAcceso'
import { AuthLayout } from './AuthLayout'
import { EnlaceInterno } from './EnlaceInterno'
import { avisoDeError } from './estados'

export const RecuperarPage: React.FC = () => {
  const { politica } = usePolitica()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<AvisoDatos | null>(null)
  const [estado, setEstado] = useState<EstadoBoton>('normal')
  const [enviado, setEnviado] = useState(false)
  const enviando = useRef(false)
  const disponible = politica?.recuperacion_disponible !== false

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (enviando.current) return
    const e = validarEmail(email)
    setError(e)
    if (e) return
    enviando.current = true
    setEstado('cargando')
    setAviso(null)
    try {
      await authApi.recuperar(email.trim().toLowerCase())
      setEnviado(true)
    } catch (err) {
      setEstado('error')
      setAviso(avisoDeError(err, 'No se pudo procesar la solicitud'))
      window.setTimeout(() => setEstado(s => (s === 'error' ? 'normal' : s)), 1400)
    } finally {
      enviando.current = false
    }
  }

  return (
    <AuthLayout
      eyebrow="Recuperar acceso"
      titulo="¿Olvidaste tu contraseña?"
      subtitulo="Te enviaremos un enlace temporal para crear una nueva"
      pie={<>¿La recordaste? <EnlaceInterno a="/login" className="font-semibold text-sky-300">Volver a iniciar sesión</EnlaceInterno></>}
    >
      {enviado ? (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center" role="status">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            <MailCheck className="h-7 w-7" />
          </span>
          <h2 className="font-display text-lg font-semibold text-white">Solicitud recibida</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
            Si existe una cuenta activa con <strong className="text-slate-200">{email.trim().toLowerCase()}</strong>, recibirás un
            enlace válido por tiempo limitado y de un solo uso. Revisa también la carpeta de spam.
          </p>
          <button
            type="button"
            onClick={() => { setEnviado(false); setEstado('normal') }}
            className="mt-5 text-[13px] font-medium text-sky-300 transition hover:text-sky-200 cursor-pointer"
          >
            Usar otro correo
          </button>
        </motion.div>
      ) : (
        <>
          <AvisoAcceso
            aviso={aviso ?? (!disponible ? {
              tono: 'advertencia',
              titulo: 'La recuperación por correo no está configurada',
              mensaje: 'En este entorno no se pueden enviar correos. Pide a un administrador que revise tu acceso.'
            } : null)}
            onCerrar={aviso ? () => setAviso(null) : undefined}
          />
          <form onSubmit={enviar} noValidate>
            <CampoTexto
              etiqueta="Correo electrónico de tu cuenta"
              icono={<AtSign />}
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="nombre@correo.com"
              value={email}
              maxLength={254}
              disabled={!disponible}
              error={error}
              onChange={ev => { setEmail(ev.target.value); if (error) setError(null) }}
              autoFocus
            />
            <div className="mt-2">
              <BotonAcceso estado={estado} textoCargando="Enviando…" disabled={!disponible}>
                Enviar enlace
              </BotonAcceso>
            </div>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
