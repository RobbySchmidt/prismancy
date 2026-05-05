# Prismancy

A 2D top-down roguelike with a Terraria-inspired wizard theme. Procedurally generated dungeons, magic missiles, item synergies, gemstone-named floors. Built with Phaser 3 + TypeScript + Vite.

Inspiration: *The Binding of Isaac* (run structure, room layout, item pools) meets *Terraria* (look & feel).

## Status

Work in progress. Currently building Phase 5 — bosses + multi-floor progression. See [`CLAUDE.md`](./CLAUDE.md) for the full roadmap and architecture notes.

## Stack

- [Phaser 3](https://phaser.io/) (3.x)
- TypeScript (strict mode)
- [Vite](https://vitejs.dev/) for dev / build
- [Vitest](https://vitest.dev/) for unit tests
- ESLint + Prettier
- Yarn Classic 1.22.x

## Getting started

```sh
yarn install
yarn dev        # dev server with HMR
yarn build      # production build
yarn typecheck  # tsc --noEmit
yarn test       # vitest run
yarn lint
```

## Controls

- **WASD** — move
- **Arrow keys** — cast magic missile in that direction
- **TAB** — open map (room overview + items list); arrows / mouse navigate, Enter / click teleports between cleared rooms
- **ESC** — close map

## Project layout

See [`CLAUDE.md`](./CLAUDE.md) for the directory structure, design conventions, and per-phase implementation notes.
