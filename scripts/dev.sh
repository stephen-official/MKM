#!/usr/bin/env bash
# Local dev stack, entirely on this machine:
#   MongoDB (27018) + backend (5055) + admin-web (5173) + client-web (5174)
# Usage: scripts/dev.sh up | down | seed | status
#
# Local state lives outside the repo in $MKM_LOCAL (default ~/mkm-local):
#   backend.env   created on first run with local-only settings and fresh secrets
#   mongo-data/   the local database
#   logs/, pids/  process output and ids
# Port 5055 avoids 5000, which macOS AirPlay Receiver usually holds.
set -euo pipefail

R="$(cd "$(dirname "$0")/.." && pwd)"
L="${MKM_LOCAL:-$HOME/mkm-local}"
ENV_FILE="$L/backend.env"
MONGO_PORT="${MONGO_PORT:-27018}"
ADMIN_PORT="${ADMIN_PORT:-5173}"
CLIENT_PORT="${CLIENT_PORT:-5174}"
mkdir -p "$L/logs" "$L/pids" "$L/mongo-data"

if [ ! -f "$ENV_FILE" ]; then
  umask 077
  cat >"$ENV_FILE" <<EOF
PORT=${API_PORT:-5055}
MONGODB_URI=mongodb://127.0.0.1:$MONGO_PORT/mkm_dev
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:$ADMIN_PORT,http://localhost:$CLIENT_PORT
FRONTEND_URL=http://localhost:$ADMIN_PORT
# Optional: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, EMAIL_USER, EMAIL_PASS
EOF
  echo "created $ENV_FILE"
fi

# Exported values win over backend/.env, so the backend never falls back to a remote database.
load_env() { set -a; . "$ENV_FILE"; set +a; }
api_url() { (load_env; echo "http://localhost:${PORT:-5055}/api"); }

running() { [ -f "$L/pids/$1.pid" ] && kill -0 "$(cat "$L/pids/$1.pid")" 2>/dev/null; }
start() { # name, dir, command...
  local name=$1 dir=$2; shift 2
  if running "$name"; then echo "$name already running"; return; fi
  (cd "$dir" || exit 1; nohup "$@" >"$L/logs/$name.log" 2>&1 </dev/null & echo $! >"$L/pids/$name.pid")
}
stop() { running "$1" && kill "$(cat "$L/pids/$1.pid")"; rm -f "$L/pids/$1.pid"; }

need_deps() {
  for app in backend admin-web client-web; do
    [ -d "$R/$app/node_modules" ] || { echo "Installing dependencies (npm run setup)..."; (cd "$R" && npm run setup); return; }
  done
}

up() {
  command -v mongod >/dev/null || { echo "mongod not found. Install MongoDB 7+ first (macOS: brew install mongodb-community)."; exit 1; }
  need_deps
  start mongo "$L" mongod --dbpath "$L/mongo-data" --port "$MONGO_PORT" --bind_ip 127.0.0.1 --replSet rs0
  init_replset
  (load_env; start backend "$R/backend" node src/server.js)
  local api; api=$(api_url)
  (export VITE_API_URL=$api; start admin "$R/admin-web" node_modules/.bin/vite --port "$ADMIN_PORT" --strictPort)
  (export VITE_API_URL=$api; start client "$R/client-web" node_modules/.bin/vite --port "$CLIENT_PORT" --strictPort)
  for _ in $(seq 1 20); do curl -sf "$api/health" >/dev/null && break; sleep 1; done
  status
  echo "Empty database? Run: scripts/dev.sh seed"
}

# Stock writes run in transactions, which need a replica set; a single-node one is enough.
init_replset() {
  (cd "$R/backend" && MONGO_PORT=$MONGO_PORT node --input-type=module -e '
    import mongoose from "mongoose";
    const uri = `mongodb://127.0.0.1:${process.env.MONGO_PORT}/?directConnection=true`;
    for (let i = 0; ; i++) {
      try { await mongoose.connect(uri, { serverSelectionTimeoutMS: 1000 }); break; }
      catch (e) { if (i === 20) throw e; await new Promise((r) => setTimeout(r, 500)); }
    }
    const admin = mongoose.connection.db.admin();
    try { await admin.command({ replSetGetStatus: 1 }); }
    catch {
      await admin.command({ replSetInitiate: { _id: "rs0", members: [{ _id: 0, host: `127.0.0.1:${process.env.MONGO_PORT}` }] } });
      console.log("initialized replica set rs0");
    }
    for (let i = 0; !(await admin.command({ hello: 1 })).isWritablePrimary; i++) {
      if (i === 40) throw new Error("replica set has no primary");
      await new Promise((r) => setTimeout(r, 500));
    }
    await mongoose.disconnect();
  ')
}

down() { for n in client admin backend mongo; do stop "$n"; done; echo stopped; }

seed() {
  load_env
  cd "$R/backend"
  if [ -f "$HOME/mkm-local/live-catalog.json" ]; then
    node src/jobs/seed-dev.js # full dataset; drops the local database first
  else
    echo "No ~/mkm-local/live-catalog.json (ask a maintainer for it); using the small sample seed."
    node src/jobs/seed.js
  fi
}

status() {
  for n in mongo backend admin client; do
    if running "$n"; then echo "$n: running (log $L/logs/$n.log)"; else echo "$n: stopped"; fi
  done
  echo "admin http://localhost:$ADMIN_PORT  client http://localhost:$CLIENT_PORT  api $(api_url)"
}

case "${1:-}" in
  up) up ;; down) down ;; seed) seed ;; status) status ;;
  *) echo "usage: scripts/dev.sh up|down|seed|status"; exit 1 ;;
esac
