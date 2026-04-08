#!/usr/bin/env bash
# System resource monitor - logs CPU, memory, disk I/O, and process info
# Usage: ./scripts/monitor.sh [interval_seconds] [log_file]
# Default: 5 second interval, logs to ./logs/monitor_YYYYMMDD_HHMMSS.log

set -e

INTERVAL="${1:-5}"
LOG_DIR="$(cd "$(dirname "$0")/.." && pwd)/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="${2:-$LOG_DIR/monitor_$(date +%Y%m%d_%H%M%S).log}"

echo "========================================="
echo "  System Monitor Started"
echo "  Interval: ${INTERVAL}s"
echo "  Log file: $LOG_FILE"
echo "  Press Ctrl+C to stop"
echo "========================================="

# Write header
cat >> "$LOG_FILE" <<HEADER
# System Monitor Log - Started at $(date '+%Y-%m-%d %H:%M:%S')
# Machine: $(uname -n) | Kernel: $(uname -r) | CPUs: $(nproc) | RAM: $(awk '/MemTotal/{printf "%.0fMB", $2/1024}' /proc/meminfo)
# Columns explained in each section
#=========================================
HEADER

cleanup() {
    echo ""
    echo "Monitor stopped at $(date '+%Y-%m-%d %H:%M:%S'). Log: $LOG_FILE"
    exit 0
}
trap cleanup INT TERM

PREV_READ=0
PREV_WRITE=0
PREV_TIME=0

while true; do
    TS=$(date '+%Y-%m-%d %H:%M:%S')

    {
        echo ""
        echo "=== $TS ==="

        # Memory
        echo "--- Memory ---"
        free -m | awk 'NR==2{printf "RAM: %dMB used / %dMB total (%.1f%%) | Available: %dMB\n", $3, $2, $3/$2*100, $7}'
        free -m | awk 'NR==3{if($2>0) printf "Swap: %dMB used / %dMB total (%.1f%%)\n", $3, $2, $3/$2*100}'

        # CPU load
        echo "--- CPU ---"
        awk '{printf "Load avg: %s %s %s\n", $1, $2, $3}' /proc/loadavg

        # Disk I/O (from /proc/diskstats for the main disk)
        echo "--- Disk I/O ---"
        DISK_DEV=$(lsblk -ndo NAME,TYPE | awk '$2=="disk"{print $1; exit}')
        if [ -n "$DISK_DEV" ]; then
            # Fields: reads_completed sectors_read writes_completed sectors_written
            DISK_STATS=$(awk -v dev="$DISK_DEV" '$3==dev{print $4, $6, $8, $10}' /proc/diskstats)
            CUR_READ=$(echo "$DISK_STATS" | awk '{print $2}')
            CUR_WRITE=$(echo "$DISK_STATS" | awk '{print $4}')
            CUR_TIME=$(date +%s)

            if [ "$PREV_TIME" -gt 0 ] && [ "$CUR_TIME" -gt "$PREV_TIME" ]; then
                ELAPSED=$((CUR_TIME - PREV_TIME))
                # sectors are 512 bytes
                READ_KB=$(( (CUR_READ - PREV_READ) * 512 / 1024 / ELAPSED ))
                WRITE_KB=$(( (CUR_WRITE - PREV_WRITE) * 512 / 1024 / ELAPSED ))
                printf "Disk %s: Read %d KB/s | Write %d KB/s\n" "$DISK_DEV" "$READ_KB" "$WRITE_KB"
            else
                echo "Disk $DISK_DEV: (collecting baseline...)"
            fi
            PREV_READ=$CUR_READ
            PREV_WRITE=$CUR_WRITE
            PREV_TIME=$CUR_TIME
        fi

        # Top memory consumers
        echo "--- Top 10 Processes by Memory ---"
        ps aux --sort=-%mem | head -11 | awk 'NR==1{printf "%-8s %5s %5s %s\n", "USER", "%MEM", "%CPU", "COMMAND"} NR>1{printf "%-8s %5s %5s %s\n", $1, $4, $3, $11}'

        # Docker containers (if docker is available)
        if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
            echo "--- Docker Containers ---"
            docker stats --no-stream --format "{{.Name}}: CPU={{.CPUPerc}} MEM={{.MemUsage}}" 2>/dev/null || true
        fi

        # OOM killer check
        OOM_COUNT=$(dmesg 2>/dev/null | grep -c "Out of memory" || true)
        if [ "$OOM_COUNT" -gt 0 ]; then
            echo "!!! WARNING: $OOM_COUNT OOM killer events detected in dmesg !!!"
            dmesg 2>/dev/null | grep "Out of memory" | tail -3
        fi

    } | tee -a "$LOG_FILE"

    sleep "$INTERVAL"
done
