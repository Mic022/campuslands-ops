import { useState } from 'react'
import { api, guardarSesion } from '../api.js'
import { ErrorApi } from './Estado.jsx'

export default function Login({ onEntrar }) {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  async function entrar(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      const sesion = await api('/auth/login', { method: 'POST', body: { usuario, clave } })
      guardarSesion(sesion)
      onEntrar(sesion)
    } catch (err) {
      setError(err)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="login" onSubmit={entrar}>
      <h2>Iniciar sesión</h2>
      <label>
        Usuario
        <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" required />
      </label>
      <label>
        Clave
        <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" required />
      </label>
      {error && <ErrorApi error={error} />}
      <button type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
    </form>
  )
}
