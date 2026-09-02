import { BUILDINGS } from '../buildings/registry.js';
import { H, LEGACY_W, W } from '../core/constants.js';
import { S } from '../core/state.js';
import { countType } from '../world/tiles.js';

export const CITY_STAGES = Object.freeze([
  { id: 1, key: 'settlement', name: 'Settlement' },
  { id: 2, key: 'village', name: 'Village' },
  { id: 3, key: 'township', name: 'Township' },
  { id: 4, key: 'growing-town', name: 'Growing Town' }
]);

// The nine parcels tile the map as a 3x3 ring in fixed proportions, derived
// from W/H rather than written out, so the valley can change size without the
// land progression having to be re-authored. At 44x44 this reproduces the
// original hand-written layout exactly (edge 12, centre 20).
// Land is priced against the valley, not written out flat. A parcel of the big
// map is eight times the ground a parcel of the old one was, and at the old
// price the whole map was pocket change - which is most of why a city could be
// finished in an afternoon. The price grows with the square root of the area
// rather than with the area, so opening the second parcel is still a few days
// of a young town's income instead of a month of it. At 44x44 this is exactly
// 1, so the original prices are unchanged.
const LAND_PRICE = Math.max(1, Math.round(Math.sqrt(W * H / (LEGACY_W * LEGACY_W)) * 1.4));
const price = (coins) => coins * LAND_PRICE;

const EDGE_W = Math.round(W * 12 / 44), EDGE_H = Math.round(H * 12 / 44);
const MID_W = W - EDGE_W * 2, MID_H = H - EDGE_H * 2;
const FAR_X = EDGE_W + MID_W, FAR_Y = EDGE_H + MID_H;

export const LAND_PARCELS = Object.freeze([
  { id: 'center', name: 'Meadowline Center', x: EDGE_W, y: EDGE_H, w: MID_W, h: MID_H, starting: true, cost: price(0), stage: 1, requires: [] },
  { id: 'north', name: 'North Meadow', x: EDGE_W, y: 0, w: MID_W, h: EDGE_H, cost: price(320), stage: 2, requires: ['center'] },
  { id: 'east', name: 'East Meadow', x: FAR_X, y: EDGE_H, w: EDGE_W, h: MID_H, cost: price(360), stage: 2, requires: ['center'] },
  { id: 'south', name: 'South Meadow', x: EDGE_W, y: FAR_Y, w: MID_W, h: EDGE_H, cost: price(420), stage: 3, requires: ['center'] },
  { id: 'west', name: 'West Meadow', x: 0, y: EDGE_H, w: EDGE_W, h: MID_H, cost: price(380), stage: 3, requires: ['center'] },
  { id: 'northwest', name: 'Northwest Fields', x: 0, y: 0, w: EDGE_W, h: EDGE_H, cost: price(520), stage: 4, requires: ['north', 'west'] },
  { id: 'northeast', name: 'Northeast Fields', x: FAR_X, y: 0, w: EDGE_W, h: EDGE_H, cost: price(540), stage: 4, requires: ['north', 'east'] },
  { id: 'southwest', name: 'Southwest Fields', x: 0, y: FAR_Y, w: EDGE_W, h: EDGE_H, cost: price(560), stage: 4, requires: ['south', 'west'] },
  { id: 'southeast', name: 'Southeast Fields', x: FAR_X, y: FAR_Y, w: EDGE_W, h: EDGE_H, cost: price(580), stage: 4, requires: ['south', 'east'] }
]);

// Registry unlock metadata is authoritative. This compatibility export remains
// for tests/consumers that inspect BUILDING_STAGE, but it is derived rather
// than maintained as a second progression database.
export const BUILDING_STAGE = Object.freeze(Object.fromEntries(
  Object.values(BUILDINGS).map(def => [def.id, Math.max(1, Math.min(4, Math.floor(Number(def.unlockStage) || 1)))])
));

export const STAGE_REQUIREMENTS = Object.freeze({
  2: {
    required: [
      { id: 'population', label: 'Grow to 16 residents', metric: 'population', atLeast: 16 },
      { id: 'occupiedHomes', label: 'Fill 4 homes', metric: 'occupiedHomes', atLeast: 4 },
      { id: 'roads', label: 'Lay 10 road tiles', metric: 'roads', atLeast: 10 }
    ],
    any: []
  },
  3: {
    required: [
      { id: 'population', label: 'Grow to 30 residents', metric: 'population', atLeast: 30 },
      { id: 'occupiedHomes', label: 'Fill 7 homes', metric: 'occupiedHomes', atLeast: 7 }
    ],
    any: [
      {
        count: 2,
        items: [
          { id: 'education', label: 'Average Education 8+', metric: 'averageEducation', atLeast: 8 },
          { id: 'townHomes', label: 'Develop 2 Town Homes', metric: 'townHomes', atLeast: 2 },
          { id: 'desirability', label: 'Average Desirability 42+', metric: 'averageDesirability', atLeast: 42 }
        ]
      }
    ]
  },
  4: {
    required: [
      { id: 'population', label: 'Grow to 48 residents', metric: 'population', atLeast: 48 },
      { id: 'occupiedHomes', label: 'Fill 10 homes', metric: 'occupiedHomes', atLeast: 10 },
      { id: 'townHomes', label: 'Develop 4 Town Homes', metric: 'townHomes', atLeast: 4 },
      { id: 'establishedHomes', label: 'Develop 1 Established Home', metric: 'establishedHomes', atLeast: 1 }
    ],
    any: [
      {
        count: 2,
        items: [
          { id: 'education', label: 'Average Education 18+', metric: 'averageEducation', atLeast: 18 },
          { id: 'studentsServed', label: 'Serve 8 students', metric: 'studentsServed', atLeast: 8 },
          { id: 'desirability', label: 'Average Desirability 50+', metric: 'averageDesirability', atLeast: 50 }
        ]
      }
    ]
  }
});

function cleanUnlocked(list) {
  const valid = new Set(LAND_PARCELS.map(parcel => parcel.id));
  const out = [];
  for (const id of Array.isArray(list) ? list : []) {
    if (valid.has(id) && !out.includes(id)) out.push(id);
  }
  if (!out.includes('center')) out.unshift('center');
  return out;
}

export function createProgression(mode = 'parcel') {
  return {
    mode: mode === 'legacy-open' ? 'legacy-open' : 'parcel',
    stage: mode === 'legacy-open' ? 4 : 1,
    unlockedParcels: mode === 'legacy-open' ? LAND_PARCELS.map(parcel => parcel.id) : ['center'],
    claimedMilestones: []
  };
}

export function sanitizeProgression(raw, legacyFallback = false) {
  if (!raw || typeof raw !== 'object') {
    return createProgression(legacyFallback ? 'legacy-open' : 'parcel');
  }
  const mode = raw.mode === 'legacy-open' ? 'legacy-open' : 'parcel';
  const stage = Math.max(1, Math.min(4, Math.floor(Number(raw.stage) || 1)));
  return {
    mode,
    stage: mode === 'legacy-open' ? 4 : stage,
    unlockedParcels: mode === 'legacy-open'
      ? LAND_PARCELS.map(parcel => parcel.id)
      : cleanUnlocked(raw.unlockedParcels),
    claimedMilestones: Array.isArray(raw.claimedMilestones)
      ? raw.claimedMilestones.filter(value => typeof value === 'string').slice(0, 32)
      : []
  };
}

export function resetProgression(mode = 'parcel') {
  S.cityProgress = sanitizeProgression(createProgression(mode));
}

export function cityStage() {
  return CITY_STAGES[(S.cityProgress?.stage || 1) - 1] || CITY_STAGES[0];
}

export function isLegacyOpen() {
  return S.cityProgress?.mode === 'legacy-open';
}

export function parcelAt(x, y) {
  return LAND_PARCELS.find(parcel =>
    x >= parcel.x && x < parcel.x + parcel.w && y >= parcel.y && y < parcel.y + parcel.h
  ) || null;
}

export function isParcelUnlocked(id) {
  return isLegacyOpen() || (S.cityProgress?.unlockedParcels || []).includes(id);
}

export function isTileUnlocked(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  if (isLegacyOpen()) return true;
  const parcel = parcelAt(x, y);
  return Boolean(parcel) && isParcelUnlocked(parcel.id);
}

export function isFootprintUnlocked(x, y, w = 1, h = 1) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (!isTileUnlocked(xx, yy)) return false;
    }
  }
  return true;
}

export function isBuildingUnlocked(type) {
  return isLegacyOpen() || (S.cityProgress?.stage || 1) >= buildingUnlockStage(type);
}

export function buildingUnlockStage(type) {
  return BUILDING_STAGE[type] || 1;
}

export function developmentStats() {
  const houses = S.ctx?.houses || [];
  let occupiedHomes = 0;
  let townHomes = 0;
  let establishedHomes = 0;
  let desirabilityTotal = 0;
  let educationTotal = 0;

  for (const house of houses) {
    if ((house.pop || 0) > 0) occupiedHomes++;
    const tier = Math.max(1, Math.floor(Number(house.state?.housingTier) || 1));
    if (tier >= 2) townHomes++;
    if (tier >= 3) establishedHomes++;
    desirabilityTotal += Number(house.state?.desirability) || 0;
    educationTotal += Number(house.state?.education) || 0;
  }

  // One semantic Road tile is one City Growth Road tile. countType() is the
  // authoritative counter because a Road overlaid on Rail keeps type 'rail'
  // and carries state.roadRailCrossing; counting type === 'road' here lost
  // those tiles and could silently close the Settlement to Village gate.
  const roads = countType('road');

  return {
    population: S.pop || 0,
    homes: houses.length,
    occupiedHomes,
    townHomes,
    establishedHomes,
    roads,
    averageEducation: houses.length ? Math.round(educationTotal / houses.length) : 0,
    averageDesirability: houses.length ? Math.round(desirabilityTotal / houses.length) : 0,
    studentsServed: S.services?.education?.metrics?.served || 0
  };
}

function checkRequirement(item, stats) {
  const value = Number(stats[item.metric]) || 0;
  return { ...item, value, met: value >= item.atLeast };
}

export function stageProgress(targetStage, stats = developmentStats()) {
  const definition = STAGE_REQUIREMENTS[targetStage];
  if (!definition) return { complete: true, required: [], any: [] };

  const required = definition.required.map(item => checkRequirement(item, stats));
  const any = definition.any.map(group => {
    const items = group.items.map(item => checkRequirement(item, stats));
    return {
      ...group,
      items,
      met: items.filter(item => item.met).length >= group.count
    };
  });

  return {
    complete: required.every(item => item.met) && any.every(group => group.met),
    required,
    any
  };
}

export function evaluateCityGrowth() {
  if (isLegacyOpen()) return { stageChanged: false, stage: 4 };
  if (!S.cityProgress) resetProgression('parcel');

  const before = S.cityProgress.stage;
  let next = before + 1;
  while (next <= 4 && stageProgress(next).complete) {
    S.cityProgress.stage = next;
    next++;
  }
  if (S.diagnostics) {
    S.diagnostics.progressionRecomputes = (S.diagnostics.progressionRecomputes || 0) + 1;
  }
  return {
    stageChanged: S.cityProgress.stage !== before,
    from: before,
    stage: S.cityProgress.stage
  };
}

export function parcelStatus(id) {
  const parcel = LAND_PARCELS.find(candidate => candidate.id === id);
  if (!parcel) return null;
  if (isParcelUnlocked(id)) return { parcel, state: 'unlocked', canUnlock: false };

  const stageOk = (S.cityProgress?.stage || 1) >= parcel.stage;
  const prereqOk = parcel.requires.every(isParcelUnlocked);
  const coinsOk = S.coins >= parcel.cost;
  return {
    parcel,
    state: stageOk && prereqOk ? 'available' : 'locked',
    stageOk,
    prereqOk,
    coinsOk,
    canUnlock: stageOk && prereqOk && coinsOk
  };
}

export function unlockParcel(id) {
  if (isLegacyOpen()) return { ok: false, why: 'This legacy city already has full land access.' };
  const status = parcelStatus(id);
  if (!status || status.state === 'unlocked') return { ok: false, why: 'That land is already open.' };
  if (!status.stageOk) return { ok: false, why: 'Reach ' + CITY_STAGES[status.parcel.stage - 1].name + ' first.' };
  if (!status.prereqOk) return { ok: false, why: 'Open the neighboring land first.' };
  if (!status.coinsOk) return { ok: false, why: 'You need ' + status.parcel.cost + ' coins to open this land.' };

  S.coins -= status.parcel.cost;
  S.cityProgress.unlockedParcels = cleanUnlocked([...(S.cityProgress.unlockedParcels || []), id]);
  if (S.diagnostics) {
    S.diagnostics.parcelUnlocks = (S.diagnostics.parcelUnlocks || 0) + 1;
  }
  return { ok: true, parcel: status.parcel };
}

export function nextStageProgress() {
  const current = S.cityProgress?.stage || 1;
  return current >= 4
    ? null
    : { stage: CITY_STAGES[current], progress: stageProgress(current + 1) };
}
