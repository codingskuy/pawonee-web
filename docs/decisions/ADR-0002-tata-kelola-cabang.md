# ADR-0002 — Tata kelola cabang dan alur kontribusi pawonee-web

Status: Diterima | Tanggal: 2026-10-21

## Konteks

Belum ada alur kerja cabang yang tertulis. Beberapa kontributor (manusia dan agent AI) akan mengubah repo secara paralel; perlu aturan yang membuat riwayat mudah ditinjau dan di-revert. Tiket: PWN-WEB-GOV-BRANCH (issue #6). Format mengikuti ADR-0001.

## Keputusan

1. Kontribusi lewat **fork → branch → atomic commit → PR** ke `main` (rinci di `CONTRIBUTING.md`); satu branch = satu tiket = satu PR dengan `Closes #N`.
2. Penamaan branch `feat|fix|test|docs|chore/<kode-tiket-lowercase>-<slug>`; commit memakai conventional commits berbahasa Indonesia.
3. `.github/pull_request_template.md` dan `.github/CODEOWNERS` (owner `@Coding-Skuy`) menjadi bagian repo.
4. **Usulan** proteksi `main` (hanya ditulis di sini, tidak diterapkan oleh PR ini): wajib PR, minimal 1 review CODEOWNERS, status check `bun run check` + `bun run test` hijau, larang force-push dan penghapusan, branch harus mutakhir sebelum merge.

## Konsekuensi

- Pengaturan proteksi branch tetap dilakukan manusia pemilik repo; tidak ada perubahan pengaturan repo oleh PR.
- Setiap perubahan alur kerja berikutnya perlu ADR baru yang menggantikan ADR ini.
