# UI Design Audit — Noteece Desktop

**Date:** 2026-08-23 · **Skills applied:** design-audit (19 categories, scored) · ui-design-system (database-grounded recommendations) · anti-slop-design (`audit` verb — punch list, no edits made)

---

## REPORT HEADER

| | |
|---|---|
| **Input type** | Code (React 18 + TypeScript + Mantine v8 + Tailwind utilities), 225 files under `apps/desktop/src` |
| **Confidence** | 🟢 High for code-level findings · 🟡 Rendered states (hover/focus/empty/error) **not verified** — app requires vault unlock to render; static analysis + deterministic lint only |
| **Framework detected** | React 18, Mantine v8 component library, Lexical editor, recharts, zustand/react-query state |
| **Design tokens** | `src/theme.ts`: custom `dark`/`obsidian` 10-step palettes, `violet` primary, Inter everywhere, radius `md` |
| **Scope** | Desktop app surface. Mobile (React Native) not audited — separate stack |

## SCORES

```
Overall:   100 − (0 × 🚫12) − (4 × 🔴8) − (6 × 🟡4) − (8 × 🟢1) = 56/100
Accessibility: 100 − (2 × 🔴8) − (3 × 🟡4) = 68/100  (minor-to-significant gaps; no legal blocker confirmed)
Ethics:        100 − (1 × 🟢1)                        = 99/100  (no dark patterns found)
Usability:     100 − (1 × 🔴8) − (3 × 🟡4)            = 80/100
```

Per-category (✅ pass · ⚠️ partial · ❌ fail):

| Cat | Verdict | Cat | Verdict |
|---|---|---|---|
| 1 Typography | ⚠️ single family by default-choice, not discipline | 11 Loading/Empty/Error | ✅ skeletons + EmptyState components exist |
| 2 Color & Contrast | ✅ measured pairs pass (5.1–10.3 :1) | 12 Microcopy | ⚠️ inconsistent capitalization in nav labels |
| 3 Spacing & Layout | ✅ Mantine spacing scale used consistently | 13 Visual polish | ⚠️ emoji-as-icon residue |
| 4 Hierarchy & Focus | ⚠️ dashboard widget hierarchy flat | 14 Elevation | ✅ one shadow system via Mantine |
| 5 Consistency | ⚠️ mixed icon families (Tabler + raw emoji) | 15 Iconography | ❌ emoji-as-icon ×19, SVG without aria ×11 |
| 6 Accessibility | ❌ focus-outline removals, unlabeled controls | 16 Navigation | ✅ memory router, predictable |
| 7 Forms & Inputs | ⚠️ placeholder-as-label sites (BackupRestore) | 17 Tokens health | ❌ theme.ts is the ONLY token layer; module CSS hardcodes hex |
| 8 Motion | ⚠️ reduced-motion declared once globally; component anims unchecked | 18 Ethics | ✅ local-first app, no manipulation patterns |
| 9 Dark mode | ✅ true dark surfaces, elevation via lightness steps | 19 Heuristics | ⚠️ error recovery good; recognition-over-recall weak in settings |

## ISSUES (ranked)

### 🔴 CRITICAL-1 — Design identity is the stock-template fingerprint
**Category:** Consistency/Tokens (anti-slop core finding). **What:** `theme.ts` ships `primaryColor: 'violet'` + `fontFamily: 'Inter…'` for both text and headings — the exact default Mantine starter look, and item #1 on the AI-tell reject list ("Inter for everything", "purple/violet"). The custom `obsidian` palette shows intent, but the accent stays catalog-default.
**Why it matters:** users pattern-match "default template" instantly; nothing here could be recognized as Noteece out of context.
**Fix (directional, not applied):** keep the obsidian dark scale (it's genuinely good), replace the accent with a brand-committed hue, and pair Inter body with a distinct display face for headings (the ui-design-system DB suggests e.g. Space Grotesk/Sora display + Inter body for high-end productivity tools).

### 🔴 CRITICAL-2 — Focus visibility removed without replacement in editor/auth surfaces
**Category:** Accessibility (WCAG 2.4.7 risk). **Evidence:** `LexicalEditor.module.css:16` removes outline with no `:focus-visible` alternative; `Auth.module.css` has `cursor: not-allowed` with no visual disabled state; 10× `transition-property: all` transitions that can mask state changes. Only **one** `prefers-reduced-motion` declaration exists (`global.css`) against animation-bearing modules.
**Why:** keyboard users lose position in the note editor — the app's primary surface.
**Fix:** add `&:focus-visible { outline: 2px solid var(--mantine-color-violet-filled); outline-offset: 2px; }` wherever outline is suppressed; scope `transition` to specific properties.

### 🔴 CRITICAL-3 — Emoji functioning as UI icons (27 instances)
**Category:** Iconography/Consistency. **Evidence:** 14 emoji-in-UI + 8 emoji-bullets + 5 lone-emoji-icons across TaskBoard, BackupRestore, Login, Register, HealthMode etc., while Tabler icons are already the established family.
**Why:** emoji rendering varies by OS/version, breaks monochrome theming, reads as unfinished.
**Fix:** swap each for the existing Tabler equivalent (`📋→IconClipboardList`, `🔒→IconLock`, …). Mechanical, low-risk.

### 🔴 CRITICAL-4 — Anchor-with-onClick without href (42 instances)
**Category:** Accessibility/Navigation (keyboard operability). `<a onClick>` without href is unreachable by Tab and has no role/button semantics.
**Fix:** convert to `<Button component="a">` or add `role="button" tabIndex={0}`+keydown handler — but conversion to real buttons is correct.

### 🟡 WARNINGS
1. **Placeholder-as-label** (BackupRestore.tsx, SocialSearch placeholder token shipped literally) — label disappears on input; move to persistent `label`.
2. **`data-testid` in production markup** ×22 — strip or gate behind dev flag.
3. **console.log leakage** ×7 (socialConfig.ts et al.) — route through the existing logger.
4. **Glassmorphism without fallback** ×7 — `blur()` backgrounds need opaque fallback for low-end GPUs.
5. **Missing primary heading** ×13 pages — h1 skipped or absent; screen-reader page context lost.
6. **100vh without dvh fallback** (auth screens on mobile browsers).

### 🟢 TIPS
Numeric literals without separators in long constants · `transition-all` ×10 · any-type leaks ×11 in styles callbacks · SVGs without `aria-hidden` ×11 · literal placeholder token `"..."` shipped in SocialSearch markup.

## VERIFICATION NOTES (harness false positives dropped)
- `button-no-type` ×137 — Mantine Button sets `type="button"` internally; dropped except inside raw `<form>` submits (none found unhandled).
- `form-control-name`/`select-without-label` ×76 on Mantine `Select/Input` with `label=` props — Mantine wires accessible names; dropped unless a custom control.
- `fake-name-john-doe` ×5 — all inside test fixtures, not production copy.
- Contrast: measured violet-on-dark 5.12:1 ✅, body-on-bg 10.26:1 ✅, muted-on-card 4.84:1 ✅ — the dark palette itself is compliant.

## ISSUE PRIORITY MATRIX (quick wins first)

| Fix | Effort | Impact | Order |
|---|---|---|---|
| Swap emoji → Tabler icons (mechanical) | S | High | 1 |
| Add focus-visible rules to 2 CSS modules | S | High | 2 |
| Remove data-testid/console.log ×29 | S | Med | 3 |
| dvh fallbacks on auth screens | S | Med | 4 |
| Persistent labels on 2 backup inputs | S | Med | 5 |
| Theme accent + display face decision | M | High | 6 (needs owner taste input) |
| Reduced-motion coverage audit of animated modules | M | Med | 7 |

## WHAT'S WORKING
Genuinely good bones: a coherent 10-step obsidian dark scale with passing contrast at every measured pair; consistent Mantine spacing/radius discipline (zero hardcoded-radius drift found); real skeleton loaders and EmptyState components on data surfaces; zero dark patterns (local-first product, no urgency/consent tricks); ErrorBoundary on every route.

## RECOMMENDED DIRECTION (ui-design-system query result)
For an encrypted-vault productivity tool the database recommends **Minimalism/Swiss** styling on deep-blue-slate dark surfaces (`--color-background:#0F172A`, secure-green accent `#059669`, slate muted) with Inter kept for *body* but paired with a technical display face — plus its pre-delivery checklist items that map exactly to the findings above (no emoji icons, visible focus, cursor-pointer on clickables).
