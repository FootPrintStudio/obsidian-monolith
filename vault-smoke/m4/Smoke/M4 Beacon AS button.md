# M4 — Beacon via Grimoire AS button

**Prereq:** Monolith ≥ 0.4.0 with **Beacon** enabled; legacy System App Launcher **disabled**; Buttons **not required**.

1. Settings → Beacon → Add a desktop app or shell (or enable CollectionXiewer seed).
2. Click **Copy** on the row → paste below (or replace with your snippet).
3. Reading view: click the button → app/command should launch.

## Paste area

<!-- Replace with Copy output from Beacon settings -->

`q= "[Example](cmd:monolith:monolith-beacon-launch-REPLACE)" AS button`

## Notes

- `cmd:` / `command:` targets call `executeCommandById` (full id `monolith:monolith-beacon-launch-…`).
- Wiki/URL `AS button` still works for notes and links.
- Decision C: CollectionXiewer seed stays opt-in until you enable it in Beacon.
