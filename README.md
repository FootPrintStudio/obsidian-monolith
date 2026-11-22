# Monolith

FootPrintStudio Obsidian **mega-plugin** — one BRAT artifact with module enable flags (**ship shape A**, npm workspace packaging **C**).

**P8.1 vertical slice:** Grimoire · Epochs · Visage (spine). Later: Oculus, Augur, Beacon, Lexicon Nexus, Oracle. **CollectionXiewer** stays forever external.

| | |
|--|--|
| Plugin id | `monolith` |
| Product | Monolith |
| Install | BRAT → this repo → GitHub Releases (`v*`) |

## Trial notes

1. Install via BRAT from a `v*` Release (assets: `main.js`, `manifest.json`, `styles.css`, `versions.json`).
2. **Disable** legacy `grimoire`, `epochs`, and `visage` while testing — dual-enable is unsupported (double processors).
3. Keep production stack plugins enabled until vault cutover (M4); this id is a **side trial**.

## Develop

```bash
npm install
npm test
npm run build
```

Workspace packages: `packages/epochs`, `packages/grimoire`, `packages/visage` → bundled into one `main.js`.

## Processor order

1. Epochs in-process API
2. Grimoire markdown postprocessor **−101**
3. Visage cards postprocessor **0** + `v-tabs` code-block processor

## License

MIT
