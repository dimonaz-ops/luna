// Ship and weapon-upgrade catalogs plus the persistent player profile.

export const SHIPS = {
  scout: {
    id: 'scout',
    name: 'SCOUT',
    shipClass: 'LIGHT FIGHTER',
    desc: 'Standard-issue patrol fighter. Nimble, fragile, gets the job done.',
    cost: 0,
    speed: 30,
    hull: 3,
    cannons: 1,
    color: 0x27e8ff,
  },
  interceptor: {
    id: 'interceptor',
    name: 'INTERCEPTOR',
    shipClass: 'STRIKE FIGHTER',
    desc: 'Twin-cannon racer built for speed. Blink and you miss it.',
    cost: 800,
    speed: 40,
    hull: 4,
    cannons: 2,
    color: 0x5dff8f,
  },
  guardian: {
    id: 'guardian',
    name: 'GUARDIAN',
    shipClass: 'HEAVY GUNSHIP',
    desc: 'Armored brawler. Slow to turn, hard to kill, twin heavy mounts.',
    cost: 2200,
    speed: 24,
    hull: 7,
    cannons: 2,
    color: 0xffa53b,
  },
  dreadnought: {
    id: 'dreadnought',
    name: 'DREADNOUGHT',
    shipClass: 'CAPITAL ESCORT',
    desc: 'A flying fortress with a triple cannon array. The invaders fear it.',
    cost: 5500,
    speed: 21,
    hull: 10,
    cannons: 3,
    color: 0xc84bff,
  },
};

export const SHIP_ORDER = ['scout', 'interceptor', 'guardian', 'dreadnought'];

// Each upgrade has maxLevel levels; cost of level n (1-based) is costs[n-1].
export const UPGRADES = {
  damage: {
    id: 'damage',
    name: 'PLASMA CORE',
    desc: 'Overcharge the plasma cells for heavier bolts.',
    maxLevel: 5,
    costs: [150, 350, 700, 1300, 2400],
    effect: (lvl) => `Damage per bolt: ${1 + lvl}`,
  },
  rate: {
    id: 'rate',
    name: 'AUTOLOADER',
    desc: 'Faster cycling — shorter delay between volleys.',
    maxLevel: 5,
    costs: [150, 350, 700, 1300, 2400],
    effect: (lvl) => `Fire rate: ${(1 / fireCooldown(lvl)).toFixed(1)} volleys/s`,
  },
  multishot: {
    id: 'multishot',
    name: 'SPREAD ARRAY',
    desc: 'Angled side emitters add extra bolts to every volley.',
    maxLevel: 3,
    costs: [400, 1100, 2600],
    effect: (lvl) => `+${lvl * 2} angled bolts per volley`,
  },
  velocity: {
    id: 'velocity',
    name: 'RAIL ACCELERATOR',
    desc: 'Magnetic rails push bolts downrange faster.',
    maxLevel: 4,
    costs: [120, 280, 550, 1000],
    effect: (lvl) => `Bolt speed: ${boltSpeed(lvl)} m/s`,
  },
  pierce: {
    id: 'pierce',
    name: 'PHASE ROUNDS',
    desc: 'Bolts phase through destroyed targets and keep going.',
    maxLevel: 3,
    costs: [500, 1200, 2800],
    effect: (lvl) => (lvl === 0 ? 'Bolts stop at first hit' : `Bolts pierce ${lvl} extra target${lvl > 1 ? 's' : ''}`),
  },
};

export const UPGRADE_ORDER = ['damage', 'rate', 'multishot', 'velocity', 'pierce'];

export function fireCooldown(rateLevel) {
  return 0.38 * Math.pow(0.87, rateLevel);
}

export function boltSpeed(velocityLevel) {
  return 70 + velocityLevel * 14;
}

const SAVE_KEY = 'luna-invaders-save-v1';

export function defaultProfile() {
  return {
    credits: 0,
    highScore: 0,
    ownedShips: ['scout'],
    selectedShip: 'scout',
    upgrades: { damage: 0, rate: 0, multishot: 0, velocity: 0, pierce: 0 },
  };
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultProfile();
    const data = JSON.parse(raw);
    const profile = { ...defaultProfile(), ...data };
    profile.upgrades = { ...defaultProfile().upgrades, ...(data.upgrades || {}) };
    if (!profile.ownedShips.includes('scout')) profile.ownedShips.push('scout');
    if (!SHIPS[profile.selectedShip] || !profile.ownedShips.includes(profile.selectedShip)) {
      profile.selectedShip = 'scout';
    }
    return profile;
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(profile));
  } catch {
    // Storage unavailable (private mode etc.) — play without persistence.
  }
}
