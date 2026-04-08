#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Resource limits for low-memory machines (3.6GB RAM) ---
# Backend (NestJS) needs ~300MB, Frontend (webpack) needs ~600-700MB
BACKEND_NODE_OPTIONS="--max-old-space-size=512"
FRONTEND_NODE_OPTIONS="--max-old-space-size=1200"

echo "========================================="
echo "  System Resource Check"
echo "========================================="
free -m | awk 'NR==2{printf "RAM: %dMB used / %dMB total | Available: %dMB\n", $3, $2, $7}'
swapon --show --bytes 2>/dev/null | awk 'NR==2{printf "Swap: %s (size: %s)\n", $1, $3}'
echo ""

# Start monitor in background
echo "Starting system monitor in background..."
"$ROOT_DIR/scripts/monitor.sh" 10 &
MONITOR_PID=$!
echo "Monitor PID: $MONITOR_PID (log in $ROOT_DIR/logs/)"

echo ""
echo "========================================="
echo "  Step 1/4: Starting MySQL (Docker)"
echo "========================================="
cd "$ROOT_DIR"
docker compose up -d mysql
echo "Waiting for MySQL to be healthy..."
until docker compose exec mysql mysqladmin ping -h 127.0.0.1 -uroot -proot_password --silent 2>/dev/null; do
  sleep 2
done
echo "MySQL is ready."

echo ""
echo "========================================="
echo "  Step 2/4: Installing backend dependencies"
echo "========================================="
cd "$ROOT_DIR/backend"
npm install
npx prisma generate

echo ""
echo "========================================="
echo "  Step 3/4: Starting backend"
echo "========================================="
cd "$ROOT_DIR/backend"
NODE_OPTIONS="$BACKEND_NODE_OPTIONS" npm run start:dev &
BACKEND_PID=$!
echo "Backend starting (PID: $BACKEND_PID)..."
# Wait for backend to settle before starting frontend (reduce memory spike)
echo "Waiting for backend to stabilize..."
sleep 10

echo ""
echo "========================================="
echo "  Step 4/4: Installing & starting frontend"
echo "========================================="
cd "$ROOT_DIR/frontend"
if command -v pnpm &>/dev/null; then
  pnpm install
else
  echo "pnpm not found, falling back to npm install"
  npm install
fi
NODE_OPTIONS="$FRONTEND_NODE_OPTIONS" npm run start:dev &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  All services started!"
echo "  Backend PID:  $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo "  Monitor PID:  $MONITOR_PID"
echo "  Frontend: http://localhost:8000"
echo "  Backend:  http://localhost:3001"
echo ""
echo "  NODE_OPTIONS backend:  $BACKEND_NODE_OPTIONS"
echo "  NODE_OPTIONS frontend: $FRONTEND_NODE_OPTIONS"
echo "  Monitor log:  $ROOT_DIR/logs/"
echo "========================================="

cleanup() {
    echo "Shutting down monitor..."
    kill $MONITOR_PID 2>/dev/null || true
    wait
}
trap cleanup INT TERM

wait
