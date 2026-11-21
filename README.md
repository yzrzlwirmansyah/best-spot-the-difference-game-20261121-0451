# Spot the Difference — make.fun entry

[![make.fun](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/c/best-spot-the-difference-game-20261121-0451)
[![rank](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/yzrzlwirmansyah/best-spot-the-difference-game-20261121-0451/rank.svg)](https://make.fun/c/best-spot-the-difference-game-20261121-0451)
[![reward](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/yzrzlwirmansyah/best-spot-the-difference-game-20261121-0451/reward.svg)](https://make.fun/c/best-spot-the-difference-game-20261121-0451)

A complete, original spot-the-difference game for the [make.fun](https://make.fun/c/best-spot-the-difference-game-20261121-0451) bounty "Make the best spot the difference game".

Two near-identical hand-drawn scenes side by side — find every hidden difference, marked as you go, with a counter of how many remain. Played with keyboard and mouse in a desktop browser, fully offline from static files under `game/`.

## Play

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` via `buildDossier` from `vendor/makefun-game.ts`.

## Status

Work in progress — the starter skeleton is in place; the game itself is being built from scratch in-session (see commit history).
