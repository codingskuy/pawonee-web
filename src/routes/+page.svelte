<script lang="ts">
  import { onMount } from 'svelte';
  import { debounce } from '$lib/debounce';
  import { bacaRiwayat, simpanRiwayat, tambahMasakan, type Masakan } from '$lib/riwayat';

  let { data } = $props();

  interface Hasil {
    resep: { id: string; nama: string; waktuMenit: number };
    skorTotal: number;
    alasan: string;
    belanjaTambahan: { perkiraanRp: number }[];
  }

  const GRAM_BAWAAN = 500; // ASUMSI: tiap bahan yang dipilih dianggap tersedia 500 g
  let dipilih = $state<string[]>([]);
  let jiwa = $state(4);
  let hasil = $state<Hasil[]>([]);
  let modeTanpaStok = $state(false);
  let memuat = $state(false);
  let galat = $state('');
  let riwayat = $state<Masakan[]>([]);

  const gradeDari = $derived(new Map(data.bahan.map((b) => [b.nama, b.kodeGrade])));
  const stok = $derived(
    dipilih.map((nama) => ({
      namaBahan: nama,
      gram: GRAM_BAWAAN,
      kedaluwarsaHari: 3,
      kodeGrade: gradeDari.get(nama) ?? 'NON-G2'
    }))
  );
  const badan = $derived(
    JSON.stringify({
      profil: {
        idKeluarga: 'KEL-0000',
        jumlahJiwa: jiwa,
        alergi: [],
        pantangan: [],
        budgetPerMakan: 35000,
        levelPedas: 3,
        alatMasak: ['kompor', 'wajan', 'panci', 'kukusan', 'blender']
      },
      stok,
      jiwa,
      waktuMaksimalMenit: 45
    })
  );

  async function muat(isi: string) {
    memuat = true;
    galat = '';
    try {
      const res = await fetch('/api/v1/rekomendasi', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-kontrak-versi': 'v1' },
        body: isi
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.pesan ?? 'Gagal memuat rekomendasi');
      hasil = j.data;
      modeTanpaStok = j.modeTanpaStok;
    } catch (e) {
      galat = e instanceof Error ? e.message : 'Gagal memuat rekomendasi';
    } finally {
      memuat = false;
    }
  }

  const tundaMuat = debounce(muat, 300);

  $effect(() => {
    const isi = badan; // dependensi reaktif: dipicu tiap bahan/jiwa berubah
    tundaMuat(isi);
    return () => tundaMuat.batal();
  });

  onMount(() => {
    riwayat = bacaRiwayat(localStorage);
  });

  function tandaiDimasak(r: Hasil) {
    riwayat = tambahMasakan(riwayat, { id: r.resep.id, nama: r.resep.nama, jiwa, tanggal: new Date().toISOString() });
    simpanRiwayat(localStorage, riwayat);
  }
</script>

<svelte:head>
  <title>Pawonee: masak dari isi dapur</title>
</svelte:head>

<main data-testid="beranda">
  <h1>Pawonee: masak dari isi dapur</h1>
  <p>Pilih bahan yang ada, kami sarankan maksimal 5 resep grade-2.</p>

  <label>
    Jumlah jiwa
    <select bind:value={jiwa} data-testid="jiwa">
      {#each [1, 2, 3, 4, 5, 6, 7, 8] as n (n)}<option value={n}>{n}</option>{/each}
    </select>
  </label>

  <fieldset>
    <legend>Bahan di dapur</legend>
    {#each data.bahan as b (b.nama)}
      <label class="bahan"><input type="checkbox" bind:group={dipilih} value={b.nama} /> {b.nama}</label>
    {/each}
  </fieldset>

  {#if galat}<p role="alert" data-testid="galat">{galat}</p>{/if}
  {#if memuat}<p aria-live="polite">Menghitung...</p>{/if}
  {#if modeTanpaStok}<p data-testid="mode-hemat">Stok kosong: menampilkan 5 resep termurah.</p>{/if}

  <ul data-testid="hasil">
    {#each hasil as r (r.resep.id)}
      <li data-testid="item-resep">
        <a href={`/resep/${r.resep.id}?jiwa=${jiwa}`}><strong>{r.resep.nama}</strong></a>
        ({r.resep.waktuMenit} mnt, skor {r.skorTotal.toFixed(1)})
        <small>{r.alasan}</small>
        <button type="button" onclick={() => tandaiDimasak(r)}>Tandai dimasak</button>
      </li>
    {/each}
  </ul>

  <section>
    <h2>Riwayat ({riwayat.length}/30)</h2>
    <ol data-testid="riwayat">
      {#each riwayat as m, i (m.tanggal + i)}
        <li>{m.nama}, {m.jiwa} jiwa, {new Date(m.tanggal).toLocaleDateString('id-ID')}</li>
      {:else}
        <li>Belum ada masakan.</li>
      {/each}
    </ol>
  </section>
</main>

<style>
  main { max-width: 52rem; margin: 0 auto; padding: 1.5rem; font-family: system-ui, sans-serif; }
  .bahan { display: inline-block; margin: 0 1rem 0.25rem 0; }
  li { margin-bottom: 0.5rem; }
  small { display: block; color: #555; }
</style>
