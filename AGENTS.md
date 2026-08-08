# Agent Rules — Killer Sudoku

Strict operating contract for any AI agent (Claude, Cursor, local LLMs, CI bots)
working inside this repository. Read before touching code. If a future commit
contradicts a rule here, update this file in the same change.

Human-facing counterpart: see `README.md` (German). Domain glossary: `CONTEXT.md`.
Skill-level contracts: `docs/agents/`.

---

## 1. Project identity

Killer Sudoku is a single-page Progressive Web App — 9×9 Sudoku + cages with
mandatory sums. Pure client-side React 18 + TypeScript + Chakra UI v2 + Vite 5.
No server, no API, no database, no auth. Static build (`build/`) is the entire
deployable artifact.

Treat it like a phone-grade offline app, not a web service. If a change adds a
server endpoint, a database, or a build-time requirement beyond `npm run build`,
stop and ask — that's a category change.

## 2. Repository layout — source of truth

```
src/
  App.tsx                    # Layout shell + tab routing. Home/Lessons Tab split lives in components/Tabs.tsx.
  index.tsx                  # React root + ChakraProvider
  theme.ts                   # Chakra theme tokens (Hallmark fonts, color palette, surface tokens)
  version.ts                 # APP_VERSION — MUST match package.json exactly
  components/
    Board/                   # Rendering layer (Fläche/Linien/Zahlen). See §6.
    LevelSelector/           # Level picker grid
    NumberPad/               # On-screen digit input
    Tabs.tsx                 # Home + Levels tab content
    common/                  # HelpDialog, InstallPrompt, TutorialOverlay, RippleButton, FadeInView, HomeActions
  hooks/                     # Pure logic hooks. Each has a co-located .test.ts[x].
  services/                  # I/O + stateful side effects. Browser only. Async.
  utils/                     # Pure functions (no React, no DOM, no I/O). The cell→cage index lives in services/board.ts.
  types/                     # Domain types — single source of truth for level JSONs and runtime data.
public/
  manifest.webmanifest       # PWA manifest
  assets/levels/             # level_<n>.json — 100 hand-curated puzzles
docs/
  adr/                       # Architecture Decision Records (add, don't rewrite)
  agents/                    # Skill-level contracts (this repo's sub-agent rules)
  superpowers/               # Historical design specs
CONTEXT.md                   # Ubiquitous language glossary (German)
```

## 3. Language and style

- **Code, commits, branches, identifiers**: English.
- **Human-facing docs** (README, DEPLOYMENT, TODO, ADR rationale): German.
- **Inline comments**: English.
- **PR/issue bodies**: English unless the entire thread is German.

## 4. Version bumping (mandatory two-file sync)

Every release touches **both**:

1. `package.json` → `"version"`.
2. `src/version.ts` → `APP_VERSION`.

Forgetting `version.ts` shows the wrong version string in the UI header.
Forgetting `package.json` breaks `npm version`. Always verify with
`grep -n '"version"' package.json src/version.ts` before committing.

## 5. Coding conventions

### 5.1 Style

- **TypeScript strict mode**. No `any`, no `@ts-ignore`. If a third-party type
  is wrong, narrow with `unknown` and a runtime check.
- **Early returns.** Nested `if` chains are a smell; flatten with guard clauses.
- **Pure functions at the edge, hooks compose them.** `utils/` is pure
  (no React, no DOM, no I/O). `services/` owns browser side effects
  (localStorage, localforage, fetch, fullscreen). `hooks/` wire state +
  services into React. Never the other direction — no `import { useState }`
  in `utils/`.
- **Immutable updates.** Cell grids are `number[][]`. Always copy with
  `row.map(c => [...c])` before mutating; the existing code relies on it for
  React reference equality.
- **Explicit units in names.** `elapsedSeconds`, not `time`. `cageIndex` only
  for the `Map<key, Cage>` shape.

### 5.2 React patterns that matter here

- **Hooks that return derived data use `useMemo` only when the cost is real.**
  On a 9×9 board, `cellValues.flat().filter(...)` is free — don't memoise it.
- **`useEffect` deps are exhaustive, no exceptions.** Suppress the lint rule and
  you ship a stale-closure bug. Always.
- **`useCallback` for handlers passed to memoised children.** Specifically:
  `useBoardGameLogic` returns handlers that Board consumes — keep the wrappers.
- **Test with real components, not mocks, when state matters.** A
  `jest.fn()`-based mock freezes closure state and breaks multi-call tests.
  Use a driver component with real `useState` + a mirror spy. This is in
  `src/hooks/*.test.tsx` and is the house style.

### 5.3 Number and grid conventions

- **Cell value `0` = empty**, `1..9` = digit. Never `null`/`undefined` in the grid.
- **Cell coordinates are `row, col`**, both `0..8`, `row` first everywhere.
- **Cell key strings** are `"${row},${col}"`. Use `cellKey()` from
  `services/board.ts`; don't inline template literals.
- **Cage `id` is base36 short string** assigned by the generator. Don't generate
  new IDs at runtime.

## 6. Board rendering — three-layer rule

The board is **three stacked layers**, each with one job. Don't collapse them:

1. **Flächen-Schicht (bottom):** HTML cell grid. Holds background colors
   (cage tint, selection, peer highlight), `data-testid`, `aria-label`,
   and **all** pointer/touch interaction.
2. **Linien-Schicht (middle):** Single SVG overlay. `pointer-events: none`.
   Draws thin grid, block borders, outer frame, cage contours. Static per level.
3. **Zahlen-Schicht (top):** HTML overlay. `pointer-events: none`. Renders
   cage sums, cell values, pencil-mark candidates. **Always above the SVG.**

Violations: putting cage outlines in the Flächen-Schicht makes them block
clicks. Putting values under the SVG makes them disappear on click. Putting
interaction on the Zahlen-Schicht makes selection flicker. Each of these has
been shipped by accident; do not reintroduce them.

## 7. Cell→Cage lookups — go through the service

`services/board.ts` owns the `Map<string, Cage>` index. Use it:

- `cageOfCell(cages, row, col)` — one-shot lookup.
- `cageOfCellIn(index, cell)` — when the caller already has an index, reuse it.

**Don't** write inline `cages.find(c => c.cells.some(...))` loops. ADR boundary:
the cell→cage mapping was duplicated four times before this consolidation; the
new code is the boundary. `gameLogicService.getCageForCell` is a re-export of
`cageOfCell` for back-compat — use `cageOfCell` in new code.

## 8. Storage contract

Three storage channels, each with one job:

| Channel | Library | Keys | Lifetime | Owner |
|---|---|---|---|---|
| Browser localStorage | native | `killersudoku_current_level`, `killersudoku_bw`, `killersudoku_solved_levels`, `killersudoku_started_levels`, `killersudoku_tutorial_seen` | Persistent | `App.tsx`, `progressService.ts` |
| IndexedDB via localforage | localforage 1.10 | `${STORAGE_PREFIX}${puzzleId}` (game state blobs) | Persistent, cleared by user action | `storageService.ts` |
| In-memory React state | React | cellValues, notes, selection, history | Session | `useGameState` |

**Rules:**

- Never read or write localStorage without `try { ... } catch {}` — Safari
  private mode and quota errors throw on access.
- Game-state writes are **serialized per key** through `enqueueGameStateSave`.
  Direct `localforage.setItem` calls race with the auto-save timer and
  produce "15-second rewinds" — that's the bug this function exists to fix.
  Use it; don't add a second writer.
- The `killersudoku_current_level` and `killersudoku_bw` keys are the user's
  preferences. Touching them silently on a feature change is a regression;
  don't.

## 9. Pencil mode (Bleistiftmodus) — session-scoped

Pencil mode is **always off** on load, reload, and level/puzzle change. It is
not persisted. Don't add persistence — that's the spec. The relevant GitHub
issue is #1 (spec); the undo/redo interaction with pencil marks is documented
in `docs/adr/0003-undo-redo-post-change-snapshot.md`.

Pencil-mark candidates and solver-`candidates` are **two different concepts**:

- Player pencil marks (`notes`): the player's hand-written digit set, persisted.
- Solver `candidates`: the hint engine's narrowings, ephemeral, internal.

The vocab rules in `CONTEXT.md` ("Notiz-Kandidat" vs. solver candidates) are
binding. Pick the right word in user-visible strings.

## 10. Anti-patterns (banned)

- **No DOM-poking libs.** Chakra UI covers everything this app needs. No
  jQuery, no direct `document.querySelector` for app logic. (Tests use
  Testing Library, which queries through React — that's allowed.)
- **No global state outside React.** No `window.*` mutable globals. The only
  module-level mutable state is the save queue tail in `storageService.ts`,
  and that one is a serialization primitive, not state.
- **No `useEffect` for derived data.** If the value is `a + b`, compute it
  inline; don't copy it through state.
- **No prop-drilling shortcuts via Context for things that change every
  keystroke.** Selection, cell values, and notes live in the Board subtree;
  Context there causes re-render storms. The current layout is intentional.
- **No new abstractions for one caller.** "Wrap it in a class/factory/hook"
  with one consumer is the canonical slop pattern; if there's a clear single
  caller, inline it.
- **No silent failures in user paths.** Error states are user-visible:
  `App.tsx` keeps a `error` string for level-load failures; `storageService`
  logs but doesn't surface. **Adding a new silent catch requires a comment
  explaining why the user can't act on it.**
- **No emoji as icons.** Use Chakra Icons. (Marketing copy can use emoji.)
- **No "while true" / busy loops.** The auto-save timer is the only scheduled
  work; everything else is event-driven.
- **No mutation of the level JSON.** `GameLevel` is fetched once and treated
  as read-only. Solving it in place corrupts the next load.
- **No level-number-as-string.** Always `Number`. Strings drift between
  `"3"` and `3` and break the solved-set dedupe.

## 11. Testing contract

- **`npm test`** runs Jest (jsdom + ts-jest).
- **`npm run lint:levels`** runs the level-validator suite specifically —
  run after any change to `utils/levelValidator.ts` or to `public/assets/levels/`.
- **`npm run typecheck`** — TypeScript strict. Must pass before commit.
- **`npm run validate`** = typecheck + lint:levels. The pre-commit smoke test.
- **`npm run test:smoke`** = `node scripts/probe.mjs`. Headless smoke check
  that the production bundle still loads (after a build).

Every new utility gets a co-located `*.test.ts`. Every new hook gets a
`*.test.tsx` with a real driver component, not a mock. The cage-outline
helper and the level validator have explicit invariants — re-read those tests
before changing the implementation.

When fixing a bug, **grep every caller** of the function before editing. The
fix belongs at the shared function, not at the path the bug report named.

## 12. Change discipline

- **Touch only what the task needs.** Drive-by refactors and renames are
  forbidden in feature commits.
- **Match existing style.** If neighbouring files use arrow-component form,
  you do too. If they use `function` declarations, you do too.
- **Imports:** relative paths within `src/`. No path aliases.
- **One commit per logical change.** Conventional Commits with a version tag
  suffix on release commits (`feat(0.3.0): ...`, `fix(0.2.3): ...`).
- **No commits of `node_modules/`, `build/`, `__mocks__/`** except for
  legitimate `__mocks__/` updates.
- **Releases:** version bump in both files (see §4), annotated git tag,
  `git push --follow-tags`. The auto-deploy hook fires externally within ~1
  minute. Verify with
  `curl -s https://killer.benduhn.de/assets/index-<hash>.js | grep APP_VERSION`.

## 13. When you don't know — and when you do

- If a request would add a server, a build pipeline beyond `vite build`, a
  new persistent storage channel, or a new dependency: stop, ask.
- If a request is "add a small feature" with no spec: check `TODO.md` and
  the GitHub issues first; if neither mentions it, propose a one-line spec
  before coding.
- If you see a contradiction between this file and an ADR: flag it
  explicitly, don't silently pick one.