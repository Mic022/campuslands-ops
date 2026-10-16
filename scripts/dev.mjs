// Arranca backend (FastAPI :8000) y frontend (Vite :5173) a la vez: `npm run dev` desde la raíz.
// Sin el backend no hay reservas, así que ambos se levantan juntos y se detienen juntos.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const raiz = join(import.meta.dirname, '..')
const backend = join(raiz, 'backend')
const win = process.platform === 'win32'
const pyVenv = join(backend, '.venv', win ? 'Scripts/python.exe' : 'bin/python')
const python = existsSync(pyVenv) ? pyVenv : win ? 'python' : 'python3'

if (!existsSync(pyVenv)) {
  console.warn('[dev] No existe backend/.venv: se usa el Python del sistema (ver README para instalar dependencias).')
}

const procesos = [
  { nombre: 'api', color: 36, cmd: python, args: ['-m', 'uvicorn', 'app.main:app', '--reload', '--port', '8000'], cwd: backend },
  { nombre: 'web', color: 35, cmd: win ? 'npm.cmd' : 'npm', args: ['run', 'dev'], cwd: join(raiz, 'frontend') }
].map(p => {
  const hijo = spawn(p.cmd, p.args, { cwd: p.cwd, shell: win && p.cmd.endsWith('.cmd'), env: process.env })
  const prefijo = `\x1b[${p.color}m[${p.nombre}]\x1b[0m `
  const volcar = flujo => d => d.toString().split(/\r?\n/).filter(Boolean).forEach(l => flujo.write(prefijo + l + '\n'))
  hijo.stdout.on('data', volcar(process.stdout))
  hijo.stderr.on('data', volcar(process.stderr))
  hijo.on('exit', code => {
    console.log(`${prefijo}terminó (código ${code}); deteniendo todo.`)
    detener()
  })
  return hijo
})

let deteniendo = false
function detener() {
  if (deteniendo) return
  deteniendo = true
  procesos.forEach(h => {
    if (h.exitCode === null) {
      if (win) spawn('taskkill', ['/pid', String(h.pid), '/T', '/F'])
      else h.kill('SIGTERM')
    }
  })
  setTimeout(() => process.exit(0), 500)
}
process.on('SIGINT', detener)
process.on('SIGTERM', detener)
