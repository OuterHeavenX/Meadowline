import { BUILDINGS } from './registry.js';

/* ---------- schools ---------- */
// Education service reaches farther than the School's older local mood/housing
// perk. This keeps civic coverage useful in larger neighborhoods without
// accidentally making every legacy proximity bonus equally broad.
export const SCHOOL_MOOD={r:5, per:8, cap:8};
// Preserve the pre-existing housing-capacity effect for backwards compatibility.
export const SCHOOL_ROOM=2;
export const SCHOOL_SERVICE=BUILDINGS.school.service;
