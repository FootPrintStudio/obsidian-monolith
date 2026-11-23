---
tags:
  - smoke
  - p5
  - visage
  - grimoire
  - oculus
title: Nesting Probe
subject: Visage nesting
---

# P5 Nesting Matrix (smoke)

Reading-view composition: **Visage** + **Grimoire** + **Oculus**. Processor order is fixed in code (Grimoire postprocessor −101 → Visage cards 0; Oculus / `v-tabs` are fence processors; tab bodies re-enter via `MarkdownRenderer.render`).

## Install

| Plugin | Version floor |
|--------|----------------|
| Visage | **0.5.1** |
| Grimoire | **0.9.2** |
| Oculus | **2.1.4** |
| NaviNote (optional) | **1.1.0** |

Open in **Reading**. ListDecks CSS off for this note. CollectionXiewer optional (LOCAL oculus path below).

---

## Cell 1 — `` `q=` `` in card

Expected: Grimoire replaces the query; card chrome still applies.

- `v-card` Query host
	Title is `q= title` · subject `q= subject`

| Pass? | Notes |
|-------|-------|
| ☐ | |

---

## Cell 2 — `` `q=` `` with footer subcards

Expected: query result stays **inline** on one line (not stacked by column flex); footer pinned at bottom.

- `v-card` Footer host
	Inline: `q= title`
	- `v-card {layout=footer}` Footer A
	- `v-card {layout=footer}` Footer B

| Pass? | Notes |
|-------|-------|
| ☐ | |

---

## Cell 3 — `oculus` in card

Expected: gallery renders inside the card body.

- `v-card {span=full}` Oculus host

```oculus
LOCAL:
folder: _
limit: 3
```

| Pass? | Notes |
|-------|-------|
| ☐ | Empty gallery OK if folder has no media — fail only if fence unprocessed / breaks card |

---

## Cell 4 — card + `` `q=` `` inside `v-tabs`

Expected: after selecting each tab once, card deck and query render in the panel.

````v-tabs
POSITION: top
ALIGN: left

TAB: Cards
- `v-card` Tab card A
- `v-card` Tab card B
	Query: `q= title`

TAB: Oculus
```oculus
LOCAL:
folder: _
limit: 2
```
````

| Pass? | Notes |
|-------|-------|
| ☐ Cards tab | |
| ☐ Oculus tab | |

---

## Cell 5 — NaviNote Refresh

1. Change a Visage setting (e.g. deck gap) **or** a Grimoire setting, save.
2. Or click NaviNote **↻ Refresh** on this note.

Expected: Reading view re-renders; cells above still look correct (no stuck blank panels).

| Pass? | Notes |
|-------|-------|
| ☐ | |

---

## Out of scope

- Nested `v-tabs` (unsupported by GUIDE)
- Live Preview cards/tabs
- ListDecks + Visage stacked styles (authoring hygiene fail if enabled)
