#!/usr/bin/env bash
# Menjalankan alur Maestro web terhadap web hasil build (`bun run build` + `bun ./build/index.js`).
# Prasyarat: bun, Maestro CLI >= 2 (mode web masih beta), Google Chrome. Tanpa backend: rute yang diuji bersifat lokal.
# Pemakaian: .maestro/jalankan.sh [alur.yaml ...]   (PORT bawaan 18931; SKIP_BUILD=1 melewati build)
set -euo pipefail
cd "$(dirname "$0")/.."
export MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true E2E_TELEMETRY_DISABLED=1
PORT="${PORT:-18931}"
command -v maestro >/dev/null || { echo "maestro tidak terpasang (https://maestro.dev); lihat docs/testing/maestro.md" >&2; exit 127; }
if curl -s -o /dev/null "http://127.0.0.1:${PORT}/"; then echo "port ${PORT} sudah dipakai; atur PORT=<bebas>" >&2; exit 1; fi

[ "${SKIP_BUILD:-0}" = "1" ] || bun run build >/dev/null
PORT="$PORT" HOST=127.0.0.1 ORIGIN="http://127.0.0.1:${PORT}" bun ./build/index.js &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
for _ in $(seq 1 60); do curl -fs "http://127.0.0.1:${PORT}/" >/dev/null 2>&1 && break; sleep 0.5; done

alur=("$@"); [[ ${#alur[@]} -gt 0 ]] || alur=(.maestro/smoke.yaml .maestro/bagi-resep-publik.yaml)
maestro test -e "WEB_URL=http://127.0.0.1:${PORT}" "${alur[@]}"
