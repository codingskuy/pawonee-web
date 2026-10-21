# pawonee-web

Web pendamping Pawonee — **Divisi Pawonee (AI Cooking Assistant)**, org `Coding-Skuy`. Bagian dari arsitektur **Opsi A ChefGenie**.

- TownHall: [Coding-Skuy/Pawonee-TownHall](https://github.com/Coding-Skuy/Pawonee-TownHall).
- Modul `:shared:pantry-resep` adalah **milik Pawonee** (sumber: repo `pawonee-app-kmp/shared/pantry-resep`); web ini hanya **mengonsumsi** tipenya lewat `src/lib/pantryResep.ts` yang diselaraskan manual dengan skema bank resep.
- Konsumen hilir: **Pedaree** memakai keluaran resep/preferensi Pawonee sebagai sinyal rekomendasi.

## Teknologi (versi dipin)

| Komponen | Versi |
|---|---|
| Bun | 1.4.x |
| SvelteKit | 2.70.3 |
| Svelte | 5.57.2 (runes) |
| Vite | 7.3.7 |
| TypeScript | 5.9.3 |
| Uji | Vitest 3.2.7 |
| Adapter | `@sveltejs/adapter-node` 5.5.7 (dijalankan dengan Bun, lihat ADR-0003) |

## Cara jalan

```bash
bun install
bun run dev        # http://localhost:5173
bun run check      # svelte-check
bun run test       # vitest
bun run build && bun run start
```

Basis URL backend diatur lewat `PAWONEE_API` (bawaan `http://localhost:8080`).

## Kontrak API

Sama dengan aplikasi KMP: `GET /v1/resep/rekomendasi`, `GET/PUT /v1/preferensi/{id}` pada `pawonee-backend-service`. Skema mengikuti `models/schema.json` di `pawonee-ai-models`.

## Repo terkait

- [pawonee-app-kmp](https://github.com/Coding-Skuy/pawonee-app-kmp) (pemilik `:shared:pantry-resep`)
- [pawonee-backend-service](https://github.com/Coding-Skuy/pawonee-backend-service)
- [pawonee-ai-models](https://github.com/Coding-Skuy/pawonee-ai-models)
