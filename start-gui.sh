#!/usr/bin/env bash
#
# A browser-reachable Linux desktop for this Codespace.
#
#   bash start-gui.sh
#
# Xvfb draws to a virtual screen, fluxbox gives windows their title bars and lets you
# move and resize them, x11vnc exposes that screen over VNC, and websockify serves noVNC
# so it can be opened in a browser tab.
#
#   6080  noVNC over WebSockets — this is the one to open
#   5900  raw VNC, for a native client on the same machine
#
# Keep 6080 **Private** in the Ports tab. Codespaces forwards it to your authenticated
# session either way, and x11vnc here runs with -nopw: Public would mean anyone with the
# URL can drive the desktop. Only make it Public if you actually need to share it, and
# stop it again afterwards.
#
# Re-running is safe. Anything already up is left alone; anything missing is started.
set -euo pipefail

DISPLAY_NUM="${DISPLAY_NUM:-:1}"
# 1024x768 is the usual default, but this app is a dense HRMS and its tables need room.
GEOMETRY="${GEOMETRY:-1600x1000x24}"
VNC_PORT="${VNC_PORT:-5900}"
WEB_PORT="${WEB_PORT:-6080}"

log() { printf '\033[0;36m▸\033[0m %s\n' "$1"; }

# ── Dependencies ──────────────────────────────────────────────────────
missing=()
for pkg in xvfb x11vnc fluxbox websockify novnc; do
    dpkg -s "$pkg" >/dev/null 2>&1 || missing+=("$pkg")
done

if [ ${#missing[@]} -gt 0 ]; then
    log "Installing: ${missing[*]}"
    sudo apt-get update -y -qq
    sudo apt-get install -y -qq "${missing[@]}"
else
    log "Dependencies already installed"
fi

# ── Virtual display ───────────────────────────────────────────────────
# `-x` matches the whole process name, never the shell issuing the command. `pgrep -f`
# would match this script's own command line and report a false positive.
if pgrep -x Xvfb >/dev/null && xdpyinfo -display "$DISPLAY_NUM" >/dev/null 2>&1; then
    log "Display $DISPLAY_NUM already running"
else
    log "Starting Xvfb on $DISPLAY_NUM at $GEOMETRY"
    Xvfb "$DISPLAY_NUM" -screen 0 "$GEOMETRY" -nolisten tcp >/dev/null 2>&1 &
    for _ in $(seq 1 30); do
        xdpyinfo -display "$DISPLAY_NUM" >/dev/null 2>&1 && break
        sleep 0.2
    done
fi

export DISPLAY="$DISPLAY_NUM"

# ── Window manager ────────────────────────────────────────────────────
# Without one, windows have no title bar and cannot be moved, resized or focused —
# which makes the desktop nearly unusable even though it renders.
if pgrep -x fluxbox >/dev/null; then
    log "fluxbox already running"
else
    log "Starting fluxbox"
    fluxbox >/dev/null 2>&1 &
    sleep 1
fi

# ── VNC ───────────────────────────────────────────────────────────────
if pgrep -x x11vnc >/dev/null; then
    log "x11vnc already running on :$VNC_PORT"
else
    log "Starting x11vnc on :$VNC_PORT"
    x11vnc -display "$DISPLAY_NUM" -nopw -forever -shared -rfbport "$VNC_PORT" -quiet \
        >/dev/null 2>&1 &
    sleep 1
fi

# ── noVNC ─────────────────────────────────────────────────────────────
if pgrep -x websockify >/dev/null; then
    log "websockify already running on :$WEB_PORT"
else
    log "Starting noVNC on :$WEB_PORT"
    websockify --web=/usr/share/novnc "$WEB_PORT" "localhost:$VNC_PORT" >/dev/null 2>&1 &
    sleep 1
fi

# ── Done ──────────────────────────────────────────────────────────────
url="http://localhost:$WEB_PORT/vnc.html?autoconnect=true&resize=scale"
if [ -n "${CODESPACE_NAME:-}" ]; then
    domain="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
    url="https://${CODESPACE_NAME}-${WEB_PORT}.${domain}/vnc.html?autoconnect=true&resize=scale"
fi

cat <<EOF

  GUI ready on $DISPLAY_NUM ($GEOMETRY)

  Open:  $url

  Or use the Ports tab, port $WEB_PORT, and add /vnc.html to the URL.
  There is no VNC password, so leave the port Private.

  Launch something into it:
    DISPLAY=$DISPLAY_NUM <command> &

EOF
