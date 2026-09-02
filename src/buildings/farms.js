/* ---------- farms ---------- */
// The head of the food chain: farm feeds windmill feeds bakery. A windmill
// with no farm within reach still turns, but on bought-in grain at half
// yield, exactly as a bakery without a mill does.
export const FARM_MOOD={r:5, per:3, cap:6};
export const FARM_YIELD=11;        // coins a day, before the season bonus
export const FARM_MILL_R=7;        // how far a farm can supply a windmill
