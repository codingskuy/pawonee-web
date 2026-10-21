<script lang="ts">
  let { data } = $props();
  const deepLink = $derived(`pawonee://resep/${data.resep.id}?jiwa=${data.jiwa}`);
  const judul = $derived(`${data.resep.nama} untuk ${data.jiwa} jiwa | Pawonee`);
</script>

<svelte:head>
  <title>{judul}</title>
  <meta property="og:title" content={judul} />
  <meta property="og:description" content={`${data.resep.waktuMenit} menit, kompor tunggal, bahan grade-2.`} />
</svelte:head>

<main data-testid="resep-publik">
  <h1>{data.resep.nama}</h1>
  <p>{data.resep.waktuMenit} menit, untuk {data.jiwa} jiwa. Perkiraan biaya Rp{data.resep.kisaranBiayaRp[0].toLocaleString('id-ID')} (4 jiwa).</p>

  <nav class="aksi">
    <a class="tombol" href={deepLink} data-testid="buka-aplikasi">Buka di aplikasi</a>
    <button type="button" class="tombol" onclick={() => window.print()} data-testid="cetak">Cetak</button>
  </nav>

  <h2>Bahan</h2>
  <ul>
    {#each data.bahanTerskala as b (b.namaBahan)}
      <li>{b.namaBahan}: {b.gram} {data.satuan[b.namaBahan] === 'gram' ? 'g' : data.satuan[b.namaBahan]}</li>
    {/each}
  </ul>

  <h2>Langkah</h2>
  <ol>
    {#each data.resep.langkah as l, i (i)}<li>{l}</li>{/each}
  </ol>
  <p class="catatan">Alergen: {data.resep.alergen.length ? data.resep.alergen.join(', ') : 'tidak ada'}. Alat: {data.resep.alatWajib.join(', ')}.</p>
</main>

<style>
  main { max-width: 42rem; margin: 0 auto; padding: 1.5rem; font-family: system-ui, sans-serif; }
  .aksi { display: flex; gap: 0.75rem; margin: 1rem 0; }
  .tombol { padding: 0.5rem 1rem; border: 1px solid #333; border-radius: 6px; background: #fff; color: #111; text-decoration: none; font: inherit; cursor: pointer; }
  .catatan { color: #555; font-size: 0.9rem; }

  @media print {
    @page { size: A4; margin: 15mm; }
    main { max-width: none; padding: 0; font-size: 11pt; }
    .aksi { display: none; }
    h1 { font-size: 18pt; margin: 0 0 4pt; }
    h2 { font-size: 13pt; margin: 8pt 0 3pt; }
    ul, ol { margin: 0; padding-left: 1.2em; }
    li { break-inside: avoid; }
  }
</style>
