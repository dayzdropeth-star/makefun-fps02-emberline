// Procedural canvas textures only — no external art. Palette: rust-orange / sand / concrete.
import * as THREE from 'three';

function canvasTex(size, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function speckle(ctx, s, n, colors, aMin = 0.05, aMax = 0.22, rMax = 3) {
  for (let i = 0; i < n; i += 1) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    ctx.globalAlpha = aMin + Math.random() * (aMax - aMin);
    const r = 0.5 + Math.random() * rMax;
    ctx.fillRect(Math.random() * s, Math.random() * s, r, r);
  }
  ctx.globalAlpha = 1;
}
function cracks(ctx, s, n, color) {
  ctx.strokeStyle = color; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
  for (let i = 0; i < n; i += 1) {
    let x = Math.random() * s, y = Math.random() * s;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 5; k += 1) { x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function makeTextures() {
  const concrete = canvasTex(256, (ctx, s) => {
    ctx.fillStyle = '#8d8578'; ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 2600, ['#7a7266', '#9b9384', '#6b6357', '#a8a094']);
    cracks(ctx, s, 7, '#5d564b');
    ctx.strokeStyle = '#6f675c'; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, s - 2, s - 2);
  }, 8, 8);
  const sand = canvasTex(256, (ctx, s) => {
    ctx.fillStyle = '#c9a06b'; ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 3200, ['#b98f57', '#d9b47e', '#a87f4e', '#e2c491'], 0.06, 0.25, 2);
  }, 10, 10);
  const metal = canvasTex(256, (ctx, s) => {
    ctx.fillStyle = '#7e6f5e'; ctx.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 16) {
      ctx.fillStyle = (x / 16) % 2 ? '#857667' : '#746556';
      ctx.fillRect(x, 0, 16, s);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, 0, 2, s);
    }
    speckle(ctx, s, 900, ['#9a4a22', '#5d4a38', '#b06a35'], 0.08, 0.3, 4); // rust spots
  }, 2, 2);
  const hazard = canvasTex(256, (ctx, s) => {
    ctx.fillStyle = '#d8b13a'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#1c1a17';
    for (let i = -s; i < s * 2; i += 64) {
      ctx.beginPath(); ctx.moveTo(i, s); ctx.lineTo(i + 32, 0); ctx.lineTo(i + 64, 0); ctx.lineTo(i + 32, s); ctx.closePath(); ctx.fill();
    }
    speckle(ctx, s, 500, ['#8a6d1d', '#000'], 0.1, 0.3, 3);
  }, 4, 1);
  const siteA = canvasTex(256, (ctx, s) => {
    ctx.fillStyle = '#3d332c'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#e86a1c'; ctx.font = 'bold 92px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('A', s / 2, s / 2);
    ctx.strokeStyle = '#e86a1c'; ctx.lineWidth = 10; ctx.strokeRect(14, 14, s - 28, s - 28);
    speckle(ctx, s, 700, ['#000', '#7a4a22'], 0.1, 0.3, 3);
  });
  const siteB = canvasTex(256, (ctx, s) => {
    ctx.fillStyle = '#3d332c'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#d8b13a'; ctx.font = 'bold 92px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('B', s / 2, s / 2);
    ctx.strokeStyle = '#d8b13a'; ctx.lineWidth = 10; ctx.strokeRect(14, 14, s - 28, s - 28);
    speckle(ctx, s, 700, ['#000', '#7a6a22'], 0.1, 0.3, 3);
  });
  const crate = canvasTex(256, (ctx, s) => {
    ctx.fillStyle = '#6e5136'; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#4a3520'; ctx.lineWidth = 10; ctx.strokeRect(6, 6, s - 12, s - 12);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s, s); ctx.moveTo(s, 0); ctx.lineTo(0, s); ctx.stroke();
    speckle(ctx, s, 1200, ['#5a3f28', '#82663f', '#3f2d1a'], 0.08, 0.25, 3);
  });
  // Sky gradient (used on a big inverted sphere / scene background via canvas).
  const sky = canvasTex(512, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#2e4a6b'); g.addColorStop(0.45, '#c97e3e'); g.addColorStop(0.62, '#e8a04c'); g.addColorStop(1, '#8a5a30');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#fff2cf'; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(s * 0.72, s * 0.3, 26, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  });
  return { concrete, sand, metal, hazard, siteA, siteB, crate, sky };
}
