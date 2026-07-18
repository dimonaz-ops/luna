# LUNA — 3D Space Invaders

A 3D take on the arcade classic, built with [Three.js](https://threejs.org/).
Blast descending invader formations, earn credits, upgrade your weapons, and
buy bigger ships in the hangar shop.

## Running

The game is a static site using ES modules, so it needs to be served over HTTP
(opening `index.html` directly from disk won't work):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static file server works (`npx serve`, `php -S`, nginx, …). No build step,
no external assets — Three.js is vendored in `lib/` and every model and sound
effect is generated procedurally.

## How to play

| Input | Action |
|---|---|
| ◀ ▶ or A / D | Move |
| Space | Fire |
| P | Pause |

- Clear a wave to earn a credit bonus and visit the **hangar shop** before the
  next wave launches.
- The swarm speeds up as it thins out and descends every time it hits the edge
  of the playfield — if it reaches your line, the defense is breached.
- Credits, purchased ships, weapon upgrades, and your high score persist in
  `localStorage` between sessions.

## The shop

**Ships** — each with its own model, speed, hull strength, and cannon mounts:

| Ship | Class | Cost | Speed | Hull | Cannons |
|---|---|---|---|---|---|
| Scout | Light fighter | free | 30 | 3 | 1 |
| Interceptor | Strike fighter | ⬡ 800 | 40 | 4 | 2 |
| Guardian | Heavy gunship | ⬡ 2,200 | 24 | 7 | 2 |
| Dreadnought | Capital escort | ⬡ 5,500 | 21 | 10 | 3 |

**Weapon upgrades** — five upgrade tracks, each with multiple levels:

- **Plasma Core** — more damage per bolt
- **Autoloader** — faster fire rate
- **Spread Array** — extra angled bolts per volley
- **Rail Accelerator** — faster bolt travel
- **Phase Rounds** — bolts pierce through destroyed targets

## Project layout

```
index.html       UI overlays (menu, HUD, shop, pause, game over) and styling
src/main.js      UI glue and run lifecycle
src/game.js      Game engine: scene, player, formation, projectiles, particles
src/catalog.js   Ship/upgrade catalogs and the persistent player profile
src/meshes.js    Procedural mesh builders (ships, invaders, starfield)
src/audio.js     Procedural WebAudio sound effects
lib/             Vendored Three.js
```
