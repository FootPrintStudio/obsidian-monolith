# Property Query Language (PQL) — Specification v1.0

Grimoire evaluates inline PQL expressions in Obsidian **Reading view** using the `q=` prefix (configurable).

```markdown
`q= default(title, "Untitled")`
```

**v1.0** is a breaking cleanup: one call shape per function, flattened `@`, brace roles listed below. No shim for pre-1.0 syntax.

## Scope

PQL reads the **current note** by default. **Cross-note** reads are opt-in via bare wiki primaries, link-valued member access, and `@` multi-note queries:

| Form | Meaning |
|------|---------|
| `[[Other Note]]` | Page handle (resolves via `metadataCache.getFirstLinkpathDest`) |
| `[[Other Note]].field` | Frontmatter / nested field on that note |
| `[[Other Note]].file.mtime` | Reserved `file.*` on that note |
| `linkField.member` | When `linkField` holds a wiki/path link, resolve then read `member` |
| List-of-links `.field` | Map → list of values; index with `[0]` or `[0,4,5]` |
| `@(from("folder"), {where…}?, map?)` | Scoped multi-note query (quoted `from`; where `!` negates; map `this` = source) |

Missing note / field → `null` (empty output). `@` page lists hard-cap at **250**; over-cap → empty list.

## Context model

### Frontmatter fields

Bare identifiers read YAML frontmatter:

| Syntax | Meaning |
|--------|---------|
| `title` | Frontmatter field `title` |
| `this.title` | Same (optional alias) |

### Page metadata (`file.*`)

Reserved namespace for native file metadata:

| Field | Type | Source |
|-------|------|--------|
| `file.name` | string | Basename without extension |
| `file.path` | string | Vault path |
| `file.folder` | string | Parent folder |
| `file.ctime` | date | Creation time |
| `file.mtime` | date | Modification time |
| `file.size` | number | Bytes |
| `file.tags` | list | Merged YAML + inline `#tags` |

`this.file.*` is accepted as a deprecated alias for `file.*` on the **current** note. Inside `@` map / `filter` where, `this.` is the **source** (authoring) note.

A frontmatter field named `file` (without `.`) is still accessible as a bare identifier; only `file.<member>` uses the reserved namespace.

## Value types

| Type | Notes |
|------|-------|
| `null` | Empty/missing; `None` literal alias |
| `boolean`, `number`, `string` | |
| `date` | Internal ms epoch; formatted via Obsidian moment |
| `duration` | Internal ms length |
| `list` | YAML arrays |

## Operators

| Category | Operators |
|----------|-----------|
| Arithmetic | `+` `-` `*` `/` `%` |
| Comparison | `==` `!=` `<` `>` `<=` `>=`; inclusive range helpers `inRange` (see Functions) |
| Logical | `and`, `or`, `not`, `&&` |
| Grouping | `( )` |
| Member / index | `.property`, `[index]`, multi `[i,j,…]` |
| Wiki primary | bare `[[linkpath]]` |
| At-query | `@(from("…"), …)` |
| Unary negate | `!` (where / filter predicates) |

### String concatenation

If either operand to `+` is a string, both sides coerce to string. When either side is styled/fragments **or a list** (incl. `@` / `filter` results), build **fragments** so `AS` chips and list items survive prefixes/suffixes.

### Date and duration arithmetic

| Expression | Result |
|------------|--------|
| `date - date` | duration |
| `date + duration` | date |
| `date - duration` | date |
| `duration ± duration` | duration |
| `duration * number` | duration |
| `duration / number` | duration |

Duration literals: `dur(1, "day")`, `dur(3, "months")`, `dur("1 day 2 hours")`.

## Functions

### Tier 1 — core

| Function | Description |
|----------|-------------|
| `default(v, fallback)` | Return `v` if truthy/non-empty, else `fallback` |
| `choice(cond, {a, b})` / `choice(cond, {a})` | Binary branch; `{a}` ≡ `{a, ""}`. Brace required. |
| `select(key, {k,v}, …)` | Key lookup; `{*, fallback}` wildcard |
| `any(v, …, {a, b}?)` | Omit branch → boolean (one-arg non-empty / multi-arg containment); trailing brace → arm |
| `exists(v, {a, b}?)` | Same truthiness as one-arg `any`; optional binary branch |
| `slice(list, start, end?)` | List slice |
| `contains(hay, needle)` | Boolean substring / partial list match |
| `contains(hay, needle, {a, b})` | Same match with trailing branch |
| `econtains(hay, needle)` / `econtains(hay, needle, {a, b})` | Exact element / object key; optional branch |
| `dateformat(date, fmt)` | Format date (Luxon tokens aliased to moment; `O` = ordinal after day token) |

### Tier 2

| Function | Description |
|----------|-------------|
| `dur(n, unit)` / `dur(string)` | Duration value |
| `durationformat(dur, fmt?)` | Format duration; without `fmt`, human-readable. With `fmt`, Luxon/Dataview duration tokens (`y`, `M`, `d`, `h`, `m`, `s`, …) plus `O` ordinals. Literal text in single quotes. Not the same token set as `dateformat`. |
| `age(date)` / `age(date, fmt)` | Years since `date` (default), or duration-token format of elapsed span |
| `numberformat(n, pattern)` | Number formatting (`0`, `0.00`, `,`, `%`) |
| `conv(n, from, to)` | Unit conversion (length / mass / temperature; `ftin` → feet+inches string) |
| `inRange({v, low, high}, {below, in, above})` | Three-way **display** branch (inclusive). Homogeneous numbers / dates / durations. Mixed → empty. |
| `inRange(v, low, high)` | Inclusive **boolean** predicate (same comparable types) |
| `date(string \| now \| today)` | Parse ISO date string, or current time / start of today |
| `length(v)` | String/list length |
| `coalesce(a, b, …)` | First truthy value |
| `join(list, sep)` | Join list with separator |
| `lower(v)` / `upper(v)` | Case-fold as string; null → null |
| `replace(hay, needle, replacement)` | Replace all literal occurrences of `needle` (not regex); empty needle → hay unchanged |
| `round(n)` / `round(n, digits)` | Round number; optional non-negative decimal places; non-numeric → null |
| `abs(n)` | Absolute value; non-numeric → null |
| `filter(LIST, unique?)` / `filter(LIST, {preds…})` | List filter. `unique` = stable dedupe (first wins). Where brace predicates **AND**; `!` negates; `this.` = source note; `item` = current element; wiki/`this.file` by path identity. `unique` may precede or follow the where brace — **dedupe last**. `null` → `[]`; non-list → single-element; list-of-lists → flatten **one** level (re-wrap `AS` on children). |

## `select()` syntax

```markdown
`q= select(3, {1, "Red"}, {2, "Green"}, {3, pageColour}, {*, "Unknown"})`
```

- First argument: lookup key (string or number)
- Remaining arguments: braced `{ key, value }` pairs
- Keys compared with type-aware equality
- `{*, value}` or `{default, value}` or `{_, value}` — fallback when no key matches

## Brace groups — roles

| Role | Form | Used by |
|------|------|---------|
| Branch arms | `{t, f}` or `{t}` ≡ `{t, ""}` | `choice`; trailing branch on `any` / `exists` / `contains` / `econtains` |
| Select arms | `{k, v}`; `{*, v}` / `{default,v}` / `{_,v}` | `select` |
| Positional triple | `{a, b, c}` | `inRange` subject + result triples |
| Predicate list | `{p1, p2, …}` (singleton OK; empty false arm from `{p}` skipped) | `@` where, `filter` where — **AND** |

Order is positional. There is no `{name: expr}` map syntax. Do **not** wrap ordinary call arguments in braces.

## At-query

```
@(from("path"|"*"))
@(from("path"), {where…})
@(from("path"), {where…}, mapExpr)
@(from("path"), mapExpr)
```

- 2nd argument brace → where; otherwise → map.
- Third argument is always map (requires where as 2nd).
- Map: bare idents = matched page; `this.` = source note. Prefer `(expr AS style)` when styling.

## Query grammar

```
expression := orExpr [ "AS" style ]
query := expression
at_query := "@" "(" "from" "(" string ")" ("," where_brace)? ("," expression)? ")"
         | "@" "(" "from" "(" string ")" "," expression ")"
where_brace := "{" where_item ("," where_item)* "}"
braceGroup := "{" expression ("," expression)* "}"
style := "card" | "cards" | "tag" | "tags" | "badge" | "pill" | "callout" | "progress" | "meter" | "stars" | "image" | "img" | "wiki" | "wikilink" | "button" | "buttons" | "cards-code" | "code" | "inline" | "list" | …
```

`AS` is an expression postfix (available on call arguments and inside parentheses), not a binary operator. `as` as a field name is still an identifier (`as AS card`). Root `expr AS card` styles the whole result; `default(location AS card, "*Unknown*")` styles only the location branch. Concat mixes require parens: `"**Location:** " + (location AS card)`.

Hyphenated styles (`cards-code`) are a single style token.

## Output rendering

| Result | Pipeline |
|--------|----------|
| Markdown markers / wikilinks (even with HTML tags like `<br>`) | `MarkdownRenderer.render` |
| HTML tags only (no markdown markers) | `innerHTML` |
| Plain text / numbers | text node |
| `null` | empty |
| Styled value (`AS …`) | Text pills, tags, badges, callouts, progress, meter, image, wiki, buttons, or list |
| Fragments (plain + styled concat) | Inline mix of markdown/HTML/text and styled chips |
| Error | red inline `pq-error` |

## Date formatting tokens

PQL accepts **Luxon-style aliases** (Dataview habit) and maps them to Obsidian moment:

| Luxon alias | moment |
|-------------|--------|
| `yyyy` | `YYYY` |
| `dd` | `DD` |
| `ddO` / `dO` | `Do` (ordinal day) |
| `HH`, `mm`, `ss` | unchanged |

Example: `` `q= dateformat(file.mtime, "yyyy-MM-dd HH:mm:ss")` ``
Example: `` `q= dateformat(date("2003-10-03"), "MMMM ddO, yyyy")` `` → `October 3rd, 2003`

## Non-goals

- `$=` inline JavaScript
- ` ```dataview` block queries
- Live Preview inline widget
- Vault bulk migration tooling / old-syntax shims
