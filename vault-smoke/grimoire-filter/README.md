# Vault smoke pack — Grimoire filter / AS / join (G2)

**Target vault:** `/home/carl-heinz/Desktop/Test Vault`  
**Contract:** Monolith **≥ 0.6.1** (Grimoire **1.0** · PQL **v1.0** flattened `@`)

Does **not** touch `.obsidian/`. Safe to copy into the test-only vault.

## Copy

| Source | Destination in Test Vault |
|--------|---------------------------|
| `Smoke/Grimoire Filter.md` | `Smoke/Grimoire Filter.md` |
| `Actors/Alice.md` | `Actors/Alice.md` |
| `Actors/Bob.md` | `Actors/Bob.md` |
| `Actors/Carol.md` | `Actors/Carol.md` |
| `Movies/M1.md` | `Movies/M1.md` |
| `Movies/M2.md` | `Movies/M2.md` |

## Run

**Monolith 0.6.1:** https://github.com/FootPrintStudio/obsidian-monolith/releases/tag/v0.6.1

1. Copy the notes above.
2. BRAT → update Monolith → reload.
3. Confirm Monolith **≥ 0.6.1**; open **`Actors/Alice.md`** in Reading view (`this.file` must be Alice for self-exclude).
4. Check the cases table on Alice — chips/buttons for `AS`, label `+` fragments, nested flatten, co-star `@`, and rich `join`.
