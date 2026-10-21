import { env } from '$env/dynamic/private';
import { ambilRekomendasi, API_BAWAAN, type Resep } from '$lib/pantryResep';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const resep: Resep[] = await ambilRekomendasi(
    ['tempe', 'bawang'],
    env.PAWONEE_API ?? API_BAWAAN,
    fetch
  ).catch(() => []);
  return { resep };
};
