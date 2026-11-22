---
tags:
  - smoke
  - p5
  - visage
---

# P5 Visage Span (smoke)

Reading-view smoke for **Visage 0.5.1** span packing (Decision D regression).

## Install

| Plugin | Must show | Release |
|--------|-----------|---------|
| **Visage** | **0.5.1** | https://github.com/FootPrintStudio/obsidian-visage/releases/tag/v0.5.1 |

1. BRAT → **Check for updates** on Visage (or re-add `FootPrintStudio/obsidian-visage`).
2. Confirm version **0.5.1** under Settings → Community plugins.
3. **Reload** Obsidian.
4. Open this note in **Reading** view. Turn off ListDecks CSS for this note.

**If Case Full Mid still shows every card below full-width:** you are still on Visage **0.5.0**.

---

## Case Default Three — equal thirds

Expected: three equal-width cards on one row.

- `v-card` Alpha
- `v-card` Beta
- `v-card` Gamma

| Pass? | Notes |
|-------|-------|
| ☐ | |

---

## Case Fill First — share with defaults (Carl)

Expected: **not** a solo full-width first card. All three share one row (equal thirds), same as defaults.

- `v-card {span=fill}` Fill lead
- `v-card` Default B
- `v-card` Default C

| Pass? | Notes |
|-------|-------|
| ☐ | |

---

## Case Fill + Literals — leftover + close

Expected: 2/8 + 3/8 + rest on row 1; `full` alone on row 2.

- `v-card {span=2}` Wide
- `v-card {span=3}` Wider
- `v-card {span=fill}` Takes the rest
- `v-card {span=full}` Own row

| Pass? | Notes |
|-------|-------|
| ☐ | |

---

## Case Fill then Literal — two rows

Expected: fill alone on row 1 (full width OK — nothing to share); `{span=2}` alone on row 2 at 2/8.

- `v-card {span=fill}` Fill alone then literal
- `v-card {span=2}` Literal next row

| Pass? | Notes |
|-------|-------|
| ☐ | |

---

## Case Full Mid — Carl repro (critical)

Expected: A+B share row 1; C (`full`) alone on row 2; D+E+F share row 3 as **equal thirds** — **not** three stacked full-width cards.

- `v-card` A
- `v-card` B
- `v-card {span=full}` C full
- `v-card` D after
- `v-card` E after
- `v-card` F after

| Pass? | Notes |
|-------|-------|
| ☐ | |

---

## Case Full Last — still OK

Expected: A+B share; C full alone at bottom.

- `v-card` A
- `v-card` B
- `v-card {span=full}` C last

| Pass? | Notes |
|-------|-------|
| ☐ | |

---

## Case Full Lead then pack

Expected: A full alone; B+C share the next row.

- `v-card {span=full}` A full lead
- `v-card` B
- `v-card` C

| Pass? | Notes |
|-------|-------|
| ☐ | |
