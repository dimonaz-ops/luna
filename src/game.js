// Core game engine: scene, player, invader formation, projectiles, particles.
import * as THREE from '../lib/three.module.js';
import { SHIPS, fireCooldown, boltSpeed } from './catalog.js';
import { buildPlayerShip, buildEnemy, buildStarfield, ENEMY_TYPES } from './meshes.js';
import { sfx } from './audio.js';

const BOUND_X = 30;          // playfield half-width
const PLAYER_Z = 0;
const FORMATION_START_Z = -80;
const BREACH_Z = -14;        // invaders reaching this z destroys the player
const ENEMY_BULLET_SPEED = 34;

export class Game {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.cb = callbacks; // { onHud, onWaveClear, onGameOver }

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x030612, 120, 320);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);

    this.scene.add(new THREE.AmbientLight(0x8899bb, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(20, 40, 20);
    this.scene.add(sun);
    const rim = new THREE.PointLight(0x27e8ff, 60, 80);
    rim.position.set(0, 8, 8);
    this.scene.add(rim);

    this.stars = [
      buildStarfield(900, 400, 0.7, 0x9fd8ff),
      buildStarfield(500, 300, 1.1, 0xffffff),
    ];
    this.stars.forEach((s) => this.scene.add(s));

    // Faint grid floor for depth perception.
    const grid = new THREE.GridHelper(400, 40, 0x0e4a5a, 0x082a36);
    grid.position.y = -8;
    this.scene.add(grid);

    this.boltGeo = new THREE.CapsuleGeometry(0.16, 1.4, 3, 6);
    this.boltMat = new THREE.MeshBasicMaterial({ color: 0x66f7ff });
    this.enemyBoltGeo = new THREE.SphereGeometry(0.35, 8, 6);
    this.enemyBoltMat = new THREE.MeshBasicMaterial({ color: 0xff5d7e });
    this.particleGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);

    this.keys = new Set();
    this.running = false;
    this.paused = false;
    this.playerBolts = [];
    this.enemyBolts = [];
    this.particles = [];

    window.addEventListener('resize', () => this.resize());
    this.resize();

    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.endTouch(); });

    // Touch / pointer controls: drag anywhere on the canvas to steer,
    // hold to keep firing. Also works with a mouse.
    this.touchId = null;
    this.touchLastX = 0;
    this.touchDX = 0;
    canvas.addEventListener('pointerdown', (e) => {
      if (this.touchId !== null) return;
      this.touchId = e.pointerId;
      this.touchLastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
      sfx.unlock(); // iOS requires audio to start inside a user gesture
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.touchId) return;
      // Map screen-width drags onto the playfield width, slightly amplified.
      this.touchDX += (e.clientX - this.touchLastX) * ((BOUND_X * 2) / window.innerWidth) * 1.6;
      this.touchLastX = e.clientX;
    });
    canvas.addEventListener('pointerup', (e) => { if (e.pointerId === this.touchId) this.endTouch(); });
    canvas.addEventListener('pointercancel', (e) => { if (e.pointerId === this.touchId) this.endTouch(); });

    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  endTouch() {
    this.touchId = null;
    this.touchDX = 0;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---- run lifecycle -------------------------------------------------------

  startRun(profile) {
    this.profile = profile;
    this.clearWorld();

    const ship = SHIPS[profile.selectedShip];
    this.ship = ship;
    this.playerMesh = buildPlayerShip(ship);
    this.playerMesh.position.set(0, 0, PLAYER_Z);
    this.scene.add(this.playerMesh);

    this.playerX = 0;
    this.hull = ship.hull;
    this.maxHull = ship.hull;
    this.score = 0;
    this.creditsEarned = 0;
    this.wave = 0;
    this.fireTimer = 0;
    this.invulnTimer = 0;
    this.gameOverPending = false;

    this.playerBolts = [];
    this.enemyBolts = [];
    this.particles = [];

    this.running = true;
    this.paused = false;
    this.nextWave();
  }

  nextWave() {
    this.wave += 1;
    // The player may have bought/equipped a different ship in the shop.
    const selected = SHIPS[this.profile.selectedShip];
    if (selected.id !== this.ship.id) {
      this.scene.remove(this.playerMesh);
      this.ship = selected;
      this.playerMesh = buildPlayerShip(selected);
      this.playerMesh.position.set(this.playerX, 0, PLAYER_Z);
      this.scene.add(this.playerMesh);
      this.hull = selected.hull;
      this.maxHull = selected.hull;
    }
    this.invulnTimer = 1.2;
    this.spawnFormation(this.wave);
    this.playerBolts.forEach((b) => this.scene.remove(b.mesh));
    this.enemyBolts.forEach((b) => this.scene.remove(b.mesh));
    this.playerBolts = [];
    this.enemyBolts = [];
    this.waveCleared = false;
    this.running = true;
    this.paused = false;
    this.pushHud();
  }

  clearWorld() {
    if (this.playerMesh) this.scene.remove(this.playerMesh);
    if (this.formation) this.scene.remove(this.formation.group);
    this.formation = null;
    (this.playerBolts || []).forEach((b) => this.scene.remove(b.mesh));
    (this.enemyBolts || []).forEach((b) => this.scene.remove(b.mesh));
    (this.particles || []).forEach((p) => this.scene.remove(p.mesh));
    this.playerBolts = [];
    this.enemyBolts = [];
    this.particles = [];
  }

  stop() {
    this.running = false;
    this.clearWorld();
  }

  setPaused(p) {
    this.paused = p;
    if (!p) this.clock.getDelta(); // swallow the pause duration
  }

  // ---- formation -----------------------------------------------------------

  spawnFormation(wave) {
    if (this.formation) this.scene.remove(this.formation.group);

    const cols = Math.min(9, 5 + Math.floor((wave - 1) / 2));
    const rows = Math.min(5, 2 + Math.floor((wave - 1) / 2));
    const spacingX = 7.0;
    const spacingZ = 7.5;

    const group = new THREE.Group();
    const enemies = [];
    for (let r = 0; r < rows; r++) {
      // Back rows are tougher: elites at the back, soldiers mid, grunts up front.
      const backness = rows === 1 ? 0 : r / (rows - 1);
      const typeId = backness > 0.66 ? 'elite' : backness > 0.33 ? 'soldier' : 'grunt';
      for (let c = 0; c < cols; c++) {
        const mesh = buildEnemy(typeId);
        mesh.position.set(
          (c - (cols - 1) / 2) * spacingX,
          Math.sin(r * 1.7) * 1.2,
          -r * spacingZ,
        );
        group.add(mesh);
        enemies.push({
          mesh,
          typeId,
          hp: ENEMY_TYPES[typeId].hp + Math.floor((wave - 1) / 4),
          alive: true,
          col: c,
          row: r,
          phase: Math.random() * Math.PI * 2,
          flashTimer: 0,
        });
      }
    }
    group.position.set(0, 5, FORMATION_START_Z);
    this.scene.add(group);

    this.formation = {
      group,
      enemies,
      cols,
      rows,
      dir: 1,
      total: enemies.length,
      baseSpeed: 5 + wave * 0.9,
      halfWidth: ((cols - 1) / 2) * spacingX,
      fireTimer: 1.5,
      fireInterval: Math.max(0.35, 1.5 * Math.pow(0.93, wave - 1)),
    };
  }

  aliveEnemies() {
    return this.formation ? this.formation.enemies.filter((e) => e.alive) : [];
  }

  // ---- per-frame update ----------------------------------------------------

  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    // Starfield drifts even on menus.
    for (const s of this.stars) {
      s.position.z += dt * 6;
      if (s.position.z > 100) s.position.z = 0;
    }

    if (this.running && !this.paused) {
      this.updatePlayer(dt);
      this.updateFormation(dt, t);
      this.updateBolts(dt);
      this.checkCollisions();
    }
    this.updateParticles(dt);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  updateCamera(dt) {
    const targetX = (this.playerMesh ? this.playerX : 0) * 0.45;
    this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, dt * 5);
    this.camera.position.y = 12;
    this.camera.position.z = 26;
    this.camera.lookAt(this.camera.position.x * 0.6, 1, -48);
  }

  updatePlayer(dt) {
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    const move = (right ? 1 : 0) - (left ? 1 : 0);
    let dx = move * this.ship.speed * dt;
    if (this.touchDX !== 0) {
      // Cap drag speed so the ship's speed stat still matters on touch.
      const maxStep = this.ship.speed * 1.4 * dt;
      dx += THREE.MathUtils.clamp(this.touchDX, -maxStep, maxStep);
      this.touchDX = 0;
    }
    const newX = THREE.MathUtils.clamp(this.playerX + dx, -BOUND_X, BOUND_X);
    const applied = (newX - this.playerX) / Math.max(this.ship.speed * dt, 1e-6);
    this.playerX = newX;
    this.playerMesh.position.x = this.playerX;
    this.playerMesh.rotation.z = THREE.MathUtils.lerp(
      this.playerMesh.rotation.z,
      THREE.MathUtils.clamp(-applied, -1, 1) * 0.35,
      dt * 8,
    );

    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt;
      this.playerMesh.visible = Math.floor(this.invulnTimer * 12) % 2 === 0;
    } else {
      this.playerMesh.visible = true;
    }

    this.fireTimer -= dt;
    if ((this.keys.has('Space') || this.touchId !== null) && this.fireTimer <= 0) {
      this.firePlayerVolley();
      this.fireTimer = fireCooldown(this.profile.upgrades.rate);
    }
  }

  firePlayerVolley() {
    const up = this.profile.upgrades;
    const speed = boltSpeed(up.velocity);
    const damage = 1 + up.damage;
    const pierce = up.pierce;

    const shots = [];
    // Straight shots from each cannon mount.
    const mounts = this.ship.cannons;
    for (let i = 0; i < mounts; i++) {
      const offset = mounts === 1 ? 0 : (i - (mounts - 1) / 2) * 1.6;
      shots.push({ x: offset, angle: 0 });
    }
    // Spread array: angled pairs.
    for (let s = 1; s <= up.multishot; s++) {
      shots.push({ x: 0, angle: s * 0.12 });
      shots.push({ x: 0, angle: -s * 0.12 });
    }

    for (const shot of shots) {
      const mesh = new THREE.Mesh(this.boltGeo, this.boltMat);
      mesh.position.set(this.playerX + shot.x, 0, PLAYER_Z - 2.5);
      // Slight climb so bolts visually rise into the formation plane.
      const dir = new THREE.Vector3(Math.sin(shot.angle), 0.07, -Math.cos(shot.angle)).normalize();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      this.scene.add(mesh);
      this.playerBolts.push({
        mesh,
        vx: dir.x * speed,
        vy: dir.y * speed,
        vz: dir.z * speed,
        damage,
        pierceLeft: pierce,
      });
    }
    sfx.shoot();
  }

  updateFormation(dt, t) {
    const f = this.formation;
    if (!f) return;
    const alive = this.aliveEnemies();
    if (alive.length === 0) {
      if (!this.waveCleared) this.onWaveCleared();
      return;
    }

    // Fewer invaders left → the swarm speeds up, like the arcade original.
    const speed = f.baseSpeed * (1 + (1 - alive.length / f.total) * 1.6);
    f.group.position.x += f.dir * speed * dt;

    const maxReach = BOUND_X - 4;
    if (f.group.position.x + f.halfWidth > maxReach && f.dir > 0) {
      f.dir = -1;
      f.group.position.z += 4;
    } else if (f.group.position.x - f.halfWidth < -maxReach && f.dir < 0) {
      f.dir = 1;
      f.group.position.z += 4;
    }

    // Idle animation + hit flash.
    for (const e of alive) {
      e.mesh.rotation.y = Math.sin(t * 2 + e.phase) * 0.3;
      e.mesh.position.y = Math.sin(e.row * 1.7) * 1.2 + Math.sin(t * 3 + e.phase) * 0.35;
      if (e.flashTimer > 0) {
        e.flashTimer -= dt;
        const on = e.flashTimer > 0 && Math.floor(e.flashTimer * 30) % 2 === 0;
        e.mesh.traverse((m) => { if (m.material) m.material.emissive?.setScalar(on ? 0.9 : 0); });
      }
    }

    // Breach check — the frontmost alive invader.
    let frontZ = -Infinity;
    for (const e of alive) frontZ = Math.max(frontZ, f.group.position.z + e.mesh.position.z);
    if (frontZ >= BREACH_Z) {
      this.killPlayer(true);
      return;
    }

    // Enemy fire: pick a random column's frontmost invader.
    f.fireTimer -= dt;
    if (f.fireTimer <= 0) {
      f.fireTimer = f.fireInterval * (0.6 + Math.random() * 0.8);
      const byCol = new Map();
      for (const e of alive) {
        const cur = byCol.get(e.col);
        if (!cur || e.row < cur.row) byCol.set(e.col, e); // row 0 is the front
      }
      const shooters = [...byCol.values()];
      const shooter = shooters[Math.floor(Math.random() * shooters.length)];
      this.fireEnemyBolt(shooter);
    }
  }

  fireEnemyBolt(enemy) {
    const origin = new THREE.Vector3();
    enemy.mesh.getWorldPosition(origin);
    const target = new THREE.Vector3(this.playerX, 0, PLAYER_Z);
    const dir = target.sub(origin).normalize();
    const mesh = new THREE.Mesh(this.enemyBoltGeo, this.enemyBoltMat);
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.enemyBolts.push({ mesh, vel: dir.multiplyScalar(ENEMY_BULLET_SPEED) });
    sfx.enemyShoot();
  }

  updateBolts(dt) {
    for (let i = this.playerBolts.length - 1; i >= 0; i--) {
      const b = this.playerBolts[i];
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.y += b.vy * dt;
      b.mesh.position.z += b.vz * dt;
      if (b.mesh.position.z < FORMATION_START_Z - 60 || Math.abs(b.mesh.position.x) > BOUND_X + 40) {
        this.scene.remove(b.mesh);
        this.playerBolts.splice(i, 1);
      }
    }
    for (let i = this.enemyBolts.length - 1; i >= 0; i--) {
      const b = this.enemyBolts[i];
      b.mesh.position.addScaledVector(b.vel, dt);
      if (b.mesh.position.z > 40) {
        this.scene.remove(b.mesh);
        this.enemyBolts.splice(i, 1);
      }
    }
  }

  checkCollisions() {
    const f = this.formation;
    if (!f) return;

    // Player bolts vs invaders.
    const enemyPos = new THREE.Vector3();
    for (let i = this.playerBolts.length - 1; i >= 0; i--) {
      const b = this.playerBolts[i];
      for (const e of f.enemies) {
        if (!e.alive) continue;
        e.mesh.getWorldPosition(enemyPos);
        const hitR = 2.2 * ENEMY_TYPES[e.typeId].scale;
        const dx = b.mesh.position.x - enemyPos.x;
        const dz = b.mesh.position.z - enemyPos.z;
        // Gameplay is on the x/z plane — ignore height so climbing bolts connect.
        if (dx * dx + dz * dz < hitR * hitR) {
          e.hp -= b.damage;
          let spent = true;
          if (e.hp <= 0) {
            this.destroyEnemy(e, enemyPos);
            // Phase rounds pass through destroyed targets.
            if (b.pierceLeft > 0) {
              b.pierceLeft -= 1;
              spent = false;
            }
          } else {
            e.flashTimer = 0.15;
            sfx.enemyHit();
          }
          if (spent) {
            this.scene.remove(b.mesh);
            this.playerBolts.splice(i, 1);
          }
          break;
        }
      }
    }

    // Enemy bolts vs player.
    if (this.invulnTimer <= 0) {
      for (let i = this.enemyBolts.length - 1; i >= 0; i--) {
        const b = this.enemyBolts[i];
        const dx = b.mesh.position.x - this.playerX;
        const dz = b.mesh.position.z - PLAYER_Z;
        if (dx * dx + dz * dz < 2.4 * 2.4 && Math.abs(b.mesh.position.y) < 3) {
          this.scene.remove(b.mesh);
          this.enemyBolts.splice(i, 1);
          this.damagePlayer();
          break;
        }
      }
    }
  }

  destroyEnemy(e, worldPos) {
    e.alive = false;
    e.mesh.visible = false;
    const type = ENEMY_TYPES[e.typeId];
    this.score += type.score;
    this.creditsEarned += type.credits;
    this.spawnExplosion(worldPos, type.color, 12);
    sfx.explosion();
    this.pushHud();
  }

  damagePlayer() {
    this.hull -= 1;
    this.invulnTimer = 1.6;
    this.spawnExplosion(this.playerMesh.position, this.ship.color, 10);
    sfx.playerHit();
    this.pushHud();
    if (this.hull <= 0) this.killPlayer(false);
  }

  killPlayer(breached) {
    if (this.gameOverPending) return;
    this.gameOverPending = true;
    this.hull = 0;
    this.spawnExplosion(this.playerMesh.position, 0xffffff, 30);
    this.playerMesh.visible = false;
    this.running = false;
    sfx.gameOver();
    this.pushHud();
    setTimeout(() => this.cb.onGameOver({
      score: this.score,
      wave: this.wave,
      creditsEarned: this.creditsEarned,
      breached,
    }), 900);
  }

  onWaveCleared() {
    this.waveCleared = true;
    this.running = false;
    const bonus = 50 + this.wave * 25;
    this.creditsEarned += bonus;
    this.score += bonus * 10;
    sfx.waveClear();
    this.pushHud();
    this.cb.onWaveClear({ wave: this.wave, bonus });
  }

  spawnExplosion(pos, color, count) {
    const mat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      const dir = new THREE.Vector3(
        Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5,
      ).normalize().multiplyScalar(8 + Math.random() * 14);
      this.particles.push({ mesh, vel: dir, life: 0.7 + Math.random() * 0.4 });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(1 - dt * 1.5);
      const s = Math.max(0.01, p.life);
      p.mesh.scale.setScalar(s);
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.y += dt * 4;
    }
  }

  pushHud() {
    this.cb.onHud({
      score: this.score,
      wave: this.wave,
      creditsEarned: this.creditsEarned,
      hull: this.hull,
      maxHull: this.maxHull,
    });
  }
}
