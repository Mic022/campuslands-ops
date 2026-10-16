import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

export interface ToastMessage {
  id: string
  tipo: 'exito' | 'error' | 'advertencia' | 'info'
  codigo?: string
  mensaje: string
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const config = {
            exito: {
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
              border: 'border-emerald-500/40',
              bg: 'bg-emerald-950/80',
              title: 'Operación Exitosa'
            },
            error: {
              icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
              border: 'border-rose-500/40',
              bg: 'bg-rose-950/80',
              title: 'Regla o Validación Rechazada'
            },
            advertencia: {
              icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
              border: 'border-amber-500/40',
              bg: 'bg-amber-950/80',
              title: 'Advertencia del Sistema'
            },
            info: {
              icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
              border: 'border-cyan-500/40',
              bg: 'bg-cyan-950/80',
              title: 'Notificación'
            }
          }[toast.tipo]

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`pointer-events-auto p-4 rounded-xl border ${config.border} ${config.bg} backdrop-blur-md shadow-2xl flex items-start gap-3`}
            >
              {config.icon}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
                    {config.title}
                  </h4>
                  {toast.codigo && (
                    <span className="font-mono text-[10px] bg-slate-900/60 px-1.5 py-0.5 rounded text-slate-300">
                      {toast.codigo}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-200 mt-1 leading-snug break-words">
                  {toast.mensaje}
                </p>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/40 transition-colors cursor-pointer"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
