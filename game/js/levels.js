'use strict';
/* Spot the Difference — Cosmic Laundromat night shift.
 *
 * Level data only: three scenes, seven differences each. Every difference
 * is a point in the fixed 640x440 scene space with a hit radius; the same
 * coordinates apply to both pictures because the two sides share geometry.
 * The `kind` string tells art.js which prop changes between the A picture
 * (left) and the B picture (right). Missing objects (a UFO, a pocket, a
 * pile of clothes) keep their hit zone at the spot where they would be,
 * so they stay findable on the side that lacks them. */

const SCENE_W = 640;
const SCENE_H = 440;

/** A tiny deterministic PRNG, so ambient specks land identically on both sides. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LEVELS = [
  {
    id: 'laundromat',
    name: 'Shift 1 — Laundromat',
    short: 'Laundromat',
    tagline: 'Washers humming, one alien customer, seven things that do not match.',
    timeLimit: 100,
    seed: 101,
    sky: ['#241a52', '#3a2a7a'],
    floor: '#1c1440',
    differences: [
      { id: 'detergent-label', label: 'Detergent label', x: 120, y: 92, r: 28, kind: 'detergent-label' },
      { id: 'planet-rings', label: 'Planet poster rings', x: 520, y: 78, r: 34, kind: 'planet-rings' },
      { id: 'clock-hand', label: 'Wall clock hand', x: 320, y: 62, r: 30, kind: 'clock-hand' },
      { id: 'porthole-bubbles', label: 'Washer bubbles', x: 170, y: 310, r: 36, kind: 'porthole-bubbles' },
      { id: 'antenna-tip', label: 'Alien antenna tip', x: 478, y: 203, r: 20, kind: 'antenna-tip' },
      { id: 'floor-sock', label: 'Sock on the floor', x: 560, y: 405, r: 24, kind: 'floor-sock' },
      { id: 'basket-clothes', label: 'Laundry basket', x: 85, y: 378, r: 30, kind: 'basket-clothes' },
    ],
  },
  {
    id: 'orbit',
    name: 'Shift 2 — Lost & Found Orbit',
    short: 'Lost & Found',
    tagline: 'The station lost-property shelf, floating laundry and one very tidy robot.',
    timeLimit: 90,
    seed: 202,
    sky: ['#0f2a3d', '#1d4a5e'],
    floor: '#122636',
    differences: [
      { id: 'towel-count', label: 'Folded towels', x: 130, y: 82, r: 30, kind: 'towel-count' },
      { id: 'robot-light', label: 'Robot chest light', x: 320, y: 255, r: 18, kind: 'robot-light' },
      { id: 'floating-sock', label: 'Floating sock', x: 500, y: 150, r: 26, kind: 'floating-sock' },
      { id: 'suitcase-handle', label: 'Suitcase handle', x: 200, y: 330, r: 28, kind: 'suitcase-handle' },
      { id: 'porthole-ufo', label: 'UFO in the porthole', x: 556, y: 88, r: 30, kind: 'porthole-ufo' },
      { id: 'basket-patch', label: 'Basket patch', x: 420, y: 360, r: 26, kind: 'basket-patch' },
      { id: 'scarf-stripes', label: 'Scarf stripes', x: 90, y: 200, r: 30, kind: 'scarf-stripes' },
    ],
  },
  {
    id: 'rooftop',
    name: 'Shift 3 — Rooftop Drying Dock',
    short: 'Rooftop Dock',
    tagline: 'Clothes drying under the stars, Earth on the horizon, one busy robot.',
    timeLimit: 80,
    seed: 303,
    sky: ['#120a33', '#2b1155'],
    floor: '#1a1038',
    differences: [
      { id: 'shirt-pocket', label: 'Shirt pocket', x: 180, y: 150, r: 30, kind: 'shirt-pocket' },
      { id: 'shorts-colour', label: 'Shorts colour', x: 320, y: 160, r: 28, kind: 'shorts-colour' },
      { id: 'robot-hand', label: 'What the robot holds', x: 508, y: 272, r: 24, kind: 'robot-hand' },
      { id: 'solar-cell', label: 'Solar panel cell', x: 120, y: 90, r: 24, kind: 'solar-cell' },
      { id: 'greenhouse-leaves', label: 'Greenhouse leaves', x: 540, y: 330, r: 32, kind: 'greenhouse-leaves' },
      { id: 'earth-moon', label: 'Moon beside Earth', x: 600, y: 72, r: 42, kind: 'earth-moon' },
      { id: 'beacon-bands', label: 'Beacon light bands', x: 80, y: 60, r: 26, kind: 'beacon-bands' },
    ],
  },
];

/** Look a difference up by id inside a level. */
function differenceById(level, id) {
  for (const d of level.differences) if (d.id === id) return d;
  return null;
}
