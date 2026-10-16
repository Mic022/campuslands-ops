import { useEffect, useState } from 'react'
import { alExpirarSesion, guardarSesion, leerSesion } from './api.js'
import Datos from './components/Datos.jsx'
import Espacios from './components/Espacios.jsx'
import Login from './components/Login.jsx'
import Panel from './components/Panel.jsx'
import Reglas from './components/Reglas.jsx'

const PESTANAS = [
  { id: 'panel', titulo: 'Panel', Componente: Panel },
  { id: 'espacios', titulo: 'Espacios', Componente: Espacios },
  { id: 'datos', titulo: 'Datos', Componente: Datos, soloAdmin: true },
  { id: 'reglas', titulo: 'Reglas', Componente: Reglas },
]

export default function App() {
  const [sesion, setSesion] = useState(leerSesion)
  const [activa, setActiva] = useState('panel')

  useEffect(() => {
    alExpirarSesion(() => { guardarSesion(null); setSesion(null) })
  }, [])

  function salir() {
    guardarSesion(null)
    setSesion(null)
    setActiva('panel')
  }

  if (!sesion) {
    return (
      <div className="contenedor">
        <h1>Campus Ops</h1>
        <p className="sub">Sistema Central de Gestión Operativa · versión de prueba</p>
        <Login onEntrar={setSesion} />
      </div>
    )
  }

  const visibles = PESTANAS.filter((p) => !p.soloAdmin || sesion.usuario.rol === 'admin')
  const { Componente } = visibles.find((p) => p.id === activa) ?? visibles[0]

  return (
    <div className="contenedor">
      <header>
        <h1>Campus Ops</h1>
        <p className="sub">Sistema Central de Gestión Operativa · versión de prueba</p>
        <nav>
          {visibles.map((p) => (
            <button
              key={p.id}
              className={p.id === activa ? 'activa' : ''}
              onClick={() => setActiva(p.id)}
            >
              {p.titulo}
            </button>
          ))}
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">API /docs ↗</a>
          <span className="sesion">
            {sesion.usuario.nombre} · {sesion.usuario.rol}
            <button onClick={salir}>Salir</button>
          </span>
        </nav>
      </header>
      <main>
        <Componente />
      </main>
    </div>
  )
}
