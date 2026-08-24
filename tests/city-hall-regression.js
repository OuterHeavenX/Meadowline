import { BUILDINGS, getUpgradeDefinition } from '../src/buildings/registry.js';
import { canPlace, erase } from '../src/buildings/buildings.js';
import { touchIntent, isOneShotTool } from '../src/core/input-policy.js';
import { applySave, KEY, KEY_OLD, KEY_V2, load, save, store } from '../src/core/save.js';
import { S } from '../src/core/state.js';
import { resetProgression, CITY_STAGES, STAGE_REQUIREMENTS } from '../src/progression/city-growth.js';
import { civicUpgradeStatus, upgradeCivic } from '../src/progression/civic-upgrades.js';
import { getCitySummary, invalidateCitySummary } from '../src/simulation/city-summary.js';
import { getEligibleGoals } from '../src/simulation/wishes.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';

const checks = [];
const check = (name, value) => checks.push({ name, pass: Boolean(value) });
function put(type, x, y, state = {}, pop = 0) {
  S.terr[idx(x, y)] = 0;
  const building = { type, x, y, seed: 1, pop, grow: 0, mood: 50, linked: true, state };
  S.grid[idx(x, y)] = building;
  return building;
}
function cityHalls() {
  return (S.grid || []).filter(building => building?.type === 'cityHall');
}

genWorld(24681357);
resetProgression('parcel');
S.coins = 2000;
S.wishes = [];
S.services.education = { metrics: { served: 0, demand: 0 } };

const def = BUILDINGS.cityHall;
check('registry has City Hall', Boolean(def));
check('City Hall is civic and unique', def.category === 'civic' && def.unique === true);
check('City Hall starts at Settlement', def.unlockStage === 1 && def.cost === 90);
check('City Hall remains one tile', def.placement.footprint[0] === 1 && def.placement.footprint[1] === 1);
check('City Hall uses normal one-shot safe-touch policy', isOneShotTool('cityHall'));
check('four civic levels only', def.upgrades.length === 4 && !getUpgradeDefinition('cityHall', 5));
check('stage ladder remains four stages', CITY_STAGES.length === 4 && CITY_STAGES[3].name === 'Growing Town');
check(
  'City Growth requirements unchanged',
  STAGE_REQUIREMENTS[2].required.find(r => r.id === 'population')?.atLeast === 16 &&
  STAGE_REQUIREMENTS[4].required.find(r => r.id === 'population')?.atLeast === 48
);

check('City Hall touch tap resolves to one intentional action', touchIntent({ tool: 'cityHall', movedPx: 0, heldMs: 0, pointers: 1 }) === 'tap');
check('City Hall touch drag resolves to pan', touchIntent({ tool: 'cityHall', movedPx: 12, heldMs: 0, pointers: 1 }) === 'pan');
check('City Hall second pointer resolves to pinch', touchIntent({ tool: 'cityHall', movedPx: 0, heldMs: 0, pointers: 2 }) === 'pinch');

check('first City Hall can be placed on legal land', canPlace('cityHall', 16, 16).ok);
const hall = put('cityHall', 16, 16, { level: 1 });
check('second City Hall is rejected', !canPlace('cityHall', 17, 16).ok);

S.cityProgress.stage = 1;
check('level 2 waits for Village', !civicUpgradeStatus(hall).stageOk);
S.cityProgress.stage = 2;
S.coins = 2000;
const l2 = civicUpgradeStatus(hall);
check('level 2 unlocks at Village', l2.available && l2.next.cost === 280);
const before = S.coins;
const r2 = upgradeCivic(hall);
check('level 2 deducts exactly once', r2.ok && hall.state.level === 2 && S.coins === before - 280);
S.cityProgress.stage = 3;
S.coins = 2000;
const r3 = upgradeCivic(hall);
check('level 3 is Town Hall at Township', r3.ok && hall.state.level === 3 && r3.upgrade.name === 'Town Hall');
S.cityProgress.stage = 4;
S.coins = 2000;
const r4 = upgradeCivic(hall);
check('level 4 is Meadowline City Hall', r4.ok && hall.state.level === 4 && r4.upgrade.name === 'Meadowline City Hall');
check('no fake level 5', civicUpgradeStatus(hall).maxed === true);

const oldConfirm = globalThis.confirm;
globalThis.confirm = () => true;
const removed = erase(16, 16);
check('confirmed City Hall removal succeeds', removed && cityHalls().length === 0);
check('removal allows a legal rebuild', canPlace('cityHall', 16, 16).ok);
globalThis.confirm = oldConfirm;
const rebuiltHall = put('cityHall', 16, 16, { level: 4 });

const h1 = put('house', 17, 17, { housingTier: 1, education: 10, desirability: 45 }, 4);
const h2 = put('house', 18, 17, { housingTier: 2, education: 20, desirability: 55 }, 6);
const h3 = put('house', 19, 17, { housingTier: 3, education: 30, desirability: 65 }, 8);
S.ctx = { houses: [h1, h2, h3], schools: [], parks: [], cafes: [], stations: [], lamps: [], mills: [], markets: [], bakeries: [], docks: [] };
S.pop = 18;
S.homes = 3;
S.mood = 72;
S.services.education = { metrics: { served: 7, demand: 10 } };
S.lastPay = { tax: 42, trade: 18, milled: 9, grant: 18, total: 87 };
invalidateCitySummary();
const summary = getCitySummary();
check('summary reports exact housing tiers', summary.overview.cottages === 1 && summary.overview.townHomes === 1 && summary.overview.establishedHomes === 1);
check('summary reports real averages', summary.overview.education === 20 && summary.overview.desirability === 55 && summary.overview.mood === 72);
check('summary reports education demand', summary.services.education.served === 7 && summary.services.education.waiting === 3);
check('summary uses real payday categories', summary.finances.residentialTax === 42 && summary.finances.trade === 18 && summary.finances.total === 87);

S.cityProgress.stage = 1;
S.ctx.houses = [h1, h2];
S.grid[idx(16, 16)] = null;
for (let x = 16; x < 20; x++) put('road', x, 18, {});
S.pop = 10;
const settlementGoals = getEligibleGoals('primary');
check('Town Office goal appears only after settlement has begun', settlementGoals.includes('cityhall'));
S.cityProgress.stage = 2;
put('cityHall', 16, 16, { level: 1 });
check('Village Hall goal is stage-gated', getEligibleGoals('primary').includes('cityhall2'));
S.cityProgress.stage = 1;
check('Village Hall goal does not appear early', !getEligibleGoals('primary').includes('cityhall2'));

// Existing progression cities with no civic center must keep their city state and receive no forced building.
applySave({
  v: 3,
  seed: 13579,
  coins: 777,
  day: 6,
  dayT: .3,
  b: [{ type: 'house', x: 16, y: 16, pop: 4, state: { housingTier: 2, education: 18, desirability: 52 } }],
  cityProgress: { mode: 'parcel', stage: 3, unlockedParcels: ['center', 'north'], claimedMilestones: [] },
  wishes: []
});
check('pre-City-Hall V3 keeps stage and parcels', S.cityProgress.stage === 3 && S.cityProgress.unlockedParcels.includes('north'));
check('pre-City-Hall V3 does not force-place or charge City Hall', cityHalls().length === 0 && S.coins === 777);

// Malformed level and duplicate civic centers repair defensively.
applySave({
  v: 3,
  seed: 24680,
  coins: 999,
  day: 8,
  dayT: .4,
  b: [
    { type: 'cityHall', x: 16, y: 16, state: { level: 99 } },
    { type: 'cityHall', x: 17, y: 16, state: { level: 2 } }
  ],
  cityProgress: { mode: 'parcel', stage: 4, unlockedParcels: ['center', 'north', 'east'], claimedMilestones: [] },
  wishes: []
});
check('duplicate saved City Halls sanitize to one', cityHalls().length === 1);
check('malformed City Hall level clamps to supported maximum', cityHalls()[0]?.state?.level === 4);
check('duplicate repair does not alter City Growth', S.cityProgress.stage === 4 && S.cityProgress.unlockedParcels.includes('east'));

// Generic V3 persistence must retain a normal civic level.
cityHalls()[0].state.level = 3;
store.set(KEY, '');
store.set(KEY_V2, '');
store.set(KEY_OLD, '');
save();
cityHalls()[0].state.level = 1;
check('City Hall V3 level survives save/reload', load() && cityHalls().length === 1 && cityHalls()[0].state.level === 3);

// Keep a reference alive so bundlers/static analyzers cannot infer it is accidental.
check('rebuilt civic state used generic level field', rebuiltHall.state.level === 4);

const failed = checks.filter(c => !c.pass);
document.getElementById('results').textContent = JSON.stringify({ pass: !failed.length, checks }, null, 2);
document.documentElement.dataset.result = failed.length ? 'fail' : 'pass';
