import { bank } from '$lib/server/api/katalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
  // Daftar bahan unik dari bank resep (nama + kodeGrade) untuk pilihan "isi dapur".
  const peta = new Map<string, string>();
  for (const r of bank.resep) for (const b of r.bahan) if (!peta.has(b.nama)) peta.set(b.nama, b.kodeGrade);
  return { bahan: [...peta].map(([nama, kodeGrade]) => ({ nama, kodeGrade })).sort((a, b) => a.nama.localeCompare(b.nama, 'id')) };
};
