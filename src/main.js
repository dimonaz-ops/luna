// UI glue: menu, HUD, shop, pause and the run lifecycle.
import { Game } from './game.js';
import { SHIPS, SHIP_ORDER, UPGRADES, UPGRADE_ORDER, loadProfile, saveProfile } from './catalog.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);

const profile = loadProfile();
let banked = 0;          // credits from the current run already added to the profile
let shopReturn = 'menu'; // where the shop's close button leads: 'menu' | 'wave' | 'gameover'

const game = new Game($('game-canvas'), {
  onHud: renderHud,
  onWaveClear: handleWaveClear,
  onGameOver: handleGameOver,
});

// ---- overlay helpers -------------------------------------------------------

const overlays = ['menu-overlay', 'shop-overlay', 'gameover-overlay', 'pause-overlay'];
function show(id) {
  overlays.forEach((o) => $(o).classList.toggle('hidden', o !== id));
  $('hud').classList.toggle('hidden', id !== null);
}
function showNone() { show(null); }

function bankRunCredits() {
  const fresh = game.creditsEarned - banked;
  if (fresh > 0) {
    profile.credits += fresh;
    banked = game.creditsEarned;
    saveProfile(profile);
  }
}

// ---- menu ------------------------------------------------------------------

function renderMenu() {
  $('menu-highscore').textContent = profile.highScore.toLocaleString();
  $('menu-credits').textContent = `⬡ ${profile.credits.toLocaleString()}`;
  $('menu-ship').textContent = SHIPS[profile.selectedShip].name;
  show('menu-overlay');
}

$('btn-start').addEventListener('click', () => {
  sfx.unlock();
  startRun();
});

$('btn-menu-shop').addEventListener('click', () => {
  sfx.unlock();
  shopReturn = 'menu';
  openShop();
});

function startRun() {
  banked = 0;
  showNone();
  game.startRun(profile);
  showWaveBanner(`WAVE 1`);
}

// ---- HUD -------------------------------------------------------------------

function renderHud(state) {
  $('hud-score-val').textContent = state.score.toLocaleString();
  $('hud-wave-val').textContent = state.wave;
  $('hud-credits-val').textContent = `⬡ ${(profile.credits + state.creditsEarned - banked).toLocaleString()}`;
  const blocks = $('hud-hull-blocks');
  blocks.innerHTML = '';
  for (let i = 0; i < state.maxHull; i++) {
    const pip = document.createElement('div');
    pip.className = 'hull-pip';
    if (i >= state.hull) pip.classList.add('empty');
    else if (state.hull <= Math.max(1, Math.ceil(state.maxHull * 0.3))) pip.classList.add('low');
    blocks.appendChild(pip);
  }
}

let bannerTimer = null;
function showWaveBanner(text) {
  const el = $('wave-banner');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---- wave clear → shop -----------------------------------------------------

function handleWaveClear({ wave, bonus }) {
  bankRunCredits();
  if (profile.highScore < game.score) {
    profile.highScore = game.score;
    saveProfile(profile);
  }
  showWaveBanner(`WAVE ${wave} CLEARED — BONUS ⬡ ${bonus}`);
  setTimeout(() => {
    shopReturn = 'wave';
    openShop();
  }, 1600);
}

// ---- game over -------------------------------------------------------------

function handleGameOver({ score, wave, breached }) {
  bankRunCredits();
  const prevHigh = profile.highScore;
  if (score > prevHigh) profile.highScore = score;
  saveProfile(profile);

  $('gameover-title').textContent = breached ? 'DEFENSES BREACHED' : 'SHIP DESTROYED';
  $('go-score').textContent = score.toLocaleString();
  $('go-wave').textContent = wave;
  $('go-credits').textContent = `⬡ ${banked.toLocaleString()}`;
  $('go-newrecord').classList.toggle('hidden', !(score > prevHigh && score > 0));
  show('gameover-overlay');
}

$('btn-retry').addEventListener('click', startRun);
$('btn-go-shop').addEventListener('click', () => { shopReturn = 'gameover'; openShop(); });
$('btn-go-menu').addEventListener('click', () => { game.stop(); renderMenu(); });

// ---- pause -----------------------------------------------------------------

function togglePause() {
  if (!game.running) return;
  const nowPaused = !game.paused;
  game.setPaused(nowPaused);
  if (nowPaused) show('pause-overlay');
  else showNone();
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP') togglePause();
});

$('btn-pause-touch').addEventListener('click', togglePause);

if (window.matchMedia('(pointer: coarse)').matches) {
  $('hud-bottom').textContent = 'DRAG — MOVE HOLD — FIRE ❚❚ — PAUSE';
}

$('btn-resume').addEventListener('click', () => {
  game.setPaused(false);
  showNone();
});

$('btn-abort').addEventListener('click', () => {
  bankRunCredits();
  game.stop();
  renderMenu();
});

// ---- shop ------------------------------------------------------------------

let shopTab = 'ships';

function openShop() {
  renderShop();
  show('shop-overlay');
}

$('tab-ships').addEventListener('click', () => { shopTab = 'ships'; renderShop(); });
$('tab-weapons').addEventListener('click', () => { shopTab = 'weapons'; renderShop(); });

$('btn-shop-close').addEventListener('click', () => {
  if (shopReturn === 'wave') {
    showNone();
    game.nextWave();
    showWaveBanner(`WAVE ${game.wave}`);
  } else if (shopReturn === 'gameover') {
    show('gameover-overlay');
  } else {
    renderMenu();
  }
});

function statBar(label, value, max) {
  const pct = Math.round((value / max) * 100);
  return `<div class="statbar"><span class="label">${label}</span><div class="bar"><div class="fill" style="width:${pct}%"></div></div></div>`;
}

function renderShop() {
  $('shop-credits').textContent = `⬡ ${profile.credits.toLocaleString()}`;
  $('tab-ships').classList.toggle('active', shopTab === 'ships');
  $('tab-weapons').classList.toggle('active', shopTab === 'weapons');
  $('shop-ships').classList.toggle('hidden', shopTab !== 'ships');
  $('shop-weapons').classList.toggle('hidden', shopTab !== 'weapons');
  $('btn-shop-close').textContent = shopReturn === 'wave' ? 'Next Wave ▶' : 'Back';
  if (shopTab === 'ships') renderShipCards();
  else renderWeaponRows();
}

function renderShipCards() {
  const root = $('shop-ships');
  root.innerHTML = '';
  for (const id of SHIP_ORDER) {
    const ship = SHIPS[id];
    const owned = profile.ownedShips.includes(id);
    const equipped = profile.selectedShip === id;
    const affordable = profile.credits >= ship.cost;

    const card = document.createElement('div');
    card.className = 'card' + (equipped ? ' equipped' : '');
    card.innerHTML = `
      <div class="ship-class">${ship.shipClass}</div>
      <h3>${ship.name}</h3>
      <div class="desc">${ship.desc}</div>
      ${statBar('SPEED', ship.speed, 40)}
      ${statBar('HULL', ship.hull, 10)}
      ${statBar('CANNONS', ship.cannons, 3)}
      <div class="price">${owned ? 'OWNED' : `⬡ ${ship.cost.toLocaleString()}`}</div>
    `;
    const btn = document.createElement('button');
    btn.className = 'btn';
    if (equipped) {
      btn.textContent = 'EQUIPPED';
      btn.disabled = true;
    } else if (owned) {
      btn.textContent = 'EQUIP';
      btn.addEventListener('click', () => {
        profile.selectedShip = id;
        saveProfile(profile);
        sfx.equip();
        renderShop();
      });
    } else {
      btn.textContent = affordable ? 'BUY' : 'INSUFFICIENT ⬡';
      btn.disabled = !affordable;
      btn.classList.add('gold');
      btn.addEventListener('click', () => {
        if (profile.credits < ship.cost) { sfx.deny(); return; }
        profile.credits -= ship.cost;
        profile.ownedShips.push(id);
        profile.selectedShip = id;
        saveProfile(profile);
        sfx.buy();
        renderShop();
      });
    }
    card.appendChild(btn);
    root.appendChild(card);
  }
}

function renderWeaponRows() {
  const root = $('shop-weapons');
  root.innerHTML = '';
  for (const id of UPGRADE_ORDER) {
    const upg = UPGRADES[id];
    const level = profile.upgrades[id];
    const maxed = level >= upg.maxLevel;
    const cost = maxed ? null : upg.costs[level];
    const affordable = !maxed && profile.credits >= cost;

    const row = document.createElement('div');
    row.className = 'upg-row';

    const pips = Array.from({ length: upg.maxLevel }, (_, i) =>
      `<div class="pip${i < level ? ' filled' : ''}"></div>`).join('');

    row.innerHTML = `
      <div class="upg-info">
        <h3>${upg.name}</h3>
        <div class="desc">${upg.desc}</div>
        <div class="upg-effect">${upg.effect(level)}${maxed ? '' : ' → ' + upg.effect(level + 1)}</div>
      </div>
      <div class="pips">${pips}</div>
    `;
    const btn = document.createElement('button');
    btn.className = 'btn gold';
    if (maxed) {
      btn.textContent = 'MAX LEVEL';
      btn.disabled = true;
    } else {
      btn.textContent = `UPGRADE — ⬡ ${cost.toLocaleString()}`;
      btn.disabled = !affordable;
      btn.addEventListener('click', () => {
        if (profile.credits < cost) { sfx.deny(); return; }
        profile.credits -= cost;
        profile.upgrades[id] += 1;
        saveProfile(profile);
        sfx.buy();
        renderShop();
      });
    }
    row.appendChild(btn);
    root.appendChild(row);
  }
}

// ---- boot ------------------------------------------------------------------

renderMenu();

// Debug/testing handle.
window.__LUNA = { game, profile };
