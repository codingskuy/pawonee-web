#!/usr/bin/env bash
# Uji properti Schemathesis terhadap rute /api/v1 web (PWN-WEB-TEST-SCHEMATHESIS).
#
# Kontrak: openapi.yaml backend (sumber kebenaran, bukan salinan di repo ini). Web menyajikan kontrak yang sama
# di /api/v1 (kesehatan, resep, rekomendasi lokal; stok dan profil diproksi ke hulu).
#
# Dua mode:
#   - BASE_URL diatur: uji server yang sudah berjalan (mis. staging); skrip tidak menyalakan apa pun.
#   - BASE_URL kosong: bangun web, nyalakan web + hulu palsu (contract/hulu-palsu.ts) lalu matikan semuanya.
# Variabel: SPEC (jalur/URL openapi.yaml; bawaan: unduh dari SPEC_REF di GitHub Coding-Skuy), SPEC_REF (main),
#           PORT (28471), PORT_HULU (28472), MAKS_CONTOH (25), FASE (examples,coverage,fuzzing,stateful),
#           LAPORAN (contract/laporan), ST_ARGS (argumen tambahan).
# Cakupan: hanya 5 jalur yang disajikan web (kesehatan, resep, rekomendasi, stok, profil). /auth/* dan /riwayat-masak
# milik backend dan tidak ada di web. Pemeriksaan ignored_auth dikecualikan: rute lokal web (resep, rekomendasi) publik
# secara sengaja dan stok/profil diautentikasi hulu, bukan web (lihat ADR-0005).
# Prasyarat: Python 3.10+, bun, curl. Telemetry dimatikan.
set -euo pipefail

cd "$(dirname "$0")/.."
PORT="${PORT:-28471}"
PORT_HULU="${PORT_HULU:-28472}"
MAKS_CONTOH="${MAKS_CONTOH:-25}"
FASE="${FASE:-examples,coverage,fuzzing,stateful}"
LAPORAN="${LAPORAN:-contract/laporan}"
SPEC_REF="${SPEC_REF:-main}"
export SCHEMATHESIS_REPORT_ENABLED=0 SCHEMATHESIS_TELEMETRY=off E2E_TELEMETRY_DISABLED=1
export PYTHONPATH="contract${PYTHONPATH:+:$PYTHONPATH}"
export SCHEMATHESIS_HOOKS=hooks
mkdir -p "$LAPORAN"

SPEC="${SPEC:-}"
if [ -z "$SPEC" ]; then
  SPEC="$LAPORAN/openapi.yaml"
  curl -fsSL -o "$SPEC" "https://raw.githubusercontent.com/Coding-Skuy/pawonee-backend-service/${SPEC_REF}/docs/api/openapi.yaml" \
    || { echo "gagal mengunduh spec dari ${SPEC_REF}; atur SPEC=<jalur/URL openapi.yaml>" >&2; exit 1; }
fi

VENV=".venv-schemathesis"
if [ ! -x "$VENV/bin/st" ]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --quiet -r contract/requirements.txt
fi

PIDS=""
if [ -z "${BASE_URL:-}" ]; then
  BASE_URL="http://127.0.0.1:${PORT}/api/v1"
  if curl -s -o /dev/null "http://127.0.0.1:${PORT}/"; then
    echo "port ${PORT} sudah dipakai proses lain; atur PORT=<bebas>" >&2
    exit 1
  fi
  bun run build >"$LAPORAN/build.log" 2>&1 || { tail -20 "$LAPORAN/build.log"; exit 1; }
  bun contract/hulu-palsu.ts "$PORT_HULU" &
  PIDS="$!"
  PAWONEE_API="http://127.0.0.1:${PORT_HULU}/v1" PORT="$PORT" HOST=127.0.0.1 ORIGIN="http://127.0.0.1:${PORT}" \
    bun ./build/index.js >"$LAPORAN/server.log" 2>&1 &
  PIDS="$PIDS $!"
  trap 'kill $PIDS 2>/dev/null || true' EXIT
  for _ in $(seq 1 60); do
    curl -fs "$BASE_URL/kesehatan" >/dev/null 2>&1 && break
    sleep 0.5
  done
fi
curl -fs "$BASE_URL/kesehatan" >/dev/null || { echo "server tidak siap di $BASE_URL"; tail -20 "$LAPORAN/server.log" 2>/dev/null || true; exit 1; }

"$VENV/bin/st" run "$SPEC" \
  --url "$BASE_URL" \
  --phases "$FASE" \
  --checks all \
  --exclude-checks ignored_auth \
  --include-path-regex '^/(kesehatan|resep|rekomendasi|stok|profil)' \
  --max-examples "$MAKS_CONTOH" \
  --report junit --report-dir "$LAPORAN" \
  --suppress-health-check all \
  ${ST_ARGS:-}
