// Cermin TypeScript dari modul `:shared:pantry-resep` milik Pawonee.
// Sumber kebenaran model: pawonee-app-kmp/shared/pantry-resep + models/schema.json di pawonee-ai-models.

export interface Bahan {
  nama: string;
  jumlah?: string;
}

export interface Resep {
  id: string;
  nama: string;
  bahan: Bahan[];
  langkah: string[];
  menit: number;
  levelPedas: number;
  estimasiBiaya: number;
  grade?: number;
}

export interface Preferensi {
  penggunaId: string;
  levelPedasMaks: number;
  alergi: string[];
  anggaranMaks: number;
}

export const API_BAWAAN = 'http://localhost:8080';

export function urlRekomendasi(api: string, bahan: string[]): string {
  return `${api}/v1/resep/rekomendasi?bahan=${encodeURIComponent(bahan.join(','))}`;
}

export async function ambilRekomendasi(
  bahan: string[],
  api: string = API_BAWAAN,
  ambil: typeof fetch = fetch
): Promise<Resep[]> {
  const res = await ambil(urlRekomendasi(api, bahan), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Backend ${res.status}`);
  return (await res.json()) as Resep[];
}
