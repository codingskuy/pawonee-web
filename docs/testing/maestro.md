# Alur Maestro web

Tiket PWN-WEB-TEST-MAESTRO. Keputusan dan status beta: `docs/decisions/ADR-0006-maestro-web-beta.md`.

## Menjalankan

Prasyarat: `bun`, Maestro CLI >= 2 (diuji 2.11.0), Google Chrome.

```sh
bun install
.maestro/jalankan.sh                         # build, nyalakan web di :18931, jalankan semua alur
SKIP_BUILD=1 .maestro/jalankan.sh .maestro/smoke.yaml
```

Tanpa `maestro` di PATH skrip berhenti dengan kode 127 dan pesan jelas.

| Alur | Yang diperiksa |
|---|---|
| `smoke.yaml` | beranda (`beranda`), pemilih jiwa (`jiwa`), mode hemat (`mode-hemat`) dan kartu rekomendasi (`item-resep`) tampil |
| `bagi-resep-publik.yaml` | `/resep/R-04?jiwa=4` tanpa login: `resep-publik`, `buka-aplikasi`, `cetak`, teks "untuk 4 jiwa" dan "Nasi Goreng Kampung" |

Selector mengikuti `flow/flow.json` pawonee-design (`data-testid` = `testTag`).

## Hasil jalan lokal (22 Okt 2026, Maestro 2.11.0)

Dua jalan berturut-turut: `2/2 Flows Passed` (59 dtk dan 37 dtk). Penyempurnaan selama penulisan: asersi teks gabungan dahulu gagal sampai memakai regex.
