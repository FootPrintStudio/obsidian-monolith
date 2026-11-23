# NaviNote

A top-of-note navigation bar for Obsidian markdown files: back, refresh, high-level shortcuts, and previous/next within the current folder.

## Features

- **Back** — follows a frontmatter parent link (`pageParent`, `parentPage`, or any field you configure)
- **Refresh** — re-renders the note in Reading view (refreshes stale Dataview inline results and other cached preview content)
- **High-level buttons** — jump to configured hub pages from any note
- **Previous / Next** — move through sibling `.md` files in the same folder, with optional custom sort rules

The panel appears above markdown notes and updates when you open files, switch panes, or change layout.

## Settings

Open **Settings → Community plugins → NaviNote** (Settings | README tabs).

| Setting | Description |
|---------|-------------|
| High Level Navigation | Comma-separated vault paths, e.g. `Home.md`, `Characters/Characters.md` |
| Back Button Field | Frontmatter key for the back link. Default: `pageParent`. Use `parentPage` in FootPrint.Studio-style vaults. |
| Folder Navigation Rules | Per-folder sort for Prev/Next: file name or a frontmatter field (`frontmatter.sortOrder`) |

### Back link formats

NaviNote resolves these frontmatter values:

- Wiki link string: `[[Parent Note]]` or `[[Parent Note\|alias]]`
- Array of links: uses the first valid entry
- Plain path string: `Folder/Parent.md` or `Parent`

## Frontmatter conventions

**World-Building style**

```yaml
pageParent: "[[Characters]]"
```

**FootPrint.Studio style**

```yaml
parentPage: "[[Project Hub]]"
```

Set **Back Button Field** in plugin settings to match your vault convention.

## Folder prev/next

By default, siblings are sorted by file name. Add a folder rule to sort by frontmatter instead:

- Folder: `NaviNote Test`
- Sort: Frontmatter field → `sortOrder`

Only direct children of the folder are included (`.md` files only; attachments are skipped).

## Refresh

**↻ Refresh** calls `previewMode.rerender(true)` in **Reading view** only. In Live Preview or Source mode, the button shows a notice instead of forcing a rerender.

To verify refresh manually, use inline Dataview in Reading view (e.g. `` `= this.someField` ``), edit frontmatter in a split pane, save, then click **↻ Refresh** — the inline result should update.

## Install from GitHub

```bash
cd /path/to/vault/.obsidian/plugins
git clone https://github.com/FootPrintStudio/obsidian-navinote.git navinote
cd navinote
./build.sh
```

Enable **NaviNote** under Community plugins and reload Obsidian.

### BRAT (beta install)

Not in the Obsidian Community Plugins catalog. Install via [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Enable **BRAT** in Community Plugins.
2. **Add Beta plugin** → `FootPrintStudio/obsidian-navinote`
3. Install or update from BRAT when [releases](https://github.com/FootPrintStudio/obsidian-navinote/releases) are published.

BRAT requires a GitHub Release with `main.js`, `manifest.json`, `styles.css`, and `versions.json` attached.

## Develop / rebuild

Local disk:

```bash
npm install
npm run build
```

Remote vault (build in `/tmp`, copy `main.js` back):

```bash
./build.sh
```

Source lives in `src/`. Obsidian loads the bundled `main.js` beside `manifest.json`.

## License

MIT — see [LICENSE](LICENSE).
