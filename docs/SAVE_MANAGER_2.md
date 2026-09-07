# Meadowline — Save Manager 2.0

Status: **implemented on `main`**.

Save Manager 2.0 keeps the authoritative city format and key unchanged: `meadowline.v3`. It does not introduce Save V4 or replace Meadowline's existing six-second autosave, page-hide save, V1/V2 migration, or cloud-save payload.

## Goals

The milestone makes local saving visible, verifiable, portable and recoverable.

- The title-screen `Save now` action becomes `Save Manager`.
- Save Manager checks whether browser storage is writable.
- `Save now` invokes the existing Save V3 writer and verifies a readable Save V3 matching current day and treasury state.
- The most recent verified-save timestamp is retained separately from the city payload.
- Up to five local recovery snapshots are retained outside the authoritative `meadowline.v3` key.
- Recovery snapshots are created before verified manual saves, imports and restores, and are also sampled from changed autosaves.
- `Export city` downloads the current Save V3 JSON so a city can move between origins, browsers or devices.
- `Import city` accepts only structurally compatible Meadowline V1/V2/V3 JSON, preserves the current city as a backup, writes the imported city to `meadowline.v3`, verifies the write and reloads.
- `Restore` preserves the current city before replacing it with the selected recovery snapshot.
- Replacement saves are protected across the reload lifecycle. The normal
  `visibilitychange`/`pagehide` save is temporarily suppressed after a verified
  cloud load, import or recovery restore so the previous in-memory city cannot
  overwrite the replacement during navigation.

## Storage keys

Authoritative city:

- `meadowline.v3`

Save Manager metadata:

- `meadowline.saveManager.meta`

Local recovery ring:

- `meadowline.v3.backup.0` through `meadowline.v3.backup.4`
- matching `.meta` keys contain timestamp/reason/summary metadata

The backup ring is recovery infrastructure only. Normal game boot continues to load `meadowline.v3` exactly as before.

## Mobile behavior

The Save Manager uses a normal fixed bottom-sheet overlay rather than relying on native `<dialog>` behavior. Buttons are explicit `type=button` controls, the sheet respects the bottom safe-area inset, and pointer events are contained so taps do not leak through to the map.

## Cloud saves

Cloud saves remain a separate optional layer over the same Save V3 payload. Save Manager 2.0 deliberately fixes local truth and portability first; it does not auto-upload or auto-download cloud state.
