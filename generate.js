const BASE = "https://a.prectv70.lol";
const SW = "4F5A9C3D9A86FA54EACEDDD635185/c3c5bd17-e37b-4b94-a944-8a3688a30452/";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const REF = "https://twitter.com/";

(async () => {
  const nonceJson = await fetch(`${BASE}/api/attest/nonce`, {
    headers: { "User-Agent": UA, Referer: REF, Accept: "application/json" }
  }).then(r => r.json());
  const nonce = nonceJson.accessToken || nonceJson.nonce;
  console.log("Nonce:", nonce.slice(0,20));

  let allSeries = [];
  for (const c of "abcdefghijklmnopqrstuvwxyz0123456789") {
    const resp = await fetch(`${BASE}/api/search/${c}/${SW}`, {
      headers: { "User-Agent": UA, Referer: REF, Authorization: `Bearer ${nonce}`, Accept: "application/json" }
    });
    if (!resp.ok) continue;
    const data = await resp.json();
    allSeries = allSeries.concat(data.series || [], data.posters || []);
    console.log(`${c}: ${data.series?.length || 0} dizi`);
  }

  let m3u = "#EXTM3U\n";
  let total = 0;
  const added = new Set();

  for (const serie of allSeries) {
    const sid = serie.id;
    if (!sid) continue;
    const title = String(serie.title || "Dizi").replace(/"/g, "'");
    const logo = String(serie.image || "").replace(/"/g, "'");

    const seasonsResp = await fetch(`${BASE}/api/season/by/serie/${sid}/${SW}`, {
      headers: { "User-Agent": UA, Referer: REF, Authorization: `Bearer ${nonce}`, Accept: "application/json" }
    });
    if (!seasonsResp.ok) continue;
    const seasons = await seasonsResp.json();
    if (!Array.isArray(seasons)) continue;

    for (const season of seasons) {
      const seasonTitle = String(season.title || "Sezon").replace(/"/g, "'");
      for (const ep of season.episodes || []) {
        const epTitle = String(ep.title || "Bölüm").replace(/"/g, "'");
        for (const src of ep.sources || []) {
          if (src.type !== "m3u8") continue;
          const url = (src.url || "").trim();
          if (!url) continue;
          const key = `${sid}|${ep.id}|${url}`;
          if (added.has(key)) continue;
          added.add(key);
          const name = `${title} - ${seasonTitle} - ${epTitle}`;
          m3u += `#EXTINF:-1 tvg-id="${ep.id || ''}" tvg-name="${name}" tvg-logo="${logo}" group-title="Diziler",${name}\n`;
          m3u += `#EXTVLCOPT:http-user-agent=googleusercontent\n`;
          m3u += `#EXTVLCOPT:http-referrer=${REF}\n`;
          m3u += url + "\n";
          total++;
        }
      }
    }
  }

  require('fs').writeFileSync('diziler.m3u', m3u);
  console.log(`Bitti: ${total} bölüm yazıldı.`);
})();
