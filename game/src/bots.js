// Bot AI: waypoint navigation, hold / patrol / investigate / engage / defuse states,
// line-of-sight checks, burst fire with reaction time and aim error, strafing.
// Friendly bots shadow the player; enemies push sites and react to noise.
import * as THREE from 'three';
import { WAYPOINTS, nearestWaypoint, nextWaypoint, collideCircle } from './map.js';
import { WEAPONS } from './weapons.js';

const BOT_W = WEAPONS.VK9; // bots all carry the Ripper for readable TTK

function botMesh(team) {
  const g = new THREE.Group();
  const accent = team === 'ember' ? 0x2fae9e : 0xc2491e;
  const cloth = new THREE.MeshStandardMaterial({ color: team === 'ember' ? 0x2a4a46 : 0x4a2a22, roughness: 0.85 });
  const acc = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5, emissive: accent, emissiveIntensity: 0.35 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), cloth);
  torso.position.y = 1.15; torso.userData.part = 'body'; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xc9a06b, roughness: 0.7 }));
  head.position.y = 1.68; head.userData.part = 'head'; g.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.05), acc);
  visor.position.set(0, 1.7, 0.18); g.add(visor);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.3), cloth);
  legs.position.y = 0.38; legs.userData.part = 'legs'; g.add(legs);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.5 }));
  gun.position.set(0.28, 1.25, 0.2); g.add(gun);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.1, 0.34), acc);
  band.position.y = 1.42; g.add(band);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

export function createBots(scene, colliders, shootables, rng, audio) {
  const ray = new THREE.Raycaster(); ray.far = 90;
  const _o = new THREE.Vector3(); const _d = new THREE.Vector3();
  const list = [];
  const hitMeshes = [];
  let idc = 0;

  function spawn(team, idx, x, z) {
    const mesh = botMesh(team);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const b = {
      id: idc, team, idx, mesh, pos: mesh.position,
      hp: 100, alive: true, yaw: team === 'ember' ? Math.PI : 0,
      state: team === 'ember' ? 'follow' : 'push',
      wp: nearestWaypoint(x, z), targetWp: null, holdT: 0,
      reactT: 0, burstLeft: 0, burstT: 0, fireCd: 0, strafeDir: 1, strafeT: 0,
      target: null, blindT: 0, speed: 3.4 + rng.range(-0.3, 0.5),
      investigate: null, site: null, mag: BOT_W.mag, reloadT: 0,
    };
    idc += 1;
    mesh.traverse((o) => {
      if (o.userData.part) { o.userData.botId = b.id; hitMeshes.push(o); }
    });
    list.push(b);
    return b;
  }
  function byId(id) { for (const b of list) if (b.id === id) return b; return null; }
  function reset(spawns) {
    for (const b of list) {
      const s = spawns[b.team][b.idx];
      b.pos.set(s.x, 0, s.z); b.hp = 100; b.alive = true; b.mesh.visible = true;
      b.yaw = b.team === 'ember' ? Math.PI : 0;
      b.state = b.team === 'ember' ? 'follow' : 'push';
      b.wp = nearestWaypoint(s.x, s.z); b.targetWp = null;
      b.reactT = 0; b.burstLeft = 0; b.fireCd = 0; b.blindT = 0; b.mag = BOT_W.mag; b.reloadT = 0;
      b.investigate = null; b.target = null; b.site = b.team === 'cinder' ? rng.pick(['A', 'B']) : null;
    }
  }
  function hasLOS(a, b, eyeA = 1.5, eyeB = 1.4) {
    _o.set(a.x, a.y + eyeA, a.z);
    _d.set(b.x - a.x, (b.y + eyeB) - (a.y + eyeA), b.z - a.z);
    const dist = _d.length();
    if (dist > 70) return false;
    _d.normalize(); ray.set(_o, _d);
    const hits = ray.intersectObjects(shootables, false);
    return !(hits.length && hits[0].distance < dist - 0.4);
  }
  function visibleEnemies(b, player, foes) {
    // Returns nearest visible foe (player counts for cinder; ember bots see cinder bots).
    let best = null, bd = 55;
    const cands = b.team === 'cinder'
      ? foes.concat(player.alive ? [player] : [])
      : foes;
    for (const e of cands) {
      if (e === b || !e.alive) continue;
      const d = Math.hypot(e.pos.x - b.pos.x, e.pos.z - b.pos.z);
      if (d > bd) continue;
      if (hasLOS(b.pos, e.pos, 1.5, e === player ? player.eye() : 1.4)) { best = e; bd = d; }
    }
    return best;
  }
  function moveToward(b, tx, tz, dt, speedMul = 1) {
    const dx = tx - b.pos.x, dz = tz - b.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.3) return true;
    const sp = b.speed * speedMul;
    b.pos.x += (dx / d) * sp * dt; b.pos.z += (dz / d) * sp * dt;
    b.yaw = Math.atan2(dx, dz); // model faces +z; yaw aligns local +z to travel dir
    collideCircle(colliders, b.pos, 0.42);
    return d < 0.6;
  }
  function stepBot(b, dt, ctx) {
    if (!b.alive) return;
    const { player, state } = ctx;
    if (b.blindT > 0) { b.blindT -= dt; b.target = null; }
    // Reload
    if (b.reloadT > 0) {
      b.reloadT -= dt;
      if (b.reloadT <= 0) b.mag = BOT_W.mag;
    }
    // Hearing: recent noise inside radius pulls bots to investigate.
    if (b.blindT <= 0 && b.state !== 'engage' && b.state !== 'defuse') {
      for (const n of state.noises) {
        if (state.time - n.t < 1.2 && Math.hypot(n.x - b.pos.x, n.z - b.pos.z) < n.radius) {
          b.investigate = { x: n.x, z: n.z, t: 3 }; b.state = 'investigate';
        }
      }
    }
    // Bomb planted: nearest 2 cinder bots go defuse; ember bots guard.
    if (state.bomb.status === 'planted' && b.team === 'cinder' && b.state !== 'defuse') {
      const defusers = list.filter((o) => o.alive && o.team === 'cinder' && o.state === 'defuse');
      const d = Math.hypot(state.bomb.x - b.pos.x, state.bomb.z - b.pos.z);
      if (defusers.length < 2 && d < 45) { b.state = 'defuse'; b.targetWp = null; }
    }
    // Spot a target?
    const foes = b.team === 'ember' ? list.filter((o) => o.team === 'cinder') : list.filter((o) => o.team === 'ember');
    const seen = b.blindT > 0 ? null : visibleEnemies(b, player, foes);
    if (seen) {
      if (b.target !== seen) { b.target = seen; b.reactT = rng.range(0.35, 0.6); b.burstLeft = 0; }
      b.state = 'engage';
    } else if (b.state === 'engage') {
      b.target = null; b.state = b.team === 'ember' ? 'follow' : 'push';
    }
    if (b.state === 'engage' && b.target) {
      const t = b.target;
      const dx = t.pos.x - b.pos.x, dz = t.pos.z - b.pos.z;
      const dist = Math.hypot(dx, dz);
      b.yaw = Math.atan2(dx, dz);
      // Strafe sideways while fighting.
      b.strafeT -= dt;
      if (b.strafeT <= 0) { b.strafeDir *= -1; b.strafeT = rng.range(0.5, 1.2); }
      if (dist > 14) moveToward(b, t.pos.x, t.pos.z, dt, 0.8);
      else if (dist < 5) moveToward(b, b.pos.x - dx, b.pos.z - dz, dt, 0.6);
      else { b.pos.x += Math.cos(b.yaw) * b.strafeDir * b.speed * 0.45 * dt; b.pos.z -= Math.sin(b.yaw) * b.strafeDir * b.speed * 0.45 * dt; collideCircle(colliders, b.pos, 0.42); }
      // Fire in bursts after reaction time.
      b.reactT -= dt; b.fireCd -= dt;
      if (b.reactT <= 0 && b.fireCd <= 0 && b.reloadT <= 0) {
        if (b.burstLeft <= 0) { b.burstLeft = rng.int(3, 5); b.fireCd = rng.range(0.5, 0.9); }
        else {
          b.burstLeft -= 1; b.fireCd = 0.11; b.mag -= 1;
          if (b.mag <= 0) b.reloadT = 1.7;
          const aimErr = 0.012 + dist * 0.0011 + (t === player && player.moving ? 0.012 : 0);
          ctx.botFire(b, t, aimErr);
        }
      }
      return;
    }
    // Defuse behaviour
    if (b.state === 'defuse') {
      if (moveToward(b, state.bomb.x, state.bomb.z, dt)) {
        state.bomb.defuseProgress += dt;
        state.bomb.defuserId = b.id;
        if (state.bomb.defuseProgress >= 5) ctx.onDefused(b);
      }
      return;
    }
    // Investigate a noise
    if (b.state === 'investigate' && b.investigate) {
      if (moveToward(b, b.investigate.x, b.investigate.z, dt)) {
        b.investigate.t -= dt;
        if (b.investigate.t <= 0) { b.investigate = null; b.state = b.team === 'ember' ? 'follow' : 'push'; }
      }
      return;
    }
    // Follow (ember): trail the player at ~4m, waypoint-hopping.
    if (b.state === 'follow') {
      const d = Math.hypot(player.pos.x - b.pos.x, player.pos.z - b.pos.z);
      if (d > 5) {
        const tx = player.pos.x + Math.sin(b.idx * 1.7) * 3.5;
        const tz = player.pos.z + Math.cos(b.idx * 1.7) * 3.5;
        moveToward(b, tx, tz, dt, 0.9);
      } else {
        b.holdT -= dt;
        if (b.holdT <= 0) { b.yaw += rng.range(-0.6, 0.6); b.holdT = rng.range(1, 2.5); }
      }
      return;
    }
    // Push / patrol (cinder): waypoint route toward their assigned site, then hold.
    if (b.state === 'push') {
      const site = b.site === 'A' ? { x: -21, z: -17 } : { x: 21, z: -17 };
      const goal = b.targetWp === null ? nearestWaypoint(site.x, site.z) : b.targetWp;
      const node = WAYPOINTS[goal];
      if (moveToward(b, node.x, node.z, dt)) {
        if (goal === nearestWaypoint(site.x, site.z)) { b.state = 'hold'; b.holdT = rng.range(2, 4); }
        else b.targetWp = nextWaypoint(goal, nearestWaypoint(site.x, site.z), rng);
      }
      return;
    }
    if (b.state === 'hold') {
      b.holdT -= dt;
      b.yaw += Math.sin(state.time * 0.4 + b.id) * 0.01;
      if (b.holdT <= 0) { b.state = 'push'; b.targetWp = null; b.site = b.site === 'A' ? 'B' : 'A'; }
    }
  }
  function step(dt, ctx) {
    for (const b of list) stepBot(b, dt, ctx);
    for (const b of list) {
      b.mesh.rotation.y = b.yaw;
      b.mesh.visible = b.alive;
    }
  }
  function damage(b, dmg) {
    if (!b.alive) return false;
    b.hp -= dmg;
    if (b.hp <= 0) { b.hp = 0; b.alive = false; b.mesh.visible = false; return true; }
    return false;
  }
  return { list, hitMeshes, spawn, byId, reset, step, damage, hasLOS };
}
