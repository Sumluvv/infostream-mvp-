#!/bin/bash
set -euo pipefail

ROOT="/Users/liao/infostream-mvp"
SERVER_DIR="$ROOT/server"
WEB_DIR="$ROOT/web"

# Kill stale processes and free ports (3001 backend, 5173/5174 vite)
( pkill -f "tsx watch" 2>/dev/null || true )
( pkill -f "vite" 2>/dev/null || true )
( lsof -ti:3001 5173 5174 | xargs kill -9 2>/dev/null || true )

# Start backend
cd "$SERVER_DIR"
nohup npm run dev > "$SERVER_DIR/dev.out.log" 2>&1 &
echo "Backend started on :3001 (log: $SERVER_DIR/dev.out.log)"

# Start frontend
cd "$WEB_DIR"
nohup npm run dev > "$WEB_DIR/dev.out.log" 2>&1 &
echo "Frontend started on :5173 (or :5174 if 5173 busy) (log: $WEB_DIR/dev.out.log)"

cd "$ROOT"
echo "Done. Use scripts/dev-stop.sh to stop all."

