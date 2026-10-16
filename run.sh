#!/usr/bin/env bash
# Levanta todo el proyecto: instala dependencias si faltan, reconstruye la BD
# desde data/raw/ y arranca backend (:8000) y frontend (:5173). Ctrl+C detiene ambos.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  cp .env.example .env
  # Clave de firma de sesiones propia de esta máquina (nunca se sube al repo).
  sed -i.bak "s|^SECRET_KEY=$|SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')|" .env && rm -f .env.bak
  echo "Creado .env desde .env.example"
fi

echo "==> Backend"
cd backend
[ -d .venv ] || python3 -m venv .venv
.venv/bin/python -m pip install -q -r requirements.txt
.venv/bin/python -m scripts.reset_db
.venv/bin/python -m uvicorn app.main:app --reload --port 8000 &
BACKEND=$!
cd ..

echo "==> Frontend"
cd frontend
[ -d node_modules ] || npm install
npm run dev -- --port 5173 &
FRONTEND=$!
cd ..

trap 'kill $BACKEND $FRONTEND 2>/dev/null' INT TERM EXIT
echo
echo "App:  http://localhost:5173"
echo "API:  http://localhost:8000/docs"
wait
