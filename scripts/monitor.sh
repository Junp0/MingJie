#!/usr/bin/env bash
# Cross-platform system resource monitor for Linux and macOS.
# Usage: ./scripts/monitor.sh [interval_seconds] [log_file]
# Default: 5 second interval, logs to ./logs/monitor_YYYYMMDD_HHMMSS.log

set -u

INTERVAL="${1:-5}"
LOG_DIR="$(cd "$(dirname "$0")/.." && pwd)/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="${2:-$LOG_DIR/monitor_$(date +%Y%m%d_%H%M%S).log}"
PLATFORM="$(uname -s)"

cpu_count() {
    if [ "$PLATFORM" = "Darwin" ]; then
        sysctl -n hw.ncpu 2>/dev/null || echo "unavailable"
    else
        nproc
    fi
}

total_ram() {
    if [ "$PLATFORM" = "Darwin" ]; then
        local bytes
        bytes="$(sysctl -n hw.memsize 2>/dev/null || true)"
        if [ -n "$bytes" ]; then
            awk -v value="$bytes" 'BEGIN {printf "%.0fMB", value/1024/1024}'
        else
            echo "unavailable"
        fi
    else
        awk '/MemTotal/{printf "%.0fMB", $2/1024}' /proc/meminfo
    fi
}

memory_stats() {
    if [ "$PLATFORM" = "Darwin" ]; then
        local page_size free_pages active_pages inactive_pages wired_pages compressed_pages
        page_size="$(pagesize)"
        free_pages="$(vm_stat | awk '/Pages free/ {gsub("\\.", "", $3); print $3}')"
        active_pages="$(vm_stat | awk '/Pages active/ {gsub("\\.", "", $3); print $3}')"
        inactive_pages="$(vm_stat | awk '/Pages inactive/ {gsub("\\.", "", $3); print $3}')"
        wired_pages="$(vm_stat | awk '/Pages wired down/ {gsub("\\.", "", $4); print $4}')"
        compressed_pages="$(vm_stat | awk '/Pages occupied by compressor/ {gsub("\\.", "", $5); print $5}')"
        awk -v page="$page_size" -v free="$free_pages" -v active="$active_pages" \
            -v inactive="$inactive_pages" -v wired="$wired_pages" -v compressed="$compressed_pages" \
            'BEGIN {
                used=(active+inactive+wired+compressed)*page/1024/1024;
                available=free*page/1024/1024;
                printf "RAM: %.0fMB used | Free: %.0fMB\n", used, available
            }'
        sysctl vm.swapusage 2>/dev/null | sed 's/^vm.swapusage: /Swap: /' || true
    else
        free -m | awk 'NR==2{printf "RAM: %dMB used / %dMB total (%.1f%%) | Available: %dMB\n", $3, $2, $3/$2*100, $7}'
        free -m | awk 'NR==3{if($2>0) printf "Swap: %dMB used / %dMB total (%.1f%%)\n", $3, $2, $3/$2*100}'
    fi
}

load_stats() {
    if [ "$PLATFORM" = "Darwin" ]; then
        sysctl -n vm.loadavg 2>/dev/null | awk '{printf "Load avg: %s %s %s\n", $2, $3, $4}' || true
    else
        awk '{printf "Load avg: %s %s %s\n", $1, $2, $3}' /proc/loadavg
    fi
}

top_processes() {
    if [ "$PLATFORM" = "Darwin" ]; then
        ps -Ao user,pid,%mem,%cpu,command 2>/dev/null | head -1 || true
        ps -Ao user,pid,%mem,%cpu,command 2>/dev/null | tail -n +2 | sort -k3 -nr | head -10 || true
    else
        ps aux --sort=-%mem | head -11 | awk 'NR==1{printf "%-8s %5s %5s %s\n", "USER", "%MEM", "%CPU", "COMMAND"} NR>1{printf "%-8s %5s %5s %s\n", $1, $4, $3, $11}'
    fi
}

echo "========================================="
echo "  System Monitor Started"
echo "  Interval: ${INTERVAL}s"
echo "  Log file: $LOG_FILE"
echo "  Press Ctrl+C to stop"
echo "========================================="

# Write header
cat >> "$LOG_FILE" <<HEADER
# System Monitor Log - Started at $(date '+%Y-%m-%d %H:%M:%S')
# Machine: $(uname -n) | Kernel: $(uname -r) | CPUs: $(cpu_count) | RAM: $(total_ram)
# Columns explained in each section
#=========================================
HEADER

cleanup() {
    echo ""
    echo "Monitor stopped at $(date '+%Y-%m-%d %H:%M:%S'). Log: $LOG_FILE"
    exit 0
}
trap cleanup INT TERM

while true; do
    TS=$(date '+%Y-%m-%d %H:%M:%S')

    {
        echo ""
        echo "=== $TS ==="

        # Memory
        echo "--- Memory ---"
        memory_stats

        # CPU load
        echo "--- CPU ---"
        load_stats

        # Top memory consumers
        echo "--- Top 10 Processes by Memory ---"
        top_processes

        # Docker containers (if docker is available)
        if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
            echo "--- Docker Containers ---"
            docker stats --no-stream --format "{{.Name}}: CPU={{.CPUPerc}} MEM={{.MemUsage}}" 2>/dev/null || true
        fi

        # Linux OOM killer check
        if [ "$PLATFORM" = "Linux" ]; then
            OOM_COUNT=$(dmesg 2>/dev/null | grep -c "Out of memory" || true)
            if [ "$OOM_COUNT" -gt 0 ]; then
                echo "!!! WARNING: $OOM_COUNT OOM killer events detected in dmesg !!!"
                dmesg 2>/dev/null | grep "Out of memory" | tail -3
            fi
        fi

    } >> "$LOG_FILE"

    sleep "$INTERVAL"
done
