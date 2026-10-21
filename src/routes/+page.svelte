<script lang="ts">
  let { data } = $props();
  const resep = $derived(data.resep);
</script>

<main style="padding: 24px; font-family: system-ui" data-testid="beranda">
  <h1>Pawonee — Masak dari isi dapur</h1>
  <p>Rekomendasi resep dari bank resep grade-2 milik Pawonee.</p>
  <ul>
    {#each resep as r (r.id)}
      <li data-testid="item-resep">
        <strong>{r.nama}</strong> — {r.menit} mnt • pedas {r.levelPedas}/5
      </li>
    {:else}
      <li data-testid="backend-mati">Backend belum menyala. Nyalakan pawonee-backend-service dahulu.</li>
    {/each}
  </ul>
</main>
