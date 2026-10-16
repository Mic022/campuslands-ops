import React from 'react'
import { navegar } from '../../auth/rutas'

/** Enlace real (<a href>, abre en otra pestaña con clic medio) que navega sin recargar la app. */
export const EnlaceInterno: React.FC<{ a: string; className?: string; children: React.ReactNode }> = ({ a, className = '', children }) => (
  <a
    href={a}
    onClick={e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      navegar(a)
    }}
    className={`enlace-acceso rounded-sm transition-colors hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1124] ${className}`}
  >
    {children}
  </a>
)
