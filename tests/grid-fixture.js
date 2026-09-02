import { LAND_PARCELS } from '../src/progression/city-growth.js';

/* These regression fixtures were authored against a 44x44 valley, where the
   starting parcel ran from tile 12 to 32. The parcels are now derived from the
   map size, so a fixture coordinate has to be expressed relative to that parcel
   rather than written out. L() maps an old coordinate onto the current centre,
   which is the identity on a 44x44 map. */
export const LEGACY_CENTER_ORIGIN = 12;
export const ORIGIN_SHIFT = LAND_PARCELS[0].x - LEGACY_CENTER_ORIGIN;
export const L = (n) => n + ORIGIN_SHIFT;
