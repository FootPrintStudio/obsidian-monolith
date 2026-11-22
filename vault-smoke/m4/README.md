# M4 — Monolith vault cutover (Carl)

**Plugin:** Monolith **≥ 0.4.0** (`id: monolith`)  
**Shape A:** one BRAT artifact + module flags  
**Forever external:** CollectionXiewer AppImage  

Cloud agents cannot read `/home/carl-heinz/Desktop/Test Vault` — confirm locally.

---

## Cutover checklist (one day; dual-run unsupported)

1. BRAT-install / update **Monolith** to the release tip (`v0.4.0+`).
2. Open Monolith settings — confirm **M3 migrate** notice if legacy `data.json` was imported (legacy files are **kept**).
3. **Disable** all eight legacy plugins: `grimoire`, `epochs`, `visage`, `oculus`, `augur`, `lexicon-nexus`, `navinote`, `system-app-launcher`.
4. Keep **CollectionXiewer** AppImage running if you use Oculus `XIEWER:`.
5. Enable optional **Lexicon** / **Oracle** in Monolith flags if needed.
6. **Beacon / Buttons:** rewrite launcher notes from Buttons blocks to Grimoire AS button (see below). Uninstall Buttons if unused.
7. Smoke packs: `vault-smoke/p3`, `p5`, `p6` (seed), and **`m4/Smoke/`** Beacon AS button.

---

## Buttons → Grimoire `AS button`

Legacy Buttons matched the full palette name, e.g.  
`System App Launcher: Launch App: PureRef`.

**Monolith:**

1. Settings → Beacon → enable the launcher → **Copy** on the row.
2. Paste into a note (Reading view):

```markdown
`q= "[PureRef](cmd:monolith:monolith-beacon-launch-<entry-id>)" AS button`
```

(The Copy button fills the exact `cmd:` id for that entry.)

3. Click the button in Reading view — runs the Beacon command (no Buttons plugin).

---

## After cutover

- Stop feature-releasing legacy FPS Obsidian plugins (P8.6 / matrix Rule 6).
- CollectionXiewer remains the only separate AppImage peer.
