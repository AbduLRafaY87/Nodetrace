# Nodetrace

Nodetrace scans your workspace and gives you a plain-text breakdown of how your codebase is put together — what files you have, what symbols they define, how they import and export from each other, and which of those symbols show no sign of being used anywhere else.

## Features

### Analyze Codebase

Run **Nodetrace: Analyze Codebase** from the Command Palette to get a full report in the Nodetrace output channel: file counts by extension, every function, component, class, interface, type, and variable Nodetrace found, plus a list of all imports and exports across the workspace.

### Find Dead Code

Run **Nodetrace: Find Dead Code** to get a report of symbols with no references found anywhere else in the codebase, grouped by kind (functions, components, classes, interfaces, types, variables), with the file and line each one is declared on.

```
⚠️ 12 potentially unused symbols
------------------------------------------

Functions
  ⚠ calculateCompletion
    src/app/profile/page.tsx:164
    References: 0
  ⚠ getGradientFromName
    src/app/profile/[id]/page.tsx:39
    References: 0

Variables
  ⚠ testimonialTimer
    src/app/page.tsx:107
    References: 0

Types
  ⚠ PaymentReturn
    src/app/the-callback/nurture-actions.tsx:10
    References: 0
```

This is a heuristic, name-based check, not a full scope-aware analysis — it counts identifier references by name across the workspace, so it can't see dynamic property access, string-based framework conventions, or usage in files it doesn't parse. Known conventions from the Next.js App Router (page/layout/route default exports, `GET`/`POST` handlers, `metadata`, etc.) and `declare global` type augmentations are automatically excluded from results. A reference count of 0 means **no evidence of use was found**, not that the code is definitely dead. Treat every result as "potentially unused" and review before removing anything.

## Requirements

No setup required. Nodetrace works on any workspace containing `.ts`, `.tsx`, `.js`, or `.jsx` files. It respects your `.gitignore` and always skips `node_modules`, `.git`, `dist`, `build`, `out`, `coverage`, `.next`, `.nuxt`, `.turbo`, and `.cache`.

## Extension Settings

Nodetrace doesn't add any settings yet — both commands run with sensible defaults.

## Known Issues

* Dead code detection matches symbols by name only, not by scope. Two unrelated symbols sharing a name (e.g. a local `id` variable and a top-level `id` type) can each look "used" even when only one is actually referenced.
* Usage that isn't a literal identifier — dynamic property access (including `.then((mod) => mod.Foo)` patterns used with `React.lazy`/`next/dynamic`), reflection, or file-based routing conventions from frameworks other than Next.js App Router — won't be detected, so those symbols may be reported as unused even when they're in active use.

## Release Notes

### 0.2.0

Renamed from Relixor to Nodetrace.

### 0.1.0

Added **Find Dead Code**: flags functions, components, classes, interfaces, types, and variables with no references found elsewhere in the codebase. Excludes Next.js App Router conventions and `declare global` type augmentations from results.

### 0.0.1

Initial release: **Analyze Codebase** reports file types, symbols, imports, and exports across the workspace.

---

**Enjoy!**