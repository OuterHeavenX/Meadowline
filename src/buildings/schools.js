import { BUILDINGS } from './registry.js';

/* ---------- schools ---------- */
// Mood remains intentionally modest; education is now the School's real service.
export const SCHOOL_MOOD={r:BUILDINGS.school.service.radius, per:8, cap:8};
// Preserve the pre-existing housing-capacity effect for backwards compatibility.
export const SCHOOL_ROOM=2;
export const SCHOOL_SERVICE=BUILDINGS.school.service;
