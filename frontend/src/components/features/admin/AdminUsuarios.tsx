/**
 * Módulo de administración: consulta y gestión de cuentas (solo rol admin).
 * Cada acción la valida el backend (permisos, último administrador, auto-degradación).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AtSign, Lock, Search, ShieldCheck, ShieldOff, Unlock, UserPlus, UserRound, UserSquare2, UsersRound } from 'lucide-react'
import { useAuth } from '../../../auth/AuthContext'
import { usePolitica } from '../../../auth/usePolitica'
import { POLITICA_POR_DEFECTO, requisitosClave, validarEmail, validarNombre, validarUsuario } from '../../../auth/validacion'
import { adminApi, Rol, UsuarioAdmin } from '../../../services/api/authApi'
import { ApiError } from '../../../services/api/baseClient'
import { PageHero } from '../../layout/PageHero'
import { Button } from '../../ui/Button'
import { AvisoError, Vacio } from '../../ui/EstadoDatos'
import { Modal } from '../../ui/Modal'
import { ToastMessage } from '../../ui/Toast'
import { CampoClave, CampoTexto, RequisitosClave } from '../../auth/CamposAcceso'

type Aviso = (tipo: ToastMessage['tipo'], mensaje: string, codigo?: string) => void

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : 'Nunca'

const RolBadge: React.FC<{ rol: Rol }> = ({ rol }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
    rol === 'admin' ? 'border-amber-300/30 bg-amber-300/10 text-amber-200' : 'border-sky-300/25 bg-sky-300/[0.08] text-sky-200'
  }`}>
    {rol === 'admin' ? <ShieldCheck className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}
    {rol === 'admin' ? 'Administrador' : 'Usuario'}
  </span>
)

const EstadoBadge: React.FC<{ u: UsuarioAdmin }> = ({ u }) => {
  const [texto, clase] = !u.activo
    ? ['Desactivada', 'border-slate-500/30 bg-slate-500/10 text-slate-300']
    : u.bloqueado
      ? ['Bloqueada', 'border-rose-400/30 bg-rose-500/10 text-rose-200']
      : ['Activa', 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200']
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${clase}`}>{texto}</span>
}

interface Confirmacion {
  titulo: string
  mensaje: string
  accion: () => Promise<void>
  peligro?: boolean
}

export const AdminUsuarios: React.FC<{ onToast: Aviso }> = ({ onToast }) => {
  const { usuario: yo } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string>()
  const [buscar, setBuscar] = useState('')
  const [rol, setRol] = useState<Rol | ''>('')
  const [activo, setActivo] = useState<'' | 'true' | 'false'>('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<Confirmacion | null>(null)
  const [crearAbierto, setCrearAbierto] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setUsuarios(await adminApi.listarUsuarios({ buscar, rol, activo }))
      setError(undefined)
    } catch (err) {
      const e = err as ApiError
      setError(e.codigo ? `[${e.codigo}] ${e.message}` : e.message)
    } finally {
      setCargando(false)
    }
  }, [buscar, rol, activo])

  useEffect(() => {
    const t = window.setTimeout(cargar, buscar ? 250 : 0) // la búsqueda espera a que se deje de escribir
    return () => window.clearTimeout(t)
  }, [cargar, buscar])

  const ejecutar = async (usuario: string, accion: () => Promise<UsuarioAdmin>, exito: string) => {
    setOcupado(usuario)
    try {
      const actualizado = await accion()
      setUsuarios(lista => lista.map(u => (u.usuario === actualizado.usuario ? actualizado : u)))
      onToast('exito', exito)
    } catch (err) {
      const e = err as ApiError
      onToast('error', e.message, e.codigo)
    } finally {
      setOcupado(null)
    }
  }

  const cambiarRol = (u: UsuarioAdmin, nuevo: Rol) =>
    setConfirmar({
      titulo: nuevo === 'admin' ? `¿Dar rol de administrador a ${u.nombre}?` : `¿Quitar el rol de administrador a ${u.nombre}?`,
      mensaje: nuevo === 'admin'
        ? 'Podrá gestionar cuentas, espacios, recursos y la auditoría. Sus sesiones abiertas se cerrarán para aplicar el cambio.'
        : 'Pasará a tener permisos de usuario. Sus sesiones abiertas se cerrarán para aplicar el cambio.',
      peligro: nuevo === 'admin',
      accion: () => ejecutar(u.usuario, () => adminApi.actualizarUsuario(u.usuario, { rol: nuevo }), `Rol de ${u.nombre} actualizado.`)
    })

  const cambiarActivo = (u: UsuarioAdmin) =>
    u.activo
      ? setConfirmar({
          titulo: `¿Desactivar la cuenta de ${u.nombre}?`,
          mensaje: 'No podrá iniciar sesión y sus sesiones abiertas se cerrarán de inmediato. Podrás reactivarla cuando quieras.',
          peligro: true,
          accion: () => ejecutar(u.usuario, () => adminApi.actualizarUsuario(u.usuario, { activo: false }), `Cuenta de ${u.nombre} desactivada.`)
        })
      : ejecutar(u.usuario, () => adminApi.actualizarUsuario(u.usuario, { activo: true }), `Cuenta de ${u.nombre} activada.`)

  const kpis = useMemo(() => ({
    total: usuarios.length,
    admins: usuarios.filter(u => u.rol === 'admin').length,
    activas: usuarios.filter(u => u.activo).length,
    bloqueadas: usuarios.filter(u => u.bloqueado).length
  }), [usuarios])

  const filtrosActivos = Boolean(buscar || rol || activo)

  return (
    <>
      <PageHero
        acento="252 211 77"
        modulo="Administración · Cuentas y roles"
        icono={<UsersRound />}
        titulo="Gestión de"
        tituloAcento="usuarios y permisos"
        descripcion="Consulta las cuentas de la plataforma, asigna roles y activa o desactiva el acceso. Cada cambio lo valida el servidor y queda registrado en la auditoría."
        reglas={['Solo administradores', 'Registro público = rol Usuario', 'Auditado']}
        kpis={[
          { etiqueta: filtrosActivos ? 'Resultados' : 'Cuentas', valor: kpis.total, detalle: filtrosActivos ? 'Con los filtros actuales' : 'Registradas' },
          { etiqueta: 'Administradores', valor: <span className="text-amber-300">{kpis.admins}</span>, detalle: 'Con acceso total' },
          { etiqueta: 'Activas', valor: <span className="text-emerald-300">{kpis.activas}</span>, detalle: 'Pueden iniciar sesión' },
          { etiqueta: 'Bloqueadas', valor: <span className="text-rose-300">{kpis.bloqueadas}</span>, detalle: 'Por intentos fallidos' }
        ]}
        acciones={<Button variant="cyan" icon={<UserPlus className="h-4 w-4" />} onClick={() => setCrearAbierto(true)}>Nueva cuenta</Button>}
      />

      <AvisoError titulo="No se pudo cargar la lista de cuentas" mensaje={error} />

      <section className="holo-panel rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Buscar cuentas</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              placeholder="Buscar por nombre, usuario o correo"
              maxLength={120}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-300/60 focus:outline-none focus:ring-4 focus:ring-sky-300/10"
            />
          </label>
          <div className="flex gap-2">
            <select aria-label="Filtrar por rol" value={rol} onChange={e => setRol(e.target.value as Rol | '')}
              className="h-10 rounded-xl border border-white/10 bg-[#0B1124] px-3 text-sm text-slate-200 focus:border-sky-300/60 focus:outline-none">
              <option value="">Todos los roles</option>
              <option value="admin">Administradores</option>
              <option value="usuario">Usuarios</option>
            </select>
            <select aria-label="Filtrar por estado" value={activo} onChange={e => setActivo(e.target.value as '' | 'true' | 'false')}
              className="h-10 rounded-xl border border-white/10 bg-[#0B1124] px-3 text-sm text-slate-200 focus:border-sky-300/60 focus:outline-none">
              <option value="">Todos los estados</option>
              <option value="true">Activas</option>
              <option value="false">Desactivadas</option>
            </select>
          </div>
        </div>

        {cargando ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.03]" />)}
          </div>
        ) : usuarios.length === 0 ? (
          <Vacio mensaje={filtrosActivos ? 'Ninguna cuenta coincide con los filtros.' : 'Aún no hay cuentas registradas.'} />
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {usuarios.map(u => {
              const esYo = u.usuario === yo?.usuario
              const trabajando = ocupado === u.usuario
              return (
                <li key={u.usuario} className={`grid gap-3 py-3.5 md:grid-cols-[minmax(0,1.6fr)_auto_auto_minmax(0,1fr)_auto] md:items-center ${trabajando ? 'opacity-60' : ''}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${u.rol === 'admin' ? 'bg-amber-300/15 text-amber-200' : 'bg-sky-300/10 text-sky-200'}`}>
                      {u.nombre.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-semibold text-white">
                        {u.nombre}
                        {esYo && <span className="rounded-md bg-white/10 px-1.5 py-px text-[10px] font-medium text-slate-300">Tú</span>}
                      </p>
                      <p className="truncate text-xs text-slate-400">@{u.usuario}{u.email ? ` · ${u.email}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RolBadge rol={u.rol} />
                  </div>
                  <div><EstadoBadge u={u} /></div>
                  <p className="text-xs text-slate-500">Último acceso: <span className="text-slate-400">{fecha(u.ultimo_acceso)}</span></p>
                  <div className="flex flex-wrap gap-1.5 md:justify-end">
                    {u.bloqueado && (
                      <Button size="sm" variant="outline" icon={<Unlock className="h-3.5 w-3.5" />} disabled={trabajando}
                        onClick={() => ejecutar(u.usuario, () => adminApi.desbloquear(u.usuario), `Cuenta de ${u.nombre} desbloqueada.`)}>
                        Desbloquear
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={trabajando || esYo}
                      title={esYo ? 'No puedes cambiar tu propio rol' : undefined}
                      icon={u.rol === 'admin' ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      onClick={() => cambiarRol(u, u.rol === 'admin' ? 'usuario' : 'admin')}>
                      {u.rol === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    </Button>
                    <Button size="sm" variant={u.activo ? 'ghost' : 'outline'} disabled={trabajando || esYo}
                      title={esYo ? 'No puedes desactivar tu propia cuenta' : undefined}
                      className={u.activo ? 'text-rose-300 hover:text-rose-200' : ''}
                      onClick={() => cambiarActivo(u)}>
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Modal isOpen={Boolean(confirmar)} onClose={() => setConfirmar(null)} title={confirmar?.titulo ?? ''} maxWidth="md">
        <p className="text-sm leading-relaxed text-slate-300">{confirmar?.mensaje}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmar(null)}>Cancelar</Button>
          <Button
            variant={confirmar?.peligro ? 'danger' : 'cyan'}
            onClick={async () => {
              const accion = confirmar?.accion
              setConfirmar(null)
              await accion?.()
            }}
          >
            Confirmar
          </Button>
        </div>
      </Modal>

      <CrearUsuarioModal
        abierto={crearAbierto}
        onCerrar={() => setCrearAbierto(false)}
        onCreado={u => {
          setUsuarios(lista => [u, ...lista])
          onToast('exito', `Cuenta de ${u.nombre} creada con rol ${u.rol === 'admin' ? 'Administrador' : 'Usuario'}.`)
        }}
      />
    </>
  )
}

const VACIO = { nombre: '', usuario: '', email: '', clave: '', rol: 'usuario' as Rol }

const CrearUsuarioModal: React.FC<{ abierto: boolean; onCerrar: () => void; onCreado: (u: UsuarioAdmin) => void }> = ({
  abierto, onCerrar, onCreado
}) => {
  const { politica } = usePolitica()
  const reglas = politica?.clave ?? POLITICA_POR_DEFECTO
  const [datos, setDatos] = useState(VACIO)
  const [errores, setErrores] = useState<Record<string, string | null>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const requisitos = requisitosClave(datos.clave, reglas, [datos.usuario, datos.email])

  useEffect(() => {
    if (!abierto) {
      setDatos(VACIO)
      setErrores({})
      setErrorGeneral(null)
    }
  }, [abierto])

  const cambiar = (campo: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setDatos(d => ({ ...d, [campo]: e.target.value }))
    setErrores(x => ({ ...x, [campo]: null }))
  }

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (enviando) return
    const e = {
      nombre: validarNombre(datos.nombre),
      usuario: validarUsuario(datos.usuario),
      email: datos.email.trim() ? validarEmail(datos.email) : null,
      clave: !datos.clave ? 'Define una contraseña inicial.' : requisitos.every(r => r.cumple) ? null : 'La contraseña no cumple todos los requisitos.'
    }
    setErrores(e)
    if (Object.values(e).some(Boolean)) return
    setEnviando(true)
    setErrorGeneral(null)
    try {
      const creado = await adminApi.crearUsuario({
        nombre: datos.nombre.trim().replace(/\s+/g, ' '),
        usuario: datos.usuario.trim().toLowerCase(),
        email: datos.email.trim().toLowerCase() || null,
        clave: datos.clave,
        rol: datos.rol
      })
      onCreado(creado)
      onCerrar()
    } catch (err) {
      const er = err as ApiError
      const campo = { 'AUTH-USUARIO-EN-USO': 'usuario', 'AUTH-EMAIL-EN-USO': 'email', 'AUTH-NOMBRE-EN-USO': 'nombre', 'AUTH-CLAVE': 'clave' }[er.codigo]
      if (campo) setErrores(x => ({ ...x, [campo]: er.message }))
      else setErrorGeneral(er.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal isOpen={abierto} onClose={onCerrar} title="Nueva cuenta" subtitle="Alta administrativa: el único camino para crear administradores." maxWidth="xl">
      <form onSubmit={enviar} noValidate>
        {errorGeneral && <p role="alert" className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{errorGeneral}</p>}
        <CampoTexto etiqueta="Nombre completo" icono={<UserRound />} value={datos.nombre} onChange={cambiar('nombre')} error={errores.nombre} maxLength={120} autoComplete="off" />
        <div className="grid gap-x-3 sm:grid-cols-2">
          <CampoTexto etiqueta="Usuario" icono={<UserSquare2 />} value={datos.usuario} onChange={cambiar('usuario')} error={errores.usuario} maxLength={32} autoComplete="off" autoCapitalize="none" />
          <CampoTexto etiqueta="Correo (opcional)" icono={<AtSign />} type="email" value={datos.email} onChange={cambiar('email')} error={errores.email} maxLength={254} autoComplete="off" />
        </div>
        <CampoClave etiqueta="Contraseña inicial" value={datos.clave} onChange={cambiar('clave')} error={errores.clave} maxLength={reglas.max_largo} autoComplete="new-password"
          ayuda="Compártela por un canal seguro." />
        <RequisitosClave requisitos={requisitos} clave={datos.clave} />
        <label className="mb-1.5 block text-[13px] font-medium text-slate-300" htmlFor="nuevo-rol">Rol</label>
        <div className="relative mb-6">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500" />
          <select id="nuevo-rol" value={datos.rol} onChange={cambiar('rol')}
            className="h-12 w-full rounded-xl border border-white/10 bg-[#0B1124] pl-10 pr-3 text-[15px] text-white focus:border-sky-300/60 focus:outline-none focus:ring-4 focus:ring-sky-300/10">
            <option value="usuario">Usuario — funcionalidades normales</option>
            <option value="admin">Administrador — gestión completa</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" variant="cyan" loading={enviando} icon={<UserPlus className="h-4 w-4" />}>Crear cuenta</Button>
        </div>
      </form>
    </Modal>
  )
}
