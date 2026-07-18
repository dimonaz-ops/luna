// Procedural mesh builders — every model is assembled from primitives so the
// game needs no external assets.
import * as THREE from '../lib/three.module.js';

function hullMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.35 });
}

function glowMaterial(color) {
  return new THREE.MeshBasicMaterial({ color });
}

function darkMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x1a2233, metalness: 0.7, roughness: 0.5 });
}

// Player ships face -Z (toward the invaders).
export function buildPlayerShip(ship) {
  const g = new THREE.Group();
  const hull = hullMaterial(ship.color);
  const dark = darkMaterial();
  const glow = glowMaterial(ship.color);

  switch (ship.id) {
    case 'interceptor': {
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.7, 4.2, 4), hull);
      body.rotation.x = -Math.PI / 2;
      body.rotation.z = Math.PI / 4;
      g.add(body);
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.4), dark);
        wing.position.set(side * 1.3, -0.1, 0.6);
        wing.rotation.z = side * 0.25;
        g.add(wing);
        const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6), dark);
        gun.rotation.x = Math.PI / 2;
        gun.position.set(side * 2.1, 0.05, -0.2);
        g.add(gun);
        const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.5), glow);
        engine.rotation.x = Math.PI / 2;
        engine.position.set(side * 0.45, -0.05, 2.0);
        g.add(engine);
      }
      break;
    }
    case 'guardian': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 3.2), hull);
      g.add(body);
      const prow = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 4), hull);
      prow.rotation.x = -Math.PI / 2;
      prow.rotation.z = Math.PI / 4;
      prow.position.z = -2.2;
      g.add(prow);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 1.2), dark);
      bridge.position.set(0, 0.7, 0.4);
      g.add(bridge);
      for (const side of [-1, 1]) {
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.6), dark);
        pod.rotation.x = Math.PI / 2;
        pod.position.set(side * 1.5, 0, -0.2);
        g.add(pod);
        const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.5), glow);
        engine.rotation.x = Math.PI / 2;
        engine.position.set(side * 0.7, 0, 1.8);
        g.add(engine);
      }
      break;
    }
    case 'dreadnought': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.0, 4.0), hull);
      g.add(body);
      const prow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.8), hull);
      prow.position.set(0, 0, -2.7);
      g.add(prow);
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 5.2), dark);
      spine.position.y = 0.7;
      g.add(spine);
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 2.4), dark);
        wing.position.set(side * 2.4, -0.2, 0.4);
        g.add(wing);
        const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.0), dark);
        turret.rotation.x = Math.PI / 2;
        turret.position.set(side * 1.2, 0.35, -1.8);
        g.add(turret);
        const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 0.6), glow);
        engine.rotation.x = Math.PI / 2;
        engine.position.set(side * 1.0, 0, 2.2);
        g.add(engine);
      }
      const centerGun = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.4), dark);
      centerGun.rotation.x = Math.PI / 2;
      centerGun.position.set(0, 0.1, -3.2);
      g.add(centerGun);
      break;
    }
    default: { // scout
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.4, 4), hull);
      body.rotation.x = -Math.PI / 2;
      body.rotation.z = Math.PI / 4;
      g.add(body);
      const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), glow);
      cockpit.position.set(0, 0.35, 0.2);
      g.add(cockpit);
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.0), dark);
        wing.position.set(side * 1.1, -0.15, 0.8);
        g.add(wing);
      }
      const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.5), glow);
      engine.rotation.x = Math.PI / 2;
      engine.position.z = 1.8;
      g.add(engine);
    }
  }
  return g;
}

export const ENEMY_TYPES = {
  grunt:   { hp: 1, credits: 10, score: 100, color: 0xff3b6b, scale: 1.35 },
  soldier: { hp: 2, credits: 20, score: 200, color: 0xffa53b, scale: 1.55 },
  elite:   { hp: 4, credits: 40, score: 400, color: 0xc84bff, scale: 1.75 },
};

// Invaders face +Z (toward the player).
export function buildEnemy(typeId) {
  const type = ENEMY_TYPES[typeId];
  const g = new THREE.Group();
  const hull = hullMaterial(type.color);
  const glow = glowMaterial(0xffffff);

  const body = new THREE.Mesh(new THREE.OctahedronGeometry(1.1), hull);
  body.scale.y = 0.7;
  g.add(body);

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), glow);
  eye.position.set(0, 0, 0.85);
  g.add(eye);

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.18), hull);
    arm.position.set(side * 1.35, 0, 0);
    arm.rotation.z = side * -0.5;
    g.add(arm);
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 4), hull);
    claw.position.set(side * 1.85, -0.35, 0);
    claw.rotation.z = Math.PI;
    g.add(claw);
  }

  if (typeId === 'elite') {
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 4), hull);
    crown.position.y = 0.9;
    g.add(crown);
  }

  g.scale.setScalar(type.scale);
  return g;
}

export function buildStarfield(count, spread, size, color) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.5;
    positions[i * 3 + 2] = -Math.random() * spread;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color, size, sizeAttenuation: true, transparent: true, opacity: 0.8 });
  return new THREE.Points(geo, mat);
}
