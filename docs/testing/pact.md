# Uji kontrak Pact (konsumen web)

Tiket PWN-WEB-TEST-PACT. Keputusan: `docs/decisions/ADR-0004-pact-konsumen-web.md`.

## Menjalankan

```sh
bun install
bun run test:pact   # menulis ulang pacts/pawonee-web-pawonee-backend-service.json
```

Empat interaksi (Pact V3):

| Interaksi | Provider state | Respons |
|---|---|---|
| `PUT /v1/profil/KEL-0001` | `keluarga KEL-0001 belum punya profil` | 200 `{data:{tersimpan:true}}` |
| `PUT /v1/profil/KEL-0001` tanpa `Authorization` | (tanpa state) | 401 `TIDAK_TEROTENTIKASI` |
| `GET /v1/stok?idKeluarga=KEL-0001` | `stok keluarga KEL-0001 tersedia` | 200 `data[]` (`namaBahan`, `gram`, `kedaluwarsaHari`, `kodeGrade`) |
| `GET /v1/stok?idKeluarga=KEL-0001` | `keluarga KEL-0001 belum punya profil` | 404 `PROFIL_TIDAK_ADA` |

## Verifikasi provider (di backend)

Branch `test/pwn-be-test-pact` di `pawonee-backend-service` menyediakan `scripts/uji-pact.sh`. Skrip membaca dua folder: interaksi berkredensial (`PACT_DIR`, `Authorization` diganti token segar) dan anonim (`PACT_DIR_ANONIM`). Pisahkan interaksi 401 ke folder anonim:

```sh
RESET_DB=1 DATABASE_URL=postgres://localhost/pawonee_pact \
  PACT_DIR=/jalur/auth PACT_DIR_ANONIM=/jalur/anon scripts/uji-pact.sh
```

Hasil jalan lokal (22 Okt 2026): profil 200, profil 401, dan stok 404 LULUS. Stok 200 GAGAL karena state `stok keluarga KEL-0001 tersedia` tidak dikenal penangan state backend (HTTP 400) dan butuh Pedaree/stub. Tindak lanjut ada di backend.

## Broker (opsional, belum dipakai)

```sh
pact-broker publish pacts --consumer-app-version "$(git rev-parse --short HEAD)" \
  --branch "$(git branch --show-current)" --broker-base-url "$PACT_BROKER_BASE_URL" --broker-token "$PACT_BROKER_TOKEN"
```

Kredensial dibaca dari variabel lingkungan; jangan dikomit.
