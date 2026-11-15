# EMBERLINE — Dossier

Tactical FPS 5v5 original (three.js 0.187.0, file statis, tanpa network) di halaman
industri "Ember Yard" yang dipanggang matahari: palet rust-orange / pasir / beton.

## Cara main
- **Tujuan:** tim Ember (kamu + 4 bot) selalu menyerang. Menang ronde jika semua
  musuh Cinder tereliminasi atau bom meledak. Kalah jika kamu gugur, bom di-defuse,
  atau waktu 100 detik habis tanpa plant. Pertama sampai **5 ronde** menang match.
- **Bom:** kamu membawa bom. Di dalam Site A **Furnace** atau Site B **Silo**,
  tahan **E** 2,5 detik untuk plant. Fuse 45 detik; musuh akan datang defuse
  (5 detik). Ledakan = menang, defuse = kalah.
- **Ekonomi:** mulai $800. Kill +$300, plant +$300, menang ronde +$3250,
  kalah ronde +$1900. Beli di buy phase (15 detik antar ronde) dengan **B**
  atau tombol 1–5.

## Senjata & granat
| Senjata | Harga | Sifat |
|---|---|---|
| P9 Sidearm | gratis | semi, 12 peluru |
| M12 Breacher (shotgun) | $1200 | 8 pellet, jarak dekat |
| VK-9 Ripper (SMG) | $1500 | auto, fire rate tinggi |
| AR-77 Ember (rifle) | $2700 | auto, serbaguna |
| LW-50 Longshot (sniper) | $4750 | 95 dmg, semi |

Granat: Cinder Frag $300 (ledakan radius, tombol 3), Whiteout Flash $200
(membutakan bot yang melihat, tombol 4).

## Gunplay
Hitscan raycast ke hitbox bot: headshot x4, badan x1, kaki x0.75, plus damage
falloff jarak. Spread + recoil (bloom) bertambah tiap tembakan; penalti bergerak
x2.5, jongkok/diam x0.6, ADS (klik kanan, FOV mengecil) x0.7. Reload **R**,
mag + reserve, auto vs semi sesuai senjata.

## Gerakan & bot
WASD + akselerasi/deselerasi, Shift sprint, Ctrl/C jongkok (profil rendah,
spread kecil), Spasi lompat, collision AABB melawan dinding/kotak.
Bot AI memakai waypoint graph: hold site, patrol, investigate suara tembakan /
ledakan / plant, engage (cek line-of-sight, aim error per jarak, burst fire,
strafe), dan defuse saat bom terpasang. Bot teman mengikuti pemain dari jarak.
Reaction time ~350–600 ms.

## HUD & audio
Health + bar, ammo mag/reserve, uang, timer ronde, skor ronde, pips hidup 5v5,
kill feed, crosshair dinamis, hitmarker, vignette + arah damage, timer bom,
progress ring plant, banner akhir ronde, menu awal, pause Esc.
Semua suara disintesis WebAudio (tembakan per senjata, reload, langkah, kill
chime, beep plant, ledakan, stinger menang/kalah). **M** mute.

## Map
Ember Lane (sightline panjang tengah), A Corridor (barat), B Tunnel (timur),
Mid, Site A Furnace (tungku menyala + glow), Site B Silo (silo kembar).
Semua tekstur prosedural dari canvas (beton, pasir, metal bergelombang, hazard,
marking site); fog, matahari directional + shadow, langit gradient.

## Teknologi
- Modul satu tugas: `state` (state terpusat + konstanta), `rng` (mulberry32),
  `map`, `textures`, `audio`, `weapons`, `player`, `bots`, `combat`,
  `rounds`, `hud`, `viewmodel`, `shots`, `main` (bootstrap + loop).
- Simulasi fixed-step 60 Hz terpisah dari render; scratch vector dipakai ulang,
  tanpa alokasi di hot loop.
- Screenshot deterministik: `?shot=start|play|buy|end&seed=1` — pose dan bot
  ditentukan seed, lalu frame dibekukan dengan `window.__shotReady`.

## Kontrol
WASD gerak · Mouse bidik · Klik tembak · Klik kanan ADS · R reload ·
Shift sprint · Ctrl/C jongkok · Spasi lompat · E pasang bom · B beli ·
1–5 beli senjata · 3/4 granat · M mute · Esc jeda.
