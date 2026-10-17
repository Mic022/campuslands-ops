/**
 * Punto de entrada de las rutas: decide entre pantallas públicas de acceso y la app privada.
 *
 * - Sin sesión válida, cualquier ruta privada lleva al login (recordando a dónde se quería ir).
 * - Con sesión, las pantallas de acceso llevan a la app.
 * - /admin exige rol admin; el backend lo vuelve a comprobar en cada petición.
 */
import React, { lazy, Suspense, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, ShieldX, WifiOff } from 'lucide-react'
import { useAuth } from './auth/AuthContext'
import { destinoSeguro, esRutaPrivada, esRutaPublica, navegar, urlLogin, useRuta } from './auth/rutas'
import { LOGO_URL } from './components/layout/Brand'
import { LoginPage } from './pages/auth/LoginPage'
import { AuthLayout } from './pages/auth/AuthLayout'

// La app (3D incluido) solo se descarga después de autenticarse.
const App = lazy(() => import('./App'))
const RegistroPage = lazy(() => import('./pages/auth/RegistroPage').then(m => ({ default: m.RegistroPage })))
const RecuperarPage = lazy(() => import('./pages/auth/RecuperarPage').then(m => ({ default: m.RecuperarPage })))
const RestablecerPage = lazy(() => import('./pages/auth/RestablecerPage').then(m => ({ default: m.RestablecerPage })))

/**
 * Redirige solo si la persona sigue en la ruta desde la que se decidió: si otra parte de la app
 * ya navegó (p. ej. al login con el aviso de sesión cerrada), no se pisa ese destino.
 */
const Redirigir: React.FC<{ a: string; desde: string }> = ({ a, desde }) => {
  useEffect(() => {
    if (window.location.pathname === desde) navegar(a, { reemplazar: true })
  }, [a, desde])
  return <PantallaCarga />
}

export const PantallaCarga: React.FC<{ texto?: string }> = ({ texto = 'Verificando tu sesión…' }) => (
  <div className="acceso-fondo flex min-h-[100dvh] flex-col items-center justify-center gap-4 text-slate-300" role="status" aria-live="polite">
    <div className="relative h-14 w-14">
      <span className="absolute inset-0 animate-ping rounded-2xl bg-sky-300/10" />
      <img src={LOGO_URL} alt="" className="relative h-14 w-14 rounded-2xl border border-white/10 bg-[#0A0F22] object-contain p-2" />
    </div>
    <p className="flex items-center gap-2 text-sm">
      <Loader2 className="h-4 w-4 animate-spin text-sky-300" /> {texto}
    </p>
  </div>
)

const SinConexion: React.FC<{ onReintentar: () => void }> = ({ onReintentar }) => (
  <AuthLayout eyebrow="Sin conexión" titulo="No podemos conectar" subtitulo="El servidor de Campus Ops no responde en este momento.">
    <div className="text-center">
      <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-300">
        <WifiOff className="h-7 w-7" />
      </span>
      <p className="mb-6 text-sm text-slate-400">Comprueba tu conexión o que el backend esté en marcha y vuelve a intentarlo.</p>
      <button
        onClick={onReintentar}
        className="h-11 w-full rounded-xl bg-sky-300 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 cursor-pointer"
      >
        Reintentar
      </button>
    </div>
  </AuthLayout>
)

export const AccesoDenegado: React.FC = () => (
  <div className="acceso-fondo flex min-h-[100dvh] items-center justify-center px-4">
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="tarjeta-acceso w-full max-w-md rounded-[1.75rem] p-8 text-center"
      role="alert"
    >
      <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-500/10 text-rose-300">
        <ShieldX className="h-7 w-7" />
      </span>
      <p className="eyebrow text-rose-300">Error 403 · Acceso denegado</p>
      <h1 className="mt-3 font-display text-2xl font-bold text-white">Esta sección es solo para administradores</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        Tu cuenta no tiene permisos para ver este módulo. Si crees que es un error, pide acceso a un administrador.
      </p>
      <button
        onClick={() => navegar('/', { reemplazar: true })}
        className="mt-7 h-11 w-full rounded-xl bg-sky-300 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 cursor-pointer"
      >
        Volver al panel principal
      </button>
    </motion.div>
  </div>
)

export const Raiz: React.FC = () => {
  const { estado, esAdmin, motivoSalida, verificar } = useAuth()
  const { ruta, params } = useRuta()

  if (estado === 'verificando') return <PantallaCarga />
  if (estado === 'sin_conexion') return <SinConexion onReintentar={verificar} />

  const autenticado = estado === 'autenticado'

  if (esRutaPublica(ruta)) {
    if (autenticado) return <Redirigir desde={ruta} a={destinoSeguro(params.get('siguiente'))} />
    return (
      <Suspense fallback={<PantallaCarga texto="Cargando…" />}>
        {ruta === '/login' && <LoginPage />}
        {ruta === '/registro' && <RegistroPage />}
        {ruta === '/recuperar' && <RecuperarPage />}
        {ruta === '/restablecer' && <RestablecerPage />}
      </Suspense>
    )
  }

  if (!esRutaPrivada(ruta)) return <Redirigir desde={window.location.pathname} a={autenticado ? '/' : '/login'} />
  if (!autenticado) {
    // replace: el botón Atrás no vuelve a la pantalla privada. Tras cerrar sesión no se guarda
    // "siguiente" (la próxima persona entra al panel principal).
    const destino = motivoSalida === 'salida' ? urlLogin('salida') : urlLogin(motivoSalida ?? undefined, ruta)
    return <Redirigir desde={ruta} a={destino} />
  }
  if (ruta === '/admin' && !esAdmin) return <AccesoDenegado />

  return (
    <Suspense fallback={<PantallaCarga texto="Cargando el centro de operaciones…" />}>
      <App ruta={ruta} />
    </Suspense>
  )
}
