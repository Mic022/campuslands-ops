import { useState } from 'react'
import Datos from './components/Datos.jsx'
import Espacios from './components/Espacios.jsx'
import Panel from './components/Panel.jsx'
import Reglas from './components/Reglas.jsx'

const PESTANAS = [
  { id: 'panel', titulo: 'Panel', Componente: Panel },
  { id: 'espacios', titulo: 'Espacios', Componente: Espacios },
  { id: 'datos', titulo: 'Datos', Componente: Datos },
  { id: 'reglas', titulo: 'Reglas', Componente: Reglas },
]

export default function App() {
  const [activa, setActiva] = useState('panel')
  const { Componente } = PESTANAS.find((p) => p.id === activa)

  return (
    <div className="contenedor">
      <header>
        <h1>Campus Ops</h1>
        <p className="sub">Sistema Central de Gestión Operativa · versión de prueba</p>
        <nav>
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              className={p.id === activa ? 'activa' : ''}
              onClick={() => setActiva(p.id)}
            >
              {p.titulo}
            </button>
          ))}
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">API /docs ↗</a>
        </nav>
      </header>
      <main>
        <Componente />
      </main>
    </div>
  )
}
