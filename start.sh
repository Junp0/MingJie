#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Resource limits for low-memory machines (3.6GB RAM) ---
# Backend (NestJS) needs ~300MB, Frontend (webpack) needs ~600-700MB
BACKEND_NODE_OPTIONS="--max-old-space-size=512"
FRONTEND_NODE_OPTIONS="--max-old-space-size=1200"
MONITOR_PID=""
BACKEND_PID=""
FRONTEND_PID=""
ENABLE_MONITOR="${ENABLE_MONITOR:-0}"

cleanup() {
    local exit_code=$?
    trap - EXIT INT TERM

    for pid in "$FRONTEND_PID" "$BACKEND_PID" "$MONITOR_PID"; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done

    wait 2>/dev/null || true
    exit "$exit_code"
}
trap cleanup EXIT INT TERM

wait_for_url() {
    local name="$1"
    local url="$2"
    local pid="$3"
    local attempts="${4:-60}"

    for ((i = 1; i <= attempts; i++)); do
        if ! kill -0 "$pid" 2>/dev/null; then
            echo "$name exited before becoming ready."
            wait "$pid"
            return 1
        fi

        if curl --silent --output /dev/null "$url"; then
            echo "$name is ready."
            return 0
        fi

        sleep 2
    done

    echo "Timed out waiting for $name at $url."
    return 1
}

echo "========================================="
echo "  System Resource Check"
echo "========================================="
case "$(uname -s)" in
    Darwin)
        TOTAL_RAM_BYTES="$(sysctl -n hw.memsize 2>/dev/null || true)"
        CPU_COUNT="$(sysctl -n hw.ncpu 2>/dev/null || true)"
        if [ -n "$TOTAL_RAM_BYTES" ]; then
            TOTAL_RAM="${TOTAL_RAM_BYTES} bytes"
        else
            TOTAL_RAM="unavailable"
        fi
        echo "Platform: macOS | CPUs: ${CPU_COUNT:-unavailable} | RAM: $TOTAL_RAM"
        ;;
    Linux)
        free -m | awk 'NR==2{printf "RAM: %dMB used / %dMB total | Available: %dMB\n", $3, $2, $7}'
        swapon --show --bytes 2>/dev/null | awk 'NR==2{printf "Swap: %s (size: %s)\n", $1, $3}'
        ;;
    *)
        echo "Platform: $(uname -s)"
        ;;
esac
echo ""

if [ "$ENABLE_MONITOR" = "1" ]; then
    echo "Starting system monitor in background..."
    "$ROOT_DIR/scripts/monitor.sh" 10 >/dev/null 2>&1 &
    MONITOR_PID=$!
    echo "Monitor PID: $MONITOR_PID (log in $ROOT_DIR/logs/)"
else
    echo "System monitor disabled (set ENABLE_MONITOR=1 to enable)."
fi

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
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created backend/.env from .env.example."
fi
npm install
npx prisma generate
npx prisma migrate deploy

echo ""
echo "========================================="
echo "  Step 3/4: Starting backend"
echo "========================================="
cd "$ROOT_DIR/backend"
NODE_OPTIONS="$BACKEND_NODE_OPTIONS" npm run start:dev &
BACKEND_PID=$!
echo "Backend starting (PID: $BACKEND_PID)..."
wait_for_url "Backend" "http://127.0.0.1:3001/docs" "$BACKEND_PID" 60

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
echo "Frontend starting (PID: $FRONTEND_PID)..."
wait_for_url "Frontend" "http://127.0.0.1:8000" "$FRONTEND_PID" 90

echo ""
echo "========================================="
echo "  All services started!"
echo "  Backend PID:  $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
if [ -n "$MONITOR_PID" ]; then
    echo "  Monitor PID:  $MONITOR_PID"
fi
echo "  Frontend: http://localhost:8000"
echo "  Backend:  http://localhost:3001"
echo ""
echo "  NODE_OPTIONS backend:  $BACKEND_NODE_OPTIONS"
echo "  NODE_OPTIONS frontend: $FRONTEND_NODE_OPTIONS"
if [ -n "$MONITOR_PID" ]; then
    echo "  Monitor log:  $ROOT_DIR/logs/"
fi
echo "========================================="

wait
