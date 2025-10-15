#!/bin/bash
set -euo pipefail

ROOT="/Users/liao/infostream-mvp"
WEB_DIR="$ROOT/web"

# Kill stale processes and free ports (5173/5174 vite)
( pkill -f "vite" 2>/dev/null || true )
( lsof -ti:5173 5174 | xargs kill -9 2>/dev/null || true )

# Start frontend
cd "$WEB_DIR"
nohup npm run dev > "$WEB_DIR/dev.out.log" 2>&1 &
echo "Frontend started on :5173 (or :5174 if 5173 busy) (log: $WEB_DIR/dev.out.log)"

cd "$ROOT"
echo "Done. Use scripts/dev-stop.sh to stop all."
echo "Note: This is a frontend-only project. Use 'docker-compose up' in infra/ to start backend services."

