#!/bin/zsh
# Install / remove the 04:00 nightly video job.   Usage:  bash shorts/engine/scheduler/install.sh [install|uninstall|status|run-now]
#
# Why Terminal? macOS blocks background launchd jobs from reading ~/Documents ("Operation not permitted", exit 127), and the repo lives
# there. Terminal.app already has that access, so launchd starts Terminal, which runs a tiny wrapper kept in ~/Library/Application Support
# (outside the protected folders) that runs the real job. Alternative: give /bin/zsh Full Disk Access in System Settings and run
# run_nightly.sh directly from launchd.  The Mac must be awake and logged in at 04:00 (see README for the pmset wake command).
set -eu
ACTION="${1:-install}"
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
LABEL="com.beemahealth.nightly-videos"
APPDIR="$HOME/Library/Application Support/BeemaNightly"
WRAP="$APPDIR/run_nightly.command"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
case "$ACTION" in
  install)
    mkdir -p "$APPDIR" "$HOME/Library/LaunchAgents"
    cat > "$WRAP" <<EOF
#!/bin/zsh
# Runs inside Terminal (which can read ~/Documents). Logs to the repo's shorts/engine/state/nightly.log.
/bin/zsh "$REPO/shorts/engine/scheduler/run_nightly.sh"
exit
EOF
    chmod +x "$WRAP"
    cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/usr/bin/open</string><string>-g</string><string>-a</string><string>Terminal</string><string>$WRAP</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>4</integer><key>Minute</key><integer>0</integer></dict>
</dict></plist>
EOF
    plutil -lint "$PLIST" >/dev/null
    launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
    launchctl bootstrap "gui/$(id -u)" "$PLIST"
    echo "installed: $LABEL runs daily at 04:00 (via Terminal). Logs: $REPO/shorts/engine/state/nightly.log"
    ;;
  uninstall)
    launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
    rm -f "$PLIST" "$WRAP"; echo "removed $LABEL" ;;
  status)
    launchctl print "gui/$(id -u)/$LABEL" 2>&1 | grep -E "state =|Hour|Minute|runs =|last exit" || echo "not installed"
    tail -5 "$REPO/shorts/engine/state/nightly.log" 2>/dev/null ;;
  run-now)
    launchctl kickstart "gui/$(id -u)/$LABEL" && echo "started (today's run is idempotent: if tonight's videos were already delivered, nothing is resent)" ;;
  *) echo "usage: install.sh [install|uninstall|status|run-now]"; exit 2 ;;
esac
