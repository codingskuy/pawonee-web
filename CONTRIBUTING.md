# Panduan Kontribusi — pawonee-web

Bahasa artefak (issue, commit, PR, dokumen): Indonesia. Baca `AGENTS.md` dan semua ADR di `docs/decisions/` sebelum menulis kode.

## Alur: fork → branch → atomic commit → PR

1. **Fork** repo ke akun sendiri (`gh repo fork Coding-Skuy/pawonee-web --clone=false`), clone fork, dan tambah remote `upstream` ke repo org.
2. **Branch** dari `upstream/main`. Satu branch = satu tiket = satu PR. Penamaan: `feat/<kode-tiket-lowercase>-<slug>`, `fix/…`, `test/…`, `docs/…`, `chore/…` (contoh: `feat/pwn-web-002-port-rekomendasi`).
3. **Atomic commit**: satu perubahan logis per commit, conventional commits berbahasa Indonesia (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). Commit yang mengubah perilaku wajib memperbarui `CHANGELOG.md`.
4. **Uji lokal** sebelum PR: `bun install && bun run check && bun run test`. Kode baru disertai uji (TDD merah-hijau).
5. **Push** ke fork lalu buka **PR** ke `Coding-Skuy/pawonee-web` base `main`, isi template PR, dan tulis `Closes #N` untuk tiketnya.
6. Tinjauan manusia wajib. Jangan merge sendiri, jangan force-push ke `main`.

## Aturan

- Stack terkunci: Bun + Svelte 5 + SvelteKit 2 + TypeScript. Next.js/React dilarang untuk kode baru.
- Dokumen `versions/v*` immutable. Keputusan arsitektur baru = ADR baru bernomor berurutan; ADR lama tidak diedit.
- Requirement berubah = PR di `Pawonee-TownHall` dulu.
- Jangan commit rahasia (`.env`, kunci, token).
