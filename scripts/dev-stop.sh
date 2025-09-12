#!/bin/bash
set -euo pipefail

# Stop backend (tsx) and frontend (vite) and free common ports
( pkill -f "tsx watch" 2>/dev/null || true )
( pkill -f "vite" 2>/dev/null || true )
( lsof -ti:3001 5173 5174 | xargs kill -9 2>/dev/null || true )

echo "Stopped dev processes and freed ports 3001/5173/5174."

